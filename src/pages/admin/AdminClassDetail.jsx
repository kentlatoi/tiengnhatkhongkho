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
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="relative mb-8 overflow-hidden rounded-3xl bg-white dark:bg-surface-900 shadow-xl ring-1 ring-surface-900/5 dark:ring-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-900/20 dark:via-amber-900/10" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <button onClick={() => navigate('/admin/classes')} className="flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-amber-600 transition-colors group w-fit">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Quay lại
            </button>
            <button onClick={() => setDeleteClass(true)} className="btn-danger text-sm w-fit shadow-sm shadow-sakura-500/20 px-4">🗑️ Xóa lớp</button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-amber-500/30 text-white">{cls.thumbnail}</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white truncate tracking-tight mb-2">{cls.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-surface-600 dark:text-surface-400 font-medium">
                <span className="flex items-center gap-1.5"><span className="opacity-80 text-base">👩‍🏫</span> {teacher?.name || cls.teacherName || 'Chưa phân công'}</span>
                <span className="text-surface-300 dark:text-surface-700">•</span>
                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-md font-semibold">{cls.level}</span>
                <span className="text-surface-300 dark:text-surface-700">•</span>
                <span className="flex items-center gap-1.5"><span className="opacity-80 text-base">📅</span> {cls.schedule}</span>
              </div>
            </div>
          </div>
          {cls.description && <p className="mt-5 text-surface-600 dark:text-surface-300 leading-relaxed max-w-3xl">{cls.description}</p>}
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '👥', label: 'Học sinh', value: students.length },
          { icon: '📅', label: 'Buổi học', value: sessions.length },
          { icon: '🎉', label: 'Sự kiện', value: events.length },
          { icon: '📝', label: 'Câu hỏi Quiz', value: sessions.reduce((a, s) => a + (s.quiz?.length || 0), 0) },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="glass-card text-center p-4">
            <p className="text-2xl sm:text-3xl mb-2">{s.icon}</p>
            <p className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white">{s.value}</p>
            <p className="text-xs sm:text-sm font-medium text-surface-500 mt-1 uppercase tracking-wider">{s.label}</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 pb-12">
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-surface-900 dark:text-white text-lg">📅 Buổi học ({sessions.length})</h3>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {sessions.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { setActiveSess(s); setActiveTab('content'); }}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${activeSess?.id === s.id ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 shadow-md ring-1 ring-amber-500/20' : 'bg-white dark:bg-surface-900 border-surface-100 dark:border-surface-800 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800/50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${activeSess?.id === s.id ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-surface-100 dark:bg-surface-800 text-surface-500'}`}>
                    {String(s.order).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-sm truncate transition-colors ${activeSess?.id === s.id ? 'text-amber-700 dark:text-amber-400' : 'text-surface-900 dark:text-white'}`}>{s.title}</p>
                    <p className="text-xs text-surface-500 mt-1 flex items-center gap-1.5"><span className="opacity-80">📅</span> {s.date}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteSession(s.id); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sakura-50 dark:hover:bg-sakura-900/20 text-sakura-500 cursor-pointer text-sm opacity-50 hover:opacity-100 transition-opacity">🗑️</button>
                </div>
              </motion.div>
            ))}
            {sessions.length === 0 && <EmptyState icon="📅" title="Chưa có buổi học" description="Thêm buổi học đầu tiên." />}
          </div>
        </div>

        {/* Session Detail */}
        <div className="lg:col-span-2">
          {activeSess ? (
            <div className="bg-white dark:bg-surface-900 rounded-3xl p-6 sm:p-8 border border-surface-100 dark:border-surface-800 shadow-xl shadow-surface-900/5">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold">
                  S{String(activeSess.order).padStart(2, '0')}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight leading-snug">
                    {activeSess.title}
                  </h3>
                  <p className="text-sm font-medium text-surface-500 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1.5"><span className="opacity-80">📅</span> {activeSess.date}</span>
                    {activeSess.time && <><span className="text-surface-300 dark:text-surface-700">•</span><span className="flex items-center gap-1.5"><span className="opacity-80">🕐</span> {activeSess.time}</span></>}
                  </p>
                </div>
              </div>

              <div className="scrollable-tabs mb-8 flex gap-2 pb-2">
                {tabs.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${activeTab === t.key ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 border border-transparent dark:border-surface-700'}`}>
                    <span className="text-base">{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{duration:0.2}}>
                  {activeTab === 'content' && (
                    <div className="space-y-4">
                      <div className="p-5 rounded-xl bg-surface-50/50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700/50">
                        <p className="text-surface-800 dark:text-surface-200 whitespace-pre-wrap text-base leading-relaxed">{activeSess.description || 'Chưa có nội dung chi tiết.'}</p>
                      </div>
                      {activeSess.notes && (
                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 flex gap-3 items-start">
                          <span className="text-blue-500 text-lg shrink-0">📌</span>
                          <div>
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-500 uppercase tracking-wider mb-1">Ghi chú</p>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 leading-relaxed">{activeSess.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'files' && <FilesList files={activeSess.files} toast={toast} />}
                  {activeTab === 'listening' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(activeSess.audioFiles || []).length === 0 ? (
                        <p className="text-surface-500 text-sm italic col-span-full">Chưa có bài luyện nghe nào.</p>
                      ) : (
                        (activeSess.audioFiles || []).map(f => (
                          <div key={f.id} className="flex flex-col">
                            <button onClick={() => setPlayingAudio(playingAudio?.id === f.id ? null : f)}
                              className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${playingAudio?.id===f.id ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 shadow-sm' : 'bg-surface-50 dark:bg-surface-800 border-surface-100 dark:border-surface-700 hover:border-amber-200 dark:hover:border-amber-800/50 hover:shadow-md'}`}>
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-colors ${playingAudio?.id===f.id ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50'}`}>🎧</div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-bold text-sm truncate transition-colors ${playingAudio?.id===f.id ? 'text-amber-700 dark:text-amber-400' : 'text-surface-900 dark:text-white group-hover:text-amber-600'}`}>{f.name}</p>
                                <p className="text-xs font-medium text-surface-400 mt-0.5">{formatFileSize(f.size)}</p>
                              </div>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${playingAudio?.id===f.id ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600' : 'bg-white dark:bg-surface-900 text-surface-400 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/30 group-hover:text-amber-500'}`}>
                                <span className="text-sm">{playingAudio?.id === f.id ? '⏸' : '▶️'}</span>
                              </div>
                            </button>
                            <AnimatePresence>
                              {playingAudio?.id === f.id && (
                                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden mt-2">
                                  <div className="p-1"><AudioPlayer file={f} toast={toast} /></div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {activeTab === 'homework' && (
                    <div className="p-5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-100 dark:border-surface-700 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sakura-500/10 to-transparent rounded-bl-full pointer-events-none" />
                      <p className="text-base font-medium text-surface-800 dark:text-surface-200 whitespace-pre-wrap leading-relaxed relative z-10">{activeSess.homework || 'Hiện tại chưa có bài tập về nhà cho buổi học này.'}</p>
                    </div>
                  )}
                  {activeTab === 'quiz' && (
                    <div className="space-y-4">
                      {(activeSess.quiz || []).length === 0 ? <p className="text-surface-500 text-sm italic">Chưa có câu hỏi ôn tập.</p> :
                        activeSess.quiz.map((q, i) => (
                          <div key={q.id} className="p-5 rounded-2xl bg-surface-50/80 dark:bg-surface-800/80 border border-surface-100 dark:border-surface-700/50">
                            <p className="font-bold text-surface-900 dark:text-white mb-4 text-base flex gap-3 items-start">
                              <span className="text-amber-500 shrink-0">#{i + 1}</span>
                              <span className="pt-0.5">{q.question}</span>
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                              {q.options.map((o, oi) => (
                                <div key={oi} className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${oi === q.answer ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 ring-1 ring-amber-400 dark:ring-amber-500/50 shadow-sm' : 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300'}`}>
                                  <span className="opacity-50 mr-2">{String.fromCharCode(65 + oi)}.</span> {o}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
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
    <div className="space-y-3">
      {files.map(f => (
        <div key={f.id} onClick={() => downloadFile(f, toast)}
          className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 hover:border-amber-200 dark:hover:border-amber-800/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group">
          {(f.dataUrl || f.downloadUrl) && ['jpg','jpeg','png','webp'].includes(f.type) ? (
            <img src={f.dataUrl || f.downloadUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-surface-100 dark:bg-surface-800 shadow-sm" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-2xl text-amber-500 group-hover:scale-110 transition-transform duration-300">{getFileIcon(f.name)}</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-surface-900 dark:text-white truncate group-hover:text-amber-600 transition-colors">{f.name}</p>
            <p className="text-xs font-medium text-surface-400 mt-0.5">{formatFileSize(f.size)} · {(f.type || '').toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canPreview(f) && (
              <a href={f.dataUrl || f.downloadUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition-colors">
                Xem ↗
              </a>
            )}
            <div className="w-8 h-8 rounded-full bg-surface-50 dark:bg-surface-800 flex items-center justify-center text-surface-400 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shrink-0">
              <span className="text-sm">⬇️</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlipCard({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="relative h-44 sm:h-48 cursor-pointer group" style={{ perspective: '1000px' }} onClick={() => setFlipped(f => !f)}>
      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
        className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white to-surface-50 dark:from-surface-800 dark:to-surface-900 border border-surface-200 dark:border-surface-700 flex flex-col items-center justify-center shadow-md group-hover:shadow-lg transition-shadow p-6"
          style={{ backfaceVisibility: 'hidden' }}>
          <p className="text-surface-900 dark:text-white text-3xl sm:text-4xl font-bold font-jp mb-1 text-center">{front}</p>
          <p className="text-surface-400 text-[10px] font-medium uppercase tracking-widest absolute bottom-4">Lật thẻ</p>
        </div>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-700 flex flex-col items-center justify-center text-white text-sm sm:text-lg font-bold p-6 text-center shadow-lg group-hover:shadow-xl transition-shadow"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{back}</div>
      </motion.div>
    </div>
  );
}
