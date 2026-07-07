import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBell, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import { getUnreadCount } from '../api';

const ROLE_MAP = {
  '/citizen':       '市民',
  '/dispatcher':    '工单处置人员',
  '/process-admin': '业务流程管理员',
  '/leader':        '领导',
};
const ROUTE_TO_MSG_ROLE = {
  '/citizen':       'citizen',
  '/dispatcher':    'dispatcher',
  '/process-admin': 'admin',
  '/leader':        null,
};

function getRoleName(pathname) {
  for (const [p, n] of Object.entries(ROLE_MAP)) if (pathname.startsWith(p)) return n;
  return '访客';
}
function getMsgRole(pathname) {
  for (const [p, r] of Object.entries(ROUTE_TO_MSG_ROLE)) if (pathname.startsWith(p)) return r;
  return null;
}

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const roleName   = getRoleName(location.pathname);
  const roleKey    = sessionStorage.getItem('roleKey') || '';
  const department = sessionStorage.getItem('department') || '';
  const msgRole    = getMsgRole(location.pathname);
  const rawDisplay = sessionStorage.getItem('displayName') || roleName;
  const citizenPhone = sessionStorage.getItem('citizenPhone') || '';
  const isCitizen  = roleKey === 'citizen';
  const displayName = isCitizen ? (citizenPhone ? `***${citizenPhone.slice(-4)}` : rawDisplay) : rawDisplay;

  const fetchUnread = async () => {
    if (!msgRole) { setUnread(0); return; }
    try { const d = await getUnreadCount(msgRole); setUnread(d?.count || 0); }
    catch { setUnread(0); }
  };
  useEffect(() => { fetchUnread(); const t = setInterval(fetchUnread, 30000); return () => clearInterval(t); }, [location.pathname]);

  const handleLogout = () => { sessionStorage.clear(); navigate('/login', { replace:true }); };

  const BLUE_DARK  = '#0B1E3D';
  const GOLD       = '#C5A55A';

  const isLeaderPage = location.pathname.startsWith('/leader');

  return (
    <nav style={{
      position:'fixed', top:0, left:0, width:'100%', height:'72px',
      zIndex:1000, display:'flex', flexDirection:'column',
      background:'linear-gradient(135deg, #0B1E3D 0%, #132B4F 40%, #1A3A6C 100%)',
      boxShadow:'0 4px 24px rgba(11,30,61,0.30)',
    }}>
      {/* 顶部 3px 渐变光线 */}
      <div style={{ width:'100%', height:'3px', background:'linear-gradient(90deg, #0B1E3D 0%, #C5A55A 30%, #00C1DE 70%, #0B1E3D 100%)' }} />

      {/* 主导航栏 */}
      <div style={{ flex:1, width:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{
          width:'100%', maxWidth:'1200px', padding:'0 40px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          {/* 左侧系统名 */}
          <div onClick={()=>navigate('/login')} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{
              width:'36px', height:'36px', borderRadius:'8px',
              background:'linear-gradient(135deg, #3858E6 0%, #00C1DE 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'16px', fontWeight:'800', color:'#fff',
              boxShadow:'0 2px 8px rgba(56,88,230,0.4)',
            }}>城</div>
            <div>
              <div style={{ color:'#FFFFFF', fontSize:'16px', fontWeight:'700', letterSpacing:'3px' }}>
                市容巡查一体化系统
              </div>
              <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'10px', letterSpacing:'2px', marginTop:'1px' }}>
                AI 驱动城市治理
              </div>
            </div>
          </div>

          {/* 右侧功能区 */}
          <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
            {/* 通知铃铛 */}
            {!isLeaderPage && (
            <button title={msgRole ? `${roleName}工作台未读消息` : '通知'} style={{
              background:'none', border:'none', cursor:'pointer', padding:'6px',
              display:'flex', alignItems:'center', position:'relative',
            }}>
              <FaBell size={16} color="rgba(255,255,255,0.70)" />
              {unread > 0 && (
                <span style={{
                  position:'absolute', top:'-4px', right:'-8px',
                  background:'linear-gradient(135deg, #C5A55A 0%, #F0C060 100%)',
                  color:'#FFFFFF', borderRadius:'10px',
                  padding:'0 5px', fontSize:'10px', fontWeight:'700',
                  minWidth:'18px', height:'18px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 2px 6px rgba(197,165,90,0.5)',
                }}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
            )}

            {!isLeaderPage && <div style={{ width:'1px', height:'24px', background:'rgba(255,255,255,0.15)' }} />}

            {/* 用户信息 */}
            <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'#FFFFFF' }}>
              <FaUserCircle size={20} color="rgba(255,255,255,0.65)" />
              <div style={{ display:'flex', flexDirection:'column', lineHeight:'1.25' }}>
                <span style={{ fontSize:'13px', fontWeight:'600' }}>{isCitizen ? `市民 ${displayName}` : displayName}</span>
                {department && <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.50)' }}>{department}</span>}
                {isCitizen && <span style={{ fontSize:'10px', color:'#C5A55A' }}>已认证</span>}
              </div>
            </div>

            {/* 退出 */}
            <button onClick={handleLogout} title="退出登录" style={{
              background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.20)',
              color:'rgba(255,255,255,0.75)', borderRadius:'6px', padding:'6px 16px',
              fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px',
              transition:'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.20)'; }}
            >
              <FaSignOutAlt size={10} /> 退出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
