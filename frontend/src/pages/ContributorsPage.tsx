import { useEffect, useState } from 'react';
import { contributorApi } from '../api/client';
import type { Contributor } from '../types';

export default function ContributorsPage() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contributorApi.list().then(setContributors).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="contributors-page">
      <h1>网页建设贡献者</h1>
      <p className="page-subtitle">感谢以下伙伴为平台建设提供资金支持 ❤️</p>

      <div className="contributors-grid">
        {contributors.map(c => (
          <div key={c.id} className="contributor-card">
            <div className="contributor-rank">#{c.order}</div>
            {c.avatar ? (
              <img src={c.avatar} alt={c.name} className="contributor-avatar" />
            ) : (
              <div className="contributor-avatar-placeholder">{c.name[0]}</div>
            )}
            <h3>{c.name}</h3>
            {c.amount && <div className="contributor-amount">{c.amount}</div>}
            {c.message && <p className="contributor-message">"{c.message}"</p>}
          </div>
        ))}
        {contributors.length === 0 && <div className="empty-state">暂无贡献者记录</div>}
      </div>
    </div>
  );
}
