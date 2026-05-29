import React, { useState, useEffect, useCallback } from 'react';
import {
  getTickets, updateDispatchStatus, getMessages, sendMessage,
  markTicketMessagesRead, getFlowTemplates, bindFlow, updateProgress,
  getAISuggestion, getDispatchers,
} from '../api';
import { Card, Btn, Modal, fmtTime } from './citizen/ui';
import { FaComments, FaLock } from 'react-icons/fa';

const STATUS_MAP = {
  created:    { text: '待派单', bg: '#FFF7E6', color: '#D4880F' },
  dispatched: { text: '处置中', bg: '#E6F7ED', color: '#1E8449' },
  completed:  { text: '已完成', bg: '#E6F0FF', color: '#1B3A5C' },
};
const DS_MAP = {
  '待派单': { bg: '#FFF7E6', color: '#D4880F' },
  '派单中': { bg: '#F0E6FF', color: '#7C3AED' },
  '已接受': { bg: '#E6F0FF', color: '#1B3A5C' },
  '处理中': { bg: '#E6F7ED', color: '#1E8449' },
  '已完结': { bg: '#E6F0FF', color: '#1B3A5C' },
};

function StatusBadge({ status }) {
  const s = DS_MAP[status] || STATUS_MAP[status] || { bg: '#F0F2F5', color: '#8C9AAF' };
  return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '2px', fontSize: '11px', fontWeight: '600' }}>{status}</span>;
}

function getUserName() {
  return sessionStorage.getItem('displayName') || '处置人员';
}
function getUsername() {
  return sessionStorage.getItem('userId') || 'dispatcher1';
}

export default function DispatcherPage() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [flowTemplates, setFlowTemplates] = useState([]);

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

  useEffect(() => {
    getFlowTemplates().then(d => setFlowTemplates(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

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
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#8C9AAF' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px', opacity:0.5 }}>加载中</div>
        正在加载处置工作台…
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A2E', marginBottom: '4px', letterSpacing:'0.5px' }}>
          工单处置工作台
        </h2>
        <p style={{ fontSize: '12px', color: '#8C9AAF' }}>
          {getUserName()} · 共 {tickets.length} 条工单
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: '全部', value: stats.total, color: '#1B3A5C', bg: '#E6F0FF' },
          { label: '待派单', value: stats.pending, color: '#D4880F', bg: '#FFF7E6' },
          { label: '已接受', value: stats.accepted, color: '#1B3A5C', bg: '#E6F0FF' },
          { label: '处理中', value: stats.processing, color: '#1E8449', bg: '#E6F7ED' },
          { label: '已完结', value: stats.done, color: '#7C3AED', bg: '#F0E6FF' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '4px', padding: '12px 14px', boxShadow: '0 1px 4px rgba(27,58,92,0.06)', textAlign: 'center', border:'1px solid #E8ECF0' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#8C9AAF', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 过滤标签 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {['all', '待派单', '已接受', '处理中', '已完结'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 14px',
              borderRadius: '2px',
              border: '1px solid',
              borderColor: filter === f ? '#1B3A5C' : '#D9DEE6',
              background: filter === f ? '#1B3A5C' : '#fff',
              color: filter === f ? '#fff' : '#5A6A7A',
              fontSize: '12px',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '4px', color: '#C0C4CC', border:'1px solid #E8ECF0' }}>
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

  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      await updateDispatchStatus(ticket.id, newStatus);
      onStatusChange();
    } catch (err) {
      console.error('状态更新失败:', err);
    } finally { setActionLoading(false); }
  };

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
    return <span style={{ fontSize:'12px', color:'#8C9AAF' }}>已办结</span>;
  };

  const renderFlowProgress = () => {
    const progress = ticket.flow_progress;
    if (!progress || typeof progress !== 'object') return null;
    const steps = Object.entries(progress);
    if (steps.length === 0) return null;
    const done = steps.filter(([, v]) => v).length;
    return (
      <div style={{ marginTop:'10px' }}>
        <div style={{ fontSize:'11px', color:'#5A6A7A', marginBottom:'4px' }}>流程进度：{done}/{steps.length} 步</div>
        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
          {steps.map(([key, completed], idx) => (
            <span key={key} style={{
              padding:'2px 8px', borderRadius:'2px', fontSize:'11px',
              background: completed ? '#E6F7ED' : '#F0F2F5',
              color: completed ? '#1E8449' : '#8C9AAF',
            }}>第{idx+1}步 {completed ? '✓' : '○'}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card padding="14px 18px">
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
            <span style={{ fontWeight:'600', fontSize:'14px', color:'#1A1A2E' }}>#{ticket.id} {ticket.title}</span>
            <StatusBadge status={ds} />
            {ticket.isTimeout === 1 && <span style={{ color:'#C0392B', fontSize:'11px', fontWeight:'600' }}>超时</span>}
            {ticket.isDuplicate === 1 && <span style={{ color:'#D4880F', fontSize:'11px', fontWeight:'600' }}>重复</span>}
          </div>
          <div style={{ fontSize:'12px', color:'#5A6A7A', display:'flex', gap:'14px', flexWrap:'wrap' }}>
            <span>{ticket.location}</span>
            <span>{ticket.reporter}</span>
            <span>{fmtTime(ticket.createdAt)}</span>
            {ticket.department && <span>{ticket.department}</span>}
          </div>
          <div style={{ fontSize:'12px', color:'#8C9AAF', marginTop:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {ticket.content}
          </div>
          {renderFlowProgress()}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
          {renderActions()}
          <button
            onClick={async () => {
              setShowInternal(true);
              if (!expanded) { setExpanded(true); await loadMessages(); }
              else await loadMessages();
            }}
            title="与管理员内部沟通"
            style={{
              background: internalMsgs.length > 0 ? '#E6F0FF' : 'rgba(27,58,92,0.05)',
              border:'1px solid #1B3A5C', borderRadius:'2px',
              padding:'4px 8px', cursor:'pointer', color:'#1B3A5C',
              display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:'600',
            }}
          >
            <FaLock size={10} />内部协作
            {internalMsgs.length > 0 && (
              <span style={{ background:'#1B3A5C', color:'#fff', borderRadius:'2px', padding:'0 4px', fontSize:'10px', minWidth:'14px', textAlign:'center' }}>
                {internalMsgs.length}
              </span>
            )}
          </button>
          <Btn variant="ghost" size="sm" onClick={toggleExpand}>
            {expanded ? '收起' : '详情'}
          </Btn>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop:'14px', borderTop:'1px solid #E8ECF0', paddingTop:'14px' }}>
          <div style={{ marginBottom:'14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
              <span style={{ fontWeight:'600', fontSize:'13px', color:'#1A1A2E' }}>AI 智能建议</span>
              {!aiSuggestion && (
                <Btn variant="ghost" size="sm" onClick={handleGetAI} disabled={loadingAI}>
                  {loadingAI ? '分析中…' : '获取建议'}
                </Btn>
              )}
            </div>
            {aiSuggestion && (
              <div style={{ background:'#F0F4F8', borderRadius:'4px', padding:'10px 12px', fontSize:'12px', color:'#1A1A2E', lineHeight:1.7, border:'1px solid #E8ECF0' }}>
                {aiSuggestion}
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:'0', marginBottom:'10px', borderRadius:'2px', overflow:'hidden', border:'1px solid #D9DEE6', width:'fit-content' }}>
            <button
              onClick={() => setShowInternal(false)}
              style={{
                padding:'5px 14px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'600',
                background: !showInternal ? '#1B3A5C' : '#fff',
                color: !showInternal ? '#fff' : '#5A6A7A',
                display:'flex', alignItems:'center', gap:'4px',
              }}
            >
              <FaComments size={11} />公开留言 ({msgs.filter(m => m.sender_role !== 'citizen').length})
            </button>
            <button
              onClick={() => setShowInternal(true)}
              style={{
                padding:'5px 14px', border:'none', borderLeft:'1px solid #D9DEE6', cursor:'pointer', fontSize:'12px', fontWeight:'600',
                background: showInternal ? '#1B3A5C' : '#fff',
                color: showInternal ? '#fff' : '#5A6A7A',
                display:'flex', alignItems:'center', gap:'4px',
              }}
            >
              <FaLock size={10} />内部协作 ({internalMsgs.length})
            </button>
          </div>

          {!showInternal && (
            <>
              <div style={{ marginBottom:'10px' }}>
                <div style={{ maxHeight:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'6px' }}>
                  {msgs.length === 0 ? (
                    <div style={{ color:'#C0C4CC', fontSize:'12px', textAlign:'center', padding:'12px' }}>暂无留言</div>
                  ) : (
                    msgs.map(m => (
                      <div key={m.id} style={{
                        display:'flex', flexDirection: m.sender_role === 'dispatcher' ? 'row-reverse' : 'row',
                        alignItems:'flex-end', gap:'6px',
                      }}>
                        <div style={{
                          maxWidth:'70%',
                          background: m.sender_role === 'dispatcher' ? '#1B3A5C' : '#F0F4F8',
                          color: m.sender_role === 'dispatcher' ? '#fff' : '#1A1A2E',
                          borderRadius: m.sender_role === 'dispatcher' ? '4px 4px 0 4px' : '4px 4px 4px 0',
                          padding:'6px 10px', fontSize:'12px', lineHeight:1.5,
                          border: m.sender_role !== 'dispatcher' ? '1px solid #E8ECF0' : 'none',
                        }}>
                          <div style={{ fontSize:'10px', opacity:0.7, marginBottom:'2px' }}>{m.sender_name} · {fmtTime(m.created_at)}</div>
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:'6px' }}>
                <input
                  value={msgDraft} onChange={e => setMsgDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendMsg(); }}
                  placeholder="回复市民（市民可见）…"
                  style={{ flex:1, padding:'6px 10px', borderRadius:'2px', border:'1px solid #D9DEE6', fontSize:'12px', outline:'none', fontFamily:'inherit' }}
                />
                <Btn variant="primary" size="sm" onClick={handleSendMsg} disabled={!msgDraft.trim()}>发送</Btn>
              </div>
            </>
          )}

          {showInternal && (
            <>
              <div style={{ marginBottom:'6px' }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:'4px', padding:'6px 10px',
                  background:'#FFF7E6', border:'1px solid #FFE4A0', borderRadius:'2px',
                  fontSize:'11px', color:'#D4880F', marginBottom:'8px',
                }}>
                  <FaLock size={10} />此处消息仅管理员与处置员内部可见，市民不会看到
                </div>
                <div style={{ maxHeight:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'6px' }}>
                  {internalMsgs.length === 0 ? (
                    <div style={{ color:'#C0C4CC', fontSize:'12px', textAlign:'center', padding:'12px' }}>暂无内部消息</div>
                  ) : (
                    internalMsgs.map(m => (
                      <div key={m.id} style={{
                        display:'flex', flexDirection: m.sender_role === 'dispatcher' ? 'row-reverse' : 'row',
                        alignItems:'flex-end', gap:'6px',
                      }}>
                        <div style={{
                          maxWidth:'70%',
                          background: m.sender_role === 'dispatcher' ? '#1B3A5C' : '#FFF7E6',
                          color: m.sender_role === 'dispatcher' ? '#fff' : '#8B6914',
                          borderRadius: m.sender_role === 'dispatcher' ? '4px 4px 0 4px' : '4px 4px 4px 0',
                          padding:'6px 10px', fontSize:'12px', lineHeight:1.5,
                          border: m.sender_role !== 'dispatcher' ? '1px solid #FFE4A0' : 'none',
                        }}>
                          <div style={{ fontSize:'10px', opacity:0.75, marginBottom:'2px' }}>
                            {m.sender_name} · {fmtTime(m.created_at)}
                          </div>
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:'6px' }}>
                <input
                  value={internalDraft} onChange={e => setInternalDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendInternal(); }}
                  placeholder="发消息给管理员（内部可见）…"
                  style={{ flex:1, padding:'6px 10px', borderRadius:'2px', border:'1px solid #FFE4A0', fontSize:'12px', outline:'none', fontFamily:'inherit', background:'#FFFCF0' }}
                />
                <button
                  onClick={handleSendInternal} disabled={!internalDraft.trim()}
                  style={{
                    padding:'5px 12px', borderRadius:'2px', border:'none', cursor: internalDraft.trim() ? 'pointer' : 'not-allowed',
                    background: internalDraft.trim() ? '#1B3A5C' : '#E8ECF0',
                    color: internalDraft.trim() ? '#fff' : '#8C9AAF',
                    fontSize:'12px', fontWeight:'600', flexShrink:0,
                  }}
                >发送</button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
