// src/layouts/Sidebar.tsx



import React from 'react';
import { Permission } from '../types';
import { useAppContext } from '../context/AppContext';
import { 
    LogoIcon, DashboardIcon, PackageIcon, UsersIcon, WalletIcon, 
    ChartBarIcon, TruckIcon, ClipboardListIcon, PlusCircleIcon,
    UserCircleIcon, BellIcon, TrendingUpIcon, CurrencyDollarIcon, XIcon, CogIcon, CheckCircleIcon, ArchiveBoxIcon, TagIcon, SwitchHorizontalIcon, MapPinIcon, CrownIcon
} from '../components/Icons';

interface NavItemConfig {
    name: string;
    icon: React.ReactElement;
    view: string;
    permission: Permission;
}

const ALL_NAV_ITEMS: NavItemConfig[] = [
    // Common
    { name: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard', permission: Permission.VIEW_DASHBOARD },
    
    // Client
    { name: 'My Shipments', icon: <PackageIcon />, view: 'shipments', permission: Permission.VIEW_OWN_SHIPMENTS },
    { name: 'Create Shipment', icon: <PlusCircleIcon />, view: 'create', permission: Permission.CREATE_SHIPMENTS },
    { name: 'My Wallet', icon: <WalletIcon />, view: 'wallet', permission: Permission.VIEW_OWN_WALLET },
    { name: 'My Financials', icon: <ChartBarIcon />, view: 'financials', permission: Permission.VIEW_OWN_FINANCIALS },
    { name: 'Client Revenue', icon: <TrendingUpIcon />, view: 'client-revenue', permission: Permission.VIEW_CLIENT_REVENUE },
    
    // Courier
    { name: 'My Tasks', icon: <ClipboardListIcon />, view: 'tasks', permission: Permission.VIEW_COURIER_TASKS },
    { name: 'Completed Orders', icon: <CheckCircleIcon />, view: 'completed-orders', permission: Permission.VIEW_COURIER_COMPLETED_ORDERS },
    { name: 'My Earnings', icon: <CurrencyDollarIcon />, view: 'courier-financials', permission: Permission.VIEW_COURIER_EARNINGS },

    // Assigner
    { name: 'Delivered Shipments', icon: <PackageIcon />, view: 'delivered-shipments', permission: Permission.VIEW_DELIVERED_SHIPMENTS },
    { name: 'Couriers By Zone', icon: <MapPinIcon />, view: 'couriers-by-zone', permission: Permission.VIEW_COURIERS_BY_ZONE },

    // User General
    { name: 'My Profile', icon: <UserCircleIcon />, view: 'profile', permission: Permission.VIEW_PROFILE },
    { name: 'My Assets', icon: <TagIcon />, view: 'my-assets', permission: Permission.VIEW_OWN_ASSETS },

    // Management
    { name: 'All Shipments', icon: <PackageIcon />, view: 'shipments', permission: Permission.VIEW_ALL_SHIPMENTS },
    { name: 'Packaging & Assignment', icon: <ArchiveBoxIcon />, view: 'packaging-and-assignment', permission: Permission.ASSIGN_SHIPMENTS },
    { name: 'Delivery Management', icon: <SwitchHorizontalIcon />, view: 'admin-delivery-management', permission: Permission.VIEW_ADMIN_DELIVERY_MANAGEMENT },
    { name: 'User Management', icon: <UsersIcon />, view: 'users', permission: Permission.MANAGE_USERS },
    { name: 'Role Management', icon: <CogIcon />, view: 'roles', permission: Permission.MANAGE_ROLES },
    { name: 'Partner Tiers', icon: <CrownIcon />, view: 'partner-tier-management', permission: Permission.MANAGE_PARTNER_TIERS },
    { name: 'Inventory', icon: <ArchiveBoxIcon />, view: 'inventory', permission: Permission.MANAGE_INVENTORY },
    { name: 'Asset Management', icon: <TagIcon />, view: 'asset-management', permission: Permission.MANAGE_ASSETS },
    { name: 'Supplier Management', icon: <SwitchHorizontalIcon />, view: 'supplier-management', permission: Permission.MANAGE_SUPPLIERS },
    
    // Analytics & Logs
    { name: 'Client Analytics', icon: <TrendingUpIcon />, view: 'client-analytics', permission: Permission.VIEW_CLIENT_ANALYTICS },
    { name: 'Courier Performance', icon: <CurrencyDollarIcon />, view: 'courier-performance', permission: Permission.VIEW_COURIER_PERFORMANCE },
    { name: 'Financials', icon: <ChartBarIcon />, view: 'financials', permission: Permission.VIEW_ADMIN_FINANCIALS },
    { name: 'Admin Financials', icon: <ChartBarIcon />, view: 'admin-financials', permission: Permission.VIEW_ADMIN_FINANCIALS },
    { name: 'Total Shipments', icon: <PackageIcon />, view: 'total-shipments', permission: Permission.VIEW_TOTAL_SHIPMENTS_OVERVIEW },
    { name: 'Notifications Log', icon: <BellIcon />, view: 'notifications', permission: Permission.VIEW_NOTIFICATIONS_LOG },
];

interface SidebarProps {
    activeView: string;
    setActiveView: (view: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
    const { hasPermission } = useAppContext();

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
                            key={item.view + item.name} 
                            onClick={() => handleItemClick(item.view)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-200 group relative ${
                                activeView === item.view 
                                ? 'bg-primary/10 text-primary font-semibold' 
                                : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                            <div className={`absolute left-0 top-0 h-full w-1 rounded-r-full transition-all duration-200 ${activeView === item.view ? 'bg-primary' : 'bg-transparent'}`}></div>
                            <div className="w-6 h-6">{item.icon}</div>
                            <span className="text-sm font-medium">{item.name}</span>
                        </button>
                    ))}
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;