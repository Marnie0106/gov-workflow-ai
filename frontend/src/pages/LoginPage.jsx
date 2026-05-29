import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendSmsCode, verifySmsCode } from '../api';
import api from '../api';

/* 政务角色列表 */
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

  // 市民登录状态
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenCode, setCitizenCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [smsError, setSmsError] = useState('');
  const [smsCode, setSmsCode] = useState(''); // 模拟短信收到的验证码
  const [countdown, setCountdown] = useState(0);
  
  // 实名认证状态
  const [needRegister, setNeedRegister] = useState(false);
  const [realName, setRealName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  // 政务登录状态
  const [empId, setEmpId] = useState('');
  const [govLoading, setGovLoading] = useState(false);
  const [govError, setGovError] = useState('');

  // 人员管理状态
  const [showUserManager, setShowUserManager] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username:'', employee_id:'', role_key:'dispatcher', display_name:'', department:'' });
  const [importText, setImportText] = useState('');
  const [userMsg, setUserMsg] = useState('');

  const startCountdown = () => {
    let n = 60;
    setCountdown(n);
    const timer = setInterval(() => { n -= 1; setCountdown(n); if (n <= 0) clearInterval(timer); }, 1000);
  };

  // ─── 市民：发送验证码 ───
  const handleSendCode = async () => {
    if (!/^\d{11}$/.test(citizenPhone)) { setSmsError('请输入11位有效手机号'); return; }
    setSending(true); setSmsError(''); setSmsCode('');
    try {
      const data = await sendSmsCode(citizenPhone);
      setSmsCode(data.code); setCodeSent(true); startCountdown();
    } catch (err) { setSmsError(err?.response?.data?.error || '发送失败'); }
    finally { setSending(false); }
  };
  // ─── 市民：验证码登录 → 判断是否需要实名 ───
  const handleCitizenLogin = async () => {
    if (!citizenCode.trim()) { setSmsError('请输入验证码'); return; }
    setVerifying(true); setSmsError('');
    try {
      const resp = await api.post('/citizen/login', { phone: citizenPhone, code: citizenCode });
      const data = resp.data;
      if (data.need_register) {
        setNeedRegister(true);
        return;
      }
      // 已认证 → 直接登录
      finishCitizenLogin(data);
    } catch (err) {
      setSmsError(err?.response?.data?.error || '验证码错误');
    } finally { setVerifying(false); }
  };

  // ─── 市民：实名注册 ───
  const handleRegister = async () => {
    if (!realName.trim() || realName.length < 2) { setRegError('请填写真实姓名'); return; }
    if (!/^\d{15,18}$/.test(idNumber.trim())) { setRegError('身份证号格式不正确'); return; }
    setRegistering(true); setRegError('');
    try {
      const resp = await api.post('/citizen/register', {
        phone: citizenPhone,
        realName: realName.trim(),
        idNumber: idNumber.trim(),
      });
      finishCitizenLogin(resp.data);
    } catch (err) {
      setRegError(err?.response?.data?.error || '实名认证失败');
    } finally { setRegistering(false); }
  };

  const finishCitizenLogin = (data) => {
    let displayName = data.citizen?.realName || data.citizen?.nickname || maskPhone(citizenPhone);
    if (!data.citizen?.realName && data.citizen?.nickname && data.citizen.nickname !== '演示市民') {
      displayName = `${data.citizen.nickname.charAt(0)}**${citizenPhone.slice(-4)}`;
    }
    if (data.citizen?.realName) {
      displayName = data.citizen.realName;
    }
    sessionStorage.setItem('roleKey', 'citizen');
    sessionStorage.setItem('displayName', displayName);
    sessionStorage.setItem('citizenPhone', citizenPhone);
    if (data.session?.id) sessionStorage.setItem('session', JSON.stringify({ sessionId: data.session.id }));
    if (data.session?.sessionId) sessionStorage.setItem('session', JSON.stringify(data.session));
    navigate('/citizen', { replace: true });
  };

  // ─── 政务：工号登录 ───
  const handleGovLogin = async () => {
    if (!empId.trim()) { setGovError('请输入工号'); return; }
    if (!selectedGovRole) { setGovError('请先选择身份'); return; }
    setGovLoading(true); setGovError('');
    try {
      const resp = await api.post('/login', { employee_id: empId.trim() });
      const { user, session } = resp.data;
      const rolePathMap = { dispatcher: '/dispatcher', process_admin: '/process-admin', leader: '/leader' };
      const path = rolePathMap[user.role] || selectedGovRole.path;
      sessionStorage.setItem('roleKey', user.role);
      sessionStorage.setItem('displayName', user.displayName || empId);
      sessionStorage.setItem('employeeId', user.employeeId || empId);
      sessionStorage.setItem('department', user.department || '');
      if (session?.id) sessionStorage.setItem('session', JSON.stringify({ sessionId: session.id }));
      navigate(path, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error;
      setGovError(err?.response?.status === 404 ? `工号 "${empId}" 不存在` : msg || '登录失败');
    } finally { setGovLoading(false); }
  };

  // ─── 人员管理：加载用户列表 ───
  const loadUsers = async () => {
    try {
      const resp = await api.get('/users');
      setUsers(resp.data);
    } catch (e) { setUserMsg('加载失败'); }
  };

  // ─── 人员管理：手动添加 ───
  const handleAddUser = async () => {
    if (!newUser.employee_id) { setUserMsg('工号不能为空'); return; }
    try {
      await api.post('/users', { ...newUser, username: newUser.username || newUser.employee_id });
      setNewUser({ username:'', employee_id:'', role_key:'dispatcher', display_name:'', department:'' });
      setUserMsg('添加成功');
      loadUsers();
    } catch (e) { setUserMsg(e?.response?.data?.error || '添加失败'); }
  };

  // ─── 人员管理：批量导入 ───
  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) { setUserMsg('请输入JSON数组'); return; }
      const resp = await api.post('/users/import', { users: parsed });
      setUserMsg(`导入完成：成功 ${resp.data.imported} 人，失败 ${resp.data.errors.length} 人`);
      setImportText('');
      loadUsers();
    } catch (e) {
      if (e instanceof SyntaxError) setUserMsg('JSON格式错误');
      else setUserMsg(e?.response?.data?.error || '导入失败');
    }
  };

  // ─── 人员管理：删除 ───
  const handleDeleteUser = async (id) => {
    if (!window.confirm('确定要删除该人员吗？')) return;
    try {
      await api.delete(`/users/${id}`);
      setUserMsg('删除成功');
      loadUsers();
    } catch (e) { setUserMsg('删除失败'); }
  };

  const handleBack = () => {
    setMode(null); setSelectedGovRole(null); setNeedRegister(false);
    setCitizenPhone(''); setCitizenCode(''); setCodeSent(false); setSmsError('');
    setEmpId(''); setGovError('');
    setRealName(''); setIdNumber(''); setRegError('');
    setShowUserManager(false);
  };

  // ─── 渲染 ───

  return (
    <div style={{minHeight:'100vh',width:'100%',background:'linear-gradient(180deg,#0F2640 0%,#1B3A5C 50%,#2A5A8C 100%)',display:'flex',flexDirection:'column',overflowX:'hidden'}}>
      <div style={{position:'absolute',top:'24px',left:'32px',color:'rgba(197,165,90,0.9)',fontSize:'14px',fontWeight:'500',letterSpacing:'2px',userSelect:'none'}}>
        市容巡查一体化系统
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 24px 60px'}}>
        {/* 徽标 */}
        <div style={{width:'64px',height:'64px',borderRadius:'4px',background:'rgba(197,165,90,0.15)',border:'1.5px solid rgba(197,165,90,0.4)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'24px'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 8V10H22V8L12 2Z" fill="#C5A55A"/><rect x="4" y="11" width="3" height="8" fill="#fff" opacity="0.9"/><rect x="10.5" y="11" width="3" height="8" fill="#fff" opacity="0.9"/><rect x="17" y="11" width="3" height="8" fill="#fff" opacity="0.9"/><rect x="2" y="20" width="20" height="2" fill="#C5A55A"/></svg>
        </div>
        
        {/* 标题 */}
        <h1 style={{color:'#fff',fontSize:'26px',fontWeight:'600',textAlign:'center',margin:'0 0 6px',letterSpacing:'3px'}}>
          {showUserManager ? '政务人员管理' : needRegister ? '市民实名认证' : mode === 'citizen' ? '市民登录' : mode === 'gov' ? '政务人员登录' : '请选择登录身份'}
        </h1>
        <div style={{width:'40px',height:'2px',background:'#C5A55A',margin:'0 auto 14px',borderRadius:'1px'}}/>
        <p style={{color:'rgba(197,165,90,0.7)',fontSize:'13px',marginBottom:'36px',letterSpacing:'1px'}}>
          {showUserManager ? '手动添加或批量导入政务人员账号' :
           needRegister ? '首次使用需完成实名认证，请填写真实信息' :
           mode === 'citizen' ? '请用手机号完成身份验证后进入市民工作台' :
           mode === 'gov' ? '请选择您的职责身份并输入工号登录' :
           '请根据您的工作职责选择对应身份进入系统'}
        </p>

        {/* 人员管理面板 */}
        {showUserManager && (
          <div style={{background:'rgba(255,255,255,0.06)',backdropFilter:'blur(12px)',borderRadius:'4px',padding:'24px',width:'100%',maxWidth:'600px',border:'1px solid rgba(197,165,90,0.2)'}}>
            {/* 手动添加 */}
            <div style={{marginBottom:'20px',padding:'16px',background:'rgba(255,255,255,0.04)',borderRadius:'4px'}}>
              <h3 style={{color:'#C5A55A',fontSize:'14px',margin:'0 0 12px'}}>手动添加人员</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                <input placeholder="工号*" value={newUser.employee_id} onChange={e=>setNewUser({...newUser,employee_id:e.target.value})} style={inputS}/>
                <input placeholder="姓名" value={newUser.display_name} onChange={e=>setNewUser({...newUser,display_name:e.target.value})} style={inputS}/>
                <select value={newUser.role_key} onChange={e=>setNewUser({...newUser,role_key:e.target.value})} style={{...inputS,color:'#fff',background:'rgba(255,255,255,0.08)'}}>
                  <option value="dispatcher" style={{color:'#333'}}>处置人员</option>
                  <option value="process_admin" style={{color:'#333'}}>管理员</option>
                  <option value="leader" style={{color:'#333'}}>领导</option>
                </select>
                <input placeholder="部门" value={newUser.department} onChange={e=>setNewUser({...newUser,department:e.target.value})} style={inputS}/>
              </div>
              <button onClick={handleAddUser} style={{...goldBtn,marginTop:'10px',width:'100%'}}>✓ 添加</button>
            </div>

            {/* 批量导入 */}
            <div style={{marginBottom:'20px',padding:'16px',background:'rgba(255,255,255,0.04)',borderRadius:'4px'}}>
              <h3 style={{color:'#C5A55A',fontSize:'14px',margin:'0 0 8px'}}>批量导入（JSON）</h3>
              <textarea placeholder='[{"employee_id":"D003","display_name":"张三","role_key":"dispatcher","department":"城管"}]'
                value={importText} onChange={e=>setImportText(e.target.value)}
                rows={4} style={{...inputS,width:'100%',resize:'vertical',fontFamily:'monospace',fontSize:'12px'}}/>
              <button onClick={handleImport} style={{...goldBtn,marginTop:'8px',width:'100%'}}>导入</button>
            </div>

            {/* 已有人员列表 */}
            <div>
              <h3 style={{color:'#C5A55A',fontSize:'14px',margin:'0 0 8px'}}>现有人员（{users.length}人）</h3>
              <div style={{maxHeight:'200px',overflowY:'auto'}}>
                <table style={{width:'100%',fontSize:'12px',color:'#ccc',borderCollapse:'collapse'}}>
                  <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                    <th style={thS}>工号</th><th style={thS}>姓名</th><th style={thS}>角色</th><th style={thS}>部门</th><th style={thS}>操作</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                        <td style={tdS}>{u.employeeId}</td>
                        <td style={tdS}>{u.displayName}</td>
                        <td style={tdS}>{u.roleName}</td>
                        <td style={tdS}>{u.department}</td>
                        <td style={tdS}><button onClick={()=>handleDeleteUser(u.id)} style={{background:'none',border:'none',color:'#e74c3c',cursor:'pointer',fontSize:'12px'}}>删除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {userMsg && <div style={{color: userMsg.includes('失败') || userMsg.includes('错误') ? '#FFCDD2' : '#C5A55A',fontSize:'12px',marginTop:'10px'}}>{userMsg}</div>}
            <div style={{textAlign:'center',marginTop:'16px'}}>
              <button onClick={()=>{setShowUserManager(false);setUserMsg('');}} style={backBtnStyle}>← 返回登录</button>
            </div>
          </div>
        )}

        {/* 默认：选择身份 */}
        {!mode && !showUserManager && (
          <div style={{display:'flex',gap:'20px',flexWrap:'wrap',justifyContent:'center'}}>
            <RoleCard label="市民" desc="提交意见 · 查询进度" onClick={()=>setMode('citizen')}/>
            <RoleCard label="政务人员" desc="处置 / 管理 / 领导" onClick={()=>setMode('gov')}/>
          </div>
        )}

        {/* 市民实名认证 */}
        {needRegister && (
          <div style={cardS}>
            <label style={labelS}>真实姓名</label>
            <input value={realName} onChange={e=>{setRealName(e.target.value);setRegError('');}} placeholder="请输入真实姓名" style={inputS} onKeyDown={e=>{if(e.key==='Enter')handleRegister();}}/>
            <label style={{...labelS,marginTop:'14px'}}>身份证号</label>
            <input value={idNumber} onChange={e=>{setIdNumber(e.target.value);setRegError('');}} placeholder="请输入身份证号（15或18位）" maxLength={18} style={inputS} onKeyDown={e=>{if(e.key==='Enter')handleRegister();}}/>
            {regError && <div style={{color:'#FFCDD2',fontSize:'12px',marginTop:'8px'}}>⚠ {regError}</div>}
            <button onClick={handleRegister} disabled={registering || !realName || !idNumber}
              style={{...goldBtn,width:'100%',marginTop:'16px',opacity:(registering||!realName||!idNumber)?0.5:1}}>
              {registering ? '认证中…' : '完成实名认证'}
            </button>
            <div style={{textAlign:'center',marginTop:'14px'}}>
              <button onClick={handleBack} style={backBtnStyle}>← 返回</button>
            </div>
          </div>
        )}

        {/* 市民：手机+验证码 */}
        {mode === 'citizen' && !needRegister && (
          <div style={cardS}>
            <label style={labelS}>手机号</label>
            <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
              <input value={citizenPhone} onChange={e=>{setCitizenPhone(e.target.value);setSmsError('');}} placeholder="请输入11位手机号" maxLength={11} style={inputS} onKeyDown={e=>{if(e.key==='Enter'&&!codeSent)handleSendCode();}}/>
              <button onClick={handleSendCode} disabled={sending||countdown>0}
                style={{flexShrink:0,padding:'8px 12px',borderRadius:'2px',border:'none',background:countdown>0?'rgba(255,255,255,0.1)':'#1E8449',color:'#fff',fontSize:'12px',fontWeight:'600',cursor:countdown>0?'not-allowed':'pointer',whiteSpace:'nowrap'}}>
                {sending?'发送中…':countdown>0?`${countdown}s`:'获取验证码'}
              </button>
            </div>
            <label style={labelS}>验证码</label>
            <input value={citizenCode} onChange={e=>{setCitizenCode(e.target.value);setSmsError('');}} placeholder={codeSent?'请输入6位验证码':'请先获取验证码'} maxLength={6} style={{...inputS,marginBottom:'6px'}} onKeyDown={e=>{if(e.key==='Enter')handleCitizenLogin();}}/>
            {smsError && <div style={{color:'#FFCDD2',fontSize:'12px',marginBottom:'10px'}}>⚠ {smsError}</div>}
            {!smsError && codeSent && (
              <div style={{color:'rgba(197,165,90,0.8)',fontSize:'12px',marginBottom:'10px',background:'rgba(197,165,90,0.1)',padding:'8px 12px',borderRadius:'2px'}}>
                📱 模拟短信已发送 — 验证码：<strong style={{fontSize:'18px',letterSpacing:'4px',color:'#fff'}}>{smsCode}</strong>
              </div>
            )}
            <button onClick={handleCitizenLogin} disabled={verifying||!citizenPhone||!citizenCode}
              style={{...goldBtn,width:'100%',marginTop:'6px',opacity:(verifying||!citizenPhone||!citizenCode)?0.5:1}}>
              {verifying?'验证中…':'验证并进入'}
            </button>
            <div style={{textAlign:'center',marginTop:'14px'}}><button onClick={handleBack} style={backBtnStyle}>← 返回选择身份</button></div>
          </div>
        )}

        {/* 政务人员 */}
        {mode === 'gov' && !showUserManager && (
          <div style={{...cardS,maxWidth:'460px'}}>
            <label style={labelS}>选择职责身份</label>
            <div style={{display:'flex',gap:'8px',marginBottom:'18px',flexWrap:'wrap'}}>
              {GOV_ROLES.map(r=>(
                <button key={r.key} onClick={()=>{setSelectedGovRole(r);setGovError('');}}
                  style={{flex:'1 1 120px',padding:'8px 6px',borderRadius:'2px',
                    border:selectedGovRole?.key===r.key?'1.5px solid #C5A55A':'1px solid rgba(255,255,255,0.2)',
                    background:selectedGovRole?.key===r.key?'rgba(197,165,90,0.2)':'rgba(255,255,255,0.05)',
                    color:'#fff',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>{r.label}
                </button>
              ))}
            </div>
            <label style={labelS}>工号</label>
            <input value={empId} onChange={e=>{setEmpId(e.target.value);setGovError('');}} placeholder="请输入工号（如 D001）" style={{...inputS,marginBottom:'6px'}} onKeyDown={e=>{if(e.key==='Enter')handleGovLogin();}}/>
            {govError && <div style={{color:'#FFCDD2',fontSize:'12px',marginBottom:'10px'}}>⚠ {govError}</div>}
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:'2px',padding:'10px 12px',fontSize:'11px',color:'rgba(197,165,90,0.7)',marginBottom:'14px',lineHeight:1.8,border:'1px solid rgba(197,165,90,0.1)'}}>
              <strong style={{color:'rgba(197,165,90,0.9)'}}>演示工号</strong><br/>
              处置员：D001（王强）、D002（赵芳）<br/>
              管理员：A001（李明）&nbsp;&nbsp;领导：L001（张华）
            </div>
            <button onClick={handleGovLogin} disabled={govLoading||!empId.trim()}
              style={{...goldBtn,width:'100%',opacity:(govLoading||!empId.trim())?0.5:1}}>
              {govLoading?'登录中…':'登 录'}
            </button>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'14px'}}>
              <button onClick={handleBack} style={backBtnStyle}>← 返回选择身份</button>
              <button onClick={()=>{setShowUserManager(true);loadUsers();}} style={{...backBtnStyle,color:'rgba(197,165,90,0.8)',fontSize:'12px'}}>人员管理</button>
            </div>
          </div>
        )}
      </div>
      <div style={{textAlign:'center',color:'rgba(197,165,90,0.4)',fontSize:'11px',padding:'16px',letterSpacing:'1px'}}>
        © 2026 市容管理局数字化平台 · 为民服务
      </div>
    </div>
  );
}

function RoleCard({ label, desc, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{width:'180px',minHeight:'80px',borderRadius:'4px',border:`1.5px solid ${hovered?'#C5A55A':'rgba(197,165,90,0.3)'}`,background:hovered?'rgba(197,165,90,0.12)':'rgba(255,255,255,0.05)',color:'#fff',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'4px',padding:'16px',transition:'all 0.2s',transform:hovered?'translateY(-2px)':'none',boxShadow:hovered?'0 6px 20px rgba(0,0,0,0.2)':'none'}}>
      <span style={{fontSize:'15px',fontWeight:'600',letterSpacing:'1px'}}>{label}</span>
      <span style={{fontSize:'11px',color:'rgba(197,165,90,0.7)'}}>{desc}</span>
    </button>
  );
}

const cardS = {background:'rgba(255,255,255,0.06)',backdropFilter:'blur(12px)',borderRadius:'4px',padding:'28px 32px',width:'100%',maxWidth:'400px',border:'1px solid rgba(197,165,90,0.2)'};
const labelS = {display:'block',color:'rgba(197,165,90,0.8)',fontSize:'12px',fontWeight:'600',marginBottom:'6px',letterSpacing:'0.5px'};
const inputS = {width:'100%',padding:'9px 12px',borderRadius:'2px',border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'#fff',fontSize:'13px',outline:'none',boxSizing:'border-box',fontFamily:'inherit'};
const goldBtn = {padding:'10px',borderRadius:'2px',border:'none',background:'#C5A55A',color:'#fff',fontSize:'14px',fontWeight:'600',cursor:'pointer',letterSpacing:'2px'};
const backBtnStyle = {background:'none',border:'none',color:'rgba(197,165,90,0.6)',fontSize:'12px',cursor:'pointer',textDecoration:'underline'};
const thS = {padding:'6px 8px',textAlign:'left',color:'rgba(197,165,90,0.8)'};
const tdS = {padding:'6px 8px',color:'#ccc'};
