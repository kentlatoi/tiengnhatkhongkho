/**
 * Session Service — lesson_sessions + localStorage fallback
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { sessionsStore } from '../store/localStorage';
import activityLogService from './activityLogService';

function mapSession(s) {
  return {
    id: s.id,
    classId: s.class_id || s.classId || '',
    title: s.title || '',
    date: s.date || '',
    time: s.start_time || s.time || '',
    startTime: s.start_time || s.startTime || '',
    endTime: s.end_time || s.endTime || '',
    order: s.order_num ?? s.order ?? 0,
    description: s.description || '',
    homework: s.homework || '',
    notes: s.notes || '',
    files: s.files || [],
    audioFiles: s.audioFiles || s.audio_files || [],
    videoFiles: s.videoFiles || s.video_files || [],
    quiz: s.quiz || [],
    flashcards: s.flashcards || [],
    createdAt: s.created_at || s.createdAt || '',
  };
}

function toDb(data) {
  const d = {};
  if (data.classId !== undefined) d.class_id = data.classId;
  if (data.title !== undefined) d.title = data.title;
  if (data.date !== undefined) d.date = data.date;
  if (data.startTime !== undefined) d.start_time = data.startTime;
  if (data.endTime !== undefined) d.end_time = data.endTime;
  if (data.order !== undefined) d.order_num = data.order;
  if (data.description !== undefined) d.description = data.description;
  if (data.homework !== undefined) d.homework = data.homework;
  if (data.notes !== undefined) d.notes = data.notes;
  return d;
}

const sessionService = {
  getAll: async () => {
    if (isSupabase()) {
      const { data } = await supabase.from('lesson_sessions').select('*').order('order_num');
      return (data || []).map(mapSession);
    }
    return sessionsStore.getAll();
  },

  getByClass: async (classId) => {
    if (isSupabase()) {
      const { data } = await supabase.from('lesson_sessions').select('*').eq('class_id', classId).order('order_num');
      return (data || []).map(mapSession);
    }
    return sessionsStore.getByClass(classId);
  },

  getById: async (id) => {
    if (isSupabase()) {
      const { data } = await supabase.from('lesson_sessions').select('*').eq('id', id).single();
      return data ? mapSession(data) : null;
    }
    return sessionsStore.getById(id);
  },

  create: async (sessionData, user) => {
    if (isSupabase()) {
      const dbData = toDb(sessionData);
      dbData.class_id = sessionData.classId;
      const { data, error } = await supabase.from('lesson_sessions').insert(dbData).select().single();
      if (error) throw error;
      if (user) await activityLogService.log(user, `Thêm buổi học: ${sessionData.title}`);
      return mapSession(data);
    }
    const session = {
      ...sessionData,
      id: sessionData.id || 'sess-' + Date.now(),
      files: sessionData.files || [], audioFiles: sessionData.audioFiles || [],
      videoFiles: sessionData.videoFiles || [], quiz: sessionData.quiz || [],
      flashcards: sessionData.flashcards || [], createdAt: new Date().toISOString(),
    };
    sessionsStore.add(session);
    if (user) activityLogService.log(user, `Thêm buổi học: ${session.title}`);
    return session;
  },

  update: async (id, data, user) => {
    if (isSupabase()) {
      const { error } = await supabase.from('lesson_sessions').update(toDb(data)).eq('id', id);
      if (error) throw error;
      if (user) await activityLogService.log(user, `Cập nhật buổi học: ${data.title || id}`);
      return { id, ...data };
    }
    const result = sessionsStore.update(id, { ...data, updatedAt: new Date().toISOString() });
    if (user) activityLogService.log(user, `Cập nhật buổi học: ${data.title || id}`);
    return result;
  },

  remove: async (id, user) => {
    if (isSupabase()) {
      const sess = await sessionService.getById(id);
      await supabase.from('uploaded_files').delete().eq('session_id', id);
      await supabase.from('lesson_sessions').delete().eq('id', id);
      if (user && sess) await activityLogService.log(user, `Xóa buổi học: ${sess.title}`);
      return;
    }
    const session = sessionsStore.getById(id);
    sessionsStore.remove(id);
    if (user && session) activityLogService.log(user, `Xóa buổi học: ${session.title}`);
  },
};

export default sessionService;
