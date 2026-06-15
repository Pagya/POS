'use client';
import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness, getUser } from '@/lib/auth';
import ImageUploader from '@/components/ImageUploader';

const EMPTY = { name: '', price: '', type: 'product', category_id: '', available: true };

export default function ItemsPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const user = typeof window !== 'undefined' ? getUser() : null;
  const hasWritePermission = user?.permissions?.includes('products:write') ?? (user && business && user.id === business.owner_id);
  const canWrite = hasWritePermission;
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [error, setError] = useState('');
  const [images, setImages] = useState<any[]>([]);

  // Variant state
  const [variantGroups, setVariantGroups] = useState<any[]>([]);
  const [groupOptions, setGroupOptions] = useState<Record<string, any[]>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newOptionForms, setNewOptionForms] = useState<Record<string, { label: string; priceType: 'modifier' | 'absolute'; priceValue: string }>>({});
  const [variantError, setVariantError] = useState('');

  const load = async () => {
    if (!business) return;
    const [i, c] = await Promise.all([
      api.get(`/catalog/${business.id}/items`),
      api.get(`/catalog/${business.id}/categories`),
    ]);
    setItems(i.data);
    setCategories(c.data);
  };

  const loadImages = useCallback(async (itemId: string) => {
    try {
      const res = await api.get(`/api/items/${itemId}/images`);
      setImages(res.data?.data ?? res.data ?? []);
    } catch (err) {
      console.error('Failed to load images:', err);
      setImages([]);
    }
  }, []);

  const loadVariantGroups = useCallback(async (itemId: string) => {
    try {
      const res = await api.get(`/api/items/${itemId}/variant-groups`);
      const groups = res.data?.data ?? res.data ?? [];
      // Sort by created_at
      groups.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setVariantGroups(groups);
      // Fetch options for each group
      const optionsMap: Record<string, any[]> = {};
      await Promise.all(
        groups.map(async (g: any) => {
          try {
            const optRes = await api.get(`/api/items/${itemId}/variant-groups/${g.id}/options`);
            const opts = optRes.data?.data ?? optRes.data ?? [];
            // Sort by display_order
            opts.sort((a: any, b: any) => a.display_order - b.display_order);
            optionsMap[g.id] = opts;
          } catch {
            optionsMap[g.id] = [];
          }
        })
      );
      setGroupOptions(optionsMap);
    } catch (err) {
      console.error('Failed to load variant groups:', err);
      setVariantGroups([]);
      setGroupOptions({});
    }
  }, []);

  const addVariantGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !newGroupName.trim()) return;
    setVariantError('');
    try {
      await api.post(`/api/items/${editing}/variant-groups`, {
        name: newGroupName.trim(),
        is_required: newGroupRequired,
      });
      setNewGroupName('');
      setNewGroupRequired(false);
      loadVariantGroups(editing);
    } catch (err: any) {
      setVariantError(err.response?.data?.error || 'Error adding variant group');
    }
  };

  const deleteVariantGroup = async (groupId: string) => {
    if (!editing || !confirm('Delete this variant group and all its options?')) return;
    setVariantError('');
    try {
      await api.delete(`/api/items/${editing}/variant-groups/${groupId}`);
      loadVariantGroups(editing);
    } catch (err: any) {
      setVariantError(err.response?.data?.error || 'Error deleting variant group');
    }
  };

  const addVariantOption = async (groupId: string) => {
    if (!editing) return;
    const optForm = newOptionForms[groupId];
    if (!optForm || !optForm.label.trim()) return;
    setVariantError('');
    const body: any = { label: optForm.label.trim() };
    if (optForm.priceType === 'absolute') {
      body.absolute_price = parseFloat(optForm.priceValue) || 0;
    } else {
      body.price_modifier = parseFloat(optForm.priceValue) || 0;
    }
    try {
      await api.post(`/api/items/${editing}/variant-groups/${groupId}/options`, body);
      setNewOptionForms(prev => ({ ...prev, [groupId]: { label: '', priceType: 'modifier', priceValue: '' } }));
      loadVariantGroups(editing);
    } catch (err: any) {
      setVariantError(err.response?.data?.error || 'Error adding option');
    }
  };

  const deleteVariantOption = async (groupId: string, optionId: string) => {
    if (!editing || !confirm('Delete this option?')) return;
    setVariantError('');
    try {
      await api.delete(`/api/items/${editing}/variant-groups/${groupId}/options/${optionId}`);
      loadVariantGroups(editing);
    } catch (err: any) {
      setVariantError(err.response?.data?.error || 'Error deleting option');
    }
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const getOptionPriceDisplay = (option: any) => {
    if (option.absolute_price !== null && option.absolute_price !== undefined) {
      return `₹${Number(option.absolute_price).toFixed(2)}`;
    }
    const mod = Number(option.price_modifier || 0);
    if (mod === 0) return '₹0.00';
    return mod > 0 ? `+₹${mod.toFixed(2)}` : `-₹${Math.abs(mod).toFixed(2)}`;
  };

  const getResolvedPricePreview = (option: any) => {
    const basePrice = Number(form.price) || 0;
    if (option.absolute_price !== null && option.absolute_price !== undefined) {
      return `Resolved: ₹${Number(option.absolute_price).toFixed(2)}`;
    }
    const mod = Number(option.price_modifier || 0);
    const resolved = Math.max(0, basePrice + mod);
    return `Resolved: ₹${resolved.toFixed(2)}`;
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editing) {
      loadImages(editing);
      loadVariantGroups(editing);
    } else {
      setImages([]);
      setVariantGroups([]);
      setGroupOptions({});
      setExpandedGroups({});
      setVariantError('');
    }
  }, [editing, loadImages, loadVariantGroups]);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.patch(`/catalog/${business.id}/items/${editing}`, form);
      } else {
        await api.post(`/catalog/${business.id}/items`, form);
      }
      setForm(EMPTY);
      setEditing(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error saving item');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/catalog/${business.id}/items/${id}`);
    load();
  };

  const toggleAvail = async (item: any) => {
    await api.patch(`/catalog/${business.id}/items/${item.id}`, { available: !item.available });
    load();
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await api.post(`/catalog/${business.id}/categories`, { name: catName });
    setCatName('');
    load();
  };

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <h1 className="page-title">Catalog</h1>

        <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
          {/* Item form */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              {editing ? 'Edit Item' : 'Add Item'}
            </h2>
            <form onSubmit={saveItem}>
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">— None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="avail" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })} style={{ width: 'auto' }} />
                <label htmlFor="avail" style={{ marginBottom: 0 }}>Available</label>
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary">{editing ? 'Update' : 'Add Item'}</button>
                {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}
              </div>
            </form>

            <hr style={{ margin: '20px 0', borderColor: '#f3f4f6' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Add Category</h3>
            <form onSubmit={addCategory} style={{ display: 'flex', gap: 8 }}>
              <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" />
              <button className="btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>Add</button>
            </form>
          </div>

          {/* Images section — shown when editing an item */}
          {editing && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Images</h2>
              {hasWritePermission ? (
                <ImageUploader
                  itemId={editing}
                  images={images}
                  onChange={() => loadImages(editing)}
                />
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {images.length === 0 && (
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>No images uploaded.</p>
                  )}
                  {images
                    .sort((a: any, b: any) => a.display_order - b.display_order)
                    .map((image: any) => (
                      <div
                        key={image.id}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          border: image.is_primary ? '2px solid #FFB800' : '2px solid var(--border)',
                          overflow: 'hidden',
                          background: '#fafafa',
                        }}
                      >
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${image.url}`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Variants section — shown when editing an item */}
          {editing && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Variants</h2>
              {variantError && <p className="error" style={{ marginBottom: 12 }}>{variantError}</p>}

              {/* Existing variant groups */}
              {variantGroups.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>No variant groups defined.</p>
              )}
              {variantGroups.map(group => (
                <div key={group.id} style={{ border: '1.5px solid var(--border)', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                  {/* Group header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#FAFAFA',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleGroupExpanded(group.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{group.name}</span>
                      {group.is_required && (
                        <span className="badge badge-processing" style={{ fontSize: 9 }}>Required</span>
                      )}
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        ({(groupOptions[group.id] || []).length} option{(groupOptions[group.id] || []).length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {canWrite && (
                        <button
                          className="btn-danger btn-sm"
                          onClick={(e) => { e.stopPropagation(); deleteVariantGroup(group.id); }}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          Delete
                        </button>
                      )}
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{expandedGroups[group.id] ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {/* Group options (expanded) */}
                  {expandedGroups[group.id] && (
                    <div style={{ padding: '10px 14px' }}>
                      {(groupOptions[group.id] || []).length === 0 && (
                        <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>No options yet.</p>
                      )}
                      {(groupOptions[group.id] || []).map(option => (
                        <div
                          key={option.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 0',
                            borderBottom: '1px solid #f5f5f5',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{option.label}</span>
                            <span style={{ fontSize: 12, color: 'var(--orange)', marginLeft: 8, fontWeight: 600 }}>
                              {getOptionPriceDisplay(option)}
                            </span>
                            <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>
                              {getResolvedPricePreview(option)}
                            </span>
                          </div>
                          {canWrite && (
                            <button
                              className="btn-danger btn-sm"
                              onClick={() => deleteVariantOption(group.id, option.id)}
                              style={{ padding: '2px 8px', fontSize: 10 }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add option form */}
                      {canWrite && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <div style={{ flex: '1 1 120px' }}>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 3, textTransform: 'uppercase' }}>Label</label>
                            <input
                              value={newOptionForms[group.id]?.label || ''}
                              onChange={e => setNewOptionForms(prev => ({
                                ...prev,
                                [group.id]: { ...(prev[group.id] || { label: '', priceType: 'modifier', priceValue: '' }), label: e.target.value }
                              }))}
                              placeholder="e.g. Large"
                              style={{ padding: '6px 10px', fontSize: 12 }}
                            />
                          </div>
                          <div style={{ flex: '0 0 100px' }}>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 3, textTransform: 'uppercase' }}>Price Type</label>
                            <select
                              value={newOptionForms[group.id]?.priceType || 'modifier'}
                              onChange={e => setNewOptionForms(prev => ({
                                ...prev,
                                [group.id]: { ...(prev[group.id] || { label: '', priceType: 'modifier', priceValue: '' }), priceType: e.target.value as 'modifier' | 'absolute' }
                              }))}
                              style={{ padding: '6px 10px', fontSize: 12 }}
                            >
                              <option value="modifier">Modifier</option>
                              <option value="absolute">Absolute</option>
                            </select>
                          </div>
                          <div style={{ flex: '0 0 90px' }}>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 3, textTransform: 'uppercase' }}>Price (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={newOptionForms[group.id]?.priceValue || ''}
                              onChange={e => setNewOptionForms(prev => ({
                                ...prev,
                                [group.id]: { ...(prev[group.id] || { label: '', priceType: 'modifier', priceValue: '' }), priceValue: e.target.value }
                              }))}
                              placeholder="0.00"
                              style={{ padding: '6px 10px', fontSize: 12 }}
                            />
                          </div>
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => addVariantOption(group.id)}
                            style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
                          >
                            Add Option
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add group form */}
              {canWrite && (
                <form onSubmit={addVariantGroup} style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 3, textTransform: 'uppercase' }}>Group Name</label>
                    <input
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      placeholder="e.g. Size, Flavor"
                      style={{ padding: '8px 12px', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 4 }}>
                    <input
                      type="checkbox"
                      id="group-required"
                      checked={newGroupRequired}
                      onChange={e => setNewGroupRequired(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor="group-required" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 0 }}>Required</label>
                  </div>
                  <button className="btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>Add Group</button>
                </form>
              )}
            </div>
          )}

          {/* Items list */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Items ({items.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td style={{ fontSize: 12, color: '#9ca3af' }}>{item.category_name || '—'}</td>
                    <td>₹{Number(item.price).toLocaleString()}</td>
                    <td>
                      <span
                        className={`badge ${item.available ? 'badge-completed' : 'badge-cancelled'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleAvail(item)}
                      >
                        {item.available ? 'Active' : 'Off'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-ghost btn-sm" onClick={() => { setEditing(item.id); setForm({ name: item.name, price: item.price, type: item.type, category_id: item.category_id || '', available: item.available }); }}>Edit</button>
                      {' '}
                      <button className="btn-danger btn-sm" onClick={() => deleteItem(item.id)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
