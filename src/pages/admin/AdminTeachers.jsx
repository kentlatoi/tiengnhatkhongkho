import { usersStore, classesStore } from '../../store/localStorage';
import { DefaultAvatar } from '../../components/layout/Sidebar';
import { motion } from 'framer-motion';

export default function AdminTeachers() {
  const teachers = usersStore.getTeachers();
  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">Giáo viên 👩‍🏫</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teachers.map((t, i) => {
          const classes = classesStore.getByTeacher(t.id);
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="glass-card">
              <div className="flex items-center gap-4 mb-4">
                {t.avatar ? <img src={t.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover" /> : <DefaultAvatar name={t.name} size="w-14 h-14 text-lg" />}
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">{t.name}</h3>
                  <p className="text-xs text-surface-500">{t.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-surface-500">
                <span>🏫 {classes.length} lớp</span>
                <span>📅 {t.createdAt || '—'}</span>
              </div>
              {classes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {classes.map(c => <span key={c.id} className="badge-primary text-[10px]">{c.name}</span>)}
                </div>
              )}
            </motion.div>
          );
        })}
        {teachers.length === 0 && <p className="text-surface-500 col-span-full text-center py-12">Chưa có giáo viên.</p>}
      </div>
    </div>
  );
}
