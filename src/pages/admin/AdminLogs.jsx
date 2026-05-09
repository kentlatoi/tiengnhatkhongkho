import { useState, useEffect } from 'react';
import activityLogService from '../../services/activityLogService';
import SearchBar from '../../components/ui/SearchBar';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion } from 'framer-motion';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    activityLogService.getAll().then(l => { setLogs(l); setLoading(false); });
  }, []);

  const filtered = logs.filter(l => {
    if (roleFilter !== 'all' && l.role !== roleFilter) return false;
    if (search) { const s = search.toLowerCase(); return [l.userName, l.userEmail, l.action].some(f => f?.toLowerCase().includes(s)); }
    return true;
  });

  const handleClear = async () => {
    if (confirm('Xóa toàn bộ nhật ký?')) {
      await activityLogService.clear();
      setLogs([]);
    }
  };

  const roleLabels = { admin: 'Admin', teacher: 'Giáo viên', student: 'Học sinh' };
  const roleColors = { admin: 'bg-amber-500', teacher: 'bg-blue-500', student: 'bg-primary-500' };

  if (loading) return <LoadingSkeleton type="table" />;

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Nhật ký hoạt động 📋</h1>
          <p className="text-surface-500 text-sm">{logs.length} hoạt động</p>
        </div>
        <button onClick={handleClear} className="btn-danger text-sm">Xóa tất cả</button>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Tìm theo tên, email, hành động..." /></div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'admin', 'teacher', 'student'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${roleFilter === r ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}`}>
              {r === 'all' ? 'Tất cả' : roleLabels[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <p className="text-surface-500 text-center py-12">Không có hoạt động nào.</p>
          ) : filtered.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${roleColors[log.role] || 'bg-surface-400'}`}>
                {log.userName?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-900 dark:text-white">
                  <span className="font-semibold">{log.userName}</span>
                  <span className="text-surface-400 mx-1.5">·</span>
                  <span className="text-surface-500">{log.action}</span>
                </p>
                <p className="text-xs text-surface-400">{log.userEmail} · {roleLabels[log.role]}</p>
              </div>
              <p className="text-xs text-surface-400 flex-shrink-0">{new Date(log.timestamp).toLocaleString('vi-VN')}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
