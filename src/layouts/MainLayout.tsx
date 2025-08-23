// src/layouts/MainLayout.tsx



import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, UserRole, ShipmentStatus, Permission } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../views/Dashboard';
import ShipmentsView from '../views/Shipments';
import CreateShipment from '../views/CreateShipment';
import PackagingAndAssignment from '../views/PackagingAndAssignment';
import CourierTasks from '../views/CourierTasks';
import UserManagement from '../views/UserManagement';
import Wallet from '../views/Wallet';
import Financials from '../views/Financials';
import AdminFinancials from '../views/AdminFinancials';
import NotificationsLog from '../views/NotificationsLog';
import Profile from '../views/Profile';
import ClientAnalytics from '../views/ClientAnalytics';
import CourierFinancials from '../views/CourierFinancials';
import CourierPerformance from '../views/CourierPerformance';
import { TotalShipments } from '../views/TotalShipments';
import { Modal } from '../components/common/Modal';
import { ShipmentLabel } from '../components/common/ShipmentLabel';
import { ShipmentStatusBadge } from '../components/common/ShipmentStatusBadge';
import { PrinterIcon, SwitchHorizontalIcon } from '../components/Icons';
import RoleManagement from '../views/RoleManagement';
import CourierCompleted from '../views/CourierCompleted';
import InventoryManagement from '../views/InventoryManagement';
import AssetManagement from '../views/AssetManagement';
import MyAssets from '../views/MyAssets';
import SupplierManagement from '../views/SupplierManagement';
import DeliveredShipmentsView from '../views/DeliveredShipmentsView';
import CouriersByZoneView from '../views/CouriersByZoneView';
import PartnerTierManagement from '../views/PartnerTierManagement';
import AdminDeliveryManagement from '../views/AdminDeliveryManagement';
import ClientRevenue from '../views/ClientRevenue';

const MainLayout: React.FC = () => {
    const { currentUser, logout, users, reassignCourier, getCourierName, hasPermission, setShipmentFilter } = useAppContext();
    const [activeView, setActiveViewInternal] = useState('dashboard');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [labelShipment, setLabelShipment] = useState<Shipment | null>(null);
    
    const [isReassigning, setIsReassigning] = useState(false);
    const [newCourierId, setNewCourierId] = useState<number | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const setActiveView = (view: string) => {
        const filterViews = ['shipments', 'total-shipments'];
        // If navigating away from a page that uses the global filter, clear it.
        if (filterViews.includes(activeView) && !filterViews.includes(view)) {
            setShipmentFilter(null);
        }
        setActiveViewInternal(view);
    };

    const handleModalClose = () => {
        setSelectedShipment(null);
        setIsReassigning(false);
        setNewCourierId(null);
    }

    const handleReassignConfirm = () => {
        if (selectedShipment && newCourierId) {
            reassignCourier(selectedShipment.id, newCourierId);
            handleModalClose();
        }
    };
    
    useEffect(() => {
        if(labelShipment){
            document.body.classList.add('printing-label');
        } else {
            document.body.classList.remove('printing-label');
        }
        return () => document.body.classList.remove('printing-label');
    }, [labelShipment])

    if (!currentUser) return null;
    
    const handlePrint = () => {
        window.print();
    }

    const renderActiveView = () => {
        switch (activeView) {
            case 'dashboard': return <Dashboard setActiveView={setActiveView} />;
            case 'shipments': return <ShipmentsView onSelectShipment={setSelectedShipment} />;
            case 'create': return <CreateShipment />;
            case 'packaging-and-assignment': return <PackagingAndAssignment setLabelShipment={setLabelShipment} />;
            case 'tasks': return <CourierTasks setActiveView={setActiveView} />;
            case 'completed-orders': return <CourierCompleted onSelectShipment={setSelectedShipment} />;
            case 'users': return <UserManagement />;
            case 'roles': return <RoleManagement />;
            case 'wallet': return <Wallet />;
            case 'financials': return <Financials />;
            case 'admin-financials': return <AdminFinancials setActiveView={setActiveView} />;
            case 'client-analytics': return <ClientAnalytics onSelectShipment={setSelectedShipment} setActiveView={setActiveView} />;
            case 'notifications': return <NotificationsLog />;
            case 'profile': return <Profile />;
            case 'courier-financials': return <CourierFinancials />;
            case 'courier-performance': return <CourierPerformance onSelectShipment={setSelectedShipment} />;
            case 'total-shipments': return <TotalShipments onSelectShipment={setSelectedShipment} />;
            case 'inventory': return <InventoryManagement />;
            case 'asset-management': return <AssetManagement />;
            case 'my-assets': return <MyAssets />;
            case 'supplier-management': return <SupplierManagement />;
            case 'delivered-shipments': return <DeliveredShipmentsView onSelectShipment={setSelectedShipment} />;
            case 'couriers-by-zone': return <CouriersByZoneView />;
            case 'partner-tier-management': return <PartnerTierManagement />;
            case 'admin-delivery-management': return <AdminDeliveryManagement />;
            case 'client-revenue': return <ClientRevenue />;
            default: return <Dashboard setActiveView={setActiveView} />;
        }
    }

    return (
        <div className="flex h-screen bg-background text-foreground">
            <Sidebar 
                activeView={activeView} 
                setActiveView={setActiveView} 
                isOpen={isSidebarOpen}
                setIsOpen={setSidebarOpen}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    onLogout={logout} 
                    user={currentUser} 
                    onNavigate={setActiveView}
                    onMenuClick={() => setSidebarOpen(true)}
                />
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    {renderActiveView()}
                </main>
            </div>
            <Modal isOpen={!!selectedShipment} onClose={handleModalClose} title={`Shipment Details: ${selectedShipment?.id}`}>
                {selectedShipment && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-start gap-4">
                             <div>
                                <p className="mb-1"><strong>Status:</strong> <ShipmentStatusBadge status={selectedShipment.status} /></p>
                                <p className="text-sm text-muted-foreground"><strong>From:</strong> {selectedShipment.fromAddress.street}, {selectedShipment.fromAddress.city}</p>
                                <p className="text-sm text-muted-foreground"><strong>To:</strong> {selectedShipment.toAddress.street}, {selectedShipment.toAddress.city}</p>
                                <p className="text-sm text-muted-foreground"><strong>Courier:</strong> {getCourierName(selectedShipment.courierId)}</p>
                            </div>
                            <div className="flex flex-col gap-2 items-end flex-shrink-0">
                                {hasPermission(Permission.PRINT_LABELS) && (
                                    <button onClick={() => setLabelShipment(selectedShipment)} className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-accent transition w-full justify-center text-sm">
                                        <PrinterIcon className="w-5 h-5"/>
                                        Print Label
                                    </button>
                                )}
                            </div>
                        </div>

                        {selectedShipment.packagingLog && selectedShipment.packagingLog.length > 0 && !currentUser.roles.includes(UserRole.CLIENT as any) && !(currentUser.roles as string[]).includes('Client') && (
                            <div className="pt-4 border-t border-border">
                                <h4 className="font-semibold text-foreground">Packaging Info</h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground">
                                    {selectedShipment.packagingLog.map(log => (
                                        <li key={log.inventoryItemId}>{log.quantityUsed}x {log.itemName}</li>
                                    ))}
                                </ul>
                                {selectedShipment.packagingNotes && (
                                     <p className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded-md"><strong>Notes:</strong> {selectedShipment.packagingNotes}</p>
                                )}
                            </div>
                        )}
                        
                        {selectedShipment.failureReason && (
                            <div>
                                <strong>Failure Reason:</strong>
                                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/40 dark:text-red-300 p-3 rounded-lg mt-2">{selectedShipment.failureReason}</p>
                            </div>
                        )}
                        {hasPermission(Permission.ASSIGN_SHIPMENTS) && selectedShipment.courierId && ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(selectedShipment.status) && (
                            <div className="mt-4 pt-4 border-t border-border">
                                {!isReassigning ? (
                                    <button onClick={() => setIsReassigning(true)} className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 font-semibold rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition text-sm">
                                        <SwitchHorizontalIcon className="w-5 h-5"/>
                                        Re-assign Courier
                                    </button>
                                ) : (
                                    <div className="space-y-3 p-4 bg-secondary rounded-lg">
                                        <h4 className="font-semibold text-foreground">Select new courier:</h4>
                                        <div className="flex gap-2">
                                            <select 
                                                onChange={(e) => setNewCourierId(parseInt(e.target.value))}
                                                defaultValue=""
                                                className="flex-grow px-3 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                                            >
                                                <option value="" disabled>Available Couriers...</option>
                                                {users.filter(u => u.roles.includes(UserRole.COURIER)).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} ({c.zones?.join(', ')})</option>
                                                ))}
                                            </select>
                                            <button onClick={handleReassignConfirm} disabled={!newCourierId} className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition disabled:bg-muted">Save</button>
                                            <button onClick={() => setIsReassigning(false)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent">Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
             <Modal isOpen={!!labelShipment} onClose={() => setLabelShipment(null)} title="Print Shipment Label" size="4xl" wrapperClassName="label-print-modal">
                 {labelShipment && (
                    <div className="flex flex-col gap-6">
                        <ShipmentLabel shipment={labelShipment} />
                        <div className="flex justify-end gap-4 p-4 -mb-6 -mx-6 bg-secondary rounded-b-xl modal-footer">
                           <button onClick={() => setLabelShipment(null)} className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-accent font-semibold">
                               Close
                           </button>
                           <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition">
                                <PrinterIcon className="w-5 h-5"/>
                                Print
                           </button>
                        </div>
                    </div>
                 )}
            </Modal>
        </div>
    );
};

export default MainLayout;