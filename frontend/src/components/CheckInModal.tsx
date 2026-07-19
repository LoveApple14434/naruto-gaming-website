import { useState, useEffect } from 'react';
import { checkinApi } from '../api/client';
import { useAuth } from '../store/AuthContext';
import type { TodayCheckInStatus } from '../types';

interface Props {
  onClose: () => void;
}

export default function CheckInModal({ onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<TodayCheckInStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    checkinApi.getTodayStatus()
      .then(data => {
        setStatus(data);
        // 如果已经签到过，自动关闭
        if (data.checkedInToday || !data.event) {
          onClose();
        }
      })
      .catch(() => setError('获取签到信息失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleCheckin = async () => {
    if (!status?.event || !status.todayDayNumber) return;
    setChecking(true);
    setError('');
    try {
      const res = await checkinApi.checkin(status.event.id, status.todayDayNumber);
      setCoinsAwarded(res.coinsAwarded);
      setDone(true);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : '签到失败');
    } finally {
      setChecking(false);
    }
  };

  if (loading) return null;

  if (!status?.event || status.checkedInToday) return null;

  const event = status.event;
  const dayNumber = status.todayDayNumber ?? 1;
  const dayConfig = event.days.find(d => d.dayNumber === dayNumber);
  const baseCoins = dayConfig?.coins ?? 0;
  const bonusCoins = user?.isNjuStudent ? Math.floor(baseCoins * 1.2) - baseCoins : 0;

  return (
    <div className="modal-overlay" onClick={done ? onClose : undefined}>
      <div className="modal-content checkin-modal" onClick={e => e.stopPropagation()}>
        {done ? (
          <>
            <div className="checkin-success-icon">✅</div>
            <h2>签到成功！</h2>
            <p className="checkin-coins-gained">
              获得 <strong className="coin-reward">🪙 {coinsAwarded}</strong> 竞猜币
            </p>
            {bonusCoins > 0 && (
              <p className="checkin-nju-bonus">（南大学生专属加成 +{bonusCoins}）</p>
            )}
            <button className="btn-primary" onClick={onClose}>
              确定
            </button>
          </>
        ) : (
          <>
            <h2>📋 每日签到</h2>
            <p className="checkin-event-title">{event.title}</p>
            <div className="checkin-day-info">
              <span className="checkin-day-badge">第 {dayNumber} 天</span>
              <span className="checkin-total-days">共 {event.days.length} 天</span>
            </div>
            <div className="checkin-reward-box">
              <div className="checkin-reward-label">今日签到奖励</div>
              <div className="checkin-reward-amount">🪙 {baseCoins}</div>
              {user?.isNjuStudent && (
                <div className="checkin-nju-bonus-preview">
                  南大学生加成 ×1.2 = 🪙 {Math.floor(baseCoins * 1.2)}
                </div>
              )}
            </div>
            {error && <div className="form-error">{error}</div>}
            <button
              className="btn-primary btn-block"
              onClick={handleCheckin}
              disabled={checking}
            >
              {checking ? '签到中...' : '立即签到'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
