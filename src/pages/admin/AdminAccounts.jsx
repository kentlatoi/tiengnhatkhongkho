import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DefaultAvatar } from '../../components/layout/Sidebar';
import userService from '../../services/userService';
import classService from '../../services/classService';
import authService from '../../services/authService';
import activityLogService from '../../services/activityLogService';
import Modal from '../../components/ui/Modal';
import SearchBar from '../../components/ui/SearchBar';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { useToast } from '../../components/ui/Toast';
import { motion } from 'framer-motion';

export default function AdminAccounts() {
  const { user: admin } = useAuth();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const toast = useToast();

  const refresh = useCallback(async () => {
    setFetchError('');
    try {
      console.log('[AdminAccounts] 🔄 Loading users...');
      const [u, c] = await Promise.all([userService.getAll(), classService.getAll()]);
      console.log('[AdminAccounts] ✅ Loaded', u.length, 'users,', c.length, 'classes');
      setUsers(u); setClasses(c);
    } catch (err) {
      console.error('[AdminAccounts] ❌ Failed to load users:', err);
      setFetchError(err.message || 'Không thể tải danh sách tài khoản');
    }
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  const [error, setError] = useState('');
  const blank = { name: '', email: '', password: '', role: 'student', phone: '', birthday: '', bio: '' };
  const [form, setForm] = useState(blank);

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return [u.name, u.email, u.role].some(f => f?.toLowerCase().includes(s));
    }
    return true;
  });

  const openCreate = () => { setEditUser(null); setForm(blank); setError(''); setShowForm(true); };
  const openEdit = (u) => { setEditUser(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', birthday: u.birthday || '', bio: u.bio || '' }); setError(''); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editUser) {
        await userService.update(editUser.id, form);
        await activityLogService.log(admin, `Chỉnh sửa tài khoản: ${form.name}`);
      } else {
        const result = await authService.createUser(form, admin);
        if (!result.success) { setError(result.error); setSaving(false); return; }
      }
      await refresh(); setShowForm(false);
    } catch (err) {
      setError(err.message || 'Lỗi lưu tài khoản');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!showDelete || showDelete.id === admin.id) return;
    try {
      await userService.remove(showDelete.id, showDelete.authId);
      await activityLogService.log(admin, `Xóa tài khoản: ${showDelete.name}`);
      toast('Đã xoá tài khoản thành công');
      await refresh();
    } catch (err) {
      console.error('Delete user error:', err);
      toast(err.message || 'Lỗi khi xóa tài khoản', 'error');
    } finally {
      setShowDelete(null);
    }
  };

  const roleLabels = { admin: 'Admin', teacher: 'Giáo viên', student: 'Học sinh' };
  const roleBadge = { admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', student: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' };

  if (loading) return <LoadingSkeleton type="table" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Quản lý tài khoản 👤</h1>
          <p className="text-surface-500 text-sm">{users.length} tài khoản</p>
        </motion.div>
        <button onClick={openCreate} className="btn-primary">+ Tạo tài khoản</button>
      </div>

      {fetchError && (
        <div className="mb-4 p-4 rounded-xl bg-sakura-500/10 border border-sakura-500/20 text-sakura-500 text-sm">
          <p className="font-medium">❌ {fetchError}</p>
          <button onClick={() => { setLoading(true); refresh().finally(() => setLoading(false)); }} className="mt-2 text-xs underline">Thử lại</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Tìm tên, email..." /></div>
        <div className="flex gap-2">
          {['all', 'admin', 'teacher', 'student'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${roleFilter === r ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}`}>
              {r === 'all' ? 'Tất cả' : roleLabels[r]}
            </button>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700">
              <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Người dùng</th>
              <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase hidden sm:table-cell">Email</th>
              <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Vai trò</th>
              <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase hidden md:table-cell">Ngày tạo</th>
              <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowDetail(u)}>
                    {u.avatar ? <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> : <DefaultAvatar name={u.name} size="w-8 h-8 text-xs" />}
                    <span className="text-sm font-medium text-surface-900 dark:text-white">{u.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-surface-500 hidden sm:table-cell">{u.email}</td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadge[u.role]}`}>{roleLabels[u.role]}</span>
                </td>
                <td className="py-3 px-4 text-sm text-surface-500 hidden md:table-cell">{u.createdAt || '—'}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="btn-ghost text-xs">✏️</button>
                    {u.id !== admin.id && <button onClick={() => setShowDelete(u)} className="btn-ghost text-xs text-sakura-500">🗑️</button>}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-surface-500 py-8">Không tìm thấy tài khoản.</p>}
      </motion.div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editUser ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="p-3 rounded-xl bg-sakura-500/10 text-sakura-500 text-sm">{error}</div>}
          <div><label className="input-label">Họ và tên *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="input" /></div>
          <div><label className="input-label">Email *</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className="input" disabled={!!editUser} /></div>
          <div><label className="input-label">{editUser ? 'Mật khẩu mới (bỏ trống = giữ nguyên)' : 'Mật khẩu *'}</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editUser} className="input" /></div>
          <div>
            <label className="input-label">Vai trò *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input" disabled={editUser?.role === 'admin'}>
              <option value="teacher">Giáo viên</option>
              <option value="student">Học sinh</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Số điện thoại</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" /></div>
            <div><label className="input-label">Ngày sinh</label><input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="input" /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Đang lưu...' : editUser ? 'Lưu' : 'Tạo'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!showDelete} onClose={() => setShowDelete(null)} title="Xác nhận xóa">
        <p className="text-surface-700 dark:text-surface-300 mb-6">Bạn có chắc muốn xóa tài khoản <strong>{showDelete?.name}</strong> ({showDelete?.email})?</p>
        <div className="flex gap-3">
          <button onClick={() => setShowDelete(null)} className="btn-secondary flex-1">Hủy</button>
          <button onClick={handleDelete} className="btn-danger flex-1">Xóa</button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Chi tiết tài khoản">
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {showDetail.avatar ? <img src={showDetail.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover" /> : <DefaultAvatar name={showDetail.name} size="w-16 h-16 text-xl" />}
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white">{showDetail.name}</h3>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadge[showDetail.role]}`}>{roleLabels[showDetail.role]}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-surface-500">Email</p><p className="font-medium text-surface-900 dark:text-white">{showDetail.email}</p></div>
              <div><p className="text-surface-500">Điện thoại</p><p className="font-medium text-surface-900 dark:text-white">{showDetail.phone || '—'}</p></div>
              <div><p className="text-surface-500">Ngày sinh</p><p className="font-medium text-surface-900 dark:text-white">{showDetail.birthday || '—'}</p></div>
              <div><p className="text-surface-500">Ngày tạo</p><p className="font-medium text-surface-900 dark:text-white">{showDetail.createdAt || '—'}</p></div>
            </div>
            {showDetail.bio && <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800"><p className="text-sm text-surface-700 dark:text-surface-300">{showDetail.bio}</p></div>}
            <div>
              <p className="text-surface-500 text-sm mb-2">Lớp học liên quan:</p>
              {classes.filter(c => c.teacherId === showDetail.id || (c.studentIds || []).includes(showDetail.id)).map(c => (
                <span key={c.id} className="inline-block mr-2 mb-1 badge-primary">{c.name}</span>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
