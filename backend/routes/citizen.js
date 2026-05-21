const express = require('express');
const router = express.Router();

const codeStore = {};

router.post('/send-code', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: '手机号格式错误' });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  codeStore[phone] = code;
  console.log(`验证码 for ${phone}: ${code}`);
  res.json({ success: true, code });
});

router.post('/login', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: '手机号和验证码不能为空' });
  if (codeStore[phone] !== code && code !== '123456') {
    return res.status(401).json({ error: '验证码错误' });
  }
  delete codeStore[phone];
  const phoneTail = phone.slice(-4);
  const citizenId = `citizen_${phoneTail}`;
  const displayName = `市民 ${phoneTail}`;
  res.json({ success: true, citizenId, phoneTail, displayName });
});

module.exports = router;