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
    id: i.id, topicId: i.topic_id || i.topicId || '',
    japanese: i.japanese || '', hiragana: i.hiragana || '', romaji: i.romaji || '',
    vietnamese: i.vietnamese || '', english: i.english || '', example: i.example || '',
    learned: i.learned || false,
  };
}

const vocabularyService = {
  getTopics: async () => {
    if (isSupabase()) {
      const { data } = await supabase.from('vocabulary_topics').select('*').order('title');
      return (data || []).map(mapTopic);
    }
    return vocabTopicsStore.getAll();
  },

  getItems: async (topicId) => {
    if (isSupabase()) {
      let q = supabase.from('vocabulary_items').select('*');
      if (topicId) q = q.eq('topic_id', topicId);
      const { data } = await q.order('japanese');
      return (data || []).map(mapItem);
    }
    return topicId ? vocabItemsStore.getByTopic(topicId) : vocabItemsStore.getAll();
  },

  getAllItems: async () => {
    if (isSupabase()) {
      const { data } = await supabase.from('vocabulary_items').select('*').order('japanese');
      return (data || []).map(mapItem);
    }
    return vocabItemsStore.getAll();
  },

  createTopic: async (topicData) => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('vocabulary_topics').insert({ title: topicData.title, description: topicData.description }).select().single();
      if (error) throw error;
      return mapTopic(data);
    }
    return vocabTopicsStore.add({ id: topicData.id || 'vt-' + Date.now(), ...topicData });
  },

  updateTopic: async (id, data) => {
    if (isSupabase()) {
      await supabase.from('vocabulary_topics').update(data).eq('id', id);
      return { id, ...data };
    }
    return vocabTopicsStore.update(id, data);
  },

  removeTopic: async (id) => {
    if (isSupabase()) {
      await supabase.from('vocabulary_items').delete().eq('topic_id', id);
      await supabase.from('vocabulary_topics').delete().eq('id', id);
      return;
    }
    vocabTopicsStore.remove(id);
  },

  createItem: async (itemData) => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('vocabulary_items').insert({
        topic_id: itemData.topicId, japanese: itemData.japanese, hiragana: itemData.hiragana,
        romaji: itemData.romaji, vietnamese: itemData.vietnamese, english: itemData.english,
        example: itemData.example, learned: false,
      }).select().single();
      if (error) throw error;
      return mapItem(data);
    }
    return vocabItemsStore.add({ id: itemData.id || 'vi-' + Date.now(), ...itemData });
  },

  updateItem: async (id, data) => {
    if (isSupabase()) {
      const mapped = {};
      if (data.japanese !== undefined) mapped.japanese = data.japanese;
      if (data.hiragana !== undefined) mapped.hiragana = data.hiragana;
      if (data.romaji !== undefined) mapped.romaji = data.romaji;
      if (data.vietnamese !== undefined) mapped.vietnamese = data.vietnamese;
      if (data.english !== undefined) mapped.english = data.english;
      if (data.example !== undefined) mapped.example = data.example;
      await supabase.from('vocabulary_items').update(mapped).eq('id', id);
      return { id, ...data };
    }
    return vocabItemsStore.update(id, data);
  },

  removeItem: async (id) => {
    if (isSupabase()) {
      await supabase.from('vocabulary_items').delete().eq('id', id);
      return;
    }
    vocabItemsStore.remove(id);
  },
};

export default vocabularyService;
