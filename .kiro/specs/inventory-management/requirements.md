# Requirements Document

## Introduction

This document defines the requirements for the Inventory Management module of the commerce-os POS web application. The module enables store operators to track product stock levels, manage stock movements, receive low-stock alerts, view inventory analytics, bulk-upload products via CSV, and access all inventory data through a REST API. The React dashboard provides real-time visibility into stock status using polling or WebSockets.

## Glossary

- **Inventory_Service**: The Node.js/Express backend service responsible for all inventory operations.
- **Dashboard**: The Next.js React frontend page that displays inventory data to the user.
- **Product**: A sellable item tracked in the inventory with fields: product_id, name, SKU, category, price, cost_price, stock_quantity, reorder_level.
- **Stock_Log**: An immutable record of a stock movement event, containing: log_id, product_id, timestamp, user_id, action_type, quantity_delta.
- **Action_Type**: An enumerated value representing the type of stock movement: SALE, RESTOCK, ADJUSTMENT, BULK_UPLOAD.
- **Low_Stock_Alert**: A notification condition triggered when a product's stock_quantity falls below its reorder_level.
- **CSV_Importer**: The backend component that parses and validates CSV files for bulk product uploads.
- **WebSocket_Server**: The server-side component that pushes real-time inventory updates to connected Dashboard clients.
- **Operator**: An authenticated user with permission to manage inventory.

---

## Requirements

### Requirement 1: Product Management

**User Story:** As an Operator, I want to create, read, update, and delete products with full inventory fields, so that I can maintain an accurate product catalog.

#### Acceptance Criteria

1. THE Inventory_Service SHALL expose REST endpoints for creating, retrieving, updating, and deleting Product records.
2. WHEN a create or update request is received, THE Inventory_Service SHALL validate that name, SKU, price, cost_price, stock_quantity, and reorder_level are present and that price, cost_price, stock_quantity, and reorder_level are non-negative numbers.
3. THE Inventory_Service SHALL enforce uniqueness of SKU across all Product records within the same business.
4. IF a create or update request contains a duplicate SKU, THEN THE Inventory_Service SHALL return an HTTP 409 response with a descriptive error message.
5. IF a delete request targets a Product that does not exist, THEN THE Inventory_Service SHALL return an HTTP 404 response.
6. THE Inventory_Service SHALL store all Product records in the PostgreSQL database.

---

### Requirement 2: Stock Movement Logging

**User Story:** As an Operator, I want every stock change to be recorded with a timestamp, user, action type, and quantity delta, so that I have a full audit trail of inventory movements.

#### Acceptance Criteria

1. WHEN a stock-in or stock-out operation is performed, THE Inventory_Service SHALL create a Stock_Log record containing product_id, timestamp, user_id, action_type, and quantity_delta.
2. THE Inventory_Service SHALL set the timestamp of each Stock_Log to the UTC time at which the operation was processed.
3. THE Inventory_Service SHALL accept action_type values of SALE, RESTOCK, ADJUSTMENT, and BULK_UPLOAD only.
4. IF an unsupported action_type value is provided, THEN THE Inventory_Service SHALL return an HTTP 400 response.
5. THE Inventory_Service SHALL expose a paginated REST endpoint that returns Stock_Log records filtered by product_id and optionally by date range.
6. THE Inventory_Service SHALL store Stock_Log records as immutable entries; existing logs SHALL NOT be modified or deleted via the API.

---

### Requirement 3: Automatic Stock Update on Sale

**User Story:** As an Operator, I want the inventory to be decremented automatically when a sale is completed, so that stock levels always reflect actual availability.

#### Acceptance Criteria

1. WHEN a sale order is completed, THE Inventory_Service SHALL decrement the stock_quantity of each sold Product by the quantity sold.
2. WHEN a sale order is completed, THE Inventory_Service SHALL create a Stock_Log record with action_type SALE for each affected Product.
3. IF a sale would reduce a Product's stock_quantity below zero, THEN THE Inventory_Service SHALL reject the sale and return an HTTP 422 response with a descriptive error message.
4. THE Inventory_Service SHALL perform the stock decrement and Stock_Log creation within a single database transaction so that partial updates do not occur.

---

### Requirement 4: Low Stock Alerts

**User Story:** As an Operator, I want to be alerted when a product's stock falls below its reorder level, so that I can restock before running out.

#### Acceptance Criteria

1. WHILE a Product's stock_quantity is less than its reorder_level, THE Inventory_Service SHALL include that Product in the low-stock alerts response.
2. THE Inventory_Service SHALL expose a REST endpoint that returns all Products whose stock_quantity is less than their reorder_level.
3. WHEN a stock movement causes a Product's stock_quantity to fall below its reorder_level, THE WebSocket_Server SHALL emit a low_stock_alert event to all connected Dashboard clients for that business.
4. THE Dashboard SHALL display a visible low-stock indicator for each Product whose stock_quantity is less than its reorder_level.

---

### Requirement 5: Inventory Dashboard

**User Story:** As an Operator, I want a dashboard that shows current stock levels, low-stock items, and fast-moving products, so that I can make informed restocking and purchasing decisions.

#### Acceptance Criteria

1. THE Dashboard SHALL display a list of all Products with their current stock_quantity, reorder_level, and a visual indicator of stock status (normal or low).
2. THE Dashboard SHALL display a dedicated section listing all Products currently in low-stock status.
3. THE Inventory_Service SHALL expose a REST endpoint that returns the top 10 Products ranked by total quantity sold within a configurable time window (default: last 30 days).
4. THE Dashboard SHALL display the fast-moving products list using data from the endpoint defined in criterion 3.
5. WHEN the Dashboard is open, THE Dashboard SHALL refresh inventory data at an interval no greater than 30 seconds using either WebSocket push or HTTP polling.

---

### Requirement 6: Bulk Upload via CSV

**User Story:** As an Operator, I want to upload a CSV file to create or update multiple products at once, so that I can efficiently manage large catalogs.

#### Acceptance Criteria

1. THE Inventory_Service SHALL expose a REST endpoint that accepts a multipart/form-data request containing a CSV file.
2. THE CSV_Importer SHALL parse the CSV file and expect the following columns in order: name, SKU, category, price, cost_price, stock_quantity, reorder_level.
3. WHEN a CSV file is uploaded, THE CSV_Importer SHALL validate each row for required fields and correct data types before persisting any records.
4. IF any row in the CSV file fails validation, THEN THE Inventory_Service SHALL return an HTTP 422 response listing all invalid rows with their row numbers and error descriptions, and SHALL NOT persist any records from that upload.
5. WHEN all rows in the CSV file pass validation, THE CSV_Importer SHALL upsert each Product record (insert if SKU does not exist, update if SKU already exists) within a single database transaction.
6. WHEN a bulk upload completes successfully, THE Inventory_Service SHALL create a Stock_Log record with action_type BULK_UPLOAD for each Product whose stock_quantity was changed.
7. THE Inventory_Service SHALL reject CSV files larger than 5 MB and return an HTTP 413 response.

---

### Requirement 7: REST API

**User Story:** As a developer, I want a complete REST API for inventory operations, so that the Dashboard and other services can integrate with the inventory module.

#### Acceptance Criteria

1. THE Inventory_Service SHALL expose the following endpoints:
   - `GET /api/inventory/products` — list all products with pagination
   - `POST /api/inventory/products` — create a product
   - `GET /api/inventory/products/:id` — get a product by ID
   - `PUT /api/inventory/products/:id` — update a product
   - `DELETE /api/inventory/products/:id` — delete a product
   - `POST /api/inventory/products/:id/stock` — apply a stock adjustment
   - `GET /api/inventory/products/:id/logs` — get stock logs for a product
   - `GET /api/inventory/alerts/low-stock` — get all low-stock products
   - `GET /api/inventory/reports/fast-moving` — get fast-moving products
   - `POST /api/inventory/upload/csv` — bulk upload products via CSV
2. THE Inventory_Service SHALL require a valid JWT authentication token on all inventory endpoints.
3. IF a request is made without a valid JWT token, THEN THE Inventory_Service SHALL return an HTTP 401 response.
4. THE Inventory_Service SHALL return all responses in JSON format with consistent envelope structure containing `data`, `error`, and `meta` fields.
5. THE Inventory_Service SHALL support pagination on list endpoints via `page` and `limit` query parameters, with a maximum limit of 100 records per page.

---

### Requirement 8: Real-Time Updates

**User Story:** As an Operator, I want the Dashboard to reflect inventory changes in real time, so that I always see the current state without manually refreshing.

#### Acceptance Criteria

1. THE WebSocket_Server SHALL accept WebSocket connections from authenticated Dashboard clients.
2. WHEN a stock_quantity change occurs for any Product, THE WebSocket_Server SHALL emit a stock_updated event containing the updated Product data to all connected clients for that business.
3. WHEN a Product enters low-stock status, THE WebSocket_Server SHALL emit a low_stock_alert event to all connected clients for that business.
4. IF a WebSocket connection is not available, THE Dashboard SHALL fall back to HTTP polling at an interval of 30 seconds.
5. THE Dashboard SHALL update the displayed stock_quantity for a Product within 2 seconds of receiving a stock_updated WebSocket event.
