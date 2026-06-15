# Implementation Plan: Item Variants + Images

## Overview

Implement variant groups, variant options, price resolution, and image management for Commerce OS catalog items. Tasks are ordered: DB migrations → backend routes → frontend components → wiring.

## Tasks

- [x] 1. Database migrations
  - [x] 1.1 Create `variant_groups` table migration
    - Create `variant_groups` with `id`, `item_id` (FK → items ON DELETE CASCADE), `name`, `is_required`, `created_at`
    - Add `UNIQUE(item_id, name)` constraint and `idx_variant_groups_item` index
    - _Requirements: 1.1, 1.3, 9.1_

  - [x] 1.2 Create `variant_options` table migration
    - Create `variant_options` with `id`, `group_id` (FK → variant_groups ON DELETE CASCADE), `label`, `price_modifier`, `absolute_price`, `display_order`, `created_at`
    - Add `UNIQUE(group_id, label)` constraint, `CONSTRAINT exactly_one_pricing` CHECK, and `idx_variant_options_group` index
    - _Requirements: 2.1, 2.3, 2.6_

  - [x] 1.3 Create `item_images` table migration
    - Create `item_images` with `id`, `item_id` (FK → items ON DELETE CASCADE), `url`, `display_order`, `is_primary`, `created_at`
    - Add `idx_item_images_item` index
    - _Requirements: 4.1, 4.5_

  - [x] 1.4 Alter `order_items` table migration
    - `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label TEXT`
    - `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_option_ids UUID[]`
    - _Requirements: 9.4_

- [x] 2. Backend — `resolvePrice` pure function
  - [x] 2.1 Implement `resolvePrice(basePrice, selectedOptions)` in `catalog.variants.helpers.js`
    - Export pure function: if any option has `absolute_price`, return `max(absolute_prices)`; otherwise return `basePrice + sum(price_modifiers)`, both rounded to 2 decimal places
    - Clamp result to ≥ 0
    - _Requirements: 3.1, 3.6_

  - [ ]* 2.2 Write property tests for `resolvePrice` (Properties 1–4, 10, 11)
    - **Property 1: Modifier-only price resolution** — `fc.float` base price + array of modifier-only options → result equals `basePrice + sum(modifiers)` rounded to 2dp
    - **Property 2: Absolute price dominance** — mixed options with at least one absolute → result equals `max(absolute_prices)`
    - **Property 3: Resolved price is non-negative** — arbitrary base price ≥ 0 and large negative modifiers → result ≥ 0
    - **Property 4: Resolved price rounded to 2dp** — arbitrary floats → `resolvedPrice * 100` is integer
    - File: `backend/tests/resolvePrice.property.test.js`; tag each test with `// Feature: item-variants-images, Property N`
    - _Requirements: 3.1, 3.6_

  - [ ]* 2.3 Write unit tests for `resolvePrice`
    - Cover: zero modifier, negative modifier, mixed absolute+modifier, empty options array
    - File: `backend/tests/resolvePrice.unit.test.js`
    - _Requirements: 3.1, 3.6_

- [x] 3. Backend — variant group and option routes
  - [x] 3.1 Create `catalog.variants.routes.js` with variant group CRUD
    - Implement `GET /api/items/:item_id/variant-groups`, `POST`, `PUT /:group_id`, `DELETE /:group_id`
    - Apply `authMiddleware → requirePermission('products:write')` on write routes
    - Validate `name` non-empty; check `item_id` belongs to authenticated `branch_id`/`business_id` (JOIN through `items`)
    - Return 404 if item not found, 409 on duplicate name, 403 on missing permission, 401 on missing JWT
    - Cascade-delete options in a transaction on group DELETE
    - _Requirements: 1.1–1.9, 9.1, 9.3, 10.1–10.5_

  - [x] 3.2 Add variant option CRUD to `catalog.variants.routes.js`
    - Implement `GET /api/items/:item_id/variant-groups/:group_id/options`, `POST`, `PUT /:option_id`, `DELETE /:option_id`
    - Validate `label` non-empty; enforce exactly-one-pricing rule (400 if both provided; default `price_modifier = 0` if neither)
    - Return 409 on duplicate label, 404 on missing group
    - _Requirements: 2.1–2.9, 10.1_

  - [x] 3.3 Add price resolution endpoint to `catalog.variants.routes.js`
    - Implement `POST /api/items/:item_id/resolve-price` accepting `{ variant_option_ids: string[] }`
    - Validate all option IDs belong to the item's groups (400 if not)
    - Validate required groups have a selection (422 with group names if missing)
    - Fetch option rows, call `resolvePrice()`, return `{ data: { resolved_price }, error: null, meta: {} }`
    - _Requirements: 3.1–3.6, 10.1_

  - [x] 3.4 Mount `catalog.variants.routes.js` in `index.js` under `/api/items`
    - Add `app.use('/api/items', catalogVariantsRouter)` without touching existing `/catalog/:businessId/...` routes
    - Add `app.use('/uploads', express.static(path.join(__dirname, '../uploads')))` for image serving
    - _Requirements: 10.1_

  - [ ]* 3.5 Write property tests for variant group uniqueness and cascade delete (Properties 5, 7)
    - **Property 5: Group name uniqueness** — create group, attempt duplicate name → HTTP 409, only one group persisted
    - **Property 7: Cascade delete removes all options** — create group with N options, delete group → zero options remain
    - File: `backend/tests/variantGroups.property.test.js`
    - _Requirements: 1.3, 1.4, 1.7_

  - [ ]* 3.6 Write property test for option label uniqueness (Property 6)
    - **Property 6: Option label uniqueness within group** — create option, attempt duplicate label → HTTP 409
    - File: `backend/tests/variantOptions.property.test.js`
    - _Requirements: 2.6, 2.7_

  - [ ]* 3.7 Write property tests for required group enforcement and cross-item rejection (Properties 10, 11)
    - **Property 10: Required group enforcement** — item with required group, resolve-price without that group's option → HTTP 422
    - **Property 11: Cross-item option rejection** — option from item B used in resolve-price for item A → HTTP 400
    - File: `backend/tests/resolvePrice.property.test.js` (extend existing file)
    - _Requirements: 3.3–3.5_

- [x] 4. Checkpoint — backend variant routes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Backend — image routes
  - [x] 5.1 Configure multer in `catalog.variants.routes.js`
    - `multer.diskStorage` writing to `uploads/items/` with UUID+timestamp filename
    - `limits: { fileSize: 5 * 1024 * 1024 }`, `fileFilter` rejecting non-jpeg/png/webp
    - Add Express error handler middleware mapping `LIMIT_FILE_SIZE` → 413 and `INVALID_MIME` → 415
    - _Requirements: 4.2–4.4_

  - [x] 5.2 Implement image upload endpoint `POST /api/items/:item_id/images`
    - Apply `authMiddleware → requirePermission('products:write') → multerUpload.single('image')`
    - Check item exists and belongs to branch; count existing images → 422 if already 10
    - Persist `item_images` row; auto-set `is_primary = true` if this is the first image
    - Return created `ItemImage` record in envelope
    - _Requirements: 4.1, 4.5–4.8, 4.12_

  - [x] 5.3 Implement `GET`, `PUT`, and `DELETE` image endpoints
    - `GET /api/items/:item_id/images` — list ordered by `display_order`
    - `PUT /api/items/:item_id/images/:image_id` — update `display_order` and/or `is_primary`; when setting `is_primary = true`, clear all other images' flag in a transaction
    - `DELETE /api/items/:item_id/images/:image_id` — delete DB record and remove file from `uploads/items/`
    - _Requirements: 4.9–4.11_

  - [ ]* 5.4 Write property tests for image count cap and primary exclusivity (Properties 8, 9)
    - **Property 8: Image count cap** — upload 10 images → all succeed; 11th → HTTP 422
    - **Property 9: Primary image exclusivity** — set is_primary on any image → exactly one image has is_primary = true
    - File: `backend/tests/itemImages.property.test.js`
    - _Requirements: 4.6, 4.7, 4.10_

  - [ ]* 5.5 Write unit/integration tests for image endpoints
    - Test MIME rejection (415), size rejection (413), first-image auto-primary, delete removes file
    - _Requirements: 4.2–4.4, 4.8, 4.11_

- [x] 6. Checkpoint — backend image routes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Frontend — shared `VariantSelector` modal
  - [x] 7.1 Create `src/components/VariantSelector.tsx`
    - Accept props: `item`, `variantGroups`, `onConfirm(selections, resolvedPrice)`, `onClose`
    - Render each `VariantGroup` as a labeled section with option buttons showing label + price impact (signed modifier or absolute value)
    - Track `selectedOptions: Record<groupId, optionId>` in local state
    - Call `POST /api/items/:id/resolve-price` on each selection change; display live resolved price
    - Disable confirm button while any `is_required` group has no selection
    - _Requirements: 7.1–7.6, 8.3–8.5_

  - [ ]* 7.2 Write unit tests for `VariantSelector`
    - Confirm button disabled when required group unselected; enabled after selection
    - Price display updates on option change
    - _Requirements: 7.5, 8.4_

- [x] 8. Frontend — `ImageUploader` component
  - [x] 8.1 Create `src/components/ImageUploader.tsx`
    - Accept props: `itemId`, `images`, `onChange`
    - Render thumbnails in drag-sortable list (HTML5 drag-and-drop)
    - `<input type="file" accept="image/jpeg,image/png,image/webp">` triggers `POST /api/items/:id/images`
    - On upload complete, call `onChange()` to refetch without full page reload
    - Star button → `PUT /api/items/:id/images/:imageId` with `{ is_primary: true }`; trash button → `DELETE`
    - On drag reorder, call `PUT` for each affected image's `display_order`
    - _Requirements: 6.1–6.7_

  - [ ]* 8.2 Write unit tests for `ImageUploader`
    - Thumbnail appears after upload without full reload
    - Primary star updates immediately in UI
    - _Requirements: 6.3, 6.5_

- [ ] 9. Frontend — Catalog Manager (`/items`) integration
  - [x] 9.1 Add "Variants" section to the item detail panel in the Catalog Manager page
    - Fetch and display variant groups (ordered by `created_at`) and options (ordered by `display_order`) via `GET /api/items/:id/variant-groups` and options sub-endpoints
    - Provide add/edit/delete controls for groups and options; show resolved price preview when editing an option
    - Restrict write controls to users with `products:write`; show read-only view for Staff
    - _Requirements: 5.1–5.5_

  - [x] 9.2 Add "Images" section to the item detail panel using `ImageUploader`
    - Render `<ImageUploader itemId={item.id} images={item.images} onChange={refetch} />`
    - Restrict upload/reorder/delete controls to `products:write` users
    - _Requirements: 6.1–6.7_

- [ ] 10. Frontend — POS page (`/pos`) changes
  - [x] 10.1 Update item card rendering to show primary image
    - Add `<img src={item.primary_image_url ?? '/placeholder.png'} />` to each item card
    - Extend item fetch to include `primary_image_url` from the backend (join `item_images WHERE is_primary = true`)
    - _Requirements: 7.7_

  - [x] 10.2 Implement `handleItemClick` with variant gate
    - Replace direct `addToCart` call: if `item.variant_groups?.length > 0`, open `VariantSelector` modal; otherwise add directly
    - On `VariantSelector.onConfirm`, build `CartLine` with `variant_option_ids`, `variant_label`, and `resolvedPrice`
    - Extend `CartItem` interface with `variant_label?: string` and `variant_option_ids?: string[]`
    - _Requirements: 7.1, 7.6, 7.8_

  - [ ]* 10.3 Write unit tests for POS `handleItemClick`
    - Opens modal for items with variants; adds directly for items without
    - _Requirements: 7.1, 7.8_

- [ ] 11. Frontend — Public Store (`/store/[slug]`) changes
  - [x] 11.1 Show primary image thumbnails in item listing grid
    - Add primary image `<img>` with placeholder fallback to each item card
    - _Requirements: 8.1_

  - [x] 11.2 Add item detail view with image gallery and `VariantSelector`
    - On item click, open detail view showing all images ordered by `display_order` in a gallery
    - Render `VariantSelector` when item has variant groups; disable "Add to Cart" until required groups are satisfied
    - On confirm, include `variant_option_ids` and `resolvedPrice` in cart line; show `variant_label` summary beneath item name in cart
    - _Requirements: 8.2–8.7_

  - [ ]* 11.3 Write unit tests for Public Store variant flow
    - "Add to Cart" disabled until required group selected; cart line shows variant summary
    - _Requirements: 8.4, 8.7_

- [x] 12. Backend — `order_items` snapshot wiring
  - [x] 12.1 Update order creation logic to persist variant snapshot
    - When creating an `order_items` row that includes variant selections, write `variant_label` (e.g., "Size: Large, Flavor: Mild") and `variant_option_ids` array to the new columns
    - _Requirements: 9.4_

  - [ ]* 12.2 Write integration test for variant snapshot persistence
    - Place an order with variants; verify `variant_label` and `variant_option_ids` are stored correctly on `order_items`
    - _Requirements: 9.4_

- [x] 13. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` (`npm install --save-dev fast-check` in `backend/`)
- Each property test must be tagged: `// Feature: item-variants-images, Property N`
- Existing `/catalog/:businessId/...` routes must not be modified
- All variant/image queries must JOIN through `items` to enforce `branch_id`/`business_id` scoping (Requirement 9)
