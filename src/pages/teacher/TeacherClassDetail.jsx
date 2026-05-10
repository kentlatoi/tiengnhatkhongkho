import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';
import { fileToMeta, downloadFile, formatFileSize, getFileIcon, canPreview, AUDIO_ACCEPT, DOCUMENT_ACCEPT, uploadToSupabase, openFile, getFreshFileUrl } from '../../services/fileService';
import { isSupabase } from '../../lib/supabaseClient';
import activityLogService from '../../services/activityLogService';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import AudioPlayer from '../../components/ui/AudioPlayer';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { useToast } from '../../components/ui/Toast';
import QuizInteractive from '../../components/ui/QuizInteractive';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuid } from 'uuid';

export default function TeacherClassDetail() {
  const { classId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [cls, setCls] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editSess, setEditSess] = useState(null);
  const [activeSess, setActiveSess] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const blank = { title:'', date:'', startTime:'19:00', endTime:'20:30', description:'', homework:'', notes:'', files:[], audioFiles:[], videoFiles:[], quiz:[], flashcards:[] };
  const [form, setForm] = useState(blank);

  const refresh = useCallback(async () => {
    try {
      const sess = await sessionService.getByClass(classId);
      setSessions(sess);
    } catch (err) {
      console.error('[ClassDetail] ❌ Sessions load error:', err);
      setSessions([]);
    }
  }, [classId]);

  useEffect(() => {
    const load = async () => {
      try {
        const c = await classService.getById(classId);
        setCls(c);
        await refresh();
      } catch (err) {
        console.error('[ClassDetail] ❌ Load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classId, refresh]);

  if (loading) return <LoadingSkeleton type="cards" count={3} />;
  if (!cls) return <EmptyState icon="❌" title="Không tìm thấy lớp" description="Lớp học không tồn tại." />;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    console.log('[LessonSession] form before save:', form);
    
    // Debug logging lesson payload mapped locally roughly
    const lessonPayload = {
      class_id: classId,
      teacher_id: user.id,
      title: form.title || '',
      date: form.date || null,
      start_time: form.startTime || form.start_time || null,
      end_time: form.endTime || form.end_time || null,
      content_description: form.contentDescription || form.content || form.lessonContent || '',
      homework: form.homework || '',
      notes: form.notes || '',
    };
    console.log('[LessonSession] lesson payload:', lessonPayload);

    try {
      let savedSession;
      if (editSess) {
        savedSession = await sessionService.update(editSess.id, form, user);
      } else {
        savedSession = await sessionService.create({ classId, order: sessions.length + 1, ...form }, user);
      }

      if (isSupabase() && savedSession?.id) {
        // Find existing files for this session to handle deletions
        const { getFilesBySession, deleteSupabaseFile } = await import('../../services/fileService');
        const existingFiles = await getFilesBySession(savedSession.id);
        const currentFileIds = [...form.files, ...form.audioFiles].filter(f => !f.rawFile).map(f => f.id);
        for (const ef of existingFiles) {
          if (!currentFileIds.includes(ef.id)) {
            await deleteSupabaseFile(ef.id);
          }
        }

        // Upload new document files
        for (const f of form.files) {
          if (f.rawFile) {
            await uploadToSupabase(f.rawFile, { classId, sessionId: savedSession.id, uploadedBy: user.id, category: 'document' });
          }
        }
        // Upload new audio files
        for (const f of form.audioFiles) {
          if (f.rawFile) {
            await uploadToSupabase(f.rawFile, { classId, sessionId: savedSession.id, uploadedBy: user.id, category: 'listening' });
          }
        }

        // Save flashcards
        console.log('[Session Save] formData.flashcards:', form.flashcards);
        if (form.flashcards && form.flashcards.length > 0) {
          const { supabase } = await import('../../lib/supabaseClient');
          await supabase.from('flashcards').delete().eq('session_id', savedSession.id);
          
          const validFlashcards = form.flashcards.filter(fc => (fc.front || '').trim() && (fc.back || '').trim());
          if (validFlashcards.length > 0) {
            const flashcardRows = validFlashcards.map((card, idx) => ({
              class_id: classId,
              session_id: savedSession.id,
              front: card.front || card.question || card.term || '',
              back: card.back || card.answer || card.definition || '',
              order_index: idx,
              created_by: user?.id || null
            }));

            const { error: flashcardError } = await supabase.from('flashcards').insert(flashcardRows);
            if (flashcardError) throw flashcardError;
          }
        } else {
          const { supabase } = await import('../../lib/supabaseClient');
          await supabase.from('flashcards').delete().eq('session_id', savedSession.id);
        }

        // Save quizzes
        console.log('[Session Save] formData.quizQuestions:', form.quiz);
        if (form.quiz && form.quiz.length > 0) {
          const { supabase } = await import('../../lib/supabaseClient');
          let { data: existingQuiz } = await supabase.from('quizzes').select('id').eq('session_id', savedSession.id).single();
          let quizId = existingQuiz?.id;
          
          if (!quizId) {
            const { data: newQuiz, error: quizError } = await supabase.from('quizzes').insert({
              class_id: classId,
              session_id: savedSession.id,
              title: `Quiz cho session ${savedSession.id.substring(0,8)}`,
              created_by: user?.id || null
            }).select('id').single();
            if (quizError) throw quizError;
            if (newQuiz) quizId = newQuiz.id;
          }

          if (quizId) {
            await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
            const questionRows = form.quiz.map((q, idx) => ({
              quiz_id: quizId,
              question: q.question || q.text || '',
              options: q.options || [],
              correct_answer: parseInt(q.answer || q.correct_answer || q.correctAnswer || 0),
              order_index: idx
            }));
            const { error: questionsError } = await supabase.from('quiz_questions').insert(questionRows);
            if (questionsError) throw questionsError;
          }
        } else {
          const { supabase } = await import('../../lib/supabaseClient');
          const { data: existingQuiz } = await supabase.from('quizzes').select('id').eq('session_id', savedSession.id).single();
          if (existingQuiz?.id) {
            await supabase.from('quiz_questions').delete().eq('quiz_id', existingQuiz.id);
            await supabase.from('quizzes').delete().eq('id', existingQuiz.id);
          }
        }
        
        console.log('[Session Save] savedSession:', savedSession);
      }

      await refresh(); 
      setShowForm(false); setEditSess(null); setForm(blank);
        // Immediately update activeSess if it's currently selected
        if (activeSess || savedSession?.id) {
          const fetchSessions = await sessionService.getByClass(classId);
          setSessions(fetchSessions);
          const updatedSess = fetchSessions.find(s => s.id === (activeSess?.id || savedSession.id));
          if (updatedSess) setActiveSess(updatedSess);
        }

        console.log('[LessonSession] saved session:', savedSession);
        console.log('[LessonSession] selected content:', savedSession.contentDescription);
        console.log('[LessonSession] homework:', savedSession.homework);
        console.log('[LessonSession] notes:', savedSession.notes);
        console.log('[LessonSession] quiz questions to save:', form.quiz?.length || 0);
        console.log('[LessonSession] flashcards to save:', form.flashcards?.length || 0);

      toast(editSess ? 'Đã cập nhật buổi học' : 'Đã thêm buổi học mới');
    } catch (err) {
      console.error(err);
      toast(err.message || 'Lỗi khi lưu buổi học', 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = (s) => {
    setEditSess(s);
    setForm({ 
      title: s.title || '', 
      date: s.date || '', 
      startTime: s.startTime || s.start_time || '19:00', 
      endTime: s.endTime || s.end_time || '20:30', 
      contentDescription: s.contentDescription || s.content || s.description || '', 
      homework: s.homework || '', 
      notes: s.notes || '', 
      files: s.files || [], 
      audioFiles: s.audioFiles || [], 
      videoFiles: s.videoFiles || [], 
      quiz: s.quiz || [], 
      flashcards: s.flashcards || [] 
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await sessionService.remove(confirmDel, user);
    await refresh();
    if (activeSess?.id === confirmDel) setActiveSess(null);
    setConfirmDel(null);
    toast('Đã xóa buổi học');
  };

  const addQuiz = () => setForm(f => ({...f, quiz:[...f.quiz, {id:uuid(), question:'', options:['','','',''], answer:0}]}));
  const updateQuiz = (i,k,v) => setForm(f => { const q=[...f.quiz]; q[i]={...q[i],[k]:v}; return {...f,quiz:q}; });
  const removeQuiz = (i) => setForm(f => ({...f, quiz:f.quiz.filter((_,j)=>j!==i)}));
  const addFlashcard = () => setForm(f => ({...f, flashcards:[...f.flashcards, {id:uuid(), front:'', back:''}]}));
  const updateFlashcard = (i,k,v) => setForm(f => { const fc=[...f.flashcards]; fc[i]={...fc[i],[k]:v}; return {...f,flashcards:fc}; });
  const removeFlashcard = (i) => setForm(f => ({...f, flashcards:f.flashcards.filter((_,j)=>j!==i)}));

  const tabs = [
    { key:'description', icon:'📋', label:'Nội dung' },
    { key:'files', icon:'📁', label:`Files (${activeSess?.files?.length || 0})` },
    { key:'listening', icon:'🎧', label:`Listening (${activeSess?.audioFiles?.length || 0})` },
    { key:'homework', icon:'📝', label:'Bài tập' },
    { key:'quiz', icon:'❓', label:`Quiz (${activeSess?.quiz?.length || 0})` },
    { key:'flashcards', icon:'🃏', label:`Flashcard (${activeSess?.flashcards?.length || 0})` },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button onClick={() => navigate('/teacher/classes')} className="btn-ghost w-fit">← Quay lại</button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl sm:text-3xl">{cls.thumbnail || cls.icon || '🏫'}</span>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-surface-900 dark:text-white truncate">{cls.name || 'Lớp học'}</h1>
            <p className="text-surface-500 text-xs sm:text-sm">{cls.level || 'Khác'} · {cls.schedule || 'Chưa có lịch'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Sessions List */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white text-sm sm:text-base">Buổi học ({sessions.length})</h3>
            <button onClick={() => { setEditSess(null); setForm(blank); setShowForm(true); }} className="btn-primary text-xs sm:text-sm py-2 px-3">＋ Thêm</button>
          </div>
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <motion.div key={s.id} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
                onClick={() => { setActiveSess(s); setActiveTab('description'); setPlayingAudio(null); }}
                className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all ${activeSess?.id===s.id ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500' : 'glass hover:shadow-md'}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-surface-900 dark:text-white">
                      {`Session ${String(s.sessionNumber || i + 1).padStart(2, '0')}`}
                    </p>
                    <p className="text-xs text-surface-500 truncate">{s.title || 'Chưa có tiêu đề'}</p>
                    <p className="text-xs text-surface-400 mt-0.5">📅 {s.date || 'Chưa có ngày'}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={e=>{e.stopPropagation();handleEdit(s);}} className="text-xs hover:bg-surface-100 dark:hover:bg-surface-700 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer">✏️</button>
                    <button onClick={e=>{e.stopPropagation();setConfirmDel(s.id);}} className="text-xs hover:bg-sakura-50 dark:hover:bg-sakura-900/20 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer">🗑️</button>
                  </div>
                </div>
              </motion.div>
            ))}
            {sessions.length===0 && <EmptyState icon="📅" title="Chưa có buổi học" description="Thêm buổi học đầu tiên." />}
          </div>
        </div>

        {/* Session Detail */}
        <div className="lg:col-span-2">
          {activeSess ? (
            <div className="glass-card">
              <h3 className="text-base sm:text-xl font-bold text-surface-900 dark:text-white mb-4">
                {`Session ${String(activeSess.sessionNumber || (sessions.findIndex(s => s.id === activeSess.id) + 1)).padStart(2, '0')}`} | {activeSess.title || 'Chưa có tiêu đề'}
              </h3>
              <div className="scrollable-tabs mb-4 sm:mb-6">
                {tabs.map(t => (
                  <button key={t.key} onClick={() => { setActiveTab(t.key); setPlayingAudio(null); }}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${activeTab===t.key ? 'bg-primary-500 text-white shadow-md' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
                  {activeTab==='description' && (
                    <div>
                      <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap text-sm">{activeSess.contentDescription || activeSess.content_description || activeSess.content || activeSess.description || 'Chưa có nội dung.'}</p>
                      {activeSess.notes && (
                        <div className="mt-4 p-3 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <p className="font-medium text-amber-700 dark:text-amber-400 text-sm mb-1">📌 Ghi chú</p>
                          <p className="text-sm text-amber-600 dark:text-amber-300">{activeSess.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab==='files' && <DetailFiles files={activeSess.files} toast={toast} />}
                  {activeTab==='listening' && (
                    <div className="space-y-3">
                      {(activeSess.audioFiles||[]).length===0 ? <p className="text-surface-500 text-sm">Chưa có file nghe.</p> :
                        (activeSess.audioFiles||[]).map(f => (
                          <div key={f.id}>
                            <button onClick={()=>setPlayingAudio(playingAudio?.id===f.id?null:f)}
                              className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:shadow-md transition-all cursor-pointer group">
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
                      <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap text-sm">{activeSess.homework||'Chưa có bài tập.'}</p>
                    </div>
                  )}
                  {activeTab==='quiz' && <QuizInteractive quiz={activeSess.quiz||[]} />}
                  {activeTab==='flashcards' && <FlashcardDisplay flashcards={activeSess.flashcards||[]} />}
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

      {/* Session Form Modal */}
      <Modal isOpen={showForm} onClose={()=>{setShowForm(false);setEditSess(null);}} title={editSess?'Sửa buổi học':'Thêm buổi học'} size="lg">
        <form onSubmit={handleSave} className="space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
          {/* Section 1: Basic Info */}
          <SectionHeader icon="📋" title="Thông tin cơ bản"/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="input-label">Tiêu đề</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required className="input" placeholder="Hiragana あ～お"/></div>
            <div><label className="input-label">Ngày</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="input"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="input-label">Giờ bắt đầu</label><input type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} className="input"/></div>
            <div><label className="input-label">Giờ kết thúc</label><input type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} className="input"/></div>
          </div>
          <div><label className="input-label">Nội dung bài học</label><textarea value={form.contentDescription} onChange={e=>setForm(f=>({...f,contentDescription:e.target.value}))} className="input h-24 resize-none" placeholder="Mô tả nội dung..."/></div>
          <div><label className="input-label">Bài tập về nhà</label><textarea value={form.homework} onChange={e=>setForm(f=>({...f,homework:e.target.value}))} className="input h-20 resize-none" placeholder="Bài tập..."/></div>

          {/* Section 2: Document Files */}
          <SectionHeader icon="📁" title="Tài liệu đính kèm"/>
          <FileUploadArea files={form.files} onChange={files=>setForm(f=>({...f,files}))} accept={DOCUMENT_ACCEPT} label="PDF, Word, Hình ảnh" toast={toast}/>

          {/* Section 3: Audio/Listening */}
          <SectionHeader icon="🎧" title="File nghe / Listening"/>
          <FileUploadArea files={form.audioFiles} onChange={audioFiles=>setForm(f=>({...f,audioFiles}))} accept={AUDIO_ACCEPT} label="MP3, WAV, M4A, AAC" toast={toast}/>

          {/* Section 4: Notes */}
          <div><label className="input-label">Ghi chú</label><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="input" placeholder="Ghi chú thêm..."/></div>

          {/* Section 5: Quiz */}
          <SectionHeader icon="❓" title={`Quiz (${form.quiz.length})`}/>
          <button type="button" onClick={addQuiz} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer mb-2">＋ Thêm câu hỏi</button>
          {form.quiz.map((q,qi) => (
            <div key={q.id} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <input value={q.question} onChange={e=>updateQuiz(qi,'question',e.target.value)} className="input text-sm flex-1" placeholder="Câu hỏi..."/>
                <button type="button" onClick={()=>removeQuiz(qi)} className="text-sakura-500 cursor-pointer">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((o,oi) => (
                  <div key={oi} className="flex items-center gap-1">
                    <input type="radio" name={`a-${qi}`} checked={q.answer===oi} onChange={()=>updateQuiz(qi,'answer',oi)}/>
                    <input value={o} onChange={e=>{const opts=[...q.options];opts[oi]=e.target.value;updateQuiz(qi,'options',opts);}} className="input text-sm" placeholder={`Đáp án ${String.fromCharCode(65+oi)}`}/>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Section 6: Flashcards */}
          <SectionHeader icon="🃏" title={`Flashcards (${form.flashcards.length})`}/>
          <button type="button" onClick={addFlashcard} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer mb-2">＋ Thêm flashcard</button>
          {form.flashcards.map((fc,fi) => (
            <div key={fc.id} className="flex items-center gap-2 mb-2">
              <input value={fc.front} onChange={e=>updateFlashcard(fi,'front',e.target.value)} className="input text-sm" placeholder="Mặt trước (JP)"/>
              <input value={fc.back} onChange={e=>updateFlashcard(fi,'back',e.target.value)} className="input text-sm" placeholder="Mặt sau (nghĩa)"/>
              <button type="button" onClick={()=>removeFlashcard(fi)} className="text-sakura-500 cursor-pointer">✕</button>
            </div>
          ))}

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-surface-900 pb-1">
            <button type="button" onClick={()=>{setShowForm(false);setEditSess(null);}} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1">{editSess?'Cập nhật':'Tạo buổi học'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmDel} onClose={()=>setConfirmDel(null)} onConfirm={handleDelete} title="Xóa buổi học?" message="Bạn có chắc chắn muốn xóa buổi học này?" confirmText="Xóa" danger/>
    </div>
  );
}

function SectionHeader({icon,title}){
  return <div className="flex items-center gap-2 pt-2 border-t border-surface-200 dark:border-surface-700"><span className="text-lg">{icon}</span><h4 className="font-semibold text-surface-900 dark:text-white text-sm">{title}</h4></div>;
}

function FileUploadArea({ files, onChange, accept, label, toast }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const exts = accept.split(',').map(e=>e.replace('.','').toLowerCase());
  const add = async(fl) => {
    const valid = Array.from(fl).filter(f=>exts.includes(f.name.split('.').pop().toLowerCase()));
    const metas = await Promise.all(valid.map(fileToMeta));
    onChange([...files,...metas]);
  };
  return (
    <div>
      <div onDrop={e=>{e.preventDefault();setDrag(false);add(e.dataTransfer.files);}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
        onClick={()=>ref.current?.click()}
        className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center py-6 px-4 ${drag?'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]':'border-surface-300 dark:border-surface-600 hover:border-primary-400'}`}>
        <input ref={ref} type="file" multiple accept={accept} className="hidden" onChange={e=>{add(e.target.files);e.target.value='';}}/>
        <p className="text-3xl mb-1">📁</p>
        <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Kéo thả hoặc nhấn chọn file</p>
        <p className="text-[10px] text-surface-400 mt-1">{label}</p>
      </div>
      {files.length>0 && (
        <div className="mt-2 space-y-1.5">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 group">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-lg">{getFileIcon(f.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-900 dark:text-white truncate">{f.name}</p>
                <p className="text-[10px] text-surface-400">{formatFileSize(f.size)}</p>
              </div>
              <button type="button" onClick={()=>downloadFile(f,toast)} className="text-xs text-primary-500 opacity-0 group-hover:opacity-100 cursor-pointer">⬇️</button>
              <button type="button" onClick={()=>onChange(files.filter(x=>x.id!==f.id))} className="text-xs text-sakura-500 opacity-0 group-hover:opacity-100 cursor-pointer">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailFiles({files,toast}){
  if(!files||files.length===0) return <p className="text-surface-500 text-sm">Chưa có file.</p>;
  return (
    <div className="space-y-2">
      {files.map(f=>(
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

function FlashcardDisplay({flashcards}){
  if(flashcards.length===0) return <p className="text-surface-500 text-sm">Chưa có flashcard.</p>;
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">{flashcards.map(fc=><FlipCard key={fc.id} front={fc.front} back={fc.back}/>)}</div>;
}

function FlipCard({front,back}){
  const [flipped,setFlipped]=useState(false);
  return (
    <div className="relative h-36 sm:h-40 cursor-pointer" style={{perspective:'1000px'}} onClick={()=>setFlipped(f=>!f)}>
      <motion.div animate={{rotateY:flipped?180:0}} transition={{duration:0.6}} className="absolute inset-0" style={{transformStyle:'preserve-3d'}}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-lg" style={{backfaceVisibility:'hidden'}}>{front}</div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-sm sm:text-lg font-medium p-4 text-center shadow-lg" style={{backfaceVisibility:'hidden',transform:'rotateY(180deg)'}}>{back}</div>
      </motion.div>
    </div>
  );
}
