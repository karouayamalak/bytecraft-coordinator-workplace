import React from 'react';

interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ height = 20, width = '100%', className = '', style = {} }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, width, ...style }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center gap-3">
        <Skeleton height={44} width={44} className="rounded-full" style={{ borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton height={16} width="60%" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <Skeleton height={12} />
      <Skeleton height={12} width="85%" />
      <Skeleton height={8} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} style={{ padding: '16px' }}>
          <Skeleton height={16} width={i === 0 ? '80%' : i === 4 ? '60%' : '70%'} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="stat-card">
      <Skeleton height={44} width={44} style={{ borderRadius: 10, marginBottom: 12 }} />
      <Skeleton height={32} width="40%" style={{ marginBottom: 8 }} />
      <Skeleton height={14} width="65%" />
    </div>
  );
}
