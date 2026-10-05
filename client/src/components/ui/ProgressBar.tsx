import React from 'react';

interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  className?: string;
  color?: string;
  variant?: 'urgent' | 'warning' | 'success' | 'gradient' | string;
  height?: number;
}

function getVariant(value: number): string {
  if (value < 30) return 'urgent';
  if (value < 70) return 'warning';
  return 'success';
}

export default function ProgressBar({
  value,
  showLabel = false,
  className = '',
  color,
  variant,
  height = 8
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
  const autoVariant = variant === 'gradient' ? 'gradient' : (variant || getVariant(clamped));

  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ width: '100%' }}>
      <div
        className="progress-bar"
        style={{
          flex: 1,
          height: `${height}px`,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 999,
          overflow: 'hidden'
        }}
      >
        <div
          className={`progress-fill ${clamped === 100 ? 'success' : autoVariant}`}
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: color ? color : undefined,
            borderRadius: 999,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
      {showLabel && (
        <span
          className="text-xs font-semibold"
          style={{
            color: clamped === 100 ? 'var(--status-completed)' : 'var(--text-secondary)',
            minWidth: 32,
            textAlign: 'right',
          }}
        >
          {clamped}%
        </span>
      )}
    </div>
  );
}
