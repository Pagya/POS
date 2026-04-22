'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

interface Category {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  category_name: string | null;
  available: boolean;
  type: string;
}

export default function ItemsPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    price: '',
    category_id: '',
    type: 'product',
    available: true,
  });

  useEffect(() => {
    if (!business) return;
    loadData();
  }, [business]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catsRes] = await Promise.all([
        api.get(`/catalog/${business.id}/items`),
        api.get(`/catalog/${business.id}/categories`),
      ]);
      setItems(itemsRes.data);
      setCategories(catsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await api.post(`/catalog/${business.id}/categories`, {
        name: newCategoryName,
      });
      setCategories([...categories, res.data]);
      setNewCategoryName('');
      setShowCategoryModal(false);
      setSuccess('Category added');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add category');
    }
  };

  const saveItem = async () => {
    if (!form.name.trim() || !form.price) {
      setError('Name and price required');
      return;
    }

    try {
      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        category_id: form.category_id || null,
        type: form.type,
        available: form.available,
      };

      if (editingItem) {
        await api.patch(`/catalog/${business.id}/items/${editingItem.id}`, payload);
        setItems(items.map(i => i.id === editingItem.id ? { ...i, ...payload } : i));
        setSuccess('Item updated');
      } else {
        const res = await api.post(`/catalog/${business.id}/items`, payload);
        setItems([...items, res.data]);
        setSuccess('Item added');
      }

      resetForm();
      setShowAddModal(false);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save item');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/catalog/${business.id}/items/${id}`);
      setItems(items.filter(i => i.id !== id));
      setSuccess('Item deleted');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const resetForm = () => {
    setForm({ name: '', price: '', category_id: '', type: 'product', available: true });
    setEditingItem(null);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      price: item.price.toString(),
      category_id: item.category_id || '',
      type: item.type,
      available: item.available,
    });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="layout">
        <Sidebar />
        <main className="main">
          <div className="page-header">
            <h1 className="page-title">Catalog</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1 className="page-title">Catalog</h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary btn-sm" onClick={() => setShowCategoryModal(true)}>
              + Category
            </button>
            <button className="btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
              + Add Item
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {success}
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#686B78' }}>Categories</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ background: '#FFF3E8', color: '#FC8019', padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600 }}>
                  {cat.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="card">
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              No items yet. Add your first item to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F0F0F0' }}>
                    <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: 700, fontSize: 13, color: '#686B78' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: 700, fontSize: 13, color: '#686B78' }}>Category</th>
                    <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: 700, fontSize: 13, color: '#686B78' }}>Price</th>
                    <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: 700, fontSize: 13, color: '#686B78' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: 700, fontSize: 13, color: '#686B78' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '12px 0', fontWeight: 700, fontSize: 13, color: '#686B78' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '14px 0', fontSize: 14, fontWeight: 600, color: '#282C3F' }}>{item.name}</td>
                      <td style={{ padding: '14px 0', fontSize: 13, color: '#686B78' }}>{item.category_name || '—'}</td>
                      <td style={{ padding: '14px 0', fontSize: 14, fontWeight: 600, color: '#FC8019' }}>₹{Number(item.price).toLocaleString()}</td>
                      <td style={{ padding: '14px 0', fontSize: 13, color: '#686B78', textTransform: 'capitalize' }}>{item.type}</td>
                      <td style={{ padding: '14px 0' }}>
                        <span className={`badge badge-${item.available ? 'completed' : 'cancelled'}`}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 0', textAlign: 'right' }}>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => openEditModal(item)}
                          style={{ marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => deleteItem(item.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Item Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '100%', maxWidth: 400 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>
                {editingItem ? 'Edit Item' : 'Add Item'}
              </h2>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78' }}>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Item name"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78' }}>Price (₹) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                  step="0.01"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78' }}>Category</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">No category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78' }}>Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
              </div>

              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={e => setForm({ ...form, available: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Available</label>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => { setShowAddModal(false); resetForm(); }} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={saveItem} style={{ flex: 1 }}>
                  {editingItem ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showCategoryModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '100%', maxWidth: 350 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Add Category</h2>
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                onKeyPress={e => e.key === 'Enter' && addCategory()}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn-ghost" onClick={() => setShowCategoryModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={addCategory} style={{ flex: 1 }}>
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
