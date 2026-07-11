import { prisma } from '../index';
import { Connection } from '@prisma/client';

/**
 * 根据连线的定义，自动将胜者/败者分发到下一个节点或结果槽。
 * - WINNER 线：将 winnerId 填入目标节点的 player1/player2（取空位）或目标结果槽的 winner
 * - LOSER 线：将 loserId 填入目标节点的 player1/player2（取空位）或目标结果槽的 loser
 */
export async function distributeResults(
  sourceNodeId: string,
  winnerId: string,
  loserId: string,
  connections: Connection[],
): Promise<void> {
  for (const conn of connections) {
    if (conn.outcome === 'WINNER') {
      await propagatePlayer(conn, winnerId);
    } else if (conn.outcome === 'LOSER') {
      await propagatePlayer(conn, loserId);
    }
  }
}

async function propagatePlayer(conn: Connection, playerId: string): Promise<void> {
  // 目标是一个比赛节点
  if (conn.targetNodeId) {
    const targetNode = await prisma.bracketNode.findUnique({
      where: { id: conn.targetNodeId },
    });
    if (!targetNode) return;

    // 填到空位：优先 player1，已有则 player2
    if (!targetNode.player1Id) {
      await prisma.bracketNode.update({
        where: { id: conn.targetNodeId },
        data: { player1Id: playerId },
      });
    } else if (!targetNode.player2Id) {
      await prisma.bracketNode.update({
        where: { id: conn.targetNodeId },
        data: { player2Id: playerId },
      });
    }
    // 两个位置都已满，忽略（可扩展为日志/告警）
  }

  // 目标是一个结果槽 — 将选手添加到槽中（不去重，允许多人进入同一槽位）
  if (conn.targetSlotId) {
    const slot = await prisma.resultSlot.findUnique({
      where: { id: conn.targetSlotId },
      include: { assignments: true },
    });
    if (!slot) return;

    // 不超过容量
    if (slot.assignments.length < slot.capacity) {
      await prisma.slotAssignment.create({
        data: { slotId: conn.targetSlotId, playerId },
      });
    }
  }
}
