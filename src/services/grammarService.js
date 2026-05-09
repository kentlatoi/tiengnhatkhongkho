/**
 * Grammar Service — grammar_topics + grammar_points + localStorage fallback
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { grammarTopicsStore, grammarPointsStore } from '../store/localStorage';

function mapTopic(t) {
  return { id: t.id, title: t.title || '', description: t.description || '' };
}

function mapPoint(p) {
  return {
    id: p.id, topicId: p.topic_id || p.topicId || '',
    pattern: p.pattern || '', explanation: p.explanation || '',
    vietnameseExplanation: p.vietnamese_explanation || p.vietnameseExplanation || '',
    englishExplanation: p.english_explanation || p.englishExplanation || '',
    examples: p.examples || [], notes: p.notes || '', learned: p.learned || false,
  };
}

const grammarService = {
  getTopics: async () => {
    if (isSupabase()) {
      const { data } = await supabase.from('grammar_topics').select('*').order('title');
      return (data || []).map(mapTopic);
    }
    return grammarTopicsStore.getAll();
  },

  getPoints: async (topicId) => {
    if (isSupabase()) {
      let q = supabase.from('grammar_points').select('*');
      if (topicId) q = q.eq('topic_id', topicId);
      const { data } = await q.order('pattern');
      return (data || []).map(mapPoint);
    }
    return topicId ? grammarPointsStore.getByTopic(topicId) : grammarPointsStore.getAll();
  },

  getAllPoints: async () => {
    if (isSupabase()) {
      const { data } = await supabase.from('grammar_points').select('*').order('pattern');
      return (data || []).map(mapPoint);
    }
    return grammarPointsStore.getAll();
  },

  createTopic: async (topicData) => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('grammar_topics').insert({ title: topicData.title, description: topicData.description }).select().single();
      if (error) throw error;
      return mapTopic(data);
    }
    return grammarTopicsStore.add({ id: topicData.id || 'gt-' + Date.now(), ...topicData });
  },

  updateTopic: async (id, data) => {
    if (isSupabase()) {
      await supabase.from('grammar_topics').update(data).eq('id', id);
      return { id, ...data };
    }
    return grammarTopicsStore.update(id, data);
  },

  removeTopic: async (id) => {
    if (isSupabase()) {
      await supabase.from('grammar_points').delete().eq('topic_id', id);
      await supabase.from('grammar_topics').delete().eq('id', id);
      return;
    }
    grammarTopicsStore.remove(id);
  },

  createPoint: async (pointData) => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('grammar_points').insert({
        topic_id: pointData.topicId, pattern: pointData.pattern,
        explanation: pointData.explanation, vietnamese_explanation: pointData.vietnameseExplanation,
        english_explanation: pointData.englishExplanation, examples: pointData.examples || [],
        notes: pointData.notes, learned: false,
      }).select().single();
      if (error) throw error;
      return mapPoint(data);
    }
    return grammarPointsStore.add({ id: pointData.id || 'gp-' + Date.now(), ...pointData });
  },

  updatePoint: async (id, data) => {
    if (isSupabase()) {
      const mapped = {};
      if (data.pattern !== undefined) mapped.pattern = data.pattern;
      if (data.explanation !== undefined) mapped.explanation = data.explanation;
      if (data.vietnameseExplanation !== undefined) mapped.vietnamese_explanation = data.vietnameseExplanation;
      if (data.englishExplanation !== undefined) mapped.english_explanation = data.englishExplanation;
      if (data.examples !== undefined) mapped.examples = data.examples;
      if (data.notes !== undefined) mapped.notes = data.notes;
      await supabase.from('grammar_points').update(mapped).eq('id', id);
      return { id, ...data };
    }
    return grammarPointsStore.update(id, data);
  },

  removePoint: async (id) => {
    if (isSupabase()) {
      await supabase.from('grammar_points').delete().eq('id', id);
      return;
    }
    grammarPointsStore.remove(id);
  },
};

export default grammarService;
