
import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { Toast } from '../../types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XIcon } from '../Icons';

const ToastComponent: React.FC<{ toast: Toast }> = ({ toast }) => {
    const { removeToast } = useAppContext();
    const styles = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-primary-600',
    };
    const icons = {
        success: <CheckCircleIcon className="w-6 h-6 text-white"/>,
        error: <XCircleIcon className="w-6 h-6 text-white"/>,
        info: <InformationCircleIcon className="w-6 h-6 text-white"/>,
    }

    // Auto-dismiss after specified duration (default 10 seconds)
    useEffect(() => {
        const duration = toast.duration || 10000; // 10 seconds default
        const timer = setTimeout(() => {
            removeToast(toast.id);
        }, duration);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, removeToast]);

    return (
        <div className={`flex items-center gap-4 text-white p-4 pr-6 rounded-xl shadow-2xl animate-fade-in-up ${styles[toast.type]} relative`}>
           {icons[toast.type]}
           <p className="font-medium flex-1">{toast.message}</p>
           <button 
               onClick={() => removeToast(toast.id)}
               className="ml-2 hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
               aria-label="Close notification"
           >
               <XIcon className="w-4 h-4 text-white"/>
           </button>
        </div>
    );
};

export const ToastContainer = () => {
    const { toasts } = useAppContext();
    return (
        <div className="fixed bottom-8 right-8 z-[100] space-y-3">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} toast={toast} />
            ))}
        </div>
    );
};
