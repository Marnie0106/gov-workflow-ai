import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = '确认', cancelText = '取消', danger = false }) {
  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel?.()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,38,64,0.50)',
        zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        width: '400px', maxWidth: '100%',
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* 头部 */}
        <div style={{
          padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '12px',
          borderBottom: '1px solid #EDF2F7',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: danger ? '#FCEAEA' : '#FFF7E6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FaExclamationTriangle size={16} color={danger ? '#C0392B' : '#D4880F'} />
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px', color: '#1A1A2E' }}>
              {title || '操作确认'}
            </div>
            {message && (
              <div style={{ fontSize: '13px', color: '#5A6A7A', marginTop: '2px' }}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* 按钮区 */}
        <div style={{
          padding: '14px 24px',
          display: 'flex', gap: '10px', justifyContent: 'flex-end',
          background: '#FAFBFC',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '7px 20px', borderRadius: '8px',
              border: '1px solid #E4E7ED', background: '#fff',
              color: '#5A6A7A', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '7px 20px', borderRadius: '8px', border: 'none',
              background: danger
                ? 'linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)'
                : 'linear-gradient(135deg, #1B3A5C 0%, #3858E6 100%)',
              color: '#fff', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
