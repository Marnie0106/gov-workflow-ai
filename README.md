# 市容巡查一体化系统 (gov-workflow-ai)

基于 React + Express + SQLite + AI 的政府市容巡查全流程管理系统。

## 功能特性

- **市民端**：手机号登录、工单上报、照片上传、留言沟通、服务评价
- **处置员端**：工单接收/处理、状态流转、AI 处置建议、内部协作、留言互动
- **管理员端**：工单全生命周期管理、流程模板 CRUD、AI 智能生成流程、内部协作
- **领导看板**：核心指标统计、ECharts 图表可视化（工单趋势/分类/处理时长/满意度）
- **AI 能力**：工单重复/模糊检测、部门推荐、处置建议、流程生成

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite + JSX + react-router-dom v7 |
| UI | react-icons + echarts + reactflow |
| HTTP | axios |
| 后端 | Node.js + Express 5 |
| 数据库 | SQLite3（workflow.db） |
| AI | 大语言模型（兼容 OpenAI Chat Completions API 格式） |

## 快速开始

### 前置要求

- Node.js >= 18
- npm

### 安装

```bash
# 克隆项目
git clone https://github.com/Marnie0106/gov-workflow-ai.git
cd gov-workflow-ai

# 安装后端依赖
cd backend
npm install
cd ..

# 安装前端依赖
cd frontend
npm install
cd ..
```

### 配置 AI 服务（可选）

系统支持任何兼容 OpenAI Chat Completions API 格式的大语言模型服务。

```bash
# 1. 复制环境变量模板
cp backend/.env.example backend/.env

# 2. 编辑 .env，填入你的配置
AI_API_KEY=你的API密钥
AI_API_URL=你的API服务地址
AI_MODEL=你使用的模型名称
```

> 推荐使用 [硅基流动](https://siliconflow.cn) 平台，注册即送免费额度，兼容 OpenAI 格式，配置示例：
>
> ```
> AI_API_KEY=sk-xxxxxxxx
> AI_API_URL=https://api.siliconflow.cn/v1/chat/completions
> AI_MODEL=deepseek-ai/DeepSeek-V3
> ```

> 不配置 AI 服务不影响系统其他功能，AI 相关功能会返回默认兜底结果。

### 启动

**方式一：一键启动（Windows）**

双击 `start.bat` 即可同时启动前后端。

**方式二：手动启动**

```bash
# 终端 1：启动后端（端口 3001）
cd backend
node server.js

# 终端 2：启动前端开发服务器（端口 5173）
cd frontend
npm run dev
```

打开浏览器访问 http://localhost:5173

## 演示账号

### 市民端

| 账号 | 验证码 |
|------|--------|
| 任意 11 位手机号 | 123456 |

> 验证码固定为 `123456`（演示用）。

### 政务人员（工号登录）

| 工号 | 角色 | 姓名 |
|------|------|------|
| D001 | 处置人员 | 王强 |
| D002 | 处置人员 | 赵芳 |
| A001 | 管理员 | 李明 |
| L001 | 领导 | 张华 |

## 项目结构

```
gov-workflow-ai/
├── backend/
│   ├── server.js          # Express 主入口，全部 REST API
│   ├── db.js              # SQLite 数据库模块（建表/CRUD/种子数据）
│   ├── agents.js          # AI 智能分析模块
│   ├── routes/
│   │   └── citizen.js     # 市民路由（验证码/登录）
│   ├── uploads/           # 用户上传的图片（.gitignore 保护）
│   ├── .env.example       # 环境变量模板
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # 路由配置
│   │   ├── main.jsx       # 入口文件
│   │   ├── api.js         # 统一 axios 实例 + API 封装
│   │   ├── components/    # 公共组件（NavBar/Banner/Layout）
│   │   └── pages/         # 页面组件
│   │       ├── LoginPage.jsx
│   │       ├── DispatcherPage.jsx
│   │       ├── ProcessAdminPage.jsx
│   │       ├── LeaderPage.jsx
│   │       └── citizen/   # 市民子组件
│   ├── public/
│   └── package.json
├── 政务人员信息导入说明.md
├── start.bat              # Windows 一键启动脚本
└── README.md
```

## API 概览

后端运行在 `http://localhost:3001`，主要接口：

- `POST /api/login` - 系统用户登录（支持工号）
- `POST /api/sms/send` - 发送短信验证码
- `POST /api/sms/verify` - 验证短信验证码
- `GET/POST /api/tickets` - 工单列表/创建
- `POST /api/tickets/:id/dispatch` - 派单
- `GET/POST /api/messages` - 留言（含内部协作）
- `POST /api/upload` - 图片上传
- `POST /api/evaluations` - 评价
- `GET /api/statistics` - 统计数据
- `GET/POST /api/flow-templates` - 流程模板
- `POST /api/ai/suggest` - AI 处置建议
- `POST /api/ai/generateFlow` - AI 生成流程

## 许可

MIT
