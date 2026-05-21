// test-api.js
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = 'deepseek-ai/DeepSeek-V3';  // 确认您使用的模型名
const URL = 'https://api.siliconflow.cn/v1/chat/completions';

async function test() {
  try {
    const response = await axios.post(URL, {
      model: MODEL,
      messages: [
        { role: 'system', content: '你是一个助手。' },
        { role: 'user', content: '请回复：成功' }
      ],
      temperature: 0.7,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('API 调用成功：', response.data.choices[0].message.content);
  } catch (error) {
    console.error('API 调用失败：');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('返回数据:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

test();