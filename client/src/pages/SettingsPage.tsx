import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Save, RefreshCw, CheckCircle2
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

interface ClubSettings {
  clubName?: string;
  academicYear?: string;
  contactEmail?: string;
  discordUrl?: string;
  maxTasksPerMember?: number;
  alertBeforeDays?: number;
}

const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];

export default function SettingsPage() {
  const { user } = useAuth();
  const isBoard = user ? BOARD_ROLES.includes(user.role) : false;
  const isCoordinator = user?.role === 'COORDINATOR';
  const { isConnected } = useWebSocket();

  if (!isBoard) {
    return <Navigate to="/" replace />;
  }

  const { data: initialSettings, refetch } = useFetch<ClubSettings>('/system/settings');
  const [settings, setSettings] = useState<ClubSettings>({
    clubName: 'ByteCraft Club',
    academicYear: '2026 - 2027',
    contactEmail: 'contact@bytecraft.club',
    discordUrl: 'https://discord.gg/bytecraft',
    maxTasksPerMember: 4,
    alertBeforeDays: 2,
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({ ...prev, ...initialSettings }));
    }
  }, [initialSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCoordinator) {
      alert('Only the Club Coordinator can modify system settings.');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/system/settings', settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Re-synchronize database with the official ByteCraft members, departments, and baseline data?')) {
      return;
    }
    setResetting(true);
    try {
      await api.post('/system/reset-demo');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      alert('Club directory & baseline synchronized successfully!');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to sync directory');
    } finally {
      setResetting(false);
    }
  };

  return (
    <AppLayout
      title="Club Settings & Brand Assets"
      subtitle="Configure club profile, workload thresholds, and coordination rules"
      breadcrumbs={[{ label: 'Settings' }]}
    >
      <form onSubmit={handleSave}>

        {/* Club Profile & Operational Rules */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
            Club Configuration & Workload Rules
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div>
              <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
                Club Name
              </label>
              <input
                type="text"
                className="input w-full"
                value={settings.clubName}
                disabled={!isCoordinator}
                onChange={e => setSettings({ ...settings, clubName: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
                Academic Year / Term
              </label>
              <input
                type="text"
                className="input w-full"
                value={settings.academicYear}
                disabled={!isCoordinator}
                onChange={e => setSettings({ ...settings, academicYear: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
                Contact / Coordination Email
              </label>
              <input
                type="email"
                className="input w-full"
                value={settings.contactEmail}
                disabled={!isCoordinator}
                onChange={e => setSettings({ ...settings, contactEmail: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
                Discord Server URL
              </label>
              <input
                type="text"
                className="input w-full"
                value={settings.discordUrl}
                disabled={!isCoordinator}
                onChange={e => setSettings({ ...settings, discordUrl: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
                Max Active Tasks Per Member (Overload Trigger)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                className="input w-full"
                value={settings.maxTasksPerMember}
                disabled={!isCoordinator}
                onChange={e => setSettings({ ...settings, maxTasksPerMember: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Flags member as overloaded in Workload Radar when active tasks exceed this limit.
              </span>
            </div>

            <div>
              <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
                Urgent Deadline Warning Window (Days)
              </label>
              <input
                type="number"
                min="1"
                max="14"
                className="input w-full"
                value={settings.alertBeforeDays}
                disabled={!isCoordinator}
                onChange={e => setSettings({ ...settings, alertBeforeDays: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Tasks due within this many days trigger yellow/orange countdown badges.
              </span>
            </div>
          </div>

          {isCoordinator && (
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Settings'}
              </button>
              {savedSuccess && (
                <span style={{ color: '#34D399', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} /> Settings successfully saved!
                </span>
              )}
            </div>
          )}
        </div>

        {/* System Diagnostics & Health */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
            System Diagnostics & Connectivity
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Backend API Engine</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#34D399', marginTop: 4 }}>
                ● Node.js / Express (Port 5000)
              </div>
            </div>

            <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>WebSocket Live Sync</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: isConnected ? '#34D399' : '#F59E0B', marginTop: 4 }}>
                {isConnected ? '● Connected (Instant Updates)' : '○ Reconnecting…'}
              </div>
            </div>

            <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Persistence Store</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-primary)', marginTop: 4 }}>
                JSON Engine with Auto-Save
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Zone */}
        {isCoordinator && (
          <div className="glass-card" style={{ padding: 24, border: '1px solid rgba(24, 125, 184, 0.25)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Directory Sync & Database Maintenance
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: 13 }}>
              Synchronize the database store with the official ByteCraft club directory, departments, and seed data.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetDemo}
              disabled={resetting}
              style={{ color: 'var(--accent-primary)', borderColor: 'rgba(24, 125, 184, 0.3)' }}
            >
              <RefreshCw size={14} className={resetting ? 'animate-spin' : ''} />
              {resetting ? 'Synchronizing...' : 'Re-sync Club Directory & Baseline'}
            </button>
          </div>
        )}
      </form>
    </AppLayout>
  );
}
