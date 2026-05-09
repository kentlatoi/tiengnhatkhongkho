import { supabase, isSupabase } from '../lib/supabaseClient';

const quizService = {
  // Get all quizzes
  async getAll() {
    if (isSupabase()) {
      const { data, error } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapQuiz);
    }
    // localStorage: quizzes are embedded inside sessions
    return [];
  },

  // Get quizzes by class
  async getByClass(classId) {
    if (isSupabase()) {
      const { data, error } = await supabase.from('quizzes').select('*').eq('class_id', classId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapQuiz);
    }
    return [];
  },

  // Get quizzes by session
  async getBySession(sessionId) {
    if (isSupabase()) {
      const { data, error } = await supabase.from('quizzes').select('*, quiz_questions(*)').eq('session_id', sessionId);
      if (error) throw error;
      return (data || []).map(q => ({
        ...mapQuiz(q),
        questions: (q.quiz_questions || []).map(mapQuestion),
      }));
    }
    return [];
  },

  // Get quiz questions
  async getQuestions(quizId) {
    if (isSupabase()) {
      const { data, error } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index');
      if (error) throw error;
      return (data || []).map(mapQuestion);
    }
    return [];
  },

  // Create quiz
  async create(quizData, user) {
    if (isSupabase()) {
      const { data, error } = await supabase.from('quizzes').insert({
        class_id: quizData.classId,
        session_id: quizData.sessionId,
        title: quizData.title,
        description: quizData.description || '',
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return mapQuiz(data);
    }
    return quizData;
  },

  // Create question
  async createQuestion(questionData) {
    if (isSupabase()) {
      const { data, error } = await supabase.from('quiz_questions').insert({
        quiz_id: questionData.quizId,
        question: questionData.question,
        options: questionData.options,
        correct_answer: questionData.answer,
        order_index: questionData.order || 0,
      }).select().single();
      if (error) throw error;
      return mapQuestion(data);
    }
    return questionData;
  },

  // Remove quiz
  async remove(quizId) {
    if (isSupabase()) {
      await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
      if (error) throw error;
    }
  },
};

function mapQuiz(row) {
  return {
    id: row.id,
    classId: row.class_id,
    sessionId: row.session_id,
    title: row.title,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapQuestion(row) {
  return {
    id: row.id,
    quizId: row.quiz_id,
    question: row.question,
    options: row.options || [],
    answer: row.correct_answer,
    order: row.order_index,
  };
}

export default quizService;
