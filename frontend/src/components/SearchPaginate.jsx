import React from 'react';

/* ── 搜索框组件 ── */
export function SearchBar({ value, onChange, placeholder = '搜索工单…' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      background: '#fff', borderRadius: '8px',
      border: '1px solid #E4E7ED', padding: '6px 12px',
      flex: '1 1 280px', maxWidth: '400px',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1B3A5C'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E7ED'; }}
    >
      {/* 搜索图标 */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8C9AAF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none',
          fontSize: '13px', color: '#1A1A2E', fontFamily: 'inherit',
          background: 'transparent',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#8C9AAF', padding: '0 2px', fontSize: '14px', lineHeight: 1,
          }}
        >×</button>
      )}
    </div>
  );
}

/* ── 分页组件 ── */
export function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const getVisible = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '4px', padding: '12px 0', flexWrap: 'wrap',
    }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        style={{
          padding: '4px 10px', borderRadius: '6px', border: '1px solid #E4E7ED',
          background: page <= 1 ? '#F5F7FA' : '#fff',
          color: page <= 1 ? '#CBC5C0' : '#5A6A7A',
          fontSize: '12px', fontWeight: '600', cursor: page <= 1 ? 'not-allowed' : 'pointer',
        }}
      >‹ 上一页</button>
      {getVisible().map(p => (
        p === '...' ? (
          <span key={`ellipsis-${p}`} style={{ padding: '4px 6px', color: '#CBC5C0', fontSize: '12px' }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              width: '32px', height: '32px', borderRadius: '6px',
              border: page === p ? '2px solid #1B3A5C' : '1px solid #E4E7ED',
              background: page === p ? '#EEF3FD' : '#fff',
              color: page === p ? '#1B3A5C' : '#5A6A7A',
              fontSize: '12px', fontWeight: page === p ? '700' : '500',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >{p}</button>
        )
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        style={{
          padding: '4px 10px', borderRadius: '6px', border: '1px solid #E4E7ED',
          background: page >= totalPages ? '#F5F7FA' : '#fff',
          color: page >= totalPages ? '#CBC5C0' : '#5A6A7A',
          fontSize: '12px', fontWeight: '600', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
        }}
      >下一页 ›</button>
      <span style={{ marginLeft: '12px', fontSize: '12px', color: '#8C9AAF' }}>
        共 {total} 条，第 {page}/{totalPages} 页
      </span>
    </div>
  );
}
