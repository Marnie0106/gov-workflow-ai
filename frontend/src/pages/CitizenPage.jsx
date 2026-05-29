import React, { useState, useEffect, useCallback } from 'react';
import {
  getTickets, createTicket, checkDuplicate,
  getMessages, sendMessage, markTicketMessagesRead,
  getEvaluations, submitEvaluation, getPendingEvaluations,
} from '../api';
import TicketForm from './citizen/TicketForm';
import { MessageCard, MessageView } from './citizen/MessagePanel';
import { EvaluationCard, EvaluationView } from './citizen/EvaluationPanel';

/* ── 状态中文映射 ── */
const STATUS_LABEL = {
  created: '待派单',
  dispatched: '处置中',
  completed: '已完成',
};

const DISPATCH_STATUS_LABEL = {
  '待派单': '待派单',
  '派单中': '派单中',
  '已接受': '已接受',
  '处理中': '处理中',
  '已完结': '已完结',
};

/* ── 获取当前市民ID ── */
function getCitizenId() {
  try {
    const s = sessionStorage.getItem('session');
    if (s) {
      const parsed = JSON.parse(s);
      return sessionStorage.getItem('userId') || '1';
    }
  } catch {}
  return '1';
}

/* ─────────────────────────────────────────────
   市民工作台主页面
   视图：'workbench' | 'messages' | 'evaluation'
───────────────────────────────────────────── */
export default function CitizenPage() {
  const citizenId = getCitizenId();

  // ── 数据状态 ──
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [evaluatedIds, setEvaluatedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // ── 视图切换 ──
  const [view, setView] = useState('workbench');

  // ── 加载工单列表 ──
  const fetchTickets = useCallback(async () => {
    try {
      const data = await getTickets({ citizenId });
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('加载工单失败:', err);
    }
  }, [citizenId]);

  // ── 加载留言列表 ──
  const fetchMessages = useCallback(async () => {
    try {
      const data = await getMessages({});
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('加载留言失败:', err);
    }
  }, []);

  // ── 加载已评价列表 ──
  const fetchEvaluations = useCallback(async () => {
    try {
      const data = await getEvaluations(citizenId);
      const ids = new Set((Array.isArray(data) ? data : []).map(e => e.ticket_id));
      setEvaluatedIds(ids);
    } catch (err) {
      console.error('加载评价失败:', err);
    }
  }, [citizenId]);

  // ── 初始化加载 ──
  useEffect(() => {
    Promise.all([fetchTickets(), fetchMessages(), fetchEvaluations()])
      .finally(() => setLoading(false));
  }, [fetchTickets, fetchMessages, fetchEvaluations]);

  // ── API 操作 ──
  const handleCreateTicket = async (data) => {
    try {
      await createTicket({
        title: data.title,
        content: data.content,
        location: data.location,
        reporter: sessionStorage.getItem('displayName') || '市民',
        citizen_id: citizenId,
        source: 'citizen',
        occurred_at: data.occurred_at,
      });
      await fetchTickets();
    } catch (err) {
      console.error('创建工单失败:', err);
      throw err;
    }
  };

  const handleCheckDuplicate = async (location, content) => {
    try {
      const result = await checkDuplicate({ citizenId, location, content });
      return result;
    } catch {
      return { duplicate: false };
    }
  };

  const handleAddMessage = async (msg) => {
    try {
      await sendMessage(msg);
      await fetchMessages();
    } catch (err) {
      console.error('发送留言失败:', err);
    }
  };

  const handleMarkRead = async (ticketId) => {
    try {
      await markTicketMessagesRead(ticketId);
      await fetchMessages();
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  const handleSubmitEval = async (ticketId, rating, comment) => {
    try {
      await submitEvaluation({ ticket_id: ticketId, citizen_id: citizenId, rating, comment });
      setEvaluatedIds(prev => new Set([...prev, ticketId]));
      await fetchEvaluations();
    } catch (err) {
      console.error('提交评价失败:', err);
    }
  };

  // ── 衍生数据 ──
  const completedTickets = tickets.filter(t => t.status === 'completed');
  const pendingEvalTickets = completedTickets.filter(t => !evaluatedIds.has(t.id));
  const unreadMessages = messages.filter(m => !m.is_read && m.sender_role !== 'citizen');

  // ── 加载中状态 ──
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#8C9AAF' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>.</div>
        正在加载工作台数据…
      </div>
    );
  }

  // ═══════════════ 留言视图 ═══════════════
  if (view === 'messages') {
    return (
      <MessageView
        tickets={tickets}
        messages={messages}
        onAddMessage={handleAddMessage}
        onMarkRead={handleMarkRead}
        onBack={() => setView('workbench')}
        statusLabel={STATUS_LABEL}
      />
    );
  }

  // ═══════════════ 评价视图 ═══════════════
  if (view === 'evaluation') {
    return (
      <EvaluationView
        tickets={tickets}
        evaluatedIds={evaluatedIds}
        pendingTickets={pendingEvalTickets}
        onSubmitEval={handleSubmitEval}
        onBack={() => setView('workbench')}
        statusLabel={STATUS_LABEL}
      />
    );
  }

  // ═══════════════ 主工作台视图 ═══════════════
  return (
    <div>
      {/* 页头 */}
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '18px', fontWeight: '700',
            color: '#1A1A2E', marginBottom: '4px',
          }}
        >
          市民工作台
        </h2>
        <p style={{ fontSize: '13px', color: '#8C9AAF' }}>
          {sessionStorage.getItem('displayName') || '市民'} · 共 {tickets.length} 条工单
        </p>
      </div>

      {/* ── 主体布局：左 65% + 右 35% ── */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
        }}
      >
        {/* ── 左侧：新建工单 (65%) ── */}
        <div style={{ flex: '0 0 64%', minWidth: 0 }}>
          <TicketForm
            citizenId={citizenId}
            tickets={tickets}
            onSubmit={handleCreateTicket}
            onCheckDuplicate={handleCheckDuplicate}
          />

          {/* 我的工单历史（简要列表） */}
          <div
            style={{
              marginTop: '20px',
              background: '#fff',
              borderRadius: '4px',
              boxShadow: '0 1px 4px rgba(27,58,92,0.06)',
              border: '1px solid #E8ECF0',
              padding: '18px 24px',
            }}
          >
            <h4
              style={{
                fontSize: '14px', fontWeight: '700',
                color: '#1A1A2E', marginBottom: '14px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              我的工单历史
              <span
                style={{
                  background: '#EDF2F7', color: '#1B3A5C',
                  borderRadius: '2px', padding: '1px 8px',
                  fontSize: '12px', fontWeight: '600',
                }}
              >
                {tickets.length}
              </span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tickets.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#8C9AAF', fontSize: '13px', padding: '20px 0' }}>
                  暂无工单，请提交第一个工单
                </div>
              ) : (
                tickets.slice(0, 5).map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))
              )}
              {tickets.length > 5 && (
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#8C9AAF', padding: '8px 0' }}>
                  … 共 {tickets.length} 条，更多内容开发中
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 右侧：卡片区 (35%) ── */}
        <div
          style={{
            flex: '0 0 34%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'sticky',
            top: '80px',
          }}
        >
          {/* 留言提醒卡片 */}
          <MessageCard
            messages={messages}
            unreadCount={unreadMessages.length}
            onOpen={() => setView('messages')}
          />

          {/* 待评价入口卡片 */}
          <EvaluationCard
            pendingTickets={pendingEvalTickets}
            onOpen={() => setView('evaluation')}
          />

          {/* 快速统计卡片 */}
          <StatsCard tickets={tickets} evaluatedIds={evaluatedIds} statusLabel={STATUS_LABEL} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   工单行（历史列表用）
───────────────────────────────────────────── */
function TicketRow({ ticket }) {
  const statusText = ticket.dispatch_status || STATUS_LABEL[ticket.status] || ticket.status;

  const STATUS_COLOR = {
    '待派单': { dot: '#D4880F', bg: '#FFF8E6' },
    '派单中': { dot: '#1B3A5C', bg: '#EDF2F7' },
    '已接受': { dot: '#1B3A5C', bg: '#EDF2F7' },
    '处理中': { dot: '#1E8449', bg: '#E8F5E9' },
    '已完结': { dot: '#1B3A5C', bg: '#EDF2F7' },
  };
  const sc = STATUS_COLOR[statusText] || { dot: '#8C9AAF', bg: '#F0F2F5' };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px',
        background: '#F0F2F5', borderRadius: '4px',
        border: '1px solid #E8ECF0',
        fontSize: '13px',
      }}
    >
      <span
        style={{
          width: '8px', height: '8px',
          background: sc.dot, borderRadius: '50%', flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        #{ticket.id} {ticket.title}
      </span>
      <span style={{ color: '#8C9AAF', flexShrink: 0 }}>
        {(ticket.location || '').length > 8 ? ticket.location.slice(0, 8) + '…' : ticket.location}
      </span>
      {ticket.isTimeout === 1 && (
        <span style={{ color: '#C0392B', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>超时</span>
      )}
      <span
        style={{
          background: sc.bg, color: sc.dot,
          padding: '2px 8px', borderRadius: '2px',
          fontSize: '11px', fontWeight: '600', flexShrink: 0,
        }}
      >
        {statusText}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   快速统计卡片
───────────────────────────────────────────── */
function StatsCard({ tickets, evaluatedIds, statusLabel }) {
  const total    = tickets.length;
  const done     = tickets.filter(t => t.status === 'completed').length;
  const pending  = tickets.filter(t => t.status === 'created' || t.status === 'dispatched').length;
  const evalDone = [...evaluatedIds].length;

  const items = [
    { label: '总工单',  value: total,   color: '#1B3A5C' },
    { label: '已完成',  value: done,    color: '#1E8449' },
    { label: '处置中',  value: pending, color: '#D4880F' },
    { label: '已评价',  value: evalDone,color: '#C5A55A' },
  ];

  return (
    <div
      style={{
        background: '#fff', borderRadius: '4px',
        boxShadow: '0 1px 4px rgba(27,58,92,0.06)',
        border: '1px solid #E8ECF0',
        padding: '16px 20px',
      }}
    >
      <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A2E', marginBottom: '12px' }}>
        数据概览
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              background: '#F0F2F5', borderRadius: '4px',
              padding: '10px 12px', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: '700', color: item.color }}>
              {item.value}
            </div>
            <div style={{ fontSize: '11px', color: '#8C9AAF', marginTop: '2px' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
