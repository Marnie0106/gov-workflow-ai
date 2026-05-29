import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBell, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import { getUnreadCount } from '../api';

/* 路由 → 角色名称映射 */
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
  for (const [path, name] of Object.entries(ROLE_MAP)) {
    if (pathname.startsWith(path)) return name;
  }
  return '访客';
}

function getMsgRole(pathname) {
  for (const [path, role] of Object.entries(ROUTE_TO_MSG_ROLE)) {
    if (pathname.startsWith(path)) return role;
  }
  return null;
}

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const roleName     = getRoleName(location.pathname);
  const roleKey      = sessionStorage.getItem('roleKey') || '';
  const department   = sessionStorage.getItem('department') || '';
  const msgRole      = getMsgRole(location.pathname);

  const rawDisplay   = sessionStorage.getItem('displayName') || roleName;
  const citizenPhone = sessionStorage.getItem('citizenPhone') || '';
  const isCitizen    = roleKey === 'citizen';
  const displayName  = isCitizen
    ? (citizenPhone ? `***${citizenPhone.slice(-4)}` : rawDisplay)
    : rawDisplay;

  const fetchUnread = async () => {
    if (!msgRole) { setUnread(0); return; }
    try {
      const data = await getUnreadCount(msgRole);
      setUnread(data?.count || 0);
    } catch { setUnread(0); }
  };

  React.useEffect(() => {
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  return (
    <nav style={{
      position:'fixed', top:0, left:0, width:'100%', height:'56px',
      background:'linear-gradient(135deg, #0F2640 0%, #1B3A5C 100%)',
      zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow:'0 1px 6px rgba(0,0,0,0.20)',
      borderBottom:'2px solid #C5A55A',
    }}>
      <div style={{
        width:'100%', maxWidth:'1200px', padding:'0 24px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        {/* 左侧：系统名 */}
        <div
          onClick={() => navigate('/login')}
          style={{
            color:'#fff', fontSize:'16px', fontWeight:'600',
            cursor:'pointer', letterSpacing:'2px', userSelect:'none',
            display:'flex', alignItems:'center', gap:'10px',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 8V10H22V8L12 2Z" fill="#C5A55A"/>
            <rect x="4" y="11" width="3" height="8" fill="#fff" opacity="0.9"/>
            <rect x="10.5" y="11" width="3" height="8" fill="#fff" opacity="0.9"/>
            <rect x="17" y="11" width="3" height="8" fill="#fff" opacity="0.9"/>
            <rect x="2" y="20" width="20" height="2" fill="#C5A55A"/>
          </svg>
          <span>市容巡查一体化系统</span>
        </div>

        {/* 右侧 */}
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          {/* 通知 */}
          <button
            title={msgRole ? `${roleName}工作台未读消息` : '通知'}
            style={{
              background:'none', border:'none', color:'rgba(255,255,255,0.7)',
              cursor:'pointer', padding:'6px',
              display:'flex', alignItems:'center', position:'relative',
            }}
          >
            <FaBell size={16} />
            {unread > 0 && (
              <span style={{
                position:'absolute', top:'2px', right:'0',
                background:'#C0392B', color:'#fff',
                borderRadius:'8px', padding:'0 4px',
                fontSize:'10px', fontWeight:'700',
                minWidth:'14px', height:'14px',
                display:'flex', alignItems:'center', justifyContent:'center',
                border:'1.5px solid #1B3A5C',
              }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {/* 分隔线 */}
          <div style={{ width:'1px', height:'20px', background:'rgba(255,255,255,0.15)' }} />

          {/* 角色名 */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'#fff' }}>
            <FaUserCircle size={18} style={{ color:'rgba(255,255,255,0.6)' }} />
            <div style={{ display:'flex', flexDirection:'column', lineHeight:1.2 }}>
              <span style={{ fontSize:'13px', fontWeight:'500' }}>
                {isCitizen ? `市民 ${displayName}` : displayName}
              </span>
              {!isCitizen && department && (
                <span style={{ fontSize:'11px', color:'rgba(197,165,90,0.8)' }}>{department}</span>
              )}
              {isCitizen && (
                <span style={{ fontSize:'11px', color:'rgba(197,165,90,0.8)' }}>已实名认证</span>
              )}
            </div>
          </div>

          {/* 退出 */}
          <button
            onClick={handleLogout}
            title="退出登录"
            style={{
              background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.2)',
              color:'rgba(255,255,255,0.8)', borderRadius:'2px', padding:'4px 12px',
              fontSize:'12px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:'5px',
              transition:'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
          >
            <FaSignOutAlt size={11} />退出
          </button>
        </div>
      </div>
    </nav>
  );
}
