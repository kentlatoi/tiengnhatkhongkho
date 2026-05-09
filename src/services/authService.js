/**
 * Auth Service — Supabase Auth with localStorage fallback
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { usersStore, logActivity } from '../store/localStorage';

const authService = {
  /**
   * Login with email + password
   * Returns { success, user, error }
   */
  login: async (email, password) => {
    if (isSupabase()) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      // Fetch profile
      const { data: profile, error: pErr } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).single();
      if (pErr || !profile) return { success: false, error: 'Không tìm thấy hồ sơ người dùng' };
      const user = mapProfile(profile);
      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id, user_name: user.name, user_email: user.email,
        role: user.role, action: 'Đăng nhập hệ thống',
      });
      return { success: true, user };
    }
    // localStorage fallback
    const u = usersStore.getByEmail(email);
    if (!u) return { success: false, error: 'Email không tồn tại' };
    if (u.password !== password) return { success: false, error: 'Mật khẩu không đúng' };
    const now = new Date().toISOString();
    usersStore.update(u.id, { lastLogin: now });
    const user = { ...u, lastLogin: now };
    logActivity(user, 'Đăng nhập hệ thống');
    return { success: true, user };
  },

  /**
   * Sign up (student only)
   */
  signup: async (data) => {
    if (isSupabase()) {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { full_name: data.name } },
      });
      if (error) return { success: false, error: error.message };
      // Insert profile
      const { error: pErr } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: data.email,
        full_name: data.name,
        role: 'student',
      });
      if (pErr) return { success: false, error: pErr.message };
      const user = { id: authData.user.id, email: data.email, name: data.name, role: 'student', avatar: '', phone: '', birthday: '', bio: '' };
      await supabase.from('activity_logs').insert({
        user_id: user.id, user_name: user.name, user_email: user.email,
        role: 'student', action: 'Đăng ký tài khoản mới',
      });
      return { success: true, user };
    }
    // localStorage fallback
    if (usersStore.getByEmail(data.email)) return { success: false, error: 'Email đã được sử dụng' };
    const now = new Date().toISOString();
    const user = {
      ...data, id: 'user-' + Date.now(), role: 'student',
      avatar: '', phone: '', birthday: '', bio: '',
      createdAt: now.slice(0, 10), lastLogin: now,
    };
    usersStore.add(user);
    logActivity(user, 'Đăng ký tài khoản mới');
    return { success: true, user };
  },

  /**
   * Admin creates a user (teacher or student)
   */
  createUser: async (userData, adminUser) => {
    if (isSupabase()) {
      // Use Supabase Auth admin invite or signUp
      const { data: authData, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });
      if (error) return { success: false, error: error.message };
      const { error: pErr } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.name,
        role: userData.role || 'student',
        phone: userData.phone || '',
        birthday: userData.birthday || '',
        bio: userData.bio || '',
      });
      if (pErr) return { success: false, error: pErr.message };
      if (adminUser) {
        await supabase.from('activity_logs').insert({
          user_id: adminUser.id, user_name: adminUser.name, user_email: adminUser.email,
          role: adminUser.role, action: `Tạo tài khoản ${userData.role}: ${userData.name}`,
        });
      }
      return { success: true, user: { id: authData.user.id, ...userData } };
    }
    // localStorage fallback
    if (usersStore.getByEmail(userData.email)) return { success: false, error: 'Email đã được sử dụng' };
    const user = {
      ...userData, id: 'user-' + Date.now(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    usersStore.add(user);
    if (adminUser) logActivity(adminUser, `Tạo tài khoản ${userData.role}: ${userData.name}`);
    return { success: true, user };
  },

  logout: async () => {
    if (isSupabase()) {
      await supabase.auth.signOut();
    }
  },

  /**
   * Get current session (Supabase only)
   */
  getSession: async () => {
    if (!isSupabase()) return null;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', data.session.user.id).single();
    return profile ? mapProfile(profile) : null;
  },

  /**
   * Listen for auth state changes (Supabase only)
   */
  onAuthStateChange: (callback) => {
    if (!isSupabase()) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: profile } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single();
        callback(profile ? mapProfile(profile) : null);
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });
  },
};

/** Map Supabase snake_case profile to camelCase app user */
function mapProfile(p) {
  return {
    id: p.id,
    name: p.full_name || '',
    email: p.email || '',
    role: p.role || 'student',
    avatar: p.avatar_url || '',
    phone: p.phone || '',
    birthday: p.birthday || '',
    bio: p.bio || '',
    createdAt: p.created_at || '',
    lastLogin: p.last_login || '',
  };
}

export { mapProfile };
export default authService;
