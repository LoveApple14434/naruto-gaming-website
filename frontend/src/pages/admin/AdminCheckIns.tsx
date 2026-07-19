import { useState, useEffect } from 'react';
import { checkinApi } from '../../api/client';
import type { CheckInEvent } from '../../types';

export default function AdminCheckIns() {
  const [events, setEvents] = useState<CheckInEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    title: string;
    startDate: string;
    endDate: string;
    days: { dayNumber: number; coins: number }[];
  }>({
    title: '',
    startDate: '',
    endDate: '',
    days: [{ dayNumber: 1, coins: 100 }],
  });
  const [saving, setSaving] = useState(false);
  const [expandedStats, setExpandedStats] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<Record<string, CheckInEvent>>({});

  const load = () => {
    setLoading(true);
    checkinApi.listAll()
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditId(null);
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    setForm({
      title: '',
      startDate: today.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      days: [{ dayNumber: 1, coins: 100 }],
    });
    setShowForm(true);
  };

  const openEdit = (e: CheckInEvent) => {
    setEditId(e.id);
    setForm({
      title: e.title,
      startDate: e.startDate.slice(0, 10),
      endDate: e.endDate.slice(0, 10),
      days: e.days.map(d => ({ dayNumber: d.dayNumber, coins: d.coins })),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      if (editId) {
        await checkinApi.update(editId, form);
      } else {
        await checkinApi.create(form);
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
    if (!confirm('确定删除此签到活动？相关的签到记录也会被删除。')) return;
    try {
      await checkinApi.delete(id);
      load();
    } catch {
      alert('删除失败');
    }
  };

  const toggleActive = async (e: CheckInEvent) => {
    try {
      await checkinApi.update(e.id, { active: !e.active });
      load();
    } catch {
      alert('操作失败');
    }
  };

  const toggleStats = async (id: string) => {
    if (expandedStats === id) {
      setExpandedStats(null);
      return;
    }
    try {
      const data = await checkinApi.getStats(id);
      setStatsData(prev => ({ ...prev, [id]: data }));
      setExpandedStats(id);
    } catch {
      alert('获取统计数据失败');
    }
  };

  const addDay = () => {
    const nextNum = form.days.length + 1;
    setForm(f => ({
      ...f,
      days: [...f.days, { dayNumber: nextNum, coins: 100 }],
    }));
  };

  const removeDay = (idx: number) => {
    if (form.days.length <= 1) return;
    const newDays = form.days
      .filter((_, i) => i !== idx)
      .map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setForm(f => ({ ...f, days: newDays }));
  };

  const updateDay = (idx: number, coins: number) => {
    setForm(f => {
      const days = [...f.days];
      days[idx] = { ...days[idx], coins };
      return { ...f, days };
    });
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="admin-checkins">
      <div className="page-header">
        <h1>签到管理</h1>
        <button className="btn-primary" onClick={openCreate}>发布签到活动</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
            <h2>{editId ? '编辑签到活动' : '发布签到活动'}</h2>

            <div className="form-group">
              <label>活动标题</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="例：2026暑期签到活动"
                maxLength={200}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>开始日期</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>结束日期</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>每日奖励配置</label>
              <div className="checkin-days-list">
                {form.days.map((day, idx) => (
                  <div key={idx} className="checkin-day-row">
                    <span className="checkin-day-label">第 {day.dayNumber} 天</span>
                    <div className="checkin-day-input-group">
                      <span>🪙</span>
                      <input
                        type="number"
                        min={0}
                        value={day.coins}
                        onChange={e => updateDay(idx, Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                    <button
                      className="btn-xs"
                      onClick={() => removeDay(idx)}
                      disabled={form.days.length <= 1}
                      title="删除此天"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-sm" onClick={addDay} style={{ marginTop: 8 }}>
                + 添加一天
              </button>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>取消</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.startDate || !form.endDate}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="empty-state">暂无签到活动</p>
      ) : (
        <div className="checkin-event-list">
          {events.map(e => (
            <div key={e.id} className="checkin-event-card">
              <div className="checkin-event-header">
                <div>
                  <h3>{e.title}</h3>
                  <div className="checkin-event-meta">
                    <span className={`status-badge ${e.active ? 'status-published' : 'status-draft'}`}>
                      {e.active ? '进行中' : '已结束'}
                    </span>
                    <span>{new Date(e.startDate).toLocaleDateString('zh-CN')} ~ {new Date(e.endDate).toLocaleDateString('zh-CN')}</span>
                    <span>共 {e.days.length} 天</span>
                    {e._count && <span>签到记录: {e._count.records}</span>}
                  </div>
                </div>
                <div className="checkin-event-actions">
                  <button className="btn-sm" onClick={() => toggleStats(e.id)}>
                    {expandedStats === e.id ? '收起统计' : '统计'}
                  </button>
                  <button className="btn-sm" onClick={() => toggleActive(e)}>
                    {e.active ? '结束' : '激活'}
                  </button>
                  <button className="btn-sm" onClick={() => openEdit(e)}>编辑</button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(e.id)}>删除</button>
                </div>
              </div>

              {/* 每日奖励预览 */}
              <div className="checkin-days-preview">
                {e.days.map(d => (
                  <span key={d.id} className="checkin-day-chip">
                    第{d.dayNumber}天: 🪙{d.coins}
                  </span>
                ))}
              </div>

              {/* 统计数据 */}
              {expandedStats === e.id && statsData[e.id] && (
                <div className="checkin-stats">
                  <p>总参与人数: {statsData[e.id].totalParticipants}</p>
                  <table className="admin-table" style={{ marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th>天数</th>
                        <th>奖励</th>
                        <th>签到人数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData[e.id].dayStats?.map(s => (
                        <tr key={s.dayNumber}>
                          <td>第 {s.dayNumber} 天</td>
                          <td>🪙 {s.coins}</td>
                          <td>{s.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {statsData[e.id].records && statsData[e.id].records!.length > 0 && (
                    <details style={{ marginTop: 12 }}>
                      <summary>查看签到明细</summary>
                      <table className="admin-table" style={{ marginTop: 8 }}>
                        <thead>
                          <tr>
                            <th>用户</th>
                            <th>天数</th>
                            <th>获得竞猜币</th>
                            <th>时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsData[e.id].records!.map(r => (
                            <tr key={r.id}>
                              <td>{(r as any).user?.username || r.userId}</td>
                              <td>第 {r.dayNumber} 天</td>
                              <td>🪙 {r.coinsAwarded}</td>
                              <td>{new Date(r.createdAt).toLocaleString('zh-CN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
