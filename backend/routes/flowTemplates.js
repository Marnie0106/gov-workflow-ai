const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./workflow.db');
const axios = require('axios');

router.get('/', (req, res) => {
  db.all(`SELECT * FROM flow_templates ORDER BY id`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map(row => ({ ...row, steps: JSON.parse(row.steps) }));
    res.json(formatted);
  });
});

router.post('/', (req, res) => {
  const { name, steps, created_by } = req.body;
  if (!name || !steps) return res.status(400).json({ error: '缺少名称或步骤' });
  const createdAt = new Date().toISOString();
  db.run(`INSERT INTO flow_templates (name, steps, created_by, created_at) VALUES (?, ?, ?, ?)`,
    [name, JSON.stringify(steps), created_by || 'admin', createdAt], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    });
});

router.post('/generate', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: '缺少描述' });
  try {
    const aiRes = await axios.post('http://localhost:3001/api/ai/generateFlow', { description });
    res.json(aiRes.data);
  } catch (err) {
    console.error('调用 AI 生成流程失败:', err.message);
    res.status(500).json({ error: 'AI 生成失败' });
  }
});

module.exports = router;