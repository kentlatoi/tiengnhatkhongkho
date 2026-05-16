import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        const r = result.user.role;
        navigate(r === 'admin' ? '/admin' : r === 'teacher' ? '/teacher' : '/student');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-700" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
          className="relative z-10 text-center text-white px-12">
          <div className="text-8xl mb-6">🎌</div>
          <h2 className="text-4xl font-bold mb-4">JLPT学習</h2>
          <p className="text-xl text-primary-100 mb-2">Japanese Learning Management</p>
          <p className="text-primary-200">Nền tảng quản lý học tiếng Nhật chuyên nghiệp</p>
          <div className="mt-8 flex gap-3 justify-center">
            {['N5', 'N4', 'N3', 'N2', 'N1'].map((l, i) => (
              <motion.span key={l} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold backdrop-blur-sm">
                {l}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <span className="text-5xl">🎌</span>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white mt-3">JLPT学習</h1>
          </div>
          <div className="glass-card">
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">Đăng nhập</h2>
            <p className="text-surface-500 mb-6">Chào mừng bạn quay lại!</p>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-sakura-500/10 border border-sakura-500/20 text-sakura-500 text-sm">
                {error}
              </motion.div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="email@example.com" disabled={loading} />
              </div>
              <div>
                <label className="input-label">Mật khẩu</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input" placeholder="••••••••" disabled={loading} />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="rememberMe" 
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)} 
                  disabled={loading}
                  className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500 bg-white dark:bg-surface-800 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-sm font-medium text-surface-600 dark:text-surface-400 cursor-pointer select-none">
                  Ghi nhớ đăng nhập
                </label>
              </div>
              <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang đăng nhập...
                  </span>
                ) : 'Đăng nhập →'}
              </button>
            </form>
            <p className="text-center text-sm text-surface-500 mt-6">
              Chưa có tài khoản?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium">Đăng ký học sinh</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
