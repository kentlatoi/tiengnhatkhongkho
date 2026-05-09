/**
 * Activity Log Service — activity_logs table + localStorage fallback
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
    role: l.role || '',
    action: l.action || '',
    timestamp: l.created_at || l.timestamp || '',
  };
}

const activityLogService = {
  getAll: async () => {
    if (isSupabase()) {
      const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500);
      return (data || []).map(mapLog);
    }
    return activityLogsStore.getAll();
  },

  log: async (user, action, extra = {}) => {
    if (!user) return;
    if (isSupabase()) {
      await supabase.from('activity_logs').insert({
        user_id: user.id, user_name: user.name, user_email: user.email,
        role: user.role, action, ...extra,
      });
      return;
    }
    activityLogsStore.add({
      userId: user.id, userName: user.name, userEmail: user.email,
      role: user.role, action, ...extra,
    });
  },

  clear: async () => {
    if (isSupabase()) {
      await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return;
    }
    activityLogsStore.clear();
  },

  getByRole: async (role) => {
    if (isSupabase()) {
      if (role === 'all') return activityLogService.getAll();
      const { data } = await supabase.from('activity_logs').select('*').eq('role', role).order('created_at', { ascending: false }).limit(500);
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
