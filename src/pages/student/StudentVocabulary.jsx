import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import vocabularyService from '../../services/vocabularyService';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { useToast } from '../../components/ui/Toast';
import { motion } from 'framer-motion';

export default function StudentVocabulary() {
  const { user } = useAuth();
  const toast = useToast();
  const [topics, setTopics] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [learnedVocab, setLearnedVocab] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    load();
  }, [user.id]);

  const topicItems = activeTopic ? items.filter(i => i.topicId === activeTopic.id) : items;
  const filtered = topicItems.filter(i => !search || [i.kanji, i.hiragana, i.romaji, i.meaning_vi, i.meaning_en].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  let sortedItems = [...filtered];
  
  if (sortBy === 'unlearned') {
    sortedItems = sortedItems.filter(i => !learnedVocab.includes(i.id));
    sortedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    switch (sortBy) {
      case 'oldest':
        sortedItems.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'kanji':
        sortedItems.sort((a, b) => (a.kanji || '').localeCompare(b.kanji || ''));
        break;
      case 'vi':
        sortedItems.sort((a, b) => (a.meaning_vi || '').localeCompare(b.meaning_vi || ''));
        break;
      case 'en':
        sortedItems.sort((a, b) => {
          const aEn = a.meaning_en?.trim() || '';
          const bEn = b.meaning_en?.trim() || '';
          if (!aEn && !bEn) return 0;
          if (!aEn) return 1;
          if (!bEn) return -1;
          return aEn.localeCompare(bEn);
        });
        break;
      case 'newest':
      default:
        sortedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }
  }

  const toggleLearned = (vocabId, forceState) => {
    setLearnedVocab(prev => {
      let next;
      if (forceState === true) next = prev.includes(vocabId) ? prev : [...prev, vocabId];
      else if (forceState === false) next = prev.filter(id => id !== vocabId);
      else next = prev.includes(vocabId) ? prev.filter(id => id !== vocabId) : [...prev, vocabId];
      try { const p = JSON.parse(localStorage.getItem(`progress_${user.id}`) || '{}'); p.learnedVocab = next; localStorage.setItem(`progress_${user.id}`, JSON.stringify(p)); } catch {}
      return next;
    });
  };

  const resetProgress = () => {
    if (!confirm('Bạn có chắc chắn muốn làm mới toàn bộ tiến độ học từ vựng? Mọi đánh dấu "Đã học" sẽ bị xoá.')) return;
    try {
      setLearnedVocab([]);
      const p = JSON.parse(localStorage.getItem(`progress_${user.id}`) || '{}');
      p.learnedVocab = [];
      localStorage.setItem(`progress_${user.id}`, JSON.stringify(p));
      toast?.('Đã làm mới tiến độ học từ vựng');
    } catch (err) {
      console.error('Reset progress error:', err);
      toast?.(err.message || 'Lỗi khi làm mới tiến độ', 'error');
    }
  };

  if (loading) return <LoadingSkeleton type="cards" count={6} />;

  return (
    <div className="pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-white tracking-tight">Từ vựng N5 📝</h1>
          <p className="text-surface-500 mt-1 font-medium">{learnedVocab.length} / {items.length} từ đã học</p>
        </div>
        <button onClick={() => setFlashcardMode(m => !m)} className={flashcardMode ? 'btn-primary shadow-lg shadow-primary-500/20' : 'btn-secondary'}>
          🃏 {flashcardMode ? 'Xem danh sách' : 'Chế độ Flashcard'}
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="glass p-4 rounded-2xl mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 w-full relative">
          <SearchBar value={search} onChange={setSearch} placeholder="Tìm từ vựng, kanji, nghĩa..." />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input flex-1 sm:w-48 bg-white/50 dark:bg-surface-800/50">
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
            <option value="kanji">Kanji (A-Z)</option>
            <option value="vi">Tiếng Việt (A-Z)</option>
            <option value="en">English (A-Z)</option>
            <option value="unlearned">Từ chưa thuộc</option>
          </select>
          <button onClick={resetProgress} className="btn-secondary shrink-0 bg-white/50 dark:bg-surface-800/50" title="Xoá tiến độ học">
            🔄 Làm mới
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setActiveTopic(null)}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${!activeTopic ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-surface-100 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white'}`}>
          Tất cả
        </button>
        {topics.map(t => (
          <button key={t.id} onClick={() => setActiveTopic(t)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${activeTopic?.id === t.id ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-surface-100 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white'}`}>
            {t.title}
          </button>
        ))}
      </motion.div>

      {sortedItems.length === 0 ? (
        <EmptyState icon="📝" title="Không tìm thấy từ vựng" description="" />
      ) : flashcardMode ? (
        <FlashcardCarousel items={sortedItems} learnedVocab={learnedVocab} onToggle={toggleLearned} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedItems.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.4 }}
              className={`glass-card relative flex flex-col justify-between group transition-all duration-300 ${learnedVocab.includes(item.id) ? 'border-primary-300 dark:border-primary-700/50 bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
              <div>
                <button onClick={() => toggleLearned(item.id)}
                  className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm ${
                    learnedVocab.includes(item.id) ? 'bg-primary-500 text-white shadow-primary-500/30 scale-110' : 'bg-surface-100 dark:bg-surface-800 text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-600 dark:hover:text-surface-200'
                  }`}>
                  {learnedVocab.includes(item.id) ? '✓' : '○'}
                </button>
                <p className="text-4xl font-bold text-surface-900 dark:text-white font-jp mb-1">{item.kanji}</p>
                <p className="text-primary-600 dark:text-primary-400 font-medium text-lg">{item.hiragana}</p>
                <p className="text-xs text-surface-400 mb-4 tracking-wider uppercase">{item.romaji}</p>
                <div className="space-y-2 text-sm mt-4 pt-4 border-t border-surface-100 dark:border-surface-800/50">
                  <p className="text-surface-800 dark:text-surface-200 font-medium flex items-start gap-2">
                    <span className="text-base">🇻🇳</span> 
                    <span className="pt-0.5">{item.meaning_vi}</span>
                  </p>
                  {item.meaning_en?.trim() && (
                    <p className="text-surface-500 flex items-start gap-2">
                      <span className="text-base">🇺🇸</span> 
                      <span className="pt-0.5">{item.meaning_en}</span>
                    </p>
                  )}
                  {item.example_sentence && (
                    <div className="mt-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-300 italic text-sm border border-surface-100 dark:border-surface-800">
                      <span className="font-semibold not-italic mr-1 text-primary-500 text-xs">例:</span>
                      {item.example_sentence}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlashcardCarousel({ items, learnedVocab, onToggle }) {
  const [originalItems, setOriginalItems] = useState([]);
  const [activeItems, setActiveItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setOriginalItems(items);
    const unlearned = items.filter(i => !learnedVocab.includes(i.id));
    setActiveItems(unlearned);
    setIdx(0);
    setFlipped(false);
  }, [items]); // We only rebuild when the source `items` list (search/sort/filter) changes

  // Listen for global reset from the "Làm mới" button
  useEffect(() => {
    if (learnedVocab.length === 0 && activeItems.length < items.length) {
      setOriginalItems(items);
      setActiveItems(items);
      setIdx(0);
      setFlipped(false);
    }
  }, [learnedVocab.length]);

  const markLearned = () => {
    const item = activeItems[idx];
    if (!item) return;
    onToggle(item.id, true); // Force learn
    const nextActive = activeItems.filter(i => i.id !== item.id);
    setActiveItems(nextActive);
    setFlipped(false);
    if (idx >= nextActive.length) {
      setIdx(Math.max(0, nextActive.length - 1));
    }
  };

  const refresh = () => {
    setActiveItems(originalItems);
    setIdx(0);
    setFlipped(false);
  };

  const shuffle = () => {
    const shuffled = [...activeItems].sort(() => Math.random() - 0.5);
    setActiveItems(shuffled);
    setIdx(0);
    setFlipped(false);
  };

  if (activeItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 glass-card max-w-md mx-auto">
        <p className="text-4xl mb-4">🎉</p>
        <p className="text-lg font-bold text-surface-900 dark:text-white mb-4 text-center">Bạn đã hoàn thành lượt ôn này.</p>
        <button onClick={refresh} className="btn-primary">🔄 Làm mới</button>
      </div>
    );
  }

  const item = activeItems[idx];
  const next = () => { setFlipped(false); setIdx(i => (i + 1) % activeItems.length); };
  const prev = () => { setFlipped(false); setIdx(i => (i - 1 + activeItems.length) % activeItems.length); };

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full max-w-md justify-between items-center mb-2 px-2">
        <p className="text-sm font-medium text-surface-500">{idx + 1} / {activeItems.length}</p>
        <div className="flex gap-2">
          <button onClick={shuffle} className="btn-ghost text-xs py-1 px-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200">🔀 Xáo trộn</button>
          <button onClick={refresh} className="btn-ghost text-xs py-1 px-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200">🔄 Làm mới</button>
        </div>
      </div>
      
      <div className="relative w-full max-w-md h-64 cursor-pointer mb-6" style={{ perspective: '1000px' }} onClick={() => setFlipped(f => !f)}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6 }}
          className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex flex-col items-center justify-center text-white shadow-xl p-6"
            style={{ backfaceVisibility: 'hidden' }}>
            <p className="text-6xl font-bold font-jp mb-2">{item.kanji}</p>
            <p className="text-xl opacity-80">{item.hiragana}</p>
            <p className="text-xs opacity-60 mt-2">Nhấn để lật</p>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex flex-col items-center justify-center text-white shadow-xl p-6"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <p className="text-sm opacity-60">{item.romaji}</p>
            <p className="text-2xl font-bold mb-2">{item.meaning_vi}</p>
            {item.meaning_en?.trim() && <p className="text-lg opacity-80">{item.meaning_en}</p>}
            {item.example_sentence && <p className="text-sm opacity-60 mt-3 italic">例: {item.example_sentence}</p>}
          </div>
        </motion.div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={prev} className="btn-secondary">← Trước</button>
        <button onClick={markLearned} className="btn-primary">✓ Đã học</button>
        <button onClick={next} className="btn-secondary">Tiếp →</button>
      </div>
    </div>
  );
}
