import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { checkinApi } from '../api/client';
import CheckInModal from './CheckInModal';
import logoIcon from '../assets/naruto-icon.jpeg';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showCheckin, setShowCheckin] = useState(false);

  // 用户登录后检查是否需要签到
  useEffect(() => {
    if (!user) {
      setShowCheckin(false);
      return;
    }
    // 延迟一点检查，避免页面闪烁
    const timer = setTimeout(() => {
      checkinApi.getTodayStatus()
        .then(data => {
          if (data.event && !data.checkedInToday) {
            setShowCheckin(true);
          }
        })
        .catch(() => { /* ignore */ });
    }, 500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="logo">
            <img src={logoIcon} alt="" className="logo-icon" />
            火影忍者
          </Link>
          <nav className="nav-links">
            <Link to="/brackets">赛事</Link>
            <Link to="/bets">竞猜</Link>
            <Link to="/shop">商城</Link>
            <Link to="/hall-of-fame">名人堂</Link>
            {user && (
              <>
                <Link to="/my-bets">我的竞猜</Link>
                {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                  <Link to="/admin" className="admin-link">管理后台</Link>
                )}
              </>
            )}
          </nav>
          <div className="user-area">
            {user ? (
              <>
                <span className="coins">🪙 {user.coins}</span>
                <Link to="/profile" className="username" title="个人管理">{user.nickname || user.username}</Link>
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

      {showCheckin && <CheckInModal onClose={() => setShowCheckin(false)} />}
    </div>
  );
}
