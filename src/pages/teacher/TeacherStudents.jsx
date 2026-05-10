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
    <div>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">Danh sách học sinh</h1>
      {students.length === 0 ? (
        <p className="text-surface-500 text-center py-12">Chưa có học sinh nào đăng ký.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl">
                {s.avatar || s.name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">{s.name}</p>
                <p className="text-sm text-surface-500">{s.email}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
