import { useEffect, useState } from 'react';
import { hallOfFameApi, playerApi } from '../../api/client';
import type { HallOfFameEntry, Player } from '../../types';

export default function AdminHallOfFame() {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HallOfFameEntry | null>(null);
  const [form, setForm] = useState({ playerId: '', title: '', description: '', season: '', order: 0, imageUrl: '' });

  const load = async () => {
    const [e, p] = await Promise.all([
      hallOfFameApi.listAll(),
      playerApi.list(),
    ]);
    setEntries(e);
    setPlayers(p);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ playerId: players[0]?.id || '', title: '', description: '', season: '', order: 0, imageUrl: '' });

  const handleCreate = async () => {
    await hallOfFameApi.create({
      ...form,
      description: form.description || null,
      season: form.season || null,
      imageUrl: form.imageUrl || null,
    });
    resetForm();
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await hallOfFameApi.update(editing.id, {
      ...form,
      description: form.description || null,
      season: form.season || null,
      imageUrl: form.imageUrl || null,
    });
    setEditing(null);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await hallOfFameApi.delete(id);
    load();
  };

  const toggleActive = async (e: HallOfFameEntry) => {
    await hallOfFameApi.update(e.id, { active: !e.active });
    load();
  };

  const startEdit = (e: HallOfFameEntry) => {
    setEditing(e);
    setForm({
      playerId: e.playerId,
      title: e.title,
      description: e.description || '',
      season: e.season || '',
      order: e.order,
      imageUrl: e.imageUrl || '',
    });
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>名人堂管理</h1>
      </div>

      <div className="form-grid">
        <select value={form.playerId} onChange={e => setForm(f => ({ ...f, playerId: e.target.value }))}>
          <option value="">选择选手</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input placeholder="称号" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <input placeholder="描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <input placeholder="赛季" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} />
        <input type="number" placeholder="排序" value={form.order} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} />
        <input placeholder="图片URL" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
        <div>
          {editing ? (
            <>
              <button onClick={handleUpdate} className="btn-primary">更新</button>
              <button onClick={() => { setEditing(null); resetForm(); }} className="btn-secondary">取消</button>
            </>
          ) : (
            <button onClick={handleCreate} className="btn-primary">创建</button>
          )}
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>选手</th><th>称号</th><th>排序</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id}>
              <td>{e.player?.name}</td>
              <td>{e.title}</td>
              <td>{e.order}</td>
              <td><span className={`status-badge ${e.active ? 'status-open' : 'status-closed'}`}>{e.active ? '显示' : '隐藏'}</span></td>
              <td className="actions">
                <button onClick={() => startEdit(e)} className="btn-sm">编辑</button>
                <button onClick={() => toggleActive(e)} className="btn-sm">{e.active ? '隐藏' : '显示'}</button>
                <button onClick={() => handleDelete(e.id)} className="btn-sm btn-danger">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
