/**
 * backend/server.js
 * 后端主入口 - 市容巡查一体化系统 API
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 3001;

// ==================== 文件上传配置 ====================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `img_${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('只允许上传图片'));
  },
});

// ==================== 短信验证码缓存（内存） ====================
// key: phone, value: { code, expireAt }
const smsCache = new Map();

// 初始化数据库
const db = require('./db');
db.initDatabase();

app.use(cors());
app.use(bodyParser.json());

// ==================== 认证中间件 ====================

function authOptional(req, res, next) {
  const sessionId = req.headers['x-session'] || req.query.session;
  if (!sessionId) return next();
  db.validateSession(sessionId).then(session => {
    if (session) {
      req.sessionData = session;
    }
    next();
  }).catch(() => next());
}

app.use('/api', authOptional);

// ==================== 登录 API ====================

// 市民登录（手机号 + 验证码）
app.post('/api/citizen/login', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: '手机号和验证码不能为空' });
  db.citizenLogin(phone, code, async (err, citizen) => {
    if (err) return res.status(401).json({ error: err.message });
    try {
      const session = await db.createSession('citizen', citizen.id, 'citizen', citizen.nickname);
      res.json({ success: true, citizen: { id: citizen.id, phone: citizen.phone, nickname: citizen.nickname }, session });
    } catch (e) {
      res.status(500).json({ error: '登录失败' });
    }
  });
});

// 系统用户登录（工号 或 用户名）
app.post('/api/login', (req, res) => {
  const { username, employee_id } = req.body;
  const identifier = (employee_id || username || '').trim();
  if (!identifier) return res.status(400).json({ error: '请输入工号' });
  const d = db.getDb();
  // 工号优先，同时也支持 username 匹配（兼容旧版）
  d.get(
    `SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_key = r.role_key
     WHERE u.employee_id = ? OR u.username = ?`,
    [identifier, identifier],
    async (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: '工号不存在，请确认后重试' });
      try {
        const session = await db.createSession('user', user.id, user.role_key, user.display_name);
        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            employeeId: user.employee_id,
            role: user.role_key,
            displayName: user.display_name,
            department: user.department,
          },
          session
        });
      } catch (e) {
        res.status(500).json({ error: '登录失败' });
      }
    }
  );
});

// 登出
app.post('/api/logout', async (req, res) => {
  const sessionId = req.headers['x-session'] || req.query.session;
  if (sessionId) await db.deleteSession(sessionId).catch(() => {});
  res.json({ success: true });
});

// 获取当前会话信息
app.get('/api/me', (req, res) => {
  if (!req.sessionData) return res.json(null);
  res.json({
    userType: req.sessionData.user_type,
    userId: req.sessionData.user_id,
    role: req.sessionData.role_key,
    displayName: req.sessionData.display_name,
  });
});

// 获取处置人员列表
app.get('/api/dispatchers', (req, res) => {
  db.getDispatchers((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==================== 短信验证码 API ====================

// 发送验证码（演示：固定返回123456，真实环境接短信平台）
app.post('/api/sms/send', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\d{11}$/.test(phone)) {
    return res.status(400).json({ error: '请输入有效的11位手机号' });
  }
  const code = '123456'; // 演示固定验证码
  smsCache.set(phone, { code, expireAt: Date.now() + 5 * 60 * 1000 });
  // 实际生产应调用短信平台API
  console.log(`[SMS] 向 ${phone} 发送验证码: ${code}`);
  res.json({ success: true, message: '验证码已发送（演示系统：固定为123456）' });
});

// 验证验证码
app.post('/api/sms/verify', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: '手机号和验证码不能为空' });
  const cached = smsCache.get(phone);
  if (!cached) return res.status(400).json({ error: '验证码不存在或已过期，请重新获取' });
  if (Date.now() > cached.expireAt) {
    smsCache.delete(phone);
    return res.status(400).json({ error: '验证码已过期，请重新获取' });
  }
  if (cached.code !== String(code)) return res.status(400).json({ error: '验证码错误' });
  smsCache.delete(phone);
  res.json({ success: true, verified: true });
});

// ==================== 图片上传 API ====================

app.post('/api/upload', upload.array('photos', 3), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '未收到图片' });
  }
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ success: true, urls });
});

// 静态服务 uploads 目录
app.use('/uploads', express.static(uploadDir));

// ==================== 工单 API ====================

app.get('/api/tickets', (req, res) => {
  const { citizenId, assignee, status, dispatch_status, keyword, startDate, endDate } = req.query;
  db.queryTickets({ citizenId, assignee, status, dispatch_status, keyword, startDate, endDate }, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/tickets/:id', (req, res) => {
  db.getTicket(req.params.id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '工单不存在' });
    res.json(row);
  });
});

app.post('/api/tickets', async (req, res) => {
  const { title, content, location, reporter, citizen_id, source, occurred_at, photo_urls } = req.body;
  if (!title || !content || !location) {
    return res.status(400).json({ error: '标题、内容、地点不能为空' });
  }
  db.createTicket({ title, content, location, reporter, citizen_id, source, occurred_at, photo_urls }, async (err, ticketId) => {
    if (err) return res.status(500).json({ error: err.message });
    const { analyzeTicket, recommendDepartment } = require('./agents');
    const ticketObj = { id: ticketId, title, content, location, reporter };
    analyzeTicket(ticketObj).then(anomaly => {
      recommendDepartment(ticketObj).then(deptRec => {
        db.updateTicket(ticketId, {
          isDuplicate: anomaly.isDuplicate ? 1 : 0,
          isVague: anomaly.isVague ? 1 : 0,
          department: deptRec.department
        }, () => {});
      }).catch(console.error);
    }).catch(console.error);
    res.json({ id: ticketId, success: true });
  });
});

app.delete('/api/tickets/:id', (req, res) => {
  db.getTicket(req.params.id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '工单不存在' });
    if (row.status !== 'created') return res.status(403).json({ error: '只有待派单状态的工单可删除' });
    db.deleteTicket(req.params.id, err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

app.post('/api/tickets/:id/dispatch', (req, res) => {
  db.updateTicket(req.params.id, {
    status: 'dispatched', currentNode: '派单', dispatchedAt: new Date().toISOString(), dispatch_status: '派单中'
  }, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/tickets/:id/accept', (req, res) => {
  const { assignee } = req.body;
  db.updateTicket(req.params.id, {
    status: 'dispatched', dispatch_status: '已接受', assignee: assignee || '处置人员',
    acceptedAt: new Date().toISOString(), currentNode: '现场核实'
  }, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, assignee: assignee || '处置人员' });
  });
});

app.patch('/api/tickets/:id/dispatch-status', (req, res) => {
  const { dispatchStatus } = req.body;
  const valid = ['待派单', '派单中', '已接受', '处理中', '已完结'];
  if (!valid.includes(dispatchStatus)) return res.status(400).json({ error: '无效状态' });
  const updates = { dispatch_status: dispatchStatus };
  if (dispatchStatus === '已接受') { updates.acceptedAt = new Date().toISOString(); updates.currentNode = '现场核实'; }
  if (dispatchStatus === '处理中') updates.currentNode = '执行处置';
  if (dispatchStatus === '已完结') {
    updates.status = 'completed'; updates.resolvedAt = new Date().toISOString();
    updates.completed_at = new Date().toISOString(); updates.currentNode = '办结归档';
  }
  db.updateTicket(req.params.id, updates, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.put('/api/tickets/:id/flow', (req, res) => {
  const { flowTemplateId, steps } = req.body;
  if (flowTemplateId) {
    db.getFlowTemplate(flowTemplateId, (err, template) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!template) return res.status(404).json({ error: '模板不存在' });
      db.bindFlowToTicket(req.params.id, flowTemplateId, template.steps, err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, flowTemplateId });
      });
    });
  } else if (steps && Array.isArray(steps)) {
    db.bindFlowToTicket(req.params.id, null, steps, err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, steps });
    });
  } else {
    res.status(400).json({ error: '缺少流程信息' });
  }
});

app.patch('/api/tickets/:id/progress', (req, res) => {
  const { stepIndex, completed } = req.body;
  if (stepIndex === undefined || completed === undefined) return res.status(400).json({ error: '缺少参数' });
  db.updateFlowProgress(req.params.id, stepIndex, completed, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/tickets/check-duplicate', (req, res) => {
  const { citizenId, location, content } = req.body;
  if (!citizenId || !location || !content) return res.status(400).json({ error: '缺少必要参数' });
  db.checkDuplicate(citizenId, location, content, (err, duplicate, similarTicketId) => {
    if (err) return res.status(500).json({ error: err.message });
    if (duplicate && similarTicketId) {
      db.getTicket(similarTicketId, (e2, row) => {
        res.json({ duplicate: true, similarTicket: row || { id: similarTicketId } });
      });
    } else {
      res.json({ duplicate: false });
    }
  });
});

// ==================== 留言 API ====================

app.get('/api/messages', (req, res) => {
  const { ticketId, senderRole, isRead, is_internal } = req.query;
  const filters = {
    ticketId,
    senderRole,
    isRead: isRead !== undefined ? parseInt(isRead) : undefined,
    is_internal: is_internal !== undefined ? parseInt(is_internal) : undefined,
  };
  db.queryMessages(filters, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/messages', (req, res) => {
  const { ticket_id, sender_role, sender_name, content, is_internal } = req.body;
  if (!ticket_id || !sender_role || !sender_name || !content) return res.status(400).json({ error: '参数不完整' });
  db.addMessage({ ticket_id, sender_role, sender_name, content, is_internal: is_internal ? 1 : 0 }, (err, id) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

app.get('/api/messages/unread-count', (req, res) => {
  const role = req.query.role || 'citizen';
  const userId = req.sessionData ? req.sessionData.user_id : null;
  db.countUnreadMessages(role, userId, (err, count) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ count });
  });
});

app.patch('/api/messages/:id/read', (req, res) => {
  db.markMessageRead(req.params.id, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.patch('/api/messages/ticket/:ticketId/read', (req, res) => {
  db.markTicketMessagesRead(req.params.ticketId, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ==================== 评价 API ====================

app.post('/api/evaluations', (req, res) => {
  const { ticket_id, citizen_id, rating, comment } = req.body;
  if (!ticket_id || !citizen_id || !rating) return res.status(400).json({ error: '参数不完整' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: '评分需在1-5之间' });
  db.getEvaluation(ticket_id, (err, existing) => {
    if (existing) return res.status(400).json({ error: '该工单已评价' });
    db.addEvaluation({ ticket_id, citizen_id, rating, comment }, (err, id) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    });
  });
});

app.get('/api/evaluations/citizen/:citizenId', (req, res) => {
  db.queryEvaluationsByCitizen(req.params.citizenId, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/evaluations/ticket/:ticketId', (req, res) => {
  db.getEvaluation(req.params.ticketId, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
});

app.get('/api/evaluations/pending', (req, res) => {
  const { citizenId } = req.query;
  if (!citizenId) return res.status(400).json({ error: '缺少 citizenId' });
  db.queryPendingEvaluations(citizenId, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==================== 统计 API ====================

app.get('/api/statistics', (req, res) => {
  db.getStatistics((err, stats) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(stats);
  });
});

// ==================== 流程模板 API ====================

app.get('/api/flow-templates', (req, res) => {
  db.queryFlowTemplates((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, steps: JSON.parse(r.steps) })));
  });
});

app.get('/api/flow-templates/:id', (req, res) => {
  db.getFlowTemplate(req.params.id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '模板不存在' });
    res.json(row);
  });
});

app.post('/api/flow-templates', (req, res) => {
  const { name, steps, is_default, created_by } = req.body;
  if (!name || !steps) return res.status(400).json({ error: '缺少名称或步骤' });
  db.saveFlowTemplate({ name, steps, is_default, created_by }, (err, id) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

app.delete('/api/flow-templates/:id', (req, res) => {
  db.deleteFlowTemplate(req.params.id, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ==================== AI 接口 ====================

app.post('/api/ai/suggest', async (req, res) => {
  const { ticket } = req.body;
  if (!ticket) return res.status(400).json({ error: '缺少工单信息' });
  const systemPrompt = '你是政务工单处理专家。请根据工单信息和异常类型，给出具体的处理建议和下一步操作。用简洁的中文回答。';
  const userPrompt = `工单标题：${ticket.title}，内容：${ticket.content}，位置：${ticket.location}。
异常类型：超时=${ticket.isTimeout ? '是' : '否'}，重复=${ticket.isDuplicate ? '是' : '否'}，模糊=${ticket.isVague ? '是' : '否'}。请给出建议。`;
  try {
    const API_KEY = process.env.DEEPSEEK_API_KEY;
    const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.7
    }, { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } });
    res.json({ suggestion: response.data.choices[0].message.content });
  } catch (err) {
    console.error('AI建议失败:', err.message);
    res.json({ suggestion: '系统暂时无法生成建议，请人工处理。' });
  }
});

app.post('/api/ai/generateFlow', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: '缺少描述' });
  const systemPrompt = `你是政务流程设计专家。根据描述生成节点数组和边数组。输出严格JSON。
{"nodes":[{"id":"1","label":"工单创建"}],"edges":[{"source":"1","target":"2"}]}`;
  try {
    const API_KEY = process.env.DEEPSEEK_API_KEY;
    const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `流程：${description}` }],
      temperature: 0.3
    }, { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } });
    let content = response.data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(content));
  } catch (err) {
    console.error('AI生成流程失败:', err.message);
    res.json({ nodes: [{ id: '1', label: '工单创建' }, { id: '2', label: '派单' }, { id: '3', label: '办结归档' }], edges: [{ source: '1', target: '2' }, { source: '2', target: '3' }] });
  }
});

// ==================== 定时任务 ====================

// 超时检查：每5分钟，24小时内未完结的工单标记超时
setInterval(() => {
  const ago = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.getDb().run(
    `UPDATE tickets SET isTimeout = 1 WHERE status IN ('created','dispatched') AND createdAt < ? AND isTimeout = 0`,
    [ago], err => { if (err) console.error('超时检查失败:', err); }
  );
}, 5 * 60 * 1000);

// ==================== 静态文件服务 ====================
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

// ==================== 启动 ====================
app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
