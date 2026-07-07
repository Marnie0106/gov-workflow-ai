import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTickets, countTickets, createTicket, checkDuplicate,
  getMessages, sendMessage, markTicketMessagesRead,
  getEvaluations, submitEvaluation, getPendingEvaluations,
} from '../api';
import TicketForm from './citizen/TicketForm';
import { MessageCard, MessageView } from './citizen/MessagePanel';
import { EvaluationCard, EvaluationView } from './citizen/EvaluationPanel';
import { StatusBadge, fmtTime, getUserName, Loading } from '../components/Common';
import { SearchBar, Pagination } from '../components/SearchPaginate';
import TicketDetailModal from '../components/TicketDetailModal';
import { useToast } from '../components/Toast';

/* ── 状态中文映射 ── */
const STATUS_LABEL = {
  created: '待派单',
  dispatched: '处置中',
  completed: '已完成',
};

/* ── 获取当前市民ID ── */
function getCitizenId() {
  return sessionStorage.getItem('userId') || '1';
}

/* ─────────────────────────────────────────────
   市民工作台主页面
───────────────────────────────────────────── */
export default function CitizenPage() {
  const toast = useToast();
  const citizenId = getCitizenId();

  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [evaluatedIds, setEvaluatedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('workbench');
  const [detailTicketId, setDetailTicketId] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchTickets = useCallback(async () => {
    try {
      const data = await getTickets({ citizenId, keyword: keyword || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
      setTickets(Array.isArray(data) ? data : []);
      const countData = await countTickets({ citizenId, keyword: keyword || undefined });
      setTotal(countData?.count || 0);
    } catch {
      toast('加载工单失败', 'error');
    }
  }, [citizenId, toast, keyword, page]);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await getMessages({});
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      toast('加载留言失败', 'error');
    }
  }, [toast]);

  const fetchEvaluations = useCallback(async () => {
    try {
      const data = await getEvaluations(citizenId);
      const ids = new Set((Array.isArray(data) ? data : []).map(e => e.ticket_id));
      setEvaluatedIds(ids);
    } catch {}
  }, [citizenId]);

  useEffect(() => {
    Promise.all([fetchTickets(), fetchMessages(), fetchEvaluations()])
      .finally(() => setLoading(false));
  }, [fetchTickets, fetchMessages, fetchEvaluations]);

  const [showForm, setShowForm] = useState(false); // 新建工单表单默认折叠
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
      toast('工单提交成功', 'success');
      setShowForm(false); // 提交后自动收起
      await fetchTickets();
    } catch (err) {
      toast('创建工单失败，请重试', 'error');
      throw err;
    }
  };

  const handleCheckDuplicate = async (location, content) => {
    try {
      return await checkDuplicate({ citizenId, location, content });
    } catch {
      return { duplicate: false };
    }
  };

  const handleAddMessage = async (msg) => {
    try {
      await sendMessage(msg);
      toast('消息已发送', 'success');
      await fetchMessages();
    } catch {
      toast('发送失败', 'error');
    }
  };

  const handleMarkRead = async (ticketId) => {
    try {
      await markTicketMessagesRead(ticketId);
      await fetchMessages();
    } catch {}
  };

  const handleSubmitEval = async (ticketId, rating, comment) => {
    try {
      await submitEvaluation({ ticket_id: ticketId, citizen_id: citizenId, rating, comment });
      setEvaluatedIds(prev => new Set([...prev, ticketId]));
      toast('评价提交成功，感谢您的反馈！', 'success');
      await fetchEvaluations();
    } catch {
      toast('评价提交失败', 'error');
    }
  };

  const completedTickets = useMemo(() => tickets.filter(t => t.status === 'completed'), [tickets]);
  const pendingEvalTickets = useMemo(() => completedTickets.filter(t => !evaluatedIds.has(t.id)), [completedTickets, evaluatedIds]);
  const unreadMessages = useMemo(() => messages.filter(m => !m.is_read && m.sender_role !== 'citizen'), [messages]);

  if (loading) return <Loading text="正在加载工作台数据…" />;

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

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A2E', marginBottom: '6px' }}>
          市民工作台
        </h2>
        <p style={{ fontSize: '14px', color: '#8C9AAF' }}>
          {getUserName('市民')} · 共 {tickets.length} 条工单
        </p>
      </div>

      <div style={{
        display: 'flex', gap: '20px', alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        {/* 左侧：新建工单（默认折叠） */}
        <div style={{ flex: '1 1 500px', minWidth: 0 }}>
          <div style={{
            background:'#fff', borderRadius:'12px', padding:'14px 18px',
            border:'1px solid #EDF2F7', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
            marginBottom:'14px',
          }}>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                width:'100%', padding:'10px 0', border:'none', background:'none',
                cursor:'pointer', display:'flex', alignItems:'center', gap:'8px',
                fontSize:'14px', fontWeight:'700', color:'#1B3A5C',
              }}
            >
              <span style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:'24px', height:'24px', borderRadius:'6px',
                background: showForm ? '#1B3A5C' : '#F0F4F8',
                color: showForm ? '#fff' : '#1B3A5C',
                fontSize:'16px', fontWeight:'700', transition:'all 0.2s',
              }}>{showForm ? '✕' : '+'}</span>
              我要上报问题
            </button>
            {showForm && (
              <div style={{ marginTop:'12px', animation:'fadeIn 0.25s ease' }}>
                <TicketForm
                  citizenId={citizenId}
                  tickets={tickets}
                  onSubmit={handleCreateTicket}
                  onCheckDuplicate={handleCheckDuplicate}
                />
              </div>
            )}
          </div>

          {/* 搜索框 */}
          <div style={{ marginBottom: '12px' }}>
            <SearchBar
              value={keyword}
              onChange={(v) => { setKeyword(v); setPage(1); }}
              placeholder="搜索我的工单（标题/地点/内容）…"
            />
          </div>

          {/* 我的工单历史 */}
          <div style={{
            marginTop: '12px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid #EDF2F7',
            padding: '18px 24px',
          }}>
            <h4 style={{
              fontSize: '16px', fontWeight: '700',
              color: '#1A1A2E', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              我的工单历史
              <span style={{
                background: '#EDF2F7', color: '#1B3A5C',
                borderRadius: '4px', padding: '1px 8px',
                fontSize: '12px', fontWeight: '600',
              }}>{tickets.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tickets.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#8C9AAF', fontSize: '13px', padding: '20px 0' }}>
                  暂无工单，请提交第一个工单
                </div>
              ) : (
                tickets.slice(0, 5).map((t) => (
                  <TicketRow key={t.id} ticket={t} onClick={() => setDetailTicketId(t.id)} />
                ))
              )}
              {tickets.length > 5 && (
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#8C9AAF', padding: '8px 0' }}>
                  … 共 {tickets.length} 条
                </div>
              )}
              {tickets.length > 0 && total > PAGE_SIZE && (
                <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
              )}
            </div>
          </div>
        </div>

        {/* 右侧：卡片区 */}
        <div style={{
          flex: '0 1 320px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'sticky',
          top: '80px',
        }}>
          <MessageCard
            messages={messages}
            unreadCount={unreadMessages.length}
            onOpen={() => setView('messages')}
          />
          <EvaluationCard
            pendingTickets={pendingEvalTickets}
            onOpen={() => setView('evaluation')}
          />
          <StatsCard tickets={tickets} evaluatedIds={evaluatedIds} statusLabel={STATUS_LABEL} />
        </div>
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

/* ── 工单行 ── */
function TicketRow({ ticket, onClick }) {
  const statusText = ticket.dispatch_status || STATUS_LABEL[ticket.status] || ticket.status;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px',
        background: '#F5F7FA', borderRadius: '8px',
        border: '1px solid #E4E7ED',
        fontSize: '13px', flexWrap:'wrap',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#EEF3FD'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#F5F7FA'; }}
    >
      <span style={{ flex: 1, color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth:0 }}>
        #{ticket.id} {ticket.title}
      </span>
      <span style={{ color: '#8C9AAF', flexShrink: 0 }}>
        {(ticket.location || '').length > 8 ? ticket.location.slice(0, 8) + '…' : ticket.location}
      </span>
      {ticket.isTimeout === 1 && (
        <span style={{ color: '#C0392B', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>超时</span>
      )}
      <StatusBadge status={statusText} />
    </div>
  );
}

/* ── 快速统计卡片 ── */
function StatsCard({ tickets, evaluatedIds }) {
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
    <div style={{
      background: '#fff', borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      border: '1px solid #EDF2F7',
      padding: '16px 20px',
    }}>
      <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A2E', marginBottom: '14px' }}>
        数据概览
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {items.map((item) => (
          <div key={item.label} style={{
            background: '#F5F7FA', borderRadius: '8px',
            padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: item.color }}>{item.value}</div>
            <div style={{ fontSize: '11px', color: '#8C9AAF', marginTop: '2px' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
