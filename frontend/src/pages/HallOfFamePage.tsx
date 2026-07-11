import { useEffect, useState } from 'react';
import { hallOfFameApi } from '../api/client';
import type { HallOfFameEntry } from '../types';

export default function HallOfFamePage() {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hallOfFameApi.list().then(setEntries).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="hall-of-fame-page">
      <h1>名人堂</h1>
      <p className="page-subtitle">历届明星选手 — 荣耀永存</p>

      <div className="hof-grid">
        {entries.map(entry => (
          <div key={entry.id} className="hof-card">
            <div className="hof-rank">#{entry.order}</div>
            {entry.imageUrl ? (
              <img src={entry.imageUrl} alt={entry.player?.name} className="hof-avatar" />
            ) : (
              <div className="hof-avatar-placeholder">{entry.player?.name?.[0] ?? '?'}</div>
            )}
            <h3>{entry.player?.name}</h3>
            <div className="hof-title">{entry.title}</div>
            {entry.description && <p className="hof-desc">{entry.description}</p>}
            {entry.season && <div className="hof-season">赛季：{entry.season}</div>}
          </div>
        ))}
        {entries.length === 0 && <div className="empty-state">暂无记录</div>}
      </div>
    </div>
  );
}
