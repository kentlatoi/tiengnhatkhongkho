import { supabase, isSupabase } from '../lib/supabaseClient';

const flashcardService = {
  // Get all flashcards
  async getAll() {
    if (isSupabase()) {
      const { data, error } = await supabase.from('flashcards').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapFlashcard);
    }
    return [];
  },

  // Get flashcards by session
  async getBySession(sessionId) {
    if (isSupabase()) {
      const { data, error } = await supabase.from('flashcards').select('*').eq('session_id', sessionId).order('order_index');
      if (error) throw error;
      return (data || []).map(mapFlashcard);
    }
    return [];
  },

  // Get flashcards by class
  async getByClass(classId) {
    if (isSupabase()) {
      const { data, error } = await supabase.from('flashcards').select('*').eq('class_id', classId).order('order_index');
      if (error) throw error;
      return (data || []).map(mapFlashcard);
    }
    return [];
  },

  // Create flashcard
  async create(cardData, user) {
    if (isSupabase()) {
      const { data, error } = await supabase.from('flashcards').insert({
        class_id: cardData.classId,
        session_id: cardData.sessionId,
        front: cardData.front,
        back: cardData.back,
        order_index: cardData.order || 0,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return mapFlashcard(data);
    }
    return cardData;
  },

  // Update flashcard
  async update(id, cardData) {
    if (isSupabase()) {
      const mapped = {};
      if (cardData.front !== undefined) mapped.front = cardData.front;
      if (cardData.back !== undefined) mapped.back = cardData.back;
      if (cardData.order !== undefined) mapped.order_index = cardData.order;
      const { error } = await supabase.from('flashcards').update(mapped).eq('id', id);
      if (error) throw error;
    }
  },

  // Remove flashcard
  async remove(id) {
    if (isSupabase()) {
      const { error } = await supabase.from('flashcards').delete().eq('id', id);
      if (error) throw error;
    }
  },

  // Bulk create flashcards for a session
  async bulkCreate(sessionId, classId, cards, user) {
    if (isSupabase()) {
      const rows = cards.map((c, i) => ({
        class_id: classId,
        session_id: sessionId,
        front: c.front,
        back: c.back,
        order_index: i,
        created_by: user?.id,
      }));
      const { error } = await supabase.from('flashcards').insert(rows);
      if (error) throw error;
    }
  },
};

function mapFlashcard(row) {
  return {
    id: row.id,
    classId: row.class_id,
    sessionId: row.session_id,
    front: row.front,
    back: row.back,
    order: row.order_index,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export default flashcardService;
