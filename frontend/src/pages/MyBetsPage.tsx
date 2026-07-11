import { useEffect, useState } from 'react';
import { betApi } from '../api/client';
import type { UserBet } from '../types';

export default function MyBetsPage() {
  const [bets, setBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    betApi.myBets().then(setBets).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="my-bets-page">
      <h1>我的竞猜</h1>
      {bets.length === 0 ? (
        <div className="empty-state">你还没有参与过竞猜</div>
      ) : (
        <div className="bets-history">
          {bets.map(ub => (
            <div key={ub.id} className="bet-history-card">
              <div className="bet-info">
                <h4>{ub.bet?.title}</h4>
                <div className="bet-pick">
                  押注：{ub.pick === 'WINNER_PLAYER_1' ? ub.bet?.node?.player1?.name : ub.bet?.node?.player2?.name || '选手'}
                </div>
                <div className="bet-amount">投注：🪙 {ub.amount}</div>
              </div>
              <div className="bet-status">
                {ub.settled ? (
                  <span className={`status-badge ${(ub.payout ?? 0) > 0 ? 'status-win' : 'status-lose'}`}>
                    {ub.payout ? `赢得 ${ub.payout}` : '未中奖'}
                  </span>
                ) : (
                  <span className="status-badge status-open">未结算</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
