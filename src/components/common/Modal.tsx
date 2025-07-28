
import React from 'react';
import { XCircleIcon } from '../Icons';

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | '2xl' | '4xl' }> = ({ isOpen, onClose, title, children, size = '2xl' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className={`bg-white rounded-xl shadow-2xl w-full max-w-${size} max-h-[90vh] flex flex-col`}>
                 <div className="flex justify-between items-center p-5 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                       <XCircleIcon className="w-7 h-7"/>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};
