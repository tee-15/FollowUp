# Requirements Document

## Introduction

FollowUp CRM is a lightweight, mobile-first customer relationship management application for small business owners. It enables users to track leads from first contact through to closed deals, ensures no follow-up is missed via reminders, and enables one-click WhatsApp messaging. The product prioritises speed and simplicity: adding a lead takes under 10 seconds, and the daily follow-up list surfaces exactly who to contact and when.

## Glossary

- **System**: The FollowUp CRM application as a whole
- **Auth_Service**: The authentication subsystem (Supabase Auth) responsible for identity management
- **Lead**: A prospective customer record containing contact details, source, and sales status
- **Lead_Manager**: The subsystem responsible for creating, reading, updating, and deleting Lead records
- **Follow_Up**: A scheduled reminder associated with a Lead, with a due date and completion state
- **FollowUp_Scheduler**: The subsystem responsible for creating and managing Follow_Up records
- **Pipeline_Board**: The Kanban-style drag-and-drop view of Leads organised by status column
- **Activity_Logger**: The subsystem that automatically records events against a Lead
- **Note**: A free-text entry manually added to a Lead by the User
- **Dashboard**: The home screen showing summary metrics and today's follow-up tasks
- **WhatsApp_Link**: A `wa.me` deep-link that opens WhatsApp with a pre-filled message
- **User**: An authenticated small business owner using the System
- **Status**: The current sales stage of a Lead — one of: New, Contacted, Interested, Negotiation, Won, Lost
- **Source**: The channel through which a Lead was acquired — one of: WhatsApp, Instagram, Facebook, Referral, Other

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a small business owner, I want to create an account and log in securely, so that my lead data is private and accessible only to me.

#### Acceptance Criteria

1. WHEN a User submits a registration form with a valid email address and a password of at least 8 characters and at most 128 characters, THE Auth_Service SHALL create a new User record, store the name and business name provided, and return an authenticated session.
2. IF a User submits a registration form with an email address that is already registered, THEN THE Auth_Service SHALL reject the request and return an error message stating the email address is already in use, without creating a new record.
3. IF a User submits a registration form with a password fewer than 8 characters or greater than 128 characters, THEN THE Auth_Service SHALL reject the request and return a validation error indicating the password length requirement.
4. WHEN a User submits a login form with credentials that match a registered account, THE Auth_Service SHALL return an authenticated session and redirect the User to the Dashboard.
5. IF a User submits a login form with credentials that do not match any registered account, THEN THE Auth_Service SHALL return a generic error message that does not indicate whether the email or the password was incorrect.
6. WHEN an authenticated User requests to log out, THE Auth_Service SHALL invalidate the session token and redirect the User to the login page.
7. WHILE a User session is active, THE System SHALL attach the session identity to every data request and SHALL reject requests with a 401 status if the session token is absent, expired, or invalid.
8. IF a User's session has been inactive for 30 consecutive minutes, THEN THE Auth_Service SHALL expire the session and THE System SHALL redirect the User to the login page on their next request.
9. THE Auth_Service SHALL store a User profile containing: name (required, 1–100 characters), email (immutable after registration), and business name (required, 1–100 characters).
10. WHEN a User submits a valid profile update for name or business name, THE Auth_Service SHALL persist the changes and THE System SHALL display the updated values on the page without a full page reload.

---

### Requirement 2: Dashboard Overview

**User Story:** As a small business owner, I want a summary dashboard when I log in, so that I can immediately see the state of my pipeline and who needs attention today.

#### Acceptance Criteria

1. WHEN an authenticated User navigates to the Dashboard, THE Dashboard SHALL display the following five metrics calculated from the User's data using the User's local calendar date as the reference for "today": total lead count, count of leads with at least one incomplete Follow_Up whose due date equals today, count of leads created in the 7 calendar days preceding today (not including today), count of leads with Status "Won", and count of leads with Status "Lost".
2. THE Dashboard SHALL display a button labelled "Add New Lead" with a minimum touch target of 44×44 CSS pixels that opens the Add Lead form when activated.
3. WHILE the Dashboard's follow-up data is available, THE Dashboard SHALL display a list of leads that have at least one incomplete Follow_Up due on the User's local calendar date today, showing each lead's name, phone number, and the earliest incomplete Follow_Up time for that date; IF no such leads exist, THE Dashboard SHALL display an empty-state message in place of the list.
4. WHILE the Dashboard's overdue data is available, THE Dashboard SHALL display a separate section listing leads with at least one incomplete Follow_Up whose due date is before the User's local calendar date today; IF no such leads exist, THE Dashboard SHALL not render the Overdue section.
5. WHILE the Dashboard data is loading, THE Dashboard SHALL display a loading indicator in place of each metric or list section that has not yet resolved.
6. IF a Dashboard data fetch fails, THEN THE Dashboard SHALL display a single error message at the Dashboard level and provide a "Retry" control that re-fetches all Dashboard data when activated.

---

### Requirement 3: Lead Management

**User Story:** As a small business owner, I want to add, view, edit, and delete leads, so that I can maintain an accurate and up-to-date list of prospective customers.

#### Acceptance Criteria

1. WHEN a User submits the Add Lead form with a full name and phone number, THE Lead_Manager SHALL create a Lead record with Status set to "New", record the source channel, and redirect the User to the new Lead's detail page.
2. THE Lead_Manager SHALL persist the following fields for each Lead: full name (required), phone number (required), email address (optional), source (required, one of: WhatsApp, Instagram, Facebook, Referral, Other), status (required, one of: New, Contacted, Interested, Negotiation, Won, Lost), and creation timestamp.
3. IF a User submits the Add Lead form without a full name or without a phone number, THEN THE Lead_Manager SHALL display a validation error adjacent to each missing required field and not submit the form to the server.
4. WHEN a User navigates to the Leads List, THE Lead_Manager SHALL display all of the User's leads sorted by creation date descending, showing for each lead: name, phone number, source, status, and the due date of the next incomplete Follow_Up (or a blank value if none exists).
5. WHEN a User applies a status filter on the Leads List, THE Lead_Manager SHALL display only leads matching the selected status and update the displayed list without a full page reload.
6. WHEN a User submits valid edits to an existing Lead, THE Lead_Manager SHALL update the record, persist the changes, and log an activity event of type "updated" via the Activity_Logger.
7. IF a User submits edits to an existing Lead that fail server-side validation, THEN THE Lead_Manager SHALL return an error message identifying the invalid field(s) and SHALL NOT persist any part of the submitted edit.
8. WHEN a User confirms deletion of a Lead via the confirmation dialog, THE Lead_Manager SHALL permanently delete the Lead record and all associated Follow_Up, Note, and Activity records, then redirect the User to the Leads List.
9. IF a User initiates deletion of a Lead, THEN THE Lead_Manager SHALL present a confirmation dialog requiring explicit confirmation before executing the deletion.
10. IF the background create operation for a new Lead fails after the optimistic redirect, THEN THE Lead_Manager SHALL display an error message on the Lead detail page and provide a retry action without navigating away.

---

### Requirement 4: Lead Detail Page

**User Story:** As a small business owner, I want a dedicated page for each lead, so that I can see the full history, notes, and upcoming actions in one place.

#### Acceptance Criteria

1. WHEN a User navigates to a Lead detail page, THE System SHALL display the lead's full name, phone number, source, current status, and creation date, and SHALL display the lead's email address only if one is recorded, and SHALL display all associated Notes, Activities, and Follow_Ups in reverse-chronological order by their recorded timestamp.
2. WHEN a User navigates to a Lead detail page and the Lead has a recorded phone number, THE System SHALL display a "Message on WhatsApp" button that constructs a WhatsApp_Link using the format `https://wa.me/{phone}?text={message}` and opens it in a new browser tab.
3. IF the Lead does not have a recorded phone number, THEN THE System SHALL not display the "Message on WhatsApp" button on that Lead detail page.
4. WHEN a User clicks the "Message on WhatsApp" button, THE Activity_Logger SHALL record an activity event of type "message" against the Lead.
5. WHEN a User submits a Note on the Lead detail page, THE Lead_Manager SHALL save the Note with a server-recorded timestamp and THE Activity_Logger SHALL record an activity event of type "note".
6. IF a User attempts to save a Note whose content exceeds 1000 characters, THEN THE Lead_Manager SHALL reject the submission and display an error message indicating the 1000-character limit.
7. IF a User attempts to save an empty or whitespace-only Note, THEN THE Lead_Manager SHALL reject the submission and display a validation error.
8. WHEN a User updates the Status of a Lead from the detail page, THE Lead_Manager SHALL persist the new status and THE Activity_Logger SHALL record an activity event of type "updated" including the previous and new status values.
9. THE System SHALL pre-fill the WhatsApp_Link message template with the User's business name and the Lead's first name (the first whitespace-delimited token of the full name), and IF either value is unavailable, THE System SHALL omit that value from the template without blocking the WhatsApp_Link construction.

---

### Requirement 5: Follow-Up Scheduling (Core Feature)

**User Story:** As a small business owner, I want to schedule follow-up reminders for each lead, so that I never forget to contact a prospect at the right time.

#### Acceptance Criteria

1. WHEN a User schedules a Follow_Up for a Lead, THE FollowUp_Scheduler SHALL create a Follow_Up record with the specified due date (stored as a calendar date in the User's local timezone) and set completed to false.
2. THE FollowUp_Scheduler SHALL support the following preset intervals when scheduling, calculated from the User's current local calendar date: 1 day from today, 3 days from today, 7 days from today, and a custom date selected via a date picker.
3. IF a User selects a custom follow-up date that is before the User's current local calendar date, THEN THE FollowUp_Scheduler SHALL display a validation error and not create the Follow_Up record.
4. WHEN a User marks a Follow_Up as complete, THE FollowUp_Scheduler SHALL set completed to true and THE Activity_Logger SHALL record an activity event of type "followup" with a description identifying the completed due date.
5. IF the FollowUp_Scheduler fails to save a new Follow_Up record, THEN THE System SHALL display an error message and provide a retry action without dismissing the scheduling form.
6. WHEN a Lead has a Follow_Up with completed set to false and a due date equal to the User's current local calendar date, THE Dashboard SHALL include that Lead in the "Follow-up due today" section.
7. WHEN a Lead has a Follow_Up with completed set to false and a due date before the User's current local calendar date, THE Dashboard SHALL include that Lead in the "Overdue" section.
8. WHEN the navigation renders, THE System SHALL display an in-app notification badge showing the combined count of incomplete Follow_Ups due today and overdue; IF the count is zero, THE System SHALL not display the badge.
9. WHEN a User views the Lead detail page, THE System SHALL display all Follow_Ups for that Lead sorted in reverse-chronological order by due date, each showing the due date and completion status.
10. WHERE a User has granted browser notification permission, THE System SHALL trigger a browser push notification at 9:00 AM in the User's local timezone on the day each incomplete Follow_Up is due.
11. IF a Lead already has one or more incomplete Follow_Ups and a User schedules another Follow_Up for the same Lead, THEN THE FollowUp_Scheduler SHALL create the new Follow_Up record and display all incomplete Follow_Ups on the Lead detail page.

---

### Requirement 6: Pipeline Board (Kanban)

**User Story:** As a small business owner, I want a visual Kanban board of my leads, so that I can quickly see and manage my entire sales pipeline at a glance.

#### Acceptance Criteria

1. WHEN a User navigates to the Pipeline Board, THE Pipeline_Board SHALL display exactly six columns in the fixed left-to-right order: New, Contacted, Interested, Negotiation, Won, Lost — each containing only the Lead cards whose current Status matches that column's label.
2. THE Pipeline_Board SHALL display on each Lead card: the lead's full name, phone number, and the due date of the next incomplete Follow_Up; IF no incomplete Follow_Up exists, THE Pipeline_Board SHALL display a blank value in place of the due date.
3. THE Pipeline_Board SHALL display a count badge on each column header showing the number of Lead cards currently in that column; WHEN the count is zero, THE Pipeline_Board SHALL display "0" in the badge.
4. WHEN a User drags a Lead card and releases it onto a different column, THE Pipeline_Board SHALL immediately update the card's displayed position to the destination column, persist the Lead's Status as the destination column's label, and THE Activity_Logger SHALL record an activity event of type "updated" with the previous and new status values.
5. WHILE a drag operation is in progress, THE Pipeline_Board SHALL apply a distinct visual highlight to the column currently under the dragged card to indicate it is a valid drop target.
6. IF the status update from a completed drag-and-drop operation fails to persist, THEN THE Pipeline_Board SHALL revert the card to its original column and display an error message identifying the failure.
7. WHEN a drag operation is cancelled (e.g., the card is released outside any column or the user presses Escape), THE Pipeline_Board SHALL return the card to its original column without any status change or activity event.

---

### Requirement 7: Notes and Activity Log

**User Story:** As a small business owner, I want a chronological log of everything that has happened with a lead, so that I have full context before making contact.

#### Acceptance Criteria

1. WHEN a Lead is created, THE Activity_Logger SHALL automatically create an activity record of type "created" with the description "Lead created".
2. WHEN a Lead's Status changes, THE Activity_Logger SHALL automatically create an activity record of type "updated" with a description in the format "Status changed from {previous_status} to {new_status}".
3. WHEN a Follow_Up is marked as complete, THE Activity_Logger SHALL automatically create an activity record of type "followup" with a description in the format "Follow-up for {due_date} marked complete".
4. WHEN a User saves a Note against a Lead, THE Activity_Logger SHALL automatically create an activity record of type "note" with the description "Note added".
5. WHEN a User clicks the "Message on WhatsApp" button, THE Activity_Logger SHALL automatically create an activity record of type "message" with the description "WhatsApp message initiated".
6. WHEN a User views the Lead detail page, THE System SHALL display all activity records for that Lead in reverse-chronological order by server-recorded timestamp, each showing the event type, event description, and server-recorded timestamp.
7. WHEN a User views the Lead detail page, THE System SHALL display Notes in a dedicated "Notes" section that is visually separate from the Activity Log section.
8. WHEN a User saves a Note, THE Lead_Manager SHALL associate the Note with the Lead, persist the Note content (maximum 500 characters), and record a server-assigned creation timestamp.
9. IF a User attempts to save an empty or whitespace-only Note, THEN THE Lead_Manager SHALL reject the submission and display a validation error without creating a Note or Activity record.

---

### Requirement 8: WhatsApp Integration

**User Story:** As a small business owner, I want to message a lead on WhatsApp in one click, so that I can initiate contact quickly without copying and pasting phone numbers.

#### Acceptance Criteria

1. THE System SHALL construct a WhatsApp_Link for each Lead using the format `https://wa.me/{phone}?text={encoded_message}` where `{phone}` is the lead's phone number with all non-digit characters stripped, and `{encoded_message}` is the pre-filled template text encoded with `encodeURIComponent`.
2. A phone number is considered valid for WhatsApp_Link construction IF it contains between 7 and 15 digits after stripping all non-digit characters.
3. WHEN a User clicks the "Message on WhatsApp" button and the Lead's phone number is valid per criterion 2, THE System SHALL open a new browser tab with the constructed WhatsApp_Link.
4. IF a User clicks the "Message on WhatsApp" button and the Lead's phone number is invalid per criterion 2, THEN THE System SHALL display an inline validation error and SHALL NOT open a new browser tab.
5. THE System SHALL provide at least one pre-filled message template where the text includes the User's business name and the Lead's first name (the first whitespace-delimited token of the full name); IF the business name is not set, THE System SHALL substitute the User's email prefix (the portion before the "@" character) in its place.

---

### Requirement 9: Responsive Mobile-First Interface

**User Story:** As a small business owner who is frequently away from a desk, I want the application to work seamlessly on my phone, so that I can manage leads and follow-ups wherever I am.

#### Acceptance Criteria

1. THE System SHALL render all pages at viewport widths from 320px to 2560px such that no content is clipped, overlaps adjacent content, or requires horizontal scrolling to reach.
2. THE System SHALL size all interactive controls (buttons, links, form inputs) to a minimum of 44×44 CSS pixels on viewport widths below 1024px so that they are reachable with a single thumb tap.
3. WHEN the viewport width is below 1024px, THE System SHALL display a bottom navigation bar providing access to Dashboard, Leads List, and Pipeline Board.
4. WHILE the viewport width is 1024px or greater, THE System SHALL display a sidebar navigation providing access to Dashboard, Leads List, Pipeline Board, and Settings, regardless of device type.
5. WHERE the user's browser supports the PWA install criteria (HTTPS, valid Web App Manifest, registered Service Worker), THE System SHALL provide a Web App Manifest and a Service Worker so that the application can be installed to the device home screen.
6. THE System SHALL achieve a Lighthouse Performance category score of 80 or above when audited on a simulated mobile connection (Lighthouse default mobile throttling).

---

### Requirement 10: Data Integrity and Security

**User Story:** As a small business owner, I want confidence that my customer data is secure and consistent, so that I can trust the system with sensitive business information.

#### Acceptance Criteria

1. WHILE a User is authenticated, THE System SHALL enforce row-level security policies on all database tables so that every query returns only records where the `user_id` column matches the authenticated User's identity.
2. THE System SHALL transmit all data between client and server over HTTPS; unencrypted HTTP requests SHALL be redirected to HTTPS.
3. IF a User's session is expired or absent, THEN THE System SHALL redirect the User to the login page within 1 second before rendering any protected resource, for both client-side navigation and direct URL access.
4. IF a User's session has been inactive for 30 consecutive minutes, THEN THE Auth_Service SHALL expire the session and THE System SHALL redirect the User to the login page on their next request.
5. WHEN THE Lead_Manager receives a create or update request, THE System SHALL validate all required fields server-side and, IF validation fails, SHALL return an error response identifying the invalid field(s) and SHALL NOT persist any part of the submitted data.
6. WHEN THE System responds to an authenticated API request, THE System SHALL return only records belonging to the requesting User's `user_id`, verified through the row-level security policy, such that no other User's records appear in any response payload.
