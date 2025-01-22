-- Function to update a ticket and record the activity in a single transaction
CREATE OR REPLACE FUNCTION update_ticket_with_activity(
    p_ticket_id UUID,
    p_updates JSONB,
    p_actor_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_old_ticket JSONB;
    v_new_ticket JSONB;
    v_field TEXT;
    v_old_value TEXT;
    v_new_value TEXT;
BEGIN
    -- Get the old ticket state
    SELECT to_jsonb(t) INTO v_old_ticket
    FROM tickets t
    WHERE id = p_ticket_id;

    IF v_old_ticket IS NULL THEN
        RAISE EXCEPTION 'Ticket not found';
    END IF;

    -- Update the ticket
    UPDATE tickets
    SET
        title = COALESCE((p_updates->>'title'), title),
        description = COALESCE((p_updates->>'description'), description),
        status = COALESCE((p_updates->>'status'), status),
        priority = COALESCE((p_updates->>'priority'), priority),
        metadata = COALESCE((p_updates->>'metadata')::jsonb, metadata),
        assignee = COALESCE((p_updates->>'assignee')::uuid, assignee),
        updated_at = NOW()
    WHERE id = p_ticket_id
    RETURNING to_jsonb(tickets.*) INTO v_new_ticket;

    -- Record activities for each changed field
    FOR v_field, v_new_value IN 
        SELECT key, value::text 
        FROM jsonb_each_text(p_updates)
    LOOP
        v_old_value := v_old_ticket->>v_field;
        
        IF v_old_value IS DISTINCT FROM v_new_value THEN
            -- Special handling for assignment changes
            IF v_field = 'assignee' THEN
                INSERT INTO ticket_activities (
                    ticket_id,
                    actor_id,
                    activity_type,
                    content
                ) VALUES (
                    p_ticket_id,
                    p_actor_id,
                    'assignment',
                    jsonb_build_object(
                        'from', v_old_value,
                        'to', v_new_value
                    )
                );
            -- Handle status changes
            ELSIF v_field = 'status' THEN
                INSERT INTO ticket_activities (
                    ticket_id,
                    actor_id,
                    activity_type,
                    content
                ) VALUES (
                    p_ticket_id,
                    p_actor_id,
                    'status_change',
                    jsonb_build_object(
                        'from', v_old_value,
                        'to', v_new_value
                    )
                );
            -- Handle other field changes
            ELSE
                INSERT INTO ticket_activities (
                    ticket_id,
                    actor_id,
                    activity_type,
                    content
                ) VALUES (
                    p_ticket_id,
                    p_actor_id,
                    'field_change',
                    jsonb_build_object(
                        'field', v_field,
                        'from', v_old_value,
                        'to', v_new_value
                    )
                );
            END IF;
        END IF;
    END LOOP;

    RETURN v_new_ticket;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 