import React, { useState } from 'react';
import { FaSearch, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';

export default function Banner() {
  const [keyword,   setKeyword]   = useState('');
  const [location,  setLocation]  = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  const handleSearch = () => {
    console.log('搜索条件：', { keyword, location, startDate, endDate });
  };

  return (
    <div
      style={{
        width: '100%',
        height: '400px',
        marginTop: '64px',           /* 补偿固定导航栏高度 */
        position: 'relative',
        backgroundImage: 'url(/banner.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* 深色遮罩 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(8,30,65,0.70) 0%, rgba(10,43,78,0.55) 100%)',
        }}
      />

      {/* 内容层 */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          width: '100%',
          maxWidth: '860px',
          padding: '0 24px',
        }}
      >
        {/* 大标题 */}
        <h1
          style={{
            color: '#fff',
            fontSize: '36px',
            fontWeight: '700',
            letterSpacing: '3px',
            textShadow: '0 2px 16px rgba(0,0,0,0.5)',
            margin: '0 0 32px',
            lineHeight: 1.3,
          }}
        >
          欢迎使用市容巡查一体化系统
        </h1>

        {/* ── 搜索框组 ── */}
        <div
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 6px 28px rgba(0,0,0,0.22)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* 事件关键词 */}
          <SearchInput
            icon={<FaSearch size={14} color="#909399" />}
            placeholder="事件关键词…"
            value={keyword}
            onChange={setKeyword}
            flex="2"
          />

          <Divider />

          {/* 地点 */}
          <SearchInput
            icon={<FaMapMarkerAlt size={14} color="#909399" />}
            placeholder="地点（街道/小区）…"
            value={location}
            onChange={setLocation}
            flex="2"
          />

          <Divider />

          {/* 时间范围：开始 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '3', minWidth: '220px' }}>
            <FaCalendarAlt size={14} color="#909399" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={dateInputStyle}
            />
            <span style={{ color: '#c0c4cc', fontSize: '13px', flexShrink: 0 }}>至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={dateInputStyle}
            />
          </div>

          {/* 搜索按钮 */}
          <button
            onClick={handleSearch}
            style={{
              background: '#0A2B4E',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 26px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.2s, transform 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1558a8';
              e.currentTarget.style.transform  = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0A2B4E';
              e.currentTarget.style.transform  = 'none';
            }}
          >
            搜索
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 子组件 ── */
function SearchInput({ icon, placeholder, value, onChange, flex }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex,
        minWidth: '140px',
      }}
    >
      {icon}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && console.log('enter search')}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          fontSize: '14px',
          color: '#303133',
          background: 'transparent',
          padding: '4px 0',
        }}
      />
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: '1px',
        height: '28px',
        background: '#e4e7ed',
        flexShrink: 0,
      }}
    />
  );
}

const dateInputStyle = {
  border: 'none',
  outline: 'none',
  fontSize: '13px',
  color: '#606266',
  background: 'transparent',
  cursor: 'pointer',
  flex: 1,
  minWidth: '90px',
};
