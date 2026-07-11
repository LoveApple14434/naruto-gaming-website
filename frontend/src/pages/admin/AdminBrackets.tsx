import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bracketApi } from '../../api/client';
import type { Bracket } from '../../types';

export default function AdminBrackets() {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => bracketApi.list().then(setBrackets).catch(console.error).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const title = prompt('请输入赛程名称：');
    if (!title) return;
    const b = await bracketApi.create(title);
    navigate(`/admin/brackets/${b.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await bracketApi.delete(id);
    load();
  };

  const handlePublish = async (id: string) => {
    await bracketApi.publish(id);
    load();
  };

  const handleFinish = async (id: string) => {
    await bracketApi.finish(id);
    load();
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>赛程管理</h1>
        <button onClick={handleCreate} className="btn-primary">创建赛程</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>状态</th>
            <th>比赛数</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {brackets.map(b => (
            <tr key={b.id}>
              <td>{b.title}</td>
              <td><span className={`status-badge status-${b.status.toLowerCase()}`}>{b.status}</span></td>
              <td>{b._count?.nodes ?? 0}</td>
              <td>{new Date(b.createdAt).toLocaleDateString()}</td>
              <td className="actions">
                <Link to={`/admin/brackets/${b.id}/edit`} className="btn-sm">编辑</Link>
                {b.status === 'DRAFT' && (
                  <button onClick={() => handlePublish(b.id)} className="btn-sm">发布</button>
                )}
                {b.status === 'PUBLISHED' && (
                  <button onClick={() => handleFinish(b.id)} className="btn-sm">结束</button>
                )}
                <button onClick={() => handleDelete(b.id)} className="btn-sm btn-danger">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
