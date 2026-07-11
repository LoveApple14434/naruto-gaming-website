import { useEffect, useState } from 'react';
import { redemptionApi } from '../../api/client';
import type { Redemption } from '../../types';

export default function AdminRedemptions() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => redemptionApi.all().then(setRedemptions).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleStatus = async (id: string, status: string) => {
    await redemptionApi.updateStatus(id, status);
    load();
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-page">
      <h1>兑换审核</h1>
      <table className="admin-table">
        <thead>
          <tr><th>用户</th><th>商品</th><th>数量</th><th>花费</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {redemptions.map(r => (
            <tr key={r.id}>
              <td>{r.user?.username}</td>
              <td>{r.product?.name}</td>
              <td>{r.quantity}</td>
              <td>🪙 {r.totalCost}</td>
              <td><span className={`status-badge status-${r.status.toLowerCase()}`}>{r.status}</span></td>
              <td className="actions">
                {r.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleStatus(r.id, 'APPROVED')} className="btn-sm">通过</button>
                    <button onClick={() => handleStatus(r.id, 'REJECTED')} className="btn-sm btn-danger">拒绝</button>
                  </>
                )}
                {r.status !== 'PENDING' && <span>-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
