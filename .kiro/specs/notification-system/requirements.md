# Requirements Document

## Introduction

This document defines the requirements for the Notification System feature of the commerce-os POS application. The feature delivers transactional notifications across two channels: SMS (Twilio primary, Fast2SMS secondary) and email (SendGrid primary, Nodemailer secondary). Notifications are triggered by three business events: order confirmation, payment success, and low-stock alerts. A template-based messaging system allows per-branch customisation. An async delivery queue with retry logic ensures reliable delivery. All notification preferences and logs are scoped to `branch_id`. Owners can enable or disable individual notification types per branch from the Next.js dashboard.

This feature integrates with:
- The **payment-gateway-integration** spec (Requirement 8): a Transaction transitioning to `success` fires both `payment_success` and `order_confirmation` notifications.
- The **inventory-management** spec (Requirement 4): a `low_stock_alert` event fires the `low_stock_alert` notification.
- The **RBAC** spec: admin controls require the `owner` role, enforced via new `notifications:write` and `notifications:read` permissions.
- The **multi-branch-support** spec: all Notification_Preference and Notification_Log records are scoped to `branch_id`.

---

## Glossary

- **Notification_Service**: The Node.js/Express backend service responsible for receiving trigger events, rendering templates, enqueuing jobs, and recording delivery outcomes.
- **Notification_Queue**: The async job queue (backed by PostgreSQL via BullMQ or equivalent) that holds pending Notification_Jobs.
- **Notification_Job**: A single unit of work in the Notification_Queue representing one delivery attempt for one channel.
- **Notification_Log**: An immutable PostgreSQL record of a delivery attempt. Fields: `log_id` (UUID), `branch_id`, `business_id`, `notification_type`, `channel`, `recipient`, `status`, `error_message`, `attempt_number`, `provider_used`, `created_at`, `updated_at`.
- **Notification_Type**: Enumerated value: `order_confirmation`, `payment_success`, `low_stock_alert`.
- **Channel**: Enumerated value: `sms` or `email`.
- **Notification_Preference**: A PostgreSQL record storing the enabled/disabled state for a `notification_type`–`channel` combination scoped to a `branch_id`. Fields: `preference_id`, `branch_id`, `business_id`, `notification_type`, `channel`, `enabled`.
- **Notification_Template**: A PostgreSQL record storing the message body for a `notification_type`–`channel` combination scoped to a `branch_id`. Fields: `template_id`, `branch_id`, `business_id`, `notification_type`, `channel`, `subject` (email only), `body` (supports `{{variable}}` placeholders).
- **Template_Renderer**: The backend component that resolves `{{variable}}` placeholders in a Notification_Template using a provided context object.
- **SMS_Provider**: The abstraction layer over SMS backends. Twilio is primary; Fast2SMS is secondary.
- **Email_Provider**: The abstraction layer over email backends. SendGrid is primary; Nodemailer is secondary.
- **Twilio**: Primary SMS delivery service accessed via the Twilio REST API.
- **Fast2SMS**: Secondary SMS delivery service accessed via the Fast2SMS REST API.
- **SendGrid**: Primary email delivery service accessed via the SendGrid API.
- **Nodemailer**: Secondary email delivery library used as fallback when SendGrid is unavailable.
- **Retry_Policy**: Configuration governing how many times a failed Notification_Job is re-attempted and the delay between attempts.
- **Notification_Settings_Page**: The Next.js React page in the Dashboard for managing notification preferences and templates per branch.
- **Dashboard**: The existing Next.js React frontend, extended with the Notification_Settings_Page.
- **RBAC_Middleware**: The Express middleware defined in the RBAC spec that enforces role-based permissions.
- **Owner**: The user role defined in the RBAC spec, extended here with `notifications:write` and `notifications:read` permissions.
- **Branch**: A sub-unit of a Business as defined in the multi-branch-support spec, identified by `branch_id`.
- **Payment_Service**: The Node.js/Express service defined in the payment-gateway-integration spec.
- **Inventory_Service**: The Node.js/Express service defined in the inventory-management spec.

---

## Requirements

### Requirement 1: Notification Triggers and Event Sources

**User Story:** As a system architect, I want the Notification_Service to subscribe to business events from the Payment_Service and Inventory_Service, so that notifications fire automatically without coupling source services to delivery logic.

#### Acceptance Criteria

1. WHEN a Transaction transitions to `success` in the Payment_Service (payment-gateway-integration Requirement 8), THE Payment_Service SHALL emit an internal `payment.success` event containing `transaction_id`, `order_id`, `branch_id`, `business_id`, and `amount`.
2. WHEN THE Notification_Service receives a `payment.success` event, THE Notification_Service SHALL enqueue a Notification_Job for the `payment_success` Notification_Type and a second Notification_Job for the `order_confirmation` Notification_Type.
3. WHEN the Inventory_Service emits a `low_stock_alert` event (inventory-management Requirement 4), THE Notification_Service SHALL enqueue a Notification_Job for the `low_stock_alert` Notification_Type containing `product_id`, `product_name`, `stock_quantity`, `reorder_level`, `branch_id`, and `business_id`.
4. THE Notification_Service SHALL enqueue Notification_Jobs only for channels where the corresponding Notification_Preference for that `notification_type`, `channel`, and `branch_id` has `enabled` set to `true`.
5. IF no Notification_Preference record exists for a given `notification_type`, `channel`, and `branch_id`, THEN THE Notification_Service SHALL treat that combination as disabled and SHALL NOT enqueue a Notification_Job.

---

### Requirement 2: SMS Channel — Twilio (Primary) and Fast2SMS (Secondary)

**User Story:** As a business owner, I want SMS notifications delivered via Twilio with automatic fallback to Fast2SMS, so that SMS delivery is resilient to provider outages.

#### Acceptance Criteria

1. WHEN an SMS Notification_Job is dequeued, THE SMS_Provider SHALL attempt delivery using the Twilio REST API as the primary provider.
2. IF the Twilio API returns an error or is unreachable, THEN THE SMS_Provider SHALL attempt delivery using the Fast2SMS REST API as the secondary provider within the same job attempt.
3. THE SMS_Provider SHALL read Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) and Fast2SMS credentials (`FAST2SMS_API_KEY`) from environment variables and SHALL NOT hard-code credentials in source code.
4. WHEN an SMS is delivered successfully by either provider, THE Notification_Service SHALL update the Notification_Log record with `status` set to `delivered` and record the `provider_used`.
5. IF both Twilio and Fast2SMS return errors for the same job attempt, THEN THE Notification_Service SHALL mark the Notification_Job as failed and apply the Retry_Policy.
6. THE SMS_Provider SHALL format the recipient phone number in E.164 format before calling either provider API.

---

### Requirement 3: Email Channel — SendGrid (Primary) and Nodemailer (Secondary)

**User Story:** As a business owner, I want email notifications delivered via SendGrid with automatic fallback to Nodemailer, so that email delivery is resilient to provider outages.

#### Acceptance Criteria

1. WHEN an email Notification_Job is dequeued, THE Email_Provider SHALL attempt delivery using the SendGrid API as the primary provider.
2. IF the SendGrid API returns an error or is unreachable, THEN THE Email_Provider SHALL attempt delivery using Nodemailer as the secondary provider within the same job attempt.
3. THE Email_Provider SHALL read SendGrid credentials (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`) and Nodemailer credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) from environment variables and SHALL NOT hard-code credentials in source code.
4. WHEN an email is delivered successfully by either provider, THE Notification_Service SHALL update the Notification_Log record with `status` set to `delivered` and record the `provider_used`.
5. IF both SendGrid and Nodemailer return errors for the same job attempt, THEN THE Notification_Service SHALL mark the Notification_Job as failed and apply the Retry_Policy.
6. THE Email_Provider SHALL set the email `subject` field from the Notification_Template `subject` field for the matching `notification_type` and `channel`.

---

### Requirement 4: Template Management System

**User Story:** As an Owner, I want to define and customise message templates for each notification type and channel per branch, so that notifications reflect my business's tone and include relevant details.

#### Acceptance Criteria

1. THE Notification_Service SHALL store one Notification_Template per unique combination of `branch_id`, `notification_type`, and `channel` in PostgreSQL.
2. THE Notification_Service SHALL expose a `GET /api/notifications/templates` endpoint that returns all Notification_Template records for the authenticated user's `branch_id`.
3. THE Notification_Service SHALL expose a `PUT /api/notifications/templates/:template_id` endpoint that allows an Owner to update the `subject` and `body` fields of a Notification_Template.
4. WHEN a Notification_Job is processed, THE Template_Renderer SHALL resolve the following placeholders in the template `body` and `subject`:
   - `{{order_id}}`, `{{amount}}`, `{{branch_name}}` for `order_confirmation` and `payment_success` types
   - `{{product_name}}`, `{{stock_quantity}}`, `{{reorder_level}}`, `{{branch_name}}` for `low_stock_alert` type
5. IF a Notification_Template does not exist for a given `branch_id`, `notification_type`, and `channel`, THEN THE Notification_Service SHALL use a system-level default template for that combination.
6. THE Notification_Service SHALL seed default Notification_Template records for all three Notification_Types and both Channels when a new Branch is created.
7. WHEN a template update request is received, THE RBAC_Middleware SHALL verify that the authenticated user holds the `notifications:write` permission before THE Notification_Service processes the request.
8. IF the authenticated user does not hold the `notifications:write` permission, THEN THE RBAC_Middleware SHALL return an HTTP 403 response.

---

### Requirement 5: Async Delivery Queue

**User Story:** As a system architect, I want notification delivery to be handled asynchronously via a queue, so that notification failures do not block the payment or inventory flows that trigger them.

#### Acceptance Criteria

1. THE Notification_Service SHALL enqueue every Notification_Job into the Notification_Queue without blocking the calling service's request-response cycle.
2. THE Notification_Queue SHALL persist Notification_Jobs in PostgreSQL so that jobs survive a service restart.
3. THE Notification_Service SHALL process Notification_Jobs using a configurable number of concurrent workers (default: 2).
4. WHEN a Notification_Job is picked up by a worker, THE Notification_Service SHALL update the job state to `processing` before attempting delivery.
5. WHEN a Notification_Job completes successfully, THE Notification_Service SHALL update the job state to `completed` and create a Notification_Log record with `status` set to `delivered`.
6. WHEN a Notification_Job fails all retry attempts, THE Notification_Service SHALL update the job state to `dead` and create a Notification_Log record with `status` set to `failed` and `error_message` populated.
7. THE Notification_Queue SHALL support at-least-once delivery semantics: a job picked up but not acknowledged within 30 seconds SHALL be re-queued automatically.

---

### Requirement 6: Retry Mechanism for Failed Deliveries

**User Story:** As a system architect, I want failed notification deliveries to be retried automatically with exponential backoff, so that transient provider errors do not result in missed notifications.

#### Acceptance Criteria

1. THE Retry_Policy SHALL retry a failed Notification_Job a maximum of 3 times before marking it as `dead`.
2. THE Retry_Policy SHALL apply exponential backoff between retry attempts: the delay before attempt N SHALL be `2^(N-1)` minutes (attempt 1: immediate, attempt 2: 2 minutes, attempt 3: 4 minutes).
3. WHEN a Notification_Job is retried, THE Notification_Service SHALL increment the `attempt_number` field on the Notification_Log record.
4. THE Notification_Service SHALL NOT retry a Notification_Job if the failure is caused by an invalid recipient (malformed phone number or email address); such jobs SHALL be immediately marked as `dead` with a descriptive `error_message`.
5. WHEN a Notification_Job is marked as `dead`, THE Notification_Service SHALL emit a log entry at ERROR level containing `log_id`, `notification_type`, `channel`, `recipient`, and `error_message`.

---

### Requirement 7: Notification Log Storage

**User Story:** As an Owner, I want a log of all notification delivery attempts scoped to my branch, so that I can audit delivery outcomes and investigate failures.

#### Acceptance Criteria

1. THE Notification_Service SHALL persist a Notification_Log record for every delivery attempt with fields: `log_id` (UUID), `branch_id`, `business_id`, `notification_type`, `channel`, `recipient`, `status` (`pending`, `delivered`, `failed`), `error_message`, `attempt_number`, `provider_used`, `created_at`, `updated_at`.
2. THE Notification_Service SHALL enforce that `branch_id` and `business_id` are non-nullable on every Notification_Log record.
3. THE Notification_Service SHALL expose a `GET /api/notifications/logs` endpoint that returns paginated Notification_Log records filtered by the authenticated user's `branch_id`, with optional filters for `notification_type`, `channel`, `status`, and date range.
4. WHEN a log list request is received, THE RBAC_Middleware SHALL verify that the authenticated user holds the `notifications:read` permission before returning records.
5. THE Notification_Service SHALL store Notification_Log records as immutable entries; existing records SHALL NOT be modified or deleted via the API.
6. THE Notification_Service SHALL scope all Notification_Log queries to the `branch_id` of the authenticated user, consistent with the data isolation guarantee defined in the multi-branch-support spec Requirement 9.

---

### Requirement 8: Admin Controls — Enable/Disable Notification Types per Branch

**User Story:** As an Owner, I want to enable or disable individual notification types per channel per branch, so that I can control which notifications are sent without modifying code.

#### Acceptance Criteria

1. THE Notification_Service SHALL expose a `GET /api/notifications/preferences` endpoint that returns all Notification_Preference records for the authenticated user's `branch_id`.
2. THE Notification_Service SHALL expose a `PUT /api/notifications/preferences/:preference_id` endpoint that allows an Owner to set the `enabled` field to `true` or `false`.
3. WHEN a preference update request is received, THE RBAC_Middleware SHALL verify that the authenticated user holds the `notifications:write` permission before THE Notification_Service processes the request.
4. IF the authenticated user does not hold the `notifications:write` permission, THEN THE RBAC_Middleware SHALL return an HTTP 403 response.
5. THE Notification_Service SHALL seed one Notification_Preference record per `notification_type`–`channel` combination (6 records: 3 types × 2 channels) for each Branch when the Branch is created, with `enabled` set to `true` by default.
6. WHEN a Notification_Preference is updated, THE Notification_Service SHALL apply the new `enabled` state to all subsequently enqueued Notification_Jobs for that `branch_id`, `notification_type`, and `channel` without affecting jobs already in the queue.
7. IF a request targets a Notification_Preference that belongs to a different `branch_id` than the authenticated user's branch, THEN THE Notification_Service SHALL return an HTTP 403 response.

---

### Requirement 9: Permission Model Extension

**User Story:** As a system architect, I want the RBAC permission matrix to include notification-specific permissions, so that access to notification settings is consistently enforced.

#### Acceptance Criteria

1. THE Permission_Matrix SHALL grant the `owner` role the `notifications:read` and `notifications:write` permissions in addition to the permissions defined in the RBAC spec Requirement 1.
2. THE Permission_Matrix SHALL NOT grant the `staff` role the `notifications:read` or `notifications:write` permissions.
3. THE Notification_Service SHALL require a valid JWT Access_Token on all endpoints.
4. IF a request is made to a Notification_Service endpoint without a valid JWT token, THEN THE RBAC_Middleware SHALL return an HTTP 401 response.

---

### Requirement 10: REST API for Notification Operations

**User Story:** As a developer, I want a complete REST API for notification operations, so that the Dashboard and other services can integrate with the notification module.

#### Acceptance Criteria

1. THE Notification_Service SHALL expose the following endpoints:
   - `GET /api/notifications/preferences` — list preferences for a branch (requires `notifications:read`)
   - `GET /api/notifications/preferences/:preference_id` — get a single preference (requires `notifications:read`)
   - `PUT /api/notifications/preferences/:preference_id` — update enabled state (requires `notifications:write`)
   - `GET /api/notifications/templates` — list templates for a branch (requires `notifications:read`)
   - `PUT /api/notifications/templates/:template_id` — update a template (requires `notifications:write`)
   - `GET /api/notifications/logs` — list delivery logs for a branch (requires `notifications:read`)
2. THE Notification_Service SHALL return all responses in JSON format with a consistent envelope structure containing `data`, `error`, and `meta` fields.
3. THE Notification_Service SHALL support pagination on list endpoints via `page` and `limit` query parameters, with a maximum limit of 100 records per page.
4. THE Notification_Service SHALL scope all queries to the `branch_id` of the authenticated user, consistent with the data isolation guarantee defined in the multi-branch-support spec Requirement 9.

---

### Requirement 11: Notification Settings Page (Admin UI)

**User Story:** As an Owner, I want a dedicated settings page in the dashboard to toggle notification types, view delivery logs, and edit templates, so that I can manage the notification system without engineering support.

#### Acceptance Criteria

1. THE Notification_Settings_Page SHALL be accessible only to authenticated users whose role includes the `notifications:read` permission; unauthenticated users SHALL be redirected to the login page.
2. THE Notification_Settings_Page SHALL display a toggle for each Notification_Preference record scoped to the active `branch_id`, grouped by `notification_type` and labelled by `channel`.
3. WHEN an Owner toggles a notification preference, THE Notification_Settings_Page SHALL call `PUT /api/notifications/preferences/:preference_id` and reflect the updated state without a full page reload.
4. THE Notification_Settings_Page SHALL display a paginated table of Notification_Log records for the active `branch_id`, showing `notification_type`, `channel`, `recipient`, `status`, `provider_used`, and `created_at`.
5. THE Notification_Settings_Page SHALL provide a template editor for each `notification_type`–`channel` combination that allows an Owner to edit the `subject` and `body` fields and save changes via `PUT /api/notifications/templates/:template_id`.
6. THE Notification_Settings_Page SHALL use the Permission_Guard component defined in the RBAC spec to hide the template editor and preference toggles from users without the `notifications:write` permission.
7. WHILE the active `branch_id` changes via the branch switcher, THE Notification_Settings_Page SHALL re-fetch preferences, templates, and logs for the newly selected branch.
