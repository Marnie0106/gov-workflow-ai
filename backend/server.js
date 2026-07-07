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
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = 3001;

// ==================== 并发保护：简单令牌桶限流 ====================
// 限制每 IP 每秒最多 20 个请求，防止单 IP 打爆 SQLite
const rateLimitMap = new Map();
function rateLimiter(maxPerSec = 20) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip) || { tokens: maxPerSec, last: now };
    const elapsed = (now - entry.last) / 1000;
    entry.tokens = Math.min(maxPerSec, entry.tokens + elapsed * maxPerSec);
    entry.last = now;
    if (entry.tokens < 1) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }
    entry.tokens -= 1;
    rateLimitMap.set(ip, entry);
    next();
  };
}
// 定期清理限流记录（每5分钟清理超过1分钟未活跃的IP）
setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [ip, entry] of rateLimitMap) {
    if (entry.last < cutoff) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// ==================== SQLite 写操作串行队列 ====================
// 解决 SQLite 单写锁问题：所有写操作排队执行，避免 SQLITE_BUSY
class WriteQueue {
  constructor() {
    this.queue = Promise.resolve();
  }
  enqueue(fn) {
    return new Promise((resolve, reject) => {
      this.queue = this.queue.then(() => {
        return new Promise((innerResolve) => {
          fn((err, result) => {
            if (err) reject(err);
            else resolve(result);
            innerResolve();
          });
        });
      }).catch(() => {}); // 防止队列断裂
    });
  }
}
const writeQueue = new WriteQueue();

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
const { decrypt } = require('./db');
db.initDatabase();

app.use(cors());
app.use(bodyParser.json());
// 全局限流（读+写都限，但给得比较宽松：每秒20个请求）
app.use(rateLimiter(20));

// ==================== SQLite WAL 模式 ====================
// WAL 模式下读写不互斥，大幅提升并发读能力
const dbModule = require('./db');
dbModule.getDb().run('PRAGMA journal_mode=WAL');
dbModule.getDb().run('PRAGMA synchronous=NORMAL'); // 平衡安全性和性能
dbModule.getDb().run('PRAGMA busy_timeout=30000');  // 30秒超时而非立即失败

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
  
  // 先验证短信验证码
  const cached = smsCache.get(phone);
  if (!cached) return res.status(400).json({ error: '验证码不存在或已过期，请重新获取' });
  if (Date.now() > cached.expireAt) { smsCache.delete(phone); return res.status(400).json({ error: '验证码已过期，请重新获取' }); }
  if (cached.code !== String(code)) return res.status(401).json({ error: '验证码错误' });
  smsCache.delete(phone); // 验证通过就删除，防止重用
  
  // 查数据库
  const d = db.getDb();
  d.get(`SELECT * FROM citizens WHERE phone = ?`, [phone], (err, citizen) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!citizen) return res.json({ success: true, need_register: true, phone, citizen: null });
    if (!citizen.is_verified) return res.json({ success: true, need_register: true, phone, citizen: { id: citizen.id, phone: citizen.phone } });
    db.createSession('citizen', citizen.id, 'citizen', citizen.real_name || citizen.nickname).then(session => {
      res.json({ success: true, citizen: { id: citizen.id, phone: citizen.phone, nickname: citizen.nickname, realName: citizen.real_name, isVerified: true }, session });
    }).catch(() => res.status(500).json({ error: '登录失败' }));
  });
});

// 市民实名注册
app.post('/api/citizen/register', (req, res) => {
  const { phone, realName, idNumber } = req.body;
  if (!phone || !realName || !idNumber) return res.status(400).json({ error: '手机号、姓名和身份证号不能为空' });
  db.citizenRegister(phone, realName, idNumber, async (err, citizen) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const session = await db.createSession('citizen', citizen.id, 'citizen', citizen.real_name || citizen.nickname);
      res.json({ success: true, citizen: { id: citizen.id, phone: citizen.phone, nickname: citizen.nickname, realName: citizen.real_name, isVerified: !!citizen.is_verified }, session });
    } catch (e) {
      res.status(500).json({ error: '注册失败' });
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

// ─── 人员管理 API ───

// 查询所有政务人员
app.get('/api/users', (req, res) => {
  db.queryUsers((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      id: r.id,
      username: r.username,
      employeeId: r.employee_id,
      roleKey: r.role_key,
      roleName: r.role_name,
      displayName: r.display_name,
      department: r.department,
    })));
  });
});

// 手动添加政务人员
app.post('/api/users', (req, res) => {
  const { username, employee_id, role_key, display_name, department } = req.body;
  db.createUser({ username, employee_id, role_key, display_name, department }, (err, id) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ success: true, id });
  });
});

// 批量导入政务人员
app.post('/api/users/import', (req, res) => {
  const { users } = req.body;
  if (!users || !Array.isArray(users)) return res.status(400).json({ error: '请提供users数组' });
  db.importUsers(users, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, ...result });
  });
});

// 删除政务人员
app.delete('/api/users/:id', (req, res) => {
  db.deleteUser(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ==================== 短信验证码 API ====================

// 发送验证码（模拟真实短信：随机6位码，有效期5分钟）
app.post('/api/sms/send', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\d{11}$/.test(phone)) {
    return res.status(400).json({ error: '请输入有效的11位手机号' });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 随机6位
  smsCache.set(phone, { code, expireAt: Date.now() + 5 * 60 * 1000 });
  console.log(`[SMS] → ${phone}  验证码: ${code}  (有效期5分钟)`);
  res.json({ success: true, code, message: `验证码已生成（模拟短信：${code}）` });
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

// 静态服务 uploads 目录（需登录鉴权）
app.use('/uploads', (req, res, next) => {
  const sessionId = req.headers['x-session'] || req.query.session;
  if (!sessionId) {
    // 也允许通过 URL 参数 session=xxx 访问（方便 img src 传递）
    return res.status(401).json({ error: '请先登录后查看图片' });
  }
  db.validateSession(sessionId).then(session => {
    if (session) next();
    else res.status(401).json({ error: '登录已过期，请重新登录' });
  }).catch(() => res.status(401).json({ error: '鉴权失败' }));
}, express.static(uploadDir));

// ==================== 工单 API ====================

app.get('/api/tickets', (req, res) => {
  const { citizenId, assignee, status, dispatch_status, keyword, startDate, endDate, limit, offset } = req.query;
  db.queryTickets({ citizenId, assignee, status, dispatch_status, keyword, startDate, endDate, limit, offset }, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 查询工单总数（用于分页）
app.get('/api/tickets/count', (req, res) => {
  const { citizenId, assignee, status, dispatch_status, keyword, startDate, endDate } = req.query;
  const conditions = [];
  const params = [];
  if (citizenId)      { conditions.push('citizen_id = ?');       params.push(citizenId); }
  if (assignee)       { conditions.push('assignee = ?');         params.push(assignee); }
  if (status)         { conditions.push('status = ?');             params.push(status); }
  if (dispatch_status){ conditions.push('dispatch_status = ?');   params.push(dispatch_status); }
  if (keyword)        { conditions.push('(title LIKE ? OR content LIKE ? OR location LIKE ?)');
                        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  if (startDate)      { conditions.push('(createdAt >= ? OR occurred_at >= ?)');
                        params.push(startDate, startDate); }
  if (endDate)        { conditions.push('(createdAt <= ? OR occurred_at <= ?)');
                        params.push(endDate, endDate); }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  db.getDb().get(`SELECT COUNT(*) as cnt FROM tickets ${where}`, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ count: row?.cnt || 0 });
  });
});

// ==================== CSV 导出（必须在 :id 路由之前）====================
app.get('/api/tickets/export', (req, res) => {
  const { keyword, status, dispatch_status, startDate, endDate } = req.query;
  db.queryTickets({ keyword, status, dispatch_status, startDate, endDate, limit: 10000 }, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const headers = ['ID', '标题', '内容', '地点', '状态', '派单状态', '派单部门', '处理人', '创建时间', '发生时间', '超时', '重复', '模糊'];
    const csvLines = [headers.join(',')];
    for (const r of (rows || [])) {
      csvLines.push([
        r.id,
        `"${(r.title || '').replace(/"/g, '""')}"`,
        `"${(r.content || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(r.location || '').replace(/"/g, '""')}"`,
        r.status || '', r.dispatch_status || '', r.department || '', r.assignee || '',
        r.createdAt || '', r.occurred_at || '',
        r.isTimeout ? '是' : '否', r.isDuplicate ? '是' : '否', r.isVague ? '是' : '否',
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tickets_${Date.now()}.csv`);
    res.send('\ufeff' + csvLines.join('\n'));
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
    // 异步调用分类 Agent（ReAct 架构），不阻塞响应
    const { classifyTicketAgent } = require('./agents');
    const ticketObj = { id: ticketId, title, content, location, reporter };
    classifyTicketAgent(ticketObj, db.getDb()).then(result => {
      const updates = {};
      if (result.department) updates.department = result.department;
      if (result.isDuplicate !== undefined) updates.isDuplicate = result.isDuplicate ? 1 : 0;
      if (result.isVague !== undefined) updates.isVague = result.isVague ? 1 : 0;
      if (result.category) updates.category = result.category;
      if (Object.keys(updates).length > 0) {
        db.updateTicket(ticketId, updates, () => {});
      }
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

// 管理员修改工单字段（分类/部门/状态等）
app.patch('/api/tickets/:id', (req, res) => {
  const allowed = ['department', 'category', 'status', 'dispatch_status', 'currentNode', 'assignee', 'isDuplicate', 'isVague'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: '没有提供可修改的字段' });
  db.updateTicket(req.params.id, updates, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, updates });
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

// ==================== 问题热榜 ====================
app.get('/api/hot-topics', (req, res) => {
  db.getHotTopics((err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

// ==================== 超时预警 ====================
app.get('/api/timeout-tickets', (req, res) => {
  db.getTimeoutTickets((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ==================== AI 周报摘要 ====================
app.get('/api/ai/weekly-summary', async (req, res) => {
  try {
    const stats = await new Promise((resolve, reject) => {
      db.getStatistics((err, s) => err ? reject(err) : resolve(s));
    });
    const hotTopics = await new Promise((resolve, reject) => {
      db.getHotTopics((err, d) => err ? reject(err) : resolve(d));
    });

    const top3 = (hotTopics || []).slice(0, 3).map(t => t.name).join('、');
    const systemPrompt = `你是市容巡查系统的 AI 数据分析师。请根据提供的统计数据，生成一段 150 字以内的周报摘要，语气正式但亲民。用一段话概括：总工单量、完成率、最突出问题类型、满意度、是否需要关注超时工单。不要用列表格式，直接一段话。`;
    const userPrompt = `本周数据：总工单${stats.total}条，已完成${stats.completed}条（完成率${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%），待派单${stats.pending}条，处置中${stats.processing}条，超时${stats.timeout}条。问题热点前三：${top3 || '暂无数据'}。平均满意度${stats.ratingStats ? (Object.entries(stats.ratingStats).reduce((sum, [s, c]) => sum + s * c, 0) / Math.max(1, Object.values(stats.ratingStats).reduce((a, b) => a + b, 0))).toFixed(1) : 0}分。`;

    const API_KEY = process.env.AI_API_KEY;
    const response = await axios.post(process.env.AI_API_URL, {
      model: process.env.AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 300
    }, {
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 15000
    });

    const summary = response.data.choices[0].message.content;
    res.json({ summary, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('AI周报生成失败:', err.message);
    // 兜底：返回统计数据的纯文本摘要
    res.json({
      summary: `本周共受理工单${stats?.total || 0}条，已完成${stats?.completed || 0}条，超时${stats?.timeout || 0}条需关注。`,
      generatedAt: new Date().toISOString(),
      fallback: true
    });
  }
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
  try {
    const { suggestDisposalAgent } = require('./agents');
    const result = await suggestDisposalAgent(ticket, db.getDb());
    // Agent 返回结构化 JSON，转为可读文本
    if (result.suggestions && Array.isArray(result.suggestions)) {
      const lines = result.suggestions.map(s => `${s.step}. ${s.detail}`);
      if (result.estimatedHours) lines.push(`\n预计处理时长：约 ${result.estimatedHours} 小时`);
      if (result.legalBasis) lines.push(`法律依据：${result.legalBasis}`);
      if (result.referenceCases && result.referenceCases.length > 0) lines.push(`参考历史工单：#${result.referenceCases.join('、#')}`);
      res.json({ suggestion: lines.join('\n'), ...result });
    } else {
      res.json({ suggestion: typeof result === 'string' ? result : '系统暂时无法生成建议，请人工处理。' });
    }
  } catch (err) {
    console.error('AI建议失败:', err.message);
    res.json({ suggestion: '系统暂时无法生成建议，请人工处理。' });
  }
});

app.post('/api/ai/generateFlow', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: '缺少描述' });
  try {
    const { generateFlowAgent } = require('./agents');
    const result = await generateFlowAgent(description);
    if (result.nodes && result.nodes.length > 0) {
      res.json(result);
    } else {
      // Agent 生成失败，返回兜底流程
      res.json({
        nodes: [
          { id: '1', type: 'input', position: { x: 100, y: 50 }, data: { label: '工单创建' } },
          { id: '2', type: 'default', position: { x: 100, y: 150 }, data: { label: 'AI分类派单' } },
          { id: '3', type: 'default', position: { x: 100, y: 250 }, data: { label: '现场处置' } },
          { id: '4', type: 'output', position: { x: 100, y: 350 }, data: { label: '办结归档' } },
        ],
        edges: [
          { source: '1', target: '2' },
          { source: '2', target: '3' },
          { source: '3', target: '4' },
        ],
      });
    }
  } catch (err) {
    console.error('AI生成流程失败:', err.message);
    res.json({
      nodes: [
        { id: '1', type: 'input', position: { x: 100, y: 50 }, data: { label: '工单创建' } },
        { id: '2', type: 'default', position: { x: 100, y: 150 }, data: { label: '派单' } },
        { id: '3', type: 'output', position: { x: 100, y: 250 }, data: { label: '办结归档' } },
      ],
      edges: [{ source: '1', target: '2' }, { source: '2', target: '3' }],
    });
  }
});

// ==================== AI 助手聊天 ====================
app.post('/api/ai/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '缺少对话消息' });
  }
  try {
    const systemPrompt = `你是「小容助手」，市容巡查一体化系统的 AI 客服。
你的职责：
1. 解答系统使用问题（如何提交工单、如何查看进度、如何评价等）
2. 介绍系统功能（四个角色工作台、AI分类派单、流程模板、领导看板等）
3. 提供政务流程相关建议

回答要求：
- 语气亲切、简洁，每次回答控制在 150 字以内
- 使用中文
- 如果是系统操作问题，给出具体操作步骤
- 如果问题超出系统范围，礼貌告知并引导用户联系管理员`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6)
    ];

    const API_KEY = process.env.AI_API_KEY;
    const response = await axios.post(process.env.AI_API_URL, {
      model: process.env.AI_MODEL,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 300
    }, {
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 15000
    });

    const reply = response.data?.choices?.[0]?.message?.content || '抱歉，我暂时无法回复，请稍后再试~';
    res.json({ reply });
  } catch (err) {
    console.error('AI聊天失败:', err.message, err.response?.data || '');
    res.json({ reply: '哎呀，网络好像不太稳定，等会儿再问我吧~' });
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
