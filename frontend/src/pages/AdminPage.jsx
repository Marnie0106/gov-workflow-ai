import React from 'react';
import { FaCog } from 'react-icons/fa';

export default function AdminPage() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '80px', height: '80px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #E6A23C, #c07d10)',
        marginBottom: '24px',
      }}>
        <FaCog size={36} color="#fff" />
      </div>
      <h2 style={{ fontSize: '28px', color: '#0A2B4E', marginBottom: '12px' }}>业务流程管理员工作台</h2>
      <p style={{ color: '#909399', fontSize: '15px' }}>当前角色：业务流程管理员</p>
      <div style={{
        marginTop: '40px',
        padding: '24px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        color: '#c0c4cc',
        fontSize: '14px',
      }}>
        功能开发中，敬请期待…
      </div>
    </div>
  );
}
