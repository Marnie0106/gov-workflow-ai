import React, { useState, useEffect, useCallback } from 'react';
import {
  getTickets, updateDispatchStatus, getFlowTemplates,
  saveFlowTemplate, deleteFlowTemplate, bindFlow,
  generateFlow, getDispatchers, dispatchTicket,
  deleteTicket, getMessages, sendMessage,
} from '../api';
import { Card, Btn, Modal } from './citizen/ui';
import { FaLock, FaComments } from 'react-icons/fa';

/* ── 政务风格色彩 ── */
const C = {
  primary: '#1B3A5C',
  accent: '#C5A55A',
  success: '#1E8449',
  warning: '#D4880F',
  danger: '#C0392B',
  bg: '#F0F2F5',
  text: '#1A1A2E',
  textSecondary: '#5A6A7A',
  textMuted: '#8C9AAF',
  border: '#D9DEE6',
  borderLight: '#E8ECF0',
};

/* ── 状态映射 ── */
const DS_MAP = {
  '待派单': { bg: '#FEF3E2', color: '#D4880F' },
  '派单中': { bg: '#F0E6D6', color: '#C5A55A' },
  '已接受': { bg: '#E8F0FE', color: '#1B3A5C' },
  '处理中': { bg: '#E6F4ED', color: '#1E8449' },
  '已完结': { bg: '#E8ECF0', color: '#5A6A7A' },
};

function StatusBadge({ status }) {
  const s = DS_MAP[status] || { bg: '#E8ECF0', color: '#8C9AAF' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: '2px',
      fontSize: '11px', fontWeight: '600', letterSpacing: '0.3px',
    }}>
      {status}
    </span>
  );
}

function getUserName() {
  return sessionStorage.getItem('displayName') || '管理员';
}

/* ─────────────────────────────────────────────
   业务流程管理员工作台
───────────────────────────────────────────── */
export default function ProcessAdminPage() {
  const [tab, setTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchTickets = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { dispatch_status: filter } : {};
      const data = await getTickets(params);
      setTickets(Array.isArray(data) ? data : []);
    } catch {}
  }, [filter]);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await getFlowTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

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

  const displayTickets = filter === 'all'
    ? tickets
    : tickets.filter(t => t.dispatch_status === filter);

  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.dispatch_status === '待派单').length,
    processing: tickets.filter(t => ['派单中', '已接受', '处理中'].includes(t.dispatch_status)).length,
    done: tickets.filter(t => t.dispatch_status === '已完结').length,
    timeout: tickets.filter(t => t.isTimeout === 1).length,
    abnormal: tickets.filter(t => t.isDuplicate === 1 || t.isVague === 1).length,
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: C.textMuted }}>
        <div style={{ fontSize: '13px' }}>
          正在加载管理工作台...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 页头 */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: C.text, marginBottom: '4px' }}>
          业务流程管理工作台
        </h2>
        <p style={{ fontSize: '12px', color: C.textMuted }}>
          {getUserName()} | {templates.length} 个流程模板
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: '全部工单', value: stats.total, color: C.primary, bg: '#E8ECF0' },
          { label: '待派单', value: stats.pending, color: C.warning, bg: '#FEF3E2' },
          { label: '处置中', value: stats.processing, color: C.success, bg: '#E6F4ED' },
          { label: '已完结', value: stats.done, color: C.textSecondary, bg: '#E8ECF0' },
          { label: '超时工单', value: stats.timeout, color: C.danger, bg: '#FCEAEA' },
          { label: '异常工单', value: stats.abnormal, color: C.accent, bg: '#F0E6D6' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: '4px', padding: '14px 12px',
            boxShadow: '0 1px 4px rgba(27,58,92,0.06)', border: '1px solid #E8ECF0',
            textAlign: 'center',
          }}>
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
          {/* 过滤 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {['all', '待派单', '派单中', '已接受', '处理中', '已完结'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 14px', borderRadius: '2px',
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
              <div style={{
                textAlign: 'center', padding: '40px', background: '#fff',
                borderRadius: '4px', color: C.textMuted,
                boxShadow: '0 1px 4px rgba(27,58,92,0.06)', border: '1px solid #E8ECF0',
              }}>
                暂无工单
              </div>
            ) : (
              displayTickets.map(t => (
                <AdminTicketRow
                  key={t.id}
                  ticket={t}
                  dispatchers={dispatchers}
                  templates={templates}
                  onRefresh={fetchTickets}
                />
              ))
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
    </div>
  );
}

/* ─────────────────────────────────────────────
   管理员工单行
───────────────────────────────────────────── */
function AdminTicketRow({ ticket, dispatchers, templates, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [bindModal, setBindModal] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalMsgs, setInternalMsgs] = useState([]);
  const [internalDraft, setInternalDraft] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);

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
      onRefresh();
    } catch {} finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`确认删除工单 #${ticket.id}？`)) return;
    setActionLoading(true);
    try {
      await deleteTicket(ticket.id);
      onRefresh();
    } catch {} finally { setActionLoading(false); }
  };

  const handleSendInternal = async () => {
    if (!internalDraft.trim()) return;
    try {
      await sendMessage({
        ticket_id: ticket.id, sender_role: 'process_admin',
        sender_name: getUserName(), content: internalDraft.trim(), is_internal: 1,
      });
      setInternalDraft('');
      await loadInternal();
    } catch {}
  };

  const ds = ticket.dispatch_status || '待派单';

  function fmtTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  return (
    <>
      <div style={{
        background:'#fff', borderRadius:'4px', padding:'14px 18px',
        border:'1px solid #E8ECF0', boxShadow:'0 1px 4px rgba(27,58,92,0.06)',
        display:'flex', alignItems:'center', gap:'14px',
      }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
            <span style={{ fontWeight:'600', fontSize:'13px', color:C.text }}>
              #{ticket.id} {ticket.title}
            </span>
            <StatusBadge status={ds} />
            {ticket.isTimeout === 1 && (
              <span style={{ background:'#FCEAEA', color:C.danger, fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'2px' }}>超时</span>
            )}
            {ticket.isDuplicate === 1 && (
              <span style={{ background:'#FEF3E2', color:C.warning, fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'2px' }}>重复</span>
            )}
            {ticket.isVague === 1 && (
              <span style={{ background:'#F0E6D6', color:C.accent, fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'2px' }}>模糊</span>
            )}
          </div>
          <div style={{ fontSize:'12px', color:C.textMuted, display:'flex', gap:'12px' }}>
            <span>地址: {ticket.location}</span>
            <span>上报人: {ticket.reporter}</span>
            {ticket.department && <span>部门: {ticket.department}</span>}
            {ticket.assignee && <span>处置人: {ticket.assignee}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:'6px', flexShrink:0, alignItems:'center' }}>
          {ds === '待派单' && (
            <button
              onClick={handleDispatch}
              disabled={actionLoading}
              style={{
                padding:'4px 14px', borderRadius:'2px', border:'none',
                background:C.primary, color:'#fff', fontSize:'12px', fontWeight:'600',
                cursor:'pointer', letterSpacing:'0.5px',
              }}
            >派单</button>
          )}
          <button
            onClick={() => setBindModal(true)}
            style={{
              padding:'4px 14px', borderRadius:'2px',
              border:`1px solid ${C.border}`, background:'#fff',
              color:C.textSecondary, fontSize:'12px', fontWeight:'600',
              cursor:'pointer', letterSpacing:'0.5px',
            }}
          >绑定流程</button>
          {/* 内部协作按钮 */}
          <button
            onClick={async () => { setInternalOpen(true); await loadInternal(); }}
            title="与处置员内部沟通（市民不可见）"
            style={{
              background:'#FEF3E2', border:`1px solid ${C.accent}`, borderRadius:'4px',
              padding:'4px 10px', cursor:'pointer', color:C.warning,
              display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', fontWeight:'600',
              letterSpacing:'0.5px',
            }}
          >
            <FaLock size={10} />协作
          </button>
        </div>
      </div>

      {/* 内部协作弹窗 */}
      <Modal
        open={internalOpen}
        onClose={() => setInternalOpen(false)}
        title={`内部协作 — #${ticket.id} ${ticket.title}`}
        footer={
          <button
            onClick={() => setInternalOpen(false)}
            style={{
              padding:'4px 14px', borderRadius:'2px',
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
            background:'#FEF3E2', border:`1px solid ${C.accent}`, borderRadius:'4px',
            fontSize:'12px', color:C.warning,
          }}>
            <FaLock size={10} />此处消息仅管理员与处置员可见，市民不会看到
          </div>
          {/* 消息列表 */}
          <div style={{ minHeight:'120px', maxHeight:'260px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
            {loadingMsgs ? (
              <div style={{ textAlign:'center', color:C.textMuted, padding:'20px', fontSize:'12px' }}>加载中...</div>
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
                    borderRadius: m.sender_role === 'process_admin' ? '4px 4px 2px 4px' : '4px 4px 4px 2px',
                    padding:'8px 12px', fontSize:'13px', lineHeight:1.5,
                  }}>
                    <div style={{ fontSize:'11px', opacity:0.8, marginBottom:'3px' }}>
                      [内部] {m.sender_name} | {fmtTime(m.created_at)}
                    </div>
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
          {/* 输入框 */}
          <div style={{ display:'flex', gap:'8px' }}>
            <input
              value={internalDraft} onChange={e => setInternalDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendInternal(); }}
              placeholder="发消息给处置员（内部可见）..."
              style={{
                flex:1, padding:'8px 12px', borderRadius:'4px',
                border:`1px solid ${C.accent}`, fontSize:'13px', outline:'none',
                fontFamily:'inherit', background:'#FFFBF0',
              }}
            />
            <button
              onClick={handleSendInternal} disabled={!internalDraft.trim()}
              style={{
                padding:'8px 16px', borderRadius:'2px', border:'none',
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
      onRefresh();
      onClose();
    } catch {} finally { setLoading(false); }
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
              padding:'4px 14px', borderRadius:'2px',
              border:`1px solid ${C.border}`, background:'#fff',
              color:C.textSecondary, fontSize:'12px', fontWeight:'600',
              cursor:'pointer', letterSpacing:'0.5px',
            }}
          >取消</button>
          <button
            onClick={handleBind} disabled={!selectedTemplate || loading}
            style={{
              padding:'4px 14px', borderRadius:'2px', border:'none',
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
                padding: '12px 14px', borderRadius: '4px',
                border: selectedTemplate === tpl.id ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                background: selectedTemplate === tpl.id ? '#E8ECF0' : '#fff',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '13px', color: C.text, marginBottom: '4px' }}>
                {tpl.name}
                {tpl.is_default === 1 && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: C.success, background: '#E6F4ED', padding: '1px 6px', borderRadius: '2px' }}>默认</span>
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
  const [showCreate, setShowCreate] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const openCreate = () => {
    setEditTemplate(null);
    setName('');
    setSteps('');
    setShowCreate(true);
  };

  const openEdit = (tpl) => {
    setEditTemplate(tpl);
    setName(tpl.name);
    setSteps(Array.isArray(tpl.steps) ? tpl.steps.join('\n') : tpl.steps);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !steps.trim()) return;
    setLoading(true);
    try {
      const stepsArr = steps.split('\n').map(s => s.trim()).filter(Boolean);
      await saveFlowTemplate({
        name: name.trim(),
        steps: stepsArr,
        ...(editTemplate ? { id: editTemplate.id } : {}),
      });
      setShowCreate(false);
      onRefresh();
    } catch {} finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确认删除此流程模板？')) return;
    try {
      await deleteFlowTemplate(id);
      onRefresh();
    } catch {}
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateFlow(name || '标准工单处置流程');
      if (result.nodes && Array.isArray(result.nodes)) {
        setSteps(result.nodes.map(n => n.label).join('\n'));
      }
    } catch {} finally { setGenerating(false); }
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
            padding:'4px 14px', borderRadius:'2px', border:'none',
            background:C.accent, color:'#fff', fontSize:'12px', fontWeight:'600',
            cursor:'pointer', letterSpacing:'0.5px',
          }}
        >+ 新建模板</button>
      </div>

      {/* 模板列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {templates.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px', background: '#fff',
            borderRadius: '4px', color: C.textMuted,
            boxShadow: '0 1px 4px rgba(27,58,92,0.06)', border: '1px solid #E8ECF0',
          }}>
            暂无流程模板
          </div>
        ) : (
          templates.map(tpl => (
            <div
              key={tpl.id}
              style={{
                background: '#fff', borderRadius: '4px', padding: '16px 20px',
                border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(27,58,92,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: C.text }}>{tpl.name}</span>
                  {tpl.is_default === 1 && (
                    <span style={{ fontSize: '11px', color: C.success, background: '#E6F4ED', padding: '2px 8px', borderRadius: '2px', fontWeight: '600' }}>默认</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => openEdit(tpl)}
                    style={{
                      padding:'3px 12px', borderRadius:'2px',
                      border:`1px solid ${C.border}`, background:'#fff',
                      color:C.textSecondary, fontSize:'12px', fontWeight:'600',
                      cursor:'pointer', letterSpacing:'0.5px',
                    }}
                  >编辑</button>
                  {tpl.is_default !== 1 && (
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      style={{
                        padding:'3px 12px', borderRadius:'2px',
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
                    padding: '3px 10px', borderRadius: '2px', fontSize: '12px',
                    background: '#E8ECF0', color: C.primary, fontWeight: '500',
                  }}>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

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
                padding:'4px 14px', borderRadius:'2px',
                border:`1px solid ${C.border}`, background:'#fff',
                color:C.textSecondary, fontSize:'12px', fontWeight:'600',
                cursor:'pointer', letterSpacing:'0.5px',
              }}
            >取消</button>
            <button
              onClick={handleSave} disabled={loading || !name.trim() || !steps.trim()}
              style={{
                padding:'4px 14px', borderRadius:'2px', border:'none',
                background: (loading || !name.trim() || !steps.trim()) ? C.border : C.accent,
                color: (loading || !name.trim() || !steps.trim()) ? C.textMuted : '#fff',
                fontSize:'12px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.5px',
              }}
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>
              模板名称
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：标准7步流程"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '4px',
                border: `1px solid ${C.border}`, fontSize: '13px', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSecondary }}>
                流程步骤（每行一个步骤）
              </label>
              <button
                onClick={handleAIGenerate} disabled={generating}
                style={{
                  padding:'3px 12px', borderRadius:'2px',
                  border:`1px solid ${C.border}`, background:'#fff',
                  color: generating ? C.textMuted : C.primary,
                  fontSize:'12px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.5px',
                }}
              >
                {generating ? 'AI 生成中...' : 'AI 生成'}
              </button>
            </div>
            <textarea
              value={steps}
              onChange={e => setSteps(e.target.value)}
              placeholder={'接收工单\n现场核实\n制定方案\n分派任务\n执行处置\n复核验收\n办结归档'}
              rows={8}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '4px',
                border: `1px solid ${C.border}`, fontSize: '13px', outline: 'none',
                resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                lineHeight: 1.8,
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
