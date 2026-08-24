import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg font-medium text-white animate-in slide-in-from-bottom-5 duration-300 z-50 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-teal-600'
        }`}>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
};
