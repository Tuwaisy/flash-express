import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { BellIcon, LogoutIcon, MenuIcon, SunIcon, MoonIcon } from '../components/Icons';

interface HeaderProps {
    onLogout: () => void; 
    user: User; 
    onNavigate: (view: string) => void;
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout, user, onNavigate, onMenuClick }) => {
    const { inAppNotifications, markNotificationAsRead, theme, setTheme } = useAppContext();
    const { language, setLanguage, t } = useLanguage();
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const myNotifications = inAppNotifications
        .filter(n => n.userId === user.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const unreadCount = myNotifications.filter(n => !n.isRead).length;
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notificationId: string, link?: string) => {
        markNotificationAsRead(notificationId);
        if (link) {
            const view = link.startsWith('/') ? link.substring(1) : link;
            onNavigate(view);
        }
        setDropdownOpen(false);
    };

    const safeRoles = Array.isArray(user.roles) ? user.roles : [];

    return (
        <header className="bg-card/80 backdrop-blur-sm border-b border-border p-4 flex justify-between items-center z-20 sticky top-0">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="p-1 -ml-1 text-foreground lg:hidden">
                    <MenuIcon className="w-6 h-6" />
                </button>
                <div className="text-lg font-bold text-foreground">
                    {safeRoles.join(' & ')} Portal
                </div>
            </div>
             <div className="flex items-center gap-2 sm:gap-4">
                 <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-full text-foreground hover:bg-accent transition"
                    aria-label="Toggle theme"
                 >
                     {theme === 'dark' ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6" />}
                 </button>
                 <button 
                    onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                    className="p-2 rounded-full text-foreground hover:bg-accent transition text-sm font-medium"
                    aria-label="Toggle language"
                 >
                     {language === 'en' ? 'ع' : 'EN'}
                 </button>
                 <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setDropdownOpen(prev => !prev)} className="p-2 rounded-full hover:bg-accent transition relative">
                        <BellIcon className="w-6 h-6 text-foreground"/>
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                     {isDropdownOpen && (
                         <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-xl border border-border overflow-hidden">
                             <div className="p-3 font-semibold text-foreground border-b border-border">
                                 Notifications
                             </div>
                             <div className="max-h-96 overflow-y-auto">
                                 {myNotifications.length > 0 ? (
                                     myNotifications.map(n => (
                                         <button 
                                            key={n.id} 
                                            onClick={() => handleNotificationClick(n.id, n.link)}
                                            className={`w-full text-left p-3 border-b border-border last:border-b-0 ${!n.isRead ? 'bg-primary/10' : 'hover:bg-accent'}`}
                                        >
                                             <div className="flex items-start gap-3">
                                                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`}></div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-foreground">{n.message}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                                                </div>
                                             </div>
                                         </button>
                                     ))
                                 ) : (
                                     <p className="text-sm text-muted-foreground p-4 text-center">No notifications yet.</p>
                                 )}
                             </div>
                         </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <button onClick={onLogout} title="Logout" className="p-2 rounded-full hover:bg-red-100/50 dark:hover:bg-red-900/20 transition">
                       <LogoutIcon className="w-6 h-6 text-red-500"/>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;