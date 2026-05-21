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

// ─── 工单 ───
export const getTickets = (params = {}) =>
  api.get('/tickets', { params }).then(r => r.data);

export const getTicket = (id) =>
  api.get(`/tickets/${id}`).then(r => r.data);

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

export const bindFlow = (id, data) =>
  api.put(`/tickets/${id}/flow`, data).then(r => r.data);

export const updateProgress = (id, stepIndex, completed) =>
  api.patch(`/tickets/${id}/progress`, { stepIndex, completed }).then(r => r.data);

export const checkDuplicate = (data) =>
  api.post('/tickets/check-duplicate', data).then(r => r.data);

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

export default api;
