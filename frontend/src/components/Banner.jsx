import React, { useState, useCallback } from 'react';
import { FaSearch, FaMapMarkerAlt, FaCalendarAlt, FaTimes, FaSpinner } from 'react-icons/fa';
import { searchTickets } from '../api';

/* 状态颜色 */
const DS_COLOR = {
  '待派单': { bg:'#FFF7E6', color:'#D4880F' },
  '派单中': { bg:'#F0E6FF', color:'#7C3AED' },
  '已接受': { bg:'#E6F0FF', color:'#1B3A5C' },
  '处理中': { bg:'#E6F7ED', color:'#1E8449' },
  '已完结': { bg:'#E6F0FF', color:'#1B3A5C' },
};

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* 搜索结果弹窗 */
function SearchResultModal({ open, results, keyword, loading, onClose }) {
  if (!open) return null;
  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:9000,
        background:'rgba(15,38,64,0.50)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background:'#fff', borderRadius:'4px', width:'100%', maxWidth:'720px',
        maxHeight:'80vh', display:'flex', flexDirection:'column',
        boxShadow:'0 12px 48px rgba(0,0,0,0.22)',
        overflow:'hidden',
      }}>
        {/* 头部 */}
        <div style={{
          padding:'14px 20px', borderBottom:'1px solid #E8ECF0',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'#F8FAFB',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <FaSearch size={14} color="#1B3A5C" />
            <span style={{ fontSize:'15px', fontWeight:'600', color:'#1A1A2E' }}>搜索结果</span>
            {keyword && (
              <span style={{ fontSize:'12px', color:'#8C9AAF' }}>
                关键词：<strong style={{ color:'#1B3A5C' }}>{keyword}</strong>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#8C9AAF', padding:'4px' }}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* 内容 */}
        <div style={{ overflow:'auto', padding:'14px 20px', flex:1 }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#8C9AAF' }}>
              <FaSpinner className="spin" size={20} style={{ marginBottom:'10px' }} />
              <div>搜索中…</div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#C0C4CC' }}>
              <div style={{ fontSize:'28px', marginBottom:'10px', opacity:0.5 }}>未找到</div>
              <div>未找到相关结果</div>
              <div style={{ fontSize:'12px', marginTop:'4px' }}>尝试更换关键词或地点重新搜索</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ fontSize:'12px', color:'#8C9AAF', marginBottom:'4px' }}>
                共找到 <strong style={{ color:'#1B3A5C' }}>{results.length}</strong> 条相关记录
              </div>
              {results.map(t => {
                const ds = t.dispatch_status || '待派单';
                const sc = DS_COLOR[ds] || { bg:'#f5f7fa', color:'#8C9AAF' };
                const photoUrls = t.photo_urls ? JSON.parse(t.photo_urls) : [];
                return (
                  <div key={t.id} style={{
                    border:'1px solid #E8ECF0', borderRadius:'4px',
                    padding:'12px 14px', background:'#FAFBFC',
                    transition:'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='#F0F4F8'}
                  onMouseLeave={e => e.currentTarget.style.background='#FAFBFC'}
                  >
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                          <span style={{ fontSize:'12px', color:'#8C9AAF' }}>#{t.id}</span>
                          <span style={{ fontSize:'13px', fontWeight:'600', color:'#1A1A2E', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {t.title}
                          </span>
                          <span style={{
                            background: sc.bg, color: sc.color,
                            padding:'1px 8px', borderRadius:'2px',
                            fontSize:'11px', fontWeight:'600', flexShrink:0,
                          }}>{ds}</span>
                        </div>
                        <div style={{ display:'flex', gap:'14px', fontSize:'12px', color:'#8C9AAF', flexWrap:'wrap' }}>
                          <span>{t.location}</span>
                          {t.department && <span>{t.department}</span>}
                          <span>{fmtDate(t.createdAt)}</span>
                          {t.assignee && <span>{t.assignee}</span>}
                          {t.isTimeout === 1 && <span style={{ color:'#C0392B', fontWeight:'600' }}>已超时</span>}
                        </div>
                        {t.content && t.content !== t.title && (
                          <div style={{ fontSize:'12px', color:'#5A6A7A', marginTop:'4px', lineHeight:'1.5',
                            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                            {t.content}
                          </div>
                        )}
                      </div>
                      {photoUrls.length > 0 && (
                        <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                          {photoUrls.slice(0,2).map((url, i) => (
                            <img key={i} src={url} alt="现场"
                              style={{ width:'48px', height:'48px', objectFit:'cover', borderRadius:'2px', border:'1px solid #E8ECF0' }}
                            />
                          ))}
                          {photoUrls.length > 2 && (
                            <div style={{ width:'48px', height:'48px', borderRadius:'2px', background:'#E8ECF0',
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#8C9AAF' }}>
                              +{photoUrls.length-2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
}

/* Banner 主组件 */
export default function Banner() {
  const [keyword,   setKeyword]   = useState('');
  const [location,  setLocation]  = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);

  const handleSearch = useCallback(async () => {
    const params = {};
    if (keyword.trim())   params.keyword   = keyword.trim();
    if (location.trim())  params.location  = location.trim();
    if (startDate)        params.startDate = startDate;
    if (endDate)          params.endDate   = endDate;

    if (!params.keyword && !params.location && !params.startDate && !params.endDate) {
      params.keyword = '';
    }

    setSearchOpen(true);
    setSearching(true);
    try {
      const data = await searchTickets(params);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [keyword, location, startDate, endDate]);

  return (
    <>
      <div style={{
        width:'100%', height:'240px', marginTop:'56px',
        position:'relative',
        background:'linear-gradient(135deg, #0F2640 0%, #1B3A5C 40%, #2A5A8C 100%)',
        display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
      }}>
        {/* 装饰纹理 */}
        <div style={{
          position:'absolute', inset:0, opacity:0.03,
          backgroundImage:'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
          backgroundSize:'20px 20px',
        }} />

        {/* 内容层 */}
        <div style={{
          position:'relative', zIndex:1, textAlign:'center',
          width:'100%', maxWidth:'860px', padding:'0 24px',
        }}>
          <h1 style={{
            color:'#fff', fontSize:'26px', fontWeight:'600',
            letterSpacing:'4px', textShadow:'0 1px 8px rgba(0,0,0,0.3)',
            margin:'0 0 8px', lineHeight:1.4,
          }}>
            欢迎使用市容巡查一体化系统
          </h1>
          <div style={{
            width:'60px', height:'2px', background:'#C5A55A',
            margin:'0 auto 20px', borderRadius:'1px',
          }} />

          {/* 搜索框组 */}
          <div style={{
            background:'rgba(255,255,255,0.98)', borderRadius:'4px',
            padding:'12px 16px', boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
            display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap',
            border:'1px solid rgba(197,165,90,0.3)',
          }}>
            <SearchInput
              icon={<FaSearch size={13} color="#8C9AAF" />}
              placeholder="事件关键词…"
              value={keyword}
              onChange={setKeyword}
              onEnter={handleSearch}
              flex="2"
            />
            <Divider />
            <SearchInput
              icon={<FaMapMarkerAlt size={13} color="#8C9AAF" />}
              placeholder="地点（街道/小区）…"
              value={location}
              onChange={setLocation}
              onEnter={handleSearch}
              flex="2"
            />
            <Divider />
            <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:'3', minWidth:'200px' }}>
              <FaCalendarAlt size={13} color="#8C9AAF" />
              <input type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
              <span style={{ color:'#C0C4CC', fontSize:'12px', flexShrink:0 }}>至</span>
              <input type="date" value={endDate}
                onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
            </div>
            <button
              onClick={handleSearch}
              style={{
                background:'#1B3A5C', color:'#fff', border:'none', borderRadius:'2px',
                padding:'8px 24px', fontSize:'13px', fontWeight:'600',
                cursor:'pointer', flexShrink:0, transition:'background 0.2s',
                whiteSpace:'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='#2A5A8C'; }}
              onMouseLeave={e => { e.currentTarget.style.background='#1B3A5C'; }}
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* 搜索结果弹窗 */}
      <SearchResultModal
        open={searchOpen}
        results={searchResults}
        keyword={keyword}
        loading={searching}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}

function SearchInput({ icon, placeholder, value, onChange, onEnter, flex }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', flex, minWidth:'120px' }}>
      {icon}
      <input
        type="text" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter && onEnter()}
        style={{ flex:1, border:'none', outline:'none', fontSize:'13px', color:'#1A1A2E', background:'transparent', padding:'4px 0' }}
      />
    </div>
  );
}

function Divider() {
  return <div style={{ width:'1px', height:'24px', background:'#E8ECF0', flexShrink:0 }} />;
}

const dateInputStyle = {
  border:'none', outline:'none', fontSize:'12px', color:'#5A6A7A',
  background:'transparent', cursor:'pointer', flex:1, minWidth:'80px',
};
