const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./workflow.db');

router.get('/satisfaction', (req, res) => {
  db.all(`SELECT rating, COUNT(*) as count FROM evaluations GROUP BY rating`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    const percentages = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rows.forEach(r => { percentages[r.rating] = (r.count / total) * 100; });
    db.all(`
      SELECT e.rating, e.comment, e.created_at, t.id as ticketId, t.citizen_id
      FROM evaluations e
      JOIN tickets t ON e.ticket_id = t.id
      ORDER BY e.created_at DESC LIMIT 20
    `, (err2, comments) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ percentages, comments });
    });
  });
});

router.get('/process-time-trend', (req, res) => {
  db.all(`
    SELECT strftime('%w', dispatchedAt) as weekday,
           AVG((julianday(resolvedAt) - julianday(dispatchedAt)) * 24) as avgHours
    FROM tickets
    WHERE dispatchedAt IS NOT NULL AND resolvedAt IS NOT NULL AND status = '已完成'
    GROUP BY weekday
    ORDER BY weekday
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const labels = [];
    const data = [];
    for (let i = 0; i < 7; i++) {
      const row = rows.find(r => parseInt(r.weekday) === i);
      labels.push(weekdays[i]);
      data.push(row ? Math.round(row.avgHours * 10) / 10 : 0);
    }
    res.json({ labels, data });
  });
});

router.get('/category-hotspot', (req, res) => {
  const categories = {
    '井盖缺失': ['井盖', '窨井', '井盖缺失'],
    '垃圾堆积': ['垃圾', '堆积', '脏乱'],
    '路灯故障': ['路灯', '照明', '不亮'],
    '占道经营': ['占道', '摆摊', '经营']
  };
  const counts = { '井盖缺失': 0, '垃圾堆积': 0, '路灯故障': 0, '占道经营': 0 };
  db.all(`SELECT content FROM tickets`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows.forEach(row => {
      const text = (row.content || '').toLowerCase();
      for (const [cat, keywords] of Object.entries(categories)) {
        if (keywords.some(kw => text.includes(kw))) {
          counts[cat]++;
          break;
        }
      }
    });
    const categoriesList = Object.keys(counts);
    const countsList = Object.values(counts);
    db.all(`SELECT location, COUNT(*) as cnt FROM tickets GROUP BY location ORDER BY cnt DESC LIMIT 5`, (err2, locations) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.all(`SELECT strftime('%H', createdAt) as hour, COUNT(*) as cnt FROM tickets GROUP BY hour ORDER BY cnt DESC LIMIT 3`, (err3, hours) => {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({
          categories: categoriesList,
          counts: countsList,
          topLocations: locations,
          topTimeSlots: hours.map(h => ({ hour: parseInt(h.hour), count: h.cnt }))
        });
      });
    });
  });
});

module.exports = router;