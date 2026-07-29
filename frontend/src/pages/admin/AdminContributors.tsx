import { useEffect, useState } from 'react';
import { contributorApi } from '../../api/client';
import ImageUpload from '../../components/ImageUpload';
import type { Contributor } from '../../types';

export default function AdminContributors() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Contributor | null>(null);
  const [form, setForm] = useState({ name: '', amount: '', message: '', avatar: '', order: 0 });

  const load = async () => {
    const data = await contributorApi.listAll();
    setContributors(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: '', amount: '', message: '', avatar: '', order: 0 });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await contributorApi.create({
      name: form.name,
      amount: form.amount || null,
      message: form.message || null,
      avatar: form.avatar || null,
      order: form.order,
    });
    resetForm();
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await contributorApi.update(editing.id, {
      name: form.name,
      amount: form.amount || null,
      message: form.message || null,
      avatar: form.avatar || null,
      order: form.order,
    });
    setEditing(null);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await contributorApi.delete(id);
    load();
  };

  const toggleActive = async (c: Contributor) => {
    await contributorApi.update(c.id, { active: !c.active });
    load();
  };

  const startEdit = (c: Contributor) => {
    setEditing(c);
    setForm({
      name: c.name,
      amount: c.amount || '',
      message: c.message || '',
      avatar: c.avatar || '',
      order: c.order,
    });
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>贡献者管理</h1>
      </div>

      <div className="form-grid">
        <input placeholder="姓名" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <input placeholder="资助金额（如 ¥100）" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        <input placeholder="个人寄语" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
        <input type="number" placeholder="排序" value={form.order} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} />
        <ImageUpload value={form.avatar} onChange={v => setForm(f => ({ ...f, avatar: v }))} />
        <div>
          {editing ? (
            <>
              <button onClick={handleUpdate} className="btn-primary">更新</button>
              <button onClick={() => { setEditing(null); resetForm(); }} className="btn-secondary">取消</button>
            </>
          ) : (
            <button onClick={handleCreate} className="btn-primary" disabled={!form.name.trim()}>创建</button>
          )}
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>姓名</th><th>金额</th><th>寄语</th><th>排序</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {contributors.map(c => (
            <tr key={c.id}>
              <td>{c.avatar && <img src={c.avatar} alt="" className="inline-avatar" />} {c.name}</td>
              <td>{c.amount || '—'}</td>
              <td className="text-muted">{c.message || '—'}</td>
              <td>{c.order}</td>
              <td><span className={`status-badge ${c.active ? 'status-open' : 'status-closed'}`}>{c.active ? '显示' : '隐藏'}</span></td>
              <td className="actions">
                <button onClick={() => startEdit(c)} className="btn-sm">编辑</button>
                <button onClick={() => toggleActive(c)} className="btn-sm">{c.active ? '隐藏' : '显示'}</button>
                <button onClick={() => handleDelete(c.id)} className="btn-sm btn-danger">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
