import React from 'react';

/* ─────────────────────────────────────────────
   工单状态 Badge（统一版，消除 5 处重复）
───────────────────────────────────────────── */
const DS_MAP = {
  '待派单': { bg: '#FFF7E6', color: '#D4880F' },
  '派单中': { bg: '#F0E6FF', color: '#7C3AED' },
  '已接受': { bg: '#E6F0FF', color: '#1B3A5C' },
  '处理中': { bg: '#E6F7ED', color: '#1E8449' },
  '已完结': { bg: '#E6F0FF', color: '#1B3A5C' },
  '已关闭': { bg: '#F5F7FA', color: '#8C9AAF' },
};

export function StatusBadge({ status, style }) {
  const s = DS_MAP[status] || { bg: '#F5F7FA', color: '#8C9AAF' };
  return (
    <span
      style={{
        background: s.bg, color: s.color,
        padding: '2px 8px', borderRadius: '2px',
        fontSize: '11px', fontWeight: '600',
        letterSpacing: '0.3px',
        ...style,
      }}
    >
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────
   时间格式化（统一版，消除 3 处重复）
───────────────────────────────────────────── */
export function fmtTime(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtTimeShort(str) {
  if (!str) return '—';
  const d = new Date(str);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ─────────────────────────────────────────────
   获取用户名（统一版，消除 3 处重复）
───────────────────────────────────────────── */
export function getUserName(fallback = '用户') {
  return sessionStorage.getItem('displayName') || fallback;
}

/* ─────────────────────────────────────────────
   加载中组件（统一版，消除各处静态文字）
───────────────────────────────────────────── */
export function Loading({ text = '加载中…', minHeight = '200px' }) {
  return (
    <div style={{
      textAlign: 'center', padding: `${minHeight === '200px' ? '60px' : '40px'} 0`,
      color: '#8C9AAF',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight,
    }}>
      <div style={{
        width: '32px', height: '32px',
        border: '3px solid #EDF2F7',
        borderTopColor: '#3858E6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '12px',
      }} />
      <span style={{ fontSize: '13px' }}>{text}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   空状态占位（统一版）
───────────────────────────────────────────── */
export function EmptyState({ icon = '📋', text = '暂无数据', hint }) {
  return (
    <div style={{
      textAlign: 'center', padding: '40px 20px',
      background: '#fff', borderRadius: '12px',
      color: '#8C9AAF', border: '1px solid #EDF2F7',
    }}>
      <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: hint ? '4px' : 0 }}>{text}</div>
      {hint && <div style={{ fontSize: '12px', marginTop: '4px' }}>{hint}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   全局 spin 动画（统一注入，避免重复）
───────────────────────────────────────────── */
export function GlobalStyles() {
  return (
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes breathe {
        0%, 100% { transform: scale(1); opacity: 0.3; }
        50% { transform: scale(1.12); opacity: 0.7; }
      }
      @keyframes bounce {
        0%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-6px); }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(40px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `}</style>
  );
}
