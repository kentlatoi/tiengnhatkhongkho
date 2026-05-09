import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calendarStore, classesStore, sessionsStore } from '../../store/localStorage';
import Modal from '../../components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuid } from 'uuid';

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

function getDaysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  const startDay = first.getDay();
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

export default function CalendarPage() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editEvt, setEditEvt] = useState(null);
  const [events, setEvents] = useState(() => calendarStore.getAll());
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const days = getDaysInMonth(year, month);

  const classes = useMemo(() => {
    if (isAdmin) return classesStore.getAll();
    if (isTeacher) return classesStore.getByTeacher(user.id);
    return classesStore.getByStudent(user.id);
  }, [isAdmin, isTeacher, user?.id]);

  const classIds = classes.map(c => c.id);
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const d = new Date(e.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) return false;
      if (isStudent) return classIds.includes(e.classId);
      if (isTeacher) return e.teacherId === user.id;
      return true;
    });
  }, [events, year, month, isStudent, isTeacher, isAdmin, classIds, user?.id]);

  const eventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(e => e.date === dateStr);
  };

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const blankEvt = { classId: '', title: '', date: '', time: '19:00', notes: '' };
  const [form, setForm] = useState(blankEvt);

  const openAdd = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setEditEvt(null);
    setForm({ ...blankEvt, date: dateStr });
    setShowForm(true);
  };

  const openEdit = (evt) => {
    setEditEvt(evt);
    setForm({ classId: evt.classId, title: evt.title, date: evt.date, time: evt.time, notes: evt.notes || '' });
    setShowForm(true);
  };

  const saveEvent = (e) => {
    e.preventDefault();
    const cls = classesStore.getById(form.classId);
    if (editEvt) {
      calendarStore.update(editEvt.id, { ...form, className: cls?.name || '', teacherId: isTeacher ? user.id : editEvt.teacherId });
    } else {
      calendarStore.add({ id: uuid(), ...form, className: cls?.name || '', teacherId: isTeacher ? user.id : '', sessionId: '' });
    }
    setEvents(calendarStore.getAll());
    setShowForm(false);
  };

  const deleteEvent = (id) => {
    if (confirm('Xóa sự kiện này?')) { calendarStore.remove(id); setEvents(calendarStore.getAll()); setSelectedDate(null); }
  };

  const canEdit = isAdmin || isTeacher;
  const selectedDayEvents = selectedDate ? eventsForDay(selectedDate) : [];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">📅 Lịch học</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prev} className="btn-ghost text-lg">←</button>
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">{MONTHS[month]} {year}</h2>
          <button onClick={next} className="btn-ghost text-lg">→</button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-surface-500 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayEvts = eventsForDay(day);
            const isSelected = selectedDate === day;

            return (
              <div key={i} onClick={() => setSelectedDate(day)}
                className={`relative min-h-[4rem] p-1 rounded-xl cursor-pointer transition-all text-sm ${
                  isSelected ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' :
                  isToday ? 'bg-primary-50 dark:bg-primary-900/20' :
                  'hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}>
                <span className={`block text-center font-medium ${isToday ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-surface-700 dark:text-surface-300'}`}>
                  {day}
                </span>
                {dayEvts.slice(0, 2).map(evt => (
                  <div key={evt.id} className="mt-0.5 px-1 py-0.5 rounded text-[10px] bg-primary-500 text-white truncate leading-tight">
                    {evt.title}
                  </div>
                ))}
                {dayEvts.length > 2 && <span className="text-[10px] text-surface-500">+{dayEvts.length - 2}</span>}
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
              <h3 className="font-semibold text-surface-900 dark:text-white">
                Ngày {selectedDate}/{month + 1}/{year}
              </h3>
              {canEdit && (
                <button onClick={() => openAdd(selectedDate)} className="btn-primary text-sm py-1.5 px-3">＋ Thêm</button>
              )}
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-surface-500 text-sm">Không có sự kiện.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map(evt => (
                  <div key={evt.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                    <div className="w-2 h-10 rounded-full bg-primary-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 dark:text-white text-sm">{evt.title}</p>
                      <p className="text-xs text-surface-500">{evt.className} · {evt.time}</p>
                      {evt.notes && <p className="text-xs text-surface-400 mt-0.5">{evt.notes}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(evt)} className="btn-ghost text-xs">✏️</button>
                        <button onClick={() => deleteEvent(evt.id)} className="btn-ghost text-xs text-sakura-500">🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event form modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editEvt ? 'Sửa sự kiện' : 'Thêm sự kiện'}>
        <form onSubmit={saveEvent} className="space-y-4">
          <div>
            <label className="input-label">Lớp học</label>
            <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} required className="input">
              <option value="">Chọn lớp...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="input-label">Tiêu đề</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Ngày</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="input" /></div>
            <div><label className="input-label">Giờ</label><input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="input" /></div>
          </div>
          <div><label className="input-label">Ghi chú</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input h-20 resize-none" /></div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1">Lưu</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
