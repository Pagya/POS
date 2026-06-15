# Design Document — Item Variants + Images

## Overview

This feature extends the Commerce OS catalog to support configurable variant groups (e.g., Size, Flavor, Color) with per-option pricing rules, and per-item image galleries. The design touches three layers:

- **Database**: three new tables (`variant_groups`, `variant_options`, `item_images`) plus a `variant_selections` snapshot column on `order_items`
- **Backend**: new routes mounted under `/api/items/:item_id/...`, extending the existing catalog module, using multer for image uploads served as static files
- **Frontend**: a shared `VariantSelector` modal used on both POS and Public Store; an `ImageUploader` + drag-reorder panel on the Catalog Manager

All data remains scoped to `branch_id` / `business_id`. Write operations require the `products:write` permission consistent with the RBAC spec.

---

## Architecture

```mermaid
graph TD
  subgraph Frontend
    POS[POS Page /pos]
    Store[Public Store /store/slug]
    Catalog[Catalog Manager /items]
    VS[VariantSelector modal]
    IU[ImageUploader component]
  end

  subgraph Backend [Node.js/Express :4000]
    VR[variant-groups routes]
    OR[options routes]
    PR[price-resolve route]
    IR[images routes]
    MW[auth + RBAC middleware]
    MU[multer upload middleware]
    SF[/uploads static files]
  end

  subgraph DB [PostgreSQL]
    VG[(variant_groups)]
    VO[(variant_options)]
    II[(item_images)]
    OI[(order_items)]
  end

  POS --> VS
  Store --> VS
  Catalog --> IU
  VS --> PR
  VS --> VR
  IU --> IR
  VR --> MW --> VG
  OR --> MW --> VO
  PR --> VO
  IR --> MW --> MU --> II
  IR --> SF
  OI -.snapshot.-> VO
```

The new routes are registered as a separate router file (`catalog.variants.routes.js`) and mounted in `index.js` under `/api/items`. This keeps the existing `/catalog/:businessId/...` routes untouched.

---

## Components and Interfaces

### Backend

#### `catalog.variants.routes.js`
Handles all variant group, variant option, price resolution, and image endpoints. Mounted at `/api/items`.

Key middleware chain for write routes:
```
authMiddleware → requirePermission('products:write') → handler
```

For image uploads:
```
authMiddleware → requirePermission('products:write') → multerUpload.single('image') → handler
```

#### `requirePermission(permission)` middleware
Reads `req.user.permissions` (array in JWT payload) and returns 403 if the permission is absent.

#### `resolvePrice(basePrice, selectedOptions)` — pure function
```js
// selectedOptions: Array<{ price_modifier: number|null, absolute_price: number|null }>
function resolvePrice(basePrice, selectedOptions) {
  const absolutes = selectedOptions
    .map(o => o.absolute_price)
    .filter(v => v !== null && v !== undefined);

  if (absolutes.length > 0) {
    return Math.round(Math.max(...absolutes) * 100) / 100;
  }

  const modifierSum = selectedOptions.reduce(
    (sum, o) => sum + (o.price_modifier ?? 0), 0
  );
  return Math.round((basePrice + modifierSum) * 100) / 100;
}
```

This function is exported and unit/property tested independently of Express.

#### Multer configuration
```js
const storage = multer.diskStorage({
  destination: 'uploads/items/',
  filename: (req, file, cb) => cb(null, `${uuid()}-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(allowed.includes(file.mimetype) ? null : new Error('INVALID_MIME'), allowed.includes(file.mimetype));
  },
});
```

Static serving is added in `index.js`:
```js
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

### Frontend

#### `VariantSelector` modal (`src/components/VariantSelector.tsx`)
Shared between POS and Public Store. Props:
```ts
interface VariantSelectorProps {
  item: { id: string; name: string; price: number };
  variantGroups: VariantGroup[];
  onConfirm: (selections: SelectedOption[], resolvedPrice: number) => void;
  onClose: () => void;
}
```
- Renders each `VariantGroup` as a labeled section with option buttons
- Tracks `selectedOptions: Record<groupId, optionId>`
- Calls `POST /api/items/:id/resolve-price` on each selection change to show live price
- Disables confirm button while any `is_required` group has no selection

#### `ImageUploader` component (`src/components/ImageUploader.tsx`)
Used only on the Catalog Manager. Props:
```ts
interface ImageUploaderProps {
  itemId: string;
  images: ItemImage[];
  onChange: () => void; // refetch callback
}
```
- Renders thumbnails in a drag-sortable list (using native HTML5 drag-and-drop)
- Upload via `<input type="file" accept="image/jpeg,image/png,image/webp">`
- On drop reorder, calls `PUT /api/items/:id/images/:imageId` for each affected record
- Star button to set primary; trash button to delete

#### POS page changes
- `addToCart` becomes `handleItemClick(item)`:
  - If `item.variant_groups?.length > 0`, open `VariantSelector`
  - Otherwise add directly (existing behavior)
- Item cards show `<img src={item.primary_image_url} />` with a placeholder fallback
- `CartItem` interface gains `variant_label?: string` and `variant_option_ids?: string[]`

#### Public Store changes
- Item cards show primary image thumbnail
- "ADD" button opens `VariantSelector` when variants exist, otherwise adds directly
- Cart line shows `variant_label` summary beneath item name
- `POST /api/items/:id/resolve-price` called on variant selection change

---

## Data Models

### `variant_groups`
```sql
CREATE TABLE variant_groups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id      UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  is_required  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, name)
);
CREATE INDEX idx_variant_groups_item ON variant_groups(item_id);
```

### `variant_options`
```sql
CREATE TABLE variant_options (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID NOT NULL REFERENCES variant_groups(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  price_modifier  NUMERIC(10,2),          -- NULL when absolute_price is set
  absolute_price  NUMERIC(10,2),          -- NULL when price_modifier is set
  display_order   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, label),
  CONSTRAINT exactly_one_pricing CHECK (
    (price_modifier IS NOT NULL AND absolute_price IS NULL) OR
    (price_modifier IS NULL AND absolute_price IS NOT NULL)
  )
);
CREATE INDEX idx_variant_options_group ON variant_options(group_id);
```

### `item_images`
```sql
CREATE TABLE item_images (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id        UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  is_primary     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_item_images_item ON item_images(item_id);
```

### `order_items` — snapshot extension
```sql
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_label    TEXT,       -- e.g. "Size: Large, Flavor: Mild"
  ADD COLUMN IF NOT EXISTS variant_option_ids UUID[];   -- snapshot of selected option IDs
```

### Scoping note
`variant_groups` and `variant_options` are scoped through the `items` table (`item_id → items.business_id / branch_id`). Every query that reads variant data JOINs through `items` to enforce `business_id` and `branch_id` filters, consistent with Requirement 9.

### API response envelope
All endpoints return:
```json
{
  "data": <payload or null>,
  "error": <string or null>,
  "meta": { "page": 1, "limit": 20, "total": 42 }
}
```

---

## Price Resolution Algorithm

The algorithm is intentionally a pure function with no side effects, making it straightforward to test.

**Inputs:**
- `basePrice: number` — the item's `price` field
- `selectedOptions: Array<{ price_modifier: number|null, absolute_price: number|null }>`

**Rules (from Requirement 3.1):**
1. Collect all `absolute_price` values from selected options where `absolute_price IS NOT NULL`
2. If any absolute prices exist → resolved price = `max(absolute_prices)`
3. Otherwise → resolved price = `basePrice + sum(price_modifiers)` (treating null modifiers as 0)
4. Round to 2 decimal places
5. Result is always ≥ 0

**Validation before resolution (Requirement 3.3–3.5):**
- All `variant_option_id` values must belong to variant groups of the specified item → 400 if not
- For each `is_required` group, at least one option from that group must be present → 422 if missing

**`POST /api/items/:item_id/resolve-price` request body:**
```json
{ "variant_option_ids": ["uuid1", "uuid2"] }
```

**Response:**
```json
{ "data": { "resolved_price": 12.50 }, "error": null, "meta": {} }
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Modifier-only price resolution

*For any* item base price and any list of selected options that all carry `price_modifier` (no `absolute_price`), the resolved price equals `basePrice + sum(modifiers)` rounded to 2 decimal places.

**Validates: Requirements 3.1**

---

### Property 2: Absolute price dominance

*For any* item base price and any list of selected options where at least one option carries an `absolute_price`, the resolved price equals the maximum `absolute_price` among those options, regardless of the base price or any `price_modifier` values on other options.

**Validates: Requirements 3.1**

---

### Property 3: Resolved price is non-negative

*For any* item base price ≥ 0 and any valid set of selected options (including large negative modifiers), the resolved price SHALL be ≥ 0.

**Validates: Requirements 3.6**

---

### Property 4: Resolved price is rounded to 2 decimal places

*For any* combination of base price and option modifiers or absolute prices, the resolved price SHALL have at most 2 decimal places (i.e., `resolvedPrice * 100` is an integer).

**Validates: Requirements 3.6**

---

### Property 5: Variant group name uniqueness within item

*For any* item, attempting to create two variant groups with the same name SHALL result in exactly one group being persisted; the second attempt SHALL return HTTP 409.

**Validates: Requirements 1.3, 1.4**

---

### Property 6: Variant option label uniqueness within group

*For any* variant group, attempting to create two options with the same label SHALL result in exactly one option being persisted; the second attempt SHALL return HTTP 409.

**Validates: Requirements 2.6, 2.7**

---

### Property 7: Cascade delete of variant groups removes all options

*For any* variant group with any number of options, deleting the group SHALL result in zero options remaining for that group in the database.

**Validates: Requirements 1.7**

---

### Property 8: Image count cap

*For any* item, uploading images one at a time SHALL succeed for the first 10 uploads and return HTTP 422 on the 11th upload attempt.

**Validates: Requirements 4.6, 4.7**

---

### Property 9: Primary image exclusivity

*For any* item with multiple images, setting `is_primary = true` on any one image SHALL result in exactly one image having `is_primary = true` across all images for that item.

**Validates: Requirements 4.10**

---

### Property 10: Required group enforcement

*For any* item with at least one `is_required` variant group, calling `resolve-price` without providing any option from that required group SHALL return HTTP 422.

**Validates: Requirements 3.5**

---

### Property 11: Cross-item option rejection

*For any* item A and item B (distinct), providing a `variant_option_id` that belongs to item B when resolving price for item A SHALL return HTTP 400.

**Validates: Requirements 3.3, 3.4**

---

## Error Handling

| Scenario | HTTP Status | Response |
|---|---|---|
| Missing/invalid JWT | 401 | `{ error: "No token" }` |
| Missing `products:write` permission | 403 | `{ error: "Forbidden" }` |
| Item not found or wrong branch | 404 | `{ error: "Item not found" }` |
| Variant group not found | 404 | `{ error: "Variant group not found" }` |
| Duplicate variant group name | 409 | `{ error: "Variant group name already exists" }` |
| Duplicate option label | 409 | `{ error: "Option label already exists in this group" }` |
| Both `price_modifier` and `absolute_price` provided | 400 | `{ error: "Provide price_modifier or absolute_price, not both" }` |
| Option ID doesn't belong to item | 400 | `{ error: "Option <id> does not belong to this item" }` |
| Required group missing from selection | 422 | `{ error: "Required groups missing: [Size]" }` |
| Invalid image MIME type | 415 | `{ error: "Unsupported image type" }` |
| Image file > 5 MB | 413 | `{ error: "Image too large (max 5 MB)" }` |
| Item already has 10 images | 422 | `{ error: "Item already has the maximum of 10 images" }` |

Multer errors are caught in an Express error handler middleware that maps `LIMIT_FILE_SIZE` → 413 and the custom `INVALID_MIME` error → 415.

---

## Testing Strategy

### Dual approach

Both unit/integration tests and property-based tests are required. They are complementary:
- Unit/integration tests cover specific examples, error paths, and integration between layers
- Property tests verify universal correctness across randomized inputs

### Property-based testing library

**Backend (Node.js):** [`fast-check`](https://github.com/dubzzz/fast-check)

Install: `npm install --save-dev fast-check`

Each property test runs a minimum of **100 iterations** (fast-check default is 100; set explicitly via `{ numRuns: 100 }`).

Each test is tagged with a comment:
```js
// Feature: item-variants-images, Property 1: modifier-only price resolution
```

### Property test mapping

| Design Property | Test file | fast-check arbitraries |
|---|---|---|
| P1: Modifier-only resolution | `resolvePrice.property.test.js` | `fc.float`, `fc.array(fc.record({ price_modifier: fc.float() }))` |
| P2: Absolute price dominance | `resolvePrice.property.test.js` | mix of modifier and absolute options |
| P3: Non-negative result | `resolvePrice.property.test.js` | `fc.float({ min: 0 })`, large negative modifiers |
| P4: 2 decimal places | `resolvePrice.property.test.js` | arbitrary floats |
| P5: Group name uniqueness | `variantGroups.property.test.js` | `fc.string` group names, HTTP integration |
| P6: Option label uniqueness | `variantOptions.property.test.js` | `fc.string` labels |
| P7: Cascade delete | `variantGroups.property.test.js` | `fc.array` of options |
| P8: Image count cap | `itemImages.property.test.js` | upload loop 1–11 |
| P9: Primary image exclusivity | `itemImages.property.test.js` | `fc.nat` image index |
| P10: Required group enforcement | `resolvePrice.property.test.js` | items with required groups, empty selections |
| P11: Cross-item option rejection | `resolvePrice.property.test.js` | two distinct items |

### Unit / integration tests

Focus areas:
- `resolvePrice()` pure function: specific examples (zero modifier, negative modifier, mixed absolute+modifier)
- Image upload endpoint: MIME rejection, size rejection, first-image auto-primary
- Variant CRUD: 404 on missing group/option, 403 on missing permission
- `order_items` snapshot: verify `variant_label` and `variant_option_ids` are persisted correctly when an order is placed with variants

### Frontend tests

- `VariantSelector`: confirm button disabled when required group unselected; enabled after selection
- `ImageUploader`: thumbnail appears after upload without full reload; primary star updates immediately
- POS `handleItemClick`: opens modal for items with variants; adds directly for items without
