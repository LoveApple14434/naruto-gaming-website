import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const isModerator = user?.role === 'MODERATOR';

  const allLinks = [
    { to: '/admin/announcements', label: '公告管理', icon: '📢' },
    { to: '/admin/users', label: '用户管理', icon: '👥' },
    { to: '/admin/players', label: '选手管理', icon: '👤' },
    { to: '/admin/brackets', label: '赛程管理', icon: '🏆' },
    { to: '/admin/bets', label: '竞猜管理', icon: '🎲' },
    { to: '/admin/products', label: '商品管理', icon: '🛒' },
    { to: '/admin/redemptions', label: '兑换审核', icon: '📦' },
    { to: '/admin/hall-of-fame', label: '名人堂管理', icon: '⭐' },
  ];

  // 协助管理员只能看到用户管理
  const links = isModerator
    ? allLinks.filter(l => l.to === '/admin/users')
    : allLinks;

  return (
    <div className="admin-dashboard">
      <h1>管理后台</h1>
      {isModerator && (
        <p className="hint" style={{ marginBottom: 24 }}>协助管理员 — 可管理用户竞猜币</p>
      )}
      <div className="admin-grid">
        {links.map(link => (
          <Link key={link.to} to={link.to} className="admin-card">
            <span className="admin-icon">{link.icon}</span>
            <span className="admin-label">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
