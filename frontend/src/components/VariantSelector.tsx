'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface VariantOption {
  id: string;
  label: string;
  price_modifier: number | null;
  absolute_price: number | null;
  display_order: number;
}

interface VariantGroup {
  id: string;
  name: string;
  is_required: boolean;
  options: VariantOption[];
}

interface VariantSelectorProps {
  item: { id: string; name: string; price: number };
  variantGroups: VariantGroup[];
  onConfirm: (
    selections: { groupId: string; optionId: string; label: string; groupName: string }[],
    resolvedPrice: number
  ) => void;
  onClose: () => void;
}

export default function VariantSelector({ item, variantGroups, onConfirm, onClose }: VariantSelectorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [resolvedPrice, setResolvedPrice] = useState<number>(item.price);
  const [loading, setLoading] = useState(false);

  // Check if all required groups have a selection
  const allRequiredSelected = variantGroups
    .filter(g => g.is_required)
    .every(g => selectedOptions[g.id]);

  // Resolve price via API whenever selections change
  const resolvePrice = useCallback(async (selections: Record<string, string>) => {
    const optionIds = Object.values(selections).filter(Boolean);
    if (optionIds.length === 0) {
      setResolvedPrice(item.price);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post(`/api/items/${item.id}/resolve-price`, {
        variant_option_ids: optionIds,
      });
      setResolvedPrice(data.data?.resolved_price ?? item.price);
    } catch {
      // On error, fall back to base price
      setResolvedPrice(item.price);
    } finally {
      setLoading(false);
    }
  }, [item.id, item.price]);

  useEffect(() => {
    resolvePrice(selectedOptions);
  }, [selectedOptions, resolvePrice]);

  const handleOptionSelect = (groupId: string, optionId: string) => {
    setSelectedOptions(prev => {
      // Toggle off if already selected
      if (prev[groupId] === optionId) {
        const next = { ...prev };
        delete next[groupId];
        return next;
      }
      return { ...prev, [groupId]: optionId };
    });
  };

  const handleConfirm = () => {
    const selections = Object.entries(selectedOptions).map(([groupId, optionId]) => {
      const group = variantGroups.find(g => g.id === groupId)!;
      const option = group.options.find(o => o.id === optionId)!;
      return { groupId, optionId, label: option.label, groupName: group.name };
    });
    onConfirm(selections, resolvedPrice);
  };

  const formatPriceImpact = (option: VariantOption): string => {
    if (option.absolute_price !== null && option.absolute_price !== undefined) {
      return `₹${option.absolute_price}`;
    }
    const mod = option.price_modifier ?? 0;
    if (mod > 0) return `+₹${mod}`;
    if (mod < 0) return `-₹${Math.abs(mod)}`;
    return '₹0';
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.itemName}>{item.name}</h2>
            <p style={styles.basePrice}>Base price: ₹{item.price}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Variant Groups */}
        <div style={styles.body}>
          {variantGroups.map(group => (
            <div key={group.id} style={styles.groupSection}>
              <div style={styles.groupLabel}>
                <span style={styles.groupName}>{group.name}</span>
                {group.is_required && <span style={styles.requiredBadge}>Required</span>}
              </div>
              <div style={styles.optionsContainer}>
                {[...group.options]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map(option => {
                    const isSelected = selectedOptions[group.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        style={{
                          ...styles.optionBtn,
                          ...(isSelected ? styles.optionBtnSelected : {}),
                        }}
                        onClick={() => handleOptionSelect(group.id, option.id)}
                      >
                        <span style={styles.optionLabel}>{option.label}</span>
                        <span style={{
                          ...styles.optionPrice,
                          ...(isSelected ? styles.optionPriceSelected : {}),
                        }}>
                          {formatPriceImpact(option)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer with resolved price and confirm */}
        <div style={styles.footer}>
          <div style={styles.resolvedPriceRow}>
            <span style={styles.resolvedLabel}>Total Price</span>
            <span style={styles.resolvedValue}>
              {loading ? '...' : `₹${resolvedPrice}`}
            </span>
          </div>
          <button
            style={{
              ...styles.confirmBtn,
              ...(!allRequiredSelected ? styles.confirmBtnDisabled : {}),
            }}
            disabled={!allRequiredSelected}
            onClick={handleConfirm}
          >
            Add to Cart — ₹{resolvedPrice}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 480,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  itemName: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  basePrice: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#888',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    color: '#999',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 8,
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
  },
  groupSection: {
    marginBottom: 20,
  },
  groupLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  groupName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#333',
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--orange, #f97316)',
    background: '#fff3e8',
    padding: '2px 8px',
    borderRadius: 99,
  },
  optionsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 99,
    border: '1.5px solid #e0e0e0',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  optionBtnSelected: {
    borderColor: 'var(--orange, #f97316)',
    background: 'var(--orange, #f97316)',
    color: '#fff',
  },
  optionLabel: {
    fontWeight: 600,
  },
  optionPrice: {
    fontSize: 12,
    color: '#888',
  },
  optionPriceSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  footer: {
    padding: '16px 24px 20px',
    borderTop: '1px solid #f0f0f0',
  },
  resolvedPriceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resolvedLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#555',
  },
  resolvedValue: {
    fontSize: 20,
    fontWeight: 800,
    color: '#1a1a1a',
  },
  confirmBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    background: 'var(--orange, #f97316)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
