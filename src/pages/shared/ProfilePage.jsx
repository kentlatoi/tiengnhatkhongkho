import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DefaultAvatar } from '../../components/layout/Sidebar';
import { supabase, isSupabase } from '../../lib/supabaseClient';
import activityLogService from '../../services/activityLogService';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', birthday: user?.birthday || '', bio: user?.bio || '' });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || user?.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    setUploadingAvatar(true);
    try {
      if (isSupabase()) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        // Add cache bust
        const url = `${publicUrl}?t=${Date.now()}`;
        await updateProfile({ avatarUrl: url });
        setAvatarPreview(url);
        activityLogService.log(user, 'Cập nhật ảnh đại diện');
      } else {
        // localStorage fallback: store as data URL
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          updateProfile({ avatar: dataUrl });
          setAvatarPreview(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePwChange = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (pwForm.newPw.length < 6) { setPwMsg('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('Mật khẩu xác nhận không khớp'); return; }

    if (isSupabase()) {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
      if (error) { setPwMsg(`Lỗi: ${error.message}`); return; }
      setPwForm({ current: '', newPw: '', confirm: '' });
      setPwMsg('✅ Đổi mật khẩu thành công!');
    } else {
      if (pwForm.current !== user.password) { setPwMsg('Mật khẩu hiện tại không đúng'); return; }
      await updateProfile({ password: pwForm.newPw });
      setPwForm({ current: '', newPw: '', confirm: '' });
      setPwMsg('✅ Đổi mật khẩu thành công!');
    }
  };

  const roleLabels = { admin: 'Admin', teacher: 'Giáo viên', student: 'Học sinh' };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">Cài đặt hồ sơ</h1>
      </motion.div>

      {/* Avatar section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card mb-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
            ) : (
              <DefaultAvatar name={user?.name} size="w-20 h-20 text-2xl" />
            )}
            <button onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <span className="text-white text-lg">{uploadingAvatar ? '⏳' : '📷'}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">{user?.name}</h2>
            <p className="text-surface-500 text-sm">{user?.email}</p>
            <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
              {roleLabels[user?.role]}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Basic info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card mb-6">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Thông tin cá nhân</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="input-label">Họ và tên</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="input" /></div>
            <div><label className="input-label">Email</label><input value={form.email} disabled className="input opacity-60 cursor-not-allowed" type="email" /></div>
            <div><label className="input-label">Số điện thoại</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="0901234567" /></div>
            <div><label className="input-label">Ngày sinh</label><input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="input" /></div>
          </div>
          <div><label className="input-label">Giới thiệu</label><textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="input h-24 resize-none" placeholder="Viết vài dòng về bản thân..." /></div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            {saved && <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">✅ Đã lưu!</span>}
          </div>
        </form>
      </motion.div>

      {/* Password */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass-card">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Đổi mật khẩu</h3>
        <form onSubmit={handlePwChange} className="space-y-4">
          {!isSupabase() && (
            <div><label className="input-label">Mật khẩu hiện tại</label><input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} required className="input" /></div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="input-label">Mật khẩu mới</label><input type="password" value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} required className="input" /></div>
            <div><label className="input-label">Xác nhận</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required className="input" /></div>
          </div>
          {pwMsg && <p className={`text-sm ${pwMsg.startsWith('✅') ? 'text-primary-600' : 'text-sakura-500'}`}>{pwMsg}</p>}
          <button type="submit" className="btn-secondary">Đổi mật khẩu</button>
        </form>
      </motion.div>
    </div>
  );
}
