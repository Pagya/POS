# Requirements Document

## Introduction

This document defines the requirements for the Multi-Branch Support feature of the commerce-os POS system. The feature extends the existing multi-tenant model (scoped by `business_id`) by introducing a Branch entity that sits between a Business and its operational data. Inventory, sales (orders), and users are scoped to a specific Branch within a Business. A Central Admin can view and manage all branches, while branch-level operators are restricted to their assigned branch. The frontend dashboard allows authenticated users to switch between branches they have access to.

This feature extends the existing inventory-management spec: all inventory records (Products, Stock_Logs) that were previously scoped to a `business_id` are now additionally scoped to a `branch_id`.

---

## Glossary

- **Business**: The top-level tenant entity, identified by `business_id`. Already exists in the system.
- **Branch**: A physical or logical sub-unit of a Business, identified by `branch_id`, with fields: `branch_id`, `name`, `location`, `contact_details`.
- **Branch_Service**: The Node.js/Express backend service responsible for Branch CRUD and branch-membership operations.
- **Central_Admin**: An authenticated user with the `central_admin` role who has read and management access across all Branches of a Business.
- **Branch_Operator**: An authenticated user assigned to one or more Branches, whose data access is restricted to those Branches.
- **Branch_Context**: The currently selected Branch in the frontend session, stored client-side and sent as a header or query parameter on every API request.
- **Auth_Middleware**: The Express middleware that validates JWT tokens and enforces branch-level access control on protected routes.
- **Inventory_Service**: The existing Node.js/Express service for inventory operations, extended to scope all data by `branch_id`.
- **Order_Service**: The existing Node.js/Express service for order/sales operations, extended to scope all data by `branch_id`.
- **Dashboard**: The existing Next.js React frontend, extended with a branch switcher and branch-scoped reporting views.
- **Branch_Report**: An aggregated data structure containing sales totals and inventory summaries for a single Branch over a given time window.

---

## Requirements

### Requirement 1: Branch Entity Management

**User Story:** As a Central Admin, I want to create, read, update, and deactivate branches within my business, so that I can model the physical or logical locations my business operates from.

#### Acceptance Criteria

1. THE Branch_Service SHALL expose REST endpoints for creating, retrieving, updating, and deactivating Branch records.
2. WHEN a create request is received, THE Branch_Service SHALL validate that `name` and `location` are present and non-empty strings.
3. THE Branch_Service SHALL enforce uniqueness of `name` within the same `business_id`.
4. IF a create request contains a duplicate `name` within the same Business, THEN THE Branch_Service SHALL return an HTTP 409 response with a descriptive error message.
5. THE Branch_Service SHALL store `contact_details` as a JSON object supporting at minimum `phone` and `email` sub-fields.
6. IF a retrieve, update, or deactivate request targets a Branch that does not exist within the authenticated Business, THEN THE Branch_Service SHALL return an HTTP 404 response.
7. THE Branch_Service SHALL support soft-deletion of Branches by setting an `is_active` flag to false rather than removing the record.
8. WHILE a Branch has `is_active` set to false, THE Branch_Service SHALL exclude that Branch from list responses unless the request explicitly includes a `include_inactive=true` query parameter.

---

### Requirement 2: Branch-Scoped Data Model

**User Story:** As a system architect, I want all inventory, sales, and user-assignment records to carry a `branch_id`, so that data is cleanly isolated per branch at the database level.

#### Acceptance Criteria

1. THE Branch_Service SHALL add a non-nullable `branch_id` foreign key to the `items` (catalog), `orders`, `order_items`, `stock_logs`, and `user_branch_assignments` tables.
2. THE Inventory_Service SHALL enforce that every Product and Stock_Log record is associated with exactly one `branch_id`.
3. THE Order_Service SHALL enforce that every Order and Order_Item record is associated with exactly one `branch_id`.
4. WHEN a new Business is created, THE Branch_Service SHALL automatically create a default Branch named "Main Branch" for that Business so that existing workflows are not disrupted.
5. THE Branch_Service SHALL expose a REST endpoint to assign or remove a user from one or more Branches within the same Business.
6. IF a user is assigned to a Branch that belongs to a different Business than the authenticated user's Business, THEN THE Branch_Service SHALL return an HTTP 403 response.

---

### Requirement 3: Branch-Level Access Control

**User Story:** As a security engineer, I want API requests to be validated against the caller's branch membership, so that a Branch Operator cannot read or write data belonging to another branch.

#### Acceptance Criteria

1. THE Auth_Middleware SHALL extract the `branch_id` from the request context (header `X-Branch-ID` or query parameter `branch_id`) on every protected route.
2. WHEN a request carries a `branch_id`, THE Auth_Middleware SHALL verify that the authenticated user is either a Central_Admin for the Business or is assigned to that Branch.
3. IF the authenticated user is a Branch_Operator not assigned to the requested Branch, THEN THE Auth_Middleware SHALL return an HTTP 403 response with a descriptive error message.
4. THE Inventory_Service SHALL apply a `branch_id` filter to all database queries so that responses contain only records belonging to the requested Branch.
5. THE Order_Service SHALL apply a `branch_id` filter to all database queries so that responses contain only records belonging to the requested Branch.
6. WHILE a user holds the Central_Admin role, THE Auth_Middleware SHALL permit access to all Branches within that user's Business without requiring branch assignment.
7. IF a request is made to a branch-scoped endpoint without a `branch_id` in the request context, THEN THE Auth_Middleware SHALL return an HTTP 400 response indicating that a Branch context is required.

---

### Requirement 4: Branch Switcher in the Dashboard

**User Story:** As a Branch Operator or Central Admin, I want to switch between branches I have access to from the dashboard UI, so that I can view and manage data for a specific branch without logging out.

#### Acceptance Criteria

1. THE Dashboard SHALL display a branch selector component in the navigation bar that lists all Branches the authenticated user is assigned to (or all Branches for a Central_Admin).
2. WHEN a user selects a Branch from the branch selector, THE Dashboard SHALL update the Branch_Context and re-fetch all data-dependent views using the newly selected `branch_id`.
3. THE Dashboard SHALL persist the selected Branch_Context in the browser session so that a page refresh does not reset the active branch.
4. WHILE no Branch_Context is selected, THE Dashboard SHALL prompt the user to select a Branch before displaying any branch-scoped data.
5. WHEN the authenticated user has access to only one Branch, THE Dashboard SHALL automatically set that Branch as the active Branch_Context without requiring manual selection.

---

### Requirement 5: Branch-Level Sales Reporting

**User Story:** As a Central Admin or Branch Operator, I want to view sales reports scoped to a specific branch, so that I can evaluate the performance of each location independently.

#### Acceptance Criteria

1. THE Order_Service SHALL expose a REST endpoint that returns aggregated sales data for a given `branch_id` and date range, including: total order count, total revenue, average order value, and a breakdown by payment mode.
2. WHEN a sales report request is received, THE Order_Service SHALL validate that the `branch_id` in the request belongs to the authenticated user's Business.
3. THE Dashboard SHALL display a branch-level sales report view that renders the data from the endpoint defined in criterion 1.
4. WHILE a Central_Admin is viewing the Dashboard, THE Dashboard SHALL provide an option to view a consolidated sales summary across all Branches of the Business side-by-side.
5. THE Order_Service SHALL support filtering the sales report by a configurable date range via `start_date` and `end_date` query parameters in ISO 8601 format.
6. IF the `start_date` is after the `end_date` in a report request, THEN THE Order_Service SHALL return an HTTP 400 response with a descriptive error message.

---

### Requirement 6: Branch-Level Inventory Reporting

**User Story:** As a Central Admin or Branch Operator, I want to view inventory status scoped to a specific branch, so that I can manage stock levels per location.

#### Acceptance Criteria

1. THE Inventory_Service SHALL expose a REST endpoint that returns inventory summary data for a given `branch_id`, including: total SKU count, total stock value (sum of stock_quantity × cost_price), and a list of low-stock Products.
2. WHEN an inventory report request is received, THE Inventory_Service SHALL validate that the `branch_id` in the request belongs to the authenticated user's Business.
3. THE Dashboard SHALL display a branch-level inventory report view that renders the data from the endpoint defined in criterion 1.
4. WHILE a Central_Admin is viewing the Dashboard, THE Dashboard SHALL provide an option to view a consolidated inventory summary across all Branches of the Business, aggregating stock quantities per SKU.
5. THE Inventory_Service SHALL expose a REST endpoint that returns the stock quantity of each Product across all Branches for a given `business_id`, accessible only to Central_Admin users.

---

### Requirement 7: Central Admin Cross-Branch View

**User Story:** As a Central Admin, I want a unified view of all branches within my business, so that I can monitor overall performance and manage branch configurations from a single screen.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a dedicated "All Branches" view accessible only to users with the Central_Admin role.
2. THE Branch_Service SHALL expose a REST endpoint that returns all Branches for a given `business_id` along with their summary metrics (active order count, low-stock product count).
3. WHEN a Central_Admin accesses the "All Branches" view, THE Dashboard SHALL display each Branch as a card showing: name, location, active order count, and low-stock product count.
4. THE Branch_Service SHALL expose a REST endpoint that returns the full list of users assigned to each Branch within a Business, accessible only to Central_Admin users.
5. IF a non-Central_Admin user attempts to access a Central_Admin-only endpoint, THEN THE Auth_Middleware SHALL return an HTTP 403 response.

---

### Requirement 8: REST API for Branch Operations

**User Story:** As a developer, I want a complete REST API for branch management, so that the Dashboard and other services can integrate with the multi-branch module.

#### Acceptance Criteria

1. THE Branch_Service SHALL expose the following endpoints:
   - `POST /branches` — create a Branch (Central_Admin only)
   - `GET /branches` — list all Branches for the authenticated Business
   - `GET /branches/:branch_id` — get a Branch by ID
   - `PUT /branches/:branch_id` — update a Branch (Central_Admin only)
   - `DELETE /branches/:branch_id` — deactivate a Branch (Central_Admin only)
   - `POST /branches/:branch_id/users` — assign a user to a Branch (Central_Admin only)
   - `DELETE /branches/:branch_id/users/:user_id` — remove a user from a Branch (Central_Admin only)
   - `GET /branches/:branch_id/users` — list users assigned to a Branch
   - `GET /branches/:branch_id/reports/sales` — branch-level sales report
   - `GET /branches/:branch_id/reports/inventory` — branch-level inventory report
2. THE Branch_Service SHALL require a valid JWT authentication token on all branch endpoints.
3. IF a request is made without a valid JWT token, THEN THE Auth_Middleware SHALL return an HTTP 401 response.
4. THE Branch_Service SHALL return all responses in JSON format with a consistent envelope structure containing `data`, `error`, and `meta` fields.
5. THE Branch_Service SHALL support pagination on list endpoints via `page` and `limit` query parameters, with a maximum limit of 100 records per page.

---

### Requirement 9: Data Isolation Guarantee

**User Story:** As a business owner, I want to be certain that data from one branch is never exposed to users of another branch, so that operational confidentiality is maintained.

#### Acceptance Criteria

1. THE Auth_Middleware SHALL reject any request where the `branch_id` in the request context does not belong to the `business_id` of the authenticated user, returning an HTTP 403 response.
2. THE Inventory_Service SHALL include `branch_id` as a mandatory filter in every SQL query that reads or writes Product or Stock_Log records.
3. THE Order_Service SHALL include `branch_id` as a mandatory filter in every SQL query that reads or writes Order or Order_Item records.
4. THE Branch_Service SHALL include `business_id` as a mandatory filter in every SQL query that reads or writes Branch records.
5. WHEN a database migration adds `branch_id` to an existing table, THE migration script SHALL back-fill the `branch_id` of the default "Main Branch" for all existing records within each Business so that no record is left without a branch association.
