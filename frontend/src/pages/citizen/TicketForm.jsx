import React, { useState, useEffect } from 'react';
import { FaRobot, FaExclamationTriangle, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { Btn, Card, Modal } from './ui';

/* ─────────────────────────────────────────────
   验证辅助函数
───────────────────────────────────────────── */
const FUZZY_WORDS = [
  '附近', '大概', '旁边', '这边', '那边',
  '左右', '左边', '右边', '前面', '后面', '周围', '一带',
];

function validateEvent(v)    { return v.trim().length >= 5; }
function validateLocation(v) {
  if (!v.trim()) return false;
  return !FUZZY_WORDS.some((w) => v.includes(w));
}
function validateDatetime(v) { return !!v; }

function isYellow(field, value) {
  if (field === 'event')    return !validateEvent(value);
  if (field === 'location') return !validateLocation(value);
  if (field === 'datetime') return !validateDatetime(value);
  return false;
}

/* ─────────────────────────────────────────────
   字段包装器（带标黄 + 提示）
───────────────────────────────────────────── */
function FieldWrap({ label, yellow, hint, children, required }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '600',
          color: '#606266',
          marginBottom: '6px',
          letterSpacing: '0.3px',
        }}
      >
        {label}
        {required && <span style={{ color: '#E74C3C', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {yellow && hint && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            marginTop: '5px', fontSize: '12px', color: '#E67E22',
          }}
        >
          <FaExclamationTriangle size={11} />
          {hint}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   新建工单表单
   Props: citizenId, tickets, onSubmit, onCheckDuplicate
───────────────────────────────────────────── */
export default function TicketForm({ citizenId, tickets, onSubmit, onCheckDuplicate }) {
  const [event,    setEvent]    = useState('');
  const [location, setLocation] = useState('');
  const [datetime, setDatetime] = useState('');
  const [touched,  setTouched]  = useState({ event: false, location: false, datetime: false });
  const [submitting,   setSubmitting]   = useState(false);
  const [submitOk,     setSubmitOk]     = useState(false);
  const [submitError,  setSubmitError]  = useState('');
  const [dupTicket,    setDupTicket]    = useState(null);
  const [pendingData,  setPendingData]  = useState(null);

  const [triedSubmit, setTriedSubmit] = useState(false);
  const showYellow = (field, value) =>
    (touched[field] || triedSubmit) && isYellow(field, value);

  const eventYellow    = showYellow('event', event);
  const locationYellow = showYellow('location', location);
  const datetimeYellow = showYellow('datetime', datetime);
  const hasAnyYellow   = isYellow('event', event) || isYellow('location', location) || isYellow('datetime', datetime);

  const dirty = (event || location || datetime) && !submitOk;

  // ── 浏览器关闭/刷新 ──
  useEffect(() => {
    const handler = (e) => {
      if (dirty && hasAnyYellow) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, hasAnyYellow]);

  // ── 提交前校验 ──
  const handleTrySubmit = async () => {
    setTriedSubmit(true);
    setSubmitError('');
    if (hasAnyYellow) return;

    const data = {
      title: event.trim(),
      content: event.trim(),
      location: location.trim(),
      occurred_at: datetime ? new Date(datetime).toISOString() : new Date().toISOString(),
    };

    // 调用后端重复检测
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
      setEvent(''); setLocation(''); setDatetime('');
      setTouched({ event: false, location: false, datetime: false });
      setTriedSubmit(false);
      setTimeout(() => setSubmitOk(false), 3000);
    } catch (err) {
      setSubmitError(err.response?.data?.error || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 输入框公共样式 ──
  const inputStyle = (yellow) => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1.5px solid ${yellow ? '#F5A623' : '#e4e7ed'}`,
    background: yellow ? '#FFF3E0' : '#fff',
    fontSize: '14px',
    color: '#303133',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  });

  return (
    <>
      <Card>
        {/* ── 卡片标题 ── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '20px',
            paddingBottom: '14px',
            borderBottom: '1px solid #f5f5f5',
          }}
        >
          <span style={{ fontSize: '18px' }}>📋</span>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a2a3a' }}>
            新建工单
          </h3>
        </div>

        {/* ── 表单字段 ── */}

        {/* 事件描述 */}
        <FieldWrap
          label="事件描述"
          required
          yellow={eventYellow}
          hint="描述过于简短，请至少输入 5 个字符"
        >
          <textarea
            value={event}
            placeholder="请详细描述您观察到的问题，例如：中山路口有一堆积了2天的垃圾未被清运…"
            rows={4}
            onChange={(e) => setEvent(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, event: true }))}
            style={inputStyle(eventYellow)}
          />
          <div style={{ textAlign: 'right', fontSize: '12px', color: event.trim().length < 5 ? '#E67E22' : '#c0c4cc', marginTop: '3px' }}>
            {event.trim().length} 字{event.trim().length < 5 ? '（至少 5 字）' : ''}
          </div>
        </FieldWrap>

        {/* 地点 */}
        <FieldWrap
          label="事发地点"
          required
          yellow={locationYellow}
          hint={
            !location.trim()
              ? '请填写具体地点'
              : '地点描述含模糊词，请填写更精确的地址（如门牌号/路口名）'
          }
        >
          <input
            type="text"
            value={location}
            placeholder="请填写精确地址，例如：解放路与中山路交叉口路灯旁"
            onChange={(e) => setLocation(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, location: true }))}
            style={inputStyle(locationYellow)}
          />
        </FieldWrap>

        {/* 发生时间 */}
        <FieldWrap
          label="发生时间"
          required
          yellow={datetimeYellow}
          hint="请选择事件发生时间"
        >
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, datetime: true }))}
            style={{ ...inputStyle(datetimeYellow), cursor: 'pointer' }}
          />
        </FieldWrap>

        {/* AI 提示 */}
        <FieldWrap label="AI 智能分析">
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#f0f7ff',
              border: '1.5px solid #d0e8ff',
              fontSize: '14px',
              color: '#1658AF',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <FaRobot size={16} style={{ flexShrink: 0 }} />
            提交后系统将自动分析事件类型、检测重复并推荐处置部门
          </div>
        </FieldWrap>

        {/* 提交区域 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
          <Btn onClick={handleTrySubmit} disabled={submitting} style={{ minWidth: '120px' }}>
            {submitting
              ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaSpinner className="spin" size={13} />提交中…</span>
              : '提交工单'}
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              setEvent(''); setLocation(''); setDatetime('');
              setTouched({ event: false, location: false, datetime: false });
              setTriedSubmit(false);
              setSubmitError('');
            }}
          >
            重置
          </Btn>
          {submitOk && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#27AE60', fontSize: '14px', fontWeight: '600' }}>
              <FaCheckCircle size={15} /> 工单已提交成功！
            </span>
          )}
          {submitError && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#E74C3C', fontSize: '13px' }}>
              <FaExclamationTriangle size={13} /> {submitError}
            </span>
          )}
          {triedSubmit && hasAnyYellow && !submitting && !submitOk && !submitError && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#E67E22', fontSize: '13px' }}>
              <FaExclamationTriangle size={13} /> 请完善标黄字段后再提交
            </span>
          )}
        </div>
      </Card>

      {/* ── 重复工单警告弹框 ── */}
      <Modal
        open={!!dupTicket}
        onClose={() => { setDupTicket(null); setPendingData(null); }}
        title="检测到相似工单"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setDupTicket(null); setPendingData(null); }}>
              取消提交
            </Btn>
            <Btn variant="warning" onClick={() => doSubmit(pendingData)}>
              仍然提交
            </Btn>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: '#FFF3E0', border: '1px solid #F5A623',
              borderRadius: '10px', padding: '14px 16px',
              display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}
          >
            <FaExclamationTriangle size={18} color="#E67E22" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: '600', color: '#E67E22', marginBottom: '4px' }}>
                1 小时内已有相似事件上报
              </div>
              <div style={{ fontSize: '13px', color: '#606266' }}>
                您在该地点已有未完结的同类工单，重复提交可能导致资源浪费。
              </div>
            </div>
          </div>
          {dupTicket && (
            <div style={{ background: '#f9f9f9', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', lineHeight: '1.8' }}>
              <div><strong>已有工单 ID：</strong>#{dupTicket.id}</div>
              <div><strong>事件：</strong>{dupTicket.title}</div>
              <div><strong>地点：</strong>{dupTicket.location}</div>
              <div><strong>状态：</strong>{dupTicket.status}</div>
            </div>
          )}
          <div style={{ fontSize: '13px', color: '#909399' }}>
            是否仍要继续提交新工单？
          </div>
        </div>
      </Modal>

      {/* spin 动画 */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </>
  );
}
