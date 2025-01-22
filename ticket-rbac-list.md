# Ticket RBAC and UI Implementation Checklist

## UI Components
- [ ] Comment System
  - [ ] Add comment UI
  - [ ] View comment history
  - [ ] Delete comment UI
  - [ ] Edit comment UI
  - [ ] Comment threading/replies
  
- [ ] Internal Notes
  - [ ] Add internal note UI
  - [ ] View internal notes section
  - [ ] Edit internal notes
  - [ ] Delete internal notes
  - [ ] Visual distinction from public comments

- [ ] Attachments
  - [ ] File upload UI
  - [ ] Attachment preview
  - [ ] Attachment deletion
  - [ ] File type restrictions
  - [ ] Size limit handling

- [ ] Creator Actions
  - [ ] Delete ticket (for creators)
  - [ ] Edit ticket (for creators)
  - [ ] Close ticket (for creators)
  - [ ] Reopen ticket (for creators)

## RBAC Implementation
- [ ] Comment Permissions
  - [ ] Add comment permission
  - [ ] Edit own comment permission
  - [ ] Delete own comment permission
  - [ ] Delete any comment permission
  - [ ] View comment history permission

- [ ] Note Permissions
  - [ ] Add internal note permission
  - [ ] View internal notes permission
  - [ ] Edit own notes permission
  - [ ] Delete own notes permission
  - [ ] Delete any note permission

- [ ] Attachment Permissions
  - [ ] Upload attachment permission
  - [ ] Delete own attachment permission
  - [ ] Delete any attachment permission
  - [ ] Download/view attachment permission

- [ ] Creator-specific Permissions
  - [ ] Delete own ticket permission
  - [ ] Edit own ticket permission
  - [ ] Close own ticket permission
  - [ ] Reopen own ticket permission

## Integration Requirements
- [ ] Comment System Backend
  - [ ] Comment storage schema
  - [ ] Comment API endpoints
  - [ ] Real-time updates

- [ ] Internal Notes Backend
  - [ ] Notes storage schema
  - [ ] Notes API endpoints
  - [ ] Notes visibility control

- [ ] Attachment System
  - [ ] File storage integration
  - [ ] File type validation
  - [ ] Size limit enforcement
  - [ ] Secure file access

- [ ] RBAC System Updates
  - [ ] Permission schema updates
  - [ ] Role configuration updates
  - [ ] Permission checking middleware
  - [ ] UI permission hooks 