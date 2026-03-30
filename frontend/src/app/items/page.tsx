'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

const EMPTY = { name: '', price: '', type: 'product', category_id: '', available: true };

export default function ItemsPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!business) return;
    const [i, c] = await Promise.all([
      api.get(`/catalog/${business.id}/items`),
      api.get(`/catalog/${business.id}/categories`),
    ]);
    setItems(i.data);
    setCategories(c.data);
  };

  useEffect(() => { load(); }, []);

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
