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
        backgroundColor: '#F0F2F5',
        overflowX: 'hidden',
      }}
    >
      {/* 固定顶部导航 */}
      <NavBar />

      {/* Banner */}
      <Banner />

      {/* 主内容安全区 */}
      <main
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px 24px 60px',
        }}
      >
        <Outlet />
      </main>

      {/* 页脚 */}
      <footer style={{
        textAlign:'center', padding:'20px 24px',
        color:'#8C9AAF', fontSize:'12px',
        borderTop:'1px solid #E8ECF0',
        background:'#fff',
      }}>
        © 2026 市容管理局 · 数字化政务平台 · 为民服务
      </footer>
    </div>
  );
}
