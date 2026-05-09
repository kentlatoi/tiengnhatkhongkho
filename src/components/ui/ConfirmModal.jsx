import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', danger = false }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl ${
                danger ? 'bg-sakura-50 dark:bg-sakura-900/20' : 'bg-primary-50 dark:bg-primary-900/20'
              }`}>
                {danger ? '⚠️' : 'ℹ️'}
              </div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400">{message}</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                {cancelText}
              </button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-all cursor-pointer ${
                  danger
                    ? 'bg-sakura-500 hover:bg-sakura-600 text-white shadow-md shadow-sakura-500/25'
                    : 'btn-primary'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
