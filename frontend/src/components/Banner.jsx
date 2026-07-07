import React, { useState, useCallback } from 'react';
import { FaSearch, FaMapMarkerAlt, FaCalendarAlt, FaTimes, FaSpinner } from 'react-icons/fa';
import { searchTickets, getImageUrl } from '../api';

const DS_COLOR = {
  '待派单': { bg:'#FFF5F0', color:'#D4880F' },
  '派单中': { bg:'#F0F5FF', color:'#7C3AED' },
  '已接受': { bg:'#EEF3FD', color:'#3858E6' },
  '处理中': { bg:'#F0FFF5', color:'#1E8449' },
  '已完结': { bg:'#EEF3FD', color:'#3858E6' },
};
function fmtDate(ts) { if (!ts) return '—'; const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function SearchResultModal({ open, results, keyword, loading, onClose }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', width:'100%', maxWidth:'720px', maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 12px 48px rgba(30,59,168,0.18)', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #D9E2EC', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F8FAFD' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <FaSearch size={14} color="#3858E6" />
            <span style={{ fontSize:'16px', fontWeight:'600', color:'#1A1A2E' }}>搜索结果</span>
            {keyword && <span style={{ fontSize:'12px', color:'#8C9AAF' }}>关键词：<strong style={{ color:'#3858E6' }}>{keyword}</strong></span>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#8C9AAF', padding:'4px' }}><FaTimes size={16} /></button>
        </div>
        <div style={{ overflow:'auto', padding:'16px 24px', flex:1 }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'50px 0', color:'#8C9AAF' }}>
              <FaSpinner className="spin" size={20} style={{ marginBottom:'12px' }} /><div>搜索中…</div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign:'center', padding:'50px 0', color:'#8C9AAF' }}>
              <div style={{ fontSize:'28px', marginBottom:'12px', opacity:0.4 }}>未找到</div>
              <div>未找到相关结果，尝试更换关键词</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ fontSize:'13px', color:'#8C9AAF', marginBottom:'4px' }}>共找到 <strong style={{ color:'#3858E6' }}>{results.length}</strong> 条记录</div>
              {results.map(t => {
                const ds = t.dispatch_status || '待派单';
                const sc = DS_COLOR[ds] || { bg:'#f5f5f5', color:'#999' };
                const photoUrls = t.photo_urls ? JSON.parse(t.photo_urls) : [];
                return (
                  <div key={t.id} style={{ border:'1px solid #D9E2EC', padding:'14px 16px', background:'#F8FAFD' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                          <span style={{ fontSize:'12px', color:'#8C9AAF' }}>#{t.id}</span>
                          <span style={{ fontSize:'14px', fontWeight:'600', color:'#1A1A2E' }}>{t.title}</span>
                          <span style={{ background:sc.bg, color:sc.color, padding:'2px 8px', fontSize:'11px', fontWeight:'600' }}>{ds}</span>
                        </div>
                        <div style={{ display:'flex', gap:'16px', fontSize:'12px', color:'#8C9AAF', flexWrap:'wrap' }}>
                          <span>{t.location}</span>{t.department && <span>{t.department}</span>}<span>{fmtDate(t.createdAt)}</span>
                          {t.isTimeout === 1 && <span style={{ color:'#c0392b', fontWeight:'600' }}>已超时</span>}
                        </div>
                      </div>
                      {photoUrls.length > 0 && (
                        <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                          {photoUrls.slice(0,2).map((url,i)=><img key={i} src={getImageUrl(url)} alt="" style={{ width:'48px',height:'48px',objectFit:'cover',border:'1px solid #D9E2EC' }}/>)}
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
    </div>
  );
}

export default function Banner() {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const BLUE       = '#3858E6';
  const BLUE_DARK  = '#0B1E3D';
  const BLUE_LIGHT = '#2D6CF0';
  const ACCENT     = '#00C1DE';
  const GOLD       = '#C5A55A';

  const handleSearch = useCallback(async () => {
    const params = {};
    if (keyword.trim()) params.keyword = keyword.trim();
    if (location.trim()) params.location = location.trim();
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    setSearchOpen(true); setSearching(true);
    try { const d = await searchTickets(params); setSearchResults(Array.isArray(d)?d:[]); }
    catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, [keyword, location, startDate, endDate]);

  return (
    <>
      {/* ===== Banner 通栏区域 ===== */}
      <div style={{
        width:'100%', marginTop:'100px',
        position:'relative', overflow:'hidden',
      }}>
        {/* 背景图区域 — 原图清晰可见，标题用深色大字 */}
        <div style={{
          width:'100%', height:'340px', position:'relative',
          background:'linear-gradient(135deg, #0B1E3D 0%, #132B4F 50%, #1A3A6C 100%)', overflow:'hidden',
        }}>
          {/* banner.png 背景图 — 完整可见 */}
          <img src="/banner.png" alt=""
            style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 30%', display:'block' }} />
          {/* 渐变遮罩：顶部微压暗，底部加深凸显文字 */}
          <div style={{
            position:'absolute', top:0, left:0, right:0, bottom:0,
            background:`linear-gradient(180deg,
              rgba(11,30,61,0.35) 0%,
              rgba(11,30,61,0.08) 35%,
              transparent 55%,
              rgba(11,30,61,0.40) 82%,
              rgba(11,30,61,0.72) 100%
            )`,
            pointerEvents:'none',
          }} />

          {/* 文字内容 */}
          <div style={{ position:'absolute', bottom:'40px', left:0, right:0, zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'0 40px' }}>
            <h1 style={{
              color:'#FFFFFF', fontSize:'36px', fontWeight:'800',
              letterSpacing:'12px', margin:'0 0 12px',
              textShadow:'0 4px 32px rgba(0,0,0,0.50)',
            }}>
              市容巡查一体化系统
            </h1>
            <p style={{
              color:'rgba(255,255,255,0.85)', fontSize:'14px',
              letterSpacing:'5px', margin:'0',
              textShadow:'0 2px 16px rgba(0,0,0,0.45)',
            }}>
              AI 驱动 · 智慧城市 · 一网统管
            </p>
          </div>
        </div>

        {/* 搜索栏 — 悬浮在 Banner 下方 */}
        <div style={{
          width:'100%', maxWidth:'1200px', margin:'-32px auto 0',
          padding:'0 32px', position:'relative', zIndex:10,
        }}>
          <div style={{
            background:'#FFFFFF', padding:'20px 28px',
            boxShadow:'0 8px 40px rgba(30,59,168,0.10)',
            borderRadius:'12px', border:'1px solid #E8ECF4',
            display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap',
            borderRadius:'4px',
          }}>
            <SearchInput icon={<FaSearch size={14} color="#8C9AAF"/>} placeholder="事件关键词…" value={keyword} onChange={setKeyword} onEnter={handleSearch} flex="2"/>
            <div style={{ width:'1px', height:'28px', background:'#D9E2EC', flexShrink:0 }}/>
            <SearchInput icon={<FaMapMarkerAlt size={14} color="#8C9AAF"/>} placeholder="地点（街道/小区）…" value={location} onChange={setLocation} onEnter={handleSearch} flex="2"/>
            <div style={{ width:'1px', height:'28px', background:'#D9E2EC', flexShrink:0 }}/>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:'3', minWidth:'200px' }}>
              <FaCalendarAlt size={14} color="#8C9AAF"/>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={dateS}/>
              <span style={{ color:'#8C9AAF', fontSize:'13px' }}>至</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={dateS}/>
            </div>
            <button onClick={handleSearch}
              style={{
                background:'linear-gradient(135deg, #3858E6 0%, #1A3A6C 100%)',
                color:'#fff', border:'none', padding:'10px 36px', fontSize:'15px', fontWeight:'600',
                cursor:'pointer', letterSpacing:'3px', whiteSpace:'nowrap',
                borderRadius:'8px', transition:'all 0.2s',
                boxShadow:'0 4px 16px rgba(56,88,230,0.35)',
              }}
              onMouseEnter={e=>e.currentTarget.style.opacity=0.88}
              onMouseLeave={e=>e.currentTarget.style.opacity=1}
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      <SearchResultModal open={searchOpen} results={searchResults} keyword={keyword} loading={searching} onClose={()=>setSearchOpen(false)} />
    </>
  );
}

function SearchInput({ icon, placeholder, value, onChange, onEnter, flex }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', flex, minWidth:'120px' }}>
      {icon}
      <input type="text" placeholder={placeholder} value={value}
        onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==='Enter'&&onEnter&&onEnter()}
        style={{ flex:1, border:'none', outline:'none', fontSize:'14px', color:'#1A1A2E', background:'transparent', padding:'4px 0' }}/>
    </div>
  );
}
const dateS = { border:'none', outline:'none', fontSize:'13px', color:'#4A5A6A', background:'transparent', cursor:'pointer', flex:1, minWidth:'80px' };
