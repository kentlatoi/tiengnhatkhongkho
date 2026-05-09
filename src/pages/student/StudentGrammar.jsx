import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { grammarTopicsStore, grammarPointsStore, progressStore } from '../../store/localStorage';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';

export default function StudentGrammar() {
  const { user } = useAuth();
  const topics = grammarTopicsStore.getAll();
  const points = grammarPointsStore.getAll();
  const [activeTopic, setActiveTopic] = useState(null);
  const [search, setSearch] = useState('');
  const [progress, setProgress] = useState(() => progressStore.getForStudent(user.id));

  const topicPoints = activeTopic ? points.filter(p => p.topicId === activeTopic.id) : points;
  const filtered = topicPoints.filter(p => !search || [p.pattern, p.explanation, p.vietnameseExplanation].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const learnedGrammar = progress.learnedGrammar || [];

  const toggleLearned = (gId) => {
    progressStore.toggleLearnedGrammar(user.id, gId);
    setProgress(progressStore.getForStudent(user.id));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Ngữ pháp N5 📖</h1>
          <p className="text-surface-500 text-sm">{learnedGrammar.length}/{points.length} mẫu đã học</p>
        </div>
      </div>

      <div className="mb-6"><SearchBar value={search} onChange={setSearch} placeholder="Tìm ngữ pháp..." /></div>

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
        <EmptyState icon="📖" title="Không tìm thấy ngữ pháp" description="" />
      ) : (
        <div className="space-y-4">
          {filtered.map((gp, i) => (
            <motion.div key={gp.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`glass-card relative ${learnedGrammar.includes(gp.id) ? 'ring-2 ring-primary-400' : ''}`}>
              <button onClick={() => toggleLearned(gp.id)}
                className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                  learnedGrammar.includes(gp.id) ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-400'
                }`}>
                {learnedGrammar.includes(gp.id) ? '✓' : '○'}
              </button>
              <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400 font-jp mb-2">{gp.pattern}</h3>
              <p className="text-surface-700 dark:text-surface-300 mb-2">{gp.explanation}</p>
              <div className="space-y-1 text-sm mb-3">
                <p className="text-surface-600 dark:text-surface-400">🇻🇳 {gp.vietnameseExplanation}</p>
                <p className="text-surface-500">🇺🇸 {gp.englishExplanation}</p>
              </div>
              {gp.examples && gp.examples.length > 0 && (
                <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 space-y-1">
                  <p className="text-xs font-medium text-surface-500 mb-1">例文 Ví dụ:</p>
                  {gp.examples.map((ex, ei) => <p key={ei} className="text-sm text-surface-700 dark:text-surface-300">• {ex}</p>)}
                </div>
              )}
              {gp.notes && <p className="text-xs text-surface-400 mt-2 italic">📌 {gp.notes}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
