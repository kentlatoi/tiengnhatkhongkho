import { usersStore, classesStore } from '../../store/localStorage';
import { DefaultAvatar } from '../../components/layout/Sidebar';
import { motion } from 'framer-motion';

export default function AdminStudents() {
  const students = usersStore.getStudents();
  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">Học sinh 🎓</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {students.map((s, i) => {
          const classes = classesStore.getByStudent(s.id);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="glass-card">
              <div className="flex items-center gap-4 mb-4">
                {s.avatar ? <img src={s.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover" /> : <DefaultAvatar name={s.name} size="w-14 h-14 text-lg" />}
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">{s.name}</h3>
                  <p className="text-xs text-surface-500">{s.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-surface-500">
                <span>📚 {classes.length} lớp</span>
                <span>📅 {s.createdAt || '—'}</span>
              </div>
              {classes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {classes.map(c => <span key={c.id} className="badge-primary text-[10px]">{c.name}</span>)}
                </div>
              )}
            </motion.div>
          );
        })}
        {students.length === 0 && <p className="text-surface-500 col-span-full text-center py-12">Chưa có học sinh.</p>}
      </div>
    </div>
  );
}
