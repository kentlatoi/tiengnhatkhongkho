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
    id: p.id,
    topicId: p.topic_id || p.topicId,
    pattern: p.pattern,
    title: p.pattern,
    name: p.pattern,
    explanationVi: p.explanation_vi || '',
    explanationEn: p.explanation_en || '',
    vietnamese: p.explanation_vi || '',
    english: p.explanation_en || '',
    examples: p.example_sentences
      ? p.example_sentences.split('\n').filter(Boolean)
      : [],
    notes: p.usage_notes || '',
    learned: false,
    createdAt: p.created_at || ''
  };
}

const grammarService = {
  getTopics: async () => {
    if (isSupabase()) {
      console.log('[grammar] 🔄 Loading grammar topics...');
      const { data, error } = await supabase.from('grammar_topics').select('*').order('title');
      if (error) {
        console.error('[grammar] ❌ Topics load error:', error);
        throw error;
      }
      console.log('[grammar] ✅ Loaded', (data || []).length, 'topics');
      return (data || []).map(mapTopic);
    }
    return grammarTopicsStore.getAll();
  },

  getPoints: async (topicId) => {
    if (isSupabase()) {
      console.log('[grammar] 🔄 Loading points for topic:', topicId || 'all');
      let q = supabase.from('grammar_points').select('*');
      if (topicId) q = q.eq('topic_id', topicId);
      const { data, error } = await q.order('pattern');
      if (error) {
        console.error('[grammar] ❌ Points load error:', error);
        throw error;
      }
      console.log('[grammar] ✅ Loaded', (data || []).length, 'points');
      return (data || []).map(mapPoint);
    }
    return topicId ? grammarPointsStore.getByTopic(topicId) : grammarPointsStore.getAll();
  },

  getAllPoints: async () => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('grammar_points').select('*').order('pattern');
      if (error) {
        console.error('[grammar] ❌ All points load error:', error);
        throw error;
      }
      return (data || []).map(mapPoint);
    }
    return grammarPointsStore.getAll();
  },

  createTopic: async (topicData) => {
    if (isSupabase()) {
      const payload = {
        title: topicData.title || '',
        description: topicData.description || '',
        created_by: topicData.createdBy || null,
      };
      console.log('[grammar] 📤 Creating topic, payload:', payload);
      const { data, error } = await supabase.from('grammar_topics').insert(payload).select('*').single();
      if (error) {
        console.error('[grammar] ❌ Topic creation error:', error);
        throw error;
      }
      console.log('[grammar] ✅ Topic created:', data.id, data.title);
      return mapTopic(data);
    }
    return grammarTopicsStore.add({ id: topicData.id || 'gt-' + Date.now(), ...topicData });
  },

  updateTopic: async (id, topicData) => {
    if (isSupabase()) {
      const payload = {};
      if (topicData.title !== undefined) payload.title = topicData.title;
      if (topicData.description !== undefined) payload.description = topicData.description;
      console.log('[grammar] 📤 Updating topic', id, 'payload:', payload);
      const { error } = await supabase.from('grammar_topics').update(payload).eq('id', id);
      if (error) {
        console.error('[grammar] ❌ Topic update error:', error);
        throw error;
      }
      return { id, ...topicData };
    }
    return grammarTopicsStore.update(id, topicData);
  },

  removeTopic: async (id) => {
    if (isSupabase()) {
      console.log('[grammar] 🗑️ Deleting topic and points:', id);
      await supabase.from('grammar_points').delete().eq('topic_id', id);
      const { error } = await supabase.from('grammar_topics').delete().eq('id', id);
      if (error) {
        console.error('[grammar] ❌ Topic delete error:', error);
        throw error;
      }
      return;
    }
    grammarTopicsStore.remove(id);
  },

  createPoint: async (pointData) => {
    if (isSupabase()) {
      const payload = {
        topic_id: pointData.topicId,
        pattern: pointData.pattern || pointData.title || pointData.name || '',
        explanation_vi: pointData.vietnamese || pointData.vietnameseExplanation || pointData.explanation || '',
        explanation_en: pointData.english || pointData.englishExplanation || '',
        example_sentences: Array.isArray(pointData.examples)
          ? pointData.examples.filter(Boolean).join('\n')
          : pointData.example || '',
        usage_notes: pointData.notes || pointData.usageNotes || ''
      };
      console.log('[GrammarPoint] payload:', payload);
      const { data, error } = await supabase.from('grammar_points').insert(payload).select('*').single();
      if (error) {
        console.error('[grammar] ❌ Point creation error:', error);
        throw error;
      }
      console.log('[grammar] ✅ Point created:', data.id);
      return mapPoint(data);
    }
    return grammarPointsStore.add({ id: pointData.id || 'gp-' + Date.now(), ...pointData });
  },

  updatePoint: async (id, pointData) => {
    if (isSupabase()) {
      const payload = {};
      if (pointData.pattern !== undefined || pointData.title !== undefined || pointData.name !== undefined) payload.pattern = pointData.pattern || pointData.title || pointData.name;
      if (pointData.vietnamese !== undefined || pointData.vietnameseExplanation !== undefined || pointData.explanation !== undefined) payload.explanation_vi = pointData.vietnamese || pointData.vietnameseExplanation || pointData.explanation;
      if (pointData.english !== undefined || pointData.englishExplanation !== undefined) payload.explanation_en = pointData.english || pointData.englishExplanation;
      if (pointData.examples !== undefined || pointData.example !== undefined) {
        payload.example_sentences = Array.isArray(pointData.examples)
          ? pointData.examples.filter(Boolean).join('\n')
          : pointData.example || '';
      }
      if (pointData.notes !== undefined || pointData.usageNotes !== undefined) payload.usage_notes = pointData.notes || pointData.usageNotes;
      console.log('[GrammarPoint] payload:', payload);
      const { error } = await supabase.from('grammar_points').update(payload).eq('id', id);
      if (error) {
        console.error('[grammar] ❌ Point update error:', error);
        throw error;
      }
      return { id, ...pointData };
    }
    return grammarPointsStore.update(id, pointData);
  },

  removePoint: async (id) => {
    if (isSupabase()) {
      console.log('[grammar] 🗑️ Deleting point:', id);
      const { error } = await supabase.from('grammar_points').delete().eq('id', id);
      if (error) {
        console.error('[grammar] ❌ Point delete error:', error);
        throw error;
      }
      return;
    }
    grammarPointsStore.remove(id);
  },
};

export default grammarService;
