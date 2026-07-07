import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getTickets, countTickets, updateDispatchStatus, getFlowTemplates,
  saveFlowTemplate, deleteFlowTemplate, bindFlow,
  generateFlow, getDispatchers, dispatchTicket,
  deleteTicket, getMessages, sendMessage,
  updateTicketFields, exportTicketsCSV,
} from '../api';
import { Card, Btn, Modal } from './citizen/ui';
import { StatusBadge, fmtTime, fmtTimeShort, getUserName, Loading, EmptyState } from '../components/Common';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import TicketDetailModal from '../components/TicketDetailModal';
import { SearchBar, Pagination } from '../components/SearchPaginate';
import { FaLock, FaComments, FaEye } from 'react-icons/fa';

/* ── 政务风格色彩 ── */
const C = {
  primary: '#1B3A5C',
  accent: '#C5A55A',
  success: '#1E8449',
  warning: '#D4880F',
  danger: '#C0392B',
  bg: '#F5F7FA',
  text: '#1A1A2E',
  textSecondary: '#5A6A7A',
  textMuted: '#8C9AAF',
  border: '#E4E7ED',
};

/* ─────────────────────────────────────────────
   业务流程管理员工作台
───────────────────────────────────────────── */
export default function ProcessAdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [detailTicketId, setDetailTicketId] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchTickets = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { dispatch_status: filter } : {};
      const [data, countData] = await Promise.all([
        getTickets({ ...params, keyword: keyword || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
        countTickets({ ...params, keyword: keyword || undefined }),
      ]);
      setTickets(Array.isArray(data) ? data : []);
      setTotal(countData?.count || 0);
    } catch {
      toast('加载工单失败', 'error');
    }
  }, [filter, keyword, page, toast]);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await getFlowTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { toast('加载模板失败', 'error'); }
  }, [toast]);

  const fetchDispatchers = useCallback(async () => {
    try {
      const data = await getDispatchers();
      setDispatchers(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchTickets(), fetchTemplates(), fetchDispatchers()])
      .finally(() => setLoading(false));
  }, [fetchTickets, fetchTemplates, fetchDispatchers]);

  const displayTickets = useMemo(() =>
    filter === 'all' ? tickets : tickets.filter(t => t.dispatch_status === filter),
    [filter, tickets]);

  const stats = useMemo(() => ({
    total: tickets.length,
    pending: tickets.filter(t => t.dispatch_status === '待派单').length,
    processing: tickets.filter(t => ['派单中', '已接受', '处理中'].includes(t.dispatch_status)).length,
    done: tickets.filter(t => t.dispatch_status === '已完结').length,
    timeout: tickets.filter(t => t.isTimeout === 1).length,
    abnormal: tickets.filter(t => t.isDuplicate === 1 || t.isVague === 1).length,
  }), [tickets]);

  if (loading) return <Loading text="正在加载管理工作台…" />;

  return (
    <div>
      {/* 页头 */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>
          业务流程管理工作台
        </h2>
        <p style={{ fontSize: '14px', color: C.textMuted }}>
          {getUserName('管理员')} | {templates.length} 个流程模板
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px', marginBottom: '24px',
      }}>
        {[
          { label: '全部工单', value: stats.total, color: C.primary, bg: '#E4E7ED' },
          { label: '待派单', value: stats.pending, color: C.warning, bg: '#FEF3E2' },
          { label: '处置中', value: stats.processing, color: C.success, bg: '#E6F4ED' },
          { label: '已完结', value: stats.done, color: C.textSecondary, bg: '#E4E7ED' },
          { label: '超时工单', value: stats.timeout, color: C.danger, bg: '#FCEAEA' },
          { label: '异常工单', value: stats.abnormal, color: C.accent, bg: '#F0E6D6' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: '12px', padding: '14px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #EDF2F7',
            textAlign: 'center', transition: 'all 0.25s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; }}
          >
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: `2px solid ${C.border}` }}>
        {[
          { key: 'tickets', label: '工单管理' },
          { key: 'templates', label: '流程模板' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 24px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? `2px solid ${C.primary}` : '2px solid transparent',
              marginBottom: '-2px',
              fontSize: '13px',
              fontWeight: tab === t.key ? '700' : '500',
              color: tab === t.key ? C.primary : C.textMuted,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 工单管理 */}
      {tab === 'tickets' && (
        <>
          {/* 搜索 + 过滤 + 导出 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <SearchBar
              value={keyword}
              onChange={(v) => { setKeyword(v); setPage(1); }}
              placeholder="搜索工单（标题/地点/内容）…"
            />
            <button
              onClick={() => {
                exportTicketsCSV({ keyword: keyword || undefined, dispatch_status: filter !== 'all' ? filter : undefined })
                  .then(() => toast('导出成功', 'success'))
                  .catch(() => toast('导出失败', 'error'));
              }}
              style={{
                padding: '7px 16px', borderRadius: '8px', border: `1px solid ${C.primary}`,
                background: C.primary, color: '#fff', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >📥 导出CSV</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {['all', '待派单', '派单中', '已接受', '处理中', '已完结'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 14px', borderRadius: '6px',
                  border: '1px solid', borderColor: filter === f ? C.accent : C.border,
                  background: filter === f ? C.accent : '#fff',
                  color: filter === f ? '#fff' : C.textSecondary,
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                {f === 'all' ? '全部' : f}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayTickets.length === 0 ? (
              <EmptyState icon="📋" text="暂无工单" />
            ) : (
              displayTickets.map(t => (
                <AdminTicketRow
                  key={t.id}
                  ticket={t}
                  dispatchers={dispatchers}
                  templates={templates}
                  onRefresh={fetchTickets}
                  onViewDetail={() => setDetailTicketId(t.id)}
                />
              ))
            )}
            {displayTickets.length > 0 && total > PAGE_SIZE && (
              <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
            )}
          </div>
        </>
      )}

      {/* 流程模板管理 */}
      {tab === 'templates' && (
        <TemplateManager
          templates={templates}
          onRefresh={fetchTemplates}
        />
      )}

      {/* 工单详情弹窗 */}
      <TicketDetailModal
        open={detailTicketId !== null}
        ticketId={detailTicketId}
        onClose={() => setDetailTicketId(null)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   管理员工单行
───────────────────────────────────────────── */
function AdminTicketRow({ ticket, dispatchers, templates, onRefresh, onViewDetail }) {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [bindModal, setBindModal] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalMsgs, setInternalMsgs] = useState([]);
  const [internalDraft, setInternalDraft] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false); // 更多菜单

  // 点击外部关闭更多菜单
  const moreRef = useRef(null);
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const loadInternal = async () => {
    setLoadingMsgs(true);
    try {
      const data = await getMessages({ ticketId: ticket.id, is_internal: 1 });
      setInternalMsgs(Array.isArray(data) ? data : []);
    } catch {} finally { setLoadingMsgs(false); }
  };

  const handleDispatch = async () => {
    setActionLoading(true);
    try {
      await updateDispatchStatus(ticket.id, '派单中');
      toast(`工单 #${ticket.id} 已派单`, 'success');
      onRefresh();
    } catch {
      toast('派单失败', 'error');
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    setActionLoading(true);
    try {
      await deleteTicket(ticket.id);
      toast(`工单 #${ticket.id} 已删除`, 'success');
      onRefresh();
    } catch {
      toast('删除失败', 'error');
    } finally { setActionLoading(false); }
  };

  const handleSendInternal = async () => {
    if (!internalDraft.trim()) return;
    try {
      await sendMessage({
        ticket_id: ticket.id, sender_role: 'process_admin',
        sender_name: getUserName('管理员'), content: internalDraft.trim(), is_internal: 1,
      });
      setInternalDraft('');
      await loadInternal();
      toast('内部消息已发送', 'success');
    } catch {
      toast('发送失败', 'error');
    }
  };

  const ds = ticket.dispatch_status || '待派单';

  return (
    <>
      <div style={{
        background:'#fff', borderRadius:'12px', padding:'14px 18px',
        border:'1px solid #EDF2F7', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap',
        transition:'all 0.25s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.10)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; }}
      >
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', flexWrap:'wrap' }}>
            <span style={{ fontWeight:'600', fontSize:'13px', color:C.text }}>
              #{ticket.id} {ticket.title}
            </span>
            <StatusBadge status={ds} />
            {ticket.isTimeout === 1 && (
              <span style={{ background:'#FCEAEA', color:C.danger, fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'4px' }}>超时</span>
            )}
            {ticket.isDuplicate === 1 && (
              <span style={{ background:'#FEF3E2', color:C.warning, fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'4px' }}>重复</span>
            )}
            {ticket.isVague === 1 && (
              <span style={{ background:'#F0E6D6', color:C.accent, fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'4px' }}>模糊</span>
            )}
          </div>
          <div style={{ fontSize:'12px', color:C.textMuted, display:'flex', gap:'12px', flexWrap:'wrap' }}>
            <span>地址: {ticket.location}</span>
            <span>上报人: {ticket.reporter}</span>
            {ticket.department && <span>部门: {ticket.department}</span>}
            {ticket.assignee && <span>处置人: {ticket.assignee}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:'6px', flexShrink:0, alignItems:'center', position:'relative' }}>
          {/* 主要操作：查看详情 */}
          <button
            onClick={onViewDetail}
            title="查看详情"
            style={{
              padding:'4px 14px', borderRadius:'6px',
              border:`1px solid ${C.border}`, background:'#fff',
              color:C.textSecondary, fontSize:'12px', fontWeight:'600',
              cursor:'pointer', display:'flex', alignItems:'center', gap:'4px',
            }}
          ><FaEye size={10} />查看</button>

          {/* 主要操作：派单（仅待派单状态显示） */}
          {ds === '待派单' && (
            <button
              onClick={handleDispatch}
              disabled={actionLoading}
              style={{
                padding:'4px 14px', borderRadius:'6px', border:'none',
                background:C.primary, color:'#fff', fontSize:'12px', fontWeight:'600',
                cursor:'pointer', letterSpacing:'0.5px',
              }}
            >派单</button>
          )}

          {/* 更多菜单 */}
          <div ref={moreRef} style={{ position:'relative' }}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              style={{
                padding:'4px 10px', borderRadius:'6px',
                border:`1px solid ${C.border}`, background: moreOpen ? '#F5F7FA' : '#fff',
                color:C.textMuted, fontSize:'14px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:'2px',
              }}
            >⋯</button>
            {moreOpen && (
              <div style={{
                position:'absolute', top:'100%', right:0, marginTop:'4px',
                background:'#fff', borderRadius:'8px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
                border:'1px solid #EDF2F7', padding:'4px', zIndex:100, minWidth:'120px',
              }}>
                <button
                  onClick={() => { setMoreOpen(false); setBindModal(true); }}
                  style={{ display:'block', width:'100%', padding:'6px 12px', border:'none', background:'none', cursor:'pointer', fontSize:'12px', color:C.text, textAlign:'left', borderRadius:'4px' }}
                  onMouseEnter={e => e.target.style.background='#F5F7FA'}
                  onMouseLeave={e => e.target.style.background='none'}
                >🔗 绑定流程</button>
                <button
                  onClick={async () => { setMoreOpen(false); setInternalOpen(true); await loadInternal(); }}
                  style={{ display:'block', width:'100%', padding:'6px 12px', border:'none', background:'none', cursor:'pointer', fontSize:'12px', color:C.warning, textAlign:'left', borderRadius:'4px' }}
                  onMouseEnter={e => e.target.style.background='#F5F7FA'}
                  onMouseLeave={e => e.target.style.background='none'}
                >🔒 内部协作</button>
                <div style={{ height:'1px', background:'#EDF2F7', margin:'4px 0' }} />
                <button
                  onClick={() => { setMoreOpen(false); setConfirmDelete(true); }}
                  style={{ display:'block', width:'100%', padding:'6px 12px', border:'none', background:'none', cursor:'pointer', fontSize:'12px', color:C.danger, textAlign:'left', borderRadius:'4px' }}
                  onMouseEnter={e => e.target.style.background='#FFF5F5'}
                  onMouseLeave={e => e.target.style.background='none'}
                >🗑️ 删除</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={confirmDelete}
        title="删除工单"
        message={`确认删除工单 #${ticket.id}「${ticket.title}」？此操作不可恢复。`}
        confirmText="确认删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* 内部协作弹窗 */}
      <Modal
        open={internalOpen}
        onClose={() => setInternalOpen(false)}
        title={`内部协作 — #${ticket.id} ${ticket.title}`}
        footer={
          <button
            onClick={() => setInternalOpen(false)}
            style={{
              padding:'4px 14px', borderRadius:'6px',
              border:`1px solid ${C.border}`, background:'#fff',
              color:C.textSecondary, fontSize:'12px', fontWeight:'600',
              cursor:'pointer', letterSpacing:'0.5px',
            }}
          >关闭</button>
        }
      >
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{
            display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px',
            background:'#FEF3E2', border:`1px solid ${C.accent}`, borderRadius:'6px',
            fontSize:'12px', color:C.warning,
          }}>
            <FaLock size={10} />此处消息仅管理员与处置员可见，市民不会看到
          </div>
          <div style={{ minHeight:'120px', maxHeight:'260px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
            {loadingMsgs ? (
              <div style={{ textAlign:'center', color:C.textMuted, padding:'20px', fontSize:'12px' }}>
                <div style={{ width:'24px', height:'24px', border:'2px solid #EDF2F7', borderTopColor:'#3858E6', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
                加载中...
              </div>
            ) : internalMsgs.length === 0 ? (
              <div style={{ textAlign:'center', color:C.textMuted, padding:'20px', fontSize:'12px' }}>暂无内部消息</div>
            ) : (
              internalMsgs.map(m => (
                <div key={m.id} style={{
                  display:'flex',
                  flexDirection: m.sender_role === 'process_admin' ? 'row-reverse' : 'row',
                  alignItems:'flex-end', gap:'8px',
                }}>
                  <div style={{
                    maxWidth:'75%',
                    background: m.sender_role === 'process_admin' ? C.warning : C.primary,
                    color:'#fff',
                    borderRadius: m.sender_role === 'process_admin' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                    padding:'8px 12px', fontSize:'13px', lineHeight:1.5,
                  }}>
                    <div style={{ fontSize:'11px', opacity:0.8, marginBottom:'3px' }}>
                      [内部] {m.sender_name} | {fmtTimeShort(m.created_at)}
                    </div>
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <input
              value={internalDraft} onChange={e => setInternalDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendInternal(); }}
              placeholder="发消息给处置员（内部可见）..."
              style={{
                flex:1, padding:'8px 12px', borderRadius:'6px',
                border:`1px solid ${C.accent}`, fontSize:'13px', outline:'none',
                fontFamily:'inherit', background:'#FFFBF0',
              }}
            />
            <button
              onClick={handleSendInternal} disabled={!internalDraft.trim()}
              style={{
                padding:'8px 16px', borderRadius:'6px', border:'none',
                cursor: internalDraft.trim() ? 'pointer' : 'not-allowed',
                background: internalDraft.trim() ? C.warning : C.border,
                color: internalDraft.trim() ? '#fff' : C.textMuted,
                fontSize:'13px', fontWeight:'600', flexShrink:0, letterSpacing:'0.5px',
              }}
            >发送</button>
          </div>
        </div>
      </Modal>

      {/* 绑定流程弹框 */}
      <BindFlowModal
        open={bindModal}
        ticket={ticket}
        templates={templates}
        onClose={() => setBindModal(false)}
        onRefresh={onRefresh}
      />
    </>
  );
}

/* ─────────────────────────────────────────────
   绑定流程弹框
───────────────────────────────────────────── */
function BindFlowModal({ open, ticket, templates, onClose, onRefresh }) {
  const toast = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBind = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      const tpl = templates.find(t => t.id === selectedTemplate);
      if (tpl) {
        await bindFlow(ticket.id, { flowTemplateId: tpl.id, steps: tpl.steps });
      }
      toast('流程绑定成功', 'success');
      onRefresh();
      onClose();
    } catch {
      toast('绑定失败', 'error');
    } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="绑定流程模板"
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding:'4px 14px', borderRadius:'6px',
              border:`1px solid ${C.border}`, background:'#fff',
              color:C.textSecondary, fontSize:'12px', fontWeight:'600',
              cursor:'pointer', letterSpacing:'0.5px',
            }}
          >取消</button>
          <button
            onClick={handleBind} disabled={!selectedTemplate || loading}
            style={{
              padding:'4px 14px', borderRadius:'6px', border:'none',
              background: (!selectedTemplate || loading) ? C.border : C.primary,
              color: (!selectedTemplate || loading) ? C.textMuted : '#fff',
              fontSize:'12px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.5px',
            }}
          >
            {loading ? '绑定中...' : '确认绑定'}
          </button>
        </>
      }
    >
      <div>
        <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '10px' }}>
          为工单 #{ticket.id}「{ticket.title}」选择流程模板：
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {templates.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl.id)}
              style={{
                padding: '12px 14px', borderRadius: '8px',
                border: selectedTemplate === tpl.id ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                background: selectedTemplate === tpl.id ? '#E4E7ED' : '#fff',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '13px', color: C.text, marginBottom: '4px' }}>
                {tpl.name}
                {tpl.is_default === 1 && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: C.success, background: '#E6F4ED', padding: '1px 6px', borderRadius: '4px' }}>默认</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: C.textMuted }}>
                {Array.isArray(tpl.steps) ? tpl.steps.join(' -> ') : tpl.steps}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   流程模板管理
───────────────────────────────────────────── */
function TemplateManager({ templates, onRefresh }) {
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [name, setName] = useState('');
  const [stepList, setStepList] = useState([]); // 步骤列表（数组形式）
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openCreate = () => {
    setEditTemplate(null);
    setName('');
    setStepList([]);
    setShowCreate(true);
  };

  const openEdit = (tpl) => {
    setEditTemplate(tpl);
    setName(tpl.name);
    const steps = Array.isArray(tpl.steps) ? tpl.steps : (typeof tpl.steps === 'string' ? tpl.steps.split('\n').filter(Boolean) : []);
    setStepList(steps.map((s, i) => ({ id: Date.now() + i, text: s })));
    setShowCreate(true);
  };

  // 步骤操作
  const addStep = () => setStepList([...stepList, { id: Date.now(), text: '' }]);
  const removeStep = (id) => setStepList(stepList.filter(s => s.id !== id));
  const updateStep = (id, text) => setStepList(stepList.map(s => s.id === id ? { ...s, text } : s));
  const moveStep = (id, direction) => {
    const idx = stepList.findIndex(s => s.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= stepList.length) return;
    const newList = [...stepList];
    [newList[idx], newList[newIdx]] = [newList[newIdx], newList[idx]];
    setStepList(newList);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast('请填写模板名称', 'warning'); return; }
    const validSteps = stepList.filter(s => s.text.trim());
    if (validSteps.length === 0) { toast('请至少添加一个步骤', 'warning'); return; }
    setLoading(true);
    try {
      await saveFlowTemplate({
        name: name.trim(),
        steps: validSteps.map(s => s.text.trim()),
        ...(editTemplate ? { id: editTemplate.id } : {}),
      });
      setShowCreate(false);
      toast(editTemplate ? '模板已更新' : '模板已创建', 'success');
      onRefresh();
    } catch {
      toast('保存失败', 'error');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    setConfirmDelete(null);
    try {
      await deleteFlowTemplate(id);
      toast('模板已删除', 'success');
      onRefresh();
    } catch {
      toast('删除失败', 'error');
    }
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateFlow(name || '标准工单处置流程');
      if (result.nodes && Array.isArray(result.nodes)) {
        const newSteps = result.nodes.map((n, i) => ({ id: Date.now() + i, text: n.label || n.data?.label || '' }));
        setStepList(newSteps);
        toast('AI 流程已生成，可继续手动修改', 'success');
      }
    } catch {
      toast('AI 生成失败，请手动输入步骤', 'error');
    } finally { setGenerating(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span style={{ fontWeight: '600', fontSize: '13px', color: C.text }}>
            流程模板列表
          </span>
          <span style={{ marginLeft: '8px', fontSize: '12px', color: C.textMuted }}>
            共 {templates.length} 个
          </span>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding:'4px 14px', borderRadius:'6px', border:'none',
            background:C.accent, color:'#fff', fontSize:'12px', fontWeight:'600',
            cursor:'pointer', letterSpacing:'0.5px',
          }}
        >+ 新建模板</button>
      </div>

      {/* 模板列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {templates.length === 0 ? (
          <EmptyState icon="📄" text="暂无流程模板" hint="点击右上角按钮创建第一个模板" />
        ) : (
          templates.map(tpl => (
            <div
              key={tpl.id}
              style={{
                background: '#fff', borderRadius: '12px', padding: '16px 20px',
                border: '1px solid #EDF2F7', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition:'all 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap:'wrap', gap:'8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: C.text }}>{tpl.name}</span>
                  {tpl.is_default === 1 && (
                    <span style={{ fontSize: '11px', color: C.success, background: '#E6F4ED', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>默认</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => openEdit(tpl)}
                    style={{
                      padding:'3px 12px', borderRadius:'6px',
                      border:`1px solid ${C.border}`, background:'#fff',
                      color:C.textSecondary, fontSize:'12px', fontWeight:'600',
                      cursor:'pointer', letterSpacing:'0.5px',
                    }}
                  >编辑</button>
                  {tpl.is_default !== 1 && (
                    <button
                      onClick={() => setConfirmDelete(tpl.id)}
                      style={{
                        padding:'3px 12px', borderRadius:'6px',
                        border:`1px solid ${C.danger}`, background:'#fff',
                        color:C.danger, fontSize:'12px', fontWeight:'600',
                        cursor:'pointer', letterSpacing:'0.5px',
                      }}
                    >删除</button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(Array.isArray(tpl.steps) ? tpl.steps : []).map((step, idx) => (
                  <span key={idx} style={{
                    padding: '3px 10px', borderRadius: '6px', fontSize: '12px',
                    background: '#E4E7ED', color: C.primary, fontWeight: '500',
                  }}>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 删除确认 */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="删除流程模板"
        message="确认删除此流程模板？已绑定该模板的工单不受影响。"
        confirmText="确认删除"
        danger
        onConfirm={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* 创建/编辑弹框 */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={editTemplate ? '编辑流程模板' : '新建流程模板'}
        width="560px"
        footer={
          <>
            <button
              onClick={() => setShowCreate(false)}
              style={{
                padding:'4px 14px', borderRadius:'6px',
                border:`1px solid ${C.border}`, background:'#fff',
                color:C.textSecondary, fontSize:'12px', fontWeight:'600',
                cursor:'pointer', letterSpacing:'0.5px',
              }}
            >取消</button>
            <button
              onClick={handleSave} disabled={loading || !name.trim() || stepList.filter(s => s.text.trim()).length === 0}
              style={{
                padding:'4px 14px', borderRadius:'6px', border:'none',
                background: (loading || !name.trim() || stepList.filter(s => s.text.trim()).length === 0) ? C.border : C.accent,
                color: (loading || !name.trim() || stepList.filter(s => s.text.trim()).length === 0) ? C.textMuted : '#fff',
                fontSize:'12px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.5px',
              }}
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 模板名称 — 人写的 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>
              📝 模板名称 <span style={{fontSize:'11px',color:C.textMuted,fontWeight:'400'}}>（手动填写）</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：占道经营标准处置流程"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '6px',
                border: `1px solid ${C.border}`, fontSize: '13px', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 流程步骤 — AI生成 + 人工修改 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSecondary }}>
                📋 流程步骤 <span style={{fontSize:'11px',color:C.textMuted,fontWeight:'400'}}>（AI生成后仍可手动修改）</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleAIGenerate} disabled={generating}
                  style={{
                    padding:'3px 12px', borderRadius:'6px',
                    border:`1px solid ${C.primary}`, background: generating ? '#E4E7ED' : '#E6F0FF',
                    color: generating ? C.textMuted : C.primary,
                    fontSize:'12px', fontWeight:'600', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:'4px',
                  }}
                >
                  🤖 {generating ? '生成中...' : 'AI生成步骤'}
                </button>
                <button
                  onClick={addStep}
                  style={{
                    padding:'3px 12px', borderRadius:'6px',
                    border:`1px solid ${C.border}`, background:'#fff',
                    color: C.textSecondary, fontSize:'12px', fontWeight:'600', cursor:'pointer',
                  }}
                >+ 添加步骤</button>
              </div>
            </div>

            {/* 步骤列表 — 每条可编辑 */}
            {stepList.length === 0 ? (
              <div style={{
                textAlign:'center', padding:'24px', color: C.textMuted, fontSize:'12px',
                background:'#FAFBFC', borderRadius:'8px', border:'1px dashed #E4E7ED',
              }}>
                暂无步骤，点击"AI生成步骤"或"添加步骤"开始
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'300px', overflowY:'auto' }}>
                {stepList.map((step, idx) => (
                  <div key={step.id} style={{
                    display:'flex', alignItems:'center', gap:'8px',
                    background:'#fff', borderRadius:'8px', border:'1px solid #EDF2F7',
                    padding:'4px 6px 4px 12px',
                  }}>
                    {/* 步骤编号 */}
                    <span style={{
                      width:'22px', height:'22px', borderRadius:'50%',
                      background: C.primary, color:'#fff', fontSize:'11px', fontWeight:'700',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      flexShrink:0,
                    }}>{idx + 1}</span>

                    {/* 步骤文本输入框 */}
                    <input
                      value={step.text}
                      onChange={e => updateStep(step.id, e.target.value)}
                      placeholder={`第${idx + 1}步...`}
                      style={{
                        flex:1, padding:'6px 8px', borderRadius:'4px',
                        border:'1px solid transparent', fontSize:'12px', outline:'none',
                        background:'transparent', fontFamily:'inherit',
                      }}
                      onFocus={e => { e.target.style.border = `1px solid ${C.primary}`; e.target.style.background = '#FAFBFC'; }}
                      onBlur={e => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }}
                    />

                    {/* 上移/下移 */}
                    <button
                      onClick={() => moveStep(step.id, -1)}
                      disabled={idx === 0}
                      title="上移"
                      style={{
                        width:'24px', height:'24px', borderRadius:'4px',
                        border:'none', background:'transparent',
                        color: idx === 0 ? '#E4E7ED' : C.textMuted,
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center',
                      }}
                    >▲</button>
                    <button
                      onClick={() => moveStep(step.id, 1)}
                      disabled={idx === stepList.length - 1}
                      title="下移"
                      style={{
                        width:'24px', height:'24px', borderRadius:'4px',
                        border:'none', background:'transparent',
                        color: idx === stepList.length - 1 ? '#E4E7ED' : C.textMuted,
                        cursor: idx === stepList.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center',
                      }}
                    >▼</button>

                    {/* 删除 */}
                    <button
                      onClick={() => removeStep(step.id)}
                      title="删除此步骤"
                      style={{
                        width:'24px', height:'24px', borderRadius:'4px',
                        border:'none', background:'transparent',
                        color: C.danger, cursor:'pointer', fontSize:'16px',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
