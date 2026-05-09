import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardCard from '../../components/ui/DashboardCard';
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';
import userService from '../../services/userService';
import vocabularyService from '../../services/vocabularyService';
import grammarService from '../../services/grammarService';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion } from 'framer-motion';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [classes, allSessions, students, vocab, grammar] = await Promise.all([
        classService.getByTeacher(user.id),
        sessionService.getAll(),
        userService.getStudents(),
        vocabularyService.getAllItems(),
        grammarService.getAllPoints(),
      ]);
      const sessions = allSessions.filter(s => classes.some(c => c.id === s.classId));
      setData({ classes, sessions, students, vocab, grammar });
      setLoading(false);
    };
    load();
  }, [user.id]);

  if (loading) return <LoadingSkeleton type="cards" count={6} />;
  const { classes, sessions, students, vocab, grammar } = data;

  const stats = [
    { icon: '🏫', title: 'Lớp học', value: classes.length, subtitle: 'Đang hoạt động', color: 'primary' },
    { icon: '👥', title: 'Học sinh', value: students.length, subtitle: 'Đã đăng ký', color: 'blue' },
    { icon: '📚', title: 'Buổi học', value: sessions.length, subtitle: 'Tổng số buổi', color: 'accent' },
    { icon: '📝', title: 'Từ vựng', value: vocab.length, subtitle: 'Từ vựng N5', color: 'amber' },
    { icon: '📖', title: 'Ngữ pháp', value: grammar.length, subtitle: 'Mẫu ngữ pháp', color: 'teal' },
    { icon: '🎮', title: 'Hoạt động', value: sessions.reduce((a, s) => a + (s.quiz?.length || 0) + (s.flashcards?.length || 0), 0), subtitle: 'Quiz & Flashcard', color: 'sakura' },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
          おはよう、<span className="gradient-text">{user.name}</span> 👋
        </h1>
        <p className="text-surface-500 mt-1">Chào mừng quay lại! Đây là tổng quan hoạt động.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((s, i) => <DashboardCard key={s.title} {...s} delay={i} />)}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Lớp học gần đây</h3>
        {classes.length === 0 ? (
          <p className="text-surface-500">Chưa có lớp học nào.</p>
        ) : (
          <div className="space-y-3">
            {classes.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">{c.thumbnail}</div>
                <div className="flex-1">
                  <p className="font-medium text-surface-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-surface-500">{c.schedule} · {(c.studentIds || []).length} học sinh</p>
                </div>
                <span className="badge-primary">{c.level}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
