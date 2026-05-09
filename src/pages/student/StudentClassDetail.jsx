import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classesStore, sessionsStore } from '../../store/localStorage';
import { useAuth } from '../../contexts/AuthContext';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentClassDetail() {
  const { classId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cls = classesStore.getById(classId);
  const sessions = sessionsStore.getByClass(classId);
  const [openSessId, setOpenSessId] = useState(null);
  const [activeTab, setActiveTab] = useState('content');

  if (!cls) return <EmptyState icon="❌" title="Không tìm thấy lớp" description="" />;

  const tabs = [
    { key: 'content', icon: '📋', label: 'Nội dung' },
    { key: 'files', icon: '📁', label: 'Files' },
    { key: 'homework', icon: '📝', label: 'Bài tập' },
    { key: 'quiz', icon: '❓', label: 'Quiz' },
    { key: 'flashcards', icon: '🃏', label: 'Flashcard' },
  ];

  return (
    <div>
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-primary-600/5" />
        <div className="relative">
          <button onClick={() => navigate('/student')} className="btn-ghost text-sm mb-3">← Quay lại</button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-3xl shadow-lg shadow-primary-500/20">
              {cls.thumbnail}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{cls.name}</h1>
              <p className="text-surface-500 text-sm">👩‍🏫 {cls.teacherName} · {cls.level} · {cls.schedule}</p>
            </div>
          </div>
          {cls.description && <p className="mt-3 text-sm text-surface-600 dark:text-surface-400">{cls.description}</p>}
        </div>
      </motion.div>

      {/* Accordion sessions */}
      {sessions.length === 0 ? (
        <EmptyState icon="📅" title="Chưa có buổi học" description="Lớp này chưa có buổi học nào." />
      ) : (
        <div className="space-y-3">
          {sessions.map((sess, i) => {
            const isOpen = openSessId === sess.id;
            return (
              <motion.div key={sess.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <button onClick={() => { setOpenSessId(isOpen ? null : sess.id); setActiveTab('content'); }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left cursor-pointer transition-all duration-300 ${
                    isOpen ? 'bg-primary-50 dark:bg-primary-900/20 shadow-md' : 'glass-card hover:shadow-lg'
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                    isOpen ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                  }`}>
                    {String(sess.order).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-900 dark:text-white text-sm">
                      Session {String(sess.order).padStart(2, '0')} | {sess.date} | {sess.title}
                    </p>
                    {sess.time && <p className="text-xs text-surface-400 mt-0.5">🕐 {sess.time}</p>}
                  </div>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-surface-400 text-lg">▼</motion.span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }} className="overflow-hidden">
                      <div className="ml-4 mt-2 p-5 rounded-xl bg-white/50 dark:bg-surface-800/50 border border-surface-200/50 dark:border-surface-700/50">
                        <div className="flex flex-wrap gap-2 mb-5">
                          {tabs.map(t => (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                activeTab === t.key ? 'bg-primary-500 text-white shadow-md' : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200'
                              }`}>
                              {t.icon} {t.label}
                            </button>
                          ))}
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                            {activeTab === 'content' && (
                              <div>
                                <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap text-sm">{sess.description || 'Chưa có nội dung.'}</p>
                                {sess.notes && (
                                  <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">📌 Ghi chú</p>
                                    <p className="text-sm text-amber-600 dark:text-amber-300">{sess.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {activeTab === 'files' && <FilesList files={sess.files} />}
                            {activeTab === 'homework' && (
                              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
                                <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{sess.homework || 'Chưa có bài tập.'}</p>
                              </div>
                            )}
                            {activeTab === 'quiz' && <StudentQuiz quiz={sess.quiz || []} sessId={sess.id} userId={user.id} />}
                            {activeTab === 'flashcards' && <FlashcardArea flashcards={sess.flashcards || []} />}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilesList({ files }) {
  const toast = useToast();
  if (!files || files.length === 0) return <p className="text-surface-500 text-sm">Chưa có file.</p>;
  const typeIcons = { pdf: '📄', doc: '📝', docx: '📝', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️', video: '🎥', audio: '🎵', link: '🔗' };
  const fmtSize = (b) => { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; };
  const canPreview = (f) => f.dataUrl && ['pdf','jpg','jpeg','png','webp'].includes(f.type);

  const handleDownload = (f) => {
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
  };

  return (
    <div className="space-y-2">
      {files.map(f => (
        <div key={f.id}
          onClick={() => handleDownload(f)}
          className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
          {f.dataUrl && ['jpg','jpeg','png','webp'].includes(f.type) ? (
            <img src={f.dataUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">
              {typeIcons[f.type] || '📎'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate">{f.name}</p>
            <p className="text-xs text-surface-400">{fmtSize(f.size)} · {(f.type || '').toUpperCase()}</p>
          </div>
          <span className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg" title="Tải xuống">⬇️</span>
          {canPreview(f) && (
            <a href={f.dataUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-medium hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
              Xem ↗
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function StudentQuiz({ quiz, sessId, userId }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  if (quiz.length === 0) return <p className="text-surface-500 text-sm">Chưa có quiz.</p>;

  const handleSubmit = () => {
    const correct = quiz.filter((q, i) => answers[i] === q.answer).length;
    setScore({ correct, total: quiz.length });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 mb-4">
          <p className="text-lg font-bold text-primary-700 dark:text-primary-400">🎉 {score.correct}/{score.total} câu đúng</p>
        </div>
        {quiz.map((q, i) => (
          <div key={q.id} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 mb-2">
            <p className="text-sm font-medium text-surface-900 dark:text-white mb-2">Câu {i + 1}: {q.question}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {q.options.map((o, oi) => (
                <div key={oi} className={`p-2 rounded-lg text-xs ${
                  oi === q.answer ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                  : answers[i] === oi ? 'bg-sakura-100 dark:bg-sakura-900/20 text-sakura-600' : 'bg-white dark:bg-surface-700 text-surface-600 dark:text-surface-300'
                }`}>{oi === q.answer ? '✓' : answers[i] === oi ? '✗' : ''} {String.fromCharCode(65 + oi)}. {o}</div>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => { setSubmitted(false); setAnswers({}); setScore(null); }} className="btn-secondary mt-3 text-sm">Làm lại</button>
      </div>
    );
  }

  return (
    <div>
      {quiz.map((q, i) => (
        <div key={q.id} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 mb-2">
          <p className="text-sm font-medium text-surface-900 dark:text-white mb-2">Câu {i + 1}: {q.question}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {q.options.map((o, oi) => (
              <button key={oi} onClick={() => setAnswers(a => ({ ...a, [i]: oi }))}
                className={`p-2.5 rounded-lg text-xs text-left cursor-pointer transition-all ${
                  answers[i] === oi ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500 text-primary-700 dark:text-primary-400 font-medium'
                  : 'bg-white dark:bg-surface-700 text-surface-600 dark:text-surface-300 border-2 border-transparent hover:border-surface-300'
                }`}>{String.fromCharCode(65 + oi)}. {o}</button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={handleSubmit} disabled={Object.keys(answers).length < quiz.length}
        className="btn-primary mt-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
        Nộp bài ({Object.keys(answers).length}/{quiz.length})
      </button>
    </div>
  );
}

function FlashcardArea({ flashcards }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (flashcards.length === 0) return <p className="text-surface-500 text-sm">Chưa có flashcard.</p>;
  const fc = flashcards[idx];

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-surface-500 mb-3">{idx + 1}/{flashcards.length}</p>
      <div className="relative w-full max-w-sm h-48 cursor-pointer mb-4" style={{ perspective: '1000px' }} onClick={() => setFlipped(f => !f)}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6 }}
          className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl p-6"
            style={{ backfaceVisibility: 'hidden' }}>{fc.front}</div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-lg font-medium p-6 text-center shadow-xl"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{fc.back}</div>
        </motion.div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => { setFlipped(false); setIdx(i => (i - 1 + flashcards.length) % flashcards.length); }} className="btn-secondary text-sm">← Trước</button>
        <button onClick={() => { setFlipped(false); setIdx(i => (i + 1) % flashcards.length); }} className="btn-secondary text-sm">Tiếp →</button>
      </div>
    </div>
  );
}
