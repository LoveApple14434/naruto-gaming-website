import { useEffect, useState } from 'react';
import { playerApi } from '../../api/client';
import type { Player } from '../../types';

export default function AdminPlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState({ name: '', nickname: '', avatar: '' });

  const load = () => playerApi.list().then(setPlayers).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name) return;
    await playerApi.create({ name: form.name, nickname: form.nickname || null, avatar: form.avatar || null });
    setForm({ name: '', nickname: '', avatar: '' });
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await playerApi.update(editing.id, { name: form.name, nickname: form.nickname || null, avatar: form.avatar || null });
    setEditing(null);
    setForm({ name: '', nickname: '', avatar: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await playerApi.delete(id);
    load();
  };

  const startEdit = (p: Player) => {
    setEditing(p);
    setForm({ name: p.name, nickname: p.nickname || '', avatar: p.avatar || '' });
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>选手管理</h1>
      </div>

      <div className="form-inline">
        <input placeholder="选手名称" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <input placeholder="昵称（可选）" value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
        <input placeholder="头像URL（可选）" value={form.avatar} onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))} />
        {editing ? (
          <>
            <button onClick={handleUpdate} className="btn-primary">更新</button>
            <button onClick={() => { setEditing(null); setForm({ name: '', nickname: '', avatar: '' }); }} className="btn-secondary">取消</button>
          </>
        ) : (
          <button onClick={handleCreate} className="btn-primary">创建</button>
        )}
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>名称</th><th>昵称</th><th>头像</th><th>操作</th></tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.nickname || '-'}</td>
              <td>{p.avatar ? <img src={p.avatar} alt="" className="avatar-thumb" /> : '-'}</td>
              <td className="actions">
                <button onClick={() => startEdit(p)} className="btn-sm">编辑</button>
                <button onClick={() => handleDelete(p.id)} className="btn-sm btn-danger">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
