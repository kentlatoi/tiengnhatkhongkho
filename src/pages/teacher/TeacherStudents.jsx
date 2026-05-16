import { useState, useEffect } from 'react';
import userService from '../../services/userService';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion } from 'framer-motion';

export default function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getStudents()
      .then(s => setStudents(s))
      .catch(err => { console.error('[TeacherStudents] ❌ Load error:', err); setStudents([]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton type="cards" count={6} />;

  return (
    <div className="pb-12">
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xl font-bold">
            👥
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-white tracking-tight">Danh sách học sinh</h1>
        </div>
        <p className="text-surface-500 sm:text-lg">Quản lý và xem thông tin học sinh trong hệ thống.</p>
      </motion.div>

      {students.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20">
          <p className="text-5xl opacity-40 mb-4">📭</p>
          <p className="text-surface-500 font-medium">Chưa có học sinh nào đăng ký.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 rounded-2xl p-5 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800/50 hover:-translate-y-1 transition-all duration-300 group flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-primary-500/20 group-hover:scale-110 transition-transform duration-300">
                {s.avatar || (s.name ? s.name[0].toUpperCase() : '?')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-surface-900 dark:text-white text-lg truncate group-hover:text-primary-600 transition-colors">{s.name}</p>
                <p className="text-sm font-medium text-surface-500 truncate mt-0.5">{s.email}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
