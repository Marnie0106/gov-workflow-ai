import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── 角色列表 ── */
const ROLES = [
  { label: '市民',           key: 'citizen',       path: '/citizen',       icon: '👤' },
  { label: '工单处置人员',   key: 'dispatcher',    path: '/dispatcher',    icon: '🔧' },
  { label: '业务流程管理员', key: 'process-admin', path: '/process-admin', icon: '⚙️' },
  { label: '领导',           key: 'leader',        path: '/leader',        icon: '📊' },
];

/* 角色 → 显示名称映射 */
const ROLE_NAME_MAP = {
  citizen:       '市民',
  dispatcher:    '处置员',
  'process-admin': '管理员',
  leader:        '领导',
};

export default function LoginPage() {
  const navigate = useNavigate();

  /* 选择角色直接进入，无需验证 */
  const handleRoleSelect = (role) => {
    sessionStorage.setItem('roleKey', role.key);
    sessionStorage.setItem('displayName', ROLE_NAME_MAP[role.key] || role.label);
    navigate(role.path, { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(180deg, #0D4387 0%, #1658AF 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* 左上角系统名 */}
      <div
        style={{
          position: 'absolute',
          top: '28px',
          left: '36px',
          color: 'rgba(180, 210, 255, 0.9)',
          fontSize: '15px',
          fontWeight: '500',
          letterSpacing: '1px',
          userSelect: 'none',
        }}
      >
        市容巡查一体化系统
      </div>

      {/* 主体内容 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px 60px',
        }}
      >
        {/* 徽标 */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            marginBottom: '32px',
          }}
        >
          🏛️
        </div>

        {/* 标题 */}
        <h1
          style={{
            color: '#fff',
            fontSize: '36px',
            fontWeight: '800',
            textAlign: 'center',
            margin: '0 0 12px',
            letterSpacing: '1.5px',
            textShadow: '0 2px 12px rgba(0,0,0,0.25)',
          }}
        >
          您好，请选择登录身份
        </h1>
        <p
          style={{
            color: 'rgba(180,210,255,0.85)',
            fontSize: '15px',
            marginBottom: '56px',
            letterSpacing: '0.5px',
          }}
        >
          请根据您的工作职责选择对应身份进入系统
        </p>

        {/* 四个角色按钮 */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {ROLES.map((role) => (
            <RoleButton key={role.path} role={role} onClick={() => handleRoleSelect(role)} />
          ))}
        </div>
      </div>

      {/* 底部 */}
      <div
        style={{
          textAlign: 'center',
          color: 'rgba(180,210,255,0.5)',
          fontSize: '12px',
          padding: '20px',
        }}
      >
        © 2026 市容管理局数字化平台
      </div>
    </div>
  );
}

/* ── 角色按钮 ── */
function RoleButton({ role, onClick }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '200px',
        height: '60px',
        borderRadius: '12px',
        border: '1.5px solid rgba(255,255,255,0.35)',
        background: hovered
          ? 'rgba(255,255,255,0.25)'
          : 'rgba(100,160,255,0.18)',
        color: '#fff',
        fontSize: '17px',
        fontWeight: '600',
        cursor: 'pointer',
        letterSpacing: '1px',
        transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.2)'
          : '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span style={{ fontSize: '20px' }}>{role.icon}</span>
      {role.label}
    </button>
  );
}
