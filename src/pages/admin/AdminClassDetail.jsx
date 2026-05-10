import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';
import calendarService from '../../services/calendarService';
import activityLogService from '../../services/activityLogService';
import userService from '../../services/userService';
import { formatFileSize, getFileIcon, canPreview, downloadFile, isAudioFile } from '../../services/fileService';
import AudioPlayer from '../../components/ui/AudioPlayer';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminClassDetail() {
  const { classId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [cls, setCls] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSess, setActiveSess] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [deleteSession, setDeleteSession] = useState(null);
  const [deleteClass, setDeleteClass] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const c = await classService.getById(classId);
      if (!c) { setLoading(false); return; }
      setCls(c);
      const [sess, evts, studentIds] = await Promise.all([
        sessionService.getByClass(classId),
        calendarService.getByClass(classId),
        classService.getStudentIds(classId),
      ]);
      setSessions(sess); setEvents(evts);
      const t = c.teacherId ? await userService.getById(c.teacherId) : null;
      setTeacher(t);
      if (studentIds.length > 0) {
        const studs = await Promise.all(studentIds.map(id => userService.getById(id)));
        setStudents(studs.filter(Boolean));
      }
      activityLogService.log(user, `Xem chi tiết lớp: ${c.name}`).catch(() => {});
    } catch (err) {
      console.error('[AdminClassDetail] ❌ Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [classId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const refreshSessions = useCallback(async () => {
    const sess = await sessionService.getByClass(classId);
    setSessions(sess);
  }, [classId]);

  if (loading) return <LoadingSkeleton type="cards" count={4} />;
  if (!cls) return <EmptyState icon="❌" title="Không tìm thấy lớp" description="Lớp học không tồn tại." />;

  const handleDeleteClass = async () => {
    await classService.deleteClass(classId, user);
    toast(`Đã xóa lớp "${cls.name}"`);
    navigate('/admin/classes');
  };

  const handleDeleteSession = async () => {
    if (!deleteSession) return;
    await sessionService.remove(deleteSession, user);
    await refreshSessions();
    if (activeSess?.id === deleteSession) setActiveSess(null);
    toast('Đã xóa buổi học');
    setDeleteSession(null);
  };

  const tabs = [
    { key: 'content', icon: '📋', label: 'Nội dung' },
    { key: 'files', icon: '📁', label: 'Files' },
    { key: 'listening', icon: '🎧', label: 'Listening' },
    { key: 'homework', icon: '📝', label: 'Bài tập' },
    { key: 'quiz', icon: '❓', label: 'Quiz' },
    { key: 'flashcards', icon: '🃏', label: 'Flashcard' },
  ];

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-primary-600/5" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <button onClick={() => navigate('/admin/classes')} className="btn-ghost text-sm w-fit">← Quay lại</button>
            <div className="flex-1" />
            <button onClick={() => setDeleteClass(true)} className="btn-danger text-sm w-fit">🗑️ Xóa lớp</button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-primary-500/20">{cls.thumbnail}</div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white truncate">{cls.name}</h1>
              <p className="text-surface-500 text-sm">👩‍🏫 {teacher?.name || cls.teacherName} · {cls.level} · {cls.schedule}</p>
            </div>
          </div>
          {cls.description && <p className="mt-3 text-sm text-surface-600 dark:text-surface-400">{cls.description}</p>}
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { icon: '👥', label: 'Học sinh', value: students.length },
          { icon: '📅', label: 'Buổi học', value: sessions.length },
          { icon: '📅', label: 'Sự kiện', value: events.length },
          { icon: '📝', label: 'Quiz', value: sessions.reduce((a, s) => a + (s.quiz?.length || 0), 0) },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="glass-card text-center !py-3">
            <p className="text-xl sm:text-2xl mb-1">{s.icon}</p>
            <p className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-surface-500">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Students */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card mb-6">
        <h3 className="font-semibold text-surface-900 dark:text-white mb-3 text-sm sm:text-base">👥 Danh sách học sinh ({students.length})</h3>
        {students.length === 0 ? (
          <p className="text-surface-500 text-sm">Chưa có học sinh.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {students.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                  {s.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{s.name}</p>
                  <p className="text-xs text-surface-500">{s.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1">
          <h3 className="font-semibold text-surface-900 dark:text-white mb-3 text-sm sm:text-base">📅 Buổi học ({sessions.length})</h3>
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { setActiveSess(s); setActiveTab('content'); }}
                className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all ${activeSess?.id === s.id ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500' : 'glass hover:shadow-md'}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-surface-900 dark:text-white">Session {String(s.order).padStart(2, '0')}</p>
                    <p className="text-xs text-surface-500 truncate">{s.title}</p>
                    <p className="text-xs text-surface-400 mt-0.5">📅 {s.date}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteSession(s.id); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-sakura-50 dark:hover:bg-sakura-900/20 text-sakura-500 cursor-pointer text-xs opacity-60 hover:opacity-100 transition-opacity">🗑️</button>
                </div>
              </motion.div>
            ))}
            {sessions.length === 0 && <EmptyState icon="📅" title="Chưa có buổi học" description="" />}
          </div>
        </div>

        {/* Session Detail */}
        <div className="lg:col-span-2">
          {activeSess ? (
            <div className="glass-card">
              <h3 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white mb-4">
                Session {String(activeSess.order).padStart(2, '0')} | {activeSess.title}
              </h3>
              <div className="scrollable-tabs mb-4 sm:mb-6">
                {tabs.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${activeTab === t.key ? 'bg-primary-500 text-white shadow-md' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  {activeTab === 'content' && (
                    <div>
                      <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap text-sm">{activeSess.description || 'Chưa có nội dung.'}</p>
                      {activeSess.notes && (
                        <div className="mt-4 p-3 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <p className="font-medium text-amber-700 dark:text-amber-400 text-sm mb-1">📌 Ghi chú</p>
                          <p className="text-sm text-amber-600 dark:text-amber-300">{activeSess.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'files' && <FilesList files={activeSess.files} toast={toast} />}
                  {activeTab === 'listening' && (
                    <div className="space-y-3">
                      {(activeSess.audioFiles || []).length === 0 ? (
                        <p className="text-surface-500 text-sm">Chưa có file nghe.</p>
                      ) : (
                        (activeSess.audioFiles || []).map(f => (
                          <div key={f.id}>
                            <button onClick={() => setPlayingAudio(playingAudio?.id === f.id ? null : f)}
                              className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:shadow-md transition-all cursor-pointer group">
                              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">🎵</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{f.name}</p>
                                <p className="text-xs text-surface-400">{formatFileSize(f.size)}</p>
                              </div>
                              <span className="text-primary-500 text-lg">{playingAudio?.id === f.id ? '⏸' : '▶️'}</span>
                            </button>
                            {playingAudio?.id === f.id && (
                              <div className="mt-2"><AudioPlayer file={f} toast={toast} /></div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {activeTab === 'homework' && (
                    <div className="p-3 sm:p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
                      <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap text-sm">{activeSess.homework || 'Chưa có bài tập.'}</p>
                    </div>
                  )}
                  {activeTab === 'quiz' && (
                    <div className="space-y-3">
                      {(activeSess.quiz || []).length === 0 ? <p className="text-surface-500 text-sm">Chưa có quiz.</p> :
                        activeSess.quiz.map((q, i) => (
                          <div key={q.id} className="p-3 sm:p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
                            <p className="font-medium text-surface-900 dark:text-white mb-2 text-sm">Câu {i + 1}: {q.question}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {q.options.map((o, oi) => (
                                <div key={oi} className={`p-2 rounded-lg text-xs sm:text-sm ${oi === q.answer ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : 'bg-white dark:bg-surface-700 text-surface-600 dark:text-surface-300'}`}>
                                  {String.fromCharCode(65 + oi)}. {o}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  {activeTab === 'flashcards' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {(activeSess.flashcards || []).length === 0 ? <p className="text-surface-500 text-sm">Chưa có flashcard.</p> :
                        activeSess.flashcards.map(fc => <FlipCard key={fc.id} front={fc.front} back={fc.back} />)
                      }
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="glass-card flex items-center justify-center h-48 sm:h-64">
              <p className="text-surface-400 text-sm">← Chọn một buổi học để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={!!deleteSession} onClose={() => setDeleteSession(null)} onConfirm={handleDeleteSession}
        title="Xóa buổi học?" message="Bạn có chắc chắn muốn xóa buổi học này?" confirmText="Xóa" danger />
      <ConfirmModal isOpen={deleteClass} onClose={() => setDeleteClass(false)} onConfirm={handleDeleteClass}
        title="Xóa lớp học?" message={`Xóa "${cls.name}" sẽ xóa tất cả buổi học, sự kiện và file liên quan. Hành động không thể hoàn tác.`}
        confirmText="Xóa vĩnh viễn" danger />
    </div>
  );
}

function FilesList({ files, toast }) {
  if (!files || files.length === 0) return <p className="text-surface-500 text-sm">Chưa có file.</p>;
  return (
    <div className="space-y-2">
      {files.map(f => (
        <div key={f.id} onClick={() => downloadFile(f, toast)}
          className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
          {(f.dataUrl || f.downloadUrl) && ['jpg','jpeg','png','webp'].includes(f.type) ? (
            <img src={f.dataUrl || f.downloadUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">{getFileIcon(f.name)}</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate">{f.name}</p>
            <p className="text-xs text-surface-400">{formatFileSize(f.size)} · {(f.type || '').toUpperCase()}</p>
          </div>
          <span className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg">⬇️</span>
          {canPreview(f) && (
            <a href={f.dataUrl || f.downloadUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-medium hover:bg-primary-100 transition-colors">
              Xem ↗
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function FlipCard({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="relative h-36 sm:h-40 cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setFlipped(f => !f)}>
      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6 }}
        className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}>{front}</div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-sm sm:text-lg font-medium p-4 text-center shadow-lg"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{back}</div>
      </motion.div>
    </div>
  );
}
