import React, { useState, useEffect, useCallback } from 'react';
import {
  getTickets, updateDispatchStatus, getMessages, sendMessage,
  markTicketMessagesRead, getFlowTemplates, bindFlow, updateProgress,
  getAISuggestion, getDispatchers,
} from '../api';
import { Card, Btn, Modal, fmtTime } from './citizen/ui';

/* ── 状态映射 ── */
const STATUS_MAP = {
  created:    { text: '待派单', bg: '#FFF3E0', color: '#E67E22' },
  dispatched: { text: '处置中', bg: '#E8F5E9', color: '#27AE60' },
  completed:  { text: '已完成', bg: '#E8F0FE', color: '#1658AF' },
};
const DS_MAP = {
  '待派单': { bg: '#FFF3E0', color: '#E67E22' },
  '派单中': { bg: '#F3E8FF', color: '#8E44AD' },
  '已接受': { bg: '#E8F0FE', color: '#1658AF' },
  '处理中': { bg: '#E8F5E9', color: '#27AE60' },
  '已完结': { bg: '#E8F0FE', color: '#1658AF' },
};

function StatusBadge({ status }) {
  const s = DS_MAP[status] || STATUS_MAP[status] || { bg: '#f5f7fa', color: '#909399' };
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>{status}</span>;
}

/* ── 获取当前用户信息 ── */
function getUserName() {
  return sessionStorage.getItem('displayName') || '处置人员';
}
function getUsername() {
  return sessionStorage.getItem('userId') || 'dispatcher1';
}

/* ─────────────────────────────────────────────
   处置人员工作台
───────────────────────────────────────────── */
export default function DispatcherPage() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all'); // all | 待派单 | 已接受 | 处理中 | 已完结
  const [loading, setLoading] = useState(true);
  const [flowTemplates, setFlowTemplates] = useState([]);

  // 加载工单
  const fetchTickets = useCallback(async () => {
    try {
      const params = {};
      if (filter !== 'all') params.dispatch_status = filter;
      const data = await getTickets(params);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('加载工单失败:', err);
    }
  }, [filter]);

  // 加载流程模板
  useEffect(() => {
    getFlowTemplates().then(d => setFlowTemplates(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  // 过滤显示
  const displayTickets = filter === 'all'
    ? tickets
    : tickets.filter(t => t.dispatch_status === filter);

  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.dispatch_status === '待派单').length,
    accepted: tickets.filter(t => t.dispatch_status === '已接受').length,
    processing: tickets.filter(t => t.dispatch_status === '处理中').length,
    done: tickets.filter(t => t.dispatch_status === '已完结').length,
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#909399' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        正在加载处置工作台…
      </div>
    );
  }

  return (
    <div>
      {/* 页头 */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a2a3a', marginBottom: '4px' }}>
          🔧 工单处置工作台
        </h2>
        <p style={{ fontSize: '13px', color: '#909399' }}>
          {getUserName()} · 共 {tickets.length} 条工单
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: '全部', value: stats.total, color: '#1658AF', bg: '#e8f0fe' },
          { label: '待派单', value: stats.pending, color: '#E67E22', bg: '#FFF3E0' },
          { label: '已接受', value: stats.accepted, color: '#1658AF', bg: '#E8F0FE' },
          { label: '处理中', value: stats.processing, color: '#27AE60', bg: '#E8F5E9' },
          { label: '已完结', value: stats.done, color: '#8E44AD', bg: '#F3E8FF' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#909399', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 过滤标签 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['all', '待派单', '已接受', '处理中', '已完结'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: '1.5px solid',
              borderColor: filter === f ? '#0A2B4E' : '#e4e7ed',
              background: filter === f ? '#0A2B4E' : '#fff',
              color: filter === f ? '#fff' : '#606266',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {f === 'all' ? '全部' : f}
          </button>
        ))}
      </div>

      {/* 工单列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '14px', color: '#c0c4cc' }}>
            暂无{filter === 'all' ? '' : filter}工单
          </div>
        ) : (
          displayTickets.map(t => (
            <TicketDetailCard
              key={t.id}
              ticket={t}
              flowTemplates={flowTemplates}
              onStatusChange={fetchTickets}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   工单详情卡片（处置人员用）
───────────────────────────────────────────── */
function TicketDetailCard({ ticket, flowTemplates, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [msgDraft, setMsgDraft] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMessages = async () => {
    try {
      const data = await getMessages({ ticketId: ticket.id });
      setMsgs(Array.isArray(data) ? data : []);
    } catch {}
  };

  const toggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      await loadMessages();
    }
  };

  // 状态变更
  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      await updateDispatchStatus(ticket.id, newStatus);
      onStatusChange();
    } catch (err) {
      console.error('状态更新失败:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 发送留言
  const handleSendMsg = async () => {
    if (!msgDraft.trim()) return;
    try {
      await sendMessage({
        ticket_id: ticket.id,
        sender_role: 'dispatcher',
        sender_name: getUserName(),
        content: msgDraft.trim(),
      });
      setMsgDraft('');
      await loadMessages();
    } catch {}
  };

  // AI 建议
  const handleGetAI = async () => {
    setLoadingAI(true);
    try {
      const result = await getAISuggestion(ticket);
      setAiSuggestion(result.suggestion || '暂无建议');
    } catch {
      setAiSuggestion('AI 暂时不可用');
    } finally {
      setLoadingAI(false);
    }
  };

  const ds = ticket.dispatch_status || '待派单';

  // 按钮组（根据状态显示不同操作）
  const renderActions = () => {
    if (ds === '待派单') {
      return (
        <Btn variant="primary" size="sm" onClick={() => handleStatusChange('派单中')} disabled={actionLoading}>
          开始派单
        </Btn>
      );
    }
    if (ds === '派单中') {
      return (
        <Btn variant="success" size="sm" onClick={() => handleStatusChange('已接受')} disabled={actionLoading}>
          接受工单
        </Btn>
      );
    }
    if (ds === '已接受') {
      return (
        <Btn variant="primary" size="sm" onClick={() => handleStatusChange('处理中')} disabled={actionLoading}>
          开始处置
        </Btn>
      );
    }
    if (ds === '处理中') {
      return (
        <Btn variant="warning" size="sm" onClick={() => handleStatusChange('已完结')} disabled={actionLoading}>
          标记完结
        </Btn>
      );
    }
    return <span style={{ fontSize: '13px', color: '#909399' }}>已办结</span>;
  };

  // 流程进度
  const renderFlowProgress = () => {
    const progress = ticket.flow_progress;
    if (!progress || typeof progress !== 'object') return null;
    const steps = Object.entries(progress);
    if (steps.length === 0) return null;
    const done = steps.filter(([, v]) => v).length;
    return (
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontSize: '12px', color: '#606266', marginBottom: '6px' }}>
          流程进度：{done}/{steps.length} 步
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {steps.map(([key, completed], idx) => (
            <span key={key} style={{
              padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
              background: completed ? '#E8F5E9' : '#f0f0f0',
              color: completed ? '#27AE60' : '#909399',
            }}>
              第{idx + 1}步 {completed ? '✓' : '○'}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card padding="16px 20px">
      {/* 主行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontWeight: '700', fontSize: '15px', color: '#1a2a3a' }}>
              #{ticket.id} {ticket.title}
            </span>
            <StatusBadge status={ds} />
            {ticket.isTimeout === 1 && (
              <span style={{ color: '#E74C3C', fontSize: '11px', fontWeight: '700' }}>⚠ 超时</span>
            )}
            {ticket.isDuplicate === 1 && (
              <span style={{ color: '#E67E22', fontSize: '11px', fontWeight: '700' }}>🔄 重复</span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: '#606266', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>📍 {ticket.location}</span>
            <span>👤 {ticket.reporter}</span>
            <span>🕐 {fmtTime(ticket.createdAt)}</span>
            {ticket.department && <span>🏢 {ticket.department}</span>}
          </div>
          <div style={{ fontSize: '13px', color: '#909399', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ticket.content}
          </div>
          {renderFlowProgress()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {renderActions()}
          <Btn variant="ghost" size="sm" onClick={toggleExpand}>
            {expanded ? '收起' : '详情'}
          </Btn>
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
          {/* AI 建议 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px' }}>🤖</span>
              <span style={{ fontWeight: '600', fontSize: '14px', color: '#1a2a3a' }}>AI 智能建议</span>
              {!aiSuggestion && (
                <Btn variant="ghost" size="sm" onClick={handleGetAI} disabled={loadingAI}>
                  {loadingAI ? '分析中…' : '获取建议'}
                </Btn>
              )}
            </div>
            {aiSuggestion && (
              <div style={{ background: '#f0f7ff', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#303133', lineHeight: 1.7 }}>
                {aiSuggestion}
              </div>
            )}
          </div>

          {/* 留言记录 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a2a3a', marginBottom: '10px' }}>
              💬 沟通记录（{msgs.length}）
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {msgs.length === 0 ? (
                <div style={{ color: '#c0c4cc', fontSize: '13px', textAlign: 'center', padding: '12px' }}>暂无沟通记录</div>
              ) : (
                msgs.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', flexDirection: m.sender_role === 'dispatcher' ? 'row-reverse' : 'row',
                    alignItems: 'flex-end', gap: '8px',
                  }}>
                    <div style={{
                      maxWidth: '70%',
                      background: m.sender_role === 'dispatcher' ? '#0A2B4E' : '#f0f4ff',
                      color: m.sender_role === 'dispatcher' ? '#fff' : '#303133',
                      borderRadius: m.sender_role === 'dispatcher' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                      padding: '8px 12px', fontSize: '13px', lineHeight: 1.5,
                    }}>
                      <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '3px' }}>
                        {m.sender_name} · {fmtTime(m.created_at)}
                      </div>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 回复输入 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={msgDraft}
              onChange={e => setMsgDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMsg(); }}
              placeholder="回复市民…"
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '8px',
                border: '1.5px solid #e4e7ed', fontSize: '13px', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <Btn variant="primary" size="sm" onClick={handleSendMsg} disabled={!msgDraft.trim()}>
              发送
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
