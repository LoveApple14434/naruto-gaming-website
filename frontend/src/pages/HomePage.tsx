import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { announcementApi } from '../api/client';
import type { Announcement } from '../types';

export default function HomePage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    announcementApi.list()
      .then(setAnnouncements)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      {/* ── 公告栏 ── */}
      {!loading && announcements.length > 0 && (
        <section className="announcement-section">
          <div className="announcement-header">
            <h2>📢 公告栏</h2>
          </div>
          <div className="announcement-list">
            {announcements.map(a => (
              <details key={a.id} className="announcement-item">
                <summary className="announcement-title">
                  {a.title}
                  <span className="announcement-date">
                    {new Date(a.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </summary>
                <div className="announcement-content">{a.content}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="hero-section">
        <h1>火影忍者手游比赛平台</h1>
        <p className="hero-sub">竞猜·观赛·兑换 — 成为忍界最强</p>
        <div className="hero-actions">
          <Link to="/brackets" className="btn-primary btn-lg">查看赛事</Link>
          {!user && (
            <Link to="/login" className="btn-secondary btn-lg">注册/登录</Link>
          )}
        </div>
      </section>

      <section className="features-section">
        <div className="feature-card">
          <div className="feature-icon">🏆</div>
          <h3>赛事竞猜</h3>
          <p>参与比赛竞猜，赢取竞猜币</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🛒</div>
          <h3>商城兑换</h3>
          <p>用竞猜币兑换精美周边</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⭐</div>
          <h3>名人堂</h3>
          <p>见证历届明星选手风采</p>
        </div>
      </section>

      {user && (
        <section className="dashboard-section">
          <h2>我的面板</h2>
          <div className="dashboard-cards">
            <div className="dash-card">
              <span className="dash-label">竞猜币</span>
              <span className="dash-value coins">{user.coins}</span>
            </div>
            <div className="dash-card">
              <span className="dash-label">角色</span>
              <span className="dash-value">{user.role === 'ADMIN' ? '管理员' : '普通用户'}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
