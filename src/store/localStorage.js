import { seedUsers, seedClasses, seedSessions, seedVocabTopics, seedVocabItems, seedGrammarTopics, seedGrammarPoints, seedProgress, seedActivityLogs, seedCalendarEvents } from '../data/seedData';

const KEYS = {
  users: 'jlpt_users', classes: 'jlpt_classes', sessions: 'jlpt_sessions',
  vocabTopics: 'jlpt_vocab_topics', vocabItems: 'jlpt_vocab_items',
  grammarTopics: 'jlpt_grammar_topics', grammarPoints: 'jlpt_grammar_points',
  progress: 'jlpt_progress', activityLogs: 'jlpt_activity_logs', calendarEvents: 'jlpt_calendar_events',
};

function get(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}
function set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export function initStore() {
  if (!get(KEYS.users)) set(KEYS.users, seedUsers);
  if (!get(KEYS.classes)) set(KEYS.classes, seedClasses);
  if (!get(KEYS.sessions)) set(KEYS.sessions, seedSessions);
  if (!get(KEYS.vocabTopics)) set(KEYS.vocabTopics, seedVocabTopics);
  if (!get(KEYS.vocabItems)) set(KEYS.vocabItems, seedVocabItems);
  if (!get(KEYS.grammarTopics)) set(KEYS.grammarTopics, seedGrammarTopics);
  if (!get(KEYS.grammarPoints)) set(KEYS.grammarPoints, seedGrammarPoints);
  if (!get(KEYS.progress)) set(KEYS.progress, seedProgress);
  if (!get(KEYS.activityLogs)) set(KEYS.activityLogs, seedActivityLogs);
  if (!get(KEYS.calendarEvents)) set(KEYS.calendarEvents, seedCalendarEvents);
  // Ensure admin always exists
  const users = get(KEYS.users) || [];
  if (!users.find(u => u.email === '912khangnguyen@gmail.com')) {
    users.unshift(seedUsers[0]);
    set(KEYS.users, users);
  }
}

export function resetStore() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  initStore();
}

// Generic CRUD
function getAll(key) { return get(key) || []; }
function getById(key, id) { return getAll(key).find(i => i.id === id) || null; }
function add(key, item) { const arr = getAll(key); arr.push(item); set(key, arr); return item; }
function update(key, id, data) {
  const arr = getAll(key).map(i => i.id === id ? { ...i, ...data } : i);
  set(key, arr); return arr.find(i => i.id === id);
}
function remove(key, id) { set(key, getAll(key).filter(i => i.id !== id)); }

// Users
export const usersStore = {
  getAll: () => getAll(KEYS.users),
  getById: (id) => getById(KEYS.users, id),
  getByEmail: (email) => getAll(KEYS.users).find(u => u.email === email),
  getStudents: () => getAll(KEYS.users).filter(u => u.role === 'student'),
  getTeachers: () => getAll(KEYS.users).filter(u => u.role === 'teacher'),
  getByRole: (role) => getAll(KEYS.users).filter(u => u.role === role),
  add: (u) => add(KEYS.users, u),
  update: (id, d) => update(KEYS.users, id, d),
  remove: (id) => remove(KEYS.users, id),
};

// Classes
export const classesStore = {
  getAll: () => getAll(KEYS.classes),
  getById: (id) => getById(KEYS.classes, id),
  getByTeacher: (tid) => getAll(KEYS.classes).filter(c => c.teacherId === tid),
  getByStudent: (sid) => getAll(KEYS.classes).filter(c => (c.studentIds || []).includes(sid)),
  add: (c) => add(KEYS.classes, c),
  update: (id, d) => update(KEYS.classes, id, d),
  remove: (id) => remove(KEYS.classes, id),
  assignStudents: (classId, studentIds) => update(KEYS.classes, classId, { studentIds }),
};

// Sessions
export const sessionsStore = {
  getAll: () => getAll(KEYS.sessions),
  getByClass: (cid) => getAll(KEYS.sessions).filter(s => s.classId === cid).sort((a, b) => a.order - b.order),
  getById: (id) => getById(KEYS.sessions, id),
  add: (s) => add(KEYS.sessions, s),
  update: (id, d) => update(KEYS.sessions, id, d),
  remove: (id) => remove(KEYS.sessions, id),
};

// Vocabulary
export const vocabTopicsStore = {
  getAll: () => getAll(KEYS.vocabTopics),
  getById: (id) => getById(KEYS.vocabTopics, id),
  add: (t) => add(KEYS.vocabTopics, t),
  update: (id, d) => update(KEYS.vocabTopics, id, d),
  remove: (id) => { remove(KEYS.vocabTopics, id); set(KEYS.vocabItems, getAll(KEYS.vocabItems).filter(i => i.topicId !== id)); },
};
export const vocabItemsStore = {
  getAll: () => getAll(KEYS.vocabItems),
  getByTopic: (tid) => getAll(KEYS.vocabItems).filter(i => i.topicId === tid),
  getById: (id) => getById(KEYS.vocabItems, id),
  add: (i) => add(KEYS.vocabItems, i),
  update: (id, d) => update(KEYS.vocabItems, id, d),
  remove: (id) => remove(KEYS.vocabItems, id),
};

// Grammar
export const grammarTopicsStore = {
  getAll: () => getAll(KEYS.grammarTopics),
  getById: (id) => getById(KEYS.grammarTopics, id),
  add: (t) => add(KEYS.grammarTopics, t),
  update: (id, d) => update(KEYS.grammarTopics, id, d),
  remove: (id) => { remove(KEYS.grammarTopics, id); set(KEYS.grammarPoints, getAll(KEYS.grammarPoints).filter(i => i.topicId !== id)); },
};
export const grammarPointsStore = {
  getAll: () => getAll(KEYS.grammarPoints),
  getByTopic: (tid) => getAll(KEYS.grammarPoints).filter(i => i.topicId === tid),
  getById: (id) => getById(KEYS.grammarPoints, id),
  add: (i) => add(KEYS.grammarPoints, i),
  update: (id, d) => update(KEYS.grammarPoints, id, d),
  remove: (id) => remove(KEYS.grammarPoints, id),
};

// Progress
export const progressStore = {
  get: () => get(KEYS.progress) || {},
  getForStudent: (sid) => (get(KEYS.progress) || {})[sid] || {},
  markLessonComplete: (sid, sessId) => {
    const p = get(KEYS.progress) || {};
    if (!p[sid]) p[sid] = { completedSessions: [], quizScores: {}, learnedVocab: [], learnedGrammar: [] };
    if (!p[sid].completedSessions.includes(sessId)) p[sid].completedSessions.push(sessId);
    set(KEYS.progress, p);
  },
  saveQuizScore: (sid, sessId, score) => {
    const p = get(KEYS.progress) || {};
    if (!p[sid]) p[sid] = { completedSessions: [], quizScores: {}, learnedVocab: [], learnedGrammar: [] };
    p[sid].quizScores[sessId] = score;
    set(KEYS.progress, p);
  },
  toggleLearnedVocab: (sid, vocabId) => {
    const p = get(KEYS.progress) || {};
    if (!p[sid]) p[sid] = { completedSessions: [], quizScores: {}, learnedVocab: [], learnedGrammar: [] };
    const idx = p[sid].learnedVocab.indexOf(vocabId);
    if (idx === -1) p[sid].learnedVocab.push(vocabId); else p[sid].learnedVocab.splice(idx, 1);
    set(KEYS.progress, p);
  },
  toggleLearnedGrammar: (sid, grammarId) => {
    const p = get(KEYS.progress) || {};
    if (!p[sid]) p[sid] = { completedSessions: [], quizScores: {}, learnedVocab: [], learnedGrammar: [] };
    const idx = p[sid].learnedGrammar.indexOf(grammarId);
    if (idx === -1) p[sid].learnedGrammar.push(grammarId); else p[sid].learnedGrammar.splice(idx, 1);
    set(KEYS.progress, p);
  },
};

// Activity Logs
export const activityLogsStore = {
  getAll: () => getAll(KEYS.activityLogs).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
  add: (log) => add(KEYS.activityLogs, { id: 'log-' + Date.now(), timestamp: new Date().toISOString(), ...log }),
  clear: () => set(KEYS.activityLogs, []),
};

export function logActivity(user, action) {
  if (!user) return;
  activityLogsStore.add({
    userId: user.id, userName: user.name, userEmail: user.email, role: user.role, action,
  });
}

// Calendar Events
export const calendarStore = {
  getAll: () => getAll(KEYS.calendarEvents),
  getById: (id) => getById(KEYS.calendarEvents, id),
  getByClass: (classId) => getAll(KEYS.calendarEvents).filter(e => e.classId === classId),
  getByTeacher: (tid) => getAll(KEYS.calendarEvents).filter(e => e.teacherId === tid),
  getByDate: (date) => getAll(KEYS.calendarEvents).filter(e => e.date === date),
  getByMonth: (year, month) => getAll(KEYS.calendarEvents).filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  }),
  add: (e) => add(KEYS.calendarEvents, e),
  update: (id, d) => update(KEYS.calendarEvents, id, d),
  remove: (id) => remove(KEYS.calendarEvents, id),
};
