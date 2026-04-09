'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

type Menu = {
  id: string;
  restaurant_name: string;
  name: string;
  source: 'text' | 'image';
  content: string;
  image_url: string | null;
  created_at: string;
};

type Mode = 'text' | 'image';

const EMPTY_FORM = { restaurant_name: '', name: '', content: '' };

export default function MenusPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [menus, setMenus] = useState<Menu[]>([]);
  const [mode, setMode] = useState<Mode>('text');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);

  // Image flow state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsedText, setParsedText] = useState<string | null>(null);
  const [tempFile, setTempFile] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!business) return;
    const { data } = await api.get(`/menus/${business.id}`);
    setMenus(data);
  };

  useEffect(() => { load(); }, []);

  // ── Image selection ──────────────────────────────────────
  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setParsedText(null);
    setTempFile(null);
  };

  // ── Parse image via backend ──────────────────────────────
  const parseImage = async () => {
    if (!imageFile || !business) return;
    setParsing(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', imageFile);
      const { data } = await api.post(`/menus/${business.id}/parse-image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParsedText(data.parsed_text);
      setTempFile(data.temp_file);
      setForm(f => ({ ...f, content: data.parsed_text }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse image');
    } finally {
      setParsing(false);
    }
  };

  // ── Save menu ────────────────────────────────────────────
  const saveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setError('');
    setSaving(true);
    try {
      const payload: any = {
        restaurant_name: form.restaurant_name,
        name: form.name,
        content: form.content,
        source: mode,
      };
      if (mode === 'image' && tempFile) payload.temp_file = tempFile;

      if (editing) {
        await api.patch(`/menus/${business.id}/${editing}`, payload);
      } else {
        await api.post(`/menus/${business.id}`, payload);
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error saving menu');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setMode('text');
    setImageFile(null);
    setImagePreview(null);
    setParsedText(null);
    setTempFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const deleteMenu = async (id: string) => {
    if (!confirm('Delete this menu?') || !business) return;
    await api.delete(`/menus/${business.id}/${id}`);
    if (selectedMenu?.id === id) setSelectedMenu(null);
    load();
  };

  const startEdit = (m: Menu) => {
    setEditing(m.id);
    setMode(m.source);
    setForm({ restaurant_name: m.restaurant_name, name: m.name, content: m.content });
    setSelectedMenu(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Group menus by restaurant
  const grouped = menus.reduce<Record<string, Menu[]>>((acc, m) => {
    (acc[m.restaurant_name] = acc[m.restaurant_name] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <h1 className="page-title">Restaurant Menus</h1>

        <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
          {/* ── Left: Form ── */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              {editing ? 'Edit Menu' : 'Add Menu'}
            </h2>

            {/* Mode toggle */}
            {!editing && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {(['text', 'image'] as Mode[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(''); }}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontWeight: 700,
                      fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                      fontFamily: 'inherit', transition: 'all .12s',
                      borderColor: mode === m ? '#FC8019' : '#E9E9EB',
                      background: mode === m ? '#FC8019' : '#fff',
                      color: mode === m ? '#fff' : '#686B78',
                    }}
                  >
                    {m === 'text' ? '✏️ Type Menu' : '📷 Upload Image'}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={saveMenu}>
              <div className="form-group">
                <label>Restaurant Name</label>
                <input
                  value={form.restaurant_name}
                  onChange={e => setForm({ ...form, restaurant_name: e.target.value })}
                  placeholder="e.g. Pizza Palace"
                  required
                />
              </div>
              <div className="form-group">
                <label>Menu Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Lunch Menu, Dinner Special"
                  required
                />
              </div>

              {/* Image upload flow */}
              {mode === 'image' && !editing && (
                <div className="form-group">
                  <label>Menu Image</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={onImageSelect}
                    style={{ padding: '6px 0' }}
                  />
                  {imagePreview && (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={imagePreview}
                        alt="Menu preview"
                        style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid #E9E9EB' }}
                      />
                      {!parsedText && (
                        <button
                          type="button"
                          onClick={parseImage}
                          disabled={parsing}
                          className="btn-primary"
                          style={{ marginTop: 10, width: '100%' }}
                        >
                          {parsing ? '⏳ Parsing menu...' : '🔍 Parse Menu from Image'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Parsed text confirmation or manual text */}
              {(mode === 'text' || parsedText !== null || editing) && (
                <div className="form-group">
                  <label>
                    {parsedText !== null
                      ? '✅ Parsed Menu — review and confirm'
                      : 'Menu Content'}
                  </label>
                  {parsedText !== null && (
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                      Review the parsed text below. Edit anything that looks off, then save.
                    </p>
                  )}
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="Paste or type the menu here..."
                    rows={10}
                    required
                    style={{ fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                  />
                </div>
              )}

              {error && <p className="error">{error}</p>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-primary"
                  disabled={saving || (mode === 'image' && !editing && !parsedText && !form.content)}
                >
                  {saving ? 'Saving...' : editing ? 'Update Menu' : 'Save Menu'}
                </button>
                {editing && (
                  <button type="button" className="btn-ghost" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ── Right: Menu list ── */}
          <div>
            {Object.keys(grouped).length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                No menus yet. Add one to get started.
              </div>
            ) : (
              Object.entries(grouped).map(([restaurant, items]) => (
                <div key={restaurant} className="card" style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#282C3F' }}>
                    🍽️ {restaurant}
                  </h3>
                  {items.map(m => (
                    <div
                      key={m.id}
                      style={{
                        padding: '10px 12px', borderRadius: 8, marginBottom: 8,
                        border: `1.5px solid ${selectedMenu?.id === m.id ? '#FC8019' : '#E9E9EB'}`,
                        background: selectedMenu?.id === m.id ? '#FFF8F3' : '#FAFAFA',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedMenu(selectedMenu?.id === m.id ? null : m)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#282C3F' }}>{m.name}</span>
                          <span style={{
                            marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 7px',
                            borderRadius: 99, background: m.source === 'image' ? '#EEF2FF' : '#F0FDF4',
                            color: m.source === 'image' ? '#4F46E5' : '#16A34A',
                          }}>
                            {m.source === 'image' ? '📷 Image' : '✏️ Text'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-ghost btn-sm" onClick={e => { e.stopPropagation(); startEdit(m); }}>Edit</button>
                          <button className="btn-danger btn-sm" onClick={e => { e.stopPropagation(); deleteMenu(m.id); }}>Del</button>
                        </div>
                      </div>

                      {/* Expanded view */}
                      {selectedMenu?.id === m.id && (
                        <div style={{ marginTop: 12 }}>
                          {m.image_url && (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}${m.image_url}`}
                              alt="Menu"
                              style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 6, marginBottom: 10, border: '1px solid #E9E9EB' }}
                            />
                          )}
                          <pre style={{
                            whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12,
                            background: '#F9FAFB', padding: 12, borderRadius: 6,
                            border: '1px solid #E9E9EB', maxHeight: 300, overflowY: 'auto',
                            color: '#374151', lineHeight: 1.6,
                          }}>
                            {m.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
