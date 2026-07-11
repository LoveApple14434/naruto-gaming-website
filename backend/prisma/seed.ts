import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 创建管理员
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      coins: 99999,
    },
  });
  console.log(`  ✅ 管理员: ${admin.username}`);

  // 创建普通用户
  const userPassword = await bcrypt.hash('user123', 10);
  const user1 = await prisma.user.upsert({
    where: { username: 'naruto' },
    update: {},
    create: {
      username: 'naruto',
      password: userPassword,
      coins: 5000,
    },
  });
  console.log(`  ✅ 用户: ${user1.username}`);

  const user2 = await prisma.user.upsert({
    where: { username: 'sasuke' },
    update: {},
    create: {
      username: 'sasuke',
      password: userPassword,
      coins: 3000,
    },
  });
  console.log(`  ✅ 用户: ${user2.username}`);

  // 创建协助管理员
  const modPassword = await bcrypt.hash('mod123', 10);
  const moderator = await prisma.user.upsert({
    where: { username: 'kakashi' },
    update: {},
    create: {
      username: 'kakashi',
      password: modPassword,
      role: 'MODERATOR',
      coins: 10000,
    },
  });
  console.log(`  ✅ 协助管理员: ${moderator.username}`);

  // 创建选手
  const players = await Promise.all([
    prisma.player.create({ data: { name: '漩涡鸣人', nickname: '九尾人柱力' } }),
    prisma.player.create({ data: { name: '宇智波佐助', nickname: '轮回眼' } }),
    prisma.player.create({ data: { name: '春野樱', nickname: '怪力' } }),
    prisma.player.create({ data: { name: '旗木卡卡西', nickname: '写轮眼卡卡西' } }),
    prisma.player.create({ data: { name: '我爱罗', nickname: '砂之守鹤' } }),
    prisma.player.create({ data: { name: '日向宁次', nickname: '白眼' } }),
    prisma.player.create({ data: { name: '李洛克', nickname: '醉拳' } }),
    prisma.player.create({ data: { name: '奈良鹿丸', nickname: '影子束缚' } }),
  ]);
  console.log(`  ✅ 选手: ${players.length} 名`);

  // 创建示例商品
  const products = await Promise.all([
    prisma.product.create({ data: { name: '忍术卷轴', description: '记载着忍术奥秘的古老卷轴', price: 500, stock: 100 } }),
    prisma.product.create({ data: { name: '苦无套装', description: '高品质苦无一套', price: 200, stock: 50 } }),
    prisma.product.create({ data: { name: '木叶护额', description: '木叶村忍者护额', price: 300, stock: 80 } }),
    prisma.product.create({ data: { name: '九尾公仔', description: '可爱的九尾狐公仔', price: 1000, stock: 30 } }),
    prisma.product.create({ data: { name: '写轮眼挂件', description: '宇智波家族写轮眼挂件', price: 800, stock: 20 } }),
  ]);
  console.log(`  ✅ 商品: ${products.length} 个`);

  // 创建示例赛程（草稿）
  const bracket = await prisma.bracket.create({
    data: {
      title: '第1届忍界格斗大赛',
      nodes: {
        create: [
          { x: 100, y: 100, label: '半决赛 A', player1Id: players[0].id, player2Id: players[1].id },
          { x: 100, y: 300, label: '半决赛 B', player1Id: players[2].id, player2Id: players[3].id },
          { x: 500, y: 200, label: '决赛' },
        ],
      },
      resultSlots: {
        create: [
          { name: '冠军', capacity: 1, order: 1, x: 900, y: 150 },
          { name: '亚军', capacity: 1, order: 2, x: 900, y: 280 },
        ],
      },
    },
  });

  // 创建连线：半决赛A胜者→决赛，半决赛B胜者→决赛
  const bracketData = await prisma.bracket.findUnique({
    where: { id: bracket.id },
    include: { nodes: true, resultSlots: true },
  });
  if (bracketData) {
    const semiA = bracketData.nodes.find(n => n.label === '半决赛 A');
    const semiB = bracketData.nodes.find(n => n.label === '半决赛 B');
    const final = bracketData.nodes.find(n => n.label === '决赛');
    const champ = bracketData.resultSlots.find(s => s.name === '冠军');
    const runner = bracketData.resultSlots.find(s => s.name === '亚军');
    if (semiA && final) {
      await prisma.connection.create({ data: { sourceNodeId: semiA.id, targetNodeId: final.id, outcome: 'WINNER' } });
      await prisma.connection.create({ data: { sourceNodeId: semiA.id, targetNodeId: final.id, outcome: 'LOSER' } });
    }
    if (semiB && final) {
      await prisma.connection.create({ data: { sourceNodeId: semiB.id, targetNodeId: final.id, outcome: 'WINNER' } });
      await prisma.connection.create({ data: { sourceNodeId: semiB.id, targetNodeId: final.id, outcome: 'LOSER' } });
    }
    if (final && champ) {
      await prisma.connection.create({ data: { sourceNodeId: final.id, targetSlotId: champ.id, outcome: 'WINNER' } });
    }
    if (final && runner) {
      await prisma.connection.create({ data: { sourceNodeId: final.id, targetSlotId: runner.id, outcome: 'LOSER' } });
    }
  }
  console.log(`  ✅ 示例赛程: ${bracket.title}`);

  // 创建名人堂条目
  const hofPlayers = await prisma.player.findMany({ take: 4 });
  for (let i = 0; i < hofPlayers.length; i++) {
    await prisma.hallOfFame.create({
      data: {
        playerId: hofPlayers[i].id,
        title: ['忍界之神', '传说忍者', '木叶英雄', '影级强者'][i],
        description: '凭借卓越的实力和坚韧的意志，在历届比赛中取得辉煌成就。',
        season: `S${i + 1}`,
        order: i + 1,
      },
    });
  }
  console.log(`  ✅ 名人堂: ${hofPlayers.length} 条`);

  console.log('🎉 种子数据创建完成！');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
