# 市容巡查一体化系统 (gov-workflow-ai)

基于 React + Express + SQLite + DeepSeek AI 的政府市容巡查全流程管理系统。

## 功能特性

- **市民端**：手机号登录、工单上报、留言沟通、服务评价
- **处置员端**：工单接收/处理、状态流转、AI 处置建议、留言互动
- **管理员端**：工单全生命周期管理、流程模板 CRUD、AI 智能生成流程
- **领导看板**：核心指标统计、ECharts 图表可视化（工单趋势/分类/处理时长/满意度）
- **AI 能力**：DeepSeek-V3 驱动的工单重复/模糊检测、部门推荐、处置建议、流程生成

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite 8 + JSX + react-router-dom v7 |
| UI | react-icons + echarts + reactflow |
| HTTP | axios |
| 后端 | Node.js + Express 5 |
| 数据库 | SQLite3（workflow.db） |
| AI | DeepSeek-V3（通过硅基流动 SiliconFlow API） |

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

### 配置 AI（可选）

后端 AI 功能需要 SiliconFlow API 密钥：

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 编辑 .env，填入你的 API 密钥
# DEEPSEEK_API_KEY=sk-xxxxxxxx
```

> 不配置 API 密钥不影响系统其他功能的正常使用，AI 相关功能会返回默认兜底结果。

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
| 12345678900 | 123456 |

> 任意 11 位手机号均可注册，验证码固定为 `123456`（演示用）。

### 系统角色（一键登录）

| 用户名 | 角色 | 显示名 |
|--------|------|--------|
| dispatcher1 | 处置人员 | 王强 |
| dispatcher2 | 处置人员 | 赵芳 |
| admin1 | 管理员 | 李明 |
| leader1 | 领导 | 张华 |

## 项目结构

```
gov-workflow-ai/
├── backend/
│   ├── server.js          # Express 主入口，全部 REST API
│   ├── db.js              # SQLite 数据库模块（建表/CRUD/种子数据）
│   ├── agents.js          # DeepSeek AI 分析模块
│   ├── routes/
│   │   └── citizen.js     # 市民路由（验证码/登录）
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
│   │       ├── CitizenPage.jsx
│   │       ├── DispatcherPage.jsx
│   │       ├── ProcessAdminPage.jsx
│   │       ├── LeaderPage.jsx
│   │       └── citizen/   # 市民子组件
│   ├── public/
│   └── package.json
├── start.bat              # Windows 一键启动脚本
└── README.md
```

## API 概览

后端运行在 `http://localhost:3001`，主要接口：

- `POST /api/login` - 系统用户登录
- `POST /api/citizen/login` - 市民手机号登录
- `GET/POST /api/tickets` - 工单列表/创建
- `POST /api/tickets/:id/dispatch` - 派单
- `GET/POST /api/messages` - 留言
- `POST /api/evaluations` - 评价
- `GET /api/statistics` - 统计数据
- `GET/POST /api/flow-templates` - 流程模板
- `POST /api/ai/suggest` - AI 处置建议
- `POST /api/ai/generateFlow` - AI 生成流程

## 许可

MIT
