# Requirements Document

## Introduction

This document defines the requirements for the Invoice PDF Generation feature of the commerce-os POS system. The feature automatically generates a formatted A4 PDF invoice whenever a sale is completed, stores the invoice record in PostgreSQL scoped to a branch, and exposes endpoints for downloading and email-sharing invoices. A frontend invoice history view and per-sale download button are added to the Next.js dashboard.

This feature integrates with the payment-gateway-integration spec (Requirement 8: when a Transaction transitions to `success`, the Order_Service marks the Order as completed — invoice generation is triggered at this point), the RBAC spec (Staff and Owner roles govern invoice access), and the multi-branch-support spec (all Invoice records are scoped to a `branch_id`).

---

## Glossary

- **Invoice_Service**: The Node.js/Express backend service responsible for invoice generation, storage, retrieval, and email delivery.
- **Invoice**: A record representing a generated invoice for a completed Order, stored in PostgreSQL with fields: `invoice_id`, `invoice_number`, `order_id`, `branch_id`, `business_id`, `issued_at`, `pdf_path`, `email_sent`, `created_at`.
- **Invoice_Number**: A human-readable, unique identifier for an Invoice within a Business, formatted as `INV-{YYYYMMDD}-{sequence}` (e.g., `INV-20240115-0042`).
- **PDF_Generator**: The server-side component using pdfkit that renders Invoice data into an A4-formatted PDF binary.
- **Invoice_Template**: The layout definition used by the PDF_Generator, including business branding, line items table, totals section, and footer.
- **Line_Item**: A single product entry on an Invoice, containing: product name, quantity, unit price, and line total.
- **Order_Service**: The existing Node.js/Express service for order/sales operations, as defined in the multi-branch-support spec.
- **Payment_Service**: The existing Node.js/Express service for payment operations, as defined in the payment-gateway-integration spec.
- **Email_Service**: The component responsible for composing and sending invoice emails with the PDF attached.
- **Invoice_History_Page**: The Next.js React page in the Dashboard that lists past invoices for the active branch with search and filter capabilities.
- **Dashboard**: The existing Next.js React frontend, extended with the Invoice_History_Page and per-sale download controls.
- **Owner**: The user role defined in the RBAC spec with full management permissions, including invoice history management.
- **Staff**: The user role defined in the RBAC spec with `sales:create` and `sales:read` permissions, permitted to download invoices.
- **Branch**: A sub-unit of a Business as defined in the multi-branch-support spec, identified by `branch_id`.
- **Business_Profile**: The record containing business name, logo URL, address, and tax registration number used to brand invoices.

---

## Requirements

### Requirement 1: Automatic Invoice Generation on Sale Completion

**User Story:** As a system architect, I want an invoice to be generated automatically when a sale is completed, so that no manual step is required and every successful transaction has a corresponding invoice.

#### Acceptance Criteria

1. WHEN the Order_Service marks an Order as completed (triggered by a `success` Transaction as defined in payment-gateway-integration Requirement 8), THE Invoice_Service SHALL generate a PDF invoice for that Order.
2. THE Invoice_Service SHALL assign a unique Invoice_Number to each Invoice in the format `INV-{YYYYMMDD}-{sequence}`, where `sequence` is a zero-padded 4-digit integer that resets to `0001` each calendar day per `business_id`.
3. THE Invoice_Service SHALL persist the Invoice record to PostgreSQL with `branch_id` and `business_id` set to the values of the completed Order.
4. THE Invoice_Service SHALL complete invoice generation and storage within 5 seconds of the Order completion event.
5. IF invoice generation fails, THEN THE Invoice_Service SHALL log the error with the `order_id` and retry generation up to 3 times with exponential backoff before marking the Invoice record with a `generation_failed` status.
6. THE Invoice_Service SHALL enforce that each Order has at most one Invoice record; duplicate generation attempts for the same `order_id` SHALL be rejected with no new record created.

---

### Requirement 2: Invoice Content and Layout

**User Story:** As a business owner, I want each invoice to display my business branding and a complete breakdown of the sale, so that customers receive a professional and accurate document.

#### Acceptance Criteria

1. THE PDF_Generator SHALL render the following sections on every invoice: business header, invoice metadata, line items table, totals section, and footer.
2. THE PDF_Generator SHALL render the business header containing: business name, logo image (if a logo URL is configured in the Business_Profile), business address, and tax registration number.
3. THE PDF_Generator SHALL render invoice metadata containing: Invoice_Number, issue date and time in the branch's local timezone, and the Order reference ID.
4. THE PDF_Generator SHALL render a line items table with columns: item name, quantity, unit price, and line total; one row per Line_Item in the Order.
5. THE PDF_Generator SHALL render a totals section containing: subtotal (sum of all line totals), discount amount (if any discount was applied to the Order), tax amount (calculated at the tax rate configured in the Business_Profile), and grand total.
6. THE PDF_Generator SHALL render a footer containing a thank-you message and the business contact information from the Business_Profile.
7. IF the Business_Profile does not have a logo URL configured, THEN THE PDF_Generator SHALL render the business name as text in the header without an image placeholder.
8. THE PDF_Generator SHALL format all monetary values with the currency symbol and two decimal places consistent with the Order's currency.

---

### Requirement 3: A4 PDF Formatting

**User Story:** As a staff member, I want invoices to be formatted for A4 paper, so that they print correctly on standard office printers.

#### Acceptance Criteria

1. THE PDF_Generator SHALL produce PDF documents with A4 page dimensions (210 mm × 297 mm).
2. THE PDF_Generator SHALL use pdfkit as the server-side PDF rendering library.
3. THE PDF_Generator SHALL apply margins of at least 15 mm on all four sides of the A4 page.
4. THE PDF_Generator SHALL use a font size of at least 9pt for body text and at least 12pt for section headings to ensure legibility when printed.
5. WHEN the line items table exceeds the available vertical space on a single page, THE PDF_Generator SHALL continue the table on a subsequent page and repeat the column headers at the top of each continuation page.
6. THE PDF_Generator SHALL embed all fonts used in the PDF so that the document renders consistently across all PDF viewers and printers.

---

### Requirement 4: Invoice Storage

**User Story:** As an owner, I want all generated invoices to be stored and retrievable, so that I can access past invoices for accounting, audits, and customer queries.

#### Acceptance Criteria

1. THE Invoice_Service SHALL store each Invoice record in PostgreSQL with the following fields: `invoice_id` (UUID), `invoice_number`, `order_id`, `branch_id`, `business_id`, `issued_at` (UTC timestamp), `pdf_path` (file system or object storage path), `email_sent` (boolean), `created_at`.
2. THE Invoice_Service SHALL enforce that `branch_id` and `business_id` are non-nullable on every Invoice record.
3. THE Invoice_Service SHALL store the generated PDF binary to the server file system or a configured object storage path and record the path in `pdf_path`.
4. THE Invoice_Service SHALL expose a `GET /api/invoices` endpoint that returns paginated Invoice records filtered by the authenticated user's `branch_id`, with optional filters for date range and Invoice_Number prefix.
5. WHEN a list request is received, THE RBAC_Middleware SHALL verify that the authenticated user has the `sales:read` permission before returning Invoice records.
6. THE Invoice_Service SHALL expose a `GET /api/invoices/:invoice_id` endpoint that returns a single Invoice record.
7. IF a request targets an Invoice that belongs to a different `branch_id` than the authenticated user's branch, THEN THE Invoice_Service SHALL return an HTTP 403 response.
8. THE Invoice_Service SHALL support pagination on the list endpoint via `page` and `limit` query parameters, with a maximum limit of 100 records per page.

---

### Requirement 5: Invoice Download

**User Story:** As a staff member or owner, I want to download an invoice as a PDF, so that I can print it or share it with the customer directly.

#### Acceptance Criteria

1. THE Invoice_Service SHALL expose a `GET /api/invoices/:invoice_id/download` endpoint that streams the PDF binary to the client with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="{invoice_number}.pdf"`.
2. WHEN a download request is received, THE RBAC_Middleware SHALL verify that the authenticated user has the `sales:read` permission before serving the PDF.
3. IF the authenticated user's `branch_id` does not match the Invoice's `branch_id`, THEN THE Invoice_Service SHALL return an HTTP 403 response.
4. IF the PDF file referenced by `pdf_path` is not found on the file system or object storage, THEN THE Invoice_Service SHALL return an HTTP 404 response with a descriptive error message.
5. THE Dashboard SHALL display a "Download Invoice" button on the sale completion screen and on each row of the Invoice_History_Page.
6. WHEN the "Download Invoice" button is clicked, THE Dashboard SHALL call the download endpoint and trigger a browser file download without navigating away from the current page.

---

### Requirement 6: Email Sharing

**User Story:** As a staff member, I want to email an invoice to a customer's email address, so that the customer receives a digital copy without needing to be physically present.

#### Acceptance Criteria

1. THE Invoice_Service SHALL expose a `POST /api/invoices/:invoice_id/email` endpoint that accepts a `recipient_email` address in the request body and sends the invoice PDF as an email attachment.
2. WHEN an email request is received, THE RBAC_Middleware SHALL verify that the authenticated user has the `sales:create` permission before sending the email.
3. THE Email_Service SHALL compose an email with the subject `"Invoice {invoice_number} from {business_name}"`, a plain-text body containing the grand total and issue date, and the invoice PDF attached.
4. WHEN the email is sent successfully, THE Invoice_Service SHALL update the `email_sent` field on the Invoice record to `true` and record the `recipient_email` in an `email_log` JSON field.
5. IF the email delivery fails, THEN THE Invoice_Service SHALL return an HTTP 502 response with a descriptive error message and SHALL NOT update the `email_sent` field.
6. THE Invoice_Service SHALL validate that `recipient_email` is a syntactically valid email address before attempting delivery; IF the address is invalid, THEN THE Invoice_Service SHALL return an HTTP 422 response.
7. THE Dashboard SHALL display a "Send by Email" button on the sale completion screen and on each row of the Invoice_History_Page, opening a modal that accepts the recipient email address.

---

### Requirement 7: Invoice History View

**User Story:** As an owner or staff member, I want to view a list of past invoices for my branch, so that I can look up specific invoices and track billing history.

#### Acceptance Criteria

1. THE Invoice_History_Page SHALL display a paginated table of Invoice records for the active Branch_Context, with columns: Invoice_Number, Order ID, issue date, grand total, email sent status, and action buttons (Download, Send by Email).
2. THE Invoice_History_Page SHALL provide a date range filter and an Invoice_Number search field that query the `GET /api/invoices` endpoint with the corresponding parameters.
3. WHEN the Invoice_History_Page is loaded, THE Dashboard SHALL fetch the first page of Invoice records for the active `branch_id` and display them within 3 seconds under normal network conditions.
4. THE Invoice_History_Page SHALL be accessible to authenticated users with the `sales:read` permission; unauthenticated users SHALL be redirected to the login page.
5. WHILE the Invoice_History_Page is fetching data, THE Dashboard SHALL display a loading indicator in place of the table.
6. IF the `GET /api/invoices` request returns an empty result set, THEN THE Invoice_History_Page SHALL display a "No invoices found" message rather than an empty table.
7. THE Invoice_History_Page SHALL update the displayed list without a full page reload when the user changes the date range filter or search field value.

---

### Requirement 8: Invoice Number Uniqueness and Auditability

**User Story:** As an accountant, I want each invoice to have a unique, sequential invoice number, so that invoices can be referenced unambiguously in financial records.

#### Acceptance Criteria

1. THE Invoice_Service SHALL guarantee that Invoice_Number values are unique within a `business_id`.
2. THE Invoice_Service SHALL generate Invoice_Numbers using a database sequence or atomic counter to prevent duplicate numbers under concurrent invoice generation.
3. THE Invoice_Service SHALL NOT reuse an Invoice_Number once assigned, even if the associated Invoice record is deleted.
4. THE Invoice_Service SHALL expose a `GET /api/invoices/:invoice_id/audit` endpoint accessible only to users with the Owner role, returning the full Invoice record including `email_log` and generation timestamps.
5. WHEN an audit endpoint request is received, THE RBAC_Middleware SHALL verify that the authenticated user holds the Owner role; IF the user does not hold the Owner role, THEN THE RBAC_Middleware SHALL return an HTTP 403 response.

---

### Requirement 9: REST API for Invoice Operations

**User Story:** As a developer, I want a complete REST API for invoice operations, so that the Dashboard and other services can integrate with the invoice module.

#### Acceptance Criteria

1. THE Invoice_Service SHALL expose the following endpoints:
   - `GET /api/invoices` — list invoices for the active branch (requires `sales:read`)
   - `GET /api/invoices/:invoice_id` — get an invoice by ID (requires `sales:read`)
   - `GET /api/invoices/:invoice_id/download` — download invoice PDF (requires `sales:read`)
   - `POST /api/invoices/:invoice_id/email` — email invoice to a recipient (requires `sales:create`)
   - `GET /api/invoices/:invoice_id/audit` — full audit record (requires Owner role)
2. THE Invoice_Service SHALL require a valid JWT Access_Token on all endpoints.
3. IF a request is made without a valid JWT token, THEN THE RBAC_Middleware SHALL return an HTTP 401 response.
4. THE Invoice_Service SHALL return all responses in JSON format with a consistent envelope structure containing `data`, `error`, and `meta` fields, consistent with the pattern established in the payment-gateway-integration spec.
5. THE Invoice_Service SHALL scope all invoice queries to the `branch_id` of the authenticated user, consistent with the data isolation guarantee defined in the multi-branch-support spec Requirement 9.
6. THE Invoice_Service SHALL include `invoice_id`, `invoice_number`, `order_id`, `branch_id`, `issued_at`, `email_sent`, and `pdf_path` in the standard Invoice response object.
