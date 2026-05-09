import { useState, useCallback } from 'react';
import { grammarTopicsStore, grammarPointsStore } from '../../store/localStorage';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { v4 as uuid } from 'uuid';

export default function TeacherGrammar() {
  const { isTeacher } = useAuth();
  const [topics, setTopics] = useState(() => grammarTopicsStore.getAll());
  const [points, setPoints] = useState(() => grammarPointsStore.getAll());
  const [activeTopic, setActiveTopic] = useState(null);
  const [search, setSearch] = useState('');
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showPointForm, setShowPointForm] = useState(false);
  const [editTopic, setEditTopic] = useState(null);
  const [editPoint, setEditPoint] = useState(null);
  const [topicForm, setTopicForm] = useState({ title: '', description: '' });
  const blankPoint = { pattern: '', explanation: '', vietnameseExplanation: '', englishExplanation: '', examples: [''], notes: '' };
  const [pointForm, setPointForm] = useState(blankPoint);

  const refresh = useCallback(() => { setTopics(grammarTopicsStore.getAll()); setPoints(grammarPointsStore.getAll()); }, []);

  const saveTopic = (e) => {
    e.preventDefault();
    if (editTopic) grammarTopicsStore.update(editTopic.id, topicForm);
    else grammarTopicsStore.add({ id: uuid(), ...topicForm });
    refresh(); setShowTopicForm(false); setEditTopic(null);
  };
  const deleteTopic = (id) => { if (confirm('Xóa chủ đề?')) { grammarTopicsStore.remove(id); refresh(); if (activeTopic?.id === id) setActiveTopic(null); } };

  const savePoint = (e) => {
    e.preventDefault();
    if (editPoint) grammarPointsStore.update(editPoint.id, pointForm);
    else grammarPointsStore.add({ id: uuid(), topicId: activeTopic.id, learned: false, ...pointForm });
    refresh(); setShowPointForm(false); setEditPoint(null); setPointForm(blankPoint);
  };
  const deletePoint = (id) => { if (confirm('Xóa ngữ pháp?')) { grammarPointsStore.remove(id); refresh(); } };

  const topicPoints = activeTopic ? points.filter(p => p.topicId === activeTopic.id) : points;
  const filtered = topicPoints.filter(p => !search || [p.pattern, p.explanation, p.vietnameseExplanation].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Ngữ pháp N5 📖</h1>
          <p className="text-surface-500 text-sm">{points.length} mẫu ngữ pháp · {topics.length} chủ đề</p>
        </div>
        {isTeacher && (
          <button onClick={() => { setEditTopic(null); setTopicForm({ title: '', description: '' }); setShowTopicForm(true); }}
            className="btn-primary">＋ Thêm chủ đề</button>
        )}
      </div>

      <div className="mb-6"><SearchBar value={search} onChange={setSearch} placeholder="Tìm ngữ pháp..." /></div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveTopic(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${!activeTopic ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}`}>
          Tất cả
        </button>
        {topics.map(t => (
          <div key={t.id} className="flex items-center gap-1">
            <button onClick={() => setActiveTopic(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTopic?.id === t.id ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}`}>
              {t.title}
            </button>
            {isTeacher && <>
              <button onClick={() => { setEditTopic(t); setTopicForm({ title: t.title, description: t.description }); setShowTopicForm(true); }} className="text-xs text-surface-400 hover:text-surface-600 cursor-pointer">✏️</button>
              <button onClick={() => deleteTopic(t.id)} className="text-xs text-surface-400 hover:text-sakura-500 cursor-pointer">✕</button>
            </>}
          </div>
        ))}
      </div>

      {isTeacher && activeTopic && (
        <button onClick={() => { setEditPoint(null); setPointForm(blankPoint); setShowPointForm(true); }}
          className="btn-secondary mb-4 text-sm">＋ Thêm ngữ pháp</button>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="📖" title="Chưa có ngữ pháp" description="Thêm mẫu ngữ pháp đầu tiên." />
      ) : (
        <div className="space-y-4">
          {filtered.map((gp, i) => (
            <motion.div key={gp.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400 font-jp">{gp.pattern}</h3>
                  <p className="text-surface-700 dark:text-surface-300 mt-1">{gp.explanation}</p>
                </div>
                {isTeacher && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditPoint(gp); setPointForm(gp); setShowPointForm(true); }} className="btn-ghost text-xs">✏️</button>
                    <button onClick={() => deletePoint(gp.id)} className="btn-ghost text-xs text-sakura-500">🗑️</button>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm mb-3">
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

      <Modal isOpen={showTopicForm} onClose={() => setShowTopicForm(false)} title={editTopic ? 'Sửa chủ đề' : 'Thêm chủ đề'}>
        <form onSubmit={saveTopic} className="space-y-4">
          <div><label className="input-label">Tên chủ đề</label><input value={topicForm.title} onChange={e => setTopicForm(f => ({ ...f, title: e.target.value }))} required className="input" /></div>
          <div><label className="input-label">Mô tả</label><input value={topicForm.description} onChange={e => setTopicForm(f => ({ ...f, description: e.target.value }))} className="input" /></div>
          <div className="flex gap-3"><button type="button" onClick={() => setShowTopicForm(false)} className="btn-secondary flex-1">Hủy</button><button type="submit" className="btn-primary flex-1">Lưu</button></div>
        </form>
      </Modal>

      <Modal isOpen={showPointForm} onClose={() => setShowPointForm(false)} title={editPoint ? 'Sửa ngữ pháp' : 'Thêm ngữ pháp'} size="lg">
        <form onSubmit={savePoint} className="space-y-4">
          <div><label className="input-label">Mẫu ngữ pháp</label><input value={pointForm.pattern} onChange={e => setPointForm(f => ({ ...f, pattern: e.target.value }))} required className="input" placeholder="〜は〜です" /></div>
          <div><label className="input-label">Giải thích</label><textarea value={pointForm.explanation} onChange={e => setPointForm(f => ({ ...f, explanation: e.target.value }))} className="input h-20 resize-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Tiếng Việt</label><textarea value={pointForm.vietnameseExplanation} onChange={e => setPointForm(f => ({ ...f, vietnameseExplanation: e.target.value }))} className="input h-20 resize-none" /></div>
            <div><label className="input-label">English</label><textarea value={pointForm.englishExplanation} onChange={e => setPointForm(f => ({ ...f, englishExplanation: e.target.value }))} className="input h-20 resize-none" /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="input-label mb-0">Ví dụ</label>
              <button type="button" onClick={() => setPointForm(f => ({ ...f, examples: [...f.examples, ''] }))} className="text-xs text-primary-600 cursor-pointer">＋ Thêm</button>
            </div>
            {pointForm.examples.map((ex, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={ex} onChange={e => { const exs = [...pointForm.examples]; exs[i] = e.target.value; setPointForm(f => ({ ...f, examples: exs })); }} className="input text-sm" placeholder="例文..." />
                {pointForm.examples.length > 1 && <button type="button" onClick={() => setPointForm(f => ({ ...f, examples: f.examples.filter((_, j) => j !== i) }))} className="text-sakura-500 cursor-pointer">✕</button>}
              </div>
            ))}
          </div>
          <div><label className="input-label">Ghi chú</label><input value={pointForm.notes} onChange={e => setPointForm(f => ({ ...f, notes: e.target.value }))} className="input" /></div>
          <div className="flex gap-3"><button type="button" onClick={() => setShowPointForm(false)} className="btn-secondary flex-1">Hủy</button><button type="submit" className="btn-primary flex-1">Lưu</button></div>
        </form>
      </Modal>
    </div>
  );
}
