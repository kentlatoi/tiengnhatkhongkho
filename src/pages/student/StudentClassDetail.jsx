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
      <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="glass-card mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-primary-600/5"/>
        <div className="relative">
          <button onClick={()=>navigate('/student')} className="btn-ghost text-sm mb-3">← Quay lại</button>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-primary-500/20">{cls.thumbnail || cls.icon || '🏫'}</div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-surface-900 dark:text-white truncate">{cls.name || 'Lớp học'}</h1>
              <p className="text-surface-500 text-xs sm:text-sm">👩‍🏫 {cls.teacherName || cls.teacher_name || 'Giáo viên'} · {cls.level || 'Khác'} · {cls.schedule || 'Chưa có lịch'}</p>
            </div>
          </div>
          {cls.description && <p className="mt-3 text-sm text-surface-600 dark:text-surface-400">{cls.description}</p>}
        </div>
      </motion.div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <EmptyState icon="📅" title="Chưa có buổi học" description="Lớp này chưa có buổi học nào." />
      ) : (
        <div className="space-y-3">
          {sessions.map((sess, i) => {
            const isOpen = openSessId === sess.id;
            return (
              <motion.div key={sess.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}>
                <button onClick={()=>{setOpenSessId(isOpen?null:sess.id);setActiveTab('content');setPlayingAudio(null);}}
                  className={`w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 rounded-xl text-left cursor-pointer transition-all duration-300 ${isOpen?'bg-primary-50 dark:bg-primary-900/20 shadow-md':'glass-card hover:shadow-lg'}`}>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-colors ${isOpen?'bg-primary-500 text-white':'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}`}>
                    {String(sess.sessionNumber || sess.order || i+1).padStart(2,'0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-900 dark:text-white text-xs sm:text-sm truncate">{sess.title || `Session ${sess.sessionNumber || i+1}`}</p>
                    <p className="text-[10px] sm:text-xs text-surface-400 mt-0.5">📅 {sess.date || 'Chưa có ngày'} {sess.time && `· 🕐 ${sess.time}`}</p>
                  </div>
                  <motion.span animate={{rotate:isOpen?180:0}} className="text-surface-400 text-sm sm:text-lg flex-shrink-0">▼</motion.span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.3}} className="overflow-hidden">
                      <div className="ml-2 sm:ml-4 mt-2 p-4 sm:p-5 rounded-xl bg-white/50 dark:bg-surface-800/50 border border-surface-200/50 dark:border-surface-700/50">
                        <div className="scrollable-tabs mb-4 sm:mb-5">
                          {tabs.map(t => (
                            <button key={t.key} onClick={()=>{setActiveTab(t.key);setPlayingAudio(null);}}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${activeTab===t.key?'bg-primary-500 text-white shadow-md':'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200'}`}>
                              {t.icon} {t.label}
                            </button>
                          ))}
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.div key={activeTab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
                            {activeTab==='content' && (
                              <div>
                                <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap text-sm">{sess.contentDescription || sess.content_description || sess.description || 'Chưa có nội dung.'}</p>
                                {sess.notes && (
                                  <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">📌 Ghi chú</p>
                                    <p className="text-sm text-amber-600 dark:text-amber-300">{sess.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {activeTab==='files' && <FilesList files={sess.files} toast={toast} />}
                            {activeTab==='listening' && (
                              <div className="space-y-3">
                                {(sess.audioFiles||[]).length===0 ? <p className="text-surface-500 text-sm">Chưa có file nghe.</p> :
                                  (sess.audioFiles||[]).map(f => (
                                    <div key={f.id}>
                                      <button onClick={()=>handlePlayAudio(f)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:shadow-md transition-all cursor-pointer">
                                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">🎵</div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{f.name}</p>
                                          <p className="text-xs text-surface-400">{formatFileSize(f.size)}</p>
                                        </div>
                                        <span className="text-primary-500 text-lg">{playingAudio?.id===f.id?'⏸':'▶️'}</span>
                                      </button>
                                      {playingAudio?.id===f.id && <div className="mt-2"><AudioPlayer file={f} toast={toast}/></div>}
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                            {activeTab==='homework' && (
                              <div className="p-3 sm:p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
                                <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{sess.homework||'Chưa có bài tập.'}</p>
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
    <div onClick={()=>openFile(f, toast)} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
      {isImg && thumb && !imgError ? (
        <img src={thumb} onError={() => setImgError(true)} alt="" className="w-10 h-10 rounded-lg object-cover bg-surface-200 dark:bg-surface-700"/>
      ) : (
        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">{getFileIcon(f.name || 'file')}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate">{f.name || 'File'}</p>
        <p className="text-xs text-surface-400">{formatFileSize(f.size)} {f.type ? `· ${f.type.toUpperCase()}` : ''}</p>
      </div>
      <span className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg">↗</span>
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
    <div className="flex flex-col items-center">
      <div className="flex w-full max-w-sm justify-between items-center mb-2 px-2">
        <p className="text-xs font-medium text-surface-500">{idx+1} / {activeItems.length}</p>
        <div className="flex gap-2">
          <button onClick={shuffle} className="btn-ghost text-xs py-1 px-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200">🔀 Xáo trộn</button>
          <button onClick={refresh} className="btn-ghost text-xs py-1 px-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200">🔄 Làm mới</button>
        </div>
      </div>
      
      <div className="relative w-full max-w-sm h-44 sm:h-48 cursor-pointer mb-4" style={{perspective:'1000px'}} onClick={()=>setFlipped(f=>!f)}>
        <motion.div animate={{rotateY:flipped?180:0}} transition={{duration:0.6}} className="absolute inset-0" style={{transformStyle:'preserve-3d'}}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-xl p-6" style={{backfaceVisibility:'hidden'}}>{fc.front}</div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-sm sm:text-lg font-medium p-6 text-center shadow-xl" style={{backfaceVisibility:'hidden',transform:'rotateY(180deg)'}}>{fc.back}</div>
        </motion.div>
      </div>
      <div className="flex gap-3 items-center">
        <button onClick={prev} className="btn-secondary text-sm">← Trước</button>
        <button onClick={markLearned} className="btn-primary text-sm">✓ Đã học</button>
        <button onClick={next} className="btn-secondary text-sm">Tiếp →</button>
      </div>
    </div>
  );
}
