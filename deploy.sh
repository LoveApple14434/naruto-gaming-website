#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════
# 一键部署脚本 — 火影忍者手游比赛网站
# ══════════════════════════════════════════════════════════
# 用法: 在项目根目录执行 ./deploy.sh
# 前提: pm2 已配置服务名为 naruto-api
# ══════════════════════════════════════════════════════════

cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"
echo "🚀 开始部署: $(date)"

# ── 1. 拉取最新代码 ──
echo ""
echo "⟦1/6⟧ 拉取最新代码..."
git pull

# ── 2. 安装后端依赖 ──
echo ""
echo "⟦2/6⟧ 安装后端依赖..."
cd "$PROJECT_ROOT/backend"
npm install

# ── 3. 生成 Prisma 客户端 + 数据库迁移 ──
echo ""
echo "⟦3/6⟧ 同步数据库..."
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

# ── 4. 安装前端依赖并构建 ──
echo ""
echo "⟦4/6⟧ 安装前端依赖..."
cd "$PROJECT_ROOT/frontend"
npm install

echo ""
echo "⟦5/6⟧ 构建前端..."
npm run build

# ── 5. 构建后端 ──
echo ""
echo "⟦6/6⟧ 构建后端..."
cd "$PROJECT_ROOT/backend"
npm run build

# ── 6. 重启 PM2 服务 ──
echo ""
echo "✅ 构建完成，重启 pm2 服务 naruto-api..."
pm2 restart naruto-api --update-env

echo ""
echo "══════════════════════════════════════════════"
echo "🎉 部署完成！"
echo "  时间: $(date)"
echo "  PM2:  $(pm2 show naruto-api | grep 'status' | head -1)"
echo "══════════════════════════════════════════════"
