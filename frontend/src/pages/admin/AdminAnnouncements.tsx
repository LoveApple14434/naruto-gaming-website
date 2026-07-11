import { useState, useEffect } from 'react';
import { announcementApi } from '../../api/client';
import type { Announcement } from '../../types';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', published: false });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    announcementApi.listAll()
      .then(setAnnouncements)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ title: '', content: '', published: false });
    setShowForm(true);
  };

  const openEdit = (a: Announcement) => {
    setEditId(a.id);
    setForm({ title: a.title, content: a.content, published: a.published });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await announcementApi.update(editId, form);
      } else {
        await announcementApi.create(form);
      }
      setShowForm(false);
      load();
    } catch (e) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此公告？')) return;
    try {
      await announcementApi.delete(id);
      load();
    } catch {
      alert('删除失败');
    }
  };

  const togglePublish = async (a: Announcement) => {
    try {
      await announcementApi.update(a.id, { published: !a.published });
      load();
    } catch {
      alert('操作失败');
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-announcements">
      <div className="page-header">
        <h1>公告管理</h1>
        <button className="btn-primary" onClick={openCreate}>发布公告</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editId ? '编辑公告' : '发布公告'}</h2>
            <div className="form-group">
              <label>标题</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="公告标题"
                maxLength={200}
              />
            </div>
            <div className="form-group">
              <label>内容</label>
              <textarea
                rows={6}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="公告内容（支持换行）"
              />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
                />
                立即发布
              </label>
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>取消</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.content.trim()}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <p className="empty-state">暂无公告</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map(a => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>
                  <span className={`status-badge ${a.published ? 'status-published' : 'status-draft'}`}>
                    {a.published ? '已发布' : '草稿'}
                  </span>
                </td>
                <td>{new Date(a.createdAt).toLocaleString('zh-CN')}</td>
                <td className="action-cell">
                  <button className="btn-sm" onClick={() => togglePublish(a)}>
                    {a.published ? '下架' : '发布'}
                  </button>
                  <button className="btn-sm" onClick={() => openEdit(a)}>编辑</button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(a.id)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
