import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    setLoading(true);
    try {
      const result = await signup(form);
      if (result.success) {
        navigate('/student');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🎌</span>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white mt-3">Đăng ký học sinh</h1>
          <p className="text-surface-500 mt-1">Bắt đầu hành trình học tiếng Nhật</p>
        </div>
        <div className="glass-card">
          <div className="mb-4 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-sm text-primary-700 dark:text-primary-400">
            📌 Trang đăng ký chỉ dành cho <strong>học sinh</strong>. Tài khoản giáo viên được tạo bởi Admin.
          </div>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-sakura-500/10 border border-sakura-500/20 text-sakura-500 text-sm">
              {error}
            </motion.div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Họ và tên</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} required className="input" placeholder="Nguyễn Văn A" disabled={loading} />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required className="input" placeholder="email@example.com" disabled={loading} />
            </div>
            <div>
              <label className="input-label">Mật khẩu</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)} required className="input" placeholder="Tối thiểu 6 ký tự" disabled={loading} />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng ký...
                </span>
              ) : 'Đăng ký →'}
            </button>
          </form>
          <p className="text-center text-sm text-surface-500 mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Đăng nhập</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
