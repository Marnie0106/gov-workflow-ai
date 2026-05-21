// backend/agents.js
const axios = require('axios');
require('dotenv').config();

// 硅基流动配置
const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = 'deepseek-ai/DeepSeek-V3';   // 与测试时保持一致
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// 通用调用函数
async function callDeepSeek(systemPrompt, userPrompt) {
  try {
    const response = await axios.post(API_URL, {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
      // 注意：硅基流动不支持 response_format 参数，所以不写
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let content = response.data.choices[0].message.content;
    // 尝试清理可能出现的 markdown 标记
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    return JSON.parse(content);
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('返回数据:', error.response.data);
    }
    return null;
  }
}

// Agent 1：判断重复与模糊
async function analyzeTicket(ticket) {
  const systemPrompt = `你是政务工单智能分析助手。请根据工单内容判断是否**重复工单**（同一地点1小时内上报第2次及以上）和是否**模糊工单**（内容描述过于笼统，如“这里很脏”、“有问题”等，缺少具体位置或明确问题）。返回合法JSON格式，例如：{"isDuplicate": false, "isVague": false, "reason": "理由"}`;
  const userPrompt = `工单标题：${ticket.title}\n工单内容：${ticket.content}\n工单位置：${ticket.location}\n请分析。`;
  const result = await callDeepSeek(systemPrompt, userPrompt);
  if (result && typeof result.isDuplicate === 'boolean' && typeof result.isVague === 'boolean') {
    return result;
  }
  return { isDuplicate: false, isVague: false, reason: 'AI分析失败，使用默认值' };
}

// Agent 2：推荐主责部门
async function recommendDepartment(ticket) {
  const systemPrompt = `你是政务协同助手。根据工单内容，推荐主责部门：城管、市监、街道办中的一个。返回合法JSON格式，例如：{"department": "城管", "reason": "因为涉及占道经营"}`;
  const userPrompt = `工单标题：${ticket.title}\n工单内容：${ticket.content}\n位置：${ticket.location}`;
  const result = await callDeepSeek(systemPrompt, userPrompt);
  if (result && result.department && ['城管', '市监', '街道办'].includes(result.department)) {
    return result;
  }
  return { department: '城管', reason: '默认推荐城管' };
}

module.exports = { analyzeTicket, recommendDepartment };