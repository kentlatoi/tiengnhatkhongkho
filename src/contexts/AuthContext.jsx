import { createContext, useContext, useState, useEffect } from 'react';
import { usersStore, logActivity } from '../store/localStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jlpt_current_user')); } catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem('jlpt_current_user', JSON.stringify(user));
    else localStorage.removeItem('jlpt_current_user');
  }, [user]);

  const login = (email, password) => {
    const u = usersStore.getByEmail(email);
    if (!u) return { success: false, error: 'Email không tồn tại' };
    if (u.password !== password) return { success: false, error: 'Mật khẩu không đúng' };
    const now = new Date().toISOString();
    usersStore.update(u.id, { lastLogin: now });
    const updatedUser = { ...u, lastLogin: now };
    setUser(updatedUser);
    logActivity(updatedUser, 'Đăng nhập hệ thống');
    return { success: true, user: updatedUser };
  };

  const signup = (data) => {
    if (usersStore.getByEmail(data.email)) return { success: false, error: 'Email đã được sử dụng' };
    const now = new Date().toISOString();
    const newUser = {
      ...data, id: 'user-' + Date.now(), role: 'student',
      avatar: '', phone: '', birthday: '', bio: '',
      createdAt: now.slice(0, 10), lastLogin: now,
    };
    usersStore.add(newUser);
    setUser(newUser);
    logActivity(newUser, 'Đăng ký tài khoản mới');
    return { success: true, user: newUser };
  };

  const logout = () => {
    if (user) logActivity(user, 'Đăng xuất');
    setUser(null);
  };

  const updateProfile = (data) => {
    if (!user) return;
    usersStore.update(user.id, data);
    const updated = { ...user, ...data };
    setUser(updated);
    return updated;
  };

  const refreshUser = () => {
    if (!user) return;
    const fresh = usersStore.getById(user.id);
    if (fresh) setUser(fresh);
  };

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
