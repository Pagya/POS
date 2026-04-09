'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

interface Feedback {
  id: string;
  order_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface FeedbackStats {
  average: number;
  total: number;
  feedback: Feedback[];
  trend: Array<{ date: string; avg_rating: number; count: number }>;
}

export default function FeedbackPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [data, setData] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);

  useEffect(() => {
    if (!business) return;
    loadFeedback();
  }, [business]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/feedback/${business.id}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#60B246';
    if (rating >= 3) return '#E65100';
    return '#E02020';
  };

  const filteredFeedback = data?.feedback.filter((f: Feedback) => ratingFilter === 0 || f.rating === ratingFilter) || [];

  const ratingDistribution = data?.feedback.reduce((acc: { [key: number]: number }, f: Feedback) => {
    acc[f.rating] = (acc[f.rating] || 0) + 1;
    return acc;
  }, {} as { [key: number]: number }) || {};

  if (loading) {
    return (
      <div className="layout">
        <Sidebar />
        <main className="main">
          <div className="page-header">
            <h1 className="page-title">Feedback</h1>
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
          <h1 className="page-title">Feedback Intelligence</h1>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* Average Rating */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#686B78', marginBottom: 8, textTransform: 'uppercase' }}>
                Average Rating
              </div>
              <div style={{ fontSize: 48, fontWeight: 900, color: getRatingColor(data.average), marginBottom: 4 }}>
                {data.average.toFixed(1)}
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                out of 5 stars
              </div>
            </div>

            {/* Total Feedback */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#686B78', marginBottom: 8, textTransform: 'uppercase' }}>
                Total Feedback
              </div>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#FC8019', marginBottom: 4 }}>
                {data.total}
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                customer reviews
              </div>
            </div>

            {/* 5 Star Count */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#686B78', marginBottom: 8, textTransform: 'uppercase' }}>
                5 Star Reviews
              </div>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#60B246', marginBottom: 4 }}>
                {ratingDistribution[5] || 0}
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                {data.total > 0 ? `${Math.round(((ratingDistribution[5] || 0) / data.total) * 100)}%` : '0%'}
              </div>
            </div>
          </div>
        )}

        {/* Rating Distribution */}
        {data && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Rating Distribution</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {[5, 4, 3, 2, 1].map(rating => {
                const count = ratingDistribution[rating] || 0;
                const percentage = data.total > 0 ? (count / data.total) * 100 : 0;
                return (
                  <div key={rating} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ minWidth: 40, fontSize: 13, fontWeight: 700, color: '#282C3F' }}>
                      {rating} ⭐
                    </div>
                    <div style={{ flex: 1, height: 24, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          background: getRatingColor(rating),
                          width: `${percentage}%`,
                          transition: 'width .3s',
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 50, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#686B78' }}>
                      {count} ({Math.round(percentage)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            onClick={() => setRatingFilter(0)}
            style={{
              padding: '8px 16px',
              borderRadius: 99,
              fontSize: 13,
              fontWeight: 700,
              border: '1.5px solid',
              background: ratingFilter === 0 ? '#FC8019' : '#fff',
              color: ratingFilter === 0 ? '#fff' : '#686B78',
              borderColor: ratingFilter === 0 ? '#FC8019' : '#E9E9EB',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all .15s',
            }}
          >
            All Reviews
          </button>
          {[5, 4, 3, 2, 1].map(rating => (
            <button
              key={rating}
              onClick={() => setRatingFilter(rating)}
              style={{
                padding: '8px 16px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 700,
                border: '1.5px solid',
                background: ratingFilter === rating ? getRatingColor(rating) : '#fff',
                color: ratingFilter === rating ? '#fff' : getRatingColor(rating),
                borderColor: getRatingColor(rating),
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all .15s',
              }}
            >
              {rating} ⭐
            </button>
          ))}
        </div>

        {/* Feedback List */}
        <div className="card">
          {filteredFeedback.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              {data?.feedback.length === 0 ? 'No feedback yet.' : 'No feedback with this rating.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredFeedback.map((feedback: Feedback) => (
                <div
                  key={feedback.id}
                  style={{
                    border: '1.5px solid #E9E9EB',
                    borderRadius: 10,
                    padding: 14,
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#282C3F', marginBottom: 4 }}>
                        {feedback.customer_name || 'Anonymous'}
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {formatDate(feedback.created_at)}
                      </div>
                    </div>
                    <div style={{ fontSize: 18 }}>
                      {'⭐'.repeat(feedback.rating)}
                    </div>
                  </div>

                  {feedback.comment && (
                    <div style={{
                      background: '#F9F9F9',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#282C3F',
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                    }}>
                      "{feedback.comment}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7-Day Trend */}
        {data?.trend && data.trend.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>7-Day Trend</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {data.trend.map((day: { date: string; avg_rating: number; count: number }, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 80, fontSize: 13, fontWeight: 600, color: '#686B78' }}>
                    {new Date(day.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: getRatingColor(day.avg_rating) }}>
                      {day.avg_rating.toFixed(1)} ⭐
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      ({day.count} review{day.count !== 1 ? 's' : ''})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
