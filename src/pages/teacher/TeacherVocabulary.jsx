import { useState, useEffect, useCallback } from 'react';
import vocabularyService from '../../services/vocabularyService';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { useToast } from '../../components/ui/Toast';
import { motion } from 'framer-motion';
import { v4 as uuid } from 'uuid';

export default function TeacherVocabulary() {
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const [topics, setTopics] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editTopic, setEditTopic] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [topicForm, setTopicForm] = useState({ title: '', description: '' });
  const blankItem = { kanji: '', hiragana: '', romaji: '', meaning_vi: '', meaning_en: '', example_sentence: '' };
  const [itemForm, setItemForm] = useState(blankItem);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const [t, i] = await Promise.all([vocabularyService.getTopics(), vocabularyService.getAllItems()]);
    setTopics(t); setItems(i);
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  const saveTopic = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editTopic) await vocabularyService.updateTopic(editTopic.id, topicForm);
      else await vocabularyService.createTopic({ id: uuid(), createdBy: user?.id, ...topicForm });
      await refresh(); setShowTopicForm(false); setEditTopic(null);
      toast?.('Đã lưu chủ đề');
    } catch (err) {
      console.error('[VocabTopic] Supabase error:', err);
      setError(err.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const deleteTopic = async (id) => {
    if (confirm('Xóa chủ đề này?')) {
      await vocabularyService.removeTopic(id);
      await refresh();
      if (activeTopic?.id === id) setActiveTopic(null);
    }
  };

  const saveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      console.log('Saving item, id:', editItem?.id, 'form:', itemForm);
      if (editItem) await vocabularyService.updateItem(editItem.id, itemForm);
      else await vocabularyService.createItem({ id: uuid(), topicId: activeTopic.id, learned: false, ...itemForm });
      await refresh(); setShowItemForm(false); setEditItem(null); setItemForm(blankItem);
      toast?.('Đã lưu từ vựng thành công');
    } catch (err) {
      console.error('[VocabItem] Supabase error:', err);
      setError(err.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    if (confirm('Xóa từ vựng này?')) { await vocabularyService.removeItem(id); await refresh(); }
  };

  if (loading) return <LoadingSkeleton type="cards" count={6} />;

  const topicItems = activeTopic ? items.filter(i => i.topicId === activeTopic.id) : items;
  const filtered = topicItems.filter(i => !search || [i.kanji, i.hiragana, i.romaji, i.meaning_vi, i.meaning_en].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  let sortedItems = [...filtered];
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Từ vựng N5 📝</h1>
          <p className="text-surface-500 text-sm">{items.length} từ · {topics.length} chủ đề</p>
        </div>
        {isTeacher && (
          <button onClick={() => { setEditTopic(null); setTopicForm({ title: '', description: '' }); setShowTopicForm(true); }}
            className="btn-primary">＋ Thêm chủ đề</button>
        )}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Tìm từ vựng..." />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input sm:max-w-xs">
          <option value="newest">Mới nhất trước</option>
          <option value="oldest">Cũ nhất trước</option>
          <option value="kanji">Kanji (A-Z)</option>
          <option value="vi">Tiếng Việt (A-Z)</option>
          <option value="en">English (A-Z)</option>
        </select>
      </div>

      {/* Topic chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveTopic(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${!activeTopic ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200'}`}>
          Tất cả
        </button>
        {topics.map(t => (
          <div key={t.id} className="flex items-center gap-1">
            <button onClick={() => setActiveTopic(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTopic?.id === t.id ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200'}`}>
              {t.title}
            </button>
            {isTeacher && <>
              <button onClick={() => { setEditTopic(t); setTopicForm({ title: t.title, description: t.description }); setShowTopicForm(true); }}
                className="text-xs text-surface-400 hover:text-surface-600 cursor-pointer">✏️</button>
              <button onClick={() => deleteTopic(t.id)} className="text-xs text-surface-400 hover:text-sakura-500 cursor-pointer">✕</button>
            </>}
          </div>
        ))}
      </div>

      {isTeacher && activeTopic && (
        <button onClick={() => { setEditItem(null); setItemForm(blankItem); setShowItemForm(true); }}
          className="btn-secondary mb-4 text-sm">＋ Thêm từ vựng vào "{activeTopic.title}"</button>
      )}

      {sortedItems.length === 0 ? (
        <EmptyState icon="📝" title="Chưa có từ vựng" description="Thêm từ vựng đầu tiên." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedItems.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-3xl font-bold text-surface-900 dark:text-white font-jp">{item.kanji}</p>
                    <p className="text-primary-600 dark:text-primary-400 font-medium">{item.hiragana}</p>
                  </div>
                  {isTeacher && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditItem(item); setItemForm({ kanji: item.kanji, hiragana: item.hiragana, romaji: item.romaji, meaning_vi: item.meaning_vi, meaning_en: item.meaning_en, example_sentence: item.example_sentence }); setShowItemForm(true); }} className="btn-ghost text-xs">✏️</button>
                      <button onClick={() => deleteItem(item.id)} className="btn-ghost text-xs text-sakura-500">🗑️</button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-surface-400 mb-2">{item.romaji}</p>
                <div className="space-y-1 text-sm">
                  <p className="text-surface-700 dark:text-surface-300">🇻🇳 {item.meaning_vi}</p>
                  {item.meaning_en?.trim() && <p className="text-surface-500">🇺🇸 {item.meaning_en}</p>}
                  {item.example_sentence && <p className="text-xs text-surface-400 mt-2 italic">例: {item.example_sentence}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showTopicForm} onClose={() => setShowTopicForm(false)} title={editTopic ? 'Sửa chủ đề' : 'Thêm chủ đề'}>
        <form onSubmit={saveTopic} className="space-y-4">
          {error && <div className="text-sm text-sakura-600 bg-sakura-50 dark:bg-sakura-900/20 p-3 rounded-xl border border-sakura-200 dark:border-sakura-800">{error}</div>}
          <div><label className="input-label">Tên chủ đề</label><input value={topicForm.title} onChange={e => setTopicForm(f => ({ ...f, title: e.target.value }))} required className="input" /></div>
          <div><label className="input-label">Mô tả</label><input value={topicForm.description} onChange={e => setTopicForm(f => ({ ...f, description: e.target.value }))} className="input" /></div>
          <div className="flex gap-3"><button type="button" onClick={() => setShowTopicForm(false)} className="btn-secondary flex-1">Hủy</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={showItemForm} onClose={() => setShowItemForm(false)} title={editItem ? 'Sửa từ vựng' : 'Thêm từ vựng'}>
        <form onSubmit={saveItem} className="space-y-4">
          {error && <div className="text-sm text-sakura-600 bg-sakura-50 dark:bg-sakura-900/20 p-3 rounded-xl border border-sakura-200 dark:border-sakura-800">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Kanji</label><input value={itemForm.kanji} onChange={e => setItemForm(f => ({ ...f, kanji: e.target.value }))} required className="input" /></div>
            <div><label className="input-label">Hiragana</label><input value={itemForm.hiragana} onChange={e => setItemForm(f => ({ ...f, hiragana: e.target.value }))} className="input" /></div>
          </div>
          <div><label className="input-label">Romaji</label><input value={itemForm.romaji} onChange={e => setItemForm(f => ({ ...f, romaji: e.target.value }))} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Tiếng Việt</label><input value={itemForm.meaning_vi} onChange={e => setItemForm(f => ({ ...f, meaning_vi: e.target.value }))} required className="input" /></div>
            <div><label className="input-label">English (Tùy chọn)</label><input value={itemForm.meaning_en} onChange={e => setItemForm(f => ({ ...f, meaning_en: e.target.value }))} className="input" /></div>
          </div>
          <div><label className="input-label">Ví dụ</label><input value={itemForm.example_sentence} onChange={e => setItemForm(f => ({ ...f, example_sentence: e.target.value }))} className="input" /></div>
          <div className="flex gap-3"><button type="button" onClick={() => setShowItemForm(false)} className="btn-secondary flex-1">Hủy</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
