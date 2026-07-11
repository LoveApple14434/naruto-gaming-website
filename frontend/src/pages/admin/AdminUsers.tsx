import { useEffect, useState } from 'react';
import { userApi } from '../../api/client';
import type { User } from '../../types';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editCoins, setEditCoins] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    userApi.list()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (user: User) => {
    setEditUserId(user.id);
    setEditCoins(String(user.coins));
  };

  const cancelEdit = () => {
    setEditUserId(null);
    setEditCoins('');
  };

  const saveCoins = async () => {
    if (!editUserId) return;
    const newCoins = parseInt(editCoins, 10);
    if (isNaN(newCoins) || newCoins < 0) {
      alert('请输入有效的非负整数');
      return;
    }
    setSaving(true);
    try {
      await userApi.updateCoins(editUserId, newCoins);
      cancelEdit();
      load();
    } catch {
      alert('修改失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>用户管理</h1>
        <span className="hint">共 {users.length} 名用户</span>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>角色</th>
            <th>竞猜币</th>
            <th>投注数</th>
            <th>兑换数</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>
                <span className={`status-badge ${u.role === 'ADMIN' ? 'status-published' : 'status-draft'}`}>
                  {u.role === 'ADMIN' ? '管理员' : '用户'}
                </span>
              </td>
              <td>
                {editUserId === u.id ? (
                  <div className="inline-edit-coins">
                    <input
                      type="number"
                      min="0"
                      value={editCoins}
                      onChange={e => setEditCoins(e.target.value)}
                      className="coins-input"
                      autoFocus
                    />
                    <button className="btn-sm" onClick={saveCoins} disabled={saving}>
                      {saving ? '保存中' : '保存'}
                    </button>
                    <button className="btn-sm" onClick={cancelEdit}>取消</button>
                  </div>
                ) : (
                  <span className="coins-value">🪙 {u.coins}</span>
                )}
              </td>
              <td>{u._count?.userBets ?? '-'}</td>
              <td>{u._count?.redemptions ?? '-'}</td>
              <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('zh-CN') : '-'}</td>
              <td className="actions">
                {editUserId !== u.id && (
                  <button className="btn-sm" onClick={() => startEdit(u)}>修改竞猜币</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
