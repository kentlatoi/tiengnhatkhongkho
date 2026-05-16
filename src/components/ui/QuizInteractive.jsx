import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function isCorrectAnswer(question, optionKey, optionText) {
  const correct = String(question.correct_answer ?? question.answer ?? '').trim().toLowerCase();
  return correct === String(optionKey).toLowerCase() || correct === String(optionText).trim().toLowerCase();
}

export default function QuizInteractive({ quiz }) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizVersion, setQuizVersion] = useState(0);

  if (!quiz || quiz.length === 0) return <p className="text-surface-500 text-sm italic">Chưa có câu hỏi ôn tập.</p>;

  const handleSelect = (qId, optionKey, optionText) => {
    if (selectedAnswers[qId] !== undefined) return; // already answered
    setSelectedAnswers(prev => ({ ...prev, [qId]: { key: optionKey, text: optionText } }));
  };

  const handleRefresh = () => {
    setSelectedAnswers({});
    setQuizVersion(v => v + 1);
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div key={quizVersion} className="flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
            📝
          </div>
          <p className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">
            Tiến độ: <span className="text-primary-600 dark:text-primary-400">{answeredCount}/{quiz.length}</span>
          </p>
        </div>
        <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white transition-all duration-300">
          🔄 Làm lại
        </button>
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-3 custom-scrollbar">
        {quiz.map((q, i) => {
          const answered = selectedAnswers[q.id];
          const hasAnswered = !!answered;
          const options = q.options || [];

          return (
            <motion.div key={q.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 ${hasAnswered ? 'bg-surface-50 dark:bg-surface-800/80 border-surface-200 dark:border-surface-700' : 'bg-white dark:bg-surface-900 border-surface-100 dark:border-surface-800 shadow-lg shadow-surface-900/5'}`}>
              <div className="flex items-start gap-3 sm:gap-4 mb-5">
                <span className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-xl font-bold text-sm ${hasAnswered ? 'bg-surface-200 dark:bg-surface-700 text-surface-500' : 'bg-primary-500 text-white shadow-md shadow-primary-500/20'}`}>
                  {i + 1}
                </span>
                <p className="font-bold text-surface-900 dark:text-white text-base sm:text-lg leading-relaxed pt-0.5">
                  {q.question}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 sm:pl-12">
                {options.map((o, oi) => {
                  const isCorrect = isCorrectAnswer(q, oi, o);
                  const isSelected = hasAnswered && answered.key === oi;
                  
                  let btnClass = "bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md";
                  let letterClass = "bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400";
                  let icon = null;
                  
                  if (hasAnswered) {
                    if (isCorrect) {
                      btnClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-500/20";
                      letterClass = "bg-emerald-500 text-white";
                      icon = "✓";
                    } else if (isSelected) {
                      btnClass = "bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100";
                      letterClass = "bg-rose-500 text-white";
                      icon = "✕";
                    } else {
                      btnClass = "bg-surface-50 dark:bg-surface-800/50 border-surface-100 dark:border-surface-800 text-surface-400 dark:text-surface-600 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={oi}
                      onClick={() => handleSelect(q.id, oi, o)}
                      disabled={hasAnswered}
                      className={`relative flex items-center p-3 rounded-2xl border text-sm sm:text-base text-left transition-all duration-300 ${btnClass} ${!hasAnswered ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'}`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs mr-3 transition-colors ${letterClass}`}>
                        {icon || String.fromCharCode(65 + oi)}
                      </div>
                      <span className="font-medium pr-2">{o}</span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {hasAnswered && q.explanation && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                    <div className="mt-5 pl-0 sm:pl-12">
                      <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 flex items-start gap-3">
                        <span className="text-blue-500 mt-0.5 shrink-0">💡</span>
                        <div>
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-500 uppercase tracking-widest mb-1">Giải thích</p>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-200 leading-relaxed">{q.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
