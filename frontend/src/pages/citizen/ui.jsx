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
        background: 'rgba(15,38,64,0.50)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '4px',
          width, maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.20)',
          borderTop: '3px solid #1B3A5C',
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #E8ECF0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: '600', fontSize: '15px', color: '#1A1A2E', letterSpacing:'0.5px' }}>
            {title}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#8C9AAF', padding: '4px', display: 'flex', alignItems: 'center',
              }}
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>

        {/* 内容 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {children}
        </div>

        {/* 底部按钮区 */}
        {footer && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #E8ECF0',
              display: 'flex', gap: '10px', justifyContent: 'flex-end',
              flexShrink: 0, background:'#FAFBFC',
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
            fontSize: '24px',
            cursor: readOnly ? 'default' : 'pointer',
            color: n <= display ? '#C5A55A' : '#D9DEE6',
            transition: 'color 0.15s',
          }}
        >
          {n <= display ? <FaStar /> : <FaRegStar />}
        </span>
      ))}
      {!readOnly && display > 0 && (
        <span style={{ marginLeft: '8px', color: '#5A6A7A', fontSize: '13px' }}>
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
    border: 'none', borderRadius: '2px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '600', transition: 'opacity 0.2s, background 0.2s',
    opacity: disabled ? 0.6 : 1,
    fontFamily: 'inherit', letterSpacing: '0.5px',
    ...extraStyle,
  };
  const sizes = { sm: '5px 12px', md: '7px 18px', lg: '10px 24px' };
  const fontSize = { sm: '12px', md: '13px', lg: '14px' };
  const variants = {
    primary:  { background: '#1B3A5C', color: '#fff' },
    success:  { background: '#1E8449', color: '#fff' },
    danger:   { background: '#C0392B', color: '#fff' },
    ghost:    { background: '#F0F2F5', color: '#5A6A7A', border: '1px solid #D9DEE6' },
    warning:  { background: '#D4880F', color: '#fff' },
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
export function Card({ children, style: extra, padding = '16px 20px' }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '4px',
        boxShadow: '0 1px 4px rgba(27,58,92,0.06)',
        padding,
        border: '1px solid #E8ECF0',
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
    '待处置':  { bg: '#FFF7E6', color: '#D4880F' },
    '处置中':  { bg: '#E6F7ED', color: '#1E8449' },
    '已完成':  { bg: '#E6F0FF', color: '#1B3A5C' },
    '已派单':  { bg: '#F0E6FF', color: '#7C3AED' },
    '已关闭':  { bg: '#F0F2F5', color: '#8C9AAF' },
  };
  const { bg = '#F0F2F5', color = '#8C9AAF' } = map[status] || {};
  return (
    <span
      style={{
        background: bg, color,
        padding: '2px 8px', borderRadius: '2px',
        fontSize: '11px', fontWeight: '600',
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
