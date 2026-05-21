import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CitizenWorkbench({
  citizenId,
  displayName,
  tickets,
  onCreateTicket,
  onDeleteTicket,
  onOpenMessages,
  onOpenEvaluation,
  unreadMessageCount,
  recentMessage
}) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'my'
  const [formData, setFormData] = useState({
    event: '',
    location: '',
    occurred_at: ''
  });
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [warnings, setWarnings] = useState({ event: false, location: false, time: false });
  const [isDirty, setIsDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 标黄提醒规则
  useEffect(() => {
    const eventWarning = formData.event.length > 0 && formData.event.length < 5;
    const locationWarning = formData.location === '' || formData.location.includes('模糊');
    const timeWarning = !formData.occurred_at;
    setWarnings({ event: eventWarning, location: locationWarning, time: timeWarning });
    setIsDirty(true);
  }, [formData]);

  // 获取 AI 建议（防抖）
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.event && formData.event.length >= 3) {
        try {
          const res = await axios.post('/api/ai/suggest', {
            ticket: { title: formData.event, content: formData.event, location: formData.location }
          });
          setAiSuggestion(res.data.suggestion);
        } catch (err) {
          setAiSuggestion('AI 建议暂时无法获取，请稍后重试');
        }
      } else {
        setAiSuggestion('填写事件内容后可获取 AI 建议');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.event, formData.location]);

  const handleSubmit = async () => {
    if (warnings.event || warnings.location || warnings.time) {
      if (!confirm('表单中有必填项未填写完整，是否继续提交？')) return;
    }
    // 重复检测
    try {
      const dupRes = await axios.post('/api/tickets/check-duplicate', {
        citizenId,
        location: formData.location,
        content: formData.event
      });
      if (dupRes.data.duplicate) {
        if (!confirm('您在一小时内已上报相似事件，是否继续提交？')) return;
      }
    } catch (err) {
      console.error('重复检测失败', err);
    }

    setSubmitting(true);
    try {
      await onCreateTicket({
        title: formData.event,
        content: formData.event,
        location: formData.location,
        reporter: displayName,
        citizen_id: citizenId,
        source: 'citizen',
        occurred_at: formData.occurred_at
      });
      setFormData({ event: '', location: '', occurred_at: '' });
      setIsDirty(false);
      alert('工单提交成功');
      setActiveTab('my');
    } catch (err) {
      alert('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (tab) => {
    if (isDirty && (warnings.event || warnings.location || warnings.time)) {
      if (!confirm('表单未提交且存在标黄字段，是否离开？')) return;
    }
    setActiveTab(tab);
    setIsDirty(false);
  };

  // 待评价工单数量（从 tickets 中获取）
  const pendingEvalCount = tickets.filter(t => t.status === '已完成' && !t.evaluated).length;
  const recentPending = tickets.find(t => t.status === '已完成' && !t.evaluated);

  return (
    <div style={{ display: 'flex', gap: '32px', maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      {/* 左侧 65% */}
      <div style={{ flex: 2 }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px 28px' }}>
          <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e9ecef', marginBottom: '20px' }}>
            <button
              onClick={() => handleTabChange('new')}
              style={{
                padding: '8px 0',
                fontSize: '18px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === 'new' ? '#409EFF' : '#666',
                borderBottom: activeTab === 'new' ? '2px solid #409EFF' : 'none'
              }}
            >
              新建工单
            </button>
            <button
              onClick={() => handleTabChange('my')}
              style={{
                padding: '8px 0',
                fontSize: '18px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === 'my' ? '#409EFF' : '#666',
                borderBottom: activeTab === 'my' ? '2px solid #409EFF' : 'none'
              }}
            >
              我的工单
            </button>
          </div>

          {activeTab === 'new' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label>事件 <span style={{ color: 'red' }}>*</span></label>
                <textarea
                  rows="3"
                  value={formData.event}
                  onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid #ddd',
                    backgroundColor: warnings.event ? '#FFF3E0' : '#fff'
                  }}
                  placeholder="请描述事件（至少5个字符）"
                />
                {warnings.event && <span style={{ color: '#E6A23C', fontSize: '12px' }}>事件字数不足5字</span>}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label>地点 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid #ddd',
                    backgroundColor: warnings.location ? '#FFF3E0' : '#fff'
                  }}
                  placeholder="请填写具体地点"
                />
                {warnings.location && <span style={{ color: '#E6A23C', fontSize: '12px' }}>地点为空或模糊</span>}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label>时间 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="datetime-local"
                  value={formData.occurred_at}
                  onChange={(e) => setFormData({ ...formData, occurred_at: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid #ddd',
                    backgroundColor: warnings.time ? '#FFF3E0' : '#fff'
                  }}
                />
                {warnings.time && <span style={{ color: '#E6A23C', fontSize: '12px' }}>请选择时间</span>}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label>AI建议</label>
                <textarea
                  rows="2"
                  readOnly
                  value={aiSuggestion}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f7fa',
                    color: '#555'
                  }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  background: '#409EFF',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                {submitting ? '提交中...' : '提交工单'}
              </button>
            </div>
          )}

          {activeTab === 'my' && (
            <div>
              {tickets.length === 0 ? (
                <p>暂无工单</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f7fa' }}>
                      <th style={{ padding: '10px' }}>工单ID</th>
                      <th>事件</th>
                      <th>地点</th>
                      <th>时间</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{t.id}</td>
                        <td>{t.title}</td>
                        <td>{t.location}</td>
                        <td>{new Date(t.occurred_at || t.createdAt).toLocaleString()}</td>
                        <td>{t.status}</td>
                        <td>
                          <button
                            onClick={() => onOpenMessages(t.id)}
                            style={{ marginRight: '8px', padding: '4px 10px', borderRadius: '16px', border: '1px solid #409EFF', background: '#fff', color: '#409EFF', cursor: 'pointer' }}
                          >
                            留言
                          </button>
                          {t.status === '待派单' && (
                            <button
                              onClick={() => onDeleteTicket(t.id)}
                              style={{ padding: '4px 10px', borderRadius: '16px', border: '1px solid #F56C6C', background: '#fff', color: '#F56C6C', cursor: 'pointer' }}
                            >
                              删除
                            </button>
                          )}
                          {t.status === '已完成' && !t.evaluated && (
                            <button
                              onClick={() => onOpenEvaluation(t.id)}
                              style={{ padding: '4px 10px', borderRadius: '16px', border: '1px solid #67C23A', background: '#fff', color: '#67C23A', cursor: 'pointer' }}
                            >
                              评价
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 右侧 35% */}
      <div style={{ flex: 1 }}>
        {/* 留言提醒卡片 */}
        <div
          style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '20px 24px',
            marginBottom: '24px',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
          }}
          onClick={() => {
            if (tickets.length > 0) onOpenMessages(tickets[0]?.id);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>留言提醒</strong>
            {unreadMessageCount > 0 && (
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#F56C6C', borderRadius: '50%' }}></span>
            )}
          </div>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '12px' }}>
            {recentMessage ? `最新：${recentMessage}` : '暂无新留言'}
          </p>
        </div>

        {/* 待评价卡片 */}
        <div
          style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '20px 24px',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
          }}
          onClick={() => {
            if (pendingEvalCount > 0 && recentPending) onOpenEvaluation(recentPending.id);
            else alert('暂无待评价工单');
          }}
        >
          <strong>待评价</strong>
          <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>{pendingEvalCount}</div>
          {recentPending && (
            <p style={{ fontSize: '14px', color: '#666' }}>
              工单 #{recentPending.id}: {recentPending.title}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}