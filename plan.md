# 火影忍者手游比赛网站

## 项目结构

```
naruto-gaming-website/
├── package.json              # 根工作区
├── plan.md                   # 本计划
├── backend/                  # 后端 API
│   ├── prisma/
│   │   ├── schema.prisma     # 数据库模型
│   │   └── seed.ts           # 种子数据
│   ├── src/
│   │   ├── index.ts          # 入口、Express 启动
│   │   ├── middleware/
│   │   │   ├── auth.ts       # JWT 认证 + 角色中间件
│   │   │   ├── errorHandler.ts
│   │   │   └── validate.ts   # Zod 校验
│   │   ├── routes/
│   │   │   ├── auth.ts       # 注册/登录/个人信息
│   │   │   ├── brackets.ts   # 赛程 CRUD + 编辑器 API + 结果分发
│   │   │   ├── players.ts    # 选手管理
│   │   │   ├── bets.ts       # 竞猜 CRUD + 投注 + 结算
│   │   │   ├── products.ts   # 商品管理
│   │   │   ├── redemptions.ts# 兑换审核
│   │   │   └── hallOfFame.ts # 名人堂管理
│   │   └── services/
│   │       └── bracketEngine.ts  # 比赛结果自动分发
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
└── frontend/                 # 前端 React + TypeScript
    ├── src/
    │   ├── App.tsx           # 路由定义
    │   ├── App.css           # 全局样式
    │   ├── index.css         # 基础重置
    │   ├── api/client.ts     # API 客户端封装
    │   ├── types/index.ts    # TypeScript 类型定义
    │   ├── store/AuthContext.tsx  # 认证上下文
    │   ├── components/Layout.tsx  # 布局 + 导航
    │   └── pages/
    │       ├── HomePage.tsx
    │       ├── LoginPage.tsx
    │       ├── BracketListPage.tsx
    │       ├── BracketViewPage.tsx
    │       ├── ShopPage.tsx
    │       ├── HallOfFamePage.tsx
    │       ├── MyBetsPage.tsx
    │       └── admin/
    │           ├── AdminDashboard.tsx
    │           ├── AdminBrackets.tsx
    │           ├── BracketEditorPage.tsx  # 可视化赛程编辑器
    │           ├── AdminPlayers.tsx
    │           ├── AdminProducts.tsx
    │           ├── AdminBets.tsx
    │           ├── AdminRedemptions.tsx
    │           └── AdminHallOfFame.tsx
    ├── package.json
    └── vite.config.ts
```

## 功能清单

| 功能 | 状态 |
|------|------|
| 用户注册/登录 | ✅ |
| JWT 认证 + 角色区分 (USER/ADMIN) | ✅ |
| 选手管理 CRUD | ✅ |
| 赛程 CRUD + 发布/结束 | ✅ |
| 可视化赛程编辑器（拖拽、连线、属性面板） | ✅ |
| 比赛结果录入 + 自动分发 | ✅ |
| 竞猜管理（创建/关闭/结算） | ✅ |
| 用户投注 + 赔率计算 | ✅ |
| 商城（商品列表/兑换） | ✅ |
| 兑换审核（管理员审批） | ✅ |
| 名人堂展示 + 管理 | ✅ |
| 管理后台仪表盘 | ✅ |

## 启动方式

```bash
# 1. 确保 PostgreSQL 运行，修改 backend/.env 中的 DATABASE_URL

# 2. 初始化数据库
cd backend
npx prisma migrate dev --name init
npx prisma db seed

# 3. 启动后端（端口 3001）
npm run dev

# 4. 启动前端（端口 5173）
cd ../frontend
npm run dev
```

## 默认账号

| 用户 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 管理员 |
| naruto | user123 | 普通用户 |
| sasuke | user123 | 普通用户 |

## 数据库表

- `users` — 用户（含角色、竞猜币）
- `players` — 参赛选手
- `brackets` — 赛程
- `bracket_nodes` — 比赛节点
- `result_slots` — 结果槽
- `connections` — 连线（胜者/败者流向）
- `canvas_items` — 看板自定义框体
- `bets` — 竞猜
- `user_bets` — 用户投注记录
- `products` — 商品
- `redemptions` — 兑换记录
- `hall_of_fame` — 名人堂

## 待后续优化

- 赛程编辑器增加撤销/重做
- 缩放到网格对齐
- 实时协作编辑
- 支付对接
- OAuth 第三方登录
- 比赛直播/回放集成