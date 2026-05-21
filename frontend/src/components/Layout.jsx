import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import Banner from './Banner';

export default function Layout() {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#F5F7FA',
        overflowX: 'hidden',
      }}
    >
      {/* 固定顶部导航 */}
      <NavBar />

      {/* Banner：高 400px，内含大标题 + 搜索框 */}
      <Banner />

      {/* 主内容安全区 */}
      <main
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px 80px',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
