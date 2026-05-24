import React, { useState, useEffect, useCallback } from 'react';
import {
  getTickets, updateDispatchStatus, getFlowTemplates,
  saveFlowTemplate, deleteFlowTemplate, bindFlow,
  generateFlow, getDispatchers, dispatchTicket,
  deleteTicket, getMessages, sendMessage,
} from '../api';
import { Card, Btn, Modal } from './citizen/ui';
import { FaLock, FaComments } from 'react-icons/fa';

/* ── 状态映射 ── */
const DS_MAP = {
  '待派单': { bg: '#FFF3E0', color: '#E67E22' },
  '派单中': { bg: '#F3E8FF', color: '#8E44AD' },
  '已接受': { bg: '#E8F0FE', color: '#1658AF' },
  '处理中': { bg: '#E8F5E9', color: '#27AE60' },
  '已完结': { bg: '#E8F0FE', color: '#1658AF' },
};

function StatusBadge({ status }) {
  const s = DS_MAP[status] || { bg: '#f5f7fa', color: '#909399' };
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>{status}</span>;
}

function getUserName() {
  return sessionStorage.getItem('displayName') || '管理员';
}

/* ─────────────────────────────────────────────
   业务流程管理员工作台
───────────────────────────────────────────── */
export default function ProcessAdminPage() {
  const [tab, setTab] = useState('tickets'); // 'tickets' | 'templates'
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
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#909399' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        正在加载管理工作台…
      </div>
    );
  }

  return (
    <div>
      {/* 页头 */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a2a3a', marginBottom: '4px' }}>
          ⚙️ 业务流程管理工作台
        </h2>
        <p style={{ fontSize: '13px', color: '#909399' }}>
          {getUserName()} · {templates.length} 个流程模板
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: '全部工单', value: stats.total, color: '#1658AF', bg: '#e8f0fe' },
          { label: '待派单', value: stats.pending, color: '#E67E22', bg: '#FFF3E0' },
          { label: '处置中', value: stats.processing, color: '#27AE60', bg: '#E8F5E9' },
          { label: '已完结', value: stats.done, color: '#1658AF', bg: '#E8F0FE' },
          { label: '超时工单', value: stats.timeout, color: '#E74C3C', bg: '#FDECEC' },
          { label: '异常工单', value: stats.abnormal, color: '#8E44AD', bg: '#F3E8FF' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', padding: '14px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#909399', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #e4e7ed' }}>
        {[
          { key: 'tickets', label: '📋 工单管理' },
          { key: 'templates', label: '🔄 流程模板' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 24px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #0A2B4E' : '2px solid transparent',
              marginBottom: '-2px',
              fontSize: '15px',
              fontWeight: tab === t.key ? '700' : '500',
              color: tab === t.key ? '#0A2B4E' : '#909399',
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
                  padding: '5px 14px', borderRadius: '20px',
                  border: '1.5px solid', borderColor: filter === f ? '#E67E22' : '#e4e7ed',
                  background: filter === f ? '#E67E22' : '#fff',
                  color: filter === f ? '#fff' : '#606266',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                {f === 'all' ? '全部' : f}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '14px', color: '#c0c4cc' }}>
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
        background:'#fff', borderRadius:'12px', padding:'14px 18px',
        border:'1px solid #e4e7ed', boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
        display:'flex', alignItems:'center', gap:'14px',
      }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
            <span style={{ fontWeight:'600', fontSize:'14px', color:'#1a2a3a' }}>
              #{ticket.id} {ticket.title}
            </span>
            <StatusBadge status={ds} />
            {ticket.isTimeout === 1 && <span style={{ color:'#E74C3C', fontSize:'11px', fontWeight:'700' }}>超时</span>}
            {ticket.isDuplicate === 1 && <span style={{ color:'#E67E22', fontSize:'11px', fontWeight:'700' }}>重复</span>}
            {ticket.isVague === 1 && <span style={{ color:'#8E44AD', fontSize:'11px', fontWeight:'700' }}>模糊</span>}
          </div>
          <div style={{ fontSize:'12px', color:'#909399', display:'flex', gap:'12px' }}>
            <span>📍 {ticket.location}</span>
            <span>👤 {ticket.reporter}</span>
            {ticket.department && <span>🏢 {ticket.department}</span>}
            {ticket.assignee && <span>🔧 {ticket.assignee}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:'6px', flexShrink:0, alignItems:'center' }}>
          {ds === '待派单' && (
            <Btn variant="primary" size="sm" onClick={handleDispatch} disabled={actionLoading}>派单</Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={() => setBindModal(true)}>绑定流程</Btn>
          {/* 内部协作按钮 */}
          <button
            onClick={async () => { setInternalOpen(true); await loadInternal(); }}
            title="与处置员内部沟通（市民不可见）"
            style={{
              background:'#fff8e1', border:'1.5px solid #f0ad4e', borderRadius:'8px',
              padding:'5px 10px', cursor:'pointer', color:'#c87600',
              display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', fontWeight:'600',
            }}
          >
            <FaLock size={11} />协作
          </button>
        </div>
      </div>

      {/* 内部协作弹窗 */}
      <Modal
        open={internalOpen}
        onClose={() => setInternalOpen(false)}
        title={`内部协作 — #${ticket.id} ${ticket.title}`}
        footer={<Btn variant="ghost" onClick={() => setInternalOpen(false)}>关闭</Btn>}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{
            display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px',
            background:'#fff8e1', border:'1px solid #ffd54f', borderRadius:'8px',
            fontSize:'12px', color:'#f57c00',
          }}>
            <FaLock size={11} />此处消息仅管理员与处置员可见，市民不会看到
          </div>
          {/* 消息列表 */}
          <div style={{ minHeight:'120px', maxHeight:'260px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
            {loadingMsgs ? (
              <div style={{ textAlign:'center', color:'#c0c4cc', padding:'20px' }}>加载中…</div>
            ) : internalMsgs.length === 0 ? (
              <div style={{ textAlign:'center', color:'#c0c4cc', padding:'20px' }}>暂无内部消息</div>
            ) : (
              internalMsgs.map(m => (
                <div key={m.id} style={{
                  display:'flex',
                  flexDirection: m.sender_role === 'process_admin' ? 'row-reverse' : 'row',
                  alignItems:'flex-end', gap:'8px',
                }}>
                  <div style={{
                    maxWidth:'75%',
                    background: m.sender_role === 'process_admin' ? '#f57c00' : '#1658AF',
                    color:'#fff',
                    borderRadius: m.sender_role === 'process_admin' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                    padding:'8px 12px', fontSize:'13px', lineHeight:1.5,
                  }}>
                    <div style={{ fontSize:'11px', opacity:0.8, marginBottom:'3px' }}>
                      🔒 {m.sender_name} · {fmtTime(m.created_at)}
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
              placeholder="发消息给处置员（内部可见）…"
              style={{ flex:1, padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #ffd54f', fontSize:'13px', outline:'none', fontFamily:'inherit', background:'#fffde7' }}
            />
            <button
              onClick={handleSendInternal} disabled={!internalDraft.trim()}
              style={{
                padding:'8px 16px', borderRadius:'8px', border:'none', cursor: internalDraft.trim() ? 'pointer' : 'not-allowed',
                background: internalDraft.trim() ? '#f57c00' : '#e4e7ed',
                color: internalDraft.trim() ? '#fff' : '#909399',
                fontSize:'13px', fontWeight:'600', flexShrink:0,
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
          <Btn variant="ghost" onClick={onClose}>取消</Btn>
          <Btn variant="primary" onClick={handleBind} disabled={!selectedTemplate || loading}>
            {loading ? '绑定中…' : '确认绑定'}
          </Btn>
        </>
      }
    >
      <div>
        <div style={{ fontSize: '13px', color: '#606266', marginBottom: '10px' }}>
          为工单 #{ticket.id}「{ticket.title}」选择流程模板：
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {templates.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl.id)}
              style={{
                padding: '12px 14px', borderRadius: '10px',
                border: selectedTemplate === tpl.id ? '2px solid #0A2B4E' : '1.5px solid #e4e7ed',
                background: selectedTemplate === tpl.id ? '#e8f0fe' : '#fff',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a2a3a', marginBottom: '4px' }}>
                {tpl.name}
                {tpl.is_default === 1 && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#27AE60', background: '#E8F5E9', padding: '1px 6px', borderRadius: '8px' }}>默认</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#909399' }}>
                {Array.isArray(tpl.steps) ? tpl.steps.join(' → ') : tpl.steps}
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
          <span style={{ fontWeight: '600', fontSize: '15px', color: '#1a2a3a' }}>
            流程模板列表
          </span>
          <span style={{ marginLeft: '8px', fontSize: '13px', color: '#909399' }}>
            共 {templates.length} 个
          </span>
        </div>
        <Btn variant="primary" onClick={openCreate}>+ 新建模板</Btn>
      </div>

      {/* 模板列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '14px', color: '#c0c4cc' }}>
            暂无流程模板
          </div>
        ) : (
          templates.map(tpl => (
            <div
              key={tpl.id}
              style={{
                background: '#fff', borderRadius: '12px', padding: '16px 20px',
                border: '1px solid #e4e7ed', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '15px', color: '#1a2a3a' }}>{tpl.name}</span>
                  {tpl.is_default === 1 && (
                    <span style={{ fontSize: '11px', color: '#27AE60', background: '#E8F5E9', padding: '2px 8px', borderRadius: '8px', fontWeight: '600' }}>默认</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(tpl)}>编辑</Btn>
                  {tpl.is_default !== 1 && (
                    <Btn variant="danger" size="sm" onClick={() => handleDelete(tpl.id)}>删除</Btn>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(Array.isArray(tpl.steps) ? tpl.steps : []).map((step, idx) => (
                  <span key={idx} style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '12px',
                    background: '#f0f4ff', color: '#1658AF', fontWeight: '500',
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
            <Btn variant="ghost" onClick={() => setShowCreate(false)}>取消</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={loading || !name.trim() || !steps.trim()}>
              {loading ? '保存中…' : '保存'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#606266', marginBottom: '6px' }}>
              模板名称
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：标准7步流程"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1.5px solid #e4e7ed', fontSize: '14px', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#606266' }}>
                流程步骤（每行一个步骤）
              </label>
              <Btn variant="ghost" size="sm" onClick={handleAIGenerate} disabled={generating}>
                {generating ? 'AI 生成中…' : '🤖 AI 生成'}
              </Btn>
            </div>
            <textarea
              value={steps}
              onChange={e => setSteps(e.target.value)}
              placeholder={'接收工单\n现场核实\n制定方案\n分派任务\n执行处置\n复核验收\n办结归档'}
              rows={8}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1.5px solid #e4e7ed', fontSize: '14px', outline: 'none',
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
