import { useAuth } from '../../contexts/AuthContext';
import { classesStore, sessionsStore, usersStore, progressStore } from '../../store/localStorage';
import { motion } from 'framer-motion';
import ProgressBar from '../../components/ui/ProgressBar';

export default function TeacherProgress() {
  const { user } = useAuth();
  const classes = classesStore.getByTeacher(user.id);
  const students = usersStore.getStudents();
  const allProgress = progressStore.get();

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">Tiến độ học sinh 📈</h1>

      {classes.map((cls, ci) => {
        const classSessions = sessionsStore.getByClass(cls.id);
        const assignedStudents = students.filter(s => (cls.studentIds || []).includes(s.id));

        return (
          <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1 }}
            className="glass-card mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{cls.thumbnail}</span>
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-white">{cls.name}</h3>
                <p className="text-xs text-surface-500">{classSessions.length} buổi · {assignedStudents.length} học sinh</p>
              </div>
            </div>

            {assignedStudents.length === 0 ? (
              <p className="text-sm text-surface-400">Chưa có học sinh trong lớp.</p>
            ) : (
              <div className="space-y-3">
                {assignedStudents.map(s => {
                  const sp = allProgress[s.id] || { completedSessions: [], quizScores: {} };
                  const completed = sp.completedSessions.filter(sid => classSessions.some(cs => cs.id === sid)).length;
                  const total = classSessions.length;

                  return (
                    <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                      <span className="text-xl">{s.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white">{s.name}</p>
                        <ProgressBar value={completed} max={total || 1} size="sm" />
                      </div>
                      <span className="text-xs text-surface-500 whitespace-nowrap">{completed}/{total}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      })}

      {classes.length === 0 && <p className="text-surface-500 text-center py-12">Chưa có lớp học để theo dõi.</p>}
    </div>
  );
}
