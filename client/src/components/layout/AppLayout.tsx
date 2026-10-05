import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronRight, Menu, X } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  /** When true, wraps content in the sky/illustrated adventure layout without sidebar */
  fullPage?: boolean;
}

export default function AppLayout({ children, title, subtitle, breadcrumbs, actions, fullPage }: LayoutProps) {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #08476e 0%, #116c9e 35%, #2192cf 65%, #bfe8fa 100%)',
        flexDirection: 'column',
        gap: 20
      }}>
        <img src="/bytecraft-logo.png" alt="ByteCraft" style={{ width: 90, height: 90, objectFit: 'contain', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.3))' }} />
        <div style={{
          width: 36,
          height: 36,
          border: '4px solid rgba(255,255,255,0.3)',
          borderTopColor: '#ffffff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* Full-page mode — no sidebar, handled by the page itself (e.g. Dashboard) */
  if (fullPage) {
    return <>{children}</>;
  }

  /* Standard inner pages — sidebar + topbar */
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 99, display: 'none'
          }}
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className="app-sidebar"
        style={{
          width: 260,
          background: 'linear-gradient(180deg, var(--sky-top) 0%, #0a2a40 100%)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 100,
          overflowY: 'auto',
          boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Sidebar Logo */}
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            <img src="/bytecraft-logo.png" alt="Logo" style={{ height: 46, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(91,184,232,0.4))' }} />
          </Link>
          {/* Mobile close button */}
          <button
            className="mobile-only"
            onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <Sidebar />

        {/* Demo status footer */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.1)', marginTop: 'auto' }}>
          <div style={{ fontSize: 10, color: 'rgba(168,216,240,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Demo Mode Active
          </div>
          <div style={{ fontSize: 11, color: 'rgba(168,216,240,0.6)', marginTop: 2 }}>
            Password: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>bytecraft2026</code>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="main-content-area" style={{ flex: 1, marginLeft: 260, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Mobile topbar burger */}
        <div className="mobile-topbar" style={{ display: 'none', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'linear-gradient(180deg, var(--sky-top) 0%, #0a2a40 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
          >
            <Menu size={22} />
          </button>
          <img src="/bytecraft-logo.png" alt="Logo" style={{ height: 32, width: 'auto' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', flex: 1 }}>{title}</span>
        </div>

        <Topbar title={title} subtitle={subtitle} />

        <main style={{ flex: 1, padding: '28px 32px' }} className="main-content">
          {/* Breadcrumbs + actions header */}
          {(breadcrumbs || actions) && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 22
            }}>
              {breadcrumbs ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                  <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
                  {breadcrumbs.map((b, idx) => (
                    <React.Fragment key={idx}>
                      <ChevronRight size={13} style={{ opacity: 0.5 }} />
                      {b.to ? (
                        <Link to={b.to} style={{ color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 600 }}>
                          {b.label}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>{b.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : <div />}

              {actions && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {actions}
                </div>
              )}
            </div>
          )}

          {children}
        </main>

        {/* Footer */}
        <div style={{
          padding: '10px 32px',
          borderTop: '1px solid var(--border-subtle, #e7f3fa)',
          background: 'rgba(255,255,255,0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: 'var(--text-muted)',
          fontWeight: 500,
          flexWrap: 'wrap',
          gap: 8
        }}>
          <span><strong>ByteCraft</strong> — Expedition & Ops Platform • 2026–2027 Season</span>
          <span>Demo Mode • All accounts: <code style={{ background: '#f0f8fd', padding: '1px 6px', borderRadius: 4 }}>bytecraft2026</code></span>
        </div>
      </div>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .app-sidebar {
            transform: ${sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'} !important;
          }
          .main-content-area {
            margin-left: 0 !important;
          }
          .mobile-overlay {
            display: ${sidebarOpen ? 'block' : 'none'} !important;
          }
          .mobile-topbar {
            display: flex !important;
          }
          .main-content {
            padding: 16px !important;
          }
          .mobile-only {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-only {
            display: none !important;
          }
          .mobile-topbar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
