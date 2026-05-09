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
        const [users, classes, sessions, logs, vocabItems] = await Promise.all([
          userService.getAll(),
          classService.getAll(),
          sessionService.getAll(),
          activityLogService.getAll(),
          vocabularyService.getAllItems(),
        ]);
        setData({ users, classes, sessions, logs, vocabItems });
      } catch (err) {
        console.error('AdminDashboard load error:', err);
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
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
          Bảng điều khiển <span className="gradient-text">Admin</span> 🛡️
        </h1>
        <p className="text-surface-500 mt-1">Quản lý toàn bộ hệ thống JLPT学習.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((s, i) => <DashboardCard key={s.title} {...s} delay={i} />)}
      </div>

      {/* Recent activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Hoạt động gần đây</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {logs.slice(0, 10).map(log => (
            <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                log.role === 'admin' ? 'bg-amber-500' : log.role === 'teacher' ? 'bg-blue-500' : 'bg-primary-500'
              }`}>{log.userName?.[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-900 dark:text-white"><span className="font-medium">{log.userName}</span> — {log.action}</p>
                <p className="text-xs text-surface-400">{new Date(log.timestamp).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-surface-500 text-sm">Chưa có hoạt động.</p>}
        </div>
      </motion.div>
    </div>
  );
}
