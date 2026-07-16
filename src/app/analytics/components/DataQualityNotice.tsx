'use client';

export default function DataQualityNotice({ warning }: { warning: string | null }) {
  if (!warning) return null;
  return (
    <div style={{
      background: '#FFFBEB',
      border: '1px solid #F59E0B',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      color: '#92400E',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 8,
    }}>
      <span>⚠️</span>
      <span>{warning}</span>
    </div>
  );
}
