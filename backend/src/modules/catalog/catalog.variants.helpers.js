/**
 * Pure helper functions for variant price resolution.
 * No side effects, no DB calls, no Express dependency.
 */

/**
 * Resolves the final price for an item given selected variant options.
 *
 * Rules:
 * - If any selected option has a non-null `absolute_price`, return max(absolute_prices)
 * - Otherwise return basePrice + sum(price_modifiers), treating null modifiers as 0
 * - Result is rounded to 2 decimal places
 * - Result is clamped to >= 0
 *
 * @param {number} basePrice - The item's base price
 * @param {Array<{ price_modifier: number|null, absolute_price: number|null }>} selectedOptions
 * @returns {number} Resolved price rounded to 2dp, clamped >= 0
 */
function resolvePrice(basePrice, selectedOptions) {
  const absolutes = selectedOptions
    .map((o) => o.absolute_price)
    .filter((v) => v !== null && v !== undefined);

  let result;

  if (absolutes.length > 0) {
    result = Math.max(...absolutes);
  } else {
    const modifierSum = selectedOptions.reduce(
      (sum, o) => sum + (o.price_modifier ?? 0),
      0
    );
    result = basePrice + modifierSum;
  }

  // Round to 2 decimal places
  result = Math.round(result * 100) / 100;

  // Clamp to >= 0
  return Math.max(0, result);
}

module.exports = { resolvePrice };
