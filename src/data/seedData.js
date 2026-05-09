export const seedUsers = [
  { id: 'admin-1', name: 'Kent Nguyen', email: '912khangnguyen@gmail.com', password: 'Khang09122007', role: 'admin', avatar: '', phone: '', birthday: '', bio: 'Platform Administrator', createdAt: '2025-01-01', lastLogin: '' },
  { id: 'teacher-1', name: 'Tanaka Sensei', email: 'teacher@jlpt.com', password: 'teacher123', role: 'teacher', avatar: '', phone: '0901234567', birthday: '1990-05-15', bio: 'Japanese language teacher', createdAt: '2025-01-10', lastLogin: '' },
  { id: 'student-1', name: 'Nguyễn Minh', email: 'student@jlpt.com', password: 'student123', role: 'student', avatar: '', phone: '', birthday: '2005-03-20', bio: '', createdAt: '2025-01-15', lastLogin: '' },
  { id: 'student-2', name: 'Trần Hoa', email: 'hoa@jlpt.com', password: 'student123', role: 'student', avatar: '', phone: '', birthday: '2006-07-10', bio: '', createdAt: '2025-02-01', lastLogin: '' },
  { id: 'student-3', name: 'Lê Duy', email: 'duy@jlpt.com', password: 'student123', role: 'student', avatar: '', phone: '', birthday: '2005-11-30', bio: '', createdAt: '2025-02-05', lastLogin: '' },
];

export const seedClasses = [
  {
    id: 'class-1', name: 'JLPT N5 基礎', description: 'Khóa học cơ bản JLPT N5 dành cho người mới bắt đầu.', level: 'N5',
    schedule: 'Mon, Wed, Fri - 19:00', teacherId: 'teacher-1', teacherName: 'Tanaka Sensei',
    thumbnail: '🗻', studentIds: ['student-1', 'student-2'], createdAt: '2025-01-15',
  },
  {
    id: 'class-2', name: 'N5 会話 Conversation', description: 'Luyện hội thoại tiếng Nhật N5.', level: 'N5',
    schedule: 'Tue, Thu - 20:00', teacherId: 'teacher-1', teacherName: 'Tanaka Sensei',
    thumbnail: '🎌', studentIds: ['student-1', 'student-3'], createdAt: '2025-02-01',
  },
];

export const seedSessions = [
  {
    id: 'sess-1', classId: 'class-1', title: 'Hiragana あ～お', date: '2025-03-01', time: '19:00', order: 1,
    description: 'Học bảng chữ Hiragana hàng あ. Bao gồm あ い う え お.',
    files: [{ id: 'f1', name: 'Hiragana Chart.pdf', type: 'pdf', url: '#' }],
    audioFiles: [],
    videoFiles: [],
    homework: 'Viết mỗi chữ Hiragana 10 lần vào vở.', notes: 'Chú ý nét viết đúng thứ tự.',
    quiz: [
      { id: 'q1', question: '"あ" đọc là gì?', options: ['a', 'i', 'u', 'e'], answer: 0 },
      { id: 'q2', question: '"う" đọc là gì?', options: ['o', 'e', 'u', 'i'], answer: 2 },
    ],
    flashcards: [
      { id: 'fc1', front: 'あ', back: 'a - Đọc là "a"' },
      { id: 'fc2', front: 'い', back: 'i - Đọc là "i"' },
      { id: 'fc3', front: 'う', back: 'u - Đọc là "u"' },
    ],
  },
  {
    id: 'sess-2', classId: 'class-1', title: 'Hiragana か～こ', date: '2025-03-05', time: '19:00', order: 2,
    description: 'Học bảng chữ Hiragana hàng か: か き く け こ.',
    files: [], audioFiles: [], videoFiles: [],
    homework: 'Luyện viết か～こ.', notes: '',
    quiz: [{ id: 'q3', question: '"か" đọc là gì?', options: ['ka', 'ki', 'ku', 'ke'], answer: 0 }],
    flashcards: [{ id: 'fc4', front: 'か', back: 'ka' }, { id: 'fc5', front: 'き', back: 'ki' }],
  },
  {
    id: 'sess-3', classId: 'class-2', title: 'Chào hỏi cơ bản', date: '2025-03-02', time: '20:00', order: 1,
    description: 'Học các mẫu câu chào hỏi: おはようございます、こんにちは、こんばんは.',
    files: [], audioFiles: [], videoFiles: [],
    homework: 'Luyện nói trước gương.', notes: 'Chú ý ngữ điệu.',
    quiz: [], flashcards: [{ id: 'fc6', front: 'おはようございます', back: 'Chào buổi sáng (lịch sự)' }],
  },
];

export const seedVocabTopics = [
  { id: 'vt-1', title: 'Gia đình - 家族', description: 'Từ vựng về gia đình' },
  { id: 'vt-2', title: 'Số đếm - 数字', description: 'Các con số trong tiếng Nhật' },
];

export const seedVocabItems = [
  { id: 'vi-1', topicId: 'vt-1', japanese: '母', hiragana: 'はは', romaji: 'haha', vietnamese: 'Mẹ (của mình)', english: 'Mother', example: '母は先生です。', learned: false },
  { id: 'vi-2', topicId: 'vt-1', japanese: '父', hiragana: 'ちち', romaji: 'chichi', vietnamese: 'Bố (của mình)', english: 'Father', example: '父は会社員です。', learned: false },
  { id: 'vi-3', topicId: 'vt-2', japanese: '一', hiragana: 'いち', romaji: 'ichi', vietnamese: 'Một', english: 'One', example: '一つください。', learned: false },
  { id: 'vi-4', topicId: 'vt-2', japanese: '二', hiragana: 'に', romaji: 'ni', vietnamese: 'Hai', english: 'Two', example: '二人です。', learned: false },
];

export const seedGrammarTopics = [
  { id: 'gt-1', title: 'Câu cơ bản - 基本文', description: 'Các mẫu câu cơ bản N5' },
];

export const seedGrammarPoints = [
  {
    id: 'gp-1', topicId: 'gt-1', pattern: '〜は〜です', explanation: 'Mẫu câu khẳng định cơ bản "A là B".',
    vietnameseExplanation: 'Dùng để giới thiệu hoặc mô tả. は (wa) là trợ từ chủ đề, です (desu) là "là".',
    englishExplanation: 'Basic affirmative sentence pattern meaning "A is B".',
    examples: ['私は学生です。(Tôi là sinh viên)', '田中さんは先生です。(Anh Tanaka là giáo viên)'],
    notes: 'は đọc là "wa" khi dùng làm trợ từ.', learned: false,
  },
  {
    id: 'gp-2', topicId: 'gt-1', pattern: '〜は〜じゃありません', explanation: 'Mẫu câu phủ định "A không phải là B".',
    vietnameseExplanation: 'じゃありません là dạng phủ định lịch sự của です.',
    englishExplanation: 'Negative form: "A is not B".',
    examples: ['私は先生じゃありません。(Tôi không phải là giáo viên)'],
    notes: 'Dạng trang trọng hơn: ではありません.', learned: false,
  },
];

export const seedProgress = {};

export const seedActivityLogs = [
  { id: 'log-1', userId: 'admin-1', userName: 'Kent Nguyen', userEmail: '912khangnguyen@gmail.com', role: 'admin', action: 'Đăng nhập hệ thống', timestamp: '2025-01-01T08:00:00' },
];

// Expanded calendar event schema
export const seedCalendarEvents = [
  {
    id: 'evt-1', eventId: 'evt-1',
    classId: 'class-1', className: 'JLPT N5 基礎',
    teacherId: 'teacher-1', teacherName: 'Tanaka Sensei',
    lessonSessionId: 'sess-1',
    title: 'Hiragana あ～お',
    date: '2025-03-01', startTime: '19:00', endTime: '20:30',
    content: 'Học bảng chữ Hiragana hàng あ.',
    homework: 'Viết mỗi chữ Hiragana 10 lần.',
    location: 'Phòng 101',
    meetingLink: '',
    createdBy: 'teacher-1',
    createdAt: '2025-02-28T10:00:00',
    updatedAt: '2025-02-28T10:00:00',
    // backward compat
    time: '19:00', notes: '',
  },
  {
    id: 'evt-2', eventId: 'evt-2',
    classId: 'class-1', className: 'JLPT N5 基礎',
    teacherId: 'teacher-1', teacherName: 'Tanaka Sensei',
    lessonSessionId: 'sess-2',
    title: 'Hiragana か～こ',
    date: '2025-03-05', startTime: '19:00', endTime: '20:30',
    content: 'Học bảng chữ Hiragana hàng か.',
    homework: 'Luyện viết か～こ.',
    location: 'Phòng 101',
    meetingLink: '',
    createdBy: 'teacher-1',
    createdAt: '2025-03-01T10:00:00',
    updatedAt: '2025-03-01T10:00:00',
    time: '19:00', notes: '',
  },
  {
    id: 'evt-3', eventId: 'evt-3',
    classId: 'class-2', className: 'N5 会話 Conversation',
    teacherId: 'teacher-1', teacherName: 'Tanaka Sensei',
    lessonSessionId: 'sess-3',
    title: 'Chào hỏi cơ bản',
    date: '2025-03-02', startTime: '20:00', endTime: '21:30',
    content: 'Học các mẫu câu chào hỏi cơ bản.',
    homework: 'Luyện nói trước gương.',
    location: '',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    createdBy: 'teacher-1',
    createdAt: '2025-03-01T10:00:00',
    updatedAt: '2025-03-01T10:00:00',
    time: '20:00', notes: '',
  },
];
