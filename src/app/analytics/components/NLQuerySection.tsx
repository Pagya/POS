'use client';

import { useState } from 'react';
import api from '@/lib/api';

interface NLQueryResponse {
  answer: string;
  chart_data: Record<string, unknown> | null;
  query_interpreted: string;
  generated_at: string;
}

export default function NLQuerySection({ branchId }: { branchId: string }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<NLQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post('/api/analytics/query', {
        question: question.slice(0, 500),
        branch_id: branchId,
      });
      setResult(res.data.data);
    } catch {
      setError('Failed to get an answer. The AI service may be temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>🤖 Ask AI About Your Business</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
          placeholder="e.g. What were my top products last week?"
          maxLength={500}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1.5px solid #E5E7EB',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: loading || !question.trim() ? '#E5E7EB' : '#F97316',
            color: loading || !question.trim() ? '#9CA3AF' : '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </form>

      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>
        {question.length}/500 characters
      </div>

      {error && (
        <div style={{ padding: '12px 14px', background: '#FEF2F2', borderRadius: 8, fontSize: 13, color: '#991B1B', borderLeft: '3px solid #EF4444' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.query_interpreted && (
            <p style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>
              Interpreted as: "{result.query_interpreted}"
            </p>
          )}
          <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: 8, fontSize: 14, color: '#166534', lineHeight: 1.6, borderLeft: '3px solid #22C55E', whiteSpace: 'pre-wrap' }}>
            {result.answer}
          </div>
          <p style={{ fontSize: 11, color: '#9CA3AF' }}>
            Generated at {new Date(result.generated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
