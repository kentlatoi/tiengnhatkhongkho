import { useState, useEffect } from 'react';
import DashboardCard from '../../components/ui/DashboardCard';
import userService from '../../services/userService';
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';
import activityLogService from '../../services/activityLogService';
import vocabularyService from '../../services/vocabularyService';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        console.log('[AdminDashboard] 🔄 Loading data...');
        const results = await Promise.allSettled([
          userService.getAll(),
          classService.getAll(),
          sessionService.getAll(),
          activityLogService.getAll(),
          vocabularyService.getAllItems(),
        ]);
        const [users, classes, sessions, logs, vocabItems] = results.map(r => r.status === 'fulfilled' ? r.value : []);
        results.forEach((r, i) => { if (r.status === 'rejected') console.error('[AdminDashboard] ❌ Query', i, 'failed:', r.reason); });
        console.log('[AdminDashboard] ✅ Loaded:', users.length, 'users,', classes.length, 'classes,', sessions.length, 'sessions');
        setData({ users, classes, sessions, logs, vocabItems });
      } catch (err) {
        console.error('[AdminDashboard] ❌ Load error:', err);
        setData({ users: [], classes: [], sessions: [], logs: [], vocabItems: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSkeleton type="cards" count={6} />;
  const { users, classes, sessions, logs, vocabItems } = data;

  const teachers = users.filter(u => u.role === 'teacher');
  const students = users.filter(u => u.role === 'student');

  const stats = [
    { icon: '👤', title: 'Tổng tài khoản', value: users.length, subtitle: `${teachers.length} GV · ${students.length} HS`, color: 'primary' },
    { icon: '👩‍🏫', title: 'Giáo viên', value: teachers.length, subtitle: 'Đang hoạt động', color: 'blue' },
    { icon: '🎓', title: 'Học sinh', value: students.length, subtitle: 'Đã đăng ký', color: 'accent' },
    { icon: '🏫', title: 'Lớp học', value: classes.length, subtitle: `${sessions.length} buổi học`, color: 'teal' },
    { icon: '📝', title: 'Từ vựng', value: vocabItems.length, subtitle: 'Từ vựng N5', color: 'amber' },
    { icon: '📋', title: 'Hoạt động', value: logs.length, subtitle: 'Tổng lượt ghi', color: 'sakura' },
  ];

  return (
    <div className="pb-12">
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-white tracking-tight mb-2">
          Bảng điều khiển <span className="gradient-text">Admin</span> 🛡️
        </h1>
        <p className="text-surface-500 sm:text-lg">Quản lý toàn bộ hệ thống JLPT学習.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-10">
        {stats.map((s, i) => <DashboardCard key={s.title} {...s} delay={i} />)}
      </div>

      {/* Recent activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
        className="glass-card">
        <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-4 mb-4">
          <h3 className="text-xl font-bold text-surface-900 dark:text-white">Hoạt động gần đây</h3>
          <span className="text-sm font-medium text-surface-500 bg-surface-50 dark:bg-surface-800 px-3 py-1 rounded-full">{logs.length} bản ghi</span>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
          {logs.slice(0, 15).map(log => (
            <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl bg-surface-50/50 dark:bg-surface-800/40 border border-surface-100 dark:border-surface-800/50 hover:bg-white dark:hover:bg-surface-800 transition-colors group">
              <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${
                log.role === 'admin' ? 'bg-amber-500 shadow-amber-500/20' : log.role === 'teacher' ? 'bg-blue-500 shadow-blue-500/20' : 'bg-primary-500 shadow-primary-500/20'
              }`}>{log.userName?.[0] || '?'}</div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-surface-900 dark:text-white leading-snug"><span className="font-bold text-surface-900 dark:text-white group-hover:text-primary-600 transition-colors">{log.userName}</span> đã {log.action}</p>
                <p className="text-xs text-surface-400 mt-1 flex items-center gap-1"><span className="opacity-70">🕒</span> {new Date(log.timestamp).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-surface-500 text-sm text-center py-8">Chưa có hoạt động nào được ghi nhận.</p>}
        </div>
      </motion.div>
    </div>
  );
}
