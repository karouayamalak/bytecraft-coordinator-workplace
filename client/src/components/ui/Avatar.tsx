import React from 'react';
import { getInitials } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'avatar-xs',
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
  xl: 'avatar-xl',
};

const PX_MAP = { xs: 22, sm: 28, md: 36, lg: 48, xl: 64 };
const FONT_MAP = { xs: 9, sm: 10, md: 13, lg: 16, xl: 22 };

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const px = PX_MAP[size];
  const fs = FONT_MAP[size];

  if (!src || src.startsWith('https://api.dicebear')) {
    return (
      <div
        className={`avatar-fallback ${SIZE_MAP[size]} ${className}`}
        style={{ width: px, height: px, fontSize: fs, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
        title={name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`avatar ${SIZE_MAP[size]} ${className}`}
      style={{ width: px, height: px, borderRadius: '50%', objectFit: 'cover' }}
      onError={(e) => {
        const el = e.currentTarget;
        el.onerror = null;
        el.style.display = 'none';
      }}
    />
  );
}
