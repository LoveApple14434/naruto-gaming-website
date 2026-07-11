import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import BracketListPage from './pages/BracketListPage'
import BracketViewPage from './pages/BracketViewPage'
import BetsPage from './pages/BetsPage'
import BracketEditorPage from './pages/admin/BracketEditorPage'
import ShopPage from './pages/ShopPage'
import HallOfFamePage from './pages/HallOfFamePage'
import MyBetsPage from './pages/MyBetsPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminBrackets from './pages/admin/AdminBrackets'
import AdminProducts from './pages/admin/AdminProducts'
import AdminHallOfFame from './pages/admin/AdminHallOfFame'
import AdminRedemptions from './pages/admin/AdminRedemptions'
import AdminPlayers from './pages/admin/AdminPlayers'
import AdminBets from './pages/admin/AdminBets'
import AdminAnnouncements from './pages/admin/AdminAnnouncements'
import './App.css'

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">加载中...</div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/brackets" element={<BracketListPage />} />
        <Route path="/brackets/:id" element={<BracketViewPage />} />
        <Route path="/bets" element={<BetsPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/hall-of-fame" element={<HallOfFamePage />} />
        <Route path="/my-bets" element={<ProtectedRoute><MyBetsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/brackets" element={<ProtectedRoute adminOnly><AdminBrackets /></ProtectedRoute>} />
        <Route path="/admin/brackets/:id/edit" element={<ProtectedRoute adminOnly><BracketEditorPage /></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute adminOnly><AdminProducts /></ProtectedRoute>} />
        <Route path="/admin/hall-of-fame" element={<ProtectedRoute adminOnly><AdminHallOfFame /></ProtectedRoute>} />
        <Route path="/admin/redemptions" element={<ProtectedRoute adminOnly><AdminRedemptions /></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute adminOnly><AdminAnnouncements /></ProtectedRoute>} />
        <Route path="/admin/players" element={<ProtectedRoute adminOnly><AdminPlayers /></ProtectedRoute>} />
        <Route path="/admin/bets" element={<ProtectedRoute adminOnly><AdminBets /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}

export default App
