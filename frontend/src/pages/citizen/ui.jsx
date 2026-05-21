import React from 'react';
import { FaTimes, FaStar, FaRegStar } from 'react-icons/fa';

/* ─────────────────────────────────────────────
   通用 Modal
───────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, width = '500px', footer }) {
  if (!open) return null;
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width, maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: '700', fontSize: '16px', color: '#1a2a3a' }}>
            {title}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#909399', padding: '4px', display: 'flex', alignItems: 'center',
              }}
            >
              <FaTimes size={16} />
            </button>
          )}
        </div>

        {/* 内容 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>

        {/* 底部按钮区（可选） */}
        {footer && (
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex', gap: '12px', justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   星级评分组件
───────────────────────────────────────────── */
export function StarRating({ value, onChange, readOnly = false }) {
  const LABELS = ['', '很差', '较差', '一般', '较好', '非常满意'];
  const [hover, setHover] = React.useState(0);
  const display = readOnly ? value : (hover || value);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => !readOnly && onChange(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          style={{
            fontSize: '28px',
            cursor: readOnly ? 'default' : 'pointer',
            color: n <= display ? '#F5A623' : '#e4e7ed',
            transition: 'color 0.15s',
          }}
        >
          {n <= display ? <FaStar /> : <FaRegStar />}
        </span>
      ))}
      {!readOnly && display > 0 && (
        <span style={{ marginLeft: '8px', color: '#606266', fontSize: '14px' }}>
          {LABELS[display]}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   通用按钮
───────────────────────────────────────────── */
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled = false, style: extraStyle }) {
  const base = {
    border: 'none', borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '600', transition: 'opacity 0.2s, transform 0.15s',
    opacity: disabled ? 0.6 : 1,
    fontFamily: 'inherit',
    ...extraStyle,
  };
  const sizes = { sm: '6px 14px', md: '9px 20px', lg: '12px 28px' };
  const fontSize = { sm: '13px', md: '14px', lg: '16px' };
  const variants = {
    primary:  { background: '#0A2B4E', color: '#fff' },
    success:  { background: '#27AE60', color: '#fff' },
    danger:   { background: '#E74C3C', color: '#fff' },
    ghost:    { background: '#f5f7fa', color: '#606266', border: '1px solid #e4e7ed' },
    warning:  { background: '#E67E22', color: '#fff' },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], padding: sizes[size], fontSize: fontSize[size] }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────
   卡片容器
───────────────────────────────────────────── */
export function Card({ children, style: extra, padding = '20px 24px' }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '14px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        padding,
        ...extra,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   工单状态 Badge
───────────────────────────────────────────── */
export function StatusBadge({ status }) {
  const map = {
    '待处置':  { bg: '#FFF3E0', color: '#E67E22' },
    '处置中':  { bg: '#E8F5E9', color: '#27AE60' },
    '已完成':  { bg: '#E8F0FE', color: '#1658AF' },
    '已派单':  { bg: '#F3E8FF', color: '#8E44AD' },
    '已关闭':  { bg: '#FAFAFA', color: '#909399' },
  };
  const { bg = '#f5f7fa', color = '#909399' } = map[status] || {};
  return (
    <span
      style={{
        background: bg, color,
        padding: '3px 10px', borderRadius: '12px',
        fontSize: '12px', fontWeight: '600',
      }}
    >
      {status}
    </span>
  );
}

/* 时间格式化 */
export function fmtTime(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
