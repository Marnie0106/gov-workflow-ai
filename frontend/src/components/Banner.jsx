import React, { useState, useCallback } from 'react';
import { FaSearch, FaMapMarkerAlt, FaCalendarAlt, FaTimes, FaSpinner } from 'react-icons/fa';
import { searchTickets } from '../api';

/* ── 状态颜色 ── */
const DS_COLOR = {
  '待派单': { bg:'#FFF3E0', color:'#E67E22' },
  '派单中': { bg:'#F3E8FF', color:'#8E44AD' },
  '已接受': { bg:'#E8F0FE', color:'#1658AF' },
  '处理中': { bg:'#E8F5E9', color:'#27AE60' },
  '已完结': { bg:'#E8F0FE', color:'#1658AF' },
};

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── 搜索结果弹窗 ── */
function SearchResultModal({ open, results, keyword, loading, onClose }) {
  if (!open) return null;
  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:9000,
        background:'rgba(10,43,78,0.45)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'720px',
        maxHeight:'80vh', display:'flex', flexDirection:'column',
        boxShadow:'0 12px 48px rgba(0,0,0,0.22)',
        overflow:'hidden',
      }}>
        {/* 头部 */}
        <div style={{
          padding:'18px 24px', borderBottom:'1px solid #f0f0f0',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'#f8faff',
        }}>
          <div>
            <span style={{ fontSize:'16px', fontWeight:'700', color:'#1a2a3a' }}>🔍 搜索结果</span>
            {keyword && (
              <span style={{ marginLeft:'10px', fontSize:'13px', color:'#909399' }}>
                关键词：<strong style={{ color:'#1658AF' }}>{keyword}</strong>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#909399', padding:'4px' }}
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* 内容 */}
        <div style={{ overflow:'auto', padding:'16px 24px', flex:1 }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#909399' }}>
              <FaSpinner className="spin" size={24} style={{ marginBottom:'12px' }} />
              <div>搜索中…</div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#c0c4cc' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>📭</div>
              <div>未找到相关结果</div>
              <div style={{ fontSize:'12px', marginTop:'6px' }}>尝试更换关键词或地点重新搜索</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ fontSize:'13px', color:'#909399', marginBottom:'4px' }}>
                共找到 <strong style={{ color:'#1658AF' }}>{results.length}</strong> 条相关记录
              </div>
              {results.map(t => {
                const ds = t.dispatch_status || '待派单';
                const sc = DS_COLOR[ds] || { bg:'#f5f7fa', color:'#909399' };
                const photoUrls = t.photo_urls ? JSON.parse(t.photo_urls) : [];
                return (
                  <div key={t.id} style={{
                    border:'1px solid #e4e7ed', borderRadius:'12px',
                    padding:'14px 16px', background:'#fafbff',
                    transition:'box-shadow 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow='0 2px 12px rgba(22,88,175,0.10)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
                  >
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                          <span style={{ fontSize:'12px', color:'#909399' }}>#{t.id}</span>
                          <span style={{ fontSize:'14px', fontWeight:'600', color:'#1a2a3a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {t.title}
                          </span>
                          <span style={{
                            background: sc.bg, color: sc.color,
                            padding:'2px 8px', borderRadius:'10px',
                            fontSize:'11px', fontWeight:'600', flexShrink:0,
                          }}>{ds}</span>
                        </div>
                        <div style={{ display:'flex', gap:'16px', fontSize:'12px', color:'#909399', flexWrap:'wrap' }}>
                          <span>📍 {t.location}</span>
                          {t.department && <span>🏢 {t.department}</span>}
                          <span>📅 {fmtDate(t.createdAt)}</span>
                          {t.assignee && <span>👤 {t.assignee}</span>}
                          {t.isTimeout === 1 && <span style={{ color:'#E74C3C', fontWeight:'600' }}>⏰ 已超时</span>}
                        </div>
                        {t.content && t.content !== t.title && (
                          <div style={{ fontSize:'13px', color:'#606266', marginTop:'6px', lineHeight:'1.6',
                            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                            {t.content}
                          </div>
                        )}
                      </div>
                      {/* 缩略图 */}
                      {photoUrls.length > 0 && (
                        <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                          {photoUrls.slice(0,2).map((url, i) => (
                            <img key={i} src={url} alt="现场"
                              style={{ width:'52px', height:'52px', objectFit:'cover', borderRadius:'8px', border:'1px solid #e4e7ed' }}
                            />
                          ))}
                          {photoUrls.length > 2 && (
                            <div style={{ width:'52px', height:'52px', borderRadius:'8px', background:'#e4e7ed',
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'#909399' }}>
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

/* ─────────────────────────────────────────────
   Banner 主组件
───────────────────────────────────────────── */
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
    if (location.trim())  params.location  = location.trim(); // 后端可扩展location过滤
    if (startDate)        params.startDate = startDate;
    if (endDate)          params.endDate   = endDate;

    // 至少填一个条件
    if (!params.keyword && !params.location && !params.startDate && !params.endDate) {
      // 如果什么都没填，搜全部最新20条
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
        width:'100%', height:'400px', marginTop:'64px',
        position:'relative',
        backgroundImage:'url(/banner.png)',
        backgroundSize:'cover', backgroundPosition:'center', backgroundRepeat:'no-repeat',
        display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
      }}>
        {/* 深色遮罩 */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(180deg, rgba(8,30,65,0.70) 0%, rgba(10,43,78,0.55) 100%)',
        }} />

        {/* 内容层 */}
        <div style={{
          position:'relative', zIndex:1, textAlign:'center',
          width:'100%', maxWidth:'860px', padding:'0 24px',
        }}>
          <h1 style={{
            color:'#fff', fontSize:'36px', fontWeight:'700',
            letterSpacing:'3px', textShadow:'0 2px 16px rgba(0,0,0,0.5)',
            margin:'0 0 32px', lineHeight:1.3,
          }}>
            欢迎使用市容巡查一体化系统
          </h1>

          {/* 搜索框组 */}
          <div style={{
            background:'rgba(255,255,255,0.97)', borderRadius:'14px',
            padding:'16px 20px', boxShadow:'0 6px 28px rgba(0,0,0,0.22)',
            display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap',
          }}>
            <SearchInput
              icon={<FaSearch size={14} color="#909399" />}
              placeholder="事件关键词…"
              value={keyword}
              onChange={setKeyword}
              onEnter={handleSearch}
              flex="2"
            />
            <Divider />
            <SearchInput
              icon={<FaMapMarkerAlt size={14} color="#909399" />}
              placeholder="地点（街道/小区）…"
              value={location}
              onChange={setLocation}
              onEnter={handleSearch}
              flex="2"
            />
            <Divider />
            <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:'3', minWidth:'220px' }}>
              <FaCalendarAlt size={14} color="#909399" />
              <input type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
              <span style={{ color:'#c0c4cc', fontSize:'13px', flexShrink:0 }}>至</span>
              <input type="date" value={endDate}
                onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
            </div>
            <button
              onClick={handleSearch}
              style={{
                background:'#0A2B4E', color:'#fff', border:'none', borderRadius:'10px',
                padding:'10px 26px', fontSize:'15px', fontWeight:'600',
                cursor:'pointer', flexShrink:0, transition:'background 0.2s, transform 0.15s',
                whiteSpace:'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='#1558a8'; e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='#0A2B4E'; e.currentTarget.style.transform='none'; }}
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
    <div style={{ display:'flex', alignItems:'center', gap:'8px', flex, minWidth:'140px' }}>
      {icon}
      <input
        type="text" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter && onEnter()}
        style={{ flex:1, border:'none', outline:'none', fontSize:'14px', color:'#303133', background:'transparent', padding:'4px 0' }}
      />
    </div>
  );
}

function Divider() {
  return <div style={{ width:'1px', height:'28px', background:'#e4e7ed', flexShrink:0 }} />;
}

const dateInputStyle = {
  border:'none', outline:'none', fontSize:'13px', color:'#606266',
  background:'transparent', cursor:'pointer', flex:1, minWidth:'90px',
};
