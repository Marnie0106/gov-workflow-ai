import React, { useState } from 'react';
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

function getRoleName(pathname) {
  for (const [path, name] of Object.entries(ROLE_MAP)) {
    if (pathname.startsWith(path)) return name;
  }
  return '访客';
}

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const roleName = getRoleName(location.pathname);
  const displayName = sessionStorage.getItem('displayName') || roleName;
  const roleKey = sessionStorage.getItem('roleKey') || '';

  // 获取未读消息数
  const fetchUnread = async () => {
    try {
      let role = 'citizen';
      if (roleKey === 'dispatcher') role = 'dispatcher';
      else if (roleKey === 'process_admin') role = 'admin';
      const data = await getUnreadCount(role);
      setUnread(data?.count || 0);
    } catch {}
  };

  React.useEffect(() => {
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000); // 每30秒刷新
    return () => clearInterval(timer);
  }, [roleKey]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '64px',
        backgroundColor: '#0A2B4E',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* 左侧：系统名 */}
        <div
          onClick={() => navigate('/login')}
          style={{
            color: '#fff',
            fontSize: '19px',
            fontWeight: '700',
            cursor: 'pointer',
            letterSpacing: '1px',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🏛️</span>
          市容巡查一体化系统
        </div>

        {/* 右侧：通知 + 当前角色 + 退出 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* 通知图标 */}
          <button
            title="通知"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.75)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <FaBell size={19} />
            {unread > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#F56C6C',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0 5px',
                  fontSize: '10px',
                  fontWeight: '700',
                  minWidth: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #0A2B4E',
                }}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {/* 分隔线 */}
          <div
            style={{
              width: '1px',
              height: '20px',
              background: 'rgba(255,255,255,0.2)',
            }}
          />

          {/* 角色名 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fff',
            }}
          >
            <FaUserCircle size={22} style={{ color: 'rgba(255,255,255,0.7)' }} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>
              {displayName}
            </span>
          </div>

          {/* 退出按钮 */}
          <button
            onClick={handleLogout}
            title="退出登录"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'rgba(255,255,255,0.85)',
              borderRadius: '20px',
              padding: '5px 14px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
            }
          >
            <FaSignOutAlt size={12} />
            退出
          </button>
        </div>
      </div>
    </nav>
  );
}
