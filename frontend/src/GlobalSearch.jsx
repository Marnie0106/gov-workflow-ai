import React, { useState } from 'react';

export default function GlobalSearch({ onSearch }) {
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSearch = () => {
    onSearch({ keyword, startDate, endDate });
  };

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: '16px'
    }}>
      <input
        type="text"
        placeholder="事件关键词或地点"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{
          width: '260px',
          padding: '10px 16px',
          fontSize: '16px',
          borderRadius: '40px',
          border: 'none',
          outline: 'none'
        }}
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        style={{
          padding: '10px 16px',
          fontSize: '16px',
          borderRadius: '40px',
          border: 'none'
        }}
      />
      <span style={{ color: '#fff' }}>至</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        style={{
          padding: '10px 16px',
          fontSize: '16px',
          borderRadius: '40px',
          border: 'none'
        }}
      />
      <button
        onClick={handleSearch}
        style={{
          padding: '10px 28px',
          fontSize: '16px',
          borderRadius: '40px',
          border: 'none',
          backgroundColor: '#409EFF',
          color: '#fff',
          cursor: 'pointer'
        }}
      >
        搜索
      </button>
    </div>
  );
}