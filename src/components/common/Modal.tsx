import React from 'react';
import { XCircleIcon } from '../Icons';

export const Modal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode; 
    size?: 'md' | 'lg' | '2xl' | '4xl';
    wrapperClassName?: string;
}> = ({ isOpen, onClose, title, children, size = '2xl', wrapperClassName = '' }) => {
    if (!isOpen) return null;
    return (
        <div className={`fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 ${wrapperClassName}`}>
            <div className={`card w-full max-w-${size} max-h-[90vh] flex flex-col p-0`}>
                 <div className="flex justify-between items-center p-5 border-b border-border modal-header">
                    <h3 className="text-xl font-bold text-foreground">{title}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
                       <XCircleIcon className="w-7 h-7"/>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};