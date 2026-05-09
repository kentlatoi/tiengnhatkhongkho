import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const adminLinks = [
  { to: '/admin', icon: '📊', label: 'Dashboard' },
  { to: '/admin/accounts', icon: '👤', label: 'Quản lý tài khoản' },
  { to: '/admin/classes', icon: '🏫', label: 'Lớp học' },
  { to: '/admin/teachers', icon: '👩‍🏫', label: 'Giáo viên' },
  { to: '/admin/students', icon: '🎓', label: 'Học sinh' },
  { to: '/admin/logs', icon: '📋', label: 'Nhật ký hoạt động' },
  { to: '/admin/vocabulary', icon: '📝', label: 'Từ vựng N5' },
  { to: '/admin/grammar', icon: '📖', label: 'Ngữ pháp N5' },
  { to: '/admin/calendar', icon: '📅', label: 'Lịch học' },
];

const teacherLinks = [
  { to: '/teacher', icon: '📊', label: 'Dashboard' },
  { to: '/teacher/classes', icon: '🏫', label: 'Lớp học' },
  { to: '/teacher/students', icon: '👥', label: 'Học sinh' },
  { to: '/teacher/vocabulary', icon: '📝', label: 'Từ vựng N5' },
  { to: '/teacher/grammar', icon: '📖', label: 'Ngữ pháp N5' },
  { to: '/teacher/calendar', icon: '📅', label: 'Lịch học' },
];

const studentLinks = [
  { to: '/student', icon: '🏠', label: 'Trang chủ' },
  { to: '/student/vocabulary', icon: '📝', label: 'Từ vựng N5' },
  { to: '/student/grammar', icon: '📖', label: 'Ngữ pháp N5' },
  { to: '/student/calendar', icon: '📅', label: 'Lịch học' },
];

const roleLabels = { admin: 'Admin', teacher: 'Giáo viên', student: 'Học sinh' };
const roleColors = { admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', student: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' };

function DefaultAvatar({ name, size = 'w-9 h-9 text-sm' }) {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold shadow-md`}>
      {initials}
    </div>
  );
}

export { DefaultAvatar };

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, isAdmin, isTeacher } = useAuth();
  const links = isAdmin ? adminLinks : isTeacher ? teacherLinks : studentLinks;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const basePath = isAdmin ? '/admin' : isTeacher ? '/teacher' : '/student';

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-surface-200/50 dark:border-surface-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg shadow-lg shadow-primary-500/30">🎌</div>
          <div>
            <h1 className="text-lg font-bold text-surface-900 dark:text-white">JLPT学習</h1>
            <p className="text-xs text-surface-500">Japanese LMS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {links.map(link => (
          <NavLink key={link.to} to={link.to} end={link.to === basePath}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 shadow-sm' : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`
            }>
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-surface-200/50 dark:border-surface-700/50">
        <div onClick={() => { navigate(`${basePath}/profile`); onClose?.(); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 group">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <DefaultAvatar name={user?.name} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{user?.name}</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${roleColors[user?.role] || ''}`}>
              {roleLabels[user?.role] || user?.role}
            </span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} title="Đăng xuất"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sakura-50 dark:hover:bg-sakura-900/20 text-surface-400 hover:text-sakura-500 cursor-pointer transition-colors opacity-0 group-hover:opacity-100">
            🚪
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 glass-sidebar z-30">
        {sidebarContent}
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-72 glass-sidebar z-50 lg:hidden shadow-2xl">
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
