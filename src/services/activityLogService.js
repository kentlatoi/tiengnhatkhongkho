/**
 * Activity Log Service — activity_logs table + localStorage fallback
 *
 * Supabase columns: user_id, user_name, user_role, action, timestamp/created_at
 * Note: user_email may not exist in all schemas — we include it defensively
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { activityLogsStore } from '../store/localStorage';

export const LOG_ACTIONS = {
  LOGIN: 'Đăng nhập hệ thống', LOGOUT: 'Đăng xuất', SIGNUP: 'Đăng ký tài khoản mới',
  ADMIN_OPENED_CLASS: 'Xem chi tiết lớp học', ADMIN_DELETED_CLASS: 'Xóa lớp học',
  ADMIN_EDITED_CALENDAR: 'Chỉnh sửa sự kiện lịch',
  TEACHER_CREATED_CALENDAR: 'Tạo sự kiện lịch', TEACHER_EDITED_CALENDAR: 'Chỉnh sửa sự kiện lịch',
  TEACHER_DELETED_CALENDAR: 'Xóa sự kiện lịch', TEACHER_ADDED_SESSION: 'Thêm buổi học',
  TEACHER_UPLOADED_DOCUMENT: 'Upload tài liệu', TEACHER_UPLOADED_LISTENING: 'Upload file nghe',
  STUDENT_OPENED_CALENDAR: 'Xem sự kiện lịch', STUDENT_PLAYED_AUDIO: 'Nghe file audio',
  STUDENT_DOWNLOADED_FILE: 'Tải file',
};

function mapLog(l) {
  return {
    id: l.id,
    userId: l.user_id || l.userId || '',
    userName: l.user_name || l.userName || '',
    userEmail: l.user_email || l.userEmail || '',
    role: l.user_role || l.role || '',
    action: l.action || '',
    timestamp: l.created_at || l.timestamp || '',
  };
}

const activityLogService = {
  getAll: async () => {
    if (isSupabase()) {
      console.log('[activityLog] 🔄 Loading logs...');
      const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) {
        console.error('[activityLog] ❌ Load error:', error);
        return []; // Don't throw — logs should never crash the app
      }
      console.log('[activityLog] ✅ Loaded', (data || []).length, 'logs');
      return (data || []).map(mapLog);
    }
    return activityLogsStore.getAll();
  },

  log: async (user, action, extra = {}) => {
    if (!user) return;
    if (isSupabase()) {
      const payload = {
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
        action,
      };
      console.log('[activityLog] 📤 Logging:', action);
      try {
        const { error } = await supabase.from('activity_logs').insert(payload);
        if (error) console.error('[activityLog] ❌ Insert error:', error);
      } catch (err) {
        // Fire-and-forget — never let logging crash the app
        console.error('[activityLog] ❌ Insert failed:', err.message);
      }
      return;
    }
    activityLogsStore.add({
      userId: user.id, userName: user.name, userEmail: user.email,
      role: user.role, action, ...extra,
    });
  },

  clear: async () => {
    if (isSupabase()) {
      const { error } = await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('[activityLog] ❌ Clear error:', error);
      return;
    }
    activityLogsStore.clear();
  },

  getByRole: async (role) => {
    if (isSupabase()) {
      if (role === 'all') return activityLogService.getAll();
      const { data, error } = await supabase.from('activity_logs').select('*').eq('user_role', role).order('created_at', { ascending: false }).limit(500);
      if (error) {
        console.error('[activityLog] ❌ getByRole error:', error);
        return [];
      }
      return (data || []).map(mapLog);
    }
    if (role === 'all') return activityLogsStore.getAll();
    return activityLogsStore.getAll().filter(l => l.role === role);
  },

  search: async (query, roleFilter = 'all') => {
    let logs = await activityLogService.getByRole(roleFilter);
    if (query) {
      const q = query.toLowerCase();
      logs = logs.filter(l => [l.userName, l.userEmail, l.action].some(f => f?.toLowerCase().includes(q)));
    }
    return logs;
  },
};

export default activityLogService;
