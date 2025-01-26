# Role-Based Access Control (RBAC) Documentation

## Overview
This document serves as the single source of truth for role-based access control in the AutoCRM system. It details the permissions and capabilities of each user role.

## User Roles

### Regular Users
- **Ticket Visibility**
  - Can only see tickets they created
  - Cannot see other users' tickets

- **Ticket Updates**
  - Can see comments on their tickets (excluding internal notes)
  - Can see status changes on their tickets
  - Cannot see priority changes or assignments

- **Actions**
  - Can create new tickets
  - Can add comments to their own tickets
  - Can delete their own comments
  - Cannot edit ticket status, priority, or assignments
  - Cannot add internal notes
  - Cannot delete tickets

### Agents
- **Ticket Visibility**
  - Can see ALL tickets and their activities
  - Can see internal notes on all tickets

- **Ticket Updates**
  - Can see all activity types (comments, status changes, priority changes, assignments)
  - Can see internal notes
  - Assigned tickets are prioritized in UI display (shown first)

- **Actions**
  - Can add any type of activity to tickets
  - Can add comments and internal notes
  - Can edit tickets (status, priority, assignee)
  - Can delete their own comments and internal notes
  - Cannot delete tickets
  - Cannot delete other agents' activities
  - Can tag other users
  - Can change ticket assignees

### Admins
- **Ticket Visibility**
  - Full visibility of all tickets and activities
  - Can see all internal notes

- **Ticket Updates**
  - Can see all activity types
  - No restrictions on visibility

- **Actions**
  - Full control over tickets and activities
  - Can delete any ticket
  - Can delete any activity
  - Can edit any ticket field
  - Can add any type of activity
  - Can manage user roles and permissions

## Activity Types

### Comments
- **Regular Comments**
  - Visible to ticket creator and all staff
  - Can be deleted by the comment author
  - Can be deleted by admins

- **Internal Notes**
  - Only visible to agents and admins
  - Can be deleted by the note author
  - Can be deleted by admins

### Status Changes
- Visible to ticket creator and all staff
- Can only be made by agents and admins

### Priority Changes
- Only visible to agents and admins
- Can only be made by agents and admins

### Assignment Changes
- Only visible to agents and admins
- Can only be made by agents and admins

## UI Implementation

### Ticket List (/tickets)
- **For Agents AND ADMINS**:
  1. Assigned tickets shown first (sorted by priority)
  2. Unassigned tickets shown below (sorted by priority)

- **For Regular Users**:
  - Only shows tickets they created
  - Sorted by creation date/priority

### Activity Feed
- Filters activities based on user role
- Shows appropriate activity types based on permissions
- Clearly distinguishes internal notes from regular comments

## Database Implementation
- Enforced through Row Level Security (RLS) policies
- Policies check user roles and relationships to tickets
- Separate policies for viewing, creating, updating, and deleting activities
- Internal notes flagged in the content JSONB field 