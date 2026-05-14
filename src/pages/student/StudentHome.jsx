import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import classService from '../../services/classService';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { useToast } from '../../components/ui/Toast';
import { motion } from 'framer-motion';
import { getJapaneseGreeting } from '../../utils/greeting';

export default function StudentHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        console.log('[StudentHome] 🔄 Loading classes...');
        const c = await classService.getByStudent(user.id);
        console.log('[StudentHome] ✅ Loaded', c.length, 'classes');
        setClasses(c);
      } catch (err) {
        console.error('[StudentHome] ❌ Load error:', err);
        toast?.(err.message || 'Lỗi tải danh sách lớp', 'error');
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id, toast]);

  if (loading) return <LoadingSkeleton type="cards" count={3} />;

  const greeting = getJapaneseGreeting();
  const displayName = user?.name || user?.full_name || 'Bạn';

  return (
    <div className="pb-12">
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-white tracking-tight mb-2">
          {greeting.text}、<span className="gradient-text">{displayName}</span> {greeting.emoji}
        </h1>
        <p className="text-surface-500 sm:text-lg">Chào mừng bạn! Hãy tiếp tục hành trình học tiếng Nhật.</p>
      </motion.div>

      {classes.length === 0 ? (
        <EmptyState icon="📚" title="Chưa có lớp học" description="Bạn chưa được phân vào lớp nào. Hãy liên hệ giáo viên." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
          {classes.map((cls, i) => (
            <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="glass-card group cursor-pointer flex flex-col h-full" onClick={() => navigate(`/student/class/${cls.id}`)}>
              <div className="flex items-start justify-between mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-3xl shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform duration-300">
                  {cls.thumbnail}
                </div>
                <span className="badge-primary px-3 py-1 text-sm">{cls.level}</span>
              </div>
              <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2 leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{cls.name}</h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-1 flex items-center gap-2">👩‍🏫 {cls.teacherName}</p>
              <p className="text-xs text-surface-400 mb-5 flex items-center gap-2">📅 {cls.schedule}</p>
              
              <div className="mt-auto pt-4 border-t border-surface-200 dark:border-surface-700/50">
                <button className="btn-primary w-full py-3 text-sm flex justify-center items-center gap-2 group-hover:bg-primary-600 transition-colors">
                  Vào lớp học
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
