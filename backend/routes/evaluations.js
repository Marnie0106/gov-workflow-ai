const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./workflow.db');

router.get('/pending', (req, res) => {
  const { citizenId } = req.query;
  if (!citizenId) return res.status(400).json({ error: '缺少 citizenId' });
  db.all(`
    SELECT t.* FROM tickets t
    LEFT JOIN evaluations e ON t.id = e.ticket_id AND e.citizen_id = ?
    WHERE t.citizen_id = ? AND t.status = '已完成' AND e.id IS NULL
  `, [citizenId, citizenId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { ticketId, citizenId, rating, comment } = req.body;
  if (!ticketId || !citizenId || !rating) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const createdAt = new Date().toISOString();
  db.run(`INSERT INTO evaluations (ticket_id, citizen_id, rating, comment, created_at)
          VALUES (?, ?, ?, ?, ?)`, [ticketId, citizenId, rating, comment || '', createdAt], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ success: true });
  });
});

module.exports = router;