/**
 * Class Service — classes + class_members + localStorage fallback
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { classesStore, sessionsStore, calendarStore } from '../store/localStorage';
import activityLogService from './activityLogService';

function mapClass(c) {
  return {
    id: c.id,
    name: c.name || '',
    description: c.description || '',
    level: c.level || 'N5',
    schedule: c.schedule || '',
    teacherId: c.teacher_id || c.teacherId || '',
    teacherName: c.teacher_name || c.teacherName || '',
    thumbnail: c.thumbnail || '🗻',
    studentIds: c.studentIds || [],
    createdAt: c.created_at || c.createdAt || '',
  };
}

function toDb(data) {
  const d = {};
  if (data.name !== undefined) d.name = data.name;
  if (data.description !== undefined) d.description = data.description;
  if (data.level !== undefined) d.level = data.level;
  if (data.schedule !== undefined) d.schedule = data.schedule;
  if (data.teacherId !== undefined) d.teacher_id = data.teacherId;
  if (data.teacherName !== undefined) d.teacher_name = data.teacherName;
  if (data.thumbnail !== undefined) d.thumbnail = data.thumbnail;
  return d;
}

const classService = {
  getAll: async () => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('classes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapClass);
    }
    return classesStore.getAll();
  },

  getById: async (id) => {
    if (isSupabase()) {
      const { data } = await supabase.from('classes').select('*').eq('id', id).single();
      return data ? mapClass(data) : null;
    }
    return classesStore.getById(id);
  },

  getByTeacher: async (teacherId) => {
    if (isSupabase()) {
      const { data } = await supabase.from('classes').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
      return (data || []).map(mapClass);
    }
    return classesStore.getByTeacher(teacherId);
  },

  getByStudent: async (studentId) => {
    if (isSupabase()) {
      const { data } = await supabase
        .from('class_members').select('class_id').eq('student_id', studentId);
      if (!data || data.length === 0) return [];
      const classIds = data.map(m => m.class_id);
      const { data: classes } = await supabase.from('classes').select('*').in('id', classIds);
      return (classes || []).map(mapClass);
    }
    return classesStore.getByStudent(studentId);
  },

  getStudentIds: async (classId) => {
    if (isSupabase()) {
      const { data } = await supabase.from('class_members').select('student_id').eq('class_id', classId);
      return (data || []).map(m => m.student_id);
    }
    const cls = classesStore.getById(classId);
    return cls?.studentIds || [];
  },

  create: async (classData, user) => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('classes').insert(toDb(classData)).select().single();
      if (error) throw error;
      if (user) await activityLogService.log(user, `Tạo lớp học: ${classData.name}`);
      return mapClass(data);
    }
    const cls = { ...classData, id: classData.id || 'class-' + Date.now(), studentIds: classData.studentIds || [], createdAt: new Date().toISOString().slice(0, 10) };
    classesStore.add(cls);
    if (user) activityLogService.log(user, `Tạo lớp học: ${cls.name}`);
    return cls;
  },

  update: async (id, data, user) => {
    if (isSupabase()) {
      const { error } = await supabase.from('classes').update(toDb(data)).eq('id', id);
      if (error) throw error;
      if (user) await activityLogService.log(user, `Cập nhật lớp học: ${data.name || id}`);
      return { id, ...data };
    }
    const result = classesStore.update(id, { ...data, updatedAt: new Date().toISOString() });
    if (user) activityLogService.log(user, `Cập nhật lớp học: ${data.name || id}`);
    return result;
  },

  assignStudents: async (classId, studentIds, user) => {
    if (isSupabase()) {
      // Remove existing members
      await supabase.from('class_members').delete().eq('class_id', classId);
      // Insert new members
      if (studentIds.length > 0) {
        const rows = studentIds.map(sid => ({ class_id: classId, student_id: sid }));
        await supabase.from('class_members').insert(rows);
      }
      if (user) await activityLogService.log(user, `Cập nhật danh sách học sinh lớp`);
      return;
    }
    classesStore.assignStudents(classId, studentIds);
    if (user) activityLogService.log(user, `Cập nhật danh sách học sinh lớp ${classId}`);
  },

  deleteClass: async (classId, user) => {
    if (isSupabase()) {
      const cls = await classService.getById(classId);
      if (!cls) return false;
      await supabase.from('class_members').delete().eq('class_id', classId);
      await supabase.from('lesson_sessions').delete().eq('class_id', classId);
      await supabase.from('calendar_events').delete().eq('class_id', classId);
      await supabase.from('uploaded_files').delete().eq('class_id', classId);
      await supabase.from('classes').delete().eq('id', classId);
      if (user) await activityLogService.log(user, `Xóa lớp học: ${cls.name}`);
      return true;
    }
    const cls = classesStore.getById(classId);
    if (!cls) return false;
    sessionsStore.getByClass(classId).forEach(s => sessionsStore.remove(s.id));
    calendarStore.getByClass(classId).forEach(e => calendarStore.remove(e.id));
    classesStore.remove(classId);
    if (user) activityLogService.log(user, `Xóa lớp học: ${cls.name}`);
    return true;
  },

  search: async (query, filters = {}) => {
    let classes = await classService.getAll();
    if (query) {
      const q = query.toLowerCase();
      classes = classes.filter(c =>
        c.name?.toLowerCase().includes(q) || c.teacherName?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      );
    }
    if (filters.level && filters.level !== 'all') classes = classes.filter(c => c.level === filters.level);
    if (filters.teacherId && filters.teacherId !== 'all') classes = classes.filter(c => c.teacherId === filters.teacherId);
    return classes;
  },
};

export default classService;
