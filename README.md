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

- **用户系统** — 注册、登录、角色区分（管理员/普通用户）、竞猜币
- **赛程系统** — 可视化拖拽编辑器，支持创建比赛节点、选手分配、结果槽、自定义框体、连线（胜者/败者流向）
- **结果分发** — 管理员手动录入结果后，系统自动将胜者/败者按连线推进到下一节点或结果槽
- **竞猜系统** — 管理员发布竞猜、设置赔率、关闭、结算；用户投注、查看记录
- **商城系统** — 商品管理、用户兑换、管理员审核
- **名人堂** — 历届明星选手展示、管理员管理
- **管理后台** — 一站式管理选手、赛程、竞猜、商品、兑换、名人堂

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

### 2. 配置数据库

编辑 `backend/.env`：

```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/naruto_gaming?schema=public"
JWT_SECRET="替换为随机字符串"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

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

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `admin` | `admin123` | 管理员 |
| `naruto` | `user123` | 普通用户 |
| `sasuke` | `user123` | 普通用户 |

## 项目结构

```
naruto-gaming-website/
├── backend/                   # API 服务
│   ├── prisma/
│   │   ├── schema.prisma     # 数据库模型（12 张表）
│   │   └── seed.ts           # 种子数据
│   └── src/
│       ├── index.ts          # Express 入口
│       ├── middleware/        # 认证、错误处理、校验
│       ├── routes/           # 路由（auth、brackets、bets、products 等）
│       └── services/         # 业务逻辑（结果自动分发引擎）
├── frontend/                  # React 客户端
│   └── src/
│       ├── api/              # API 客户端封装
│       ├── components/       # 布局组件
│       ├── pages/            # 页面（含 admin/ 后台）
│       ├── store/            # 认证上下文
│       └── types/            # TypeScript 类型
├── plan.md                   # 开发计划与设计文档
└── package.json              # 根工作区脚本
```

## API 概览

| 端点 | 说明 |
|------|------|
| `POST /api/auth/register` | 注册 |
| `POST /api/auth/login` | 登录 |
| `GET /api/auth/me` | 当前用户信息 |
| `GET/POST/PUT/DELETE /api/players` | 选手 CRUD |
| `GET/POST /api/brackets` | 赛程列表/创建 |
| `GET /api/brackets/:id` | 赛程详情（含完整结构） |
| `POST /api/brackets/:id/publish\|finish` | 发布/结束 |
| `PUT /api/brackets/nodes/:nodeId/result` | 设定比赛结果 + 自动分发 |
| `POST /api/brackets/:id/nodes\|result-slots\|canvas-items` | 编辑器创建元素 |
| `POST /api/brackets/connections` | 创建连线 |
| `GET/POST /api/bets/bracket/:bracketId` | 竞猜列表/创建 |
| `POST /api/bets/:id/place` | 用户投注 |
| `PUT /api/bets/:id/close\|settle` | 关闭/结算竞猜 |
| `GET/POST/PUT/DELETE /api/products` | 商品 CRUD |
| `POST /api/redemptions` | 创建兑换请求 |
| `PUT /api/redemptions/:id/status` | 审核兑换 |
| `GET/POST/PUT/DELETE /api/hall-of-fame` | 名人堂 CRUD |

## 许可证

MIT
