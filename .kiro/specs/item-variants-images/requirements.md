# Requirements Document

## Introduction

This document defines the requirements for the Item Variants + Images feature of the Commerce OS POS system. The feature extends the existing catalog (`items` table) to support configurable variant groups (e.g., Size, Flavor, Spice Level, Color) with individual options that carry a price modifier or absolute price override. Each catalog item may also have one or more images. Variants are selectable at the POS when adding an item to cart, and both variants and images are surfaced on the customer-facing public store page. All data remains scoped to `branch_id` and `business_id` per the multi-branch-support spec, and write operations are restricted to users with the `products:write` permission per the RBAC spec.

---

## Glossary

- **Catalog_Service**: The Node.js/Express backend service responsible for catalog item, variant, and image operations.
- **Item**: An existing catalog record in the `items` table, identified by `item_id`, scoped to `business_id` and `branch_id`.
- **Variant_Group**: A named set of selectable options attached to an Item (e.g., "Size", "Flavor"). Each Item may have zero or more Variant_Groups.
- **Variant_Option**: A single selectable choice within a Variant_Group (e.g., "Small", "Medium", "Large"). Each Variant_Option carries either a `price_modifier` (delta applied to the Item base price) or an `absolute_price` (overrides the Item base price entirely), but not both.
- **Item_Image**: A record linking an uploaded image file to an Item, containing `image_id`, `item_id`, `url`, `display_order`, and `is_primary` flag.
- **Image_Store**: The storage backend (local filesystem or object storage) where uploaded image files are persisted.
- **POS_Page**: The Next.js page (`/pos`) where staff select items and add them to a cart.
- **Variant_Selector**: The UI component on the POS_Page and Public_Store that presents Variant_Groups and their Variant_Options for a given Item.
- **Public_Store**: The customer-facing Next.js page (`/store/[slug]`) where customers browse items and place online orders.
- **Catalog_Manager**: The Next.js page (`/items`) where owners manage catalog items, variant groups, and images.
- **Owner**: An authenticated user with the `products:write` and `products:delete` permissions (as defined in the RBAC spec).
- **Staff**: An authenticated user with `sales:create` and `sales:read` permissions only; Staff cannot modify catalog data.
- **Cart_Line**: A single line in the POS or Public_Store cart representing one Item with a chosen set of Variant_Options and a resolved price.

---

## Requirements

### Requirement 1: Variant Group Management

**User Story:** As an Owner, I want to define named variant groups (e.g., Size, Flavor) for each catalog item, so that I can offer customers structured choices when purchasing.

#### Acceptance Criteria

1. THE Catalog_Service SHALL expose REST endpoints for creating, retrieving, updating, and deleting Variant_Groups scoped to an Item.
2. WHEN a create request for a Variant_Group is received, THE Catalog_Service SHALL validate that `name` is a non-empty string and that the referenced `item_id` exists within the authenticated `branch_id`.
3. THE Catalog_Service SHALL enforce uniqueness of `name` within the same Item's Variant_Groups.
4. IF a create request contains a duplicate Variant_Group `name` for the same Item, THEN THE Catalog_Service SHALL return an HTTP 409 response with a descriptive error message.
5. THE Catalog_Service SHALL support a `is_required` boolean field on each Variant_Group indicating whether the customer must select an option before adding the Item to cart.
6. IF a delete request targets a Variant_Group that does not exist within the authenticated Item, THEN THE Catalog_Service SHALL return an HTTP 404 response.
7. WHEN a Variant_Group is deleted, THE Catalog_Service SHALL cascade-delete all associated Variant_Options within a single database transaction.
8. THE Catalog_Service SHALL require the authenticated user to hold the `products:write` permission for all Variant_Group write operations.
9. IF a write request is made by a user without the `products:write` permission, THEN THE Catalog_Service SHALL return an HTTP 403 response.

---

### Requirement 2: Variant Option Management

**User Story:** As an Owner, I want to add options to each variant group with individual pricing rules, so that each choice can reflect its correct price.

#### Acceptance Criteria

1. THE Catalog_Service SHALL expose REST endpoints for creating, retrieving, updating, and deleting Variant_Options within a Variant_Group.
2. WHEN a create or update request for a Variant_Option is received, THE Catalog_Service SHALL validate that `label` is a non-empty string.
3. THE Catalog_Service SHALL enforce that each Variant_Option carries exactly one of `price_modifier` (a positive, negative, or zero numeric delta) or `absolute_price` (a non-negative number), but not both simultaneously.
4. IF a create or update request provides both `price_modifier` and `absolute_price`, THEN THE Catalog_Service SHALL return an HTTP 400 response with a descriptive error message.
5. IF a create or update request provides neither `price_modifier` nor `absolute_price`, THEN THE Catalog_Service SHALL default `price_modifier` to 0.
6. THE Catalog_Service SHALL enforce uniqueness of `label` within the same Variant_Group.
7. IF a create request contains a duplicate `label` within the same Variant_Group, THEN THE Catalog_Service SHALL return an HTTP 409 response.
8. THE Catalog_Service SHALL support a `display_order` integer field on Variant_Options to control the order in which options are presented in the UI.
9. THE Catalog_Service SHALL require the authenticated user to hold the `products:write` permission for all Variant_Option write operations.

---

### Requirement 3: Resolved Price Calculation

**User Story:** As a Staff member or customer, I want the system to calculate the correct price for an item with selected variants, so that the cart always reflects the accurate charge.

#### Acceptance Criteria

1. WHEN a Cart_Line is created with a set of selected Variant_Options, THE Catalog_Service SHALL compute the resolved price as follows: if any selected Variant_Option has an `absolute_price`, the highest `absolute_price` among selected options SHALL be used as the resolved price; otherwise, the resolved price SHALL equal the Item's base `price` plus the sum of all selected `price_modifier` values.
2. THE Catalog_Service SHALL expose a REST endpoint that accepts an `item_id` and a list of `variant_option_id` values and returns the resolved price.
3. WHEN the resolved price is computed, THE Catalog_Service SHALL validate that all provided `variant_option_id` values belong to Variant_Groups of the specified Item.
4. IF any provided `variant_option_id` does not belong to the specified Item, THEN THE Catalog_Service SHALL return an HTTP 400 response with a descriptive error message.
5. WHEN a Variant_Group has `is_required` set to true and no Variant_Option from that group is included in the selection, THE Catalog_Service SHALL return an HTTP 422 response indicating which required groups are missing.
6. THE Catalog_Service SHALL return the resolved price as a non-negative number rounded to 2 decimal places.

---

### Requirement 4: Image Upload and Management

**User Story:** As an Owner, I want to upload images for catalog items, so that staff and customers can visually identify products on the POS and public store.

#### Acceptance Criteria

1. THE Catalog_Service SHALL expose a REST endpoint that accepts a multipart/form-data request containing one image file and associates it with an Item.
2. WHEN an image upload request is received, THE Catalog_Service SHALL validate that the file is one of the accepted MIME types: `image/jpeg`, `image/png`, or `image/webp`.
3. IF an uploaded file has a MIME type other than `image/jpeg`, `image/png`, or `image/webp`, THEN THE Catalog_Service SHALL return an HTTP 415 response.
4. THE Catalog_Service SHALL reject image files larger than 5 MB and return an HTTP 413 response.
5. WHEN an image is uploaded, THE Catalog_Service SHALL store the file in the Image_Store and persist an Item_Image record containing `item_id`, `url`, `display_order`, and `is_primary`.
6. THE Catalog_Service SHALL allow an Item to have a maximum of 10 Item_Image records.
7. IF an upload request would cause an Item to exceed 10 Item_Image records, THEN THE Catalog_Service SHALL return an HTTP 422 response with a descriptive error message.
8. WHEN the first image is uploaded for an Item, THE Catalog_Service SHALL automatically set `is_primary` to true for that image.
9. THE Catalog_Service SHALL expose a REST endpoint to update the `display_order` and `is_primary` flag of Item_Image records for a given Item.
10. WHEN `is_primary` is set to true for an Item_Image, THE Catalog_Service SHALL set `is_primary` to false for all other Item_Image records of the same Item within a single database transaction.
11. THE Catalog_Service SHALL expose a REST endpoint to delete an Item_Image record and remove the corresponding file from the Image_Store.
12. THE Catalog_Service SHALL require the authenticated user to hold the `products:write` permission for all image write operations.

---

### Requirement 5: Catalog Manager UI — Variants

**User Story:** As an Owner, I want to manage variant groups and options for each item from the catalog management page, so that I can configure product choices without using the API directly.

#### Acceptance Criteria

1. THE Catalog_Manager SHALL display a "Variants" section for each Item that lists all Variant_Groups and their Variant_Options.
2. WHEN an Owner opens the Variants section for an Item, THE Catalog_Manager SHALL fetch and display all Variant_Groups ordered by creation date and all Variant_Options ordered by `display_order`.
3. THE Catalog_Manager SHALL provide controls to add, edit, and delete Variant_Groups and Variant_Options for an Item.
4. WHEN an Owner saves a Variant_Option, THE Catalog_Manager SHALL display the resolved price preview based on the Item's base price and the entered pricing rule.
5. THE Catalog_Manager SHALL restrict all variant write controls to users with the `products:write` permission; Staff users SHALL see variant data as read-only.

---

### Requirement 6: Catalog Manager UI — Images

**User Story:** As an Owner, I want to upload and reorder images for each catalog item from the catalog management page, so that I can control how items appear visually.

#### Acceptance Criteria

1. THE Catalog_Manager SHALL display an "Images" section for each Item showing all Item_Image records as thumbnails ordered by `display_order`.
2. THE Catalog_Manager SHALL provide an upload control that allows an Owner to select and upload image files conforming to the accepted types and size limit.
3. WHEN an image upload completes, THE Catalog_Manager SHALL display the new thumbnail in the Images section without requiring a full page reload.
4. THE Catalog_Manager SHALL allow an Owner to reorder images by dragging thumbnails, and SHALL persist the updated `display_order` values via the Catalog_Service.
5. THE Catalog_Manager SHALL allow an Owner to designate any image as the primary image, and SHALL reflect the change immediately in the UI.
6. THE Catalog_Manager SHALL allow an Owner to delete an image, and SHALL remove the thumbnail from the UI upon successful deletion.
7. THE Catalog_Manager SHALL restrict all image write controls to users with the `products:write` permission; Staff users SHALL see images as read-only.

---

### Requirement 7: POS Variant Selection

**User Story:** As a Staff member, I want to select variants for an item at the POS before adding it to the cart, so that the order captures the customer's exact choices.

#### Acceptance Criteria

1. WHEN a Staff member taps an Item on the POS_Page that has one or more Variant_Groups, THE POS_Page SHALL open the Variant_Selector before adding the Item to the cart.
2. THE Variant_Selector SHALL display each Variant_Group as a labeled section with its Variant_Options presented as selectable buttons showing the option label and price impact.
3. WHEN a Variant_Option with a `price_modifier` is displayed, THE Variant_Selector SHALL show the modifier as a signed value (e.g., "+$1.00", "-$0.50", or "$0.00").
4. WHEN a Variant_Option with an `absolute_price` is displayed, THE Variant_Selector SHALL show the absolute price value (e.g., "$12.00").
5. WHILE a Variant_Group has `is_required` set to true, THE Variant_Selector SHALL disable the confirm button until an option from that group is selected.
6. WHEN the Staff member confirms the selection, THE POS_Page SHALL add a Cart_Line containing the Item, the selected Variant_Options, and the resolved price returned by the Catalog_Service.
7. THE POS_Page SHALL display the primary Item_Image thumbnail on each item card in the item grid, falling back to a placeholder if no image exists.
8. WHEN an Item has no Variant_Groups, THE POS_Page SHALL add the Item to the cart directly without opening the Variant_Selector.

---

### Requirement 8: Public Store Variants and Images

**User Story:** As a customer, I want to see item images and select variants on the public store before adding to my cart, so that I can make informed purchasing decisions.

#### Acceptance Criteria

1. THE Public_Store SHALL display the primary Item_Image for each Item in the item listing grid, falling back to a placeholder image if no primary image exists.
2. WHEN a customer opens an Item detail view on the Public_Store, THE Public_Store SHALL display all Item_Image records in a gallery ordered by `display_order`.
3. WHEN a customer opens an Item detail view that has one or more Variant_Groups, THE Public_Store SHALL render the Variant_Selector showing all groups and their options.
4. WHILE a Variant_Group has `is_required` set to true, THE Public_Store SHALL disable the "Add to Cart" button until an option from that group is selected.
5. WHEN a customer selects Variant_Options, THE Public_Store SHALL display the resolved price in real time by calling the Catalog_Service price resolution endpoint.
6. WHEN a customer confirms the selection and adds the Item to cart, THE Public_Store SHALL include the selected Variant_Option IDs and resolved price in the cart line.
7. THE Public_Store SHALL display variant selections as a summary line beneath the item name in the cart (e.g., "Size: Large, Flavor: Mild").

---

### Requirement 9: Data Scoping and Integrity

**User Story:** As a system architect, I want all variant and image data to be scoped to branch and business, so that multi-tenant data isolation is preserved.

#### Acceptance Criteria

1. THE Catalog_Service SHALL scope all Variant_Group and Variant_Option queries by `branch_id` and `business_id`, consistent with the multi-branch-support spec.
2. THE Catalog_Service SHALL scope all Item_Image queries by `item_id`, which is itself scoped to `branch_id` and `business_id`.
3. IF a request references an `item_id` that does not belong to the authenticated `branch_id` and `business_id`, THEN THE Catalog_Service SHALL return an HTTP 404 response.
4. WHEN an Item is deleted, THE Catalog_Service SHALL cascade-delete all associated Variant_Groups, Variant_Options, and Item_Image records, and SHALL remove the corresponding image files from the Image_Store, within a single database transaction.
5. THE Catalog_Service SHALL include `branch_id` as a mandatory filter in every SQL query that reads or writes Variant_Group, Variant_Option, or Item_Image records.

---

### Requirement 10: REST API

**User Story:** As a developer, I want a complete REST API for variant and image operations, so that the POS, public store, and catalog manager can integrate with this feature.

#### Acceptance Criteria

1. THE Catalog_Service SHALL expose the following endpoints:
   - `GET /api/items/:item_id/variant-groups` — list all Variant_Groups for an Item
   - `POST /api/items/:item_id/variant-groups` — create a Variant_Group
   - `PUT /api/items/:item_id/variant-groups/:group_id` — update a Variant_Group
   - `DELETE /api/items/:item_id/variant-groups/:group_id` — delete a Variant_Group
   - `GET /api/items/:item_id/variant-groups/:group_id/options` — list Variant_Options
   - `POST /api/items/:item_id/variant-groups/:group_id/options` — create a Variant_Option
   - `PUT /api/items/:item_id/variant-groups/:group_id/options/:option_id` — update a Variant_Option
   - `DELETE /api/items/:item_id/variant-groups/:group_id/options/:option_id` — delete a Variant_Option
   - `POST /api/items/:item_id/resolve-price` — resolve price for a set of selected Variant_Options
   - `GET /api/items/:item_id/images` — list all Item_Image records for an Item
   - `POST /api/items/:item_id/images` — upload an image for an Item
   - `PUT /api/items/:item_id/images/:image_id` — update display_order or is_primary for an Item_Image
   - `DELETE /api/items/:item_id/images/:image_id` — delete an Item_Image
2. THE Catalog_Service SHALL require a valid JWT authentication token on all endpoints.
3. IF a request is made without a valid JWT token, THEN THE Catalog_Service SHALL return an HTTP 401 response.
4. THE Catalog_Service SHALL return all responses in JSON format with a consistent envelope structure containing `data`, `error`, and `meta` fields.
5. THE Catalog_Service SHALL support pagination on list endpoints via `page` and `limit` query parameters, with a maximum limit of 100 records per page.
