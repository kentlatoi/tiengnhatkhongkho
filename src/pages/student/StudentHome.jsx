import { useAuth } from '../../contexts/AuthContext';
import { classesStore, sessionsStore } from '../../store/localStorage';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';

export default function StudentHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const classes = classesStore.getByStudent(user.id);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
          こんにちは、<span className="gradient-text">{user.name}</span> 🌸
        </h1>
        <p className="text-surface-500 mt-1">Chào mừng bạn! Hãy tiếp tục hành trình học tiếng Nhật.</p>
      </motion.div>

      {classes.length === 0 ? (
        <EmptyState icon="📚" title="Chưa có lớp học" description="Bạn chưa được phân vào lớp nào. Hãy liên hệ giáo viên." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {classes.map((cls, i) => {
            const sessions = sessionsStore.getByClass(cls.id);
            return (
              <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}
                className="glass-card group cursor-pointer" onClick={() => navigate(`/student/class/${cls.id}`)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-3xl shadow-lg shadow-primary-500/20">
                    {cls.thumbnail}
                  </div>
                  <span className="badge-primary">{cls.level}</span>
                </div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-1">{cls.name}</h3>
                <p className="text-sm text-surface-500 mb-1">👩‍🏫 {cls.teacherName}</p>
                <p className="text-xs text-surface-400 mb-3">📅 {cls.schedule}</p>
                <p className="text-xs text-surface-400">{sessions.length} buổi học</p>
                <button className="btn-primary w-full mt-4 py-2.5 text-sm">Vào lớp →</button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
