import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import NavBar from './NavBar';
import Banner from './Banner';
import AIAssistant from './AIAssistant';

// 仅市民页面显示Banner，其他工作台页面不需要340px的大图占位
function shouldShowBanner(pathname) {
  return pathname.startsWith('/citizen');
}

// 路由守卫：未登录跳转到 /login，角色与路径不匹配自动跳转到对应工作台
function RequireAuth({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = sessionStorage.getItem('session');
  const roleKey = sessionStorage.getItem('roleKey');

  React.useEffect(() => {
    if (!session || !roleKey) {
      navigate('/login', { replace: true });
      return;
    }
    // 角色与路径映射
    const rolePathMap = {
      citizen: '/citizen',
      dispatcher: '/dispatcher',
      process_admin: '/process-admin',
      leader: '/leader',
    };
    const expectedPath = rolePathMap[roleKey];
    // 如果角色对应的路径存在，且当前路径不是以期望路径开头，则自动跳转
    // 但允许根路径和 login 通过（不会出现在这里，但做防御）
    if (expectedPath && location.pathname !== '/' && !location.pathname.startsWith(expectedPath)) {
      navigate(expectedPath, { replace: true });
    }
  }, [session, roleKey, location.pathname, navigate]);

  // 渲染前检查：未登录直接返回 null（useEffect 会跳转）
  if (!session || !roleKey) return null;
  return children;
}

export default function Layout() {
  const location = useLocation();
  const showBanner = shouldShowBanner(location.pathname);
  return (
    <RequireAuth>
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'var(--gov-bg, #F0F4F9)',
        overflowX: 'hidden',
      }}
    >
      {/* 固定顶部导航 */}
      <NavBar />

      {/* Banner — 仅市民页面显示 */}
      {showBanner && <Banner />}

      {/* 主内容安全区 */}
      <main
        style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(16px, 3vw, 32px) clamp(12px, 3vw, 32px) 80px',
        }}
      >
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <Outlet />
        </div>
      </main>

      {/* Q 版 AI 助手浮窗 */}
      <AIAssistant />

      {/* 页脚 */}
      <footer style={{
        textAlign:'center', padding:'20px 32px',
        color:'#94A3B8', fontSize:'12px',
        borderTop:'1px solid #E2E8F0',
        background:'#fff',
        lineHeight:'1.8',
      }}>
        © 2026 市容管理局 · 数字化政务平台 · AI 驱动城市治理
      </footer>
    </div>
    </RequireAuth>
  );
}
