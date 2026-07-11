import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bracketApi } from '../api/client';
import type { Bracket } from '../types';

export default function BracketListPage() {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bracketApi.list().then(setBrackets).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="bracket-list-page">
      <h1>赛事列表</h1>
      {brackets.length === 0 ? (
        <div className="empty-state">暂无赛事</div>
      ) : (
        <div className="bracket-grid">
          {brackets.map(b => (
            <Link to={`/brackets/${b.id}`} key={b.id} className="bracket-card">
              <h3>{b.title}</h3>
              <div className="bracket-meta">
                <span className={`status-badge status-${b.status.toLowerCase()}`}>
                  {b.status === 'DRAFT' ? '草稿' : b.status === 'PUBLISHED' ? '已发布' : '已结束'}
                </span>
                <span>{b._count?.nodes ?? 0} 场比赛</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
