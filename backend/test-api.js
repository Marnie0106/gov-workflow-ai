// test-api.js — AI 服务连通性测试脚本
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL;
const URL = process.env.AI_API_URL;

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
    console.log('AI 服务连通性测试成功：', response.data.choices[0].message.content);
  } catch (error) {
    console.error('AI 服务测试失败：');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('返回数据:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

test();
