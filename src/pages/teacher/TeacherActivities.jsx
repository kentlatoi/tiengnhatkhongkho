import { motion } from 'framer-motion';

export default function TeacherActivities() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">Hoạt động 🎮</h1>
      <p className="text-surface-500 mb-6">Quản lý các hoạt động tương tác trong lớp học.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { icon: '🃏', title: 'Flashcards', desc: 'Thẻ lật cho từ vựng và ngữ pháp', count: 'Tạo trong buổi học' },
          { icon: '❓', title: 'Quiz trắc nghiệm', desc: 'Câu hỏi trắc nghiệm kiểm tra kiến thức', count: 'Tạo trong buổi học' },
          { icon: '📝', title: 'Bài tập về nhà', desc: 'Giao và quản lý bài tập', count: 'Tạo trong buổi học' },
          { icon: '🎯', title: 'Ghép từ vựng', desc: 'Trò chơi ghép từ và nghĩa', count: 'Sắp ra mắt' },
          { icon: '✍️', title: 'Luyện viết', desc: 'Luyện viết Hiragana, Katakana', count: 'Sắp ra mắt' },
          { icon: '🎧', title: 'Nghe hiểu', desc: 'Bài tập nghe và trả lời', count: 'Sắp ra mắt' },
        ].map((a, i) => (
          <motion.div key={a.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }} className="glass-card cursor-pointer group">
            <div className="text-4xl mb-3">{a.icon}</div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">{a.title}</h3>
            <p className="text-sm text-surface-500 mb-3">{a.desc}</p>
            <span className="badge-primary">{a.count}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
