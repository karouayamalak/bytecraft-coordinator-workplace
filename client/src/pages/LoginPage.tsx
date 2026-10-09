import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Mail, ArrowRight, AlertCircle, Search, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/ui/Avatar';

// Real ByteCraft team members with their registered Google accounts
const REGISTERED_GOOGLE_ACCOUNTS = [
  {
    name: 'Aya Malak Karou',
    email: 'a_karou@estin.dz',
    role: 'Coordinator',
    position: 'Club Coordinator',
    avatarUrl: '/avatars/aya-karou.jpg',
  },
  {
    name: 'Elmouatez Billah Ledjassa',
    email: 'e_ledjassa@estin.dz',
    role: 'President',
    position: 'Club President',
    avatarUrl: '/avatars/elmouatez-ledjassa.jpeg',
  },
  {
    name: 'Sadjed Louahouah',
    email: 's_louahouah@estin.dz',
    role: 'Vice President',
    position: 'Vice President',
    avatarUrl: '/avatars/sadjed-louahouah.jpeg',
  },
  {
    name: 'Ines Ben Ferhat',
    email: 'b_ines@estin.dz',
    role: 'Secretary',
    position: 'General Secretary',
    avatarUrl: '/avatars/secretary-ines.jpeg',
  },
  {
    name: 'Imene Bouzena',
    email: 'i_bouzena@estin.dz',
    role: 'Design Manager',
    position: 'Design Manager',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=85&crop=faces',
  },
  {
    name: 'Mohammed Benkerri',
    email: 'mbenkerri44@gmail.com',
    role: 'Multimedia Manager',
    position: 'Multimedia Manager',
    avatarUrl: '/avatars/mohammed-benkerri.jpg',
  },
  {
    name: 'Israa Chiheb',
    email: 'i_chiheb@estin.dz',
    role: 'Dev & Tech Manager',
    position: 'Development & Tech Manager',
    avatarUrl: '/avatars/israa-chiheb.jpeg',
  },
  {
    name: 'Rayane Alem',
    email: 'r_alem@estin.dz',
    role: 'Logistics Manager',
    position: 'Logistics & Activities Manager',
    avatarUrl: '/avatars/rayane-alem.jpg',
  },
  {
    name: 'Manel Lyazidi',
    email: 'm_lyazidi@estin.dz',
    role: 'Comms Manager',
    position: 'Communication Manager',
    avatarUrl: '/avatars/manel-lyazidi.jpg',
  },
  {
    name: 'Tamer Khalfa',
    email: 't_khalfa@estin.dz',
    role: 'ER Manager',
    position: 'External Relations Manager',
    avatarUrl: '/avatars/tamer-khalfa.jpeg',
  },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { loginWithGoogle, login } = useAuth();
  const navigate = useNavigate();

  const [inputEmail, setInputEmail] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [manualPassword, setManualPassword] = useState('');

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '984879669682-vodr62fs5glbipbka5q0nteo1s6b08du.apps.googleusercontent.com';

  useEffect(() => {
    let unmounted = false;

    const renderGoogleBtn = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id || !googleBtnRef.current || unmounted) return;

      try {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response?.credential) {
              setLoadingEmail('Google');
              setError('');
              try {
                await loginWithGoogle(response.credential);
                navigate('/');
              } catch (err: any) {
                setError(
                  err?.response?.data?.message ||
                  err?.message ||
                  'Your Google account is not registered in ByteCraft.'
                );
              } finally {
                setLoadingEmail(null);
              }
            }
          },
          auto_select: false,
        });

        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: '100%',
          logo_alignment: 'left',
        });
      } catch (err) {
        console.warn('Google Identity button initialization:', err);
      }
    };

    if ((window as any).google?.accounts?.id) {
      renderGoogleBtn();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(interval);
          renderGoogleBtn();
        }
      }, 300);
      return () => {
        unmounted = true;
        clearInterval(interval);
      };
    }

    return () => {
      unmounted = true;
    };
  }, [googleClientId, loginWithGoogle, navigate]);


  const handleGoogleLogin = async (email: string) => {
    if (!email) {
      setError('Please enter or select your Google account email.');
      return;
    }
    setLoadingEmail(email);
    setError('');
    try {
      await loginWithGoogle(email);
      navigate('/');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        `Google account "${email}" is not registered in ByteCraft.`
      );
    } finally {
      setLoadingEmail(null);
    }
  };

  const handleManualPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail || !manualPassword) {
      setError('Please fill in both email and password.');
      return;
    }
    setLoadingEmail(inputEmail);
    setError('');
    try {
      await login(inputEmail, manualPassword);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid credentials.');
    } finally {
      setLoadingEmail(null);
    }
  };

  const filteredMembers = REGISTERED_GOOGLE_ACCOUNTS.filter(m =>
    !searchMember ||
    m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.email.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.role.toLowerCase().includes(searchMember.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Brand Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <img
            src="/bytecraft-logo.png"
            alt="ByteCraft"
            style={{
              height: 58,
              width: 'auto',
              objectFit: 'contain',
              margin: '0 auto 16px',
              display: 'block',
              filter: 'brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.6))'
            }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f4f4f5', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            ByteCraft Operations
          </h1>
          <p style={{ fontSize: 13, color: '#71717a', margin: 0 }}>
            Sign in with your registered Google account
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 10, padding: '12px 14px',
            color: '#f87171', fontSize: 13, marginBottom: 18,
            lineHeight: 1.45,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{error}</div>
          </div>
        )}

        {/* Main Card: Google Sign-In */}
        <div style={{
          background: '#121214',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>

          {/* Official Google Sign-In Button */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#a1a1aa', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <GoogleIcon />
              <span>Sign in with your Google account</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: 44 }}>
              <div ref={googleBtnRef} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 14px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Or enter club email directly
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
          </div>

          {/* Quick Email Entry */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#a1a1aa', marginBottom: 8 }}>
              Google Account Email
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#71717a', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={inputEmail}
                  onChange={e => setInputEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGoogleLogin(inputEmail); }}
                  placeholder="name@estin.dz"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: '#18181b',
                    color: '#f4f4f5',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="button"
                disabled={!inputEmail || !!loadingEmail}
                onClick={() => handleGoogleLogin(inputEmail)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: (!inputEmail || !!loadingEmail) ? 'not-allowed' : 'pointer',
                  opacity: (!inputEmail || !!loadingEmail) ? 0.6 : 1,
                  transition: 'background 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {loadingEmail === inputEmail ? 'Verifying…' : (
                  <>
                    <GoogleIcon />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Or choose your club Google account
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
          </div>

          {/* Member Search filter */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#71717a', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search member by name or role…"
              value={searchMember}
              onChange={e => setSearchMember(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: 7,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#161618',
                color: '#e4e4e7',
                fontSize: 12.5,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Google Accounts List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 280,
            overflowY: 'auto',
            paddingRight: 2,
          }}>
            {filteredMembers.map(item => {
              const isLoading = loadingEmail === item.email;
              return (
                <button
                  key={item.email}
                  type="button"
                  disabled={!!loadingEmail}
                  onClick={() => handleGoogleLogin(item.email)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    background: isLoading ? 'rgba(37, 99, 235, 0.1)' : '#161619',
                    cursor: loadingEmail ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={e => {
                    if (!loadingEmail) {
                      e.currentTarget.style.background = '#1a1a1f';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!loadingEmail) {
                      e.currentTarget.style.background = '#161619';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    }
                  }}
                >
                  <Avatar src={item.avatarUrl} name={item.name} size="sm" />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#71717a', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.email} · <span style={{ color: '#a1a1aa' }}>{item.role}</span>
                    </div>
                  </div>

                  {isLoading ? (
                    <div style={{
                      width: 14, height: 14,
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderTopColor: '#2563eb',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                      flexShrink: 0
                    }} />
                  ) : (
                    <GoogleIcon />
                  )}
                </button>
              );
            })}
          </div>

          {/* Security Note */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 18,
            paddingTop: 14,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: 11.5,
            color: '#71717a',
            justifyContent: 'center',
          }}>
            <ShieldCheck size={13} style={{ color: '#16a34a' }} />
            <span>Authenticated via ByteCraft verified Google accounts</span>
          </div>
        </div>

        {/* Collapsible Manual Password Fallback */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowManualPassword(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: '#71717a',
              fontSize: 11.5,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Emergency password access</span>
            {showManualPassword ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showManualPassword && (
            <form onSubmit={handleManualPasswordSubmit} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              <input
                type="password"
                placeholder="Password (default: bytecraft2026)"
                value={manualPassword}
                onChange={e => setManualPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: '#141416',
                  color: '#ededed',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={!!loadingEmail}
                style={{
                  padding: '9px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#27272a',
                  color: '#ededed',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Sign In with Password
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#3f3f46' }}>
          ByteCraft Club · Internal Operations · ESTIN
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
