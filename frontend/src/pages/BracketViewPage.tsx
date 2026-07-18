import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bracketApi, betApi } from '../api/client';
import { useAuth } from '../store/AuthContext';
import { calcOdds } from '../utils/betUtils';
import BracketFlowView from '../components/bracket/BracketFlowView';
import type { Bracket, Bet, UserBet } from '../types';

export default function BracketViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<string | null>(null);
  const [betPick, setBetPick] = useState<'WINNER_PLAYER_1' | 'WINNER_PLAYER_2'>('WINNER_PLAYER_1');
  const [betAmount, setBetAmount] = useState(100);
  const [betMsg, setBetMsg] = useState('');
  const [myBetsMap, setMyBetsMap] = useState<Map<string, UserBet>>(new Map());

  useEffect(() => {
    if (!id) return;
    Promise.all([
      bracketApi.get(id),
      betApi.listByBracket(id),
    ])
      .then(([b, betsData]) => {
        setBracket(b);
        setBets(betsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // 加载用户自己的投注记录
  useEffect(() => {
    if (!user) { setMyBetsMap(new Map()); return; }
    betApi.myBets().then(ubs => {
      const m = new Map<string, UserBet>();
      ubs.forEach(ub => m.set(ub.betId, ub));
      setMyBetsMap(m);
    }).catch(console.error);
  }, [user]);

  if (loading) return <div className="loading">加载中...</div>;
  if (!bracket) return <div className="empty-state">赛程不存在</div>;

  return (
    <div className="bracket-view-page">
      <div className="page-header">
        <h1>{bracket.title}</h1>
        <span className={`status-badge status-${bracket.status.toLowerCase()}`}>
          {bracket.status === 'DRAFT' ? '草稿' : bracket.status === 'PUBLISHED' ? '已发布' : '已结束'}
        </span>
        {user?.role === 'ADMIN' && (
          <Link to={`/admin/brackets/${bracket.id}/edit`} className="btn-secondary">
            编辑赛程
          </Link>
        )}
      </div>

      {/* React Flow 驱动的赛程看板 */}
      <BracketFlowView bracket={bracket} />

      {/* 竞猜列表 */}
      {bets.length > 0 && (
        <section className="view-section" style={{ marginTop: 32 }}>
          <h2>竞猜</h2>
          {betMsg && <div className="toast">{betMsg}</div>}
          <div className="bets-view">
            {bets.map(bet => (
              <div key={bet.id} className="bet-card">
                <h4>{bet.title}</h4>
                <div className="bet-odds">
                  {(() => { const o = calcOdds(bet.totalBetsP1, bet.totalBetsP2); return (<>
                  <span>{bet.node?.player1?.name || '选手1'}: {o.p1}{o.p1 !== '—' ? 'x' : ''}</span>
                  <span>{bet.node?.player2?.name || '选手2'}: {o.p2}{o.p2 !== '—' ? 'x' : ''}</span>
                  </>); })()}
                </div>
                <div className="bet-meta">
                  <span className={`status-badge status-${bet.status.toLowerCase()}`}>
                    {bet.status === 'OPEN' ? '进行中' : bet.status === 'CLOSED' ? '已关闭' : '已结算'}
                  </span>
                  <span className="bet-total">总投注: 🪙 {bet.totalBetsP1 + bet.totalBetsP2}</span>
                </div>

                {/* 我的投注信息 / 投注交互 */}
                {(() => {
                  const myBet = myBetsMap.get(bet.id);
                  if (myBet) {
                    return (
                      <div className="my-bet-info">
                        已投注 🪙{myBet.amount} 于{' '}
                        <strong>{myBet.pick === 'WINNER_PLAYER_1' ? (bet.node?.player1?.name || '选手1') : (bet.node?.player2?.name || '选手2')}</strong>
                        {myBet.settled && (
                          <span className={`status-badge ${(myBet.payout ?? 0) > 0 ? 'status-win' : 'status-lose'}`}>
                            {myBet.payout ? `赢得 ${myBet.payout}` : '未中奖'}
                          </span>
                        )}
                        {!myBet.settled && <span className="status-badge status-open">待结算</span>}
                      </div>
                    );
                  }
                  if (!user || bet.status !== 'OPEN') return null;
                  if (placing === bet.id) return (
                    <div className="bet-place-form">
                      <div className="bet-pick-buttons">
                        <label className={`pick-btn ${betPick === 'WINNER_PLAYER_1' ? 'active' : ''}`}>
                          <input type="radio" name="pick" value="WINNER_PLAYER_1" checked={betPick === 'WINNER_PLAYER_1'}
                            onChange={() => setBetPick('WINNER_PLAYER_1')} />
                          {bet.node?.player1?.name || '选手1'}
                        </label>
                        <label className={`pick-btn ${betPick === 'WINNER_PLAYER_2' ? 'active' : ''}`}>
                          <input type="radio" name="pick" value="WINNER_PLAYER_2" checked={betPick === 'WINNER_PLAYER_2'}
                            onChange={() => setBetPick('WINNER_PLAYER_2')} />
                          {bet.node?.player2?.name || '选手2'}
                        </label>
                      </div>
                      <div className="bet-amount-row">
                        <span>投注 🪙</span>
                        <input type="number" min={1} max={user.coins} value={betAmount}
                          onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))} />
                        <span className="bet-coins-hint">可用: {user.coins}</span>
                      </div>
                      <div className="bet-actions-row">
                        <button className="btn-primary btn-sm" onClick={async () => {
                          try {
                            await betApi.place(bet.id, { pick: betPick, amount: betAmount });
                            setBetMsg('投注成功！');
                            setPlacing(null);
                            const betsData = await betApi.listByBracket(id!);
                            setBets(betsData);
                          } catch (e: any) { setBetMsg(e.message); }
                        }}>确认投注</button>
                        <button className="btn-sm" onClick={() => setPlacing(null)}>取消</button>
                      </div>
                    </div>
                  );
                  return (
                    <div className="bet-actions">
                      <button className="btn-primary btn-sm" onClick={() => { setPlacing(bet.id); setBetMsg(''); }}>参与竞猜</button>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
