import { useEffect, useState } from 'react';
import { bracketApi, betApi } from '../../api/client';
import { calcOdds } from '../../utils/betUtils';
import type { Bracket, Bet } from '../../types';

export default function AdminBets() {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = useState('');
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ nodeId: '', title: '', oddsPlayer1: 1, oddsPlayer2: 1 });

  useEffect(() => {
    bracketApi.list().then(b => {
      setBrackets(b);
      if (b.length > 0) setSelectedBracket(b[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadBracketData = (bracketId: string) => {
    if (!bracketId) return;
    Promise.all([
      bracketApi.get(bracketId),
      betApi.listByBracket(bracketId),
    ]).then(([b, betsData]) => {
      setBracket(b);
      setBets(betsData);
    }).catch(console.error);
  };

  useEffect(() => { if (selectedBracket) loadBracketData(selectedBracket); }, [selectedBracket]);

  const handleCreate = async () => {
    if (!selectedBracket) return;
    try {
      await betApi.create(selectedBracket, form);
      setForm({ nodeId: '', title: '', oddsPlayer1: 1, oddsPlayer2: 1 });
      loadBracketData(selectedBracket);
    } catch (e: any) { alert(e.message); }
  };

  const handleClose = async (id: string) => {
    try {
      await betApi.close(id);
      loadBracketData(selectedBracket);
    } catch (e: any) { alert(e.message); }
  };

  const handleSettle = async (id: string) => {
    const result = prompt('输入结果：WINNER_PLAYER_1, WINNER_PLAYER_2, DRAW');
    if (!result || !['WINNER_PLAYER_1', 'WINNER_PLAYER_2', 'DRAW'].includes(result)) return;
    try {
      await betApi.settle(id, { result });
      loadBracketData(selectedBracket);
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-page">
      <h1>竞猜管理</h1>

      <div className="form-inline">
        <label className="form-label">选择赛程：</label>
        <select value={selectedBracket} onChange={e => setSelectedBracket(e.target.value)}>
          {brackets.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
      </div>

      {selectedBracket && (
        <>
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label className="form-label">关联比赛：</label>
            <select value={form.nodeId} onChange={e => setForm(f => ({ ...f, nodeId: e.target.value }))}>
              <option value="">选择比赛</option>
              {bracket?.nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label || `比赛`} ({n.player1?.name || '?'} vs {n.player2?.name || '?'})
                </option>
              ))}
            </select>
            <input placeholder="标题" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <span className="hint">赔率将根据投注量自动计算</span>
            <button onClick={handleCreate} className="btn-primary">创建竞猜</button>
          </div>

          <table className="admin-table">
            <thead>
              <tr><th>标题</th><th>状态</th><th>投注额 P1/P2</th><th>动态赔率</th><th>操作</th></tr>
            </thead>
            <tbody>
              {bets.map(b => (
                <tr key={b.id}>
                  <td>{b.title}</td>
                  <td><span className={`status-badge status-${b.status.toLowerCase()}`}>{b.status}</span></td>
                  <td>{b.totalBetsP1} / {b.totalBetsP2}</td>
                  <td>{(() => { const o = calcOdds(b.totalBetsP1, b.totalBetsP2); return `${o.p1} / ${o.p2}`; })()}</td>
                  <td className="actions">
                    {b.status === 'OPEN' && (
                      <button onClick={() => handleClose(b.id)} className="btn-sm">关闭</button>
                    )}
                    {b.status === 'CLOSED' && (
                      <button onClick={() => handleSettle(b.id)} className="btn-sm">结算</button>
                    )}
                    {b.status === 'SETTLED' && <span>已结算</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
