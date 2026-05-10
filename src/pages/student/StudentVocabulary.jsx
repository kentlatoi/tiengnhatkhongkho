import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import vocabularyService from '../../services/vocabularyService';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion } from 'framer-motion';

export default function StudentVocabulary() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState(null);
  const [search, setSearch] = useState('');
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [learnedVocab, setLearnedVocab] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, i] = await Promise.all([vocabularyService.getTopics(), vocabularyService.getAllItems()]);
        setTopics(t); setItems(i);
        try { const p = JSON.parse(localStorage.getItem(`progress_${user.id}`) || '{}'); setLearnedVocab(p.learnedVocab || []); } catch {}
      } catch (err) {
        console.error('[StudentVocabulary] ❌ Load error:', err);
        setTopics([]); setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const topicItems = activeTopic ? items.filter(i => i.topicId === activeTopic.id) : items;
  const filtered = topicItems.filter(i => !search || [i.japanese, i.hiragana, i.romaji, i.vietnamese, i.english].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  const toggleLearned = (vocabId) => {
    setLearnedVocab(prev => {
      const next = prev.includes(vocabId) ? prev.filter(id => id !== vocabId) : [...prev, vocabId];
      try { const p = JSON.parse(localStorage.getItem(`progress_${user.id}`) || '{}'); p.learnedVocab = next; localStorage.setItem(`progress_${user.id}`, JSON.stringify(p)); } catch {}
      return next;
    });
  };

  if (loading) return <LoadingSkeleton type="cards" count={6} />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Từ vựng N5 📝</h1>
          <p className="text-surface-500 text-sm">{learnedVocab.length}/{items.length} từ đã học</p>
        </div>
        <button onClick={() => setFlashcardMode(m => !m)} className={flashcardMode ? 'btn-primary' : 'btn-secondary'}>
          🃏 {flashcardMode ? 'Xem danh sách' : 'Chế độ Flashcard'}
        </button>
      </div>

      <div className="mb-6"><SearchBar value={search} onChange={setSearch} placeholder="Tìm từ vựng..." /></div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveTopic(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${!activeTopic ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}`}>
          Tất cả
        </button>
        {topics.map(t => (
          <button key={t.id} onClick={() => setActiveTopic(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTopic?.id === t.id ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}`}>
            {t.title}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📝" title="Không tìm thấy từ vựng" description="" />
      ) : flashcardMode ? (
        <FlashcardCarousel items={filtered} learnedVocab={learnedVocab} onToggle={toggleLearned} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`glass-card relative ${learnedVocab.includes(item.id) ? 'ring-2 ring-primary-400' : ''}`}>
              <button onClick={() => toggleLearned(item.id)}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                  learnedVocab.includes(item.id) ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-400'
                }`}>
                {learnedVocab.includes(item.id) ? '✓' : '○'}
              </button>
              <p className="text-3xl font-bold text-surface-900 dark:text-white font-jp">{item.japanese}</p>
              <p className="text-primary-600 dark:text-primary-400 font-medium">{item.hiragana}</p>
              <p className="text-xs text-surface-400 mb-2">{item.romaji}</p>
              <div className="space-y-1 text-sm">
                <p className="text-surface-700 dark:text-surface-300">🇻🇳 {item.vietnamese}</p>
                <p className="text-surface-500">🇺🇸 {item.english}</p>
                {item.example && <p className="text-xs text-surface-400 mt-2 italic">例: {item.example}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlashcardCarousel({ items, learnedVocab, onToggle }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const item = items[idx];
  if (!item) return null;

  const next = () => { setFlipped(false); setIdx(i => (i + 1) % items.length); };
  const prev = () => { setFlipped(false); setIdx(i => (i - 1 + items.length) % items.length); };

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-surface-500 mb-4">{idx + 1} / {items.length}</p>
      <div className="relative w-full max-w-md h-64 cursor-pointer mb-6" style={{ perspective: '1000px' }} onClick={() => setFlipped(f => !f)}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6 }}
          className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex flex-col items-center justify-center text-white shadow-xl p-6"
            style={{ backfaceVisibility: 'hidden' }}>
            <p className="text-6xl font-bold font-jp mb-2">{item.japanese}</p>
            <p className="text-xl opacity-80">{item.hiragana}</p>
            <p className="text-xs opacity-60 mt-2">Nhấn để lật</p>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex flex-col items-center justify-center text-white shadow-xl p-6"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <p className="text-sm opacity-60">{item.romaji}</p>
            <p className="text-2xl font-bold mb-2">{item.vietnamese}</p>
            <p className="text-lg opacity-80">{item.english}</p>
            {item.example && <p className="text-sm opacity-60 mt-3 italic">例: {item.example}</p>}
          </div>
        </motion.div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={prev} className="btn-secondary">← Trước</button>
        <button onClick={() => onToggle(item.id)}
          className={learnedVocab.includes(item.id) ? 'btn-primary' : 'btn-secondary'}>
          {learnedVocab.includes(item.id) ? '✓ Đã học' : '○ Đánh dấu đã học'}
        </button>
        <button onClick={next} className="btn-secondary">Tiếp →</button>
      </div>
    </div>
  );
}
