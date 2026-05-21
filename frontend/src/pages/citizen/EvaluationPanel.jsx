import React, { useState } from 'react';
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { Card, Btn, Modal, StarRating, fmtTime } from './ui';

/* ─────────────────────────────────────────────
   状态显示映射
───────────────────────────────────────────── */
const STATUS_TEXT = {
  created: '待派单',
  dispatched: '处置中',
  completed: '已完成',
};

function StatusBadge({ status }) {
  const map = {
    '待派单':  { bg: '#FFF3E0', color: '#E67E22' },
    '派单中':  { bg: '#F3E8FF', color: '#8E44AD' },
    '已接受':  { bg: '#E8F0FE', color: '#1658AF' },
    '处理中':  { bg: '#E8F5E9', color: '#27AE60' },
    '已完结':  { bg: '#E8F0FE', color: '#1658AF' },
    '已完成':  { bg: '#E8F0FE', color: '#1658AF' },
  };
  const { bg = '#f5f7fa', color = '#909399' } = map[status] || {};
  return (
    <span
      style={{
        background: bg, color,
        padding: '3px 10px', borderRadius: '12px',
        fontSize: '12px', fontWeight: '600',
      }}
    >
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────
   待评价入口卡片（主工作台右下角）
───────────────────────────────────────────── */
export function EvaluationCard({ pendingTickets, onOpen }) {
  const count  = pendingTickets.length;
  const latest = pendingTickets[0];

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '17px' }}>⭐</span>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1a2a3a' }}>待评价</h4>
          {count > 0 && (
            <span
              style={{
                background: '#F5A623', color: '#fff',
                borderRadius: '10px', padding: '1px 7px',
                fontSize: '11px', fontWeight: '700',
              }}
            >
              {count} 条
            </span>
          )}
        </div>
        <Btn size="sm" variant="ghost" onClick={onOpen} disabled={count === 0}>
          去评价
        </Btn>
      </div>

      {latest ? (
        <div
          onClick={onOpen}
          style={{
            background: '#fffbf0',
            borderRadius: '10px',
            padding: '12px 14px',
            cursor: 'pointer',
            border: '1px solid #ffe4a0',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#fff3d0')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fffbf0')}
        >
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#1a2a3a', marginBottom: '5px' }}>
            #{latest.id} {latest.title}
          </div>
          <div style={{ fontSize: '12px', color: '#909399', marginBottom: '6px' }}>
            📍 {latest.location}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <StatusBadge status={STATUS_TEXT[latest.status] || latest.status} />
            <span style={{ fontSize: '12px', color: '#E67E22', fontWeight: '600' }}>
              · 等待您的评价
            </span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#c0c4cc', fontSize: '13px', padding: '20px 0' }}>
          暂无待评价工单 ✅
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────────────────────────────
   评价完整视图
───────────────────────────────────────────── */
export function EvaluationView({ tickets, evaluatedIds, pendingTickets, onSubmitEval, onBack, statusLabel }) {
  const [evalTarget,  setEvalTarget]  = useState(null);
  const [starValue,   setStarValue]   = useState(0);
  const [comment,     setComment]     = useState('');
  const [submitDone,  setSubmitDone]  = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  const handleOpenModal = (ticket) => {
    setEvalTarget(ticket);
    setStarValue(0);
    setComment('');
    setError('');
  };

  const handleSubmit = async () => {
    if (starValue === 0) {
      setError('请选择星级评分');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmitEval(evalTarget.id, starValue, comment.trim());
      setSubmitDone(evalTarget.id);
      setEvalTarget(null);
    } catch (err) {
      setError(err.response?.data?.error || '评价提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Btn size="sm" variant="ghost" onClick={onBack}>
          <FaArrowLeft size={11} /> 返回工作台
        </Btn>
        <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1a2a3a' }}>待评价工单</h3>
        <span style={{ marginLeft: '4px', fontSize: '13px', color: '#909399' }}>
          共 {(pendingTickets || []).length} 条
        </span>
      </div>

      {(!pendingTickets || pendingTickets.length === 0) ? (
        <div
          style={{
            textAlign: 'center', padding: '60px 24px',
            background: '#fff', borderRadius: '14px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#27AE60', marginBottom: '8px' }}>
            全部已评价
          </div>
          <div style={{ fontSize: '13px', color: '#909399' }}>感谢您的反馈！</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pendingTickets.map((t) => (
            <div
              key={t.id}
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '16px 20px',
                border: '1px solid #e4e7ed',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', gap: '14px',
              }}
            >
              {/* 工单信息 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a2a3a', marginBottom: '5px' }}>
                  #{t.id} {t.title}
                </div>
                <div style={{ fontSize: '12px', color: '#909399', display: 'flex', gap: '12px' }}>
                  <span>📍 {t.location}</span>
                  <span>🕐 {fmtTime(t.completed_at || t.createdAt)}</span>
                </div>
              </div>

              {/* 状态 + 按钮 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <StatusBadge status={STATUS_TEXT[t.status] || t.status} />
                {submitDone === t.id ? (
                  <span
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      color: '#27AE60', fontSize: '13px', fontWeight: '600',
                    }}
                  >
                    <FaCheckCircle size={14} /> 已评价
                  </span>
                ) : (
                  <Btn variant="warning" size="sm" onClick={() => handleOpenModal(t)}>
                    评价
                  </Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 评价弹框 ── */}
      <Modal
        open={!!evalTarget}
        onClose={() => setEvalTarget(null)}
        title="工单满意度评价"
        width="460px"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEvalTarget(null)}>取消</Btn>
            <Btn variant="warning" onClick={handleSubmit} disabled={starValue === 0 || submitting}>
              {submitting ? '提交中…' : '提交评价'}
            </Btn>
          </>
        }
      >
        {evalTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 工单摘要 */}
            <div
              style={{
                background: '#f9f9f9', borderRadius: '10px',
                padding: '12px 16px', fontSize: '13px', lineHeight: 1.8,
              }}
            >
              <div><strong>工单：</strong>#{evalTarget.id} {evalTarget.title}</div>
              <div><strong>地点：</strong>{evalTarget.location}</div>
              <div><strong>完成时间：</strong>{fmtTime(evalTarget.completed_at || evalTarget.createdAt)}</div>
            </div>

            {/* 星级 */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#606266', marginBottom: '10px' }}>
                处置满意度 <span style={{ color: '#E74C3C' }}>*</span>
              </div>
              <StarRating value={starValue} onChange={setStarValue} />
              {starValue === 0 && (
                <div style={{ fontSize: '12px', color: '#c0c4cc', marginTop: '6px' }}>
                  请点击星星进行评分
                </div>
              )}
            </div>

            {/* 文字评语 */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#606266', marginBottom: '8px' }}>
                文字评语（可选）
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="感谢您的反馈，请留下您的宝贵意见…"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid #e4e7ed', borderRadius: '8px',
                  padding: '10px 12px', fontSize: '14px', color: '#303133',
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                  lineHeight: 1.6,
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0A2B4E')}
                onBlur={(e)  => (e.target.style.borderColor = '#e4e7ed')}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div style={{ color: '#E74C3C', fontSize: '13px' }}>{error}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
