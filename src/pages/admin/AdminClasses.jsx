import { classesStore, sessionsStore, usersStore } from '../../store/localStorage';
import { motion } from 'framer-motion';

export default function AdminClasses() {
  const classes = classesStore.getAll();
  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">Lớp học 🏫</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {classes.map((cls, i) => {
          const sessions = sessionsStore.getByClass(cls.id);
          const teacher = usersStore.getById(cls.teacherId);
          return (
            <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="glass-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-2xl shadow-lg">{cls.thumbnail}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-surface-900 dark:text-white truncate">{cls.name}</h3>
                  <p className="text-xs text-surface-500">{cls.level} · {cls.schedule}</p>
                </div>
              </div>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-3 line-clamp-2">{cls.description}</p>
              <div className="flex items-center gap-4 text-xs text-surface-500">
                <span>👩‍🏫 {teacher?.name || cls.teacherName}</span>
                <span>📅 {sessions.length} buổi</span>
                <span>👥 {(cls.studentIds || []).length} HS</span>
              </div>
            </motion.div>
          );
        })}
        {classes.length === 0 && <p className="text-surface-500 col-span-full text-center py-12">Chưa có lớp học.</p>}
      </div>
    </div>
  );
}
