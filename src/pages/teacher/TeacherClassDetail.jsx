import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classesStore, sessionsStore } from '../../store/localStorage';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuid } from 'uuid';

const ACCEPTED = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';
const TYPE_MAP = { pdf: '📄', doc: '📝', docx: '📝', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️' };

function getExt(name) { return (name || '').split('.').pop().toLowerCase(); }
function getIcon(name) { return TYPE_MAP[getExt(name)] || '📎'; }
function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function fileToMeta(file) {
  return new Promise(resolve => {
    const meta = { id: uuid(), name: file.name, size: file.size, type: getExt(file.name), mime: file.type };
    const r = new FileReader();
    r.onload = () => { meta.dataUrl = r.result; resolve(meta); };
    r.onerror = () => { meta.dataUrl = ''; resolve(meta); };
    r.readAsDataURL(file);
  });
}

function downloadFile(f, toast) {
  try {
    if (!f.dataUrl) { toast('Không thể tải file này', 'error'); return; }
    const a = document.createElement('a');
    a.href = f.dataUrl;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('Đã tải file thành công');
  } catch {
    toast('Không thể tải file này', 'error');
  }
}

function canPreview(f) {
  return f.dataUrl && ['pdf','jpg','jpeg','png','webp'].includes(f.type);
}

/* ── Drag & Drop Upload Area ── */
function FileUploadArea({ files, onChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const toast = useToast();

  const addFiles = async (fileList) => {
    const valid = Array.from(fileList).filter(f => {
      const ext = getExt(f.name);
      return ['pdf','doc','docx','jpg','jpeg','png','webp'].includes(ext);
    });
    const metas = await Promise.all(valid.map(fileToMeta));
    onChange([...files, ...metas]);
  };

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const remove = (id) => onChange(files.filter(f => f.id !== id));

  return (
    <div>
      <label className="input-label">Tài liệu đính kèm ({files.length})</label>

      {/* Drop zone */}
      <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 text-center py-8 px-4 group ${
          dragOver
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]'
            : 'border-surface-300 dark:border-surface-600 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10'
        }`}>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <motion.div animate={{ scale: dragOver ? 1.1 : 1 }} className="text-4xl mb-2">📁</motion.div>
        <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Kéo thả file vào đây</p>
        <p className="text-xs text-surface-400 mt-1">hoặc nhấn để chọn file</p>
        <p className="text-[10px] text-surface-400 mt-2">PDF, Word (.doc/.docx), Hình ảnh (.jpg, .png, .webp)</p>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2">
            {files.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 group/item hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                {f.dataUrl && ['jpg','jpeg','png','webp'].includes(f.type) ? (
                  <img src={f.dataUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">
                    {getIcon(f.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{f.name}</p>
                  <p className="text-xs text-surface-400">{fmtSize(f.size)} · {f.type?.toUpperCase()}</p>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); downloadFile(f, toast); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600 transition-colors text-sm cursor-pointer opacity-0 group-hover/item:opacity-100"
                  title="Tải xuống">⬇️</button>
                {canPreview(f) && (
                  <a href={f.dataUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors text-sm"
                    title="Xem trước">👁️</a>
                )}
                <button type="button" onClick={() => remove(f.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-sakura-50 dark:hover:bg-sakura-900/20 text-sakura-500 transition-colors cursor-pointer opacity-0 group-hover/item:opacity-100 text-sm"
                  title="Xóa">✕</button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Page ── */
export default function TeacherClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const cls = classesStore.getById(classId);
  const [sessions, setSessions] = useState(() => sessionsStore.getByClass(classId));
  const [showForm, setShowForm] = useState(false);
  const [editSess, setEditSess] = useState(null);
  const [activeSess, setActiveSess] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const blank = { title: '', date: '', description: '', homework: '', notes: '', files: [], quiz: [], flashcards: [] };
  const [form, setForm] = useState(blank);
  const refresh = useCallback(() => setSessions(sessionsStore.getByClass(classId)), [classId]);

  if (!cls) return <EmptyState icon="❌" title="Không tìm thấy lớp" description="Lớp học không tồn tại." />;

  const handleSave = (e) => {
    e.preventDefault();
    if (editSess) {
      sessionsStore.update(editSess.id, form);
    } else {
      sessionsStore.add({ id: uuid(), classId, order: sessions.length + 1, ...form });
    }
    refresh(); setShowForm(false); setEditSess(null); setForm(blank);
  };

  const handleEditSession = (s) => {
    setEditSess(s);
    setForm({ title: s.title, date: s.date, description: s.description, homework: s.homework || '', notes: s.notes || '', files: s.files || [], quiz: s.quiz || [], flashcards: s.flashcards || [] });
    setShowForm(true);
  };

  const handleDeleteSession = (id) => {
    if (confirm('Xóa buổi học này?')) { sessionsStore.remove(id); refresh(); if (activeSess?.id === id) setActiveSess(null); }
  };

  const addQuiz = () => setForm(f => ({ ...f, quiz: [...f.quiz, { id: uuid(), question: '', options: ['', '', '', ''], answer: 0 }] }));
  const updateQuiz = (idx, field, val) => setForm(f => { const q = [...f.quiz]; q[idx] = { ...q[idx], [field]: val }; return { ...f, quiz: q }; });
  const removeQuiz = (idx) => setForm(f => ({ ...f, quiz: f.quiz.filter((_, i) => i !== idx) }));
  const addFlashcard = () => setForm(f => ({ ...f, flashcards: [...f.flashcards, { id: uuid(), front: '', back: '' }] }));
  const updateFlashcard = (idx, field, val) => setForm(f => { const fc = [...f.flashcards]; fc[idx] = { ...fc[idx], [field]: val }; return { ...f, flashcards: fc }; });
  const removeFlashcard = (idx) => setForm(f => ({ ...f, flashcards: f.flashcards.filter((_, i) => i !== idx) }));

  const tabs = [
    { key: 'description', icon: '📋', label: 'Nội dung' },
    { key: 'files', icon: '📁', label: 'Files' },
    { key: 'homework', icon: '📝', label: 'Bài tập' },
    { key: 'quiz', icon: '❓', label: 'Quiz' },
    { key: 'flashcards', icon: '🃏', label: 'Flashcard' },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/teacher/classes')} className="btn-ghost">← Quay lại</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cls.thumbnail}</span>
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{cls.name}</h1>
              <p className="text-surface-500 text-sm">{cls.level} · {cls.schedule}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white">Buổi học ({sessions.length})</h3>
            <button onClick={() => { setEditSess(null); setForm(blank); setShowForm(true); }} className="btn-primary text-sm py-2 px-3">＋ Thêm</button>
          </div>
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { setActiveSess(s); setActiveTab('description'); }}
                className={`p-4 rounded-xl cursor-pointer transition-all ${activeSess?.id === s.id ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500' : 'glass hover:shadow-md'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-surface-900 dark:text-white">Session {String(s.order).padStart(2, '0')}</p>
                    <p className="text-xs text-surface-500">{s.title}</p>
                    <p className="text-xs text-surface-400 mt-0.5">📅 {s.date}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleEditSession(s); }} className="text-xs hover:bg-surface-100 dark:hover:bg-surface-700 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer">✏️</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} className="text-xs hover:bg-sakura-50 dark:hover:bg-sakura-900/20 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer">🗑️</button>
                  </div>
                </div>
              </motion.div>
            ))}
            {sessions.length === 0 && <EmptyState icon="📅" title="Chưa có buổi học" description="Thêm buổi học đầu tiên." />}
          </div>
        </div>

        {/* Session Detail */}
        <div className="lg:col-span-2">
          {activeSess ? (
            <div className="glass-card">
              <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-4">
                Session {String(activeSess.order).padStart(2, '0')} | {activeSess.date} | {activeSess.title}
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === t.key ? 'bg-primary-500 text-white shadow-md' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  {activeTab === 'description' && (
                    <div>
                      <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{activeSess.description || 'Chưa có nội dung.'}</p>
                      {activeSess.notes && (
                        <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <p className="font-medium text-amber-700 dark:text-amber-400 text-sm mb-1">📌 Ghi chú</p>
                          <p className="text-sm text-amber-600 dark:text-amber-300">{activeSess.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'files' && <TeacherFilesList files={activeSess.files} />}
                  {activeTab === 'homework' && (
                    <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
                      <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{activeSess.homework || 'Chưa có bài tập.'}</p>
                    </div>
                  )}
                  {activeTab === 'quiz' && (
                    <div className="space-y-4">
                      {(activeSess.quiz || []).length === 0 ? <p className="text-surface-500">Chưa có quiz.</p> : activeSess.quiz.map((q, i) => (
                        <div key={q.id} className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
                          <p className="font-medium text-surface-900 dark:text-white mb-2">Câu {i + 1}: {q.question}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((o, oi) => (
                              <div key={oi} className={`p-2 rounded-lg text-sm ${oi === q.answer ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : 'bg-white dark:bg-surface-700 text-surface-600 dark:text-surface-300'}`}>
                                {String.fromCharCode(65 + oi)}. {o}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'flashcards' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(activeSess.flashcards || []).length === 0 ? <p className="text-surface-500">Chưa có flashcard.</p> : activeSess.flashcards.map(fc => (
                        <FlipCard key={fc.id} front={fc.front} back={fc.back} />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="glass-card flex items-center justify-center h-64">
              <p className="text-surface-400">← Chọn một buổi học để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {/* Session Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditSess(null); }} title={editSess ? 'Sửa buổi học' : 'Thêm buổi học'} size="lg">
        <form onSubmit={handleSave} className="space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Tiêu đề</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="input" placeholder="Hiragana あ～お" /></div>
            <div><label className="input-label">Ngày</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input" /></div>
          </div>
          <div><label className="input-label">Nội dung bài học</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input h-24 resize-none" placeholder="Mô tả nội dung bài học..." /></div>
          <div><label className="input-label">Bài tập về nhà</label><textarea value={form.homework} onChange={e => setForm(f => ({ ...f, homework: e.target.value }))} className="input h-20 resize-none" placeholder="Bài tập..." /></div>

          {/* ── FILE UPLOAD SECTION ── */}
          <FileUploadArea files={form.files} onChange={(files) => setForm(f => ({ ...f, files }))} />

          <div><label className="input-label">Ghi chú</label><input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" placeholder="Ghi chú thêm..." /></div>

          {/* Quiz builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label mb-0">Quiz ({form.quiz.length})</label>
              <button type="button" onClick={addQuiz} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">＋ Thêm câu hỏi</button>
            </div>
            {form.quiz.map((q, qi) => (
              <div key={q.id} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <input value={q.question} onChange={e => updateQuiz(qi, 'question', e.target.value)} className="input text-sm flex-1" placeholder="Câu hỏi..." />
                  <button type="button" onClick={() => removeQuiz(qi)} className="text-sakura-500 cursor-pointer">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-1">
                      <input type="radio" name={`answer-${qi}`} checked={q.answer === oi} onChange={() => updateQuiz(qi, 'answer', oi)} />
                      <input value={o} onChange={e => { const opts = [...q.options]; opts[oi] = e.target.value; updateQuiz(qi, 'options', opts); }}
                        className="input text-sm" placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Flashcard builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label mb-0">Flashcards ({form.flashcards.length})</label>
              <button type="button" onClick={addFlashcard} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">＋ Thêm flashcard</button>
            </div>
            {form.flashcards.map((fc, fi) => (
              <div key={fc.id} className="flex items-center gap-2 mb-2">
                <input value={fc.front} onChange={e => updateFlashcard(fi, 'front', e.target.value)} className="input text-sm" placeholder="Mặt trước (JP)" />
                <input value={fc.back} onChange={e => updateFlashcard(fi, 'back', e.target.value)} className="input text-sm" placeholder="Mặt sau (nghĩa)" />
                <button type="button" onClick={() => removeFlashcard(fi)} className="text-sakura-500 cursor-pointer">✕</button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-surface-900 pb-1">
            <button type="button" onClick={() => { setShowForm(false); setEditSess(null); }} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1">{editSess ? 'Cập nhật' : 'Tạo buổi học'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ── Teacher Files tab (read-only preview in detail panel) ── */
function TeacherFilesList({ files }) {
  const toast = useToast();
  if (!files || files.length === 0) return <p className="text-surface-500">Chưa có file.</p>;
  return (
    <div className="space-y-2">
      {files.map(f => (
        <div key={f.id}
          onClick={() => downloadFile(f, toast)}
          className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
          {f.dataUrl && ['jpg','jpeg','png','webp'].includes(f.type) ? (
            <img src={f.dataUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">{getIcon(f.name)}</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate">{f.name}</p>
            <p className="text-xs text-surface-400">{fmtSize(f.size)} · {(f.type || getExt(f.name)).toUpperCase()}</p>
          </div>
          <span className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg" title="Tải xuống">⬇️</span>
          {canPreview(f) && (
            <a href={f.dataUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-medium hover:bg-primary-100 transition-colors">Xem ↗</a>
          )}
        </div>
      ))}
    </div>
  );
}

function FlipCard({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="relative h-40 cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setFlipped(f => !f)}>
      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6 }}
        className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}>{front}</div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-lg font-medium p-4 text-center shadow-lg"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{back}</div>
      </motion.div>
    </div>
  );
}
