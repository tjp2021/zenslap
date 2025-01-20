-- Seed data for testing
INSERT INTO users (email, role) VALUES
  ('admin@example.com', 'ADMIN'),
  ('agent@example.com', 'AGENT'),
  ('user@example.com', 'USER');

INSERT INTO tickets (status, priority, metadata) VALUES
  ('OPEN', 'HIGH', '{"subject": "Test Ticket 1", "description": "High priority test ticket"}'),
  ('IN_PROGRESS', 'MEDIUM', '{"subject": "Test Ticket 2", "description": "Medium priority test ticket"}'),
  ('OPEN', 'LOW', '{"subject": "Test Ticket 3", "description": "Low priority test ticket"}'); 