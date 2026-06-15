const { resolvePrice } = require('./catalog.variants.helpers');

describe('resolvePrice', () => {
  describe('modifier-only pricing', () => {
    it('returns basePrice when no options are selected', () => {
      expect(resolvePrice(10, [])).toBe(10);
    });

    it('adds positive modifiers to basePrice', () => {
      const options = [
        { price_modifier: 2.5, absolute_price: null },
        { price_modifier: 1.0, absolute_price: null },
      ];
      expect(resolvePrice(10, options)).toBe(13.5);
    });

    it('subtracts negative modifiers from basePrice', () => {
      const options = [
        { price_modifier: -3, absolute_price: null },
      ];
      expect(resolvePrice(10, options)).toBe(7);
    });

    it('treats null price_modifier as 0', () => {
      const options = [
        { price_modifier: null, absolute_price: null },
        { price_modifier: 5, absolute_price: null },
      ];
      expect(resolvePrice(10, options)).toBe(15);
    });

    it('treats undefined price_modifier as 0', () => {
      const options = [
        { absolute_price: null },
        { price_modifier: 2, absolute_price: null },
      ];
      expect(resolvePrice(10, options)).toBe(12);
    });
  });

  describe('absolute price dominance', () => {
    it('uses absolute_price when present, ignoring basePrice', () => {
      const options = [
        { price_modifier: null, absolute_price: 25 },
      ];
      expect(resolvePrice(10, options)).toBe(25);
    });

    it('returns max absolute_price when multiple are present', () => {
      const options = [
        { price_modifier: null, absolute_price: 20 },
        { price_modifier: null, absolute_price: 30 },
        { price_modifier: null, absolute_price: 15 },
      ];
      expect(resolvePrice(10, options)).toBe(30);
    });

    it('ignores price_modifiers when any absolute_price exists', () => {
      const options = [
        { price_modifier: 100, absolute_price: null },
        { price_modifier: null, absolute_price: 12 },
      ];
      expect(resolvePrice(10, options)).toBe(12);
    });
  });

  describe('rounding to 2 decimal places', () => {
    it('rounds modifier result to 2dp', () => {
      const options = [
        { price_modifier: 1.005, absolute_price: null },
      ];
      // 10 + 1.005 = 11.005 → rounds to 11.01
      expect(resolvePrice(10, options)).toBe(11.01);
    });

    it('rounds absolute_price result to 2dp', () => {
      const options = [
        { price_modifier: null, absolute_price: 9.999 },
      ];
      expect(resolvePrice(10, options)).toBe(10);
    });
  });

  describe('clamping to >= 0', () => {
    it('clamps to 0 when modifiers would make price negative', () => {
      const options = [
        { price_modifier: -20, absolute_price: null },
      ];
      expect(resolvePrice(10, options)).toBe(0);
    });

    it('returns 0 for zero basePrice with negative modifiers', () => {
      const options = [
        { price_modifier: -5, absolute_price: null },
      ];
      expect(resolvePrice(0, options)).toBe(0);
    });

    it('does not clamp when result is exactly 0', () => {
      const options = [
        { price_modifier: -10, absolute_price: null },
      ];
      expect(resolvePrice(10, options)).toBe(0);
    });
  });
});
