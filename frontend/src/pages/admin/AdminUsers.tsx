import { useEffect, useState } from 'react';
import { userApi } from '../../api/client';
import { useAuth } from '../../store/AuthContext';
import type { User } from '../../types';

const ROLE_LABELS: Record<string, string> = {
  USER: '普通用户',
  MODERATOR: '协助管理员',
  ADMIN: '管理员',
};

const ROLE_BADGE: Record<string, string> = {
  USER: 'status-draft',
  MODERATOR: 'status-closed',
  ADMIN: 'status-published',
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCoinUserId, setEditCoinUserId] = useState<string | null>(null);
  const [editCoins, setEditCoins] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    userApi.list()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEditCoins = (user: User) => {
    setEditCoinUserId(user.id);
    setEditCoins(String(user.coins));
  };

  const cancelEditCoins = () => {
    setEditCoinUserId(null);
    setEditCoins('');
  };

  const saveCoins = async () => {
    if (!editCoinUserId) return;
    const newCoins = parseInt(editCoins, 10);
    if (isNaN(newCoins) || newCoins < 0) {
      alert('请输入有效的非负整数');
      return;
    }
    setSaving(true);
    try {
      await userApi.updateCoins(editCoinUserId, newCoins);
      cancelEditCoins();
      load();
    } catch {
      alert('修改失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!isAdmin) return;
    setChangingRole(userId);
    try {
      await fetch(`/naruto/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      load();
    } catch {
      alert('修改角色失败');
    } finally {
      setChangingRole(null);
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
                {isAdmin ? (
                  <select
                    className="role-select"
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    disabled={changingRole === u.id || u.id === currentUser?.id}
                  >
                    <option value="USER">普通用户</option>
                    <option value="MODERATOR">协助管理员</option>
                    <option value="ADMIN">管理员</option>
                  </select>
                ) : (
                  <span className={`status-badge ${ROLE_BADGE[u.role] ?? 'status-draft'}`}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                )}
              </td>
              <td>
                {editCoinUserId === u.id ? (
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
                    <button className="btn-sm" onClick={cancelEditCoins}>取消</button>
                  </div>
                ) : (
                  <span className="coins-value">🪙 {u.coins}</span>
                )}
              </td>
              <td>{u._count?.userBets ?? '-'}</td>
              <td>{u._count?.redemptions ?? '-'}</td>
              <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('zh-CN') : '-'}</td>
              <td className="actions">
                {editCoinUserId !== u.id && (
                  <button className="btn-sm" onClick={() => startEditCoins(u)}>修改竞猜币</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
