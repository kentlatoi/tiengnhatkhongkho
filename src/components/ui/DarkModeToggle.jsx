import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

export default function DarkModeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={toggle}
      className="relative w-14 h-7 rounded-full bg-surface-200 dark:bg-surface-700 transition-colors p-1 cursor-pointer">
      <motion.div layout className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-xs"
        style={{ x: dark ? 24 : 0 }}>
        {dark ? '🌙' : '☀️'}
      </motion.div>
    </motion.button>
  );
}
