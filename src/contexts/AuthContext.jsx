import { createContext, useContext, useState, useEffect, useRef } from 'react';
import authService from '../services/authService';
import { supabase, isSupabase } from '../lib/supabaseClient';
import { usersStore, logActivity } from '../store/localStorage';

const AuthContext = createContext(null);

const AUTH_TIMEOUT_MS = 8000; // 8 second max loading time

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const loadingRef = useRef(true);
  const timeoutRef = useRef(null);

  // Keep loadingRef in sync with loading state
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Restore session on mount
  useEffect(() => {
    console.log('[AuthProvider] 🟢 Mounted');
    console.log('[AuthProvider] Supabase configured:', isSupabase());
    console.log('[AuthProvider] Data provider:', isSupabase() ? 'supabase' : 'localStorage');

    mounted.current = true;

    // Safety timeout — never stay on loading forever
    timeoutRef.current = setTimeout(() => {
      if (mounted.current && loadingRef.current) {
        console.warn('[AuthProvider] ⏰ Auth loading timeout after', AUTH_TIMEOUT_MS, 'ms');
        setLoading(false);
        setError('timeout');
      }
    }, AUTH_TIMEOUT_MS);

    const restore = async () => {
      try {
        if (isSupabase()) {
          console.log('[AuthProvider] 🔄 Supabase auth check started...');
          const u = await authService.getSession();
          if (mounted.current) {
            setUser(u);
            console.log('[AuthProvider] ✅ Auth check complete. User:', u ? u.name : 'none');
          }
        } else {
          console.log('[AuthProvider] 🔄 localStorage auth restore...');
          try {
            const saved = JSON.parse(localStorage.getItem('jlpt_current_user'));
            if (mounted.current) {
              setUser(saved);
              console.log('[AuthProvider] ✅ localStorage user:', saved ? saved.name : 'none');
            }
          } catch { /* ignore parse errors */ }
        }
      } catch (err) {
        console.error('[AuthProvider] ❌ Auth restore error:', err);
        if (mounted.current) setError(err.message || 'Auth error');
      } finally {
        if (mounted.current) {
          setLoading(false);
          console.log('[AuthProvider] 🏁 Loading finished');
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    restore();

    return () => {
      mounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for Supabase auth changes
  useEffect(() => {
    if (!isSupabase()) return;
    const { data: { subscription } } = authService.onAuthStateChange((u) => {
      console.log('[AuthProvider] 🔔 Auth state changed. User:', u ? u.name : 'none');
      setUser(u);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Persist to localStorage (fallback mode only)
  useEffect(() => {
    if (!isSupabase()) {
      if (user) localStorage.setItem('jlpt_current_user', JSON.stringify(user));
      else localStorage.removeItem('jlpt_current_user');
    }
  }, [user]);

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    if (result.success) setUser(result.user);
    return result;
  };

  const signup = async (data) => {
    const result = await authService.signup(data);
    if (result.success) setUser(result.user);
    return result;
  };

  const logout = async () => {
    if (!isSupabase() && user) logActivity(user, 'Đăng xuất');
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (data) => {
    if (!user) return;
    if (isSupabase()) {
      const mapped = {};
      if (data.name !== undefined) mapped.full_name = data.name;
      if (data.phone !== undefined) mapped.phone = data.phone;
      if (data.birthday !== undefined) mapped.birthday = data.birthday;
      if (data.bio !== undefined) mapped.bio = data.bio;
      if (data.avatar !== undefined) mapped.avatar_url = data.avatar;
      if (data.avatarUrl !== undefined) mapped.avatar_url = data.avatarUrl;
      if (Object.keys(mapped).length > 0) {
        await supabase.from('profiles').update(mapped).eq('id', user.id);
      }
    } else {
      usersStore.update(user.id, data);
    }
    const updated = { ...user, ...data };
    setUser(updated);
    return updated;
  };

  const refreshUser = async () => {
    if (!user) return;
    if (isSupabase()) {
      const u = await authService.getSession();
      if (u) setUser(u);
    } else {
      const fresh = usersStore.getById(user.id);
      if (fresh) setUser(fresh);
    }
  };

  // Loading screen with timeout fallback
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎌</div>
          <p className="text-surface-500 text-sm">Đang tải...</p>
          <p className="text-surface-400 text-xs mt-2">
            {isSupabase() ? 'Kết nối Supabase...' : 'Khởi tạo dữ liệu...'}
          </p>
        </div>
      </div>
    );
  }

  // Error fallback UI
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
            {error === 'timeout' ? 'Kết nối quá lâu' : 'Không thể tải ứng dụng'}
          </h2>
          <p className="text-surface-500 text-sm mb-6">
            {error === 'timeout'
              ? 'Vui lòng kiểm tra kết nối internet hoặc cấu hình Supabase.'
              : `Lỗi: ${error}`}
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors">
              🔄 Tải lại trang
            </button>
            <button onClick={() => { setError(null); setLoading(false); }}
              className="px-6 py-2.5 rounded-xl bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300 font-medium hover:bg-surface-300 dark:hover:bg-surface-700 transition-colors">
              Đi tới đăng nhập
            </button>
          </div>
          <p className="text-surface-400 text-xs mt-6">
            Nếu vấn đề tiếp tục, liên hệ Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user, login, signup, logout, updateProfile, refreshUser,
      isAdmin: user?.role === 'admin',
      isTeacher: user?.role === 'teacher',
      isStudent: user?.role === 'student',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
