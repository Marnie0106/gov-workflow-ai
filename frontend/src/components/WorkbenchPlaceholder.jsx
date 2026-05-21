import React from 'react';

/**
 * 工作台占位卡片
 * @param {string}  title    - 工作台名称
 * @param {string}  subtitle - 功能简介
 * @param {string}  icon     - emoji 图标
 * @param {string}  color    - 主题色（用于圆形背景和强调色）
 */
export default function WorkbenchPlaceholder({ title, subtitle, icon, color }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 24px 80px',
      }}
    >
      {/* 图标圆形徽标 */}
      <div
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          boxShadow: `0 8px 24px ${color}55`,
          marginBottom: '24px',
        }}
      >
        {icon}
      </div>

      {/* 标题 */}
      <h2
        style={{
          fontSize: '26px',
          fontWeight: '700',
          color: '#1a2a3a',
          marginBottom: '10px',
          letterSpacing: '0.5px',
        }}
      >
        {title}
      </h2>

      {/* 副标题 */}
      <p
        style={{
          color: '#909399',
          fontSize: '15px',
          marginBottom: '48px',
        }}
      >
        {subtitle}
      </p>

      {/* 待开发提示卡 */}
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#fff',
          borderRadius: '16px',
          border: `1.5px dashed ${color}66`,
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🚧</div>
        <p
          style={{
            color: color,
            fontWeight: '600',
            fontSize: '16px',
            marginBottom: '8px',
          }}
        >
          {title} — 待开发
        </p>
        <p style={{ color: '#bbb', fontSize: '13px' }}>
          该模块功能正在建设中，敬请期待
        </p>
      </div>

      {/* 快捷功能预告（纯展示） */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '32px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {['数据看板', '工单管理', 'AI 助手', '消息通知'].map((item) => (
          <span
            key={item}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              background: '#f5f7fa',
              border: '1px solid #e4e7ed',
              color: '#909399',
              fontSize: '13px',
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
