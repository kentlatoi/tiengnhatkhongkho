/**
 * Class Service — classes + class_members + localStorage fallback
 *
 * Supabase `classes` table columns:
 *   class_name, description, jlpt_level, schedule_text, icon,
 *   teacher_id, teacher_name, thumbnail_url, is_archived,
 *   level, schedule, created_at, updated_at
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { classesStore, sessionsStore, calendarStore } from '../store/localStorage';
import activityLogService from './activityLogService';

/** Map Supabase row → app object */
function mapClass(row) {
  return {
    id: row.id,
    name: row.class_name || '',
    description: row.description || '',
    level: row.jlpt_level || row.level || 'N5',
    schedule: row.schedule_text || row.schedule || '',
    icon: row.icon || '',
    thumbnail: row.icon || row.thumbnail_url || '🗻',
    thumbnailUrl: row.thumbnail_url || '',
    teacherId: row.teacher_id || '',
    teacherName: row.teacher_name || '',
    isArchived: row.is_archived || false,
    studentIds: row.studentIds || [],
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

/** Map app object → Supabase row (only include defined fields) */
function toDb(data) {
  const d = {};
  if (data.name !== undefined) d.class_name = data.name;
  if (data.description !== undefined) d.description = data.description;
  if (data.level !== undefined) d.jlpt_level = data.level;
  if (data.schedule !== undefined) d.schedule_text = data.schedule;
  if (data.icon !== undefined) d.icon = data.icon;
  if (data.thumbnail !== undefined) d.icon = data.thumbnail;
  if (data.thumbnailUrl !== undefined) d.thumbnail_url = data.thumbnailUrl;
  if (data.teacherId !== undefined) d.teacher_id = data.teacherId || null;
  if (data.teacherName !== undefined) d.teacher_name = data.teacherName;
  if (data.isArchived !== undefined) d.is_archived = data.isArchived;
  return d;
}

const classService = {
  getAll: async () => {
    if (isSupabase()) {
      console.log('[classService] 🔄 Loading classes from Supabase...');
      const { data, error } = await supabase.from('classes').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[classService] ❌ Supabase classes load error:', error);
        throw error;
      }
      const mapped = (data || []).map(mapClass);

      // Fetch student counts and ids
      const { data: members } = await supabase.from('class_members').select('class_id, user_id').eq('role_in_class', 'student');
      const memberCounts = {};
      const memberIds = {};
      (members || []).forEach(m => {
        memberCounts[m.class_id] = (memberCounts[m.class_id] || 0) + 1;
        if (!memberIds[m.class_id]) memberIds[m.class_id] = [];
        memberIds[m.class_id].push(m.user_id);
      });
      mapped.forEach(c => { 
        c.studentCount = memberCounts[c.id] || 0; 
        c.studentIds = memberIds[c.id] || [];
      });

      console.log('[Classes] Loaded classes:', mapped);
      console.log('[ClassMembers] Loaded members:', members);
      console.log('[Classes] Student counts:', memberCounts);
      return mapped;
    }
    return classesStore.getAll();
  },

  getById: async (id) => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('classes').select('*').eq('id', id).single();
      if (error) { console.error('[classService] ❌ getById error:', error); return null; }
      return data ? mapClass(data) : null;
    }
    return classesStore.getById(id);
  },

  getByTeacher: async (teacherId) => {
    if (isSupabase()) {
      const { data } = await supabase.from('classes').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
      const mapped = (data || []).map(mapClass);

      // Fetch student counts and ids
      const { data: members } = await supabase.from('class_members').select('class_id, user_id').eq('role_in_class', 'student');
      const memberCounts = {};
      const memberIds = {};
      (members || []).forEach(m => {
        memberCounts[m.class_id] = (memberCounts[m.class_id] || 0) + 1;
        if (!memberIds[m.class_id]) memberIds[m.class_id] = [];
        memberIds[m.class_id].push(m.user_id);
      });
      mapped.forEach(c => { 
        c.studentCount = memberCounts[c.id] || 0; 
        c.studentIds = memberIds[c.id] || [];
      });

      return mapped;
    }
    return classesStore.getByTeacher(teacherId);
  },

  getByStudent: async (studentId) => {
    if (isSupabase()) {
      console.log('[classService] getByStudent for user:', studentId);
      const { data, error } = await supabase
        .from('class_members')
        .select(`
          id,
          class_id,
          role_in_class,
          classes (*)
        `)
        .eq('user_id', studentId)
        .eq('role_in_class', 'student');
        
      if (error) console.error('[classService] getByStudent error:', error);
      console.log('[classService] getByStudent raw data:', data);

      if (!data || data.length === 0) return [];

      const mapped = data.map(row => {
        const cls = row.classes || {};
        return {
          membershipId: row.id,
          classId: row.class_id || cls.id,
          id: row.class_id || cls.id,
          name: cls.class_name || cls.name || '',
          description: cls.description || '',
          level: cls.jlpt_level || cls.level || 'N5',
          schedule: cls.schedule_text || cls.schedule || '',
          icon: cls.icon || '',
          thumbnail: cls.icon || cls.thumbnail_url || '🗻',
          thumbnailUrl: cls.thumbnail_url || '',
          teacherId: cls.teacher_id || '',
          teacherName: cls.teacher_name || '',
          isArchived: cls.is_archived || false,
        };
      });

      console.log('[classService] getByStudent mapped:', mapped);
      return mapped;
    }
    return classesStore.getByStudent(studentId);
  },

  getStudentIds: async (classId) => {
    if (isSupabase()) {
      const { data } = await supabase.from('class_members').select('user_id').eq('class_id', classId).eq('role_in_class', 'student');
      return (data || []).map(m => m.user_id);
    }
    const cls = classesStore.getById(classId);
    return cls?.studentIds || [];
  },

  create: async (classData, user) => {
    if (isSupabase()) {
      const payload = {
        class_name: classData.name || '',
        description: classData.description || '',
        jlpt_level: classData.level || 'N5',
        schedule_text: classData.schedule || '',
        icon: classData.icon || classData.thumbnail || '',
        teacher_id: classData.teacherId || null,
        teacher_name: classData.teacherName || null,
        is_archived: false,
      };
      console.log('[classService] 📤 Creating class, payload:', payload);
      const { data, error } = await supabase.from('classes').insert(payload).select('*').single();
      if (error) {
        console.error('[classService] ❌ Class creation error:', error);
        throw error;
      }
      console.log('[classService] ✅ Class created:', data.id, data.class_name);
      if (user) activityLogService.log(user, `Tạo lớp học: ${classData.name}`).catch(() => {});
      return mapClass(data);
    }
    const cls = { ...classData, id: classData.id || 'class-' + Date.now(), studentIds: classData.studentIds || [], createdAt: new Date().toISOString().slice(0, 10) };
    classesStore.add(cls);
    if (user) activityLogService.log(user, `Tạo lớp học: ${cls.name}`);
    return cls;
  },

  update: async (id, data, user) => {
    if (isSupabase()) {
      const payload = toDb(data);
      console.log('[classService] 📤 Updating class', id, 'payload:', payload);
      const { error } = await supabase.from('classes').update(payload).eq('id', id);
      if (error) {
        console.error('[classService] ❌ Class update error:', error);
        throw error;
      }
      console.log('[classService] ✅ Class updated:', id);
      if (user) activityLogService.log(user, `Cập nhật lớp học: ${data.name || id}`).catch(() => {});
      return { id, ...data };
    }
    const result = classesStore.update(id, { ...data, updatedAt: new Date().toISOString() });
    if (user) activityLogService.log(user, `Cập nhật lớp học: ${data.name || id}`);
    return result;
  },

  assignStudents: async (classId, studentIds, user) => {
    if (isSupabase()) {
      await supabase.from('class_members').delete().eq('class_id', classId).eq('role_in_class', 'student');
      if (studentIds.length > 0) {
        const rows = studentIds.map(sid => ({ class_id: classId, user_id: sid, role_in_class: 'student' }));
        await supabase.from('class_members').insert(rows);
      }
      if (user) activityLogService.log(user, `Cập nhật danh sách học sinh lớp`).catch(() => {});
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
      if (user) activityLogService.log(user, `Xóa lớp học: ${cls.name}`).catch(() => {});
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
