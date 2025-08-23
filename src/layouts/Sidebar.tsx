// src/layouts/Sidebar.tsx



import React from 'react';
import { Permission } from '../types';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { 
    LogoIcon, DashboardIcon, PackageIcon, UsersIcon, WalletIcon, 
    ChartBarIcon, TruckIcon, ClipboardListIcon, PlusCircleIcon,
    UserCircleIcon, BellIcon, TrendingUpIcon, CurrencyDollarIcon, XIcon, CogIcon, CheckCircleIcon, ArchiveBoxIcon, TagIcon, SwitchHorizontalIcon, MapPinIcon, CrownIcon, UploadIcon
} from '../components/Icons';

interface NavItemConfig {
    nameKey: string;
    icon: React.ReactElement;
    view: string;
    permission: Permission;
}

const ALL_NAV_ITEMS: NavItemConfig[] = [
    // Common
    { nameKey: 'dashboard', icon: <DashboardIcon />, view: 'dashboard', permission: Permission.VIEW_DASHBOARD },
    
    // Client
    { nameKey: 'myShipments', icon: <PackageIcon />, view: 'shipments', permission: Permission.VIEW_OWN_SHIPMENTS },
    { nameKey: 'createShipment', icon: <PlusCircleIcon />, view: 'create', permission: Permission.CREATE_SHIPMENTS },
    { nameKey: 'myWallet', icon: <WalletIcon />, view: 'wallet', permission: Permission.VIEW_OWN_WALLET },
    { nameKey: 'myFinancials', icon: <ChartBarIcon />, view: 'financials', permission: Permission.VIEW_OWN_FINANCIALS },
    { nameKey: 'clientRevenue', icon: <TrendingUpIcon />, view: 'client-revenue', permission: Permission.VIEW_CLIENT_REVENUE },
    
    // Courier
    { nameKey: 'myTasks', icon: <ClipboardListIcon />, view: 'tasks', permission: Permission.VIEW_COURIER_TASKS },
    { nameKey: 'completedOrders', icon: <CheckCircleIcon />, view: 'completed-orders', permission: Permission.VIEW_COURIER_COMPLETED_ORDERS },
    { nameKey: 'myEarnings', icon: <CurrencyDollarIcon />, view: 'courier-financials', permission: Permission.VIEW_COURIER_EARNINGS },

    // Assigner
    { nameKey: 'deliveredShipments', icon: <PackageIcon />, view: 'delivered-shipments', permission: Permission.VIEW_DELIVERED_SHIPMENTS },
    { nameKey: 'couriersByZone', icon: <MapPinIcon />, view: 'couriers-by-zone', permission: Permission.VIEW_COURIERS_BY_ZONE },

    // User General
    { nameKey: 'myProfile', icon: <UserCircleIcon />, view: 'profile', permission: Permission.VIEW_PROFILE },
    { nameKey: 'myAssets', icon: <TagIcon />, view: 'my-assets', permission: Permission.VIEW_OWN_ASSETS },

    // Management
    { nameKey: 'allShipments', icon: <PackageIcon />, view: 'shipments', permission: Permission.VIEW_ALL_SHIPMENTS },
    { nameKey: 'packagingAssignment', icon: <ArchiveBoxIcon />, view: 'packaging-and-assignment', permission: Permission.ASSIGN_SHIPMENTS },
    { nameKey: 'deliveryManagement', icon: <SwitchHorizontalIcon />, view: 'admin-delivery-management', permission: Permission.VIEW_ADMIN_DELIVERY_MANAGEMENT },
    { nameKey: 'userManagement', icon: <UsersIcon />, view: 'users', permission: Permission.MANAGE_USERS },
    { nameKey: 'roleManagement', icon: <CogIcon />, view: 'roles', permission: Permission.MANAGE_ROLES },
    { nameKey: 'partnerTiers', icon: <CrownIcon />, view: 'partner-tier-management', permission: Permission.MANAGE_PARTNER_TIERS },
    { nameKey: 'inventory', icon: <ArchiveBoxIcon />, view: 'inventory', permission: Permission.MANAGE_INVENTORY },
    { nameKey: 'assetManagement', icon: <TagIcon />, view: 'asset-management', permission: Permission.MANAGE_ASSETS },
    { nameKey: 'supplierManagement', icon: <SwitchHorizontalIcon />, view: 'supplier-management', permission: Permission.MANAGE_SUPPLIERS },
    
    // Analytics & Logs
    { nameKey: 'clientAnalytics', icon: <TrendingUpIcon />, view: 'client-analytics', permission: Permission.VIEW_CLIENT_ANALYTICS },
    { nameKey: 'courierPerformance', icon: <CurrencyDollarIcon />, view: 'courier-performance', permission: Permission.VIEW_COURIER_PERFORMANCE },
    { nameKey: 'financials', icon: <ChartBarIcon />, view: 'financials', permission: Permission.VIEW_ADMIN_FINANCIALS },
    { nameKey: 'adminFinancials', icon: <ChartBarIcon />, view: 'admin-financials', permission: Permission.VIEW_ADMIN_FINANCIALS },
    { nameKey: 'totalShipments', icon: <PackageIcon />, view: 'total-shipments', permission: Permission.VIEW_TOTAL_SHIPMENTS_OVERVIEW },
    { nameKey: 'notificationsLog', icon: <BellIcon />, view: 'notifications', permission: Permission.VIEW_NOTIFICATIONS_LOG },
];

interface SidebarProps {
    activeView: string;
    setActiveView: (view: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
    const { hasPermission } = useAppContext();
    const { t } = useLanguage();

    const availableNavItems = ALL_NAV_ITEMS.filter(item => {
        // Special case to avoid duplicate "Financials" links for admins
        if (item.view === 'financials' && hasPermission(Permission.VIEW_ADMIN_FINANCIALS)) {
             // If user can see Admin Financials, don't show the basic "Financials" link
            const adminFinancialsLink = ALL_NAV_ITEMS.find(i => i.view === 'admin-financials');
            if (adminFinancialsLink && hasPermission(adminFinancialsLink.permission)) {
                return false;
            }
        }
        // Special case to avoid duplicate "Shipments" links for clients with full access
        if (item.view === 'shipments' && item.permission === Permission.VIEW_OWN_SHIPMENTS && hasPermission(Permission.VIEW_ALL_SHIPMENTS)) {
            return false;
        }

        return hasPermission(item.permission);
    });
    
    const handleItemClick = (view: string) => {
        setActiveView(view);
        setIsOpen(false);
    }

    return (
        <>
            {/* Backdrop for mobile */}
            <div 
                className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            ></div>
            
            <aside 
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-card text-card-foreground flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:relative lg:translate-x-0 lg:w-64`}
            >
                <div className="p-4 flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-1.5 rounded-lg">
                            <LogoIcon className="w-8 h-8"/>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Flash Express</h1>
                        </div>
                    </div>
                     <button onClick={() => setIsOpen(false)} className="p-1 text-muted-foreground hover:text-foreground lg:hidden">
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {availableNavItems.map(item => (
                        <button 
                            key={item.view + item.nameKey} 
                            onClick={() => handleItemClick(item.view)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-200 group relative ${
                                activeView === item.view 
                                ? 'bg-primary/10 text-primary font-semibold' 
                                : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                            <div className={`absolute left-0 top-0 h-full w-1 rounded-r-full transition-all duration-200 ${activeView === item.view ? 'bg-primary' : 'bg-transparent'}`}></div>
                            <div className="w-6 h-6">{item.icon}</div>
                            <span className="text-sm font-medium">{t(item.nameKey)}</span>
                        </button>
                    ))}
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;