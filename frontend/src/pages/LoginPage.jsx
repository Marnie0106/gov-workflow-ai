import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

/* 政务角色 */
const GOV_ROLES = [
  { label: '工单处置人员', key: 'dispatcher',    path: '/dispatcher',    roleKey: 'dispatcher' },
  { label: '业务流程管理员', key: 'process-admin', path: '/process-admin', roleKey: 'process_admin' },
  { label: '领导',         key: 'leader',        path: '/leader',        roleKey: 'leader' },
];

function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone;
  return `***${phone.slice(-4)}`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [selectedGovRole, setSelectedGovRole] = useState(null);

  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenCode, setCitizenCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [smsError, setSmsError] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [needRegister, setNeedRegister] = useState(false);
  const [realName, setRealName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  const [empId, setEmpId] = useState('');
  const [govLoading, setGovLoading] = useState(false);
  const [govError, setGovError] = useState('');

  const [showUserManager, setShowUserManager] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username:'', employee_id:'', role_key:'dispatcher', display_name:'', department:'' });
  const [importText, setImportText] = useState('');
  const [userMsg, setUserMsg] = useState('');

  const startCountdown = () => {
    let n = 60; setCountdown(n);
    const t = setInterval(() => { n -= 1; setCountdown(n); if (n <= 0) clearInterval(t); }, 1000);
  };

  const handleSendCode = async () => {
    if (!/^\d{11}$/.test(citizenPhone)) { setSmsError('请输入11位有效手机号'); return; }
    setSending(true); setSmsError(''); setSmsCode('');
    try { const d = await api.post('/sms/send', { phone: citizenPhone }); setSmsCode(d.data.code); setCodeSent(true); startCountdown(); }
    catch { setSmsError('发送失败'); }
    finally { setSending(false); }
  };

  const handleCitizenLogin = async () => {
    if (!citizenCode.trim()) { setSmsError('请输入验证码'); return; }
    setVerifying(true); setSmsError('');
    try {
      const resp = await api.post('/citizen/login', { phone: citizenPhone, code: citizenCode });
      if (resp.data.need_register) { setNeedRegister(true); return; }
      finishCitizenLogin(resp.data);
    } catch (err) { setSmsError(err?.response?.data?.error || '验证码错误'); }
    finally { setVerifying(false); }
  };

  const handleRegister = async () => {
    if (!realName.trim() || realName.length < 2) { setRegError('请填写真实姓名'); return; }
    if (!/^\d{15,18}$/.test(idNumber.trim())) { setRegError('身份证号格式不正确'); return; }
    setRegistering(true); setRegError('');
    try { const resp = await api.post('/citizen/register', { phone: citizenPhone, realName: realName.trim(), idNumber: idNumber.trim() }); finishCitizenLogin(resp.data); }
    catch (err) { setRegError(err?.response?.data?.error || '实名认证失败'); }
    finally { setRegistering(false); }
  };

  const finishCitizenLogin = (data) => {
    let dn = data.citizen?.realName || data.citizen?.nickname || maskPhone(citizenPhone);
    if (!data.citizen?.realName && data.citizen?.nickname && data.citizen.nickname !== '演示市民') dn = `${data.citizen.nickname.charAt(0)}**${citizenPhone.slice(-4)}`;
    if (data.citizen?.realName) dn = data.citizen.realName;
    sessionStorage.setItem('roleKey', 'citizen');
    sessionStorage.setItem('displayName', dn);
    sessionStorage.setItem('citizenPhone', citizenPhone);
    sessionStorage.setItem('userId', String(data.citizen?.id || '1'));
    if (data.session?.sessionId) sessionStorage.setItem('session', JSON.stringify({ sessionId: data.session.sessionId }));
    if (data.session?.id) sessionStorage.setItem('session', JSON.stringify({ sessionId: data.session.id }));
    navigate('/citizen', { replace: true });
  };

  const handleGovLogin = async () => {
    if (!empId.trim()) { setGovError('请输入工号'); return; }
    if (!selectedGovRole) { setGovError('请先选择身份'); return; }
    setGovLoading(true); setGovError('');
    try {
      const resp = await api.post('/login', { employee_id: empId.trim() });
      const { user, session } = resp.data;
      const m = { dispatcher:'/dispatcher', process_admin:'/process-admin', leader:'/leader' };
      sessionStorage.setItem('roleKey', user.role);
      sessionStorage.setItem('displayName', user.displayName || empId);
      sessionStorage.setItem('employeeId', user.employeeId || empId);
      sessionStorage.setItem('department', user.department || '');
      if (session?.sessionId) sessionStorage.setItem('session', JSON.stringify({ sessionId: session.sessionId }));
      if (session?.id) sessionStorage.setItem('session', JSON.stringify({ sessionId: session.id }));
      navigate(m[user.role] || selectedGovRole.path, { replace: true });
    } catch (err) {
      setGovError(err?.response?.status === 404 ? `工号 "${empId}" 不存在` : err?.response?.data?.error || '登录失败');
    } finally { setGovLoading(false); }
  };

  const loadUsers = async () => {
    try { const r = await api.get('/users'); setUsers(r.data); } catch { setUserMsg('加载失败'); }
  };
  const handleAddUser = async () => {
    if (!newUser.employee_id) { setUserMsg('工号不能为空'); return; }
    try { await api.post('/users', { ...newUser, username: newUser.username || newUser.employee_id }); setNewUser({ username:'', employee_id:'', role_key:'dispatcher', display_name:'', department:'' }); setUserMsg('添加成功'); loadUsers(); }
    catch (e) { setUserMsg(e?.response?.data?.error || '添加失败'); }
  };
  const handleImport = async () => {
    try { const p = JSON.parse(importText); if (!Array.isArray(p)) { setUserMsg('请输入JSON数组'); return; } const r = await api.post('/users/import', { users: p }); setUserMsg(`导入完成：成功 ${r.data.imported} 人，失败 ${r.data.errors.length} 人`); setImportText(''); loadUsers(); }
    catch (e) { if (e instanceof SyntaxError) setUserMsg('JSON格式错误'); else setUserMsg(e?.response?.data?.error || '导入失败'); }
  };
  const handleDeleteUser = async (id) => {
    if (!window.confirm('确定要删除该人员吗？')) return;
    try { await api.delete(`/users/${id}`); setUserMsg('删除成功'); loadUsers(); } catch { setUserMsg('删除失败'); }
  };

  const handleBack = () => {
    setMode(null); setSelectedGovRole(null); setNeedRegister(false);
    setCitizenPhone(''); setCitizenCode(''); setCodeSent(false); setSmsError('');
    setEmpId(''); setGovError(''); setRealName(''); setIdNumber(''); setRegError('');
    setShowUserManager(false);
  };

  const title = showUserManager ? '政务人员管理' : needRegister ? '市民实名认证' : mode === 'citizen' ? '市民登录' : mode === 'gov' ? '政务人员登录' : '用户登录';
  const subtitle = showUserManager ? '手动添加或批量导入政务人员账号' : needRegister ? '首次使用需完成实名认证，请填写真实信息' : mode === 'citizen' ? '使用手机号验证身份后进入市民工作台' : mode === 'gov' ? '选择职责身份并输入工号登录系统' : '请选择您的身份类型进入市容巡查一体化系统';

  // ====== 蓝色政务配色（腾讯云政务规范） ======
  const BLUE       = '#3858E6';   // 主色
  const BLUE_DARK  = '#1E3BA8';   // 深蓝
  const BLUE_LIGHT = '#2D6CF0';   // 邻近色
  const ACCENT     = '#00C1DE';   // 对比色
  const GOLD       = '#C5A55A';   // 金色
  const TEXT       = '#1A1A2E';
  const TEXT_LIGHT = '#4A5A6A';
  const TEXT_MUTED = '#8C9AAF';
  const BORDER     = '#D9E2EC';
  const BG         = '#F4F7FB';

  return (
    <div style={{
      width:'100%', minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:`linear-gradient(160deg, #0B1E3D 0%, #112A4F 25%, #1A3A6C 50%, #1E3BA8 85%, #2D6CF0 100%)`,
      position:'relative', overflow:'hidden',
    }}>
      {/* 背景光晕装饰 */}
      <div style={{ position:'absolute', top:'-30%', left:'-10%', width:'600px', height:'600px',
        background:'radial-gradient(circle, rgba(56,88,230,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-20%', right:'-5%', width:'500px', height:'500px',
        background:'radial-gradient(circle, rgba(0,193,222,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'40%', right:'15%', width:'300px', height:'300px',
        background:'radial-gradient(circle, rgba(197,165,90,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />

      {/* ===== 系统标题（顶部） ===== */}
      <div style={{ textAlign:'center', marginBottom:'40px', position:'relative', zIndex:1 }}>
        <h1 style={{
          color:'#FFFFFF', fontSize:'34px', fontWeight:'700',
          letterSpacing:'16px', margin:'0 0 12px',
          textShadow:'0 3px 24px rgba(0,0,0,0.40)',
        }}>
          欢迎使用
        </h1>
        <h1 style={{
          color:'#FFFFFF', fontSize:'34px', fontWeight:'700',
          letterSpacing:'12px', margin:'0',
          textShadow:'0 3px 24px rgba(0,0,0,0.40)',
        }}>
          市容一体化系统
        </h1>
        <div style={{
          width:'70px', height:'3px',
          background:`linear-gradient(90deg, transparent 0%, #C5A55A 50%, transparent 100%)`,
          margin:'18px auto 0',
        }} />
      </div>

      {/* ===== 登录功能区 — 居中白色卡片 ===== */}
      <div style={{
        width:'100%', maxWidth:'460px',
        background:'#FFFFFF',
        borderRadius:'8px',
        padding:'36px 40px 40px',
        boxShadow:'0 8px 40px rgba(11,30,61,0.30), 0 2px 8px rgba(11,30,61,0.15)',
        position:'relative', zIndex:1,
      }}>
        {/* 选择身份时的标题 */}
        {!mode && !showUserManager && !needRegister && (
          <>
            <h2 style={{
              color:TEXT, fontSize:'22px', fontWeight:'600',
              letterSpacing:'6px', margin:'0 0 8px', textAlign:'center',
            }}>
              用户登录
            </h2>
            <div style={{ width:'48px', height:'2px', background:`linear-gradient(90deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, margin:'0 auto 14px', borderRadius:'1px' }} />
            <p style={{
              color:TEXT_LIGHT, fontSize:'14px', letterSpacing:'2px',
              marginBottom:'32px', textAlign:'center',
            }}>
              请选择您的身份类型进入市容巡查一体化系统
            </p>
          </>
        )}
        {/* 各模式标题 */}
        {mode && !showUserManager && !needRegister && (
          <>
            <h2 style={{
              color:TEXT, fontSize:'22px', fontWeight:'600',
              letterSpacing:'6px', margin:'0 0 8px', textAlign:'center',
            }}>
              {title}
            </h2>
            <div style={{ width:'48px', height:'2px', background:`linear-gradient(90deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, margin:'0 auto 14px', borderRadius:'1px' }} />
            <p style={{
              color:TEXT_LIGHT, fontSize:'13px', letterSpacing:'2px',
              marginBottom:'28px', textAlign:'center',
            }}>
              {subtitle}
            </p>
          </>
        )}
        {/* 实名认证 / 人员管理 标题 */}
        {needRegister && (
          <>
            <h2 style={{
              color:TEXT, fontSize:'22px', fontWeight:'600',
              letterSpacing:'6px', margin:'0 0 8px', textAlign:'center',
            }}>
              市民实名认证
            </h2>
            <div style={{ width:'48px', height:'2px', background:`linear-gradient(90deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, margin:'0 auto 14px', borderRadius:'1px' }} />
            <p style={{
              color:TEXT_LIGHT, fontSize:'13px', letterSpacing:'2px',
              marginBottom:'28px', textAlign:'center',
            }}>
              首次使用需完成实名认证，请填写真实信息
            </p>
          </>
        )}
        {showUserManager && (
          <>
            <h2 style={{
              color:TEXT, fontSize:'22px', fontWeight:'600',
              letterSpacing:'6px', margin:'0 0 8px', textAlign:'center',
            }}>
              政务人员管理
            </h2>
            <div style={{ width:'48px', height:'2px', background:`linear-gradient(90deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, margin:'0 auto 14px', borderRadius:'1px' }} />
            <p style={{
              color:TEXT_LIGHT, fontSize:'13px', letterSpacing:'2px',
              marginBottom:'28px', textAlign:'center',
            }}>
              手动添加或批量导入政务人员账号
            </p>
          </>
        )}

        {/* ===== 人员管理 ===== */}
        {showUserManager && (
          <div style={{ background:'#FFFFFF', padding:'28px', width:'100%', maxWidth:'600px', border:`1px solid ${BORDER}`, boxShadow:'0 2px 12px rgba(30,59,168,0.06)' }}>
            <div style={{ marginBottom:'20px', padding:'16px', background:BG }}>
              <h3 style={{ color:TEXT, fontSize:'14px', fontWeight:'600', margin:'0 0 10px' }}>手动添加人员</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <input placeholder="工号*" value={newUser.employee_id} onChange={e=>setNewUser({...newUser,employee_id:e.target.value})} style={inputS}/>
                <input placeholder="姓名" value={newUser.display_name} onChange={e=>setNewUser({...newUser,display_name:e.target.value})} style={inputS}/>
                <select value={newUser.role_key} onChange={e=>setNewUser({...newUser,role_key:e.target.value})} style={{...inputS,color:TEXT}}>
                  <option value="dispatcher">处置人员</option>
                  <option value="process_admin">管理员</option>
                  <option value="leader">领导</option>
                </select>
                <input placeholder="部门" value={newUser.department} onChange={e=>setNewUser({...newUser,department:e.target.value})} style={inputS}/>
              </div>
              <button onClick={handleAddUser} style={{...btnBlue,width:'100%',marginTop:'12px'}}>添加</button>
            </div>
            <div style={{ marginBottom:'20px', padding:'16px', background:BG }}>
              <h3 style={{ color:TEXT, fontSize:'14px', fontWeight:'600', margin:'0 0 8px' }}>批量导入（JSON）</h3>
              <textarea placeholder='[{"employee_id":"D003","display_name":"张三","role_key":"dispatcher","department":"城管"}]'
                value={importText} onChange={e=>setImportText(e.target.value)} rows={3}
                style={{...inputS,width:'100%',resize:'vertical',fontFamily:'monospace',fontSize:'12px'}}/>
              <button onClick={handleImport} style={{...btnBlue,width:'100%',marginTop:'8px'}}>导入</button>
            </div>
            <div>
              <h3 style={{ color:TEXT, fontSize:'14px', fontWeight:'600', margin:'0 0 8px' }}>现有人员（{users.length}人）</h3>
              <div style={{ maxHeight:'180px', overflowY:'auto' }}>
                <table style={{ width:'100%', fontSize:'12px', color:TEXT_LIGHT, borderCollapse:'collapse' }}>
                  <thead><tr style={{ borderBottom:`2px solid ${BORDER}` }}>
                    <th style={thS}>工号</th><th style={thS}>姓名</th><th style={thS}>角色</th><th style={thS}>部门</th><th style={thS}>操作</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom:`1px solid ${BORDER}` }}>
                        <td style={tdS}>{u.employeeId}</td><td style={tdS}>{u.displayName}</td><td style={tdS}>{u.roleName}</td><td style={tdS}>{u.department}</td>
                        <td style={tdS}><button onClick={()=>handleDeleteUser(u.id)} style={{ background:'none',border:'none',color:BLUE,cursor:'pointer',fontSize:'12px' }}>删除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {userMsg && <div style={{ color: userMsg.includes('失败')||userMsg.includes('错误')?'#c0392b':'#1e8449', fontSize:'12px', marginTop:'12px' }}>{userMsg}</div>}
            <div style={{ textAlign:'center', marginTop:'16px' }}>
              <button onClick={()=>{setShowUserManager(false);setUserMsg('');}} style={linkBtn}>← 返回登录</button>
            </div>
          </div>
        )}

        {/* ===== 选择身份 ===== */}
        {!mode && !showUserManager && (
          <div style={{ display:'flex', gap:'16px', justifyContent:'center' }}>
            <RoleCard label="市民登录" desc="提交意见 · 查询办理进度" onClick={()=>setMode('citizen')} />
            <RoleCard label="政务人员登录" desc="工单处置 · 流程管理 · 领导看板" onClick={()=>setMode('gov')} />
          </div>
        )}

        {/* ===== 市民实名认证 ===== */}
        {needRegister && (
          <div style={cardS}>
            <label style={labelS}>真实姓名</label>
            <input value={realName} onChange={e=>{setRealName(e.target.value);setRegError('');}} placeholder="请输入真实姓名" style={inputS} onKeyDown={e=>{if(e.key==='Enter')handleRegister();}}/>
            <label style={{...labelS,marginTop:'14px'}}>身份证号</label>
            <input value={idNumber} onChange={e=>{setIdNumber(e.target.value);setRegError('');}} placeholder="请输入身份证号（15或18位）" maxLength={18} style={inputS} onKeyDown={e=>{if(e.key==='Enter')handleRegister();}}/>
            {regError && <div style={{ color:'#c0392b', fontSize:'13px', marginTop:'8px' }}>{regError}</div>}
            <button onClick={handleRegister} disabled={registering||!realName||!idNumber} style={{...btnBlue,width:'100%',marginTop:'18px',opacity:(registering||!realName||!idNumber)?0.5:1}}>
              {registering ? '认证中…' : '完成实名认证'}
            </button>
            <div style={{ textAlign:'center', marginTop:'14px' }}><button onClick={handleBack} style={linkBtn}>← 返回</button></div>
          </div>
        )}

        {/* ===== 市民手机验证码登录 ===== */}
        {mode === 'citizen' && !needRegister && (
          <div style={cardS}>
            <label style={labelS}>手机号</label>
            <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
              <input value={citizenPhone} onChange={e=>{setCitizenPhone(e.target.value);setSmsError('');}} placeholder="请输入11位手机号" maxLength={11} style={inputS} onKeyDown={e=>{if(e.key==='Enter'&&!codeSent)handleSendCode();}}/>
              <button onClick={handleSendCode} disabled={sending||countdown>0}
                style={{ flexShrink:0, padding:'10px 14px', border:`1px solid ${BORDER}`, borderRadius:'3px', background:countdown>0?BG:'#FFFFFF', color:countdown>0?TEXT_MUTED:BLUE, fontSize:'13px', fontWeight:'600', cursor:countdown>0?'not-allowed':'pointer', whiteSpace:'nowrap' }}>
                {sending?'发送中…':countdown>0?`${countdown}s`:'获取验证码'}
              </button>
            </div>
            <label style={labelS}>验证码</label>
            <input value={citizenCode} onChange={e=>{setCitizenCode(e.target.value);setSmsError('');}} placeholder={codeSent?'请输入6位验证码':'请先获取验证码'} maxLength={6} style={{...inputS,marginBottom:'8px'}} onKeyDown={e=>{if(e.key==='Enter')handleCitizenLogin();}}/>
            {smsError && <div style={{ color:'#c0392b', fontSize:'13px', marginBottom:'8px' }}>{smsError}</div>}
            {!smsError && codeSent && (
              <div style={{ color:BLUE, fontSize:'13px', marginBottom:'8px', background:'#EEF3FD', padding:'8px 12px', border:'1px solid #D0DEF7' }}>
                模拟验证码：<strong style={{ fontSize:'16px', letterSpacing:'3px' }}>{smsCode}</strong>
              </div>
            )}
            <button onClick={handleCitizenLogin} disabled={verifying||!citizenPhone||!citizenCode} style={{...btnBlue,width:'100%',marginTop:'6px',opacity:(verifying||!citizenPhone||!citizenCode)?0.5:1}}>
              {verifying?'验证中…':'验证并进入'}
            </button>
            <div style={{ textAlign:'center', marginTop:'14px' }}><button onClick={handleBack} style={linkBtn}>← 返回选择身份</button></div>
          </div>
        )}

        {/* ===== 政务人员登录 ===== */}
        {mode === 'gov' && !showUserManager && (
          <div style={{...cardS,maxWidth:'440px'}}>
            <label style={labelS}>选择职责身份</label>
            <div style={{ display:'flex', gap:'8px', marginBottom:'18px' }}>
              {GOV_ROLES.map(r=>(
                <button key={r.key} onClick={()=>{setSelectedGovRole(r);setGovError('');}}
                  style={{ flex:1, padding:'9px 6px', borderRadius:'3px',
                    border:selectedGovRole?.key===r.key?`2px solid ${BLUE}`:`1px solid ${BORDER}`,
                    background:selectedGovRole?.key===r.key?'#EEF3FD':'#FFFFFF',
                    color:TEXT, fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>{r.label}
                </button>
              ))}
            </div>
            <label style={labelS}>工号</label>
            <input value={empId} onChange={e=>{setEmpId(e.target.value);setGovError('');}} placeholder="请输入工号（如 D001）" style={{...inputS,marginBottom:'8px'}} onKeyDown={e=>{if(e.key==='Enter')handleGovLogin();}}/>
            {govError && <div style={{ color:'#c0392b', fontSize:'13px', marginBottom:'8px' }}>{govError}</div>}
            <div style={{ background:BG, padding:'10px 12px', fontSize:'12px', color:TEXT_LIGHT, marginBottom:'14px', lineHeight:'1.7', borderRadius:'3px' }}>
              <strong style={{ color:TEXT }}>演示工号</strong>&nbsp;&nbsp;处置员：D001、D002 &nbsp;管理员：A001 &nbsp;领导：L001
            </div>
            <button onClick={handleGovLogin} disabled={govLoading||!empId.trim()} style={{...btnBlue,width:'100%',opacity:(govLoading||!empId.trim())?0.5:1}}>
              {govLoading?'登录中…':'登 录'}
            </button>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'14px' }}>
              <button onClick={handleBack} style={linkBtn}>← 返回选择身份</button>
              <button onClick={()=>{setShowUserManager(true);loadUsers();}} style={{...linkBtn,color:TEXT_LIGHT}}>人员管理</button>
            </div>
          </div>
        )}
      </div>

      {/* ===== 底部版权信息 ===== */}
      <div style={{
        position:'relative', zIndex:1, marginTop:'32px',
        textAlign:'center',
      }}>
        <span style={{ color:'rgba(255,255,255,0.45)', fontSize:'12px', letterSpacing:'3px' }}>
          主办单位：市容管理局 &nbsp;|&nbsp; 技术支持：数字化政务平台 &nbsp;|&nbsp; © 2026
        </span>
      </div>
    </div>
  );
}

/* ===== 角色卡片 ===== */
function RoleCard({ label, desc, onClick }) {
  const [hovered, setHovered] = useState(false);
  const BLUE = '#3858E6';
  return (
    <button onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{
        width:'220px', minHeight:'120px',
        borderRadius:'4px',
        border: hovered ? `2px solid ${BLUE}` : '1px solid #D9E2EC',
        background: hovered ? '#EEF3FD' : '#FFFFFF',
        cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:'12px', padding:'28px 20px',
        transition:'all 0.25s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 8px 28px rgba(56,88,230,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <span style={{ fontSize:'17px', fontWeight:'600', color: hovered ? BLUE : '#1A1A2E', letterSpacing:'3px', transition:'color 0.25s' }}>{label}</span>
      <span style={{ fontSize:'13px', color:'#8C9AAF', letterSpacing:'1px' }}>{desc}</span>
    </button>
  );
}

/* ===== 样式常量 ===== */
const BLUE       = '#3858E6';
const BLUE_DARK  = '#1E3BA8';
const TEXT       = '#1A1A2E';
const TEXT_LIGHT = '#4A5A6A';
const TEXT_MUTED = '#8C9AAF';
const BORDER     = '#D9E2EC';
const BG         = '#F4F7FB';

const cardS = {
  background:'#FFFFFF', padding:'28px 32px',
  width:'100%', maxWidth:'400px',
  border:`1px solid ${BORDER}`,
  boxShadow:'0 2px 12px rgba(30,59,168,0.06)',
};
const labelS = { display:'block', color:TEXT, fontSize:'14px', fontWeight:'600', marginBottom:'6px', letterSpacing:'1px' };
const inputS = { width:'100%', padding:'10px 14px', borderRadius:'3px', border:`1px solid ${BORDER}`, background:'#FFFFFF', color:TEXT, fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:'inherit', transition:'border-color 0.2s' };
const btnBlue = {
  padding:'12px', borderRadius:'3px', border:'none',
  background:`linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
  color:'#fff', fontSize:'15px', fontWeight:'600', cursor:'pointer', letterSpacing:'4px',
  transition:'opacity 0.2s',
};
const linkBtn = { background:'none', border:'none', color:TEXT_LIGHT, fontSize:'13px', cursor:'pointer', textDecoration:'underline' };
const thS = { padding:'6px 8px', textAlign:'left', color:TEXT, fontWeight:'600' };
const tdS = { padding:'6px 8px', color:TEXT_LIGHT };
