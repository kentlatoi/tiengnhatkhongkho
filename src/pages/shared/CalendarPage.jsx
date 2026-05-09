import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import calendarService from '../../services/calendarService';
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';
import activityLogService from '../../services/activityLogService';
import userService from '../../services/userService';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuid } from 'uuid';

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const CLASS_COLORS = [
  { bg: 'bg-primary-500', text: 'text-primary-600 dark:text-primary-400', light: 'bg-primary-100 dark:bg-primary-900/30' },
  { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', light: 'bg-blue-100 dark:bg-blue-900/30' },
  { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', light: 'bg-purple-100 dark:bg-purple-900/30' },
  { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', light: 'bg-amber-100 dark:bg-amber-900/30' },
  { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', light: 'bg-rose-100 dark:bg-rose-900/30' },
  { bg: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', light: 'bg-teal-100 dark:bg-teal-900/30' },
];

function getClassColor(classId, allClasses) {
  const idx = allClasses.findIndex(c => c.id === classId);
  return CLASS_COLORS[idx % CLASS_COLORS.length] || CLASS_COLORS[0];
}

function getDaysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

export default function CalendarPage() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const toast = useToast();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editEvt, setEditEvt] = useState(null);
  const [viewEvt, setViewEvt] = useState(null);
  const [events, setEvents] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sessionsForClass, setSessionsForClass] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [filterClass, setFilterClass] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const days = getDaysInMonth(year, month);

  const loadData = useCallback(async () => {
    const [evts, all] = await Promise.all([calendarService.getAll(), classService.getAll()]);
    setEvents(evts); setAllClasses(all);
    if (isAdmin) { setClasses(all); const t = await userService.getTeachers(); setTeachers(t); }
    else if (isTeacher) { const c = await classService.getByTeacher(user.id); setClasses(c); }
    else { const c = await classService.getByStudent(user.id); setClasses(c); }
    setLoading(false);
  }, [isAdmin, isTeacher, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const classIds = useMemo(() => classes.map(c => c.id), [classes]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const d = new Date(e.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) return false;
      if (isStudent) return classIds.includes(e.classId);
      if (isTeacher) {
        if (!classIds.includes(e.classId)) return false;
        if (filterClass !== 'all' && e.classId !== filterClass) return false;
        return true;
      }
      if (filterClass !== 'all' && e.classId !== filterClass) return false;
      if (filterTeacher !== 'all' && e.teacherId !== filterTeacher) return false;
      if (filterLevel !== 'all') {
        const cls = allClasses.find(c => c.id === e.classId);
        if (cls?.level !== filterLevel) return false;
      }
      return true;
    });
  }, [events, year, month, isStudent, isTeacher, classIds, filterClass, filterTeacher, filterLevel, allClasses]);

  const eventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return filteredEvents.filter(e => e.date === dateStr);
  };

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const blankEvt = { classId: '', title: '', date: '', startTime: '19:00', endTime: '20:30', content: '', homework: '', location: '', meetingLink: '', lessonSessionId: '' };
  const [form, setForm] = useState(blankEvt);

  // Load sessions when classId changes in form
  useEffect(() => {
    if (form.classId) {
      sessionService.getByClass(form.classId).then(s => setSessionsForClass(s));
    } else {
      setSessionsForClass([]);
    }
  }, [form.classId]);

  const openAdd = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    setEditEvt(null);
    setForm({ ...blankEvt, date: dateStr });
    setShowForm(true);
  };

  const openEdit = (evt) => {
    setEditEvt(evt);
    setForm({
      classId: evt.classId, title: evt.title, date: evt.date,
      startTime: evt.startTime || evt.time || '19:00', endTime: evt.endTime || '20:30',
      content: evt.content || '', homework: evt.homework || '',
      location: evt.location || '', meetingLink: evt.meetingLink || '',
      lessonSessionId: evt.lessonSessionId || '',
    });
    setShowForm(true);
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    const cls = allClasses.find(c => c.id === form.classId);
    const eventData = {
      ...form,
      className: cls?.name || '',
      teacherId: isTeacher ? user.id : (cls?.teacherId || ''),
      teacherName: isTeacher ? user.name : (cls?.teacherName || ''),
      time: form.startTime,
      notes: form.content,
    };
    if (editEvt) {
      await calendarService.update(editEvt.id, eventData, user);
      toast('Đã cập nhật sự kiện');
    } else {
      await calendarService.create({ id: uuid(), ...eventData }, user);
      toast('Đã thêm sự kiện mới');
    }
    const evts = await calendarService.getAll();
    setEvents(evts);
    setShowForm(false);
  };

  const deleteEvent = async (id) => {
    await calendarService.remove(id, user);
    const evts = await calendarService.getAll();
    setEvents(evts);
    setSelectedDate(null);
    setViewEvt(null);
    setConfirmDelete(null);
    toast('Đã xóa sự kiện');
  };

  const handleViewEvent = (evt) => {
    setViewEvt(evt);
    if (isStudent) activityLogService.log(user, `Xem sự kiện lịch: ${evt.title}`);
  };

  const canEdit = isAdmin || isTeacher;
  const selectedDayEvents = selectedDate ? eventsForDay(selectedDate) : [];

  if (loading) return <LoadingSkeleton type="cards" count={1} />;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white mb-4 sm:mb-6">📅 Lịch học</h1>
      </motion.div>

      {/* Filters */}
      {(isTeacher || isAdmin) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="input !w-auto min-w-[140px] text-sm !py-2">
            <option value="all">Tất cả lớp</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {isAdmin && (
            <>
              <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="input !w-auto min-w-[140px] text-sm !py-2">
                <option value="all">Tất cả GV</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="input !w-auto min-w-[100px] text-sm !py-2">
                <option value="all">Cấp độ</option>
                {['N5','N4','N3','N2','N1'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </>
          )}
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button onClick={prev} className="btn-ghost text-lg">←</button>
          <h2 className="text-base sm:text-lg font-bold text-surface-900 dark:text-white">{MONTHS[month]} {year}</h2>
          <button onClick={next} className="btn-ghost text-lg">→</button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-surface-500 py-1 sm:py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {days.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;
            const dayEvts = eventsForDay(day);
            const isSelected = selectedDate === day;

            return (
              <div key={i} onClick={() => setSelectedDate(day)}
                className={`relative min-h-[3rem] sm:min-h-[4rem] p-0.5 sm:p-1 rounded-lg sm:rounded-xl cursor-pointer transition-all text-xs sm:text-sm ${
                  isSelected ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' :
                  isToday ? 'bg-primary-50 dark:bg-primary-900/20' :
                  'hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}>
                <span className={`block text-center font-medium ${isToday ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-surface-700 dark:text-surface-300'}`}>
                  {day}
                </span>
                {dayEvts.slice(0, 2).map(evt => {
                  const color = getClassColor(evt.classId, allClasses);
                  return (
                    <div key={evt.id} className={`mt-0.5 px-1 py-0.5 rounded text-[8px] sm:text-[10px] ${color.bg} text-white truncate leading-tight`}>
                      {evt.title}
                    </div>
                  );
                })}
                {dayEvts.length > 2 && <span className="text-[9px] text-surface-500">+{dayEvts.length - 2}</span>}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Selected day detail */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="glass-card mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900 dark:text-white text-sm sm:text-base">
                Ngày {selectedDate}/{month + 1}/{year}
              </h3>
              {canEdit && (
                <button onClick={() => openAdd(selectedDate)} className="btn-primary text-xs sm:text-sm py-1.5 px-3">＋ Thêm</button>
              )}
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-surface-500 text-sm">Không có sự kiện.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map(evt => {
                  const color = getClassColor(evt.classId, allClasses);
                  return (
                    <motion.div key={evt.id} whileHover={{ x: 4 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 cursor-pointer group"
                      onClick={() => handleViewEvent(evt)}>
                      <div className={`w-2 h-10 rounded-full ${color.bg}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-900 dark:text-white text-sm">{evt.title}</p>
                        <p className="text-xs text-surface-500">
                          <span className={color.text}>{evt.className}</span>
                          {' · '}{evt.startTime || evt.time}{evt.endTime ? ` - ${evt.endTime}` : ''}
                        </p>
                        {evt.teacherName && <p className="text-[10px] text-surface-400">👩‍🏫 {evt.teacherName}</p>}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(evt); }} className="btn-ghost text-xs p-1.5">✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(evt.id); }} className="btn-ghost text-xs text-sakura-500 p-1.5">🗑️</button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Detail Modal */}
      <Modal isOpen={!!viewEvt} onClose={() => setViewEvt(null)} title="Chi tiết sự kiện" size="md">
        {viewEvt && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${getClassColor(viewEvt.classId, allClasses).light}`}>
              <h4 className="text-lg font-bold text-surface-900 dark:text-white">{viewEvt.title}</h4>
              <p className={`text-sm font-medium mt-1 ${getClassColor(viewEvt.classId, allClasses).text}`}>{viewEvt.className}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="👩‍🏫 Giáo viên" value={viewEvt.teacherName} />
              <InfoItem label="📅 Ngày" value={viewEvt.date} />
              <InfoItem label="🕐 Bắt đầu" value={viewEvt.startTime || viewEvt.time} />
              <InfoItem label="🕐 Kết thúc" value={viewEvt.endTime || '-'} />
              {viewEvt.location && <InfoItem label="📍 Địa điểm" value={viewEvt.location} />}
              {viewEvt.meetingLink && (
                <div className="col-span-2">
                  <p className="text-xs text-surface-400 mb-0.5">🔗 Link họp</p>
                  <a href={viewEvt.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline break-all">{viewEvt.meetingLink}</a>
                </div>
              )}
            </div>
            {viewEvt.content && (
              <div>
                <p className="text-xs text-surface-400 mb-1">📋 Nội dung</p>
                <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{viewEvt.content}</p>
              </div>
            )}
            {viewEvt.homework && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">📝 Bài tập</p>
                <p className="text-sm text-amber-600 dark:text-amber-300">{viewEvt.homework}</p>
              </div>
            )}
            {canEdit && (
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setViewEvt(null); openEdit(viewEvt); }} className="btn-secondary flex-1 text-sm">✏️ Sửa</button>
                <button onClick={() => { setViewEvt(null); setConfirmDelete(viewEvt.id); }} className="btn-danger flex-1 text-sm">🗑️ Xóa</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Event Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editEvt ? 'Sửa sự kiện' : 'Thêm sự kiện'} size="lg">
        <form onSubmit={saveEvent} className="space-y-4">
          <div>
            <label className="input-label">Lớp học</label>
            <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} required className="input">
              <option value="">Chọn lớp...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
            </select>
          </div>
          <div><label className="input-label">Tiêu đề</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="input" placeholder="Tên buổi học..." /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="input-label">Ngày</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="input" /></div>
            <div><label className="input-label">Giờ bắt đầu</label><input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="input" /></div>
            <div><label className="input-label">Giờ kết thúc</label><input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="input" /></div>
          </div>
          {form.classId && (
            <div>
              <label className="input-label">Liên kết buổi học (tùy chọn)</label>
              <select value={form.lessonSessionId} onChange={e => setForm(f => ({ ...f, lessonSessionId: e.target.value }))} className="input">
                <option value="">Không liên kết</option>
                {sessionsForClass.map(s => <option key={s.id} value={s.id}>Session {s.order} - {s.title}</option>)}
              </select>
            </div>
          )}
          <div><label className="input-label">Nội dung</label><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="input h-20 resize-none" placeholder="Mô tả nội dung bài học..." /></div>
          <div><label className="input-label">Bài tập</label><textarea value={form.homework} onChange={e => setForm(f => ({ ...f, homework: e.target.value }))} className="input h-16 resize-none" placeholder="Bài tập về nhà..." /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="input-label">Địa điểm (tùy chọn)</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="input" placeholder="Phòng 101" /></div>
            <div><label className="input-label">Link họp (tùy chọn)</label><input value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} className="input" placeholder="https://meet.google.com/..." /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1">Lưu</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => deleteEvent(confirmDelete)}
        title="Xóa sự kiện?" message="Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác." confirmText="Xóa" danger />
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-surface-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">{value || '-'}</p>
    </div>
  );
}
