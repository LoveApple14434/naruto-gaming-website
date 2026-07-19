import { useState, useRef } from 'react';
import { useAuth } from '../store/AuthContext';
import { profileApi } from '../api/client';

const EMAIL_DOMAINS = ['@smail.nju.edu.cn', '@nju.edu.cn'] as const;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isNjuStudent, setIsNjuStudent] = useState(user?.isNjuStudent ?? false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  // 南大邮箱验证状态
  const [showVerification, setShowVerification] = useState(false);
  const [emailAccount, setEmailAccount] = useState('');
  const [emailDomain, setEmailDomain] = useState<string>('@smail.nju.edu.cn');
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  if (!user) return null;

  const avatarSrc = preview || user.avatar || undefined;

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await profileApi.update({ nickname: nickname || null, isNjuStudent });
      setMsg('✅ 保存成功');
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    }
    setSaving(false);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!emailAccount.trim()) {
      setMsg('❌ 请输入邮箱账号名');
      return;
    }
    setSendingCode(true);
    setMsg('');
    setCodeSent(false);
    try {
      const res = await profileApi.sendVerificationCode({
        emailAccount: emailAccount.trim(),
        emailDomain,
      });
      setMsg(`✅ ${res.message}`);
      setCodeSent(true);
      // 60 秒倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    }
    setSendingCode(false);
  };

  // 提交验证码
  const handleVerify = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setMsg('❌ 请输入 6 位验证码');
      return;
    }
    setVerifying(true);
    setMsg('');
    try {
      await profileApi.verifyEmail(verificationCode.trim());
      setIsNjuStudent(true);
      setShowVerification(false);
      setEmailAccount('');
      setVerificationCode('');
      setCodeSent(false);
      await refreshUser();
      setMsg('✅ 南大学生身份已验证通过！');
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    }
    setVerifying(false);
  };

  // 勾选/取消南大学生
  const handleNjuCheckbox = (checked: boolean) => {
    setIsNjuStudent(checked);
    if (checked && !user.njuEmailVerified) {
      // 勾选但未验证 → 弹出验证界面
      setShowVerification(true);
    } else if (checked) {
      // 已验证过，直接保存
      setMsg('');
    } else {
      // 取消勾选
      setShowVerification(false);
      setEmailAccount('');
      setVerificationCode('');
      setCodeSent(false);
    }
  };

  /** 客户端压缩图片至最大 800px 边长、500KB 以下，避免 413 错误 */
  const compressImage = (file: File): Promise<Blob> => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > height && width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
      else if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('压缩失败')), 'image/jpeg', 0.8);
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 压缩后再预览
    const compressed = await compressImage(file);
    const previewUrl = URL.createObjectURL(compressed);
    setPreview(previewUrl);

    setUploading(true);
    setMsg('');
    try {
      const compressedFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      // 1. 上传图片 → 获取 URL
      const { url } = await profileApi.uploadAvatar(compressedFile);
      setPreview(null);
      URL.revokeObjectURL(previewUrl);
      // 2. 更新个人信息中的头像字段
      await profileApi.update({ avatar: url });
      await refreshUser();
      setMsg('✅ 头像已更新');
    } catch (e: any) {
      setPreview(null);
      URL.revokeObjectURL(previewUrl);
      setMsg(`❌ ${e.message}`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="profile-page">
      <h1>个人管理</h1>

      {msg && <div className="toast">{msg}</div>}

      <div className="profile-card">
        {/* 头像 */}
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt="头像" />
            ) : (
              <span className="profile-avatar-fallback">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
            {uploading && <div className="profile-avatar-loading">上传中...</div>}
          </div>
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button className="btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? '上传中...' : '更换头像'}
          </button>
        </div>

        {/* 基本信息（只读） */}
        <div className="profile-field">
          <label>账号</label>
          <span className="profile-value">{user.username}</span>
        </div>
        <div className="profile-field">
          <label>角色</label>
          <span className="profile-value">
            {user.role === 'ADMIN' ? '管理员' : user.role === 'MODERATOR' ? '协助管理员' : '普通用户'}
          </span>
        </div>
        <div className="profile-field">
          <label>金币</label>
          <span className="profile-value">🪙 {user.coins}</span>
        </div>

        <hr className="profile-divider" />

        {/* 可编辑信息 */}
        <div className="profile-field">
          <label>昵称</label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder={user.username}
            maxLength={30}
          />
        </div>
        <div className="profile-field">
          <label></label>
          <label className="profile-checkbox">
            <input
              type="checkbox"
              checked={isNjuStudent}
              onChange={e => handleNjuCheckbox(e.target.checked)}
            />
            我是（或曾为）南京大学学生
          </label>
        </div>

        {/* 南大邮箱验证弹窗 */}
        {showVerification && (
          <div className="verification-overlay" onClick={() => { setShowVerification(false); setIsNjuStudent(false); }}>
            <div className="verification-modal" onClick={e => e.stopPropagation()}>
              <h3>🎓 南大学生身份验证</h3>
              <p className="verification-desc">
                请填写你的南大邮箱，我们将发送验证码以完成验证。
              </p>

              <div className="verification-email-row">
                <input
                  className="verification-input"
                  placeholder="邮箱账号名"
                  value={emailAccount}
                  onChange={e => setEmailAccount(e.target.value)}
                  maxLength={50}
                />
                <select
                  className="verification-select"
                  value={emailDomain}
                  onChange={e => setEmailDomain(e.target.value)}
                >
                  {EMAIL_DOMAINS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <button
                className="btn-sm"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
                style={{ width: '100%', marginBottom: 12 }}
              >
                {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s 后重新发送` : '发送验证码'}
              </button>

              {codeSent && (
                <>
                  <input
                    className="verification-input"
                    placeholder="请输入 6 位验证码"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20, marginBottom: 12 }}
                  />
                  <button
                    className="btn-primary"
                    onClick={handleVerify}
                    disabled={verifying || verificationCode.length !== 6}
                    style={{ width: '100%' }}
                  >
                    {verifying ? '验证中...' : '提交验证'}
                  </button>
                </>
              )}

              <button
                className="btn-ghost"
                onClick={() => {
                  setShowVerification(false);
                  setIsNjuStudent(false);
                }}
                style={{ width: '100%', marginTop: 8 }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存修改'}
        </button>
      </div>
    </div>
  );
}
