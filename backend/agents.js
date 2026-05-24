// backend/agents.js
const axios = require('axios');
require('dotenv').config();

// AI 服务配置（通过环境变量注入，不在代码中硬编码）
const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL;
const API_URL = process.env.AI_API_URL;

// 通用 AI 调用函数
async function callAI(systemPrompt, userPrompt) {
  try {
    const response = await axios.post(API_URL, {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let content = response.data.choices[0].message.content;
    // 清理可能出现的 markdown 标记
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    return JSON.parse(content);
  } catch (error) {
    console.error('AI 服务调用失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
    }
    return null;
  }
}

// 模块1：判断重复与模糊工单
async function analyzeTicket(ticket) {
  const systemPrompt = `你是政务工单智能分析助手。请根据工单内容判断是否**重复工单**（同一地点1小时内上报第2次及以上）和是否**模糊工单**（内容描述过于笼统，如"这里很脏"、"有问题"等，缺少具体位置或明确问题）。返回合法JSON格式，例如：{"isDuplicate": false, "isVague": false, "reason": "理由"}`;
  const userPrompt = `工单标题：${ticket.title}\n工单内容：${ticket.content}\n工单位置：${ticket.location}\n请分析。`;
  const result = await callAI(systemPrompt, userPrompt);
  if (result && typeof result.isDuplicate === 'boolean' && typeof result.isVague === 'boolean') {
    return result;
  }
  return { isDuplicate: false, isVague: false, reason: 'AI分析失败，使用默认值' };
}

// 模块2：推荐主责部门
async function recommendDepartment(ticket) {
  const systemPrompt = `你是政务协同助手。根据工单内容，推荐主责部门：城管、市监、街道办中的一个。返回合法JSON格式，例如：{"department": "城管", "reason": "因为涉及占道经营"}`;
  const userPrompt = `工单标题：${ticket.title}\n工单内容：${ticket.content}\n位置：${ticket.location}`;
  const result = await callAI(systemPrompt, userPrompt);
  if (result && result.department && ['城管', '市监', '街道办'].includes(result.department)) {
    return result;
  }
  return { department: '城管', reason: '默认推荐城管' };
}

module.exports = { analyzeTicket, recommendDepartment };
