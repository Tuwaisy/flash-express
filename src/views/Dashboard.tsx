import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole, ShipmentStatus, PaymentMethod, Permission, Shipment } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PackageIcon, TruckIcon, WalletIcon, ClipboardListIcon, UsersIcon, ChartBarIcon, CurrencyDollarIcon, CheckCircleIcon, SwitchHorizontalIcon, UserCircleIcon, ArchiveBoxIcon, ClockIcon, DatabaseResetIcon } from '../components/Icons';

interface DashboardProps {
    setActiveView: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveView }) => {
    const { currentUser, shipments, users, courierStats, hasPermission, setShipmentFilter, resetDatabaseComplete, addToast } = useAppContext();
    const { t } = useLanguage();
    const [showResetConfirm, setShowResetConfirm] = React.useState(false);
    const [isResetting, setIsResetting] = React.useState(false);
    
    if (!currentUser) return null;
    
    const clientShipments = shipments.filter(s => s.clientId === currentUser.id);

    const navigateWithFilter = (filter: (shipment: Shipment) => boolean, view: string = 'total-shipments') => {
        setShipmentFilter(() => filter);
        setActiveView(view);
    };

    const handleDatabaseReset = async () => {
        if (!confirm('⚠️ WARNING: This will permanently delete ALL data except Admin, Test Courier, and Test Client!\n\nThis action cannot be undone. Are you absolutely sure?')) {
            return;
        }
        
        setIsResetting(true);
        try {
            const success = await resetDatabaseComplete();
            if (success) {
                setActiveView('dashboard'); // Return to dashboard
            }
        } catch (error) {
            console.error('Reset failed:', error);
        } finally {
            setIsResetting(false);
            setShowResetConfirm(false);
        }
    };

    const renderClientDashboard = () => {
        const deliveredShipments = clientShipments.filter(s => s.status === ShipmentStatus.DELIVERED);
        const pendingShipments = clientShipments.filter(s => ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status));
        const outForDeliveryShipments = clientShipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY);
        
        // Calculate client revenue (package value minus shipping fees)
        const clientRevenue = deliveredShipments.reduce((sum, s) => {
            const packageValue = Number(s.packageValue) || 0;
            const shippingFee = Number(s.clientFlatRateFee) || 0;
            return sum + Math.max(0, packageValue - shippingFee);
        }, 0);
        
        // Calculate total amount to be collected (for delivered orders)
        const totalCollected = deliveredShipments.reduce((sum, s) => {
            const packageValue = Number(s.packageValue) || 0;
            return sum + packageValue;
        }, 0);
        
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Shipments" value={clientShipments.length} icon={<PackageIcon />} color="#3b82f6" onClick={() => setActiveView('shipments')} />
                    <StatCard title="Pending Orders" value={pendingShipments.length} icon={<ClockIcon />} color="#f59e0b" onClick={() => navigateWithFilter(s => s.clientId === currentUser.id && ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status), 'shipments')} />
                    <StatCard title="Out for Delivery" value={outForDeliveryShipments.length} icon={<TruckIcon />} color="#8b5cf6" onClick={() => navigateWithFilter(s => s.clientId === currentUser.id && s.status === ShipmentStatus.OUT_FOR_DELIVERY, 'shipments')} />
                    <StatCard title="Completed Orders" value={deliveredShipments.length} icon={<CheckCircleIcon />} color="#10b981" onClick={() => navigateWithFilter(s => s.clientId === currentUser.id && s.status === ShipmentStatus.DELIVERED, 'shipments')} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Wallet Balance" value={`${(Number(currentUser.walletBalance) || 0).toFixed(2)} EGP`} icon={<WalletIcon />} color="#22c55e" onClick={() => setActiveView('wallet')} />
                    <StatCard title="Total Collected" value={`${(Number(totalCollected) || 0).toFixed(2)} EGP`} icon={<CurrencyDollarIcon />} color="#3b82f6" onClick={() => setActiveView('wallet')} />
                    <StatCard title="Net Revenue" value={`${(Number(clientRevenue) || 0).toFixed(2)} EGP`} icon={<ChartBarIcon />} color="#16a34a" onClick={() => setActiveView('wallet')} />
                </div>
            </div>
        );
    };
    
    const renderCourierDashboard = () => {
        const myStats = courierStats.find(cs => cs.courierId === currentUser.id);
        const myPendingTasks = shipments.filter(s => s.courierId === currentUser.id && ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status));
        const cashToCollect = myPendingTasks.filter(s => s.paymentMethod === PaymentMethod.COD).reduce((sum, s) => sum + s.price, 0);
        const myDeliveredShipments = shipments.filter(s => s.courierId === currentUser.id && s.status === ShipmentStatus.DELIVERED);

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Cash to Collect" 
                    value={`${(Number(cashToCollect) || 0).toFixed(2)} EGP`} 
                    icon={<WalletIcon />} 
                    color="#f97316"
                    onClick={() => setActiveView('tasks')}
                />
                <StatCard 
                    title="Current Balance" 
                    value={`${(Number(myStats?.currentBalance) || 0).toFixed(2)} EGP`} 
                    icon={<CurrencyDollarIcon />} 
                    color="#16a34a"
                    onClick={() => setActiveView('courier-financials')}
                />
                <StatCard 
                    title="Pending Deliveries" 
                    value={myPendingTasks.length} 
                    icon={<TruckIcon />} 
                    color="#06b6d4" 
                    onClick={() => setActiveView('tasks')}
                />
                <StatCard 
                    title="Total Deliveries" 
                    value={myDeliveredShipments.length} 
                    icon={<CheckCircleIcon />} 
                    color="#8b5cf6"
                    onClick={() => setActiveView('completed-orders')}
                />
            </div>
        )
    };

    const renderAdminDashboard = () => {
        const isShipmentOverdue = (shipment: Shipment) => {
            if ([ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(shipment.status)) {
                return false;
            }
            const twoAndHalfDaysAgo = new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000);
            return new Date(shipment.creationDate) < twoAndHalfDaysAgo;
        };

        const overdueShipments = shipments.filter(isShipmentOverdue);

        return (
            <div className="space-y-8">
                {/* Main KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Total Shipments" value={shipments.length} icon={<PackageIcon />} color="#3b82f6" onClick={() => setActiveView('total-shipments')}/>
                    <StatCard title="Total Clients" value={users.filter(u => (u.roles || []).includes(UserRole.CLIENT)).length} icon={<UsersIcon />} color="#8b5cf6" onClick={() => setActiveView('client-analytics')}/>
                    <StatCard title="Total Couriers" value={users.filter(u => (u.roles || []).includes(UserRole.COURIER)).length} icon={<TruckIcon />} color="#f97316" onClick={() => setActiveView('courier-performance')}/>
                </div>
                
                {/* Secondary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Processing" value={shipments.filter(s => [ShipmentStatus.WAITING_FOR_PACKAGING, ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT].includes(s.status)).length} icon={<ClipboardListIcon />} color="#f59e0b" onClick={() => setActiveView('packaging-and-assignment')}/>
                    <StatCard title="Out for Delivery" value={shipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY).length} icon={<TruckIcon />} color="#06b6d4" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY)}/>
                    <StatCard title="Delivered Today" value={shipments.filter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString()).length} icon={<PackageIcon />} color="#16a34a" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString())}/>
                    <StatCard 
                        title="Overdue" 
                        value={overdueShipments.length} 
                        icon={<ClockIcon />} 
                        color="#ef4444"
                        onClick={() => navigateWithFilter(isShipmentOverdue)}
                    />
                </div>
                
                {/* Quick Actions */}
                <div className="card">
                    <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <button 
                            onClick={() => setActiveView('users')} 
                            className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                        >
                            <UsersIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-sm font-semibold text-foreground">Manage Users</span>
                        </button>
                        <button 
                            onClick={() => setActiveView('courier-performance')} 
                            className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                        >
                            <TruckIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-sm font-semibold text-foreground">Courier Performance</span>
                        </button>
                         <button 
                            onClick={() => setActiveView('admin-financials')} 
                            className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                        >
                            <ChartBarIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-sm font-semibold text-foreground">Financials</span>
                        </button>
                        <button 
                            onClick={() => setActiveView('notifications')} 
                            className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                        >
                            <ClipboardListIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-sm font-semibold text-foreground">Notifications Log</span>
                        </button>
                        <button 
                            onClick={handleDatabaseReset}
                            disabled={isResetting}
                            className="p-4 bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 rounded-lg border transition-colors text-center group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <DatabaseResetIcon className={`w-8 h-8 text-red-600 mx-auto mb-2 group-hover:scale-110 transition-transform ${isResetting ? 'animate-spin' : ''}`}/>
                            <span className="text-sm font-semibold text-red-700">
                                {isResetting ? 'Resetting...' : 'Reset Database'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    const renderSuperUserDashboard = () => (
        <div className="space-y-6">
            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Shipments" value={shipments.length} icon={<PackageIcon />} color="#3b82f6" onClick={() => setActiveView('total-shipments')}/>
                <StatCard title="Total Clients" value={users.filter(u => (u.roles || []).includes(UserRole.CLIENT)).length} icon={<UsersIcon />} color="#8b5cf6" onClick={() => setActiveView('client-analytics')}/>
                <StatCard title="Total Couriers" value={users.filter(u => (u.roles || []).includes(UserRole.COURIER)).length} icon={<TruckIcon />} color="#f97316" onClick={() => setActiveView('courier-performance')}/>
            </div>
            
            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Processing" value={shipments.filter(s => [ShipmentStatus.WAITING_FOR_PACKAGING, ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT].includes(s.status)).length} icon={<ClipboardListIcon />} color="#f59e0b" onClick={() => setActiveView('packaging-and-assignment')}/>
                <StatCard title="Out for Delivery" value={shipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY).length} icon={<TruckIcon />} color="#06b6d4" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY)}/>
                <StatCard title="Delivered Today" value={shipments.filter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString()).length} icon={<PackageIcon />} color="#16a34a" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED && new Date(s.deliveryDate || '').toDateString() === new Date().toDateString())}/>
            </div>
            
            {/* Quick Actions */}
            <div className="card">
                <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <button 
                        onClick={() => setActiveView('users')} 
                        className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                    >
                        <UsersIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-semibold text-foreground">Manage Users</span>
                    </button>
                    <button 
                        onClick={() => setActiveView('courier-performance')} 
                        className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                    >
                        <TruckIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-semibold text-foreground">Courier Performance</span>
                    </button>
                     <button 
                        onClick={() => setActiveView('client-analytics')} 
                        className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                    >
                        <ChartBarIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-semibold text-foreground">Client Analytics</span>
                    </button>
                    <button 
                        onClick={() => setActiveView('notifications')} 
                        className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group"
                    >
                        <ClipboardListIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-semibold text-foreground">Notifications Log</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderAssigningUserDashboard = () => {
        const shipmentsToAssign = shipments.filter(s => s.status === ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT);
        const outForDeliveryShipments = shipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY);
       return (
           <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <StatCard title="Ready for Assignment" value={shipmentsToAssign.length} icon={<PackageIcon />} color="#8b5cf6" onClick={() => setActiveView('packaging-and-assignment')} />
                   <StatCard title="Total Out for Delivery" value={outForDeliveryShipments.length} icon={<TruckIcon />} color="#06b6d4" onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY)} />
                   <StatCard title="Total Shipments" value={shipments.length} icon={<ClipboardListIcon />} color="#3b82f6" onClick={() => setActiveView('total-shipments')} />
               </div>
               <div className="card">
                   <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                       <button onClick={() => setActiveView('packaging-and-assignment')} className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group">
                           <ArchiveBoxIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                           <span className="text-sm font-semibold text-foreground">Assign Shipments</span>
                       </button>
                       <button onClick={() => setActiveView('total-shipments')} className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group">
                           <PackageIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                           <span className="text-sm font-semibold text-foreground">View All Shipments</span>
                       </button>
                       <button onClick={() => setActiveView('inventory')} className="p-4 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors text-center group">
                           <ArchiveBoxIcon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                           <span className="text-sm font-semibold text-foreground">Manage Inventory</span>
                       </button>
                   </div>
               </div>
           </div>
       )
   };

    const safeRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [];

    if (safeRoles.includes(UserRole.ADMIN)) {
        return renderAdminDashboard();
    }
    if (safeRoles.includes(UserRole.SUPER_USER)) {
        return renderSuperUserDashboard();
    }
    if (safeRoles.includes(UserRole.ASSIGNING_USER)) {
        return renderAssigningUserDashboard();
    }
    if (safeRoles.includes(UserRole.COURIER)) {
        return renderCourierDashboard();
    }
    if (safeRoles.includes(UserRole.CLIENT)) {
        return renderClientDashboard();
    }

    return (
        <div className="card p-6">
            <h1 className="text-2xl font-bold">Welcome, {currentUser.name}</h1>
            <p>Your dashboard is ready.</p>
        </div>
    );
};

export default Dashboard;