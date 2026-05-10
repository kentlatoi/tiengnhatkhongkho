/**
 * Calendar Service — calendar_events + localStorage fallback
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { calendarStore, classesStore } from '../store/localStorage';
import activityLogService from './activityLogService';

function mapEvent(e) {
  return {
    id: e.id,
    eventId: e.id,
    classId: e.class_id || e.classId || '',
    className: e.class_name || e.className || '',
    teacherId: e.teacher_id || e.teacherId || '',
    teacherName: e.teacher_name || e.teacherName || '',
    lessonSessionId: e.lesson_session_id || e.lessonSessionId || '',
    title: e.title || '',
    date: e.date || '',
    startTime: e.start_time || e.startTime || e.time || '',
    endTime: e.end_time || e.endTime || '',
    time: e.start_time || e.startTime || e.time || '',
    content: e.content || '',
    homework: e.homework || '',
    location: e.location || '',
    meetingLink: e.meeting_link || e.meetingLink || '',
    notes: e.content || e.notes || '',
    createdBy: e.created_by || e.createdBy || '',
    createdAt: e.created_at || e.createdAt || '',
    updatedAt: e.updated_at || e.updatedAt || '',
  };
}

function uuidOrNull(value) {
  return value && String(value).trim() !== '' ? value : null;
}

function toDb(data) {
  const d = {};
  if (data.classId !== undefined) d.class_id = uuidOrNull(data.classId);
  if (data.className !== undefined) d.class_name = data.className;
  if (data.teacherId !== undefined) d.teacher_id = uuidOrNull(data.teacherId);
  if (data.teacherName !== undefined) d.teacher_name = data.teacherName;
  if (data.lessonSessionId !== undefined) d.lesson_session_id = uuidOrNull(data.lessonSessionId);
  if (data.title !== undefined) d.title = data.title;
  if (data.date !== undefined) d.date = data.date;
  if (data.startTime !== undefined) d.start_time = data.startTime || null;
  if (data.endTime !== undefined) d.end_time = data.endTime || null;
  if (data.content !== undefined) d.content = data.content;
  if (data.homework !== undefined) d.homework = data.homework;
  if (data.location !== undefined) d.location = data.location;
  if (data.meetingLink !== undefined) d.meeting_link = data.meetingLink;
  if (data.createdBy !== undefined) d.created_by = uuidOrNull(data.createdBy);
  return d;
}

const calendarService = {
  getAll: async () => {
    if (isSupabase()) {
      console.log('[calendar] 🔄 Loading all events...');
      const { data, error } = await supabase.from('calendar_events').select('*').order('date', { ascending: false });
      if (error) {
        console.error('[calendar] ❌ Load error:', error);
        throw error;
      }
      console.log('[calendar] ✅ Loaded', (data || []).length, 'events');
      return (data || []).map(mapEvent);
    }
    return calendarStore.getAll();
  },

  getById: async (id) => {
    if (isSupabase()) {
      const { data } = await supabase.from('calendar_events').select('*').eq('id', id).single();
      return data ? mapEvent(data) : null;
    }
    return calendarStore.getById(id);
  },

  getByClass: async (classId) => {
    if (isSupabase()) {
      const { data } = await supabase.from('calendar_events').select('*').eq('class_id', classId).order('date');
      return (data || []).map(mapEvent);
    }
    return calendarStore.getByClass(classId);
  },

  getByTeacher: async (teacherId) => {
    if (isSupabase()) {
      const { data } = await supabase.from('calendar_events').select('*').eq('teacher_id', teacherId).order('date');
      return (data || []).map(mapEvent);
    }
    return calendarStore.getByTeacher(teacherId);
  },

  getByStudent: async (studentId) => {
    if (isSupabase()) {
      const { data: members } = await supabase.from('class_members').select('class_id').eq('student_id', studentId);
      if (!members || members.length === 0) return [];
      const classIds = members.map(m => m.class_id);
      const { data } = await supabase.from('calendar_events').select('*').in('class_id', classIds).order('date');
      return (data || []).map(mapEvent);
    }
    const studentClasses = classesStore.getByStudent(studentId);
    return calendarStore.getAll().filter(e => studentClasses.some(c => c.id === e.classId));
  },

  create: async (eventData, user) => {
    if (isSupabase()) {
      const dbData = toDb(eventData);
      dbData.created_by = uuidOrNull(user?.id);
      console.log('[CalendarEvent] payload:', dbData);
      const { data, error } = await supabase.from('calendar_events').insert(dbData).select('*').single();
      if (error) {
        console.error('[CalendarEvent] save error:', error);
        throw error;
      }
      console.log('[calendar] ✅ Event created:', data.id);
      if (user) activityLogService.log(user, `Tạo sự kiện lịch: ${eventData.title}`).catch(() => {});
      return mapEvent(data);
    }
    const event = { ...eventData, id: eventData.id || 'evt-' + Date.now(), createdBy: user?.id || '', createdAt: new Date().toISOString() };
    calendarStore.add(event);
    if (user) activityLogService.log(user, `Tạo sự kiện lịch: ${event.title}`);
    return event;
  },

  update: async (id, data, user) => {
    if (isSupabase()) {
      const dbData = toDb(data);
      console.log('[CalendarEvent] update payload:', dbData);
      const { error } = await supabase.from('calendar_events').update(dbData).eq('id', id);
      if (error) {
        console.error('[CalendarEvent] update error:', error);
        throw error;
      }
      if (user) activityLogService.log(user, `Cập nhật sự kiện lịch: ${data.title || id}`).catch(() => {});
      return { id, ...data };
    }
    calendarStore.update(id, { ...data, updatedAt: new Date().toISOString() });
    if (user) activityLogService.log(user, `Cập nhật sự kiện lịch: ${data.title || id}`);
    return { id, ...data };
  },

  remove: async (id, user) => {
    if (isSupabase()) {
      const evt = await calendarService.getById(id);
      await supabase.from('calendar_events').delete().eq('id', id);
      if (user && evt) await activityLogService.log(user, `Xóa sự kiện lịch: ${evt.title}`);
      return;
    }
    const event = calendarStore.getById(id);
    calendarStore.remove(id);
    if (user && event) activityLogService.log(user, `Xóa sự kiện lịch: ${event.title}`);
  },

  filter: async (filters = {}) => {
    let events = await calendarService.getAll();
    if (filters.classId && filters.classId !== 'all') events = events.filter(e => e.classId === filters.classId);
    if (filters.teacherId && filters.teacherId !== 'all') events = events.filter(e => e.teacherId === filters.teacherId);
    if (filters.year != null && filters.month != null) {
      events = events.filter(e => { const d = new Date(e.date); return d.getFullYear() === filters.year && d.getMonth() === filters.month; });
    }
    return events;
  },
};

export default calendarService;
