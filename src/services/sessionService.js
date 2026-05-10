/**
 * Session Service — lesson_sessions + localStorage fallback
 *
 * Confirmed Supabase lesson_sessions columns:
 *   id, class_id, teacher_id, title, date, start_time, end_time,
 *   content_description, homework, notes, created_at, updated_at
 *
 * NOTE: No JSONB columns (files, audio_files, quiz, flashcards) in DB.
 *       Those are stored in uploaded_files / quiz_questions / flashcards tables.
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { sessionsStore } from '../store/localStorage';
import activityLogService from './activityLogService';

function mapSession(row, index = 0) {
  return {
    id: row.id,
    classId: row.class_id || row.classId || '',
    teacherId: row.teacher_id || row.teacherId || '',
    title: row.title || '',
    date: row.date || '',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    contentDescription: row.content_description || '',
    content: row.content_description || '',
    homework: row.homework || '',
    notes: row.notes || '',
    sessionNumber: row.session_number || row.sessionNumber || index + 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function uuidOrNull(value) {
  return value && String(value).trim() !== '' ? value : null;
}

function normalizeDate(value) {
  if (!value) return null;
  // if already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // if dd/mm/yyyy from input display
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }
  return value;
}

function toDb(data) {
  const d = {};
  if (data.classId !== undefined) d.class_id = uuidOrNull(data.classId);
  if (data.teacherId !== undefined) d.teacher_id = uuidOrNull(data.teacherId);
  if (data.title !== undefined) d.title = data.title;
  if (data.date !== undefined) d.date = normalizeDate(data.date);
  if (data.startTime !== undefined) d.start_time = data.startTime || data.start_time || null;
  if (data.endTime !== undefined) d.end_time = data.endTime || data.end_time || null;
  if (data.contentDescription !== undefined) d.content_description = data.contentDescription;
  else if (data.content !== undefined) d.content_description = data.content;
  else if (data.lessonContent !== undefined) d.content_description = data.lessonContent;
  if (data.homework !== undefined) d.homework = data.homework;
  if (data.notes !== undefined) d.notes = data.notes;
  d.updated_at = new Date().toISOString();
  return d;
}

const sessionService = {
  getAll: async () => {
    if (isSupabase()) {
      console.log('[sessionService] 🔄 Loading all sessions...');
      const { data, error } = await supabase.from('lesson_sessions').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[sessionService] ❌ Load error:', error);
        throw error;
      }
      console.log('[sessionService] ✅ Loaded', (data || []).length, 'sessions');
      return (data || []).map((row, index) => mapSession(row, index));
    }
    return sessionsStore.getAll();
  },

  getByClass: async (classId) => {
    if (isSupabase()) {
      console.log('[sessionService] 🔄 Loading sessions for class:', classId);
      const { data, error } = await supabase.from('lesson_sessions').select('*').eq('class_id', classId).order('created_at', { ascending: true });
      if (error) {
        console.error('[sessionService] ❌ getByClass error:', error);
        throw error;
      }
      const sessions = (data || []).map((row, index) => mapSession(row, index));

      // Fetch uploaded files for this class
      const { data: filesData } = await supabase.from('uploaded_files').select('*').eq('class_id', classId);
      if (filesData && filesData.length > 0) {
        sessions.forEach(sess => {
          const sessFiles = filesData.filter(f => f.session_id === sess.id).map(f => ({
            id: f.id, name: f.file_name, size: f.file_size, type: f.file_type, category: f.category,
            bucketName: f.bucket_name, storagePath: f.storage_path, downloadUrl: f.download_url, dataUrl: f.download_url, uploadedAt: f.created_at
          }));
          sess.files = sessFiles.filter(f => f.category === 'document');
          sess.audioFiles = sessFiles.filter(f => f.category === 'listening');
          sess.videoFiles = sessFiles.filter(f => f.category === 'video');
        });
      }

      // Fetch flashcards for this class
      const { data: flashcardsData } = await supabase.from('flashcards').select('*').eq('class_id', classId).order('order_index', { ascending: true }).order('created_at', { ascending: true });
      if (flashcardsData && flashcardsData.length > 0) {
        sessions.forEach(sess => {
          sess.flashcards = flashcardsData.filter(f => f.session_id === sess.id);
        });
      }

      // Fetch quizzes for this class
      const { data: quizzesData } = await supabase.from('quizzes').select('*, quiz_questions(*)').eq('class_id', classId);
      if (quizzesData && quizzesData.length > 0) {
        sessions.forEach(sess => {
          const sessionQuizzes = quizzesData.filter(q => q.session_id === sess.id);
          // Map questions directly to the session quiz array for compatibility with the frontend
          sess.quiz = sessionQuizzes.flatMap(q => q.quiz_questions || []).map(q => ({
            id: q.id, question: q.question, options: q.options, answer: q.correct_answer, order: q.order_index
          }));
        });
      }

      console.log('[sessionService] ✅ Loaded', sessions.length, 'sessions for class');
      return sessions;
    }
    return sessionsStore.getByClass(classId);
  },

  getById: async (id) => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('lesson_sessions').select('*').eq('id', id).single();
      if (error) { console.error('[sessionService] ❌ getById error:', error); return null; }
      return data ? mapSession(data) : null;
    }
    return sessionsStore.getById(id);
  },

  create: async (sessionData, user) => {
    if (isSupabase()) {
      const payload = {
        class_id: sessionData.classId || null,
        teacher_id: sessionData.teacherId || user?.id || null,
        title: sessionData.title || 'Buổi học mới',
        date: sessionData.date || null,
        start_time: sessionData.startTime || null,
        end_time: sessionData.endTime || null,
        content_description: sessionData.contentDescription || sessionData.description || '',
        homework: sessionData.homework || '',
        notes: sessionData.notes || '',
      };
      console.log('[sessionService] 📤 Creating session, payload:', payload);
      const { data, error } = await supabase.from('lesson_sessions').insert(payload).select('*').single();
      if (error) {
        console.error('[sessionService] ❌ Create error:', error);
        throw error;
      }
      console.log('[sessionService] ✅ Session created:', data.id);
      if (user) activityLogService.log(user, `Thêm buổi học: ${sessionData.title}`).catch(() => {});
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
      const payload = toDb(data);
      console.log('[sessionService] 📤 Updating session', id, 'payload:', payload);
      const { error } = await supabase.from('lesson_sessions').update(payload).eq('id', id);
      if (error) {
        console.error('[sessionService] ❌ Update error:', error);
        throw error;
      }
      console.log('[sessionService] ✅ Session updated:', id);
      if (user) activityLogService.log(user, `Cập nhật buổi học: ${data.title || id}`).catch(() => {});
      return { id, ...data };
    }
    const result = sessionsStore.update(id, { ...data, updatedAt: new Date().toISOString() });
    if (user) activityLogService.log(user, `Cập nhật buổi học: ${data.title || id}`);
    return result;
  },

  remove: async (id, user) => {
    if (isSupabase()) {
      const sess = await sessionService.getById(id);
      console.log('[sessionService] 🗑️ Deleting session:', id);
      await supabase.from('uploaded_files').delete().eq('session_id', id);
      const { error } = await supabase.from('lesson_sessions').delete().eq('id', id);
      if (error) {
        console.error('[sessionService] ❌ Delete error:', error);
        throw error;
      }
      if (user && sess) activityLogService.log(user, `Xóa buổi học: ${sess.title}`).catch(() => {});
      return;
    }
    const session = sessionsStore.getById(id);
    sessionsStore.remove(id);
    if (user && session) activityLogService.log(user, `Xóa buổi học: ${session.title}`);
  },
};

export default sessionService;
