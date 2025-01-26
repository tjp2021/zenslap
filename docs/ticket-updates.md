# Ticket Updates Component Documentation

## Overview
The "Updates to your tickets" component displays relevant ticket activity based on the user's role and their relationship to the tickets.

## Role-Based Access Control (RBAC)

### Regular Users
- **Visibility**: Only see updates for tickets they created
- **Update Types**:
  - Comments from any user (Admin, Agent, or self) on their tickets
  - No status, priority, or assignment updates shown

### Admins & Agents
- **Visibility**: See updates for tickets assigned to them
- **Update Types**:
  1. Assignment Updates
     - When a ticket is newly assigned to them
  2. Status Changes
     - Any status change on tickets assigned to them
  3. Priority Changes
     - Any priority change on tickets assigned to them
  4. Assignment Changes
     - Any assignment change on tickets assigned to them
  5. Comments
     - Any new comments on tickets assigned to them

## Update Types Detail

### Comments
- Displayed for all user roles
- Shows:
  - Commenter's name/email
  - Timestamp
  - Comment content preview
- Truncated if too long

### Assignment Updates (Staff Only)
- Shows when a ticket is assigned to the staff member
- Includes:
  - Ticket title
  - Who assigned it
  - Timestamp

### Status Changes (Staff Only)
- Shows status transitions
- Includes:
  - Previous status
  - New status
  - Who made the change
  - Timestamp

### Priority Changes (Staff Only)
- Shows priority level changes
- Includes:
  - Previous priority
  - New priority
  - Who made the change
  - Timestamp

## Update Display
- Updates are shown in reverse chronological order (newest first)
- Each update includes:
  - Type indicator (icon)
  - Relevant details based on update type
  - Timestamp
  - Link to the relevant ticket

## No Updates State
- When no updates are available, displays "No recent updates"
- This state is role-aware:
  - Regular users: No updates on their tickets
  - Staff: No updates on assigned tickets 