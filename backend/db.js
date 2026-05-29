/**
 * backend/db.js
 * 数据库模块 - 所有 SQLite 操作集中在此
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库实例（单例）
let _db = null;

/**
 * 获取数据库连接
 * @returns {sqlite3.Database}
 */
function getDb() {
  if (!_db) {
    _db = new sqlite3.Database(path.join(__dirname, 'workflow.db'));
    _db.configure('busyTimeout', 5000);
    // 启用外键约束
    _db.run('PRAGMA foreign_keys = ON');
  }
  return _db;
}

/**
 * 初始化数据库（建表 + 迁移 + 默认数据）
 */
function initDatabase() {
  const db = getDb();

  db.serialize(() => {
    // ========== 1. roles 表（系统用户角色）==========
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      role_key   TEXT    UNIQUE NOT NULL,
      role_name  TEXT    NOT NULL,
      created_at TEXT
    )`);

    // 预置四个角色
    const roles = [
      ['citizen',       '市民'],
      ['dispatcher',    '工单处置人员'],
      ['process_admin', '业务流程管理员'],
      ['leader',        '领导'],
    ];
    roles.forEach(([key, name]) => {
      db.run(`INSERT OR IGNORE INTO roles (role_key, role_name, created_at) VALUES (?, ?, datetime('now'))`, [key, name]);
    });

    // ========== 2. users 表（系统登录用户，非市民）==========
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT    UNIQUE NOT NULL,
      employee_id  TEXT    UNIQUE,
      password     TEXT    NOT NULL DEFAULT '123456',
      role_key     TEXT    NOT NULL REFERENCES roles(role_key),
      display_name TEXT,
      department   TEXT,
      created_at   TEXT
    )`);

    // 迁移旧 users 表：添加缺失列
    const userAlterStatements = [
      `ALTER TABLE users ADD COLUMN employee_id TEXT`,
      `ALTER TABLE users ADD COLUMN department  TEXT`,
    ];
    userAlterStatements.forEach(sql => {
      db.run(sql, err => {
        if (err && !err.message.includes('duplicate column')) {
          // ignore
        }
      });
    });

    // 预置演示用户（username = 工号 = employee_id，演示简化）
    // 格式：[username, employee_id, role_key, display_name, department]
    const users = [
      ['dispatcher1', 'D001', 'dispatcher',    '王强', '城管执法队一分队'],
      ['dispatcher2', 'D002', 'dispatcher',    '赵芳', '城管执法队二分队'],
      ['admin1',      'A001', 'process_admin', '李明', '业务流程管理科'],
      ['leader1',     'L001', 'leader',        '张华', '市容管理局'],
    ];
    users.forEach(([username, empId, role, displayName, dept]) => {
      db.run(`INSERT OR IGNORE INTO users (username, employee_id, role_key, display_name, department, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))`, [username, empId, role, displayName, dept]);
      // 为已存在的用户补充 employee_id
      db.run(`UPDATE users SET employee_id=?, department=? WHERE username=? AND employee_id IS NULL`,
        [empId, dept, username]);
    });

    // ========== 3. tickets 表（工单）==========
    db.run(`CREATE TABLE IF NOT EXISTS tickets (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      title            TEXT,
      content          TEXT,
      location         TEXT,
      reporter         TEXT,
      status           TEXT    DEFAULT 'created',
      currentNode      TEXT    DEFAULT '工单创建',
      department       TEXT,
      createdAt        TEXT,
      dispatchedAt     TEXT,
      acceptedAt       TEXT,
      resolvedAt       TEXT,
      isTimeout        INTEGER DEFAULT 0,
      isDuplicate      INTEGER DEFAULT 0,
      isVague          INTEGER DEFAULT 0,
      citizen_id       TEXT,
      source           TEXT    DEFAULT 'citizen',
      dispatch_status  TEXT    DEFAULT '待派单',
      assignee         TEXT,
      flow_template_id INTEGER,
      flow_progress    TEXT,
      occurred_at      TEXT,
      completed_at     TEXT,
      photo_urls       TEXT
    )`);

    // 迁移旧表：添加缺失列（已存在则忽略）
    const alterStatements = [
      `ALTER TABLE tickets ADD COLUMN citizen_id       TEXT`,
      `ALTER TABLE tickets ADD COLUMN source          TEXT    DEFAULT 'citizen'`,
      `ALTER TABLE tickets ADD COLUMN dispatch_status TEXT    DEFAULT '待派单'`,
      `ALTER TABLE tickets ADD COLUMN assignee        TEXT`,
      `ALTER TABLE tickets ADD COLUMN flow_template_id INTEGER`,
      `ALTER TABLE tickets ADD COLUMN flow_progress   TEXT`,
      `ALTER TABLE tickets ADD COLUMN occurred_at     TEXT`,
      `ALTER TABLE tickets ADD COLUMN completed_at    TEXT`,
      `ALTER TABLE tickets ADD COLUMN photo_urls      TEXT`,
    ];
    alterStatements.forEach(sql => {
      db.run(sql, err => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('[db] 迁移失败:', err.message);
        }
      });
    });

    // ========== 4. templates 表（JSON格式流程，保留兼容）==========
    db.run(`CREATE TABLE IF NOT EXISTS templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT,
      flowJson   TEXT,
      createdAt  TEXT
    )`);

    // ========== 5. flow_templates 表（结构化流程步骤）==========
    db.run(`CREATE TABLE IF NOT EXISTS flow_templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      steps       TEXT    NOT NULL,
      is_default  INTEGER DEFAULT 0,
      created_by  TEXT,
      created_at  TEXT
    )`);

    // 插入默认7步流程模板（id=1 保留）
    const defaultSteps = JSON.stringify(['接收工单', '现场核实', '制定方案', '分派任务', '执行处置', '复核验收', '办结归档']);
    db.run(`INSERT OR IGNORE INTO flow_templates (id, name, steps, is_default, created_by, created_at)
            VALUES (1, '标准7步流程', ?, 1, 'system', datetime('now'))`, [defaultSteps]);

    // ========== 6. messages 表（留言）==========
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id     INTEGER NOT NULL,
      sender_role  TEXT    NOT NULL,
      sender_name  TEXT    NOT NULL,
      content      TEXT    NOT NULL,
      is_read      INTEGER DEFAULT 0,
      is_internal  INTEGER DEFAULT 0,
      created_at   TEXT,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`);
    // 迁移：添加 is_internal 字段
    db.run(`ALTER TABLE messages ADD COLUMN is_internal INTEGER DEFAULT 0`, err => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('[db] messages迁移失败:', err.message);
      }
    });

    // ========== 7. evaluations 表（评价）==========
    db.run(`CREATE TABLE IF NOT EXISTS evaluations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id    INTEGER NOT NULL,
      citizen_id   TEXT    NOT NULL,
      rating       INTEGER NOT NULL,
      comment      TEXT,
      created_at   TEXT,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`);

    // ========== 8. citizens 表（市民账号）==========
    db.run(`CREATE TABLE IF NOT EXISTS citizens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      phone      TEXT    UNIQUE NOT NULL,
      nickname   TEXT,
      real_name  TEXT,
      id_number  TEXT,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT
    )`);
    // 迁移旧表：添加实名认证列
    ['real_name','id_number','is_verified'].forEach(col => {
      db.run(`ALTER TABLE citizens ADD COLUMN ${col} TEXT`, err => {
        if (err && !err.message.includes('duplicate column')) {}
      });
    });

    // 插入演示账号（手机号 12345678900，昵称"演示市民"）
    db.run(`INSERT OR IGNORE INTO citizens (id, phone, nickname, created_at)
            VALUES (1, '12345678900', '演示市民', datetime('now'))`);

    // ========== 9. sessions 表（登录会话）==========
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT    PRIMARY KEY,
      user_type  TEXT    NOT NULL,
      user_id    TEXT    NOT NULL,
      role_key   TEXT    NOT NULL,
      display_name TEXT,
      created_at TEXT,
      expires_at TEXT
    )`);

    // 插入测试数据（仅在数据库为空时）
    db.get('SELECT COUNT(*) as cnt FROM tickets', (err, row) => {
      if (!err && row && row.cnt === 0) {
        seedTestData(db);
      }
    });
  });

  console.log('[db] 数据库初始化完成');
}

/**
 * 插入测试数据（仅首次启动时调用）
 */
function seedTestData(db) {
  const now = new Date();
  const tickets = [
    {
      title: '道路垃圾堆积未清运', content: '中山路58号门口有一堆积了2天的垃圾未被清运，影响市容环境', location: '中山路58号门口',
      reporter: '演示市民', citizen_id: '1', status: 'created', dispatch_status: '待派单',
      department: '城管', isTimeout: 0, isDuplicate: 0, isVague: 0,
      createdAt: new Date(now - 2 * 3600000).toISOString(), occurred_at: new Date(now - 4 * 3600000).toISOString()
    },
    {
      title: '路灯损坏彻夜不亮', content: '解放路与和平路交叉口的路灯已损坏3天，夜间出行存在安全隐患', location: '解放路与和平路交叉口',
      reporter: '演示市民', citizen_id: '1', status: 'completed', dispatch_status: '已完结',
      department: '城管', isTimeout: 0, isDuplicate: 0, isVague: 0,
      assignee: '处置员赵芳', acceptedAt: new Date(now - 48 * 3600000).toISOString(),
      dispatchedAt: new Date(now - 50 * 3600000).toISOString(),
      resolvedAt: new Date(now - 24 * 3600000).toISOString(), completed_at: new Date(now - 24 * 3600000).toISOString(),
      createdAt: new Date(now - 52 * 3600000).toISOString(), occurred_at: new Date(now - 54 * 3600000).toISOString()
    },
    {
      title: '乱停车占据人行道', content: '人民广场北侧长期有私家车占用盲道和人行道停放，行人被迫走机动车道', location: '人民广场北侧',
      reporter: '演示市民', citizen_id: '1', status: 'completed', dispatch_status: '已完结',
      department: '街道办', isTimeout: 0, isDuplicate: 0, isVague: 0,
      assignee: '处置员王强', acceptedAt: new Date(now - 72 * 3600000).toISOString(),
      dispatchedAt: new Date(now - 74 * 3600000).toISOString(),
      resolvedAt: new Date(now - 60 * 3600000).toISOString(), completed_at: new Date(now - 60 * 3600000).toISOString(),
      createdAt: new Date(now - 76 * 3600000).toISOString(), occurred_at: new Date(now - 80 * 3600000).toISOString()
    },
    {
      title: '井盖缺失存在坠落风险', content: '建设路120号人行道上有一个窨井盖缺失，已用临时围挡围起但仍有人靠近', location: '建设路120号',
      reporter: '演示市民', citizen_id: '1', status: 'dispatched', dispatch_status: '已接受',
      department: '城管', isTimeout: 0, isDuplicate: 0, isVague: 0,
      assignee: '处置员王强', acceptedAt: new Date(now - 1 * 3600000).toISOString(),
      dispatchedAt: new Date(now - 2 * 3600000).toISOString(),
      createdAt: new Date(now - 3 * 3600000).toISOString(), occurred_at: new Date(now - 5 * 3600000).toISOString()
    },
    {
      title: '餐饮店油烟直排扰民', content: '幸福小区楼下新开餐馆油烟未经处理直接排放，居民窗户无法打开', location: '幸福小区3号楼下',
      reporter: '演示市民', citizen_id: '1', status: 'created', dispatch_status: '待派单',
      department: '市监', isTimeout: 0, isDuplicate: 0, isVague: 0,
      createdAt: new Date(now - 0.5 * 3600000).toISOString(), occurred_at: new Date(now - 2 * 3600000).toISOString()
    },
  ];

  // 使用简化的 INSERT，避免参数数量不匹配
  const simpleInsert = (t, cb) => {
    db.run(`INSERT INTO tickets (title, content, location, reporter, citizen_id, source, status, dispatch_status,
            department, isTimeout, isDuplicate, isVague, createdAt, occurred_at)
            VALUES (?,?,?,?,?,?, 'created', '待派单',?,?,?,?,?,?)`,
      [t.title, t.content, t.location, t.reporter, t.citizen_id, 'citizen',
       t.department, t.isTimeout, t.isDuplicate, t.isVague, t.createdAt, t.occurred_at],
      function(err) {
        if (err) return cb(err);
        const tid = this.lastID;
        // 更新派单相关字段
        if (t.assignee || t.dispatchedAt) {
          const sets = [];
          const vals = [];
          if (t.status === 'dispatched' || t.status === 'completed') { sets.push("status = ?"); vals.push(t.status === 'completed' ? 'completed' : 'dispatched'); }
          if (t.assignee) { sets.push("assignee = ?"); vals.push(t.assignee); }
          if (t.acceptedAt) { sets.push("acceptedAt = ?"); vals.push(t.acceptedAt); }
          if (t.dispatchedAt) { sets.push("dispatchedAt = ?"); vals.push(t.dispatchedAt); }
          if (t.resolvedAt) { sets.push("resolvedAt = ?"); vals.push(t.resolvedAt); }
          if (t.completed_at) { sets.push("completed_at = ?"); vals.push(t.completed_at); }
          if (t.dispatch_status && t.dispatch_status !== '待派单') { sets.push("dispatch_status = ?"); vals.push(t.dispatch_status); }
          if (sets.length > 0) {
            sets.push("currentNode = ?");
            vals.push(t.completed_at ? '办结归档' : '现场核实');
            vals.push(tid);
            db.run(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`, vals, (e2) => {
              if (e2) console.error('种子数据更新失败:', e2);
              cb(null, tid);
            });
          } else {
            cb(null, tid);
          }
        } else {
          cb(null, tid);
        }
      }
    );
  };

  // 插入工单和测试数据
  let inserted = 0;
  const total = tickets.length;
  tickets.forEach((t) => {
    simpleInsert(t, (err, ticketId) => {
      if (err) console.error('种子数据插入失败:', err);
      inserted++;
      if (inserted === total) {
        // 插入留言
        const msgs = [
          { ticket_id: 1, sender_role: 'dispatcher', sender_name: '处置员王强', content: '您好，您上报的垃圾清运问题已受理，预计今日下午 14:00 前处置完毕，请关注进度更新。' },
          { ticket_id: 2, sender_role: 'dispatcher', sender_name: '处置员赵芳', content: '路灯已完成维修，请确认夜间是否正常亮起，如仍有问题可再次上报。', is_read: 1 },
          { ticket_id: 3, sender_role: 'dispatcher', sender_name: '处置员王强', content: '已协调交警部门联合执法，违停车辆已清理，后续将加强巡查频次。' },
          { ticket_id: 4, sender_role: 'dispatcher', sender_name: '处置员王强', content: '已到达现场，正在设置安全围挡并联系市政部门更换井盖，预计2小时内完成。' },
        ];
        msgs.forEach(m => {
          db.run(`INSERT INTO messages (ticket_id, sender_role, sender_name, content, is_read, created_at)
                  VALUES (?,?,?,?,?,datetime('now'))`,
            [m.ticket_id, m.sender_role, m.sender_name, m.content, m.is_read || 0]);
        });

        // 插入评价
        const evals = [
          { ticket_id: 2, citizen_id: '1', rating: 5, comment: '处理非常及时，路灯已恢复正常，感谢！' },
          { ticket_id: 3, citizen_id: '1', rating: 4, comment: '问题已解决，但希望能长期保持巡查。' },
        ];
        evals.forEach(e => {
          db.run(`INSERT INTO evaluations (ticket_id, citizen_id, rating, comment, created_at)
                  VALUES (?,?,?,?,datetime('now'))`,
            [e.ticket_id, e.citizen_id, e.rating, e.comment]);
        });

        console.log('[db] 种子数据插入完成');
      }
    });
  });
}

// ========== 会话管理 ==========

/**
 * 创建会话
 */
function createSession(userType, userId, roleKey, displayName) {
  const db = getDb();
  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 3600000).toISOString();

  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO sessions (id, user_type, user_id, role_key, display_name, created_at, expires_at)
            VALUES (?,?,?,?,?,?,?)`,
      [sessionId, userType, String(userId), roleKey, displayName, createdAt, expiresAt],
      function(err) {
        if (err) return reject(err);
        resolve({ sessionId, userType, userId, roleKey, displayName, expiresAt });
      }
    );
  });
}

/**
 * 验证会话
 */
function validateSession(sessionId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')`, [sessionId], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

/**
 * 删除会话（登出）
 */
function deleteSession(sessionId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM sessions WHERE id = ?`, [sessionId], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// ========== 用户/角色查询 ==========

/**
 * 获取所有处置人员
 */
function getDispatchers(callback) {
  const db = getDb();
  db.all(`SELECT username, display_name, role_key FROM users WHERE role_key = 'dispatcher'`, callback);
}

// ========== 快捷查询方法 ==========

/**
 * 查询工单列表（支持多条件过滤）
 */
function queryTickets(filters = {}, callback) {
  const db = getDb();
  const { citizenId, assignee, status, dispatch_status, keyword, startDate, endDate } = filters;
  let sql = `SELECT * FROM tickets WHERE 1=1`;
  const params = [];

  if (citizenId)      { sql += ` AND citizen_id = ?`;       params.push(citizenId); }
  if (assignee)       { sql += ` AND assignee = ?`;         params.push(assignee); }
  if (status)         { sql += ` AND status = ?`;             params.push(status); }
  if (dispatch_status){ sql += ` AND dispatch_status = ?`;   params.push(dispatch_status); }
  if (keyword)        { sql += ` AND (title LIKE ? OR content LIKE ? OR location LIKE ?)`;
                        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  if (startDate)      { sql += ` AND (createdAt >= ? OR occurred_at >= ?)`;
                        params.push(startDate, startDate); }
  if (endDate)        { sql += ` AND (createdAt <= ? OR occurred_at <= ?)`;
                        params.push(endDate, endDate); }

  sql += ` ORDER BY id DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return callback(err);
    const formatted = rows.map(row => ({
      ...row,
      flow_progress: row.flow_progress ? JSON.parse(row.flow_progress) : null
    }));
    callback(null, formatted);
  });
}

/**
 * 创建工单
 */
function createTicket(data, callback) {
  const db = getDb();
  const { title, content, location, reporter, citizen_id, source, occurred_at } = data;
  const createdAt = new Date().toISOString();
  const finalOccurredAt = occurred_at || createdAt;

  db.run(`INSERT INTO tickets
    (title, content, location, reporter, citizen_id, source, status, currentNode, createdAt, occurred_at, dispatch_status, photo_urls)
    VALUES (?,?,?,?,?,?, 'created', '工单创建', ?, ?, '待派单', ?)`,
    [title, content, location, reporter, citizen_id, source, createdAt, finalOccurredAt, photo_urls || null],
    function(err) {
      if (err) return callback(err);
      callback(null, this.lastID);
    }
  );
}

/**
 * 更新工单字段
 */
function updateTicket(id, updates, callback) {
  const db = getDb();
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  db.run(`UPDATE tickets SET ${setClause} WHERE id = ?`, [...values, id], callback);
}

/**
 * 查询单条工单
 */
function getTicket(id, callback) {
  const db = getDb();
  db.get(`SELECT * FROM tickets WHERE id = ?`, [id], (err, row) => {
    if (!err && row && row.flow_progress) {
      row.flow_progress = JSON.parse(row.flow_progress);
    }
    callback(err, row);
  });
}

/**
 * 删除工单
 */
function deleteTicket(id, callback) {
  const db = getDb();
  db.run(`DELETE FROM tickets WHERE id = ?`, [id], callback);
}

/**
 * 检查重复上报（1小时内同一市民相同地点相似内容）
 */
function checkDuplicate(citizenId, location, content, callback) {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  db.get(`
    SELECT id, title, location, status, createdAt FROM tickets
    WHERE citizen_id = ? AND location = ? AND createdAt > ?
    AND status != 'completed'
    LIMIT 1`,
    [citizenId, location, oneHourAgo],
    (err, row) => {
      if (err) return callback(err);
      if (!row) return callback(null, false, null);
      // 简单关键词相似度检测
      const contentLower = (content || '').toLowerCase();
      const titleLower = (row.title || '').toLowerCase();
      const words = contentLower.split(/[\s，,。、]+/).filter(w => w.length >= 2);
      const similar = words.some(w => titleLower.includes(w));
      callback(null, similar, similar ? row.id : null);
    }
  );
}

/**
 * 绑定流程模板到工单
 */
function bindFlowToTicket(ticketId, flowTemplateId, steps, callback) {
  const db = getDb();
  const initProgress = {};
  steps.forEach((_, idx) => { initProgress[`step${idx}`] = false; });
  const updates = { flow_progress: JSON.stringify(initProgress) };
  if (flowTemplateId) updates.flow_template_id = flowTemplateId;
  // 如果绑定流程，状态变为已完成
  updates.status = 'completed';
  updates.completed_at = new Date().toISOString();

  const fields = Object.keys(updates);
  const values = Object.values(updates);
  db.run(`UPDATE tickets SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`,
    [...values, ticketId], callback);
}

/**
 * 更新流程步骤完成状态
 */
function updateFlowProgress(ticketId, stepIndex, completed, callback) {
  const db = getDb();
  db.get(`SELECT flow_progress FROM tickets WHERE id = ?`, [ticketId], (err, row) => {
    if (err) return callback(err);
    const progress = row.flow_progress ? JSON.parse(row.flow_progress) : {};
    progress[`step${stepIndex}`] = completed;
    db.run(`UPDATE tickets SET flow_progress = ? WHERE id = ?`,
      [JSON.stringify(progress), ticketId], callback);
  });
}

/**
 * 查询留言列表
 */
function queryMessages(filters = {}, callback) {
  const db = getDb();
  const { ticketId, senderRole, isRead, limit = 200, is_internal } = filters;
  let sql = `SELECT * FROM messages WHERE 1=1`;
  const params = [];
  if (ticketId)  { sql += ` AND ticket_id = ?`;  params.push(ticketId); }
  if (senderRole) { sql += ` AND sender_role = ?`; params.push(senderRole); }
  if (isRead !== undefined) { sql += ` AND is_read = ?`; params.push(isRead); }
  if (is_internal !== undefined) { sql += ` AND is_internal = ?`; params.push(is_internal); }
  sql += ` ORDER BY created_at ASC LIMIT ?`;
  params.push(limit);
  db.all(sql, params, callback);
}

/**
 * 添加留言（支持内部消息 is_internal）
 */
function addMessage(data, callback) {
  const db = getDb();
  const { ticket_id, sender_role, sender_name, content, is_internal = 0 } = data;
  const created_at = new Date().toISOString();
  db.run(
    `INSERT INTO messages (ticket_id, sender_role, sender_name, content, is_internal, created_at) VALUES (?,?,?,?,?,?)`,
    [ticket_id, sender_role, sender_name, content, is_internal ? 1 : 0, created_at],
    function(err) { callback(err, this.lastID); }
  );
}

/**
 * 标记留言已读
 */
function markMessageRead(messageId, callback) {
  const db = getDb();
  db.run(`UPDATE messages SET is_read = 1 WHERE id = ?`, [messageId], callback);
}

/**
 * 标记某工单的所有留言为已读
 */
function markTicketMessagesRead(ticketId, callback) {
  const db = getDb();
  db.run(`UPDATE messages SET is_read = 1 WHERE ticket_id = ?`, [ticketId], callback);
}

/**
 * 查询未读留言数量（按角色+用户ID过滤，内部消息不显示给市民）
 */
function countUnreadMessages(role, userId, callback) {
  // 兼容旧版（只传role和callback两个参数）
  if (typeof userId === 'function') {
    callback = userId;
    userId = null;
  }
  const db = getDb();
  let sql = `SELECT COUNT(*) as cnt FROM messages WHERE is_read = 0`;
  const params = [];
  if (role === 'citizen') {
    // 市民只看公开留言（非内部），且只看发给自己工单的
    sql += ` AND is_internal = 0 AND sender_role IN ('dispatcher','admin','process_admin')`;
    if (userId) {
      sql += ` AND ticket_id IN (SELECT id FROM tickets WHERE citizen_id = ?)`;
      params.push(String(userId));
    }
  } else if (role === 'dispatcher') {
    // 处置员看：市民发来的公开消息 + 管理员发给处置员的内部消息
    sql += ` AND (sender_role = 'citizen' OR (is_internal = 1 AND sender_role = 'process_admin'))`;
    if (userId) {
      sql += ` AND ticket_id IN (SELECT id FROM tickets WHERE assignee IN (SELECT display_name FROM users WHERE id = ?))`;
      params.push(String(userId));
    }
  } else if (role === 'admin' || role === 'process_admin') {
    // 管理员看内部消息（处置员发的）
    sql += ` AND is_internal = 1 AND sender_role = 'dispatcher'`;
  }
  db.get(sql, params, (err, row) => {
    callback(err, row ? row.cnt : 0);
  });
}

/**
 * 添加评价
 */
function addEvaluation(data, callback) {
  const db = getDb();
  const { ticket_id, citizen_id, rating, comment } = data;
  const created_at = new Date().toISOString();
  db.run(
    `INSERT INTO evaluations (ticket_id, citizen_id, rating, comment, created_at) VALUES (?,?,?,?,?)`,
    [ticket_id, citizen_id, rating, comment, created_at],
    function(err) { callback(err, this.lastID); }
  );
}

/**
 * 查询某工单是否已评价
 */
function getEvaluation(ticketId, callback) {
  const db = getDb();
  db.get(`SELECT * FROM evaluations WHERE ticket_id = ?`, [ticketId], callback);
}

/**
 * 查询市民的所有评价
 */
function queryEvaluationsByCitizen(citizenId, callback) {
  const db = getDb();
  db.all(`SELECT e.*, t.title, t.location
          FROM evaluations e
          JOIN tickets t ON e.ticket_id = t.id
          WHERE e.citizen_id = ?
          ORDER BY e.created_at DESC`, [citizenId], callback);
}

/**
 * 查询所有评价（用于统计）
 */
function queryAllEvaluations(callback) {
  const db = getDb();
  db.all(`SELECT e.*, t.title
          FROM evaluations e
          JOIN tickets t ON e.ticket_id = t.id
          ORDER BY e.created_at DESC`, callback);
}

/**
 * 查询待评价工单（市民视角）
 */
function queryPendingEvaluations(citizenId, callback) {
  const db = getDb();
  db.all(`
    SELECT t.* FROM tickets t
    LEFT JOIN evaluations e ON t.id = e.ticket_id AND e.citizen_id = ?
    WHERE t.citizen_id = ? AND t.status = 'completed' AND e.id IS NULL
    ORDER BY t.id DESC
  `, [citizenId, citizenId], callback);
}

/**
 * 市民登录
 */
function citizenLogin(phone, code, callback) {
  const db = getDb();
  // 验证短信验证码（从 smsCache 读取，不再硬编码）
  // 注意：smsCache 在 server.js 中，这里用回调方式兼容
  callback(null, null); // 实际验证由 server.js 的 /api/citizen/login 处理
}

/**
 * 市民注册/实名认证
 */
function citizenRegister(phone, realName, idNumber, callback) {
  const db = getDb();
  // 简单校验
  if (!realName || realName.length < 2) return callback(new Error('请填写真实姓名'));
  if (!idNumber || !/^\d{15,18}$/.test(idNumber)) return callback(new Error('身份证号格式不正确'));
  
  db.get(`SELECT * FROM citizens WHERE phone = ?`, [phone], (err, row) => {
    if (err) return callback(err);
    if (!row) {
      // 新用户
      db.run(`INSERT INTO citizens (phone, nickname, real_name, id_number, is_verified, created_at)
              VALUES (?, ?, ?, ?, 1, datetime('now'))`,
        [phone, realName, realName, idNumber],
        function(insErr) {
          if (insErr) return callback(insErr);
          db.get(`SELECT * FROM citizens WHERE id = ?`, [this.lastID], callback);
        });
    } else if (!row.is_verified) {
      // 已存在但未认证 — 补全实名信息
      db.run(`UPDATE citizens SET real_name=?, id_number=?, is_verified=1, nickname=? WHERE id=?`,
        [realName, idNumber, realName, row.id],
        function(updErr) {
          if (updErr) return callback(updErr);
          db.get(`SELECT * FROM citizens WHERE id = ?`, [row.id], callback);
        });
    } else {
      callback(null, row); // 已认证，直接返回
    }
  });
}

/**
 * 查询所有系统用户（政务人员）
 */
function queryUsers(callback) {
  const db = getDb();
  db.all(`SELECT u.id, u.username, u.employee_id, u.role_key, u.display_name, u.department, r.role_name
          FROM users u JOIN roles r ON u.role_key = r.role_key ORDER BY u.id`, callback);
}

/**
 * 手动添加政务人员
 */
function createUser(data, callback) {
  const db = getDb();
  const { username, employee_id, role_key, display_name, department } = data;
  if (!username || !employee_id || !role_key) return callback(new Error('缺少必填字段'));
  db.run(`INSERT INTO users (username, employee_id, role_key, display_name, department, created_at)
          VALUES (?,?,?,?,?,datetime('now'))`,
    [username, employee_id, role_key, display_name || '', department || ''],
    function(err) { callback(err, this.lastID); });
}

/**
 * 批量导入政务人员
 */
function importUsers(users, callback) {
  const db = getDb();
  let imported = 0;
  let errors = [];
  let remaining = users.length;
  if (remaining === 0) return callback(null, { imported: 0, errors: [] });
  
  users.forEach(u => {
    db.run(`INSERT OR IGNORE INTO users (username, employee_id, role_key, display_name, department, created_at)
            VALUES (?,?,?,?,?,datetime('now'))`,
      [u.username || u.employee_id, u.employee_id, u.role_key || 'dispatcher', u.display_name || '', u.department || ''],
      function(err) {
        if (err) { errors.push({ user: u.employee_id, error: err.message }); }
        else if (this.changes > 0) { imported++; }
        remaining--;
        if (remaining === 0) callback(null, { imported, errors });
      });
  });
}

/**
 * 删除政务人员
 */
function deleteUser(id, callback) {
  const db = getDb();
  db.run(`DELETE FROM users WHERE id = ?`, [id], callback);
}

/**
 * 查询流程模板列表
 */
function queryFlowTemplates(callback) {
  const db = getDb();
  db.all(`SELECT * FROM flow_templates ORDER BY is_default DESC, id ASC`, callback);
}

/**
 * 获取流程模板详情
 */
function getFlowTemplate(id, callback) {
  const db = getDb();
  db.get(`SELECT * FROM flow_templates WHERE id = ?`, [id], (err, row) => {
    if (!err && row) row.steps = JSON.parse(row.steps);
    callback(err, row);
  });
}

/**
 * 保存流程模板
 */
function saveFlowTemplate(data, callback) {
  const db = getDb();
  const { name, steps, is_default = 0, created_by = 'admin' } = data;
  const stepsJson = JSON.stringify(steps);
  const created_at = new Date().toISOString();
  if (data.id) {
    db.run(`UPDATE flow_templates SET name = ?, steps = ?, is_default = ? WHERE id = ?`,
      [name, stepsJson, is_default, data.id],
      function(err) { callback(err, data.id); }
    );
  } else {
    db.run(`INSERT INTO flow_templates (name, steps, is_default, created_by, created_at) VALUES (?,?,?,?,?)`,
      [name, stepsJson, is_default, created_by, created_at],
      function(err) { callback(err, this.lastID); }
    );
  }
}

/**
 * 删除流程模板
 */
function deleteFlowTemplate(id, callback) {
  const db = getDb();
  db.run(`DELETE FROM flow_templates WHERE id = ? AND is_default = 0`, [id], callback);
}

/**
 * 统计接口：领导看板数据
 */
function getStatistics(callback) {
  const db = getDb();
  const stats = {};
  const done = (key, value) => {
    stats[key] = value;
    if (Object.keys(stats).length === 7) callback(null, stats);
  };

  // 1. 总工单数
  db.get(`SELECT COUNT(*) as cnt FROM tickets`, (err, row) => done('total', row?.cnt || 0));
  // 2. 已完成数
  db.get(`SELECT COUNT(*) as cnt FROM tickets WHERE status = 'completed'`, (err, row) => done('completed', row?.cnt || 0));
  // 3. 待派单数
  db.get(`SELECT COUNT(*) as cnt FROM tickets WHERE dispatch_status = '待派单'`, (err, row) => done('pending', row?.cnt || 0));
  // 4. 处理中数
  db.get(`SELECT COUNT(*) as cnt FROM tickets WHERE status = 'dispatched'`, (err, row) => done('processing', row?.cnt || 0));
  // 5. 超时数
  db.get(`SELECT COUNT(*) as cnt FROM tickets WHERE isTimeout = 1`, (err, row) => done('timeout', row?.cnt || 0));
  // 6. 评价统计
  db.all(`SELECT rating, COUNT(*) as cnt FROM evaluations GROUP BY rating`, (err, rows) => {
    const ratingStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (rows || []).forEach(r => { ratingStats[r.rating] = r.cnt; });
    done('ratingStats', ratingStats);
  });
  // 7. 工单分类统计（按关键词）
  db.all(`SELECT content FROM tickets`, (err, rows) => {
    const keywords = { '井盖': 0, '垃圾': 0, '路灯': 0, '占道': 0, '油烟': 0, '噪音': 0, '其他': 0 };
    (rows || []).forEach(r => {
      const c = (r.content || '').toLowerCase();
      if (c.includes('井盖')) keywords['井盖']++;
      else if (c.includes('垃圾')) keywords['垃圾']++;
      else if (c.includes('路灯')) keywords['路灯']++;
      else if (c.includes('占道')) keywords['占道']++;
      else if (c.includes('油烟')) keywords['油烟']++;
      else if (c.includes('噪音')) keywords['噪音']++;
      else keywords['其他']++;
    });
    done('categoryStats', keywords);
  });
  // 8. 按星期的平均处理时长（小时）
  const weekHours = { '周一': 0, '周二': 0, '周三': 0, '周四': 0, '周五': 0, '周六': 0, '周日': 0 };
  const weekCounts = { '周一': 0, '周二': 0, '周三': 0, '周四': 0, '周五': 0, '周六': 0, '周日': 0 };
  const dayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  db.all(`SELECT createdAt, resolvedAt FROM tickets WHERE status = 'completed' AND resolvedAt IS NOT NULL`,
    (err, rows) => {
      (rows || []).forEach(r => {
        try {
          const created = new Date(r.createdAt);
          const resolved = new Date(r.resolvedAt);
          const hours = (resolved - created) / 3600000;
          const day = dayMap[created.getDay()];
          weekHours[day] += hours;
          weekCounts[day]++;
        } catch (_) {}
      });
      const avgWeekHours = {};
      dayMap.forEach(d => {
        avgWeekHours[d] = weekCounts[d] > 0 ? +(weekHours[d] / weekCounts[d]).toFixed(1) : 0;
      });
      done('weekHours', avgWeekHours);
    }
  );
}

/**
 * 关闭数据库连接
 */
function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = {
  getDb,
  initDatabase,
  closeDb,
  // 会话
  createSession,
  validateSession,
  deleteSession,
  // 用户/角色
  getDispatchers,
  // 工单
  queryTickets,
  createTicket,
  updateTicket,
  getTicket,
  deleteTicket,
  checkDuplicate,
  bindFlowToTicket,
  updateFlowProgress,
  // 留言
  queryMessages,
  addMessage,
  markMessageRead,
  markTicketMessagesRead,
  countUnreadMessages,
  // 评价
  addEvaluation,
  getEvaluation,
  queryEvaluationsByCitizen,
  queryAllEvaluations,
  queryPendingEvaluations,
  // 市民
  citizenLogin,
  citizenRegister,
  // 流程模板
  queryFlowTemplates,
  getFlowTemplate,
  saveFlowTemplate,
  deleteFlowTemplate,
  // 统计
  getStatistics,
  // 人员管理
  queryUsers,
  createUser,
  importUsers,
  deleteUser,
};
