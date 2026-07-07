/**
 * frontend/src/api.js
 * 统一 API 工具 - 封装所有后端请求
 */
import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

// ─── 请求拦截：自动带 session ───
api.interceptors.request.use(config => {
  const s = sessionStorage.getItem('session');
  if (s) {
    try {
      const { sessionId } = JSON.parse(s);
      if (sessionId) config.headers['X-Session'] = sessionId;
    } catch {}
  }
  return config;
});

// ─── 登录 ───
export const loginAsCitizen = (phone, code) =>
  api.post('/citizen/login', { phone, code });

export const loginAsUser = (username) =>
  api.post('/login', { username });

export const logout = () =>
  api.post('/logout');

export const getMe = () =>
  api.get('/me').then(r => r.data);

export const getDispatchers = () =>
  api.get('/dispatchers').then(r => r.data);

// ─── 短信验证码 ───
export const sendSmsCode = (phone) =>
  api.post('/sms/send', { phone }).then(r => r.data);

export const verifySmsCode = (phone, code) =>
  api.post('/sms/verify', { phone, code }).then(r => r.data);

// ─── 图片上传 ───
export const uploadPhotos = (formData) =>
  api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

// ─── 工单 ───
export const getTickets = (params = {}) =>
  api.get('/tickets', { params }).then(r => r.data);

export const countTickets = (params = {}) =>
  api.get('/tickets/count', { params }).then(r => r.data);

export const getTicket = (id) =>
  api.get(`/tickets/${id}`).then(r => r.data);

// 导出工单 CSV（直接下载文件）
export const exportTicketsCSV = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const session = sessionStorage.getItem('session');
  let sessionId = '';
  if (session) { try { sessionId = JSON.parse(session).sessionId || ''; } catch {} }
  return fetch(`/api/tickets/export?${query}`, {
    headers: { 'X-Session': sessionId },
  }).then(r => r.blob()).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `工单导出_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};

export const createTicket = (data) =>
  api.post('/tickets', data).then(r => r.data);

export const deleteTicket = (id) =>
  api.delete(`/tickets/${id}`).then(r => r.data);

export const dispatchTicket = (id) =>
  api.post(`/tickets/${id}/dispatch`).then(r => r.data);

export const acceptTicket = (id, assignee) =>
  api.post(`/tickets/${id}/accept`, { assignee }).then(r => r.data);

export const updateDispatchStatus = (id, dispatchStatus) =>
  api.patch(`/tickets/${id}/dispatch-status`, { dispatchStatus }).then(r => r.data);

export const updateTicketFields = (id, updates) =>
  api.patch(`/tickets/${id}`, updates).then(r => r.data);

export const bindFlow = (id, data) =>
  api.put(`/tickets/${id}/flow`, data).then(r => r.data);

export const updateProgress = (id, stepIndex, completed) =>
  api.patch(`/tickets/${id}/progress`, { stepIndex, completed }).then(r => r.data);

export const checkDuplicate = (data) =>
  api.post('/tickets/check-duplicate', data).then(r => r.data);

// ─── 全局搜索（Banner用） ───
export const searchTickets = (params = {}) =>
  api.get('/tickets', { params }).then(r => r.data);

// ─── 留言 ───
export const getMessages = (params = {}) =>
  api.get('/messages', { params }).then(r => r.data);

export const sendMessage = (data) =>
  api.post('/messages', data).then(r => r.data);

export const getUnreadCount = (role) =>
  api.get('/messages/unread-count', { params: { role } }).then(r => r.data);

export const markMessageRead = (id) =>
  api.patch(`/messages/${id}/read`).then(r => r.data);

export const markTicketMessagesRead = (ticketId) =>
  api.patch(`/messages/ticket/${ticketId}/read`).then(r => r.data);

// ─── 评价 ───
export const submitEvaluation = (data) =>
  api.post('/evaluations', data).then(r => r.data);

export const getEvaluations = (citizenId) =>
  api.get(`/evaluations/citizen/${citizenId}`).then(r => r.data);

export const getEvaluation = (ticketId) =>
  api.get(`/evaluations/ticket/${ticketId}`).then(r => r.data);

export const getPendingEvaluations = (citizenId) =>
  api.get('/evaluations/pending', { params: { citizenId } }).then(r => r.data);

// ─── 统计 ───
export const getStatistics = () =>
  api.get('/statistics').then(r => r.data);

// ─── 问题热榜 ───
export const getHotTopics = () =>
  api.get('/hot-topics').then(r => r.data);

// ─── 超时预警 ───
export const getTimeoutTickets = () =>
  api.get('/timeout-tickets').then(r => r.data);

// ─── AI 周报摘要 ───
export const getWeeklySummary = () =>
  api.get('/ai/weekly-summary').then(r => r.data);

// ─── 流程模板 ───
export const getFlowTemplates = () =>
  api.get('/flow-templates').then(r => r.data);

export const getFlowTemplate = (id) =>
  api.get(`/flow-templates/${id}`).then(r => r.data);

export const saveFlowTemplate = (data) =>
  api.post('/flow-templates', data).then(r => r.data);

export const deleteFlowTemplate = (id) =>
  api.delete(`/flow-templates/${id}`).then(r => r.data);

// ─── AI ───
export const getAISuggestion = (ticket) =>
  api.post('/ai/suggest', { ticket }).then(r => r.data);

export const generateFlow = (description) =>
  api.post('/ai/generateFlow', { description }).then(r => r.data);

// ─── 图片 URL 辅助：自动拼接 session 参数（绕过 uploads 鉴权）───
export const getImageUrl = (relativeUrl) => {
  if (!relativeUrl) return '';
  const s = sessionStorage.getItem('session');
  let sessionId = '';
  if (s) {
    try { sessionId = JSON.parse(s).sessionId || ''; } catch {}
  }
  const sep = relativeUrl.includes('?') ? '&' : '?';
  return sessionId ? `${relativeUrl}${sep}session=${sessionId}` : relativeUrl;
};

export default api;

