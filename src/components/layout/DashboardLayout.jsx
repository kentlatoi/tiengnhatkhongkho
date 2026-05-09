import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { motion } from 'framer-motion';

export default function DashboardLayout({ title }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar onMenuClick={() => setMobileOpen(true)} title={title} />
        <main className="flex-1 p-4 lg:p-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }} key={title}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
