import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import classService from '../../services/classService';
import userService from '../../services/userService';
import activityLogService from '../../services/activityLogService';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeacherClasses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(null);
  const [editClass, setEditClass] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', level: 'N5', schedule: '', thumbnail: '🗻' });

  const refresh = useCallback(async () => {
    const c = await classService.getByTeacher(user.id);
    setClasses(c);
  }, [user.id]);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editClass) {
        await classService.update(editClass.id, form, user);
      } else {
        await classService.create({ ...form, teacherId: user.id, teacherName: user.name }, user);
      }
      await refresh(); setShowCreate(false); setEditClass(null);
      setForm({ name: '', description: '', level: 'N5', schedule: '', thumbnail: '🗻' });
    } finally { setSaving(false); }
  };

  const handleEdit = (c) => {
    setEditClass(c);
    setForm({ name: c.name, description: c.description, level: c.level, schedule: c.schedule, thumbnail: c.thumbnail });
    setShowCreate(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Xóa lớp học này?')) {
      await classService.deleteClass(id, user);
      await refresh();
    }
  };

  const emojis = ['🗻', '🎌', '🌸', '⛩️', '🏯', '🎎', '🎋', '🍣', '🗾', '📚'];

  if (loading) return <LoadingSkeleton type="cards" count={3} />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Quản lý lớp học</h1>
          <p className="text-surface-500 text-sm mt-1">{classes.length} lớp học</p>
        </div>
        <button onClick={() => { setEditClass(null); setForm({ name: '', description: '', level: 'N5', schedule: '', thumbnail: '🗻' }); setShowCreate(true); }}
          className="btn-primary">＋ Tạo lớp mới</button>
      </div>

      {classes.length === 0 ? (
        <EmptyState icon="🏫" title="Chưa có lớp học" description="Tạo lớp học đầu tiên để bắt đầu quản lý." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {classes.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }} className="glass-card group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-3xl shadow-lg shadow-primary-500/20">{c.thumbnail}</div>
                  <div className="flex gap-1">
                    <button onClick={() => setShowAssign(c)} className="btn-ghost text-xs" title="Quản lý học sinh">👥</button>
                    <button onClick={() => handleEdit(c)} className="btn-ghost text-xs" title="Sửa">✏️</button>
                    <button onClick={() => handleDelete(c.id)} className="btn-ghost text-xs text-sakura-500" title="Xóa">🗑️</button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-1">{c.name}</h3>
                <p className="text-sm text-surface-500 line-clamp-2 mb-3">{c.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge-primary">{c.level}</span>
                  <span className="text-xs text-surface-400">📅 {c.schedule}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-surface-200 dark:border-surface-700">
                  <span className="text-xs text-surface-500">👥 {(c.studentIds || []).length} học sinh</span>
                  <button onClick={() => navigate(`/teacher/classes/${c.id}`)} className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer">Chi tiết →</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setEditClass(null); }} title={editClass ? 'Sửa lớp học' : 'Tạo lớp học mới'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="input-label">Tên lớp</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="input" placeholder="JLPT N5 基礎" /></div>
          <div><label className="input-label">Mô tả</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input h-24 resize-none" placeholder="Mô tả lớp học..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Cấp độ</label><select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="input">{['N5','N4','N3','N2','N1'].map(l => <option key={l} value={l}>{l}</option>)}</select></div>
            <div><label className="input-label">Lịch học</label><input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} className="input" placeholder="Mon, Wed - 19:00" /></div>
          </div>
          <div>
            <label className="input-label">Biểu tượng</label>
            <div className="flex flex-wrap gap-2">
              {emojis.map(e => (
                <button key={e} type="button" onClick={() => setForm(f => ({ ...f, thumbnail: e }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center cursor-pointer transition-all ${form.thumbnail === e ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200'}`}>{e}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); setEditClass(null); }} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Đang lưu...' : editClass ? 'Cập nhật' : 'Tạo lớp'}</button>
          </div>
        </form>
      </Modal>

      <StudentAssignModal cls={showAssign} onClose={() => { setShowAssign(null); refresh(); }} />
    </div>
  );
}

function StudentAssignModal({ cls, onClose }) {
  const [allStudents, setAllStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cls) return;
    const load = async () => {
      const studs = await userService.getStudents();
      setAllStudents(studs);
      const ids = await classService.getStudentIds(cls.id);
      setSelected(ids);
    };
    load();
  }, [cls]);

  if (!cls) return null;

  const toggle = (sid) => setSelected(s => s.includes(sid) ? s.filter(x => x !== sid) : [...s, sid]);
  const handleSave = async () => {
    setSaving(true);
    await classService.assignStudents(cls.id, selected);
    setSaving(false);
    onClose();
  };

  return (
    <Modal isOpen={!!cls} onClose={onClose} title={`Quản lý học sinh - ${cls.name}`}>
      <p className="text-sm text-surface-500 mb-4">Chọn học sinh tham gia lớp này:</p>
      {allStudents.length === 0 ? (
        <p className="text-surface-400 text-center py-8">Chưa có học sinh đăng ký.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
          {allStudents.map(s => (
            <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selected.includes(s.id) ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-surface-50 dark:hover:bg-surface-800'}`}>
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)}
                className="w-5 h-5 rounded-md border-surface-300 text-primary-500 focus:ring-primary-500" />
              <span className="text-xl">{s.avatar || s.name?.[0]}</span>
              <div>
                <p className="font-medium text-surface-900 dark:text-white text-sm">{s.name}</p>
                <p className="text-xs text-surface-500">{s.email}</p>
              </div>
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-3 pt-4 mt-4 border-t border-surface-200 dark:border-surface-700">
        <button onClick={onClose} className="btn-secondary flex-1">Hủy</button>
        <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>{saving ? 'Đang lưu...' : `Lưu (${selected.length} học sinh)`}</button>
      </div>
    </Modal>
  );
}
