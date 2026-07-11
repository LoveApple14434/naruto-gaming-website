import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bracketApi, betApi } from '../api/client';
import { useAuth } from '../store/AuthContext';
import { calcOdds } from '../utils/betUtils';
import type { Bracket, Bet, UserBet } from '../types';

export default function BetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracketId, setSelectedBracketId] = useState('');
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<string | null>(null);
  const [betPick, setBetPick] = useState<'WINNER_PLAYER_1' | 'WINNER_PLAYER_2'>('WINNER_PLAYER_1');
  const [betAmount, setBetAmount] = useState(100);
  const [betMsg, setBetMsg] = useState('');
  const [myBetsMap, setMyBetsMap] = useState<Map<string, UserBet>>(new Map());

  // 加载所有已发布的赛程
  useEffect(() => {
    bracketApi.list('?status=PUBLISHED')
      .then(b => {
        setBrackets(b);
        if (b.length > 0) setSelectedBracketId(b[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 加载用户自己的投注记录
  useEffect(() => {
    if (!user) { setMyBetsMap(new Map()); return; }
    betApi.myBets().then(ubs => {
      const m = new Map<string, UserBet>();
      ubs.forEach(ub => m.set(ub.betId, ub));
      setMyBetsMap(m);
    }).catch(console.error);
  }, [user]);

  // 选择赛程后加载竞猜
  useEffect(() => {
    if (!selectedBracketId) return;
    betApi.listByBracket(selectedBracketId)
      .then(setBets)
      .catch(console.error);
  }, [selectedBracketId]);

  if (loading) return <div className="loading">加载中...</div>;

  const selectedBracket = brackets.find(b => b.id === selectedBracketId);

  return (
    <div className="bets-page">
      <h1>赛事竞猜</h1>
      <p className="page-subtitle">选择赛事，押注你支持的选手</p>

      {brackets.length === 0 ? (
        <div className="empty-state">暂无可竞猜的赛事</div>
      ) : (
        <>
          <div className="form-inline">
            <select value={selectedBracketId} onChange={e => setSelectedBracketId(e.target.value)}>
              {brackets.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <Link to={`/brackets/${selectedBracketId}`} className="btn-sm">查看赛程</Link>
          </div>

          {betMsg && <div className="toast">{betMsg}</div>}

          {bets.length === 0 ? (
            <div className="empty-state">该赛事暂无竞猜</div>
          ) : (
            <div className="bets-grid">
              {bets.filter(b => b.status !== 'SETTLED').map(bet => (
                <div key={bet.id} className="bet-card">
                  <div className="bet-card-header">
                    <h4>{bet.title}</h4>
                    <span className={`status-badge status-${bet.status.toLowerCase()}`}>
                      {bet.status === 'OPEN' ? '进行中' : '已关闭'}
                    </span>
                  </div>

                  <div className="bet-match-info">
                    <span className="bet-vs">{bet.node?.player1?.name || '?'} vs {bet.node?.player2?.name || '?'}</span>
                  </div>

                  <div className="bet-odds-row">
                    {(() => { const o = calcOdds(bet.totalBetsP1, bet.totalBetsP2); return (<>
                    <div className="odds-box">
                      <span className="odds-label">{bet.node?.player1?.name || '选手1'}</span>
                      <span className="odds-value">{o.p1}{o.p1 !== '—' ? 'x' : ''}</span>
                    </div>
                    <span className="odds-divider">VS</span>
                    <div className="odds-box">
                      <span className="odds-label">{bet.node?.player2?.name || '选手2'}</span>
                      <span className="odds-value">{o.p2}{o.p2 !== '—' ? 'x' : ''}</span>
                    </div>
                    </>); })()}
                  </div>

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
                    if (!user) return <button className="btn-primary btn-block" onClick={() => navigate('/login')}>登录后参与竞猜</button>;
                    if (bet.status === 'CLOSED') return <div className="bet-closed-hint">已关闭，等待结算</div>;
                    if (placing === bet.id) return (
                    <div className="bet-place-form">
                      <div className="bet-pick-buttons">
                        <label className={`pick-btn ${betPick === 'WINNER_PLAYER_1' ? 'active' : ''}`}>
                          <input type="radio" name="pick" value="WINNER_PLAYER_1"
                            checked={betPick === 'WINNER_PLAYER_1'}
                            onChange={() => setBetPick('WINNER_PLAYER_1')} />
                          {bet.node?.player1?.name || '选手1'}
                        </label>
                        <label className={`pick-btn ${betPick === 'WINNER_PLAYER_2' ? 'active' : ''}`}>
                          <input type="radio" name="pick" value="WINNER_PLAYER_2"
                            checked={betPick === 'WINNER_PLAYER_2'}
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
                            const data = await betApi.listByBracket(selectedBracketId);
                            setBets(data);
                          } catch (e: any) { setBetMsg(e.message); }
                        }}>确认投注</button>
                        <button className="btn-sm" onClick={() => setPlacing(null)}>取消</button>
                      </div>
                    </div>
                  );
                    return (
                    <button className="btn-primary btn-block" onClick={() => { setPlacing(bet.id); setBetMsg(''); }}>
                      参与竞猜
                    </button>
                    );
                  })()}

                  <div className="bet-total-row">
                    总投注: 🪙 {bet.totalBetsP1 + bet.totalBetsP2}
                  </div>
                </div>
              ))}

              {bets.filter(b => b.status === 'SETTLED').length > 0 && (
                <details className="settled-bets">
                  <summary>已结算竞猜 ({bets.filter(b => b.status === 'SETTLED').length})</summary>
                  {bets.filter(b => b.status === 'SETTLED').map(bet => (
                    <div key={bet.id} className="bet-card settled">
                      <div className="bet-card-header">
                        <h4>{bet.title}</h4>
                        <span className="status-badge status-settled">已结算</span>
                      </div>
                      <div className="bet-odds-row">
                        {(() => { const o = calcOdds(bet.totalBetsP1, bet.totalBetsP2); return (<>
                        <div className="odds-box">
                          <span className="odds-label">{bet.node?.player1?.name || '选手1'}</span>
                          <span className="odds-value">{o.p1}{o.p1 !== '—' ? 'x' : ''}</span>
                        </div>
                        <span className="odds-divider">VS</span>
                        <div className="odds-box">
                          <span className="odds-label">{bet.node?.player2?.name || '选手2'}</span>
                          <span className="odds-value">{o.p2}{o.p2 !== '—' ? 'x' : ''}</span>
                        </div>
                        </>); })()}
                      </div>
                      {bet.result && (
                        <div className="bet-result-display">
                          结果: {bet.result === 'WINNER_PLAYER_1' ? bet.node?.player1?.name : bet.result === 'WINNER_PLAYER_2' ? bet.node?.player2?.name : '平局'} 胜
                        </div>
                      )}
                    </div>
                  ))}
                </details>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
