import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabase } from '../../lib/supabaseClient';
import { formatFileSize, getFileIcon, canPreview, downloadFile, openFile, getFreshFileUrl } from '../../services/fileService';
import activityLogService from '../../services/activityLogService';
import AudioPlayer from '../../components/ui/AudioPlayer';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { useToast } from '../../components/ui/Toast';
import QuizInteractive from '../../components/ui/QuizInteractive';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentClassDetail() {
  const { classId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [cls, setCls] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [openSessId, setOpenSessId] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [learnedFlashcards, setLearnedFlashcards] = useState([]);

  useEffect(() => {
    try { const p = JSON.parse(localStorage.getItem(`progress_${user.id}`) || '{}'); setLearnedFlashcards(p.learnedFlashcards || []); } catch {}
  }, [user.id]);

  const toggleLearnedFlashcard = (fcId, forceState) => {
    setLearnedFlashcards(prev => {
      let next;
      if (forceState === true) next = prev.includes(fcId) ? prev : [...prev, fcId];
      else if (forceState === false) next = prev.filter(id => id !== fcId);
      else next = prev.includes(fcId) ? prev.filter(id => id !== fcId) : [...prev, fcId];
      try { const p = JSON.parse(localStorage.getItem(`progress_${user.id}`) || '{}'); p.learnedFlashcards = next; localStorage.setItem(`progress_${user.id}`, JSON.stringify(p)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[ClassDetail] route classId:', classId);
        console.log('[ClassDetail] currentUser:', user);

        const c = await classService.getById(classId);
        console.log('[ClassDetail] loaded class:', c);
        
        if (!c) {
          setCls(null);
          setNotFound(true);
          return;
        }
        setCls(c);
        setNotFound(false);

        // Verify membership
        if (isSupabase()) {
          const { data: membership, error: membershipError } = await supabase
            .from('class_members')
            .select('*')
            .eq('class_id', classId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (membershipError) throw membershipError;
          console.log('[ClassDetail] membership:', membership);

          if (!membership) {
            setError('Bạn chưa được thêm vào lớp này.');
            return;
          }
        }

        try {
          const s = await sessionService.getByClass(classId);
          setSessions(s || []);
        } catch (sessErr) {
          console.error('[StudentClassDetail] sessions load error:', sessErr);
          setSessions([]);
          setError(sessErr.message || 'Không thể tải buổi học');
        }

        activityLogService.log(user, `Xem lớp: ${c.name}`).catch(() => {});
      } catch (err) {
        console.error('[StudentClassDetail] ❌ Load error:', err);
        setError(err.message || 'Lỗi tải dữ liệu lớp');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classId, user]);

  if (loading) return <LoadingSkeleton type="cards" count={3} />;
  if (notFound) return <EmptyState icon="❌" title="Không tìm thấy lớp" description="Lớp học không tồn tại hoặc đã bị xoá." />;
  if (error) return <EmptyState icon="⚠️" title="Lỗi truy cập" description={error} />;
  if (!cls) return null;

  const tabs = [
    { key:'content', icon:'📋', label:'Nội dung' },
    { key:'files', icon:'📁', label:'Files' },
    { key:'listening', icon:'🎧', label:'Listening' },
    { key:'homework', icon:'📝', label:'Bài tập' },
    { key:'quiz', icon:'❓', label:'Quiz' },
    { key:'flashcards', icon:'🃏', label:'Flashcard' },
  ];

  const handleDownload = (f) => {
    downloadFile(f, toast);
    activityLogService.log(user, `Tải file: ${f.name}`);
  };

  const handlePlayAudio = (f) => {
    if (playingAudio?.id === f.id) { setPlayingAudio(null); return; }
    setPlayingAudio(f);
    activityLogService.log(user, `Nghe file audio: ${f.name}`);
  };

  return (
    <div>
      {/* Banner */}
      <motion.div initial={{opacity:0,y:-15}} animate={{opacity:1,y:0}} transition={{duration:0.5, ease:"easeOut"}} className="relative mb-8 overflow-hidden rounded-3xl bg-white dark:bg-surface-900 shadow-xl ring-1 ring-surface-900/5 dark:ring-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent dark:from-primary-900/20 dark:via-primary-900/10" />
        <div className="relative p-6 sm:p-8">
          <button onClick={()=>navigate('/student')} className="flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-primary-600 transition-colors mb-6 group w-max">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Quay lại
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-primary-500/30 text-white">{cls.thumbnail || cls.icon || '🏫'}</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white truncate tracking-tight mb-2">{cls.name || 'Lớp học'}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-surface-600 dark:text-surface-400 font-medium">
                <span className="flex items-center gap-1.5"><span className="opacity-80 text-base">👩‍🏫</span> {cls.teacherName || cls.teacher_name || 'Giáo viên'}</span>
                <span className="text-surface-300 dark:text-surface-700">•</span>
                <span className="badge-primary px-2.5 py-0.5">{cls.level || 'Khác'}</span>
                <span className="text-surface-300 dark:text-surface-700">•</span>
                <span className="flex items-center gap-1.5"><span className="opacity-80 text-base">📅</span> {cls.schedule || 'Chưa có lịch'}</span>
              </div>
            </div>
          </div>
          {cls.description && <p className="mt-5 text-surface-600 dark:text-surface-300 leading-relaxed max-w-3xl">{cls.description}</p>}
        </div>
      </motion.div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <EmptyState icon="📅" title="Chưa có buổi học" description="Lớp này chưa có buổi học nào được lên lịch." />
      ) : (
        <div className="space-y-4 pb-12">
          {sessions.map((sess, i) => {
            const isOpen = openSessId === sess.id;
            return (
              <motion.div key={sess.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.06, duration:0.4}}>
                <button onClick={()=>{setOpenSessId(isOpen?null:sess.id);setActiveTab('content');setPlayingAudio(null);}}
                  className={`w-full flex items-center gap-4 px-5 sm:px-6 py-4 sm:py-5 rounded-2xl text-left cursor-pointer transition-all duration-300 group ${isOpen?'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800/50 shadow-md':'bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 shadow-sm hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800/50'}`}>
                  <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base transition-colors duration-300 ${isOpen?'bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105':'bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-600'}`}>
                    {String(sess.sessionNumber || sess.order || i+1).padStart(2,'0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-base sm:text-lg truncate transition-colors duration-300 ${isOpen ? 'text-primary-700 dark:text-primary-400' : 'text-surface-900 dark:text-white group-hover:text-primary-600'}`}>
                      {sess.title || `Session ${sess.sessionNumber || i+1}`}
                    </p>
                    <p className="text-xs sm:text-sm text-surface-500 mt-1 font-medium flex items-center gap-2">
                      <span className="flex items-center gap-1.5"><span className="opacity-80">📅</span> {sess.date || 'Chưa có ngày'}</span>
                      {sess.time && <><span className="text-surface-300 dark:text-surface-700">•</span><span className="flex items-center gap-1.5"><span className="opacity-80">🕐</span> {sess.time}</span></>}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${isOpen ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-surface-50 dark:bg-surface-800 text-surface-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-500'}`}>
                    <motion.span animate={{rotate:isOpen?180:0}} className="text-sm">▼</motion.span>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.3, ease:"easeInOut"}} className="overflow-hidden">
                      <div className="ml-4 sm:ml-8 mt-3 mb-6 p-5 sm:p-6 rounded-2xl bg-white/60 dark:bg-surface-900/40 backdrop-blur-sm border border-surface-200/50 dark:border-surface-700/50 shadow-sm relative before:absolute before:left-0 before:top-8 before:bottom-8 before:w-[2px] before:bg-gradient-to-b before:from-primary-200 before:via-primary-300 before:to-primary-100 dark:before:from-primary-800 dark:before:via-primary-700 dark:before:to-primary-900 before:-ml-4 sm:before:-ml-8 before:rounded-full">
                        <div className="scrollable-tabs mb-6 flex gap-2 pb-2">
                          {tabs.map(t => (
                            <button key={t.key} onClick={()=>{setActiveTab(t.key);setPlayingAudio(null);}}
                              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${activeTab===t.key?'bg-primary-500 text-white shadow-md shadow-primary-500/20':'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700 border border-surface-100 dark:border-surface-700/50 hover:border-primary-200 dark:hover:border-primary-800/50'}`}>
                              <span className="text-base">{t.icon}</span> {t.label}
                            </button>
                          ))}
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.div key={activeTab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.2}}>
                            {activeTab==='content' && (
                              <div className="space-y-4">
                                <div className="p-5 rounded-xl bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 shadow-sm">
                                  <p className="text-surface-800 dark:text-surface-200 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{sess.contentDescription || sess.content_description || sess.description || 'Chưa có nội dung chi tiết cho buổi học này.'}</p>
                                </div>
                                {sess.notes && (
                                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 flex gap-3 items-start">
                                    <span className="text-amber-500 text-lg shrink-0">📌</span>
                                    <div>
                                      <p className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-1">Ghi chú từ giáo viên</p>
                                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 leading-relaxed">{sess.notes}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {activeTab==='files' && <FilesList files={sess.files} toast={toast} />}
                            {activeTab==='listening' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(sess.audioFiles||[]).length===0 ? <p className="text-surface-500 text-sm italic col-span-full">Chưa có bài luyện nghe nào.</p> :
                                  (sess.audioFiles||[]).map(f => (
                                    <div key={f.id} className="flex flex-col">
                                      <button onClick={()=>handlePlayAudio(f)} className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${playingAudio?.id===f.id ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800/50 shadow-sm' : 'bg-white dark:bg-surface-900 border-surface-100 dark:border-surface-800 hover:border-primary-200 dark:hover:border-primary-800/50 hover:shadow-md'}`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-colors ${playingAudio?.id===f.id ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : 'bg-primary-50 dark:bg-primary-900/30 text-primary-500 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50'}`}>🎧</div>
                                        <div className="flex-1 min-w-0">
                                          <p className={`font-bold text-sm truncate transition-colors ${playingAudio?.id===f.id ? 'text-primary-700 dark:text-primary-400' : 'text-surface-900 dark:text-white group-hover:text-primary-600'}`}>{f.name}</p>
                                          <p className="text-xs font-medium text-surface-400 mt-0.5">{formatFileSize(f.size)}</p>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${playingAudio?.id===f.id ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600' : 'bg-surface-50 dark:bg-surface-800 text-surface-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 group-hover:text-primary-500'}`}>
                                          <span className="text-sm">{playingAudio?.id===f.id?'⏸':'▶️'}</span>
                                        </div>
                                      </button>
                                      <AnimatePresence>
                                        {playingAudio?.id===f.id && (
                                          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden mt-2">
                                            <div className="p-1"><AudioPlayer file={f} toast={toast}/></div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                            {activeTab==='homework' && (
                              <div className="p-5 rounded-xl bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sakura-500/10 to-transparent rounded-bl-full pointer-events-none" />
                                <p className="text-sm sm:text-base font-medium text-surface-800 dark:text-surface-200 whitespace-pre-wrap leading-relaxed relative z-10">{sess.homework||'Hiện tại chưa có bài tập về nhà cho buổi học này.'}</p>
                              </div>
                            )}
                            {activeTab==='quiz' && <QuizInteractive quiz={sess.quiz||[]} />}
                            {activeTab==='flashcards' && <FlashcardArea 
                              flashcards={sess.flashcards||[]} 
                              learnedFlashcards={learnedFlashcards} 
                              onToggle={toggleLearnedFlashcard} 
                              sessions={sessions} 
                              currentSessionId={sess.id} 
                              setOpenSessId={setOpenSessId} 
                              setActiveTab={setActiveTab} 
                            />}
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

function FilesList({ files, toast }) {
  if (!files || files.length === 0) return <p className="text-surface-500 text-sm">Chưa có file.</p>;
  return (
    <div className="space-y-2">
      {files.map(f => (
        <FileItem key={f.id} f={f} toast={toast} />
      ))}
    </div>
  );
}

function FileItem({ f, toast }) {
  const [thumb, setThumb] = useState(null);
  const [imgError, setImgError] = useState(false);
  const isImg = ['jpg','jpeg','png','webp'].includes(f.type || '');

  useEffect(() => {
    if (isImg && !imgError) {
      getFreshFileUrl(f).then(url => setThumb(url)).catch(() => setImgError(true));
    }
  }, [f, isImg, imgError]);

  return (
    <div onClick={()=>openFile(f, toast)} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 hover:border-primary-200 dark:hover:border-primary-800/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group">
      {isImg && thumb && !imgError ? (
        <img src={thumb} onError={() => setImgError(true)} alt="" className="w-12 h-12 rounded-xl object-cover bg-surface-100 dark:bg-surface-800 shadow-sm"/>
      ) : (
        <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-2xl text-primary-500 group-hover:scale-110 transition-transform duration-300">{getFileIcon(f.name || 'file')}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-surface-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">{f.name || 'File'}</p>
        <p className="text-xs font-medium text-surface-400 mt-0.5">{formatFileSize(f.size)} {f.type ? `· ${f.type.toUpperCase()}` : ''}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-surface-50 dark:bg-surface-800 flex items-center justify-center text-surface-400 group-hover:bg-primary-500 group-hover:text-white transition-all duration-300 shrink-0">
        <span className="text-sm">↗</span>
      </div>
    </div>
  );
}



function FlashcardArea({ flashcards, learnedFlashcards, onToggle, sessions, currentSessionId, setOpenSessId, setActiveTab }) {
  const [originalItems, setOriginalItems] = useState([]);
  const [activeItems, setActiveItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setOriginalItems(flashcards);
    const unlearned = flashcards.filter(i => !learnedFlashcards.includes(i.id));
    setActiveItems(unlearned);
    setIdx(0);
    setFlipped(false);
  }, [flashcards]);

  const markLearned = () => {
    const fc = activeItems[idx];
    if (!fc) return;
    onToggle(fc.id, true);
    
    const nextActive = activeItems.filter(i => i.id !== fc.id);
    setActiveItems(nextActive);
    setFlipped(false);
    
    if (nextActive.length > 0) {
      if (idx >= nextActive.length) setIdx(Math.max(0, nextActive.length - 1));
    } else {
      // Completed current session flashcards! Find the next session with unlearned flashcards.
      const currentIndex = sessions.findIndex(s => s.id === currentSessionId);
      let nextSessId = null;
      for (let i = currentIndex + 1; i < sessions.length; i++) {
        const sess = sessions[i];
        if (sess.flashcards && sess.flashcards.length > 0) {
          const unlearnedInSess = sess.flashcards.filter(card => !learnedFlashcards.includes(card.id) && card.id !== fc.id);
          if (unlearnedInSess.length > 0) {
            nextSessId = sess.id;
            break;
          }
        }
      }
      
      if (nextSessId) {
        setOpenSessId(nextSessId);
        setActiveTab('flashcards');
      }
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
      <div className="flex flex-col items-center justify-center p-8 bg-surface-50 dark:bg-surface-800 rounded-xl">
        <p className="text-4xl mb-4">🎉</p>
        <p className="text-sm font-medium text-surface-900 dark:text-white mb-4 text-center">Bạn đã hoàn thành tất cả flashcard cần ôn.</p>
        <button onClick={refresh} className="btn-primary text-xs">🔄 Làm mới</button>
      </div>
    );
  }

  const fc = activeItems[idx];
  const next = () => { setFlipped(false); setIdx(i => (i + 1) % activeItems.length); };
  const prev = () => { setFlipped(false); setIdx(i => (i - 1 + activeItems.length) % activeItems.length); };

  return (
    <div className="flex flex-col items-center py-4">
      <div className="flex w-full max-w-sm justify-between items-center mb-6 px-2">
        <p className="text-xs font-bold uppercase tracking-widest text-surface-500 bg-surface-100 dark:bg-surface-800 px-3 py-1 rounded-full">{idx+1} / {activeItems.length}</p>
        <div className="flex gap-2">
          <button onClick={shuffle} className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white transition-colors cursor-pointer">
            <span className="text-base opacity-70">🔀</span> Đảo
          </button>
          <button onClick={refresh} className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white transition-colors cursor-pointer">
            <span className="text-base opacity-70">🔄</span> Mới
          </button>
        </div>
      </div>
      
      <div className="relative w-full max-w-sm h-56 sm:h-64 cursor-pointer mb-8 group" style={{perspective:'1000px'}} onClick={()=>setFlipped(f=>!f)}>
        <motion.div animate={{rotateY:flipped?180:0}} transition={{duration:0.6, type:"spring", bounce:0.3}} className="absolute inset-0" style={{transformStyle:'preserve-3d'}}>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white to-surface-50 dark:from-surface-800 dark:to-surface-900 border border-surface-200 dark:border-surface-700 flex flex-col items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow p-8" style={{backfaceVisibility:'hidden'}}>
            <p className="text-surface-900 dark:text-white text-5xl sm:text-6xl font-bold font-jp mb-2 text-center">{fc.front}</p>
            <p className="text-surface-400 text-xs font-medium uppercase tracking-widest absolute bottom-6">Nhấn để lật</p>
          </div>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col items-center justify-center text-white p-8 text-center shadow-xl group-hover:shadow-2xl transition-shadow" style={{backfaceVisibility:'hidden',transform:'rotateY(180deg)'}}>
            <p className="text-white text-xl sm:text-2xl font-bold leading-snug">{fc.back}</p>
          </div>
        </motion.div>
      </div>
      <div className="flex gap-4 w-full max-w-sm">
        <button onClick={prev} className="btn-secondary py-3 text-sm flex-1 font-semibold">← Trước</button>
        <button onClick={markLearned} className="btn-primary py-3 px-8 text-sm font-bold shadow-lg shadow-primary-500/30">✓ Đã học</button>
        <button onClick={next} className="btn-secondary py-3 text-sm flex-1 font-semibold">Tiếp →</button>
      </div>
    </div>
  );
}
