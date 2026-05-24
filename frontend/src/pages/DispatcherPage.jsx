import React, { useState, useEffect, useCallback } from 'react';
import {
  getTickets, updateDispatchStatus, getMessages, sendMessage,
  markTicketMessagesRead, getFlowTemplates, bindFlow, updateProgress,
  getAISuggestion, getDispatchers,
} from '../api';
import { Card, Btn, Modal, fmtTime } from './citizen/ui';
import { FaComments, FaLock } from 'react-icons/fa';

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
  const [internalMsgs, setInternalMsgs] = useState([]);
  const [msgDraft, setMsgDraft] = useState('');
  const [internalDraft, setInternalDraft] = useState('');
  const [showInternal, setShowInternal] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMessages = async () => {
    try {
      const [pub, internal] = await Promise.all([
        getMessages({ ticketId: ticket.id, is_internal: 0 }),
        getMessages({ ticketId: ticket.id, is_internal: 1 }),
      ]);
      setMsgs(Array.isArray(pub) ? pub : []);
      setInternalMsgs(Array.isArray(internal) ? internal : []);
    } catch {}
  };

  const toggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next) await loadMessages();
  };

  // 状态变更
  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      await updateDispatchStatus(ticket.id, newStatus);
      onStatusChange();
    } catch (err) {
      console.error('状态更新失败:', err);
    } finally { setActionLoading(false); }
  };

  // 发送公开留言（市民可见）
  const handleSendMsg = async () => {
    if (!msgDraft.trim()) return;
    try {
      await sendMessage({
        ticket_id: ticket.id, sender_role: 'dispatcher',
        sender_name: getUserName(), content: msgDraft.trim(), is_internal: 0,
      });
      setMsgDraft('');
      await loadMessages();
    } catch {}
  };

  // 发送内部消息（仅管理员可见）
  const handleSendInternal = async () => {
    if (!internalDraft.trim()) return;
    try {
      await sendMessage({
        ticket_id: ticket.id, sender_role: 'dispatcher',
        sender_name: getUserName(), content: internalDraft.trim(), is_internal: 1,
      });
      setInternalDraft('');
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
    } finally { setLoadingAI(false); }
  };

  const ds = ticket.dispatch_status || '待派单';

  const renderActions = () => {
    if (ds === '待派单') return <Btn variant="primary" size="sm" onClick={() => handleStatusChange('派单中')} disabled={actionLoading}>开始派单</Btn>;
    if (ds === '派单中') return <Btn variant="success" size="sm" onClick={() => handleStatusChange('已接受')} disabled={actionLoading}>接受工单</Btn>;
    if (ds === '已接受') return <Btn variant="primary" size="sm" onClick={() => handleStatusChange('处理中')} disabled={actionLoading}>开始处置</Btn>;
    if (ds === '处理中') return <Btn variant="warning" size="sm" onClick={() => handleStatusChange('已完结')} disabled={actionLoading}>标记完结</Btn>;
    return <span style={{ fontSize:'13px', color:'#909399' }}>已办结</span>;
  };

  const renderFlowProgress = () => {
    const progress = ticket.flow_progress;
    if (!progress || typeof progress !== 'object') return null;
    const steps = Object.entries(progress);
    if (steps.length === 0) return null;
    const done = steps.filter(([, v]) => v).length;
    return (
      <div style={{ marginTop:'12px' }}>
        <div style={{ fontSize:'12px', color:'#606266', marginBottom:'6px' }}>流程进度：{done}/{steps.length} 步</div>
        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
          {steps.map(([key, completed], idx) => (
            <span key={key} style={{
              padding:'3px 8px', borderRadius:'6px', fontSize:'11px',
              background: completed ? '#E8F5E9' : '#f0f0f0',
              color: completed ? '#27AE60' : '#909399',
            }}>第{idx+1}步 {completed ? '✓' : '○'}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card padding="16px 20px">
      {/* 主行 */}
      <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
            <span style={{ fontWeight:'700', fontSize:'15px', color:'#1a2a3a' }}>#{ticket.id} {ticket.title}</span>
            <StatusBadge status={ds} />
            {ticket.isTimeout === 1 && <span style={{ color:'#E74C3C', fontSize:'11px', fontWeight:'700' }}>⚠ 超时</span>}
            {ticket.isDuplicate === 1 && <span style={{ color:'#E67E22', fontSize:'11px', fontWeight:'700' }}>🔄 重复</span>}
          </div>
          <div style={{ fontSize:'13px', color:'#606266', display:'flex', gap:'16px', flexWrap:'wrap' }}>
            <span>📍 {ticket.location}</span>
            <span>👤 {ticket.reporter}</span>
            <span>🕐 {fmtTime(ticket.createdAt)}</span>
            {ticket.department && <span>🏢 {ticket.department}</span>}
          </div>
          <div style={{ fontSize:'13px', color:'#909399', marginTop:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {ticket.content}
          </div>
          {renderFlowProgress()}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
          {renderActions()}
          {/* 内部协作按钮 */}
          <button
            onClick={async () => {
              setShowInternal(true);
              if (!expanded) { setExpanded(true); await loadMessages(); }
              else await loadMessages();
            }}
            title="与管理员内部沟通"
            style={{
              background: internalMsgs.length > 0 ? '#e8f0fe' : 'rgba(22,88,175,0.08)',
              border:'1.5px solid #1658AF', borderRadius:'8px',
              padding:'6px 10px', cursor:'pointer', color:'#1658AF',
              display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', fontWeight:'600',
            }}
          >
            <FaLock size={11} />内部协作
            {internalMsgs.length > 0 && (
              <span style={{ background:'#1658AF', color:'#fff', borderRadius:'10px', padding:'0 5px', fontSize:'10px', minWidth:'16px', textAlign:'center' }}>
                {internalMsgs.length}
              </span>
            )}
          </button>
          <Btn variant="ghost" size="sm" onClick={toggleExpand}>
            {expanded ? '收起' : '详情'}
          </Btn>
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div style={{ marginTop:'16px', borderTop:'1px solid #f0f0f0', paddingTop:'16px' }}>
          {/* AI 建议 */}
          <div style={{ marginBottom:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
              <span style={{ fontSize:'14px' }}>🤖</span>
              <span style={{ fontWeight:'600', fontSize:'14px', color:'#1a2a3a' }}>AI 智能建议</span>
              {!aiSuggestion && (
                <Btn variant="ghost" size="sm" onClick={handleGetAI} disabled={loadingAI}>
                  {loadingAI ? '分析中…' : '获取建议'}
                </Btn>
              )}
            </div>
            {aiSuggestion && (
              <div style={{ background:'#f0f7ff', borderRadius:'10px', padding:'12px 14px', fontSize:'13px', color:'#303133', lineHeight:1.7 }}>
                {aiSuggestion}
              </div>
            )}
          </div>

          {/* Tab 切换：公开留言 / 内部协作 */}
          <div style={{ display:'flex', gap:'0', marginBottom:'12px', borderRadius:'8px', overflow:'hidden', border:'1.5px solid #e4e7ed', width:'fit-content' }}>
            <button
              onClick={() => setShowInternal(false)}
              style={{
                padding:'7px 16px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'600',
                background: !showInternal ? '#0A2B4E' : '#fff',
                color: !showInternal ? '#fff' : '#606266',
                display:'flex', alignItems:'center', gap:'5px',
              }}
            >
              <FaComments size={12} />公开留言 ({msgs.filter(m => m.sender_role !== 'citizen').length})
            </button>
            <button
              onClick={() => setShowInternal(true)}
              style={{
                padding:'7px 16px', border:'none', borderLeft:'1.5px solid #e4e7ed', cursor:'pointer', fontSize:'13px', fontWeight:'600',
                background: showInternal ? '#1658AF' : '#fff',
                color: showInternal ? '#fff' : '#606266',
                display:'flex', alignItems:'center', gap:'5px',
              }}
            >
              <FaLock size={11} />内部协作 ({internalMsgs.length})
            </button>
          </div>

          {/* 公开留言 */}
          {!showInternal && (
            <>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ maxHeight:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
                  {msgs.length === 0 ? (
                    <div style={{ color:'#c0c4cc', fontSize:'13px', textAlign:'center', padding:'12px' }}>暂无留言</div>
                  ) : (
                    msgs.map(m => (
                      <div key={m.id} style={{
                        display:'flex', flexDirection: m.sender_role === 'dispatcher' ? 'row-reverse' : 'row',
                        alignItems:'flex-end', gap:'8px',
                      }}>
                        <div style={{
                          maxWidth:'70%',
                          background: m.sender_role === 'dispatcher' ? '#0A2B4E' : '#f0f4ff',
                          color: m.sender_role === 'dispatcher' ? '#fff' : '#303133',
                          borderRadius: m.sender_role === 'dispatcher' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                          padding:'8px 12px', fontSize:'13px', lineHeight:1.5,
                        }}>
                          <div style={{ fontSize:'11px', opacity:0.7, marginBottom:'3px' }}>{m.sender_name} · {fmtTime(m.created_at)}</div>
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <input
                  value={msgDraft} onChange={e => setMsgDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendMsg(); }}
                  placeholder="回复市民（市民可见）…"
                  style={{ flex:1, padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e4e7ed', fontSize:'13px', outline:'none', fontFamily:'inherit' }}
                />
                <Btn variant="primary" size="sm" onClick={handleSendMsg} disabled={!msgDraft.trim()}>发送</Btn>
              </div>
            </>
          )}

          {/* 内部协作消息 */}
          {showInternal && (
            <>
              <div style={{ marginBottom:'8px' }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px',
                  background:'#fff8e1', border:'1px solid #ffd54f', borderRadius:'8px',
                  fontSize:'12px', color:'#f57c00', marginBottom:'10px',
                }}>
                  <FaLock size={11} />此处消息仅管理员与处置员内部可见，市民不会看到
                </div>
                <div style={{ maxHeight:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
                  {internalMsgs.length === 0 ? (
                    <div style={{ color:'#c0c4cc', fontSize:'13px', textAlign:'center', padding:'12px' }}>暂无内部消息</div>
                  ) : (
                    internalMsgs.map(m => (
                      <div key={m.id} style={{
                        display:'flex', flexDirection: m.sender_role === 'dispatcher' ? 'row-reverse' : 'row',
                        alignItems:'flex-end', gap:'8px',
                      }}>
                        <div style={{
                          maxWidth:'70%',
                          background: m.sender_role === 'dispatcher' ? '#1658AF' : '#fff3e0',
                          color: m.sender_role === 'dispatcher' ? '#fff' : '#e65100',
                          borderRadius: m.sender_role === 'dispatcher' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                          padding:'8px 12px', fontSize:'13px', lineHeight:1.5,
                          border: m.sender_role !== 'dispatcher' ? '1px solid #ffcc80' : 'none',
                        }}>
                          <div style={{ fontSize:'11px', opacity:0.75, marginBottom:'3px' }}>
                            🔒 {m.sender_name} · {fmtTime(m.created_at)}
                          </div>
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <input
                  value={internalDraft} onChange={e => setInternalDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendInternal(); }}
                  placeholder="发消息给管理员（内部可见）…"
                  style={{ flex:1, padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #ffcc80', fontSize:'13px', outline:'none', fontFamily:'inherit', background:'#fffde7' }}
                />
                <Btn size="sm" style={{ background:'#1658AF', color:'#fff', border:'none' }} onClick={handleSendInternal} disabled={!internalDraft.trim()}>发送</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
