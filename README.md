# 🦊 火影忍者手游比赛平台

一个功能完整的火影忍者主题比赛竞猜网站，支持赛程管理、可视化编排、实时竞猜、商城兑换和名人堂展示。

## 技术栈

| 层 | 技术 |
|---|---|
| **前端** | React 19 + TypeScript + Vite + React Router v7 |
| **后端** | Node.js + Express + TypeScript |
| **数据库** | PostgreSQL + Prisma ORM |
| **认证** | JWT（JSON Web Token）+ bcrypt |
| **校验** | Zod |

## 功能概览

- **用户系统** — 注册、登录、角色区分（管理员/协管员/普通用户）、竞猜币、个人信息管理
- **公告系统** — 管理员发布公告，支持 Markdown 内容，可控制发布状态
- **赛程系统** — 可视化拖拽编辑器，支持创建比赛节点、选手分配、结果槽、自定义框体、连线（胜者/败者流向）
- **结果分发** — 管理员手动录入结果后，系统自动将胜者/败者按连线推进到下一节点或结果槽
- **竞猜系统** — 管理员发布竞猜、设置赔率、关闭、结算；用户投注、查看记录
- **签到系统** — 管理员配置签到活动（多日奖励），用户每日签到领取竞猜币，南大学生额外加成
- **商城系统** — 商品管理、用户兑换、管理员审核
- **头像上传** — 用户可自定义头像，支持 Magic Number 图片格式校验
- **南大身份认证** — 通过南大邮箱 (nju.edu.cn / smail.nju.edu.cn) 验证学生身份
- **名人堂** — 历届明星选手展示、管理员管理
- **管理后台** — 一站式管理选手、赛程、竞猜、签到、商品、兑换、公告、用户、名人堂

## 快速开始

### 前置条件

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

### 1. 克隆并安装依赖

```bash
git clone <repo-url>
cd naruto-gaming-website

cd backend
npm install

cd ../frontend
npm install
```

### 2. 配置环境变量

复制环境变量模板并编辑：

```bash
cp backend/.env.example backend/.env
```

根据需要修改 `backend/.env` 中的配置项。

### 3. 初始化数据库

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. 启动开发服务器

**终端 1 — 后端**（端口 3001）：

```bash
cd backend
npm run dev
```

**终端 2 — 前端**（端口 5173）：

```bash
cd frontend
npm run dev
```

打开浏览器访问 `http://localhost:5173`。

> 首次运行后请通过种子数据或管理后台创建初始管理员账号。

## 项目结构

```
naruto-gaming-website/
├── backend/                   # API 服务
│   ├── prisma/
│   │   ├── schema.prisma     # 数据库模型（16 张表）
│   │   ├── seed.ts           # 种子数据
│   │   └── migrations/       # 数据库迁移历史
│   ├── src/
│   │   ├── index.ts          # Express 入口
│   │   ├── middleware/        # 认证、错误处理、校验
│   │   ├── routes/           # 路由（auth、brackets、bets、checkins 等）
│   │   └── services/         # 业务逻辑（结果自动分发引擎、邮件服务）
│   └── uploads/              # 上传文件存储
├── frontend/                  # React 客户端
│   ├── public/
│   └── src/
│       ├── api/              # API 客户端封装
│       ├── components/       # 布局及业务组件（签到弹窗、头像上传、赛程节点等）
│       ├── pages/            # 页面（含 admin/ 后台管理）
│       ├── store/            # 认证上下文
│       ├── types/            # TypeScript 类型定义
│       └── utils/            # 工具函数
├── deploy.sh                 # 一键部署脚本
├── plan.md                   # 开发计划与设计文档
└── package.json              # 根工作区脚本
```

## 近期更新

| 日期 | 变更内容 |
|------|----------|
| 2026-07-19 | 新增南大学生身份认证（邮箱验证码）；修复验证码相关问题 |
| 2026-07-19 | 新增签到系统，支持多日签到活动与南大学生额外奖励加成 |
| 2026-07-18 | 新增用户头像上传（含 Magic Number 格式校验） |
| 2026-07-18 | 新增个人信息管理页面；头像在竞猜页面展示；抽签板重构优化 |
| 2026-07-18 | 新增一键部署脚本 (`deploy.sh`) |
| 2026-07-11 | 新增协管员角色（`MODERATOR`），可管理用户和签到 |
| 2026-07-11 | 新增公告系统（Markdown 支持）、竞猜币审计功能 |
| 2026-07-11 | 新增布局图标、默认头像、URL 校验、前端重构 |

完整变更记录请查看 [Git 日志](https://github.com/your-username/naruto-gaming-website/commits/master)。

## 许可证

MIT
