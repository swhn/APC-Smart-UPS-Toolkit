
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

interface NotificationContextProps {
  notify: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notif_${Date.now()}_${Math.random()}`;
    const duration = notification.duration || (notification.type === 'ERROR' ? 8000 : 4000);
    
    setNotifications((prev) => [...prev, { ...notification, id }]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ notify, removeNotification }}>
      {children}
      
      {/* Toast Container Layer */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <Toast key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

const Toast: React.FC<{ notification: Notification; onClose: () => void }> = ({ notification, onClose }) => {
  const getColors = () => {
    switch (notification.type) {
      case 'SUCCESS': return 'border-green-500 bg-[#0a1f0a] text-green-100';
      case 'WARNING': return 'border-orange-500 bg-[#1f1200] text-orange-100';
      case 'ERROR': return 'border-red-600 bg-[#1f0000] text-red-100';
      default: return 'border-neon-cyan bg-[#001f1f] text-cyan-100';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'SUCCESS': return '✓';
      case 'WARNING': return '⚠';
      case 'ERROR': return '✕';
      default: return 'ℹ';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      className={`pointer-events-auto border-l-4 p-4 rounded shadow-2xl backdrop-blur-md relative overflow-hidden flex items-start gap-3 ${getColors()}`}
    >
      <div className="font-mono text-lg font-bold leading-none mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        {notification.title && <h4 className="font-bold font-mono text-xs uppercase tracking-wider mb-1 opacity-80">{notification.title}</h4>}
        <p className="text-xs font-mono break-words leading-relaxed opacity-90">{notification.message}</p>
      </div>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      
      {/* Progress Bar for timeout */}
      <motion.div 
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: notification.type === 'ERROR' ? 8 : 4, ease: "linear" }}
        className="absolute bottom-0 left-0 h-0.5 bg-white/20"
      />
    </motion.div>
  );
};
