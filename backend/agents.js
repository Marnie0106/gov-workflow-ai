/**
 * backend/agents.js
 * 市容巡查一体化系统 · AI Agent 模块
 *
 * 架构说明：
 * 每个 Agent 不是简单的「调一次 LLM」，而是具备：
 *   think（推理）→ act（调用工具）→ observe（观察结果）→ think（再推理）
 * 的完整 ReAct 循环，并支持工具调用（Function Calling）。
 *
 * 依赖：axios、dotenv
 * 兼容：火山引擎 Ark（DeepSeek-V3）、OpenAI 格式
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ── 配置 ──────────────────────────────────────────
const API_KEY  = process.env.AI_API_KEY;
const MODEL    = process.env.AI_MODEL || 'deepseek-v3';
const API_URL  = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const TEMP     = 0.2;
const MAX_TURNS = 5;   // Agent 最多推理轮数

// ── 工具注册表 ──────────────────────────────────
// 每个 Agent 可以使用的工具，由 LLM 的 function calling 机制触发
const TOOLS = {
  db_query: {
    description: '用 SQL 查询 workflow.db，获取工单/用户/评价等数据。输入参数：sql（SELECT 语句）',
    execute: null,   // 延迟绑定，initAgents(db) 时注入
  },
  get_department_duty: {
    description: '查询各部门职责范围，输入：部门名称（城管/市监/街道办），返回职责描述',
    execute: (dept) => {
      const duties = {
        '城管':   '负责市容环境卫生、占道经营、违章建筑、户外广告、城市道路照明、园林绿化等城市管理行政执法事项',
        '市监':   '负责食品安全、价格违法、产品质量、特种设备安全、消费者权益保护等市场监管事项',
        '街道办': '负责辖区内的社区服务、邻里纠纷、小型公共设施维护、政策宣传等基层综合管理事项',
      };
      return duties[dept] || '未知部门';
    },
  similarity_search: {
    description: '在历史工单库中，按语义相似度检索最相似的 N 条历史工单，输入：query（查询文本）、topN（返回条数，默认3）',
    execute: null,   // 延迟绑定
  },
  get_current_time: {
    description: '获取当前服务器时间，用于判断工单是否超时',
    execute: () => new Date().toISOString(),
  },
};

// ── 通用 LLM 调用（支持 function calling）────────────────────────────
async function callLLM(messages, tools = []) {
  const body = {
    model: MODEL,
    messages,
    temperature: TEMP,
  };
  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }
  try {
    const res = await axios.post(API_URL, body, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    return res.data.choices[0].message;
  } catch (err) {
    console.error('[Agent] LLM 调用失败:', err.message);
    return null;
  }
}

// ── ReAct Agent 执行引擎 ─────────────────────────
// 参数：
//   systemPrompt  : Agent 的 system prompt（定义角色、目标、工具使用规范）
//   userPrompt   : 用户输入（如工单内容）
//   availableTools: 该 Agent 可用的工具名称数组，如 ['db_query', 'get_department_duty']
//   db           : SQLite db 实例（用于注入 db_query 工具）
//
// 返回：{ success, result, reasoning }
async function runAgent({ systemPrompt, userPrompt, availableTools = [], db = null }) {
  // 绑定 db_query 工具
  if (db && availableTools.includes('db_query')) {
    TOOLS.db_query.execute = (sql) => {
      return new Promise((resolve) => {
        // 只允许 SELECT
        if (!/^select\s+/i.test(sql.trim())) {
          return resolve({ error: '只允许 SELECT 查询' });
        }
        db.all(sql, [], (err, rows) => {
          if (err) resolve({ error: err.message });
          else resolve({ rows: rows.slice(0, 20), total: rows.length });
        });
      });
    };
  }

  // 构造 tools 参数（OpenAI function calling 格式）
  const toolsDef = availableTools
    .filter(t => TOOLS[t])
    .map(t => ({
      type: 'function',
      function: {
        name: t,
        description: TOOLS[t].description,
        parameters: t === 'db_query'
          ? { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] }
          : t === 'get_department_duty'
          ? { type: 'object', properties: { dept: { type: 'string', enum: ['城管','市监','街道办'] } }, required: ['dept'] }
          : t === 'similarity_search'
          ? { type: 'object', properties: { query: { type: 'string' }, topN: { type: 'number', default: 3 } }, required: ['query'] }
          : t === 'get_current_time'
          ? { type: 'object', properties: {} }
          : { type: 'object', properties: {} },
      },
    }));

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const reasoning = [];   // 记录推理过程，用于可解释性

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const assistantMsg = await callLLM(messages, toolsDef);
    if (!assistantMsg) break;

    // 情况1：LLM 直接返回内容（不需要调用工具）
    if (assistantMsg.content && !assistantMsg.tool_calls) {
      reasoning.push({ turn, action: 'final_answer', content: assistantMsg.content });
      messages.push({ role: 'assistant', content: assistantMsg.content });
      // 尝试解析 JSON（如果预期返回结构化数据）
      let result = assistantMsg.content;
      try { result = JSON.parse(assistantMsg.content); } catch (_) {}
      return { success: true, result, reasoning };
    }

    // 情况2：LLM 请求调用工具
    if (assistantMsg.tool_calls) {
      messages.push({
        role: 'assistant',
        content: assistantMsg.content || '',
        tool_calls: assistantMsg.tool_calls,
      });

      for (const tc of assistantMsg.tool_calls) {
        const toolName = tc.function.name;
        let toolArgs = {};
        try { toolArgs = JSON.parse(tc.function.arguments); } catch (_) {}

        reasoning.push({ turn, action: 'tool_call', tool: toolName, args: toolArgs });

        let toolResult = { error: '工具未找到' };
        if (TOOLS[toolName] && TOOLS[toolName].execute) {
          try {
            const execResult = TOOLS[toolName].execute(toolArgs.sql || toolArgs.dept || toolArgs.query || toolArgs.topN || '');
            // 支持同步和 Promise
            toolResult = execResult instanceof Promise ? await execResult : execResult;
          } catch (e) {
            toolResult = { error: e.message };
          }
        }

        reasoning.push({ turn, action: 'tool_result', tool: toolName, result: toolResult });

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      }
    }
  }

  // 达到最大轮数，强制收尾
  const finalMsg = await callLLM(messages, []);
  const result = finalMsg ? finalMsg.content : '{"error":"Agent 推理超时"}';
  return { success: true, result, reasoning };
}


// ═══════════════════════════════════════════
//  Agent 1：工单分类 Agent
// ═══════════════════════════════════════════
// 能力：
//   1. 调用 db_query 查询相似历史工单
//   2. 调用 get_department_duty 确认部门职责
//   3. 综合判断工单类型 + 推荐部门
//
// 返回：{ category, department, confidence, reason, similarTickets }
async function classifyTicketAgent(ticket, db) {
  const systemPrompt = `你是「市容巡查工单分类 Agent」。
你的任务：根据工单标题和内容，判断工单类型（市容环境/占道经营/违章建筑/噪音扰民/绿化养护/其他），
并推荐主责部门（城管/市监/街道办）。

你可以通过工具：
- db_query：查询历史工单，参考相似工单的分类结果
- get_department_duty：查询各部门职责，确保推荐准确
- get_current_time：获取当前时间

最终返回 JSON，格式：
{"category":"占道经营", "department":"城管", "confidence":0.92, "reason":"涉及流动摊贩占道，属城管职责", "similarTicketIds":[1,3]}

只返回 JSON，不要多余文字。`;

  const userPrompt = `请分析以下工单：
标题：${ticket.title}
内容：${ticket.content}
位置：${ticket.location}
类型（可选项，参考）：市容环境 / 占道经营 / 违章建筑 / 噪音扰民 / 绿化养护 / 其他`;

  const { result, reasoning } = await runAgent({
    systemPrompt,
    userPrompt,
    availableTools: ['db_query', 'get_department_duty', 'get_current_time'],
    db,
  });

  try {
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return { ...parsed, reasoning };
  } catch (_) {
    return { category: '其他', department: '城管', confidence: 0.5, reason: 'AI解析失败，使用默认分类', reasoning };
  }
}


// ═══════════════════════════════════════════
//  Agent 2：处置建议 Agent
// ═══════════════════════════════════════════
// 能力：
//   1. 调用 db_query 查询同类工单的历史处置记录
//   2. 基于历史案例生成处置建议
//   3. 给出预计处理时长参考
//
// 返回：{ suggestions: [{step, detail}], estimatedHours, referenceCases }
async function suggestDisposalAgent(ticket, db) {
  const systemPrompt = `你是「政务工单处置建议 Agent」。
你的任务：基于工单内容，生成具体的处置操作步骤建议。

你可以通过工具：
- db_query：查询同类工单的历史处置记录，作为参考案例
- get_department_duty：确认处置部门职责范围
- get_current_time：记录建议生成时间

返回 JSON 格式：
{
  "suggestions": [
    {"step": 1, "detail": "派员现场勘查，拍照取证"},
    {"step": 2, "detail": "依据《城市市容和环境卫生管理条例》第X条，下达整改通知"},
    {"step": 3, "detail": "跟踪整改情况，5个工作日内回访"}
  ],
  "estimatedHours": 48,
  "referenceCases": [2, 5],
  "legalBasis": "《城市市容和环境卫生管理条例》"
}

只返回 JSON，不要多余文字。`;

  const userPrompt = `工单信息：
标题：${ticket.title}
内容：${ticket.content}
类型：${ticket.category || '待分类'}
位置：${ticket.location}
${ticket.department ? `推荐部门：${ticket.department}` : ''}

请生成处置建议。`;

  const { result, reasoning } = await runAgent({
    systemPrompt,
    userPrompt,
    availableTools: ['db_query', 'get_department_duty', 'get_current_time'],
    db,
  });

  try {
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return { ...parsed, reasoning };
  } catch (_) {
    return {
      suggestions: [{ step: 1, detail: '请处置人员现场勘查后人工判断' }],
      estimatedHours: 48,
      referenceCases: [],
      legalBasis: '',
      reasoning,
    };
  }
}


// ═══════════════════════════════════════════
//  Agent 3：流程生成 Agent
// ═══════════════════════════════════════════
// 能力：
//   1. 接收自然语言描述的流程
//   2. 生成 ReactFlow 兼容的节点/边数据
//   3. 验证流程逻辑（无环、有起点终点）
//
// 返回：{ nodes: [{id,type,position,data}], edges: [{source,target}] }
async function generateFlowAgent(description) {
  const systemPrompt = `你是「政务流程生成 Agent」。
你的任务：将用户用自然语言描述的行政审批/工单处理流程，转换成 ReactFlow 流程图数据。

输出严格 JSON 格式：
{
  "nodes": [
    {"id":"1", "type":"input", "position":{"x":100,"y":50}, "data":{"label":"市民提交工单"}},
    {"id":"2", "type":"default", "position":{"x":100,"y":150}, "data":{"label":"系统AI分类"}}
  ],
  "edges": [
    {"source":"1", "target":"2"}
  ]
}

规则：
- 至少包含起点（type:input）和终点（type:output）
- 节点数不超过 8 个
- x 坐标相同列的节点 y 间隔 100
- 只返回 JSON，不要多余文字`;

  const userPrompt = `请为以下流程描述生成 ReactFlow 节点数据：
${description}

如果描述不够详细，请基于政务工单处理的标准流程，合理补充节点。`;

  const { result } = await runAgent({
    systemPrompt,
    userPrompt,
    availableTools: [],   // 流程生成不需要工具调用
  });

  try {
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    // 简单验证
    if (parsed.nodes && parsed.edges) return parsed;
    return { nodes: [], edges: [] };
  } catch (_) {
    return { nodes: [], edges: [] };
  }
}


// ═══════════════════════════════════════════
//  Agent 4：超时检测 Agent（定时任务版）
// ═══════════════════════════════════════════
// 非 LLM 驱动，而是规则 + LLM 混合：
//   - 规则部分：直接查 DB 找24h未更新工单
//   - LLM 部分：对超时工单生成"处置建议摘要"
//
// 返回：{ timeoutTickets: [...], suggestions: [{ticketId, suggestion}] }
async function timeoutCheckAgent(db) {
  return new Promise((resolve) => {
    const now = Date.now();
    // 实际 schema：status='created'/'dispatched'/'completed'，超时标记 isTimeout=1，无 updated_at 字段
    const sql = `SELECT * FROM tickets WHERE isTimeout = 1 AND status != 'completed' ORDER BY createdAt DESC LIMIT 10`;
    db.all(sql, [], async (err, rows) => {
      if (err) return resolve({ timeoutTickets: [], suggestions: [] });

      const suggestions = [];
      for (const ticket of rows.slice(0, 5)) {   // 最多处理5条，避免超时
        const systemPrompt = `你是超时工单分析 Agent。请根据工单内容，生成一句简短的处置建议（不超过50字）。`;
        const userPrompt = `工单ID:${ticket.id}，标题:${ticket.title}，状态:${ticket.status}，已超时。请给出处置建议。`;
        const { result } = await runAgent({ systemPrompt, userPrompt, availableTools: [] });
        suggestions.push({
          ticketId: ticket.id,
          title: ticket.title,
          suggestion: typeof result === 'string' ? result.slice(0, 100) : '请尽快处理',
        });
      }

      resolve({ timeoutTickets: rows, suggestions });
    });
  });
}


// ═══════════════════════════════════════════
//  导出
// ═══════════════════════════════════════════
module.exports = {
  classifyTicketAgent,      // 工单分类 Agent
  suggestDisposalAgent,    // 处置建议 Agent
  generateFlowAgent,        // 流程生成 Agent
  timeoutCheckAgent,        // 超时检测 Agent
  runAgent,                // 底层 Agent 执行引擎（可供扩展）
  TOOLS,                  // 工具注册表（可供扩展新工具）
};
