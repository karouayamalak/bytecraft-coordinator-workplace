import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, switchDemoUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]           = useState('coordinator@bytecraft.club');
  const [password, setPassword]     = useState('bytecraft2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (userId: string) => {
    setLoading(true);
    try {
      await switchDemoUser(userId);
      navigate('/');
    } catch {
      setError('Failed to switch demo user.');
    } finally {
      setLoading(false);
    }
  };

  const DEMO_OPTIONS = [
    {
      id:      'user-aya-karou',
      label:   'Club Coordinator',
      name:    'Aya Karou',
      desc:    'Full Executive & Visibility Control',
      mascot:  '/mascots/executive.png',
      accent:  '#187db8',
      bg:      '#e7f5fd',
    },
    {
      id:      'user-manel-lyazidi',
      label:   'Communication Manager',
      name:    'Manel Lyazidi',
      desc:    'External Relations & PR Manager',
      mascot:  '/mascots/pr.png',
      accent:  '#0d9488',
      bg:      '#ecfdf5',
    },
    {
      id:      'user-imene-bouzena',
      label:   'Design Manager',
      name:    'Imene Bouzena',
      desc:    'Design Department Manager',
      mascot:  '/mascots/media.png',
      accent:  '#7c3aed',
      bg:      '#f5f3ff',
    },
  ];

  return (
    /* Full-screen sky background — matches Dashboard hero */
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #08476e 0%, #116c9e 18%, #2192cf 42%, #69c7f4 65%, #bfe8fa 82%, #edf7fd 93%, #ffffff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Exactly Two Simple Static Anime Clouds (No Floating, Completely Uncut) */}
      <img
        src="/clouds/cloud_pure_1.png"
        alt=""
        style={{
          position: 'absolute',
          top: 30,
          left: '4%',
          width: 360,
          pointerEvents: 'none',
          zIndex: 1,
          filter: 'drop-shadow(0 10px 24px rgba(0,35,70,0.15))',
        }}
      />
      <img
        src="/clouds/cloud_pure_2.png"
        alt=""
        style={{
          position: 'absolute',
          top: 40,
          right: '5%',
          width: 380,
          pointerEvents: 'none',
          zIndex: 1,
          filter: 'drop-shadow(0 10px 24px rgba(0,35,70,0.15))',
        }}
      />

      {/* Hero character — floats up on the left at larger screens */}
      <img
        src="/mascot-hero.png"
        alt="ByteCraft Expedition Mascot"
        style={{
          position: 'absolute',
          left: 'calc(50% - 520px)',
          bottom: 80,
          width: 320,
          objectFit: 'contain',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 16px 32px rgba(0,48,80,0.3))',

          display: 'block',
        }}
      />

      {/* Giant White Cloud Island Login Card */}
      <div style={{
        width: '100%',
        maxWidth: 460,
        background: '#ffffff',
        borderRadius: 36,
        boxShadow: '0 20px 56px rgba(9,64,99,0.20)',
        padding: '40px 36px 36px',
        position: 'relative',
        zIndex: 10,
        border: '3px solid #ffffff',
      }}>
        {/* Scalloped cloud top */}
        <div style={{
          position: 'absolute',
          top: -28,
          left: '16%',
          width: 130,
          height: 56,
          background: '#ffffff',
          borderRadius: 999,
          boxShadow: '0 -6px 16px rgba(9,64,99,0.06)',
        }} />
        <div style={{
          position: 'absolute',
          top: -34,
          right: '20%',
          width: 160,
          height: 68,
          background: '#ffffff',
          borderRadius: 999,
          boxShadow: '0 -6px 16px rgba(9,64,99,0.06)',
        }} />

        {/* Logo only - no name */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="/bytecraft-logo.png"
            alt="Logo"
            style={{ height: 84, width: 'auto', objectFit: 'contain', margin: '0 auto 12px', display: 'block' }}
          />
          <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
            Club Coordination & Operations Platform
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fee2e2', border: '1.5px solid #fca5a5',
            borderRadius: 14, padding: '10px 14px',
            color: '#b91c1c', fontSize: 13, fontWeight: 600,
            marginBottom: 18,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@bytecraft.club"
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  paddingLeft: 42,
                  paddingRight: 14,
                  paddingTop: 12,
                  paddingBottom: 12,
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--text-dark)',
                  background: '#f4fafe',
                  border: '2px solid #c8dff0',
                  borderRadius: 14,
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#e87823')}
                onBlur={e => (e.target.style.borderColor = '#c8dff0')}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  paddingLeft: 42,
                  paddingRight: 44,
                  paddingTop: 12,
                  paddingBottom: 12,
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--text-dark)',
                  background: '#f4fafe',
                  border: '2px solid #c8dff0',
                  borderRadius: 14,
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#e87823')}
                onBlur={e => (e.target.style.borderColor = '#c8dff0')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              background: 'linear-gradient(135deg, #e87823 0%, #f48a37 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 999,
              padding: '13px 24px',
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              letterSpacing: '0.05em',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 4px 0px #c45f12, 0 6px 16px rgba(232,120,35,0.35)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? 'SIGNING IN…' : 'ENTER THE GUILD'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: '#e0eff9' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Quick Demo Access
          </span>
          <div style={{ flex: 1, height: 1, background: '#e0eff9' }} />
        </div>

        {/* Demo Login Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DEMO_OPTIONS.map(d => (
            <button
              key={d.id}
              onClick={() => handleDemoLogin(d.id)}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '10px 16px',
                borderRadius: 16,
                border: `2px solid ${d.bg}`,
                background: d.bg,
                cursor: loading ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <img src={d.mascot} alt={d.label} style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: d.accent, letterSpacing: '0.03em' }}>
                  {d.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {d.name} — {d.desc}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: d.accent, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
