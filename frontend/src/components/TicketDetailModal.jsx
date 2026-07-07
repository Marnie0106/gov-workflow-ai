import React, { useState, useEffect } from 'react';
import { getTicket, getMessages } from '../api';
import { Modal } from '../pages/citizen/ui';
import { StatusBadge, fmtTime, fmtTimeShort } from './Common';

/* ── 工单状态中文映射 ── */
const STATUS_LABEL = {
  created: '待派单',
  dispatched: '处置中',
  completed: '已完成',
};

/* ─────────────────────────────────────────────
   工单详情弹窗 — 通用组件
   点击工单行查看完整内容 + 处理时间线 + 留言记录
───────────────────────────────────────────── */
export default function TicketDetailModal({ open, ticketId, onClose }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ticketId) return;
    setLoading(true);
    setTicket(null);
    setMessages([]);
    Promise.all([
      getTicket(ticketId),
      getMessages({ ticketId, is_internal: 0 }),
    ])
      .then(([t, msgs]) => {
        setTicket(t);
        setMessages(Array.isArray(msgs) ? msgs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, ticketId]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ticket ? `工单详情 #${ticket.id}` : '工单详情'}
      width="600px"
      footer={
        <button
          onClick={onClose}
          style={{
            padding: '6px 18px', borderRadius: '6px',
            border: '1px solid #E4E7ED', background: '#fff',
            color: '#5A6A7A', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer',
          }}
        >关闭</button>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8C9AAF', fontSize: '13px' }}>
          <div style={{ width:'28px', height:'28px', border:'3px solid #EDF2F7', borderTopColor:'#3858E6', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }} />
          加载中...
        </div>
      ) : !ticket ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#C0392B', fontSize: '13px' }}>
          工单不存在或加载失败
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 基本信息 */}
          <DetailSection title="工单信息">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A2E' }}>{ticket.title}</span>
              <StatusBadge status={ticket.dispatch_status || STATUS_LABEL[ticket.status] || ticket.status} />
              {ticket.isTimeout === 1 && <span style={{ color: '#C0392B', fontSize: '11px', fontWeight: '600' }}>超时</span>}
              {ticket.isDuplicate === 1 && <span style={{ color: '#D4880F', fontSize: '11px', fontWeight: '600' }}>重复</span>}
              {ticket.isVague === 1 && <span style={{ color: '#C5A55A', fontSize: '11px', fontWeight: '600' }}>模糊</span>}
            </div>
            <DetailRow label="工单编号" value={`#${ticket.id}`} />
            <DetailRow label="上报地点" value={ticket.location || '—'} />
            <DetailRow label="上报人" value={ticket.reporter || '—'} />
            {ticket.department && <DetailRow label="派单部门" value={ticket.department} />}
            {ticket.assignee && <DetailRow label="处置人" value={ticket.assignee} />}
            {ticket.source && <DetailRow label="来源" value={ticket.source === 'citizen' ? '市民上报' : ticket.source} />}
          </DetailSection>

          {/* 工单内容 */}
          <DetailSection title="问题描述">
            <div style={{
              background: '#F5F7FA', borderRadius: '8px', padding: '12px 14px',
              fontSize: '13px', color: '#1A1A2E', lineHeight: '1.8',
            }}>
              {ticket.content || '无描述内容'}
            </div>
          </DetailSection>

          {/* 处理时间线 */}
          <DetailSection title="处理时间线">
            <Timeline ticket={ticket} />
          </DetailSection>

          {/* 流程进度 */}
          {ticket.flow_progress && typeof ticket.flow_progress === 'object' && (
            <DetailSection title="流程进度">
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(ticket.flow_progress).map(([key, completed], idx) => (
                  <span key={key} style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                    background: completed ? '#E6F7ED' : '#F5F7FA',
                    color: completed ? '#1E8449' : '#8C9AAF',
                    fontWeight: '500',
                  }}>
                    第{idx + 1}步 {completed ? '✓' : '○'}
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {/* 留言记录 */}
          <DetailSection title={`留言记录（${messages.length}条）`}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8C9AAF', fontSize: '12px', padding: '16px' }}>
                暂无留言
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {messages.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', flexDirection: m.sender_role === 'citizen' ? 'row-reverse' : 'row',
                    alignItems: 'flex-end', gap: '6px',
                  }}>
                    <div style={{
                      maxWidth: '75%',
                      background: m.sender_role === 'citizen' ? '#1B3A5C' : '#F0F4F8',
                      color: m.sender_role === 'citizen' ? '#fff' : '#1A1A2E',
                      borderRadius: m.sender_role === 'citizen' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                      padding: '8px 12px', fontSize: '12px', lineHeight: 1.6,
                      border: m.sender_role !== 'citizen' ? '1px solid #E4E7ED' : 'none',
                    }}>
                      <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '3px' }}>
                        {m.sender_name} · {fmtTimeShort(m.created_at)}
                      </div>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailSection>
        </div>
      )}
    </Modal>
  );
}

/* ── 详情区块 ── */
function DetailSection({ title, children }) {
  return (
    <div>
      <h4 style={{
        fontSize: '13px', fontWeight: '700', color: '#1B3A5C',
        marginBottom: '8px', paddingBottom: '6px',
        borderBottom: '2px solid #EDF2F7',
      }}>{title}</h4>
      {children}
    </div>
  );
}

/* ── 详情行 ── */
function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '5px', fontSize: '13px' }}>
      <span style={{ color: '#8C9AAF', flexShrink: 0, minWidth: '70px' }}>{label}：</span>
      <span style={{ color: '#1A1A2E' }}>{value}</span>
    </div>
  );
}

/* ── 处理时间线 ── */
function Timeline({ ticket }) {
  const events = [];

  events.push({ label: '工单创建', time: ticket.createdAt, done: true });

  if (ticket.dispatchedAt) {
    events.push({ label: '已派单', time: ticket.dispatchedAt, done: true });
  }
  if (ticket.acceptedAt) {
    events.push({ label: '已接受', time: ticket.acceptedAt, done: true });
  }
  if (ticket.dispatch_status === '处理中' || ticket.completed_at) {
    events.push({ label: '处理中', time: ticket.acceptedAt || ticket.dispatchedAt, done: true });
  }
  if (ticket.completed_at || ticket.resolvedAt) {
    events.push({ label: '已办结', time: ticket.completed_at || ticket.resolvedAt, done: true });
  }

  const pendingLabels = {
    '待派单': '等待派单',
    '派单中': '等待接受',
    '已接受': '等待处置',
    '处理中': '处置完成',
  };
  const currentStatus = ticket.dispatch_status || STATUS_LABEL[ticket.status];
  if (currentStatus && pendingLabels[currentStatus] && !ticket.completed_at) {
    events.push({ label: pendingLabels[currentStatus], time: null, done: false });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {events.map((evt, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          {/* 竖线 */}
          {idx < events.length - 1 && (
            <div style={{
              position: 'absolute', left: '7px', top: '18px', bottom: '-8px',
              width: '2px', background: evt.done ? '#1E8449' : '#E4E7ED',
            }} />
          )}
          {/* 圆点 */}
          <div style={{
            width: '16px', height: '16px', borderRadius: '50%',
            background: evt.done ? '#1E8449' : '#E4E7ED',
            border: evt.done ? 'none' : '2px solid #D9E2EC',
            flexShrink: 0, marginTop: '2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '9px', fontWeight: '700',
          }}>
            {evt.done ? '✓' : ''}
          </div>
          {/* 内容 */}
          <div style={{ paddingBottom: '10px' }}>
            <div style={{
              fontSize: '13px', fontWeight: evt.done ? '600' : '500',
              color: evt.done ? '#1A1A2E' : '#8C9AAF',
            }}>{evt.label}</div>
            {evt.time && (
              <div style={{ fontSize: '11px', color: '#8C9AAF', marginTop: '1px' }}>
                {fmtTime(evt.time)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
