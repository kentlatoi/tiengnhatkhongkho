/**
 * Auth Service — Supabase Auth with localStorage fallback
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { usersStore, logActivity } from '../store/localStorage';

/**
 * Find profile by auth user — tries auth_id first, then email fallback
 */
async function findProfile(authUser) {
  console.log('[Auth] 🔍 Profile query started for:', authUser.id, authUser.email);

  // Try 1: match by auth_id column
  let { data: profile, error } = await supabase
    .from('profiles').select('*').eq('auth_id', authUser.id).maybeSingle();
  if (profile) { console.log('[Auth] ✅ Profile found by auth_id'); return profile; }

  // Try 2: match by id column (legacy — profile.id = auth.user.id)
  ({ data: profile, error } = await supabase
    .from('profiles').select('*').eq('id', authUser.id).maybeSingle());
  if (profile) { console.log('[Auth] ✅ Profile found by id'); return profile; }

  // Try 3: match by email
  ({ data: profile, error } = await supabase
    .from('profiles').select('*').eq('email', authUser.email).maybeSingle());
  if (profile) { console.log('[Auth] ✅ Profile found by email'); return profile; }

  console.error('[Auth] ❌ Profile not found. auth_id:', authUser.id, 'email:', authUser.email, 'error:', error);
  return null;
}

const authService = {
  /**
   * Login with email + password
   * Returns { success, user, error }
   */
  login: async (email, password) => {
    if (isSupabase()) {
      console.log('[Auth] 🔐 Supabase login started for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[Auth] ❌ Login error:', error.message);
        return { success: false, error: error.message };
      }
      console.log('[Auth] ✅ Supabase auth success, fetching profile...');
      const profile = await findProfile(data.user);
      if (!profile) return { success: false, error: 'Không tìm thấy hồ sơ người dùng. Liên hệ Admin.' };
      const user = mapProfile(profile);
      // Log activity (fire-and-forget)
      supabase.from('activity_logs').insert({
        user_id: user.id, user_name: user.name, user_email: user.email,
        role: user.role, action: 'Đăng nhập hệ thống',
      }).then(() => {}).catch(() => {});
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
      // Insert profile with auth_id
      const { error: pErr } = await supabase.from('profiles').insert({
        auth_id: authData.user.id,
        email: data.email,
        full_name: data.name,
        role: 'student',
      });
      if (pErr) return { success: false, error: pErr.message };
      const user = { id: authData.user.id, email: data.email, name: data.name, role: 'student', avatar: '', phone: '', birthday: '', bio: '' };
      supabase.from('activity_logs').insert({
        user_id: user.id, user_name: user.name, user_email: user.email,
        role: 'student', action: 'Đăng ký tài khoản mới',
      }).then(() => {}).catch(() => {});
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
      const { data: authData, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });
      if (error) return { success: false, error: error.message };
      const { error: pErr } = await supabase.from('profiles').insert({
        auth_id: authData.user.id,
        email: userData.email,
        full_name: userData.name,
        role: userData.role || 'student',
        phone: userData.phone || '',
        birthday: userData.birthday || null,
        bio: userData.bio || '',
      });
      if (pErr) return { success: false, error: pErr.message };
      if (adminUser) {
        supabase.from('activity_logs').insert({
          user_id: adminUser.id, user_name: adminUser.name, user_email: adminUser.email,
          role: adminUser.role, action: `Tạo tài khoản ${userData.role}: ${userData.name}`,
        }).then(() => {}).catch(() => {});
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
   * Returns mapped user or null
   */
  getSession: async () => {
    if (!isSupabase()) return null;
    console.log('[Auth] 🔄 getSession started...');
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth] ❌ getSession error:', error.message);
      return null;
    }
    if (!data.session) {
      console.log('[Auth] ℹ️ No active session');
      return null;
    }
    console.log('[Auth] ✅ Session found, user:', data.session.user.id);
    const profile = await findProfile(data.session.user);
    if (!profile) {
      console.warn('[Auth] ⚠️ Session exists but no profile found');
      return null;
    }
    console.log('[Auth] ✅ Profile loaded:', profile.full_name, profile.role);
    return mapProfile(profile);
  },

  /**
   * Listen for auth state changes (Supabase only)
   */
  onAuthStateChange: (callback) => {
    if (!isSupabase()) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] 🔔 Auth state change:', event);
      if (event === 'SIGNED_IN' && session) {
        const profile = await findProfile(session.user);
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
    authId: p.auth_id || p.id,
    name: p.full_name || '',
    email: p.email || '',
    role: p.role || 'student',
    avatar: p.avatar_url || '',
    avatarUrl: p.avatar_url || '',
    phone: p.phone || '',
    birthday: p.birthday || '',
    bio: p.bio || '',
    createdAt: p.created_at || '',
    lastLogin: p.last_login || '',
  };
}

export { mapProfile };
export default authService;
