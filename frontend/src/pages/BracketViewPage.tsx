import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bracketApi, betApi } from '../api/client';
import { useAuth } from '../store/AuthContext';
import type { Bracket, Bet } from '../types';

export default function BracketViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="loading">加载中...</div>;
  if (!bracket) return <div className="empty-state">赛程不存在</div>;

  const getPlayerName = (nodeId: string | null, playerNum: 1 | 2) => {
    if (!nodeId) return '—';
    const node = bracket.nodes.find(n => n.id === nodeId);
    if (!node) return '—';
    const player = playerNum === 1 ? node.player1 : node.player2;
    return player?.name ?? '—';
  };

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

      <div className="bracket-canvas-view">
        {/* 简单展示：比赛节点列表 */}
        <section className="view-section">
          <h2>比赛对阵</h2>
          <div className="matches-list">
            {bracket.nodes.map(node => (
              <div key={node.id} className="match-card">
                <div className="match-label">{node.label || `比赛`}</div>
                <div className="match-players">
                  <div className={`player-slot ${node.winnerId === node.player1Id ? 'winner' : ''}`}>
                    {node.player1?.name || '待定'}
                  </div>
                  <div className="vs">VS</div>
                  <div className={`player-slot ${node.winnerId === node.player2Id ? 'winner' : ''}`}>
                    {node.player2?.name || '待定'}
                  </div>
                </div>
                {node.winnerId && (
                  <div className="match-result">
                    胜者：{node.winnerId === node.player1Id ? node.player1?.name : node.player2?.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 结果槽 */}
        {bracket.resultSlots.length > 0 && (
          <section className="view-section">
            <h2>结果</h2>
            <div className="result-slots-view">
              {bracket.resultSlots.map(slot => (
                <div key={slot.id} className="result-slot-card">
                  <h4>{slot.name}</h4>
                  <div>胜者：{slot.winner?.name || '待定'}</div>
                  <div>败者：{slot.loser?.name || '待定'}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 竞猜列表 */}
        {bets.length > 0 && (
          <section className="view-section">
            <h2>竞猜</h2>
            <div className="bets-view">
              {bets.map(bet => (
                <div key={bet.id} className="bet-card">
                  <h4>{bet.title}</h4>
                  <div className="bet-odds">
                    <span>{bet.node?.player1?.name || '选手1'}: {bet.oddsPlayer1}x</span>
                    <span>{bet.node?.player2?.name || '选手2'}: {bet.oddsPlayer2}x</span>
                  </div>
                  <span className={`status-badge status-${bet.status.toLowerCase()}`}>
                    {bet.status === 'OPEN' ? '进行中' : bet.status === 'CLOSED' ? '已关闭' : '已结算'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
