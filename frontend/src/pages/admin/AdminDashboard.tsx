import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const links = [
    { to: '/admin/announcements', label: '公告管理', icon: '📢' },
    { to: '/admin/users', label: '用户管理', icon: '👥' },
    { to: '/admin/players', label: '选手管理', icon: '👤' },
    { to: '/admin/brackets', label: '赛程管理', icon: '🏆' },
    { to: '/admin/bets', label: '竞猜管理', icon: '🎲' },
    { to: '/admin/products', label: '商品管理', icon: '🛒' },
    { to: '/admin/redemptions', label: '兑换审核', icon: '📦' },
    { to: '/admin/hall-of-fame', label: '名人堂管理', icon: '⭐' },
  ];

  return (
    <div className="admin-dashboard">
      <h1>管理后台</h1>
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
