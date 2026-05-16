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
import { getJapaneseGreeting } from '../../utils/greeting';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        console.log('[TeacherDashboard] 🔄 Loading data...');
        const results = await Promise.allSettled([
          classService.getByTeacher(user.id),
          sessionService.getAll(),
          userService.getStudents(),
          vocabularyService.getAllItems(),
          grammarService.getAllPoints(),
        ]);
        const [classes, allSessions, students, vocab, grammar] = results.map(r => r.status === 'fulfilled' ? r.value : []);
        results.forEach((r, i) => { if (r.status === 'rejected') console.error('[TeacherDashboard] ❌ Query', i, 'failed:', r.reason); });
        const sessions = allSessions.filter(s => classes.some(c => c.id === s.classId));
        console.log('[TeacherDashboard] ✅ Loaded:', classes.length, 'classes,', sessions.length, 'sessions,', students.length, 'students');
        setData({ classes, sessions, students, vocab, grammar });
      } catch (err) {
        console.error('[TeacherDashboard] ❌ Load error:', err);
        setData({ classes: [], sessions: [], students: [], vocab: [], grammar: [] });
      } finally {
        setLoading(false);
      }
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

  const greeting = getJapaneseGreeting();
  const displayName = user?.name || user?.full_name || 'Bạn';

  return (
    <div className="pb-12">
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-white tracking-tight mb-2">
          {greeting.text}、<span className="gradient-text">{displayName}</span> {greeting.emoji}
        </h1>
        <p className="text-surface-500 sm:text-lg">Chào mừng quay lại! Đây là tổng quan hoạt động.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-10">
        {stats.map((s, i) => <DashboardCard key={s.title} {...s} delay={i} />)}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
        className="glass-card">
        <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-4 mb-4">
          <h3 className="text-xl font-bold text-surface-900 dark:text-white">Lớp học gần đây</h3>
          <span className="text-sm font-medium text-surface-500 bg-surface-50 dark:bg-surface-800 px-3 py-1 rounded-full">{classes.length} lớp</span>
        </div>
        
        {classes.length === 0 ? (
          <p className="text-surface-500 text-sm text-center py-8">Chưa có lớp học nào được phân công.</p>
        ) : (
          <div className="space-y-3">
            {classes.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface-50/50 dark:bg-surface-800/40 border border-surface-100 dark:border-surface-800/50 hover:bg-white dark:hover:bg-surface-800 transition-all group cursor-pointer">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-2xl shadow-sm shadow-primary-500/20 group-hover:scale-110 transition-transform duration-300">{c.thumbnail}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-surface-900 dark:text-white text-base group-hover:text-primary-600 transition-colors truncate">{c.name}</p>
                  <p className="text-sm text-surface-500 mt-0.5 flex items-center gap-2 truncate">
                    <span className="opacity-80">📅</span> {c.schedule} 
                    <span className="text-surface-300 dark:text-surface-700">•</span> 
                    <span className="opacity-80">👥</span> {(c.studentIds || []).length} học sinh
                  </p>
                </div>
                <span className="badge-primary px-3 py-1 shrink-0">{c.level}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
