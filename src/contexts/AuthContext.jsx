import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { supabase, isSupabase } from '../lib/supabaseClient';
import { usersStore, logActivity } from '../store/localStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      if (isSupabase()) {
        const u = await authService.getSession();
        setUser(u);
      } else {
        try {
          const saved = JSON.parse(localStorage.getItem('jlpt_current_user'));
          setUser(saved);
        } catch { /* ignore */ }
      }
      setLoading(false);
    };
    restore();
  }, []);

  // Listen for Supabase auth changes
  useEffect(() => {
    if (!isSupabase()) return;
    const { data: { subscription } } = authService.onAuthStateChange((u) => {
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
      await supabase.from('profiles').update(mapped).eq('id', user.id);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎌</div>
          <p className="text-surface-500 text-sm">Đang tải...</p>
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
