import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="logo">🦊 火影忍者</Link>
          <nav className="nav-links">
            <Link to="/brackets">赛事</Link>
            <Link to="/shop">商城</Link>
            <Link to="/hall-of-fame">名人堂</Link>
            {user && (
              <>
                <Link to="/my-bets">我的竞猜</Link>
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="admin-link">管理后台</Link>
                )}
              </>
            )}
          </nav>
          <div className="user-area">
            {user ? (
              <>
                <span className="coins">🪙 {user.coins}</span>
                <span className="username">{user.username}</span>
                <button onClick={handleLogout} className="btn-text">退出</button>
              </>
            ) : (
              <Link to="/login" className="btn-primary">登录</Link>
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>&copy; 2026 火影忍者手游比赛平台</p>
      </footer>
    </div>
  );
}
