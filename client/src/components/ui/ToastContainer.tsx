import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const ICONS = {
  success: <CheckCircle size={16} style={{ color: '#34D399' }} />,
  error: <AlertCircle size={16} style={{ color: '#F87171' }} />,
  warning: <AlertTriangle size={16} style={{ color: '#FCD34D' }} />,
  info: <Info size={16} style={{ color: '#818CF8' }} />,
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {ICONS[toast.type]}
          <span style={{ flex: 1, fontSize: 13 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="btn-icon btn-ghost btn-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
