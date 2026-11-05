'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Swords } from 'lucide-react';

export default function Toasts({ toasts = [] }) {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          let icon = <Zap className="w-4 h-4 text-mine" />;
          let borderStyle = 'border-mine/30';
          let textColor = 'text-text';

          if (toast.type === 'stolen') {
            icon = <Swords className="w-4 h-4 text-mine" />;
            borderStyle = 'border-mine/50';
          } else if (toast.type === 'lost') {
            icon = <ShieldAlert className="w-4 h-4 text-rival" />;
            borderStyle = 'border-rival/50';
            textColor = 'text-rival';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel shadow-lg ${borderStyle} bg-[rgba(14,20,28,0.85)] pointer-events-auto`}
            >
              {icon}
              <span className={`text-xs sm:text-sm font-medium tracking-tight ${textColor}`}>
                {toast.message}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

