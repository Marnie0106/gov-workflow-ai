const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./workflow.db');

router.get('/', (req, res) => {
  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: '缺少 ticketId' });
  db.all(`SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC`, [ticketId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { ticketId, senderRole, senderName, content } = req.body;
  if (!ticketId || !senderRole || !senderName || !content) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const createdAt = new Date().toISOString();
  db.run(`INSERT INTO messages (ticket_id, sender_role, sender_name, content, is_read, created_at)
          VALUES (?, ?, ?, ?, 0, ?)`, [ticketId, senderRole, senderName, content, createdAt], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID });
  });
});

router.patch('/:id/read', (req, res) => {
  db.run(`UPDATE messages SET is_read = 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.get('/unread-count', (req, res) => {
  const { role, userId } = req.query;
  let sql = `SELECT COUNT(*) as count FROM messages WHERE is_read = 0`;
  const params = [];
  if (role === 'dispatcher' && userId) {
    sql += ` AND ticket_id IN (SELECT id FROM tickets WHERE assignee = ?)`;
    params.push(userId);
  } else if (role === 'admin') {
    // 管理员看到所有未读
  } else {
    return res.json({ count: 0 });
  }
  db.get(sql, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ count: row ? row.count : 0 });
  });
});

module.exports = router;