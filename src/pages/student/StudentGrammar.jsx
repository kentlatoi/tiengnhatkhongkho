import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import grammarService from '../../services/grammarService';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion } from 'framer-motion';

export default function StudentGrammar() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState(null);
  const [search, setSearch] = useState('');
  const [learnedGrammar, setLearnedGrammar] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, p] = await Promise.all([grammarService.getTopics(), grammarService.getAllPoints()]);
        setTopics(t); setPoints(p);
        try { const pr = JSON.parse(localStorage.getItem(`progress_${user.id}`) || '{}'); setLearnedGrammar(pr.learnedGrammar || []); } catch {}
      } catch (err) {
        console.error('[StudentGrammar] ❌ Load error:', err);
        setTopics([]); setPoints([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const topicPoints = activeTopic ? points.filter(p => p.topicId === activeTopic.id) : points;
  const filtered = topicPoints.filter(p => !search || [p.pattern, p.explanation, p.vietnameseExplanation].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  const toggleLearned = (gId) => {
    setLearnedGrammar(prev => {
      const next = prev.includes(gId) ? prev.filter(id => id !== gId) : [...prev, gId];
      try { const p = JSON.parse(localStorage.getItem(`progress_${user.id}`) || '{}'); p.learnedGrammar = next; localStorage.setItem(`progress_${user.id}`, JSON.stringify(p)); } catch {}
      return next;
    });
  };

  if (loading) return <LoadingSkeleton type="cards" count={4} />;

  return (
    <div className="pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-white tracking-tight">Ngữ pháp N5 📖</h1>
          <p className="text-surface-500 mt-1 font-medium">{learnedGrammar.length} / {points.length} mẫu đã học</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="glass p-4 rounded-2xl mb-8">
        <SearchBar value={search} onChange={setSearch} placeholder="Tìm ngữ pháp, ý nghĩa..." />
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

      {filtered.length === 0 ? (
        <EmptyState icon="📖" title="Không tìm thấy ngữ pháp" description="Vui lòng thử từ khoá khác." />
      ) : (
        <div className="space-y-6">
          {filtered.map((gp, i) => (
            <motion.div key={gp.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.4 }}
              className={`glass-card relative transition-all duration-300 group ${learnedGrammar.includes(gp.id) ? 'border-primary-300 dark:border-primary-700/50 bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
              <button onClick={() => toggleLearned(gp.id)}
                className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm ${
                  learnedGrammar.includes(gp.id) ? 'bg-primary-500 text-white shadow-primary-500/30 scale-110' : 'bg-surface-100 dark:bg-surface-800 text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-600 dark:hover:text-surface-200'
                }`}>
                {learnedGrammar.includes(gp.id) ? '✓' : '○'}
              </button>
              
              <div className="pr-12">
                <h3 className="text-2xl font-bold text-primary-600 dark:text-primary-400 font-jp mb-3">{gp.pattern}</h3>
                <p className="text-surface-800 dark:text-surface-200 font-medium mb-3 text-lg leading-relaxed">{gp.explanation}</p>
                <div className="space-y-2 text-sm mb-5 p-4 rounded-xl bg-surface-50/50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700">
                  <p className="text-surface-700 dark:text-surface-300 flex items-start gap-2">
                    <span className="text-base">🇻🇳</span> 
                    <span className="pt-0.5">{gp.vietnameseExplanation}</span>
                  </p>
                  {gp.englishExplanation && (
                    <p className="text-surface-500 flex items-start gap-2">
                      <span className="text-base">🇺🇸</span> 
                      <span className="pt-0.5">{gp.englishExplanation}</span>
                    </p>
                  )}
                </div>
              </div>
              
              {gp.examples && gp.examples.length > 0 && (
                <div className="p-4 rounded-xl bg-white/60 dark:bg-surface-900/40 space-y-2 border border-surface-100 dark:border-surface-800">
                  <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">例文 Ví dụ</p>
                  {gp.examples.map((ex, ei) => <p key={ei} className="text-sm text-surface-800 dark:text-surface-200 font-medium leading-relaxed">• {ex}</p>)}
                </div>
              )}
              {gp.notes && <p className="text-sm text-surface-500 mt-4 italic flex items-center gap-2"><span className="text-amber-500">📌</span> {gp.notes}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
