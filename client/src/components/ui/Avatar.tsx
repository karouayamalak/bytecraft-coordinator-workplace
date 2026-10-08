import React, { useState } from 'react';
import { getInitials } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  xs: 'avatar-xs',
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
  xl: 'avatar-xl',
};

const PX_MAP = { xs: 24, sm: 32, md: 40, lg: 54, xl: 72 };
const FONT_MAP = { xs: 9.5, sm: 11.5, md: 14, lg: 18, xl: 24 };

export default function Avatar({ src, name, size = 'md', className = '', style }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const px = PX_MAP[size];
  const fs = FONT_MAP[size];

  // Clean initials fallback
  if (!src || hasError || src.startsWith('https://api.dicebear')) {
    return (
      <div
        className={`avatar-fallback ${SIZE_MAP[size]} ${className}`}
        style={{
          width: px,
          height: px,
          minWidth: px,
          minHeight: px,
          fontSize: fs,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
          color: '#e4e4e7',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          letterSpacing: '-0.02em',
          userSelect: 'none',
          flexShrink: 0,
          ...style,
        }}
        title={name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      style={{
        width: px,
        height: px,
        minWidth: px,
        minHeight: px,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        background: '#18181b',
        boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.12), 0 2px 6px rgba(0,0,0,0.25)',
        flexShrink: 0,
        display: 'inline-block',
        ...style,
      }}
      className={className}
      title={name}
    >
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover',
          objectPosition: 'center 20%',
          display: 'block',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />
    </div>
  );
}
