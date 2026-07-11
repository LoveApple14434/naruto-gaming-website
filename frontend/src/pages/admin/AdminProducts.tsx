import { useEffect, useState } from 'react';
import { productApi } from '../../api/client';
import ImageUpload from '../../components/ImageUpload';
import type { Product } from '../../types';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: 0, stock: 0, imageUrl: '' });

  const load = () => productApi.listAll().then(setProducts).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: '', description: '', price: 0, stock: 0, imageUrl: '' });

  const handleCreate = async () => {
    await productApi.create({
      name: form.name,
      description: form.description || null,
      price: form.price,
      stock: form.stock,
      imageUrl: form.imageUrl || null,
    });
    resetForm();
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await productApi.update(editing.id, {
      name: form.name,
      description: form.description || null,
      price: form.price,
      stock: form.stock,
      imageUrl: form.imageUrl || null,
    });
    setEditing(null);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await productApi.delete(id);
    load();
  };

  const toggleActive = async (p: Product) => {
    await productApi.update(p.id, { active: !p.active });
    load();
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || '',
      price: p.price,
      stock: p.stock,
      imageUrl: p.imageUrl || '',
    });
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>商品管理</h1>
      </div>

      <div className="form-grid">
        <input placeholder="商品名称" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <input placeholder="描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <input type="number" placeholder="价格（竞猜币）" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
        <input type="number" placeholder="库存" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
        <ImageUpload value={form.imageUrl} onChange={v => setForm(f => ({ ...f, imageUrl: v }))} />
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
          <tr><th>名称</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>🪙 {p.price}</td>
              <td>{p.stock}</td>
              <td><span className={`status-badge ${p.active ? 'status-open' : 'status-closed'}`}>{p.active ? '上架' : '下架'}</span></td>
              <td className="actions">
                <button onClick={() => startEdit(p)} className="btn-sm">编辑</button>
                <button onClick={() => toggleActive(p)} className="btn-sm">{p.active ? '下架' : '上架'}</button>
                <button onClick={() => handleDelete(p.id)} className="btn-sm btn-danger">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
