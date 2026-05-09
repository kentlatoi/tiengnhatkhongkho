import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import classService from '../../services/classService';
import userService from '../../services/userService';
import SearchBar from '../../components/ui/SearchBar';
import ConfirmModal from '../../components/ui/ConfirmModal';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminClasses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [deleteId, setDeleteId] = useState(null);

  const refresh = useCallback(async () => {
    const [c, t] = await Promise.all([classService.getAll(), userService.getTeachers()]);
    setClasses(c); setTeachers(t);
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  const filtered = classes.filter(c => {
    if (filterLevel !== 'all' && c.level !== filterLevel) return false;
    if (filterTeacher !== 'all' && c.teacherId !== filterTeacher) return false;
    if (search) {
      const q = search.toLowerCase();
      return [c.name, c.teacherName, c.description].some(f => f?.toLowerCase().includes(q));
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const cls = classes.find(c => c.id === deleteId);
    await classService.deleteClass(deleteId, user);
    await refresh();
    toast(`Đã xóa lớp "${cls?.name}" và tất cả dữ liệu liên quan`);
    setDeleteId(null);
  };

  const deleteTarget = deleteId ? classes.find(c => c.id === deleteId) : null;

  if (loading) return <LoadingSkeleton type="cards" count={6} />;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white mb-1">Lớp học 🏫</h1>
        <p className="text-surface-500 text-sm mb-4 sm:mb-6">{classes.length} lớp học trong hệ thống</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Tìm lớp học, giáo viên..." /></div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="input !w-auto min-w-[100px] text-sm !py-2">
            <option value="all">Tất cả cấp độ</option>
            {['N5','N4','N3','N2','N1'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="input !w-auto min-w-[140px] text-sm !py-2">
            <option value="all">Tất cả GV</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-surface-500">Không tìm thấy lớp học nào.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <AnimatePresence>
            {filtered.map((cls, i) => {
              const teacher = teachers.find(t => t.id === cls.teacherId);
              return (
                <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}
                  className="glass-card group cursor-pointer" onClick={() => navigate(`/admin/classes/${cls.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-2xl shadow-lg shadow-primary-500/20">{cls.thumbnail}</div>
                    <div className="flex gap-1">
                      <span className="badge-primary">{cls.level}</span>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(cls.id); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-sakura-50 dark:hover:bg-sakura-900/20 text-sakura-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-sm" title="Xóa lớp">🗑️</button>
                    </div>
                  </div>
                  <h3 className="font-bold text-surface-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{cls.name}</h3>
                  <p className="text-sm text-surface-500 line-clamp-2 mb-3">{cls.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500 pt-3 border-t border-surface-200/50 dark:border-surface-700/50">
                    <span>👩‍🏫 {teacher?.name || cls.teacherName}</span>
                    <span>👥 {(cls.studentIds || []).length} HS</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Xóa lớp học?" message={`Bạn có chắc chắn muốn xóa lớp "${deleteTarget?.name}"? Tất cả buổi học, sự kiện lịch và file liên quan sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa lớp" danger />
    </div>
  );
}
