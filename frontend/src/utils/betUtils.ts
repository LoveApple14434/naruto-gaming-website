/**
 * 动态赔率（巴黎 mutual 模式）
 * 赔率 = 总投注池 / 该方投注额
 * 如果某方投注为 0，赔率显示为 —（表示投注该方必胜，但实际不会发生）
 */
export function calcOdds(betsP1: number, betsP2: number): { p1: string; p2: string } {
  const total = betsP1 + betsP2;
  if (total === 0) return { p1: '—', p2: '—' };
  return {
    p1: betsP1 > 0 ? (total / betsP1).toFixed(2) : '—',
    p2: betsP2 > 0 ? (total / betsP2).toFixed(2) : '—',
  };
}
