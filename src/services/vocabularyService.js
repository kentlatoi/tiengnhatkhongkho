/**
 * Vocabulary Service — vocabulary_topics + vocabulary_items + localStorage fallback
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { vocabTopicsStore, vocabItemsStore } from '../store/localStorage';

function mapTopic(t) {
  return { id: t.id, title: t.title || '', description: t.description || '' };
}

function mapItem(i) {
  return {
    id: i.id,
    topicId: i.topic_id || i.topicId || '',
    japanese: i.kanji || '',
    kanji: i.kanji || '',
    hiragana: i.hiragana || '',
    romaji: i.romaji || '',
    vietnamese: i.meaning_vi || '',
    english: i.meaning_en || '',
    example: i.example_sentence || '',
    learned: false,
    createdAt: i.created_at || ''
  };
}

const vocabularyService = {
  getTopics: async () => {
    if (isSupabase()) {
      console.log('[vocab] 🔄 Loading vocabulary topics...');
      const { data, error } = await supabase.from('vocabulary_topics').select('*').order('title');
      if (error) {
        console.error('[vocab] ❌ Topics load error:', error);
        throw error;
      }
      console.log('[vocab] ✅ Loaded', (data || []).length, 'topics');
      return (data || []).map(mapTopic);
    }
    return vocabTopicsStore.getAll();
  },

  getItems: async (topicId) => {
    if (isSupabase()) {
      console.log('[vocab] 🔄 Loading items for topic:', topicId || 'all');
      let q = supabase.from('vocabulary_items').select('*');
      if (topicId) q = q.eq('topic_id', topicId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) {
        console.error('[vocab] ❌ Items load error:', error);
        throw error;
      }
      console.log('[vocab] ✅ Loaded', (data || []).length, 'items');
      return (data || []).map(mapItem);
    }
    return topicId ? vocabItemsStore.getByTopic(topicId) : vocabItemsStore.getAll();
  },

  getAllItems: async () => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('vocabulary_items').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[vocab] ❌ All items load error:', error);
        throw error;
      }
      return (data || []).map(mapItem);
    }
    return vocabItemsStore.getAll();
  },

  createTopic: async (topicData) => {
    if (isSupabase()) {
      const payload = {
        title: topicData.title || '',
        description: topicData.description || '',
      };
      console.log('[vocab] 📤 Creating topic, payload:', payload);
      const { data, error } = await supabase.from('vocabulary_topics').insert(payload).select('*').single();
      if (error) {
        console.error('[vocab] ❌ Topic creation error:', error);
        throw error;
      }
      console.log('[vocab] ✅ Topic created:', data.id, data.title);
      return mapTopic(data);
    }
    return vocabTopicsStore.add({ id: topicData.id || 'vt-' + Date.now(), ...topicData });
  },

  updateTopic: async (id, topicData) => {
    if (isSupabase()) {
      const payload = {};
      if (topicData.title !== undefined) payload.title = topicData.title;
      if (topicData.description !== undefined) payload.description = topicData.description;
      console.log('[vocab] 📤 Updating topic', id, 'payload:', payload);
      const { error } = await supabase.from('vocabulary_topics').update(payload).eq('id', id);
      if (error) {
        console.error('[vocab] ❌ Topic update error:', error);
        throw error;
      }
      return { id, ...topicData };
    }
    return vocabTopicsStore.update(id, topicData);
  },

  removeTopic: async (id) => {
    if (isSupabase()) {
      console.log('[vocab] 🗑️ Deleting topic and items:', id);
      await supabase.from('vocabulary_items').delete().eq('topic_id', id);
      const { error } = await supabase.from('vocabulary_topics').delete().eq('id', id);
      if (error) {
        console.error('[vocab] ❌ Topic delete error:', error);
        throw error;
      }
      return;
    }
    vocabTopicsStore.remove(id);
  },

  createItem: async (itemData) => {
    if (isSupabase()) {
      const payload = {
        topic_id: itemData.topicId,
        kanji: itemData.kanji || itemData.japanese || '',
        hiragana: itemData.hiragana || '',
        romaji: itemData.romaji || '',
        meaning_vi: itemData.vietnamese || '',
        meaning_en: itemData.english || '',
        example_sentence: itemData.example || ''
      };
      console.log('[VocabItem] payload:', payload);
      const { data, error } = await supabase.from('vocabulary_items').insert(payload).select('*').single();
      if (error) {
        console.error('[vocab] ❌ Item creation error:', error);
        throw error;
      }
      console.log('[vocab] ✅ Item created:', data.id);
      return mapItem(data);
    }
    return vocabItemsStore.add({ id: itemData.id || 'vi-' + Date.now(), ...itemData });
  },

  updateItem: async (id, itemData) => {
    if (isSupabase()) {
      const payload = {};
      if (itemData.kanji !== undefined || itemData.japanese !== undefined) payload.kanji = itemData.kanji || itemData.japanese;
      if (itemData.hiragana !== undefined) payload.hiragana = itemData.hiragana;
      if (itemData.romaji !== undefined) payload.romaji = itemData.romaji;
      if (itemData.vietnamese !== undefined) payload.meaning_vi = itemData.vietnamese;
      if (itemData.english !== undefined) payload.meaning_en = itemData.english;
      if (itemData.example !== undefined) payload.example_sentence = itemData.example;
      console.log('[VocabItem] payload:', payload);
      const { error } = await supabase.from('vocabulary_items').update(payload).eq('id', id);
      if (error) {
        console.error('[vocab] ❌ Item update error:', error);
        throw error;
      }
      return { id, ...itemData };
    }
    return vocabItemsStore.update(id, itemData);
  },

  removeItem: async (id) => {
    if (isSupabase()) {
      console.log('[vocab] 🗑️ Deleting item:', id);
      const { error } = await supabase.from('vocabulary_items').delete().eq('id', id);
      if (error) {
        console.error('[vocab] ❌ Item delete error:', error);
        throw error;
      }
      return;
    }
    vocabItemsStore.remove(id);
  },
};

export default vocabularyService;
