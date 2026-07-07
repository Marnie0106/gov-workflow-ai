import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTickets, countTickets, updateDispatchStatus, getMessages, sendMessage,
  markTicketMessagesRead, getFlowTemplates, bindFlow, updateProgress,
  getAISuggestion, getDispatchers, updateTicketFields,
} from '../api';
import { Card, Btn, Modal } from './citizen/ui';
import { StatusBadge, fmtTime, getUserName, Loading, EmptyState } from '../components/Common';
import { useToast } from '../components/Toast';
import { FaComments, FaLock, FaRobot, FaEye } from 'react-icons/fa';
import { SearchBar, Pagination } from '../components/SearchPaginate';
import TicketDetailModal from '../components/TicketDetailModal';

export default function DispatcherPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flowTemplates, setFlowTemplates] = useState([]);
  const [detailTicketId, setDetailTicketId] = useState(null);
  const PAGE_SIZE = 20;

  const fetchTickets = useCallback(async () => {
    try {
      const params = {};
      if (filter !== 'all') params.dispatch_status = filter;
      const [data, countData] = await Promise.all([
        getTickets({ ...params, keyword: keyword || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
        countTickets({ ...params, keyword: keyword || undefined }),
      ]);
      setTickets(Array.isArray(data) ? data : []);
      setTotal(countData?.count || 0);
    } catch {
      toast('加载工单失败，请检查网络', 'error');
    }
  }, [filter, keyword, page, toast]);

  useEffect(() => {
    getFlowTemplates().then(d => setFlowTemplates(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  const displayTickets = useMemo(() =>
    filter === 'all' ? tickets : tickets.filter(t => t.dispatch_status === filter),
    [filter, tickets]);

  const stats = useMemo(() => ({
    total: tickets.length,
    pending: tickets.filter(t => t.dispatch_status === '待派单').length,
    accepted: tickets.filter(t => t.dispatch_status === '已接受').length,
    processing: tickets.filter(t => t.dispatch_status === '处理中').length,
    done: tickets.filter(t => t.dispatch_status === '已完结').length,
  }), [tickets]);

  if (loading) return <Loading text="正在加载处置工作台…" />;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A2E', marginBottom: '6px', letterSpacing:'0.5px' }}>
          工单处置工作台
        </h2>
        <p style={{ fontSize: '14px', color: '#8C9AAF' }}>
          {getUserName('处置人员')} · 共 {tickets.length} 条工单
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px', marginBottom: '20px',
      }}>
        {[
          { label: '全部', value: stats.total, color: '#1B3A5C', bg: '#E6F0FF', gradient:'linear-gradient(135deg, #1B3A5C 0%, #2A5A8C 100%)' },
          { label: '待派单', value: stats.pending, color: '#D4880F', bg: '#FFF7E6', gradient:'linear-gradient(135deg, #D4880F 0%, #F0B030 100%)' },
          { label: '已接受', value: stats.accepted, color: '#1B3A5C', bg: '#E6F0FF', gradient:'linear-gradient(135deg, #1B3A5C 0%, #3858E6 100%)' },
          { label: '处理中', value: stats.processing, color: '#1E8449', bg: '#E6F7ED', gradient:'linear-gradient(135deg, #1E8449 0%, #2ECC71 100%)' },
          { label: '已完结', value: stats.done, color: '#7C3AED', bg: '#F0E6FF', gradient:'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', padding: '14px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center', border:'1px solid #EDF2F7', transition:'all 0.25s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; }}
          >
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#8C9AAF', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 搜索框 + 过滤标签 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <SearchBar
          value={keyword}
          onChange={(v) => { setKeyword(v); setPage(1); }}
          placeholder="搜索工单（标题/地点/内容）…"
        />
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {['all', '待派单', '已接受', '处理中', '已完结'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 14px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: filter === f ? '#1B3A5C' : '#E4E7ED',
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
          <EmptyState icon="📋" text={`暂无${filter === 'all' ? '' : filter}工单`} />
        ) : (
          displayTickets.map(t => (
            <TicketDetailCard
              key={t.id}
              ticket={t}
              flowTemplates={flowTemplates}
              onStatusChange={fetchTickets}
              onViewDetail={() => setDetailTicketId(t.id)}
            />
          ))
        )}
        {displayTickets.length > 0 && total > PAGE_SIZE && (
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        )}
      </div>

      {/* 工单详情弹窗 */}
      <TicketDetailModal
        open={detailTicketId !== null}
        ticketId={detailTicketId}
        onClose={() => setDetailTicketId(null)}
      />
    </div>
  );
}

function TicketDetailCard({ ticket, flowTemplates, onStatusChange, onViewDetail }) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [internalMsgs, setInternalMsgs] = useState([]);
  const [msgDraft, setMsgDraft] = useState('');
  const [internalDraft, setInternalDraft] = useState('');
  const [expandTab, setExpandTab] = useState(0); // 0=AI助手, 1=公开留言, 2=内部协作
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editDept, setEditDept] = useState(false);
  const [editDeptValue, setEditDeptValue] = useState('');

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
      toast(`工单 #${ticket.id} 状态已更新`, 'success');
      onStatusChange();
    } catch {
      toast('状态更新失败，请重试', 'error');
    } finally { setActionLoading(false); }
  };

  const handleSendMsg = async () => {
    if (!msgDraft.trim()) return;
    try {
      await sendMessage({
        ticket_id: ticket.id, sender_role: 'dispatcher',
        sender_name: getUserName('处置人员'), content: msgDraft.trim(), is_internal: 0,
      });
      setMsgDraft('');
      await loadMessages();
      toast('消息已发送', 'success');
    } catch {
      toast('发送失败', 'error');
    }
  };

  const handleSendInternal = async () => {
    if (!internalDraft.trim()) return;
    try {
      await sendMessage({
        ticket_id: ticket.id, sender_role: 'dispatcher',
        sender_name: getUserName('处置人员'), content: internalDraft.trim(), is_internal: 1,
      });
      setInternalDraft('');
      await loadMessages();
      toast('内部消息已发送', 'success');
    } catch {
      toast('发送失败', 'error');
    }
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

  const handleSaveDept = async () => {
    if (!editDeptValue.trim()) return;
    try {
      await updateTicketFields(ticket.id, { department: editDeptValue.trim() });
      toast(`工单 #${ticket.id} 派单部门已更新为「${editDeptValue.trim()}」`, 'success');
      setEditDept(false);
      onStatusChange();
    } catch {
      toast('修改失败', 'error');
    }
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
              padding:'2px 8px', borderRadius:'4px', fontSize:'11px',
              background: completed ? '#E6F7ED' : '#F5F7FA',
              color: completed ? '#1E8449' : '#8C9AAF',
            }}>第{idx+1}步 {completed ? '✓' : '○'}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card padding="14px 18px">
      <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', flexWrap:'wrap' }}>
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
            onClick={onViewDetail}
            title="查看完整工单详情"
            style={{
              padding:'4px 8px', borderRadius:'6px',
              border:'1px solid #1B3A5C', background:'rgba(27,58,92,0.05)',
              color:'#1B3A5C', fontSize:'11px', fontWeight:'600',
              cursor:'pointer', display:'flex', alignItems:'center', gap:'4px',
            }}
          >
            <FaEye size={10} />详情
          </button>
          <button
            onClick={() => { setEditDeptValue(ticket.department || ''); setEditDept(true); }}
            title="修改AI分类的派单部门"
            style={{
              padding:'4px 8px', borderRadius:'6px',
              border:'1px solid #D4880F', background:'#FFF7E6',
              color:'#D4880F', fontSize:'11px', fontWeight:'600',
              cursor:'pointer', display:'flex', alignItems:'center', gap:'4px',
            }}
          >
            修改部门
          </button>
          <button
            onClick={async () => {
              if (!expanded) {
                setExpanded(true);
                setExpandTab(2);
                await loadMessages();
              } else {
                setExpandTab(2);
                await loadMessages();
              }
            }}
            title="与管理员内部沟通"
            style={{
              background: internalMsgs.length > 0 ? '#E6F0FF' : 'rgba(27,58,92,0.05)',
              border:'1px solid #1B3A5C', borderRadius:'6px',
              padding:'4px 8px', cursor:'pointer', color:'#1B3A5C',
              display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:'600',
            }}
          >
            <FaLock size={10} />内部协作
            {internalMsgs.length > 0 && (
              <span style={{ background:'#1B3A5C', color:'#fff', borderRadius:'4px', padding:'0 4px', fontSize:'10px', minWidth:'14px', textAlign:'center' }}>
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
        <div style={{ marginTop:'14px', borderTop:'1px solid #E4E7ED', paddingTop:'14px', animation: 'fadeIn 0.25s ease' }}>
          {/* Tab 切换：AI助手 / 公开留言 / 内部协作 */}
          <div style={{ display:'flex', gap:'0', marginBottom:'12px', borderRadius:'6px', overflow:'hidden', border:'1px solid #E4E7ED', width:'fit-content' }}>
            {[
              { idx:0, icon:<FaRobot size={11} />, label:'AI 助手', badge:null },
              { idx:1, icon:<FaComments size={11} />, label:'公开留言', badge:msgs.length },
              { idx:2, icon:<FaLock size={10} />, label:'内部协作', badge:internalMsgs.length },
            ].map(t => (
              <button
                key={t.idx}
                onClick={() => setExpandTab(t.idx)}
                style={{
                  padding:'6px 16px', border:'none', borderRight: t.idx < 2 ? '1px solid #E4E7ED' : 'none',
                  cursor:'pointer', fontSize:'12px', fontWeight:'600',
                  background: expandTab === t.idx ? '#1B3A5C' : '#fff',
                  color: expandTab === t.idx ? '#fff' : '#5A6A7A',
                  display:'flex', alignItems:'center', gap:'5px',
                  transition:'all 0.2s',
                }}
              >
                {t.icon}
                {t.label}
                {t.badge !== null && t.badge > 0 && (
                  <span style={{
                    background: expandTab === t.idx ? '#fff' : '#1B3A5C',
                    color: expandTab === t.idx ? '#1B3A5C' : '#fff',
                    borderRadius:'4px', padding:'0 5px', fontSize:'10px', minWidth:'16px', textAlign:'center',
                    fontWeight:'700', lineHeight:'16px',
                  }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab 0: AI 助手 */}
          {expandTab === 0 && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
                <span style={{ fontWeight:'600', fontSize:'13px', color:'#1A1A2E' }}>AI 智能建议</span>
                {!aiSuggestion && (
                  <Btn variant="ghost" size="sm" onClick={handleGetAI} disabled={loadingAI}>
                    {loadingAI ? '分析中…' : '获取建议'}
                  </Btn>
                )}
              </div>
              {aiSuggestion ? (
                <div style={{ background:'#F0F4F8', borderRadius:'8px', padding:'12px 14px', fontSize:'12px', color:'#1A1A2E', lineHeight:1.7, border:'1px solid #E4E7ED' }}>
                  {aiSuggestion}
                </div>
              ) : (
                <div style={{ color:'#8C9AAF', fontSize:'12px', textAlign:'center', padding:'20px', background:'#FAFBFC', borderRadius:'8px', border:'1px dashed #E4E7ED' }}>
                  点击"获取建议"让 AI 分析此工单并给出处置建议
                </div>
              )}
            </div>
          )}

          {/* Tab 1: 公开留言 */}
          {expandTab === 1 && (
            <div>
              <div style={{ marginBottom:'10px' }}>
                <div style={{ maxHeight:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'6px' }}>
                  {msgs.length === 0 ? (
                    <div style={{ color:'#8C9AAF', fontSize:'12px', textAlign:'center', padding:'20px', background:'#FAFBFC', borderRadius:'8px', border:'1px dashed #E4E7ED' }}>暂无留言</div>
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
                          borderRadius: m.sender_role === 'dispatcher' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                          padding:'6px 10px', fontSize:'12px', lineHeight:1.5,
                          border: m.sender_role !== 'dispatcher' ? '1px solid #E4E7ED' : 'none',
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
                  style={{ flex:1, padding:'6px 10px', borderRadius:'6px', border:'1px solid #E4E7ED', fontSize:'12px', outline:'none', fontFamily:'inherit' }}
                />
                <Btn variant="primary" size="sm" onClick={handleSendMsg} disabled={!msgDraft.trim()}>发送</Btn>
              </div>
            </div>
          )}

          {/* Tab 2: 内部协作 */}
          {expandTab === 2 && (
            <div>
              <div style={{ marginBottom:'6px' }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:'4px', padding:'6px 10px',
                  background:'#FFF7E6', border:'1px solid #FFE4A0', borderRadius:'6px',
                  fontSize:'11px', color:'#D4880F', marginBottom:'8px',
                }}>
                  <FaLock size={10} />此处消息仅管理员与处置员内部可见，市民不会看到
                </div>
                <div style={{ maxHeight:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'6px' }}>
                  {internalMsgs.length === 0 ? (
                    <div style={{ color:'#8C9AAF', fontSize:'12px', textAlign:'center', padding:'20px', background:'#FAFBFC', borderRadius:'8px', border:'1px dashed #E4E7ED' }}>暂无内部消息</div>
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
                          borderRadius: m.sender_role === 'dispatcher' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
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
                  style={{ flex:1, padding:'6px 10px', borderRadius:'6px', border:'1px solid #FFE4A0', fontSize:'12px', outline:'none', fontFamily:'inherit', background:'#FFFCF0' }}
                />
                <button
                  onClick={handleSendInternal} disabled={!internalDraft.trim()}
                  style={{
                    padding:'5px 12px', borderRadius:'6px', border:'none', cursor: internalDraft.trim() ? 'pointer' : 'not-allowed',
                    background: internalDraft.trim() ? '#1B3A5C' : '#E4E7ED',
                    color: internalDraft.trim() ? '#fff' : '#8C9AAF',
                    fontSize:'12px', fontWeight:'600', flexShrink:0,
                  }}
                >发送</button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 修改派单部门弹窗 */}
      <Modal
        open={editDept}
        onClose={() => setEditDept(false)}
        title={`修改派单部门 — #${ticket.id} ${ticket.title}`}
        footer={
          <>
            <button
              onClick={() => setEditDept(false)}
              style={{
                padding:'4px 14px', borderRadius:'6px',
                border:'1px solid #E4E7ED', background:'#fff',
                color:'#5A6A7A', fontSize:'12px', fontWeight:'600',
                cursor:'pointer',
              }}
            >取消</button>
            <button
              onClick={handleSaveDept}
              disabled={!editDeptValue.trim()}
              style={{
                padding:'4px 14px', borderRadius:'6px', border:'none',
                background: editDeptValue.trim() ? '#1B3A5C' : '#E4E7ED',
                color: editDeptValue.trim() ? '#fff' : '#8C9AAF',
                fontSize:'12px', fontWeight:'600', cursor:'pointer',
              }}
            >确认修改</button>
          </>
        }
      >
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ fontSize:'12px', color:'#8C9AAF', lineHeight:1.7 }}>
            当前AI分类部门：<strong style={{color:'#1B3A5C'}}>{ticket.department || '未分类'}</strong>
            <br/>如果AI分类有误，请手动修改派单部门。
          </div>
          <div>
            <div style={{ fontSize:'12px', fontWeight:'600', color:'#5A6A7A', marginBottom:'6px' }}>选择部门</div>
            {['城管', '市监', '街道办'].map(d => (
              <div
                key={d}
                onClick={() => setEditDeptValue(d)}
                style={{
                  padding:'8px 14px', borderRadius:'6px', marginBottom:'6px',
                  border: editDeptValue === d ? '2px solid #1B3A5C' : '1px solid #E4E7ED',
                  background: editDeptValue === d ? '#E6F0FF' : '#fff',
                  cursor:'pointer', fontSize:'13px', color:'#1A1A2E', fontWeight: editDeptValue === d ? '700' : '500',
                  transition:'all 0.15s',
                }}
              >
                {d}
                {editDeptValue === d && <span style={{ marginLeft:'8px', color:'#1B3A5C', fontSize:'11px' }}>✓ 已选择</span>}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:'12px', fontWeight:'600', color:'#5A6A7A', marginBottom:'6px' }}>或手动输入部门名称</div>
            <input
              value={editDeptValue}
              onChange={e => setEditDeptValue(e.target.value)}
              placeholder="输入部门名称..."
              style={{
                width:'100%', padding:'8px 12px', borderRadius:'6px',
                border:'1px solid #E4E7ED', fontSize:'13px', outline:'none',
                boxSizing:'border-box', fontFamily:'inherit',
              }}
            />
          </div>
        </div>
      </Modal>
    </Card>
  );
}
