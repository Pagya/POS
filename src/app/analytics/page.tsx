'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getUser } from '@/lib/auth';
import SalesForecastSection from './components/SalesForecastSection';
import DemandSection from './components/DemandSection';
import SegmentationSection from './components/SegmentationSection';
import BestSellersSection from './components/BestSellersSection';
import RestockSection from './components/RestockSection';
import NLQuerySection from './components/NLQuerySection';

export default function AnalyticsPage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState('default');
  const [crossBranch, setCrossBranch] = useState(false);

  const user = typeof window !== 'undefined' ? getUser() : null;
  const isOwner = user?.role === 'owner';

  // Route guard: only owners have reports:read
  useEffect(() => {
    if (!isOwner) {
      router.replace('/dashboard');
    }
  }, [isOwner, router]);

  // When cross-branch toggle changes, update branchId
  const handleCrossBranchToggle = (enabled: boolean) => {
    setCrossBranch(enabled);
    setBranchId(enabled ? 'all' : 'default');
  };

  if (!isOwner) return null;

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1 className="page-title">AI Analytics</h1>

          {isOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>Cross-branch view</span>
              <button
                onClick={() => handleCrossBranchToggle(!crossBranch)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  background: crossBranch ? '#F97316' : '#E5E7EB',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
                aria-label="Toggle cross-branch view"
              >
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: crossBranch ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
              {crossBranch && (
                <span style={{ fontSize: 12, color: '#F97316', fontWeight: 600 }}>All Branches</span>
              )}
            </div>
          )}
        </div>

        {/* Task 7.10: Cross-branch comparison placeholder */}
        {crossBranch && branchId === 'all' && (
          <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>🌐 Cross-Branch Comparison</h2>
            <p style={{ fontSize: 13, color: '#6B7280' }}>
              Cross-branch comparison available when data is returned. Each section below shows aggregated data across all branches.
            </p>
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#F0F9FF', borderRadius: 8, fontSize: 13, color: '#0369A1', borderLeft: '3px solid #0EA5E9' }}>
              Viewing aggregated analytics for all branches. Individual section charts reflect combined data.
            </div>
          </div>
        )}

        <SalesForecastSection branchId={branchId} />
        <DemandSection branchId={branchId} />
        <SegmentationSection branchId={branchId} />
        <BestSellersSection branchId={branchId} />
        <RestockSection branchId={branchId} />
        <NLQuerySection branchId={branchId} />
      </main>
    </div>
  );
}
