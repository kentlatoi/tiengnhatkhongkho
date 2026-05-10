import React, { useState } from 'react';

function isCorrectAnswer(question, optionKey, optionText) {
  const correct = String(question.correct_answer ?? question.answer ?? '').trim().toLowerCase();
  return correct === String(optionKey).toLowerCase() || correct === String(optionText).trim().toLowerCase();
}

export default function QuizInteractive({ quiz }) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizVersion, setQuizVersion] = useState(0);

  if (!quiz || quiz.length === 0) return <p className="text-surface-500 text-sm">Chưa có quiz.</p>;

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
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">
          Đã làm {answeredCount}/{quiz.length} câu
        </p>
        <button onClick={handleRefresh} className="btn-secondary text-xs px-3 py-1.5">
          Làm lại / Refresh
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {quiz.map((q, i) => {
          const answered = selectedAnswers[q.id];
          const hasAnswered = !!answered;
          const options = q.options || [];

          return (
            <div key={q.id} className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700">
              <p className="font-medium text-surface-900 dark:text-white mb-3 text-sm sm:text-base">
                Câu {i + 1}: {q.question}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {options.map((o, oi) => {
                  const isCorrect = isCorrectAnswer(q, oi, o);
                  const isSelected = hasAnswered && answered.key === oi;
                  
                  let btnClass = "bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-600 hover:border-primary-400 dark:hover:border-primary-500";
                  
                  if (hasAnswered) {
                    if (isCorrect) {
                      btnClass = "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-500 font-medium";
                    } else if (isSelected) {
                      btnClass = "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-500 font-medium";
                    } else {
                      btnClass = "bg-white dark:bg-surface-700 text-surface-400 dark:text-surface-500 border border-surface-200 dark:border-surface-600 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={oi}
                      onClick={() => handleSelect(q.id, oi, o)}
                      disabled={hasAnswered}
                      className={`p-3 rounded-lg text-sm text-left transition-all ${btnClass} ${!hasAnswered ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
                      {o}
                    </button>
                  );
                })}
              </div>
              {hasAnswered && q.explanation && (
                <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300"><span className="font-semibold">Giải thích:</span> {q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
