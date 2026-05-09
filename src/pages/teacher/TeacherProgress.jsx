import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';
import userService from '../../services/userService';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion } from 'framer-motion';
import ProgressBar from '../../components/ui/ProgressBar';

export default function TeacherProgress() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [classes, allSessions, students] = await Promise.all([
        classService.getByTeacher(user.id),
        sessionService.getAll(),
        userService.getStudents(),
      ]);
      const classData = classes.map(cls => ({
        ...cls,
        sessions: allSessions.filter(s => s.classId === cls.id),
        students: students.filter(s => (cls.studentIds || []).includes(s.id)),
      }));
      setData(classData);
      setLoading(false);
    };
    load();
  }, [user.id]);

  if (loading) return <LoadingSkeleton type="cards" count={3} />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">Tiến độ học sinh 📈</h1>

      {data.map((cls, ci) => (
        <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1 }}
          className="glass-card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{cls.thumbnail}</span>
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-white">{cls.name}</h3>
              <p className="text-xs text-surface-500">{cls.sessions.length} buổi · {cls.students.length} học sinh</p>
            </div>
          </div>

          {cls.students.length === 0 ? (
            <p className="text-sm text-surface-400">Chưa có học sinh trong lớp.</p>
          ) : (
            <div className="space-y-3">
              {cls.students.map(s => (
                <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                  <span className="text-xl">{s.avatar || s.name?.[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{s.name}</p>
                    <ProgressBar value={0} max={cls.sessions.length || 1} size="sm" />
                  </div>
                  <span className="text-xs text-surface-500 whitespace-nowrap">0/{cls.sessions.length}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ))}

      {data.length === 0 && <p className="text-surface-500 text-center py-12">Chưa có lớp học để theo dõi.</p>}
    </div>
  );
}
