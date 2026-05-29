import React, { useState, useRef, useEffect } from 'react';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
import { Card, Btn, fmtTime } from './ui';

/* ─────────────────────────────────────────────
   状态显示映射
───────────────────────────────────────────── */
const STATUS_TEXT = {
  created: '待派单',
  dispatched: '处置中',
  completed: '已完成',
};
const DISPATCH_STATUS_TEXT = {
  '待派单': '待派单',
  '派单中': '派单中',
  '已接受': '已接受',
  '处理中': '处理中',
  '已完结': '已完结',
};

function getStatusText(ticket) {
  return ticket.dispatch_status || STATUS_TEXT[ticket.status] || ticket.status;
}

function StatusBadge({ status }) {
  const map = {
    '待派单':  { bg: '#FFF8E6', color: '#D4880F' },
    '派单中':  { bg: '#EDF2F7', color: '#1B3A5C' },
    '已接受':  { bg: '#EDF2F7', color: '#1B3A5C' },
    '处理中':  { bg: '#E8F5E9', color: '#1E8449' },
    '已完结':  { bg: '#EDF2F7', color: '#1B3A5C' },
    '已完成':  { bg: '#EDF2F7', color: '#1B3A5C' },
    '处置中':  { bg: '#E8F5E9', color: '#1E8449' },
  };
  const { bg = '#F0F2F5', color = '#8C9AAF' } = map[status] || {};
  return (
    <span
      style={{
        background: bg, color,
        padding: '3px 10px', borderRadius: '2px',
        fontSize: '12px', fontWeight: '600',
      }}
    >
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────
   留言卡片（主工作台右上角）
───────────────────────────────────────────── */
export function MessageCard({ messages, unreadCount, onOpen }) {
  const unread = unreadCount !== undefined
    ? unreadCount
    : messages.filter((m) => !m.is_read && m.sender_role !== 'citizen').length;
  const latest = messages.find(m => !m.is_read && m.sender_role !== 'citizen') || messages[messages.length - 1];

  return (
    <Card style={{ cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A2E' }}>留言提醒</h4>
          {unread > 0 && (
            <span
              style={{
                background: '#C0392B', color: '#fff',
                borderRadius: '2px', padding: '1px 7px',
                fontSize: '11px', fontWeight: '700',
              }}
            >
              {unread} 条未读
            </span>
          )}
        </div>
        <Btn size="sm" variant="ghost" onClick={onOpen}>查看全部</Btn>
      </div>

      {latest ? (
        <div
          onClick={onOpen}
          style={{
            background: '#F0F2F5',
            borderRadius: '4px',
            padding: '12px 14px',
            cursor: 'pointer',
            border: '1px solid #E8ECF0',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#E8ECF0')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#F0F2F5')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1B3A5C' }}>
              {latest.sender_name || '系统'}
            </span>
            <span style={{ fontSize: '11px', color: '#8C9AAF' }}>· {fmtTime(latest.created_at)}</span>
            {!latest.is_read && (
              <span
                style={{
                  width: '7px', height: '7px',
                  background: '#C0392B', borderRadius: '50%',
                  display: 'inline-block', marginLeft: '2px',
                }}
              />
            )}
          </div>
          <div
            style={{
              fontSize: '13px', color: '#5A6A7A',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.6,
            }}
          >
            {latest.content}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#8C9AAF', fontSize: '13px', padding: '20px 0' }}>
          暂无留言
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────────────────────────────
   留言完整视图
   view: 'list'（选工单） | 'thread'（消息线程）
───────────────────────────────────────────── */
export function MessageView({ tickets, messages, onAddMessage, onMarkRead, onBack, statusLabel }) {
  const [subView,  setSubView]  = useState('list');
  const [selTicket, setSelTicket] = useState(null);
  const [threadMsgs, setThreadMsgs] = useState([]);
  const [draft,    setDraft]    = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  // 根据工单过滤消息
  useEffect(() => {
    if (subView === 'thread' && selTicket) {
      const filtered = messages.filter((m) => m.ticket_id === selTicket.id);
      setThreadMsgs(filtered);
    }
  }, [subView, selTicket, messages]);

  // 自动滚到底部
  useEffect(() => {
    if (subView === 'thread') {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [subView, threadMsgs.length]);

  const handleSelectTicket = (ticket) => {
    setSelTicket(ticket);
    setSubView('thread');
    setDraft('');
    // 标记已读
    onMarkRead(ticket.id);
  };

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await onAddMessage({
        ticket_id: selTicket.id,
        sender_role: 'citizen',
        sender_name: sessionStorage.getItem('displayName') || '市民',
        content: draft.trim(),
      });
      setDraft('');
    } catch (err) {
      console.error('发送失败:', err);
    } finally {
      setSending(false);
    }
  };

  // 计算每个工单的未读数
  const getUnreadCount = (ticketId) =>
    messages.filter(m => m.ticket_id === ticketId && !m.is_read && m.sender_role !== 'citizen').length;

  // ── 工单选择列表 ──
  if (subView === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Btn size="sm" variant="ghost" onClick={onBack}>
            <FaArrowLeft size={11} /> 返回工作台
          </Btn>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A2E' }}>留言 / 消息</h3>
        </div>
        <p style={{ fontSize: '13px', color: '#8C9AAF', marginBottom: '16px' }}>
          选择工单，查看与处置人员的往来留言
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8C9AAF', fontSize: '13px', padding: '40px 0' }}>
              暂无工单
            </div>
          ) : (
            tickets.map((t) => {
              const unreadN = getUnreadCount(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  style={{
                    background: '#fff',
                    borderRadius: '4px',
                    padding: '14px 18px',
                    cursor: 'pointer',
                    border: '1px solid #E8ECF0',
                    boxShadow: '0 1px 4px rgba(27,58,92,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(27,58,92,0.1)';
                    e.currentTarget.style.borderColor = '#D9DEE6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(27,58,92,0.06)';
                    e.currentTarget.style.borderColor = '#E8ECF0';
                  }}
                >
                  <div
                    style={{
                      width: '40px', height: '40px', borderRadius: '4px',
                      background: '#EDF2F7', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '700', color: '#1B3A5C',
                    }}
                  >
                    {t.id}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1A1A2E', marginBottom: '4px' }}>
                      #{t.id} {t.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8C9AAF' }}>
                      {t.location} · {fmtTime(t.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <StatusBadge status={getStatusText(t)} />
                    {unreadN > 0 && (
                      <span
                        style={{
                          background: '#C0392B', color: '#fff',
                          borderRadius: '2px', padding: '1px 7px',
                          fontSize: '11px', fontWeight: '700',
                        }}
                      >
                        {unreadN}
                      </span>
                    )}
                    <span style={{ color: '#8C9AAF', fontSize: '16px' }}>›</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ── 消息线程 ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 头部 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '16px', paddingBottom: '14px',
          borderBottom: '1px solid #E8ECF0',
        }}
      >
        <Btn size="sm" variant="ghost" onClick={() => setSubView('list')}>
          <FaArrowLeft size={11} /> 返回列表
        </Btn>
        <div>
          <div style={{ fontWeight: '700', fontSize: '18px', color: '#1A1A2E' }}>
            工单 #{selTicket.id} · {selTicket.title}
          </div>
          <div style={{ fontSize: '12px', color: '#8C9AAF' }}>
            {selTicket.location}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusBadge status={getStatusText(selTicket)} />
        </div>
      </div>

      {/* 消息气泡列表 */}
      <div
        style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '12px',
          marginBottom: '16px',
          padding: '4px 0',
          minHeight: '200px', maxHeight: '400px',
        }}
      >
        {threadMsgs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8C9AAF', fontSize: '13px', marginTop: '40px' }}>
            暂无消息，先发一条吧
          </div>
        ) : (
          threadMsgs.map((msg) => {
            const isMine = msg.sender_role === 'citizen';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: isMine ? 'row-reverse' : 'row',
                  alignItems: 'flex-end', gap: '8px',
                }}
              >
                {/* 头像 */}
                <div
                  style={{
                    width: '32px', height: '32px', borderRadius: '4px',
                    background: isMine ? '#1B3A5C' : '#5A6A7A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', flexShrink: 0, color: '#fff', fontWeight: '700',
                  }}
                >
                  {isMine ? '我' : '员'}
                </div>
                {/* 气泡 */}
                <div style={{ maxWidth: '70%' }}>
                  <div
                    style={{
                      fontSize: '11px', color: '#8C9AAF', marginBottom: '4px',
                      textAlign: isMine ? 'right' : 'left',
                    }}
                  >
                    {msg.sender_name || (isMine ? '我' : '处置人员')} · {fmtTime(msg.created_at)}
                  </div>
                  <div
                    style={{
                      background: isMine ? '#1B3A5C' : '#F0F4F8',
                      color: isMine ? '#fff' : '#1A1A2E',
                      borderRadius: '4px',
                      padding: '10px 14px',
                      fontSize: '13px', lineHeight: 1.6,
                    }}
                  >
                    {msg.content}
                  </div>
                  {isMine && !msg.is_read && (
                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#8C9AAF', marginTop: '3px' }}>
                      已发送
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区域 */}
      <div
        style={{
          display: 'flex', gap: '10px', alignItems: 'flex-end',
          background: '#F0F2F5', borderRadius: '4px', padding: '12px',
          border: '1px solid #D9DEE6',
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="输入留言内容（Enter 发送，Shift+Enter 换行）…"
          rows={2}
          disabled={sending}
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent', fontSize: '13px',
            color: '#1A1A2E', resize: 'none', fontFamily: 'inherit',
            lineHeight: 1.6,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          style={{
            background: draft.trim() && !sending ? '#1B3A5C' : '#D9DEE6',
            color: draft.trim() && !sending ? '#fff' : '#8C9AAF',
            border: 'none', borderRadius: '2px',
            padding: '8px 14px', cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            flexShrink: 0, transition: 'background 0.2s',
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '13px', fontWeight: '600',
          }}
        >
          <FaPaperPlane size={13} /> {sending ? '发送中…' : '发送'}
        </button>
      </div>
    </div>
  );
}
