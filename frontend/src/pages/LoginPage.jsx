import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendSmsCode, verifySmsCode } from '../api';
import api from '../api';

/* ── 政务角色列表（不含市民）── */
const GOV_ROLES = [
  { label: '工单处置人员', key: 'dispatcher',    path: '/dispatcher',    icon: '🔧', roleKey: 'dispatcher' },
  { label: '业务流程管理员', key: 'process-admin', path: '/process-admin', icon: '⚙️', roleKey: 'process_admin' },
  { label: '领导',         key: 'leader',        path: '/leader',        icon: '📊', roleKey: 'leader' },
];

/* ── 手机号脱敏（显示格式：尾4位，如 ***0987）── */
function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone;
  return `***${phone.slice(-4)}`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null | 'citizen' | 'gov'
  const [selectedGovRole, setSelectedGovRole] = useState(null);

  // 市民登录状态
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenCode, setCitizenCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [smsError, setSmsError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 政务登录状态
  const [empId, setEmpId] = useState('');
  const [govLoading, setGovLoading] = useState(false);
  const [govError, setGovError] = useState('');

  // 倒计时
  const startCountdown = () => {
    let n = 60;
    setCountdown(n);
    const timer = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) clearInterval(timer);
    }, 1000);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!/^\d{11}$/.test(citizenPhone)) {
      setSmsError('请输入11位有效手机号');
      return;
    }
    setSending(true);
    setSmsError('');
    try {
      await sendSmsCode(citizenPhone);
      setCodeSent(true);
      startCountdown();
    } catch (err) {
      setSmsError(err?.response?.data?.error || '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  // 市民验证登录
  const handleCitizenLogin = async () => {
    if (!citizenCode.trim()) { setSmsError('请输入验证码'); return; }
    setVerifying(true);
    setSmsError('');
    try {
      await verifySmsCode(citizenPhone, citizenCode);
      // 验证通过，同步登录后端获取 session
      let displayName = maskPhone(citizenPhone);
      let sessionId = null;
      try {
        const resp = await api.post('/citizen/login', { phone: citizenPhone, code: citizenCode });
        const data = resp.data;
        if (data.citizen?.nickname && data.citizen.nickname !== '演示市民') {
          displayName = `${data.citizen.nickname.charAt(0)}**${citizenPhone.slice(-4)}`;
        }
        if (data.session?.id) sessionId = data.session.id;
      } catch (e) {
        // 如果后端没有该手机号记录，仍允许进入（前端演示模式）
        displayName = maskPhone(citizenPhone);
      }
      sessionStorage.setItem('roleKey', 'citizen');
      sessionStorage.setItem('displayName', displayName);
      sessionStorage.setItem('citizenPhone', citizenPhone);
      if (sessionId) sessionStorage.setItem('session', JSON.stringify({ sessionId }));
      navigate('/citizen', { replace: true });
    } catch (err) {
      setSmsError(err?.response?.data?.error || '验证码错误，请重新输入');
    } finally {
      setVerifying(false);
    }
  };

  // 政务工号登录
  const handleGovLogin = async () => {
    if (!empId.trim()) { setGovError('请输入工号'); return; }
    if (!selectedGovRole) { setGovError('请先选择身份'); return; }
    setGovLoading(true);
    setGovError('');
    try {
      const resp = await api.post('/login', { employee_id: empId.trim() });
      const { user, session } = resp.data;
      // 验证角色是否匹配（可选，演示可宽松）
      const rolePathMap = {
        dispatcher:    '/dispatcher',
        process_admin: '/process-admin',
        leader:        '/leader',
      };
      const path = rolePathMap[user.role] || selectedGovRole.path;
      sessionStorage.setItem('roleKey', user.role);
      sessionStorage.setItem('displayName', user.displayName || empId);
      sessionStorage.setItem('employeeId', user.employeeId || empId);
      sessionStorage.setItem('department', user.department || '');
      if (session?.id) sessionStorage.setItem('session', JSON.stringify({ sessionId: session.id }));
      navigate(path, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error;
      if (err?.response?.status === 404) {
        setGovError(`工号 "${empId}" 不存在，请核对后重试`);
      } else {
        setGovError(msg || '登录失败，请稍后重试');
      }
    } finally {
      setGovLoading(false);
    }
  };

  const handleBack = () => {
    setMode(null);
    setSelectedGovRole(null);
    setCitizenPhone('');
    setCitizenCode('');
    setCodeSent(false);
    setSmsError('');
    setEmpId('');
    setGovError('');
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'linear-gradient(180deg, #0D4387 0%, #1658AF 100%)',
      display: 'flex', flexDirection: 'column', overflowX: 'hidden',
    }}>
      {/* 左上角系统名 */}
      <div style={{
        position: 'absolute', top: '28px', left: '36px',
        color: 'rgba(180, 210, 255, 0.9)', fontSize: '15px', fontWeight: '500',
        letterSpacing: '1px', userSelect: 'none',
      }}>
        市容巡查一体化系统
      </div>

      {/* 主体 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '80px 24px 60px',
      }}>
        {/* 徽标 */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '30px', marginBottom: '28px',
        }}>🏛️</div>

        {/* 标题 */}
        <h1 style={{
          color: '#fff', fontSize: '34px', fontWeight: '800',
          textAlign: 'center', margin: '0 0 10px', letterSpacing: '1.5px',
          textShadow: '0 2px 12px rgba(0,0,0,0.25)',
        }}>
          {mode === 'citizen' ? '市民实名认证' : mode === 'gov' ? '政务人员登录' : '您好，请选择登录身份'}
        </h1>
        <p style={{ color: 'rgba(180,210,255,0.85)', fontSize: '14px', marginBottom: '44px' }}>
          {mode === 'citizen'
            ? '请用手机号完成身份验证后进入市民工作台'
            : mode === 'gov'
            ? '请选择您的职责身份并输入工号登录'
            : '请根据您的工作职责选择对应身份进入系统'}
        </p>

        {/* ── 默认：选择身份 ── */}
        {!mode && (
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* 市民 */}
            <RoleCard
              icon="👤"
              label="市民"
              desc="提交意见 · 查询进度"
              color="#27AE60"
              onClick={() => setMode('citizen')}
            />
            {/* 政务人员（合并展示） */}
            <RoleCard
              icon="🏢"
              label="政务人员"
              desc="处置 / 管理 / 领导"
              color="#1658AF"
              onClick={() => setMode('gov')}
            />
          </div>
        )}

        {/* ── 市民：手机+验证码 ── */}
        {mode === 'citizen' && (
          <div style={{
            background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
            borderRadius: '16px', padding: '32px 36px', width: '100%', maxWidth: '420px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            {/* 手机号 */}
            <label style={labelStyle}>手机号</label>
            <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
              <input
                value={citizenPhone}
                onChange={e => { setCitizenPhone(e.target.value); setSmsError(''); }}
                placeholder="请输入11位手机号"
                maxLength={11}
                style={whiteInputStyle}
                onKeyDown={e => { if (e.key === 'Enter' && !codeSent) handleSendCode(); }}
              />
              <button
                onClick={handleSendCode}
                disabled={sending || countdown > 0}
                style={{
                  flexShrink: 0, padding: '10px 14px', borderRadius: '8px', border: 'none',
                  background: countdown > 0 ? 'rgba(255,255,255,0.2)' : '#27AE60',
                  color: '#fff', fontSize: '13px', fontWeight: '600', cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {sending ? '发送中…' : countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>

            {/* 验证码 */}
            <label style={labelStyle}>验证码</label>
            <input
              value={citizenCode}
              onChange={e => { setCitizenCode(e.target.value); setSmsError(''); }}
              placeholder={codeSent ? '请输入6位验证码（演示：123456）' : '请先获取验证码'}
              maxLength={6}
              style={{ ...whiteInputStyle, marginBottom: '6px' }}
              onKeyDown={e => { if (e.key === 'Enter') handleCitizenLogin(); }}
            />
            {smsError && (
              <div style={{ color: '#FFCDD2', fontSize: '12px', marginBottom: '10px' }}>⚠ {smsError}</div>
            )}
            {!smsError && codeSent && (
              <div style={{ color: 'rgba(180,255,180,0.8)', fontSize: '12px', marginBottom: '10px' }}>
                ✓ 验证码已发送（演示系统固定为 123456）
              </div>
            )}

            <button
              onClick={handleCitizenLogin}
              disabled={verifying || !citizenPhone || !citizenCode}
              style={{
                width: '100%', padding: '12px', marginTop: '6px',
                borderRadius: '10px', border: 'none',
                background: (verifying || !citizenPhone || !citizenCode) ? 'rgba(255,255,255,0.2)' : '#27AE60',
                color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              }}
            >
              {verifying ? '验证中…' : '验证并进入'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button onClick={handleBack} style={backBtnStyle}>← 返回选择身份</button>
            </div>
          </div>
        )}

        {/* ── 政务人员：选角色 + 输入工号 ── */}
        {mode === 'gov' && (
          <div style={{
            background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
            borderRadius: '16px', padding: '32px 36px', width: '100%', maxWidth: '480px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            {/* 角色选择 */}
            <label style={labelStyle}>选择职责身份</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {GOV_ROLES.map(r => (
                <button
                  key={r.key}
                  onClick={() => { setSelectedGovRole(r); setGovError(''); }}
                  style={{
                    flex: '1 1 120px', padding: '10px 8px', borderRadius: '10px',
                    border: selectedGovRole?.key === r.key
                      ? '2px solid #fff'
                      : '1.5px solid rgba(255,255,255,0.3)',
                    background: selectedGovRole?.key === r.key
                      ? 'rgba(255,255,255,0.25)'
                      : 'rgba(255,255,255,0.08)',
                    color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <span>{r.icon}</span>{r.label}
                </button>
              ))}
            </div>

            {/* 工号输入 */}
            <label style={labelStyle}>工号</label>
            <input
              value={empId}
              onChange={e => { setEmpId(e.target.value); setGovError(''); }}
              placeholder="请输入工号（如 D001、A001、L001）"
              style={{ ...whiteInputStyle, marginBottom: '6px' }}
              onKeyDown={e => { if (e.key === 'Enter') handleGovLogin(); }}
            />
            {govError && (
              <div style={{ color: '#FFCDD2', fontSize: '12px', marginBottom: '10px' }}>⚠ {govError}</div>
            )}

            {/* 演示提示 */}
            <div style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: '8px',
              padding: '10px 12px', fontSize: '12px', color: 'rgba(220,240,255,0.8)',
              marginBottom: '16px', lineHeight: 1.6,
            }}>
              <strong>演示工号：</strong><br />
              处置员：D001（王强）、D002（赵芳）<br />
              管理员：A001（李明）&nbsp;&nbsp;领导：L001（张华）
            </div>

            <button
              onClick={handleGovLogin}
              disabled={govLoading || !empId.trim()}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                background: (govLoading || !empId.trim()) ? 'rgba(255,255,255,0.2)' : '#1658AF',
                color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              }}
            >
              {govLoading ? '登录中…' : '登录'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button onClick={handleBack} style={backBtnStyle}>← 返回选择身份</button>
            </div>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div style={{
        textAlign: 'center', color: 'rgba(180,210,255,0.5)',
        fontSize: '12px', padding: '20px',
      }}>
        © 2026 市容管理局数字化平台
      </div>
    </div>
  );
}

/* ── 身份卡片 ── */
function RoleCard({ icon, label, desc, color, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '200px', minHeight: '90px', borderRadius: '14px',
        border: `2px solid ${hovered ? '#fff' : 'rgba(255,255,255,0.35)'}`,
        background: hovered ? 'rgba(255,255,255,0.22)' : 'rgba(100,160,255,0.15)',
        color: '#fff', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '6px', padding: '16px',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 10px 28px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span style={{ fontSize: '28px' }}>{icon}</span>
      <span style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '12px', color: 'rgba(200,230,255,0.8)' }}>{desc}</span>
    </button>
  );
}

const labelStyle = {
  display: 'block', color: 'rgba(200,230,255,0.9)',
  fontSize: '13px', fontWeight: '600', marginBottom: '7px',
};

const whiteInputStyle = {
  width: '100%', padding: '10px 13px', borderRadius: '8px',
  border: '1.5px solid rgba(255,255,255,0.3)',
  background: 'rgba(255,255,255,0.15)', color: '#fff',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const backBtnStyle = {
  background: 'none', border: 'none',
  color: 'rgba(200,230,255,0.75)', fontSize: '13px',
  cursor: 'pointer', textDecoration: 'underline',
};
