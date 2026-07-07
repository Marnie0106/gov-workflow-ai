import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaExclamationTriangle, FaCheckCircle, FaSpinner,
         FaCamera, FaTimes, FaShieldAlt } from 'react-icons/fa';
import { Btn, Card, Modal } from './ui';
import { uploadPhotos, getImageUrl } from '../../api';

/* ─────────────────────────────────────────────
   验证辅助
───────────────────────────────────────────── */
const FUZZY_WORDS = ['附近','大概','旁边','这边','那边','左右','左边','右边','前面','后面','周围','一带'];
function validateEvent(v)    { return v.trim().length >= 5; }
function validateLocation(v) {
  if (!v.trim()) return false;
  return !FUZZY_WORDS.some(w => v.includes(w));
}
function validateDatetime(v) { return !!v; }
function isYellow(field, value) {
  if (field === 'event')    return !validateEvent(value);
  if (field === 'location') return !validateLocation(value);
  if (field === 'datetime') return !validateDatetime(value);
  return false;
}

/* ─────────────────────────────────────────────
   字段包装器
───────────────────────────────────────────── */
function FieldWrap({ label, yellow, hint, children, required }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#5A6A7A', marginBottom:'6px' }}>
        {label}
        {required && <span style={{ color:'#C0392B', marginLeft:'3px' }}>*</span>}
      </label>
      {children}
      {yellow && hint && (
        <div style={{ display:'flex', alignItems:'center', gap:'5px', marginTop:'5px', fontSize:'12px', color:'#D4880F' }}>
          <FaExclamationTriangle size={11} />{hint}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   输入框公共样式
───────────────────────────────────────────── */
const inputStyle = (yellow) => ({
  width:'100%', padding:'10px 12px', borderRadius:'2px',
  border:`1px solid ${yellow ? '#D4880F' : '#E4E7ED'}`,
  background: yellow ? '#FFF8E6' : '#fff',
  fontSize:'13px', color:'#1A1A2E', outline:'none',
  transition:'border-color 0.2s, background 0.2s',
  boxSizing:'border-box', resize:'vertical', fontFamily:'inherit',
});

/* ─────────────────────────────────────────────
   已实名认证显示（登录时已完成，此处仅展示）
───────────────────────────────────────────── */
function VerifiedBadge({ phone }) {
  if (!phone) return null;
  const masked = `***${phone.slice(-4)}`;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px',
      background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:'4px',
      fontSize:'13px', color:'#1E8449',
    }}>
      <FaShieldAlt size={15} />
      <span>已实名认证 · 手机号尾号 <strong>{masked}</strong></span>
      <span style={{ marginLeft:'auto', fontSize:'11px', color:'#8C9AAF' }}>登录时已完成</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   照片上传组件（最多3张）
───────────────────────────────────────────── */
function PhotoUpload({ photos, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 3 - photos.filter(p => p.type === 'uploaded').length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length === 0) return;

    // 本地预览
    const previews = toUpload.map(f => ({
      type: 'preview',
      url: URL.createObjectURL(f),
      name: f.name,
      file: f,
    }));
    const newPhotos = [...photos, ...previews];
    onChange(newPhotos);
    setUploading(true);
    setUploadError('');

    try {
      const fd = new FormData();
      toUpload.forEach(f => fd.append('photos', f));
      const result = await uploadPhotos(fd);
      // 替换preview为已上传
      const uploaded = result.urls.map((url, i) => ({
        type: 'uploaded',
        url,
        name: toUpload[i].name,
      }));
      onChange(prev => {
        const withoutPreviews = prev.filter(p => p.type === 'uploaded');
        return [...withoutPreviews, ...uploaded];
      });
    } catch (e) {
      setUploadError('图片上传失败，请重试');
      onChange(prev => prev.filter(p => p.type === 'uploaded'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removePhoto = (idx) => {
    onChange(prev => {
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const uploadedCount = photos.length;

  return (
    <div>
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'8px' }}>
        {photos.map((p, i) => (
          <div key={i} style={{ position:'relative', width:'80px', height:'80px' }}>
            <img
              src={p.type === 'uploaded' ? getImageUrl(p.url) : p.url}
              alt={p.name}
              style={{ width:'80px', height:'80px', objectFit:'cover', borderRadius:'4px', border:'1px solid #E4E7ED' }}
            />
            {p.type === 'preview' && (
              <div style={{
                position:'absolute', inset:0, background:'rgba(0,0,0,0.4)',
                display:'flex', alignItems:'center', justifyContent:'center',
                borderRadius:'4px',
              }}>
                <FaSpinner className="spin" size={18} color="#fff" />
              </div>
            )}
            <button
              onClick={() => removePhoto(i)}
              style={{
                position:'absolute', top:'-6px', right:'-6px',
                background:'#C0392B', border:'none', borderRadius:'50%',
                width:'20px', height:'20px', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff',
              }}
            >
              <FaTimes size={10} />
            </button>
          </div>
        ))}
        {uploadedCount < 3 && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              width:'80px', height:'80px', borderRadius:'4px',
              border:'1px dashed #E4E7ED', background:'#F5F7FA',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:'4px', cursor: uploading ? 'not-allowed' : 'pointer', color:'#8C9AAF',
            }}
          >
            <FaCamera size={18} />
            <span style={{ fontSize:'11px' }}>添加照片</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef} type="file" multiple accept="image/*" style={{ display:'none' }}
        onChange={handleFileChange}
      />
      <div style={{ fontSize:'12px', color:'#8C9AAF' }}>
        {uploading ? '图片上传中…' : `最多上传3张照片（${uploadedCount}/3），支持 JPG/PNG/WEBP，单张不超过5MB`}
      </div>
      {uploadError && <div style={{ fontSize:'12px', color:'#C0392B', marginTop:'4px' }}>{uploadError}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   市民意见主表单
   Props: citizenId, tickets, onSubmit, onCheckDuplicate
───────────────────────────────────────────── */
export default function TicketForm({ citizenId, tickets, onSubmit, onCheckDuplicate }) {
  const [event,    setEvent]    = useState('');
  const [location, setLocation] = useState('');
  const [datetime, setDatetime] = useState('');
  const [photos,   setPhotos]   = useState([]);
  // 直接从登录时存储的 citizenPhone 读取，已在登录页验证过
  const verifiedPhone = sessionStorage.getItem('citizenPhone') || '';
  const [touched,  setTouched]  = useState({ event: false, location: false, datetime: false });
  const [submitting,   setSubmitting]   = useState(false);
  const [submitOk,     setSubmitOk]     = useState(false);
  const [submitError,  setSubmitError]  = useState('');
  const [dupTicket,    setDupTicket]    = useState(null);
  const [pendingData,  setPendingData]  = useState(null);
  const [triedSubmit,  setTriedSubmit]  = useState(false);

  const showYellow = (field, value) =>
    (touched[field] || triedSubmit) && isYellow(field, value);

  const eventYellow    = showYellow('event', event);
  const locationYellow = showYellow('location', location);
  const datetimeYellow = showYellow('datetime', datetime);
  const hasAnyYellow   = isYellow('event', event) || isYellow('location', location) || isYellow('datetime', datetime);

  // 浏览器关闭拦截
  useEffect(() => {
    const handler = (e) => {
      if ((event || location || datetime) && !submitOk) {
        e.preventDefault(); e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [event, location, datetime, submitOk]);

  // ── 提交前校验 ──
  const handleTrySubmit = async () => {
    setTriedSubmit(true);
    setSubmitError('');
    if (!verifiedPhone) {
      setSubmitError('请返回登录页完成手机号实名认证后再提交');
      return;
    }
    if (hasAnyYellow) return;

    const uploadedUrls = photos.filter(p => p.type === 'uploaded').map(p => p.url);
    const data = {
      title: event.trim(),
      content: event.trim(),
      location: location.trim(),
      occurred_at: datetime ? new Date(datetime).toISOString() : new Date().toISOString(),
      photo_urls: uploadedUrls.length ? JSON.stringify(uploadedUrls) : null,
    };

    try {
      const result = await onCheckDuplicate(location.trim(), event.trim());
      if (result.duplicate && result.similarTicket) {
        setDupTicket(result.similarTicket);
        setPendingData(data);
        return;
      }
    } catch (err) {
      console.error('重复检测失败:', err);
    }

    await doSubmit(data);
  };

  // ── 实际提交 ──
  const doSubmit = async (data) => {
    setSubmitting(true);
    setDupTicket(null);
    setSubmitError('');
    try {
      await onSubmit(data);
      setSubmitOk(true);
      setEvent(''); setLocation(''); setDatetime(''); setPhotos([]);
      setTouched({ event: false, location: false, datetime: false });
      setTriedSubmit(false);
      setTimeout(() => setSubmitOk(false), 3000);
    } catch (err) {
      setSubmitError(err.response?.data?.error || '提交失败，请重试');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <Card>
        {/* ── 卡片标题 ── */}
        <div style={{
          display:'flex', alignItems:'center', gap:'8px',
          marginBottom:'20px', paddingBottom:'14px', borderBottom:'1px solid #E4E7ED',
        }}>
          <h3 style={{ fontSize:'18px', fontWeight:'700', color:'#1A1A2E' }}>市民意见</h3>
          <span style={{ marginLeft:'auto', fontSize:'14px', color:'#8C9AAF', fontWeight:'normal' }}>
            请如实填写，信息将用于政府处置
          </span>
        </div>

        {/* ── 手机号实名认证状态 ── */}
        <FieldWrap label="手机号实名认证" required>
          <VerifiedBadge phone={verifiedPhone} />
        </FieldWrap>

        {/* ── 意见描述 ── */}
        <FieldWrap
          label="意见描述"
          required
          yellow={eventYellow}
          hint="描述过于简短，请至少输入 5 个字符"
        >
          <textarea
            value={event}
            placeholder="请详细描述您的意见或观察到的问题，例如：中山路口有一堆积了2天的垃圾未被清运…"
            rows={4}
            onChange={e => setEvent(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, event: true }))}
            style={inputStyle(eventYellow)}
          />
          <div style={{ textAlign:'right', fontSize:'12px', color: event.trim().length < 5 ? '#D4880F' : '#8C9AAF', marginTop:'3px' }}>
            {event.trim().length} 字{event.trim().length < 5 ? '（至少 5 字）' : ''}
          </div>
        </FieldWrap>

        {/* ── 事发地点 ── */}
        <FieldWrap
          label="事发地点"
          required
          yellow={locationYellow}
          hint={!location.trim() ? '请填写具体地点' : '地点描述含模糊词，请填写更精确的地址（如门牌号/路口名）'}
        >
          <input
            type="text" value={location}
            placeholder="请填写精确地址，例如：解放路与中山路交叉口路灯旁"
            onChange={e => setLocation(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, location: true }))}
            style={inputStyle(locationYellow)}
          />
        </FieldWrap>

        {/* ── 发生时间 ── */}
        <FieldWrap label="发生时间" required yellow={datetimeYellow} hint="请选择事件发生时间">
          <input
            type="datetime-local" value={datetime}
            onChange={e => setDatetime(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, datetime: true }))}
            style={{ ...inputStyle(datetimeYellow), cursor:'pointer' }}
          />
        </FieldWrap>

        {/* ── 现场照片 ── */}
        <FieldWrap label="现场照片（选填）">
          <PhotoUpload photos={photos} onChange={setPhotos} />
        </FieldWrap>

        {/* ── AI 提示 ── */}
        <FieldWrap label="AI 智能分析">
          <div style={{
            padding:'10px 12px', borderRadius:'4px',
            background:'#EDF2F7', border:'1px solid #E4E7ED',
            fontSize:'13px', color:'#1B3A5C',
            display:'flex', alignItems:'center', gap:'8px',
          }}>
            <FaRobot size={16} style={{ flexShrink:0 }} />
            提交后系统将自动分析意见类型、检测重复并推荐处置部门
          </div>
        </FieldWrap>

        {/* ── 提交区域 ── */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginTop:'8px' }}>
          <Btn onClick={handleTrySubmit} disabled={submitting} style={{ minWidth:'120px' }}>
            {submitting
              ? <span style={{ display:'flex', alignItems:'center', gap:'6px' }}><FaSpinner className="spin" size={13} />提交中…</span>
              : '提交意见'}
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              setEvent(''); setLocation(''); setDatetime(''); setPhotos([]);
              setTouched({ event: false, location: false, datetime: false });
              setTriedSubmit(false); setSubmitError('');
            }}
          >
            重置
          </Btn>
          {submitOk && (
            <span style={{ display:'flex', alignItems:'center', gap:'5px', color:'#1E8449', fontSize:'13px', fontWeight:'600' }}>
              <FaCheckCircle size={15} /> 意见已提交成功！
            </span>
          )}
          {submitError && (
            <span style={{ display:'flex', alignItems:'center', gap:'5px', color:'#C0392B', fontSize:'13px' }}>
              <FaExclamationTriangle size={13} /> {submitError}
            </span>
          )}
          {triedSubmit && hasAnyYellow && !submitting && !submitOk && !submitError && (
            <span style={{ display:'flex', alignItems:'center', gap:'5px', color:'#D4880F', fontSize:'13px' }}>
              <FaExclamationTriangle size={13} /> 请完善标黄字段后再提交
            </span>
          )}
        </div>
      </Card>

      {/* ── 重复工单警告弹框 ── */}
      <Modal
        open={!!dupTicket}
        onClose={() => { setDupTicket(null); setPendingData(null); }}
        title="检测到相似意见"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setDupTicket(null); setPendingData(null); }}>取消提交</Btn>
            <Btn variant="warning" onClick={() => doSubmit(pendingData)}>仍然提交</Btn>
          </>
        }
      >
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{
            background:'#FFF8E6', border:'1px solid #D4880F',
            borderRadius:'4px', padding:'14px 16px',
            display:'flex', alignItems:'flex-start', gap:'10px',
          }}>
            <FaExclamationTriangle size={18} color="#D4880F" style={{ flexShrink:0, marginTop:'2px' }} />
            <div>
              <div style={{ fontWeight:'600', color:'#D4880F', marginBottom:'4px' }}>1 小时内已有相似意见上报</div>
              <div style={{ fontSize:'13px', color:'#5A6A7A' }}>您在该地点已有未完结的同类工单，重复提交可能导致资源浪费。</div>
            </div>
          </div>
          {dupTicket && (
            <div style={{ background:'#F5F7FA', borderRadius:'4px', padding:'14px 16px', fontSize:'13px', lineHeight:'1.8' }}>
              <div><strong>已有工单 ID：</strong>#{dupTicket.id}</div>
              <div><strong>描述：</strong>{dupTicket.title}</div>
              <div><strong>地点：</strong>{dupTicket.location}</div>
              <div><strong>状态：</strong>{dupTicket.status}</div>
            </div>
          )}
          <div style={{ fontSize:'13px', color:'#8C9AAF' }}>是否仍要继续提交新意见？</div>
        </div>
      </Modal>

    </>
  );
}
