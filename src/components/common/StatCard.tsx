import React from 'react';

export const StatCard: React.FC<{ 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    color: string;
    subtitle?: string;
    onClick?: () => void;
}> = ({ title, value, icon, color, subtitle, onClick }) => (
    <div 
        className={`card p-5 flex items-center justify-between border-t-4 ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300' : ''}`} 
        style={{borderTopColor: color}}
        onClick={onClick}
    >
        <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground dark:text-primary mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-4 rounded-full`} style={{ color: color, backgroundColor: `${color}1A` }}>
            {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-8 h-8' })}
        </div>
    </div>
);