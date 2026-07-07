import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast 容器 */}
      <div style={{
        position: 'fixed', top: '88px', right: '24px',
        zIndex: 10000,
        display: 'flex', flexDirection: 'column', gap: '8px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICON_MAP = {
  success: { icon: FaCheckCircle, color: '#1E8449', bg: '#E6F7ED', border: '#A3D9A5' },
  error:   { icon: FaExclamationCircle, color: '#C0392B', bg: '#FCEAEA', border: '#F5C6C6' },
  warning: { icon: FaExclamationCircle, color: '#D4880F', bg: '#FFF7E6', border: '#FFE4A0' },
  info:    { icon: FaInfoCircle, color: '#1B3A5C', bg: '#E6F0FF', border: '#B3D4FF' },
};

function ToastItem({ toast, onClose }) {
  const [visible, setVisible] = useState(false);
  const { icon: Icon, color, bg, border } = ICON_MAP[toast.type] || ICON_MAP.info;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      onMouseEnter={(e) => { e.currentTarget.style.pointerEvents = 'auto'; }}
      onMouseLeave={(e) => { e.currentTarget.style.pointerEvents = 'none'; }}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: bg, border: `1px solid ${border}`,
        borderRadius: '8px', padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        pointerEvents: 'auto',
        maxWidth: '360px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(40px)',
        transition: 'all 0.3s ease',
      }}
    >
      <Icon size={16} color={color} style={{ flexShrink: 0 }} />
      <span style={{
        fontSize: '13px', color, fontWeight: '500',
        lineHeight: '1.4', flex: 1, minWidth: 0,
      }}>
        {toast.message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color, padding: '2px', display: 'flex', alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <FaTimes size={12} />
      </button>
    </div>
  );
}
