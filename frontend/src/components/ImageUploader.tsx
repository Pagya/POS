'use client';
import { useRef, useState } from 'react';
import api from '@/lib/api';

interface ItemImage {
  id: string;
  item_id: string;
  url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

interface ImageUploaderProps {
  itemId: string;
  images: ItemImage[];
  onChange: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ImageUploader({ itemId, images, onChange }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const sorted = [...images].sort((a, b) => a.display_order - b.display_order);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post(`/api/items/${itemId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await api.put(`/api/items/${itemId}/images/${imageId}`, { is_primary: true });
      onChange();
    } catch (err) {
      console.error('Set primary failed:', err);
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      await api.delete(`/api/items/${itemId}/images/${imageId}`);
      onChange();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDragStart = (index: number) => {
    dragItemRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const dragIndex = dragItemRef.current;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Update display_order for all affected images
    const updates = reordered.map((img, idx) => ({
      id: img.id,
      display_order: idx,
    }));

    try {
      await Promise.all(
        updates
          .filter((u) => {
            const original = sorted.find((img) => img.id === u.id);
            return original && original.display_order !== u.display_order;
          })
          .map((u) =>
            api.put(`/api/items/${itemId}/images/${u.id}`, {
              display_order: u.display_order,
            })
          )
      );
      onChange();
    } catch (err) {
      console.error('Reorder failed:', err);
    }

    dragItemRef.current = null;
  };

  const handleDragEnd = () => {
    dragItemRef.current = null;
    setDragOverIndex(null);
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        {sorted.map((image, index) => (
          <div
            key={image.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              border: image.is_primary
                ? '2px solid #FFB800'
                : dragOverIndex === index
                ? '2px dashed var(--orange)'
                : '2px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'grab',
              background: '#fafafa',
              transition: 'border-color 0.15s',
            }}
          >
            <img
              src={`${API_BASE}${image.url}`}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              draggable={false}
            />
            {/* Star (set primary) button */}
            <button
              onClick={() => handleSetPrimary(image.id)}
              title={image.is_primary ? 'Primary image' : 'Set as primary'}
              style={{
                position: 'absolute',
                top: 2,
                left: 2,
                width: 22,
                height: 22,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.85)',
                border: 'none',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                cursor: 'pointer',
                color: image.is_primary ? '#FFB800' : '#999',
              }}
            >
              ★
            </button>
            {/* Delete button */}
            <button
              onClick={() => handleDelete(image.id)}
              title="Delete image"
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 22,
                height: 22,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.85)',
                border: 'none',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                cursor: 'pointer',
                color: 'var(--red)',
              }}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Upload area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 80,
            height: 80,
            borderRadius: 8,
            border: '2px dashed var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: '#fafafa',
            fontSize: 24,
            color: 'var(--text-muted)',
            transition: 'border-color 0.15s',
          }}
          title="Upload image"
        >
          {uploading ? '…' : '+'}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
      </div>
    </div>
  );
}
