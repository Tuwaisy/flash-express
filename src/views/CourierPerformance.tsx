// src/views/CourierPerformance.tsx



import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, CourierStats, CommissionType, CourierTransaction, CourierTransactionStatus, CourierTransactionType, ShipmentStatus, Shipment, UserRole } from '../types';
import { Modal } from '../components/common/Modal';
import { ShipmentList } from '../components/specific/ShipmentList';
import { DocumentDownloadIcon, UploadIcon, TruckIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { StatCard } from '../components/common/StatCard';

interface CourierPerformanceProps {
    onSelectShipment: (shipment: Shipment) => void;
}

const CourierPerformance: React.FC<CourierPerformanceProps> = ({ onSelectShipment }) => {
    const { users, shipments, courierStats, courierTransactions, updateCourierSettings, applyManualPenalty, processCourierPayout, declineCourierPayout, getAdminFinancials } = useAppContext();
    const [selectedCourier, setSelectedCourier] = useState<CourierStats | null>(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    // New state for shipment list modal
    const [modalShipments, setModalShipments] = useState<Shipment[] | null>(null);
    const [modalTitle, setModalTitle] = useState('');
    
    const adminFinancials = getAdminFinancials();

    const courierData = useMemo(() => {
        let data = users.filter(u => (u.roles || []).includes(UserRole.COURIER)).map(user => {
            const stats = courierStats.find(cs => cs.courierId === user.id);
            const pendingPayouts = courierTransactions.filter(t => t.courierId === user.id && t.type === CourierTransactionType.WITHDRAWAL_REQUEST && t.status === CourierTransactionStatus.PENDING);
            
            const pendingCount = shipments.filter(s => 
                s.courierId === user.id && 
                [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.ASSIGNED_TO_COURIER].includes(s.status)
            ).length;

            const totalAssigned = shipments.filter(s => s.courierId === user.id).length;
            // Calculate completed deliveries from actual shipment statuses, not stored stats
            const totalCompleted = shipments.filter(s => 
                s.courierId === user.id && s.status === ShipmentStatus.DELIVERED
            ).length;
            // Calculate failed deliveries from actual shipment statuses
            const totalFailed = shipments.filter(s => 
                s.courierId === user.id && s.status === ShipmentStatus.DELIVERY_FAILED
            ).length;

            return {
                user,
                stats,
                pendingPayouts,
                pendingCount,
                totalAssigned,
                totalCompleted,
                totalFailed,
            };
        });
        
        if (searchTerm.trim()) {
            data = data.filter(({ user }) => user.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));
        }
        
        return data.sort((a, b) => {
            const key = sortConfig.key as keyof (typeof a.user & typeof a.stats);
            const aValue = (key in a.user) ? a.user[key as keyof typeof a.user] : a.stats?.[key as keyof typeof a.stats];
            const bValue = (key in b.user) ? b.user[key as keyof typeof b.user] : b.stats?.[key as keyof typeof b.stats];
            
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
        
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    }, [users, courierStats, courierTransactions, shipments, searchTerm, sortConfig]);

    const requestSort = (key: string) => {
        const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ key, direction });
    };
    
    const handleExport = () => {
        const headers = [
            'Courier Name', 'Email', 'Phone', 'Status',
            'Total Assigned', 'Completed', 'Failed', 'Pending',
            'Total Earnings (EGP)', 'Current Balance (EGP)', 'Commission Type', 'Commission Value'
        ];

        const data = courierData.map(({ user, stats, totalAssigned, totalCompleted, totalFailed, pendingCount }) => [
            user.name,
            user.email,
            user.phone || 'N/A',
            stats?.isRestricted ? 'Restricted' : 'Active',
            totalAssigned,
            totalCompleted,
            totalFailed,
            pendingCount,
            (Number(stats?.totalEarnings) || 0).toFixed(2),
            (Number(stats?.currentBalance) || 0).toFixed(2),
            stats?.commissionType || 'N/A',
            stats?.commissionValue || 'N/A'
        ]);

        exportToCsv(headers, data, 'Courier_Performance_Report');
    };

    const handleManageClick = (courierId: number) => {
        const stats = courierStats.find(cs => cs.courierId === courierId);
        if (stats) {
            setSelectedCourier(stats);
            setIsManageModalOpen(true);
        }
    };

    const closeModal = () => {
        setIsManageModalOpen(false);
        setSelectedCourier(null);
    };

    const handleCountClick = (courierId: number, courierName: string, type: 'delivered' | 'pending' | 'assigned') => {
        let filteredShipments: Shipment[] = [];
        if (type === 'delivered') {
            filteredShipments = shipments.filter(s => s.courierId === courierId && s.status === ShipmentStatus.DELIVERED);
            setModalTitle(`Delivered Shipments for ${courierName}`);
        } else if (type === 'pending') {
            filteredShipments = shipments.filter(s => 
                s.courierId === courierId && 
                [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.ASSIGNED_TO_COURIER].includes(s.status)
            );
            setModalTitle(`Pending Shipments for ${courierName}`);
        } else if (type === 'assigned') {
            filteredShipments = shipments.filter(s => s.courierId === courierId);
            setModalTitle(`All Assigned Shipments for ${courierName}`);
        }
        setModalShipments(filteredShipments);
    };
    
    const handleShipmentSelect = (shipment: Shipment) => {
        onSelectShipment(shipment);
        setModalShipments(null); // Close the list modal
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Courier Performance</h1>
                    <p className="text-muted-foreground mt-1">Manage courier financials, restrictions, and view performance metrics.</p>
                </div>
                 <button 
                    onClick={handleExport}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                >
                    <DocumentDownloadIcon className="w-5 h-5"/>
                    Export CSV
                </button>
            </div>
            <StatCard
                title="Total Owed to Couriers"
                value={`${(Number(adminFinancials.totalOwedToCouriers) || 0).toFixed(2)} EGP`}
                icon={<TruckIcon className="w-7 h-7" />}
                color="#8b5cf6"
                subtitle="Sum of all courier current balances"
            />
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-border">
                    <input
                        type="text"
                        placeholder="Filter couriers by name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                    />
                </div>
                 {/* Desktop Table */}
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-left">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase cursor-pointer" onClick={() => requestSort('name')}>Courier</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase text-center cursor-pointer" onClick={() => requestSort('totalAssigned')}>Assigned</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase text-center cursor-pointer" onClick={() => requestSort('totalCompleted')}>Completed</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase text-center cursor-pointer" onClick={() => requestSort('totalFailed')}>Failed</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase text-center cursor-pointer" onClick={() => requestSort('pendingCount')}>Pending</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase cursor-pointer" onClick={() => requestSort('currentBalance')}>Earnings (Balance)</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Commission</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {courierData.map(({ user, stats, pendingPayouts, pendingCount, totalAssigned, totalCompleted, totalFailed }) => (
                                <tr key={user.id}>
                                    <td className="p-4 font-semibold">
                                        {user.name}
                                        <p className="font-mono text-xs text-muted-foreground mt-1">{user.publicId}</p>
                                    </td>
                                    <td className="p-4 font-mono text-center">
                                        <button 
                                            onClick={() => handleCountClick(user.id, user.name, 'assigned')}
                                            className="font-mono text-muted-foreground hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
                                            disabled={totalAssigned === 0}
                                        >
                                            {totalAssigned}
                                        </button>
                                    </td>
                                    <td className="p-4 font-mono text-center">
                                         <button 
                                            onClick={() => handleCountClick(user.id, user.name, 'delivered')}
                                            className="font-mono text-green-600 hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
                                            disabled={totalCompleted === 0}
                                        >
                                            {totalCompleted}
                                        </button>
                                    </td>
                                    <td className="p-4 font-mono text-center text-red-600">{totalFailed}</td>
                                    <td className="p-4 font-mono text-center">
                                         <button 
                                            onClick={() => handleCountClick(user.id, user.name, 'pending')}
                                            className="font-mono text-blue-600 hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
                                            disabled={pendingCount === 0}
                                        >
                                            {pendingCount}
                                        </button>
                                    </td>
                                    <td className="p-4 font-mono text-sm">
                                        {stats ? `${(Number(stats.totalEarnings) || 0).toFixed(2)} / ${(Number(stats.currentBalance) || 0).toFixed(2)}` : 'N/A'}
                                    </td>
                                    <td className="p-4 text-sm">
                                        {stats?.commissionType === 'flat' ? `${stats.commissionValue} EGP` : `${stats?.commissionValue}%`}
                                    </td>
                                    <td className="p-4">
                                        {stats?.isRestricted ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Restricted</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</span>}
                                        {pendingPayouts.length > 0 && (
                                            <div className="mt-1">
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                    {pendingPayouts.length} Payout{pendingPayouts.length > 1 ? 's' : ''} Pending
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleManageClick(user.id)} 
                                                className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-sm"
                                            >
                                                Manage
                                            </button>
                                            {pendingPayouts.length > 0 && (
                                                <button 
                                                    onClick={() => handleManageClick(user.id)} 
                                                    className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg text-sm"
                                                    title={`${pendingPayouts.length} payout request${pendingPayouts.length > 1 ? 's' : ''} pending approval`}
                                                >
                                                    Review Payouts
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden p-4 space-y-4 bg-secondary">
                    {courierData.map(({ user, stats, pendingPayouts, pendingCount, totalAssigned, totalCompleted, totalFailed }) => (
                         <div key={user.id} className="responsive-card">
                            <div className="responsive-card-header">
                                <span className="font-semibold text-foreground">{user.name}</span>
                                <div className="flex items-center gap-2">
                                     {stats?.isRestricted ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Restricted</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</span>}
                                    {pendingPayouts.length > 0 && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Payout</span>}
                                </div>
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">{user.publicId}</p>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="text-center">
                                    <button onClick={() => handleCountClick(user.id, user.name, 'assigned')} disabled={totalAssigned === 0} className="disabled:opacity-50">
                                        <div className="font-bold text-lg text-foreground">{totalAssigned}</div>
                                        <div className="text-xs text-muted-foreground">Assigned</div>
                                    </button>
                                </div>
                                <div className="text-center">
                                    <button onClick={() => handleCountClick(user.id, user.name, 'delivered')} disabled={totalCompleted === 0} className="disabled:opacity-50">
                                        <div className="font-bold text-lg text-green-600">{totalCompleted}</div>
                                        <div className="text-xs text-muted-foreground">Completed</div>
                                    </button>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-lg text-red-600">{totalFailed}</div>
                                    <div className="text-xs text-muted-foreground">Failed</div>
                                </div>
                                <div className="text-center">
                                    <button onClick={() => handleCountClick(user.id, user.name, 'pending')} disabled={pendingCount === 0} className="disabled:opacity-50">
                                        <div className="font-bold text-lg text-blue-600">{pendingCount}</div>
                                        <div className="text-xs text-muted-foreground">Pending</div>
                                    </button>
                                </div>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Earnings (Balance)</span>
                                <span className="responsive-card-value font-mono">{stats ? `${(Number(stats.currentBalance) || 0).toFixed(2)} EGP` : 'N/A'}</span>
                            </div>
                             <div className="responsive-card-item">
                                <span className="responsive-card-label">Commission</span>
                                <span className="responsive-card-value">{stats?.commissionType === 'flat' ? `${stats.commissionValue} EGP` : `${stats?.commissionValue}%`}</span>
                            </div>
                            <button onClick={() => handleManageClick(user.id)} className="mt-3 w-full px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-sm">
                                Manage Courier
                            </button>
                         </div>
                    ))}
                </div>
            </div>
            {selectedCourier && isManageModalOpen && (
                <ManageCourierModal
                    isOpen={isManageModalOpen}
                    onClose={closeModal}
                    courierStats={selectedCourier}
                    courierUser={users.find(u => u.id === selectedCourier.courierId)!}
                    payoutRequests={courierTransactions.filter(t => t.courierId === selectedCourier.courierId && t.type === CourierTransactionType.WITHDRAWAL_REQUEST && t.status === CourierTransactionStatus.PENDING)}
                    users={users}
                    courierTransactions={courierTransactions}
                    onUpdateSettings={updateCourierSettings}
                    onApplyPenalty={applyManualPenalty}
                    onProcessPayout={processCourierPayout}
                    onDeclinePayout={declineCourierPayout}
                />
            )}
             <Modal isOpen={!!modalShipments} onClose={() => setModalShipments(null)} title={modalTitle} size="4xl">
                {modalShipments && (
                    <div className="max-h-[70vh] overflow-y-auto">
                        <ShipmentList 
                            shipments={modalShipments} 
                            onSelect={handleShipmentSelect}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

interface ManageCourierModalProps {
    isOpen: boolean;
    onClose: () => void;
    courierStats: CourierStats;
    courierUser: User;
    payoutRequests: CourierTransaction[];
    users: User[];
    courierTransactions: CourierTransaction[];
    onUpdateSettings: (courierId: number, settings: Partial<Pick<CourierStats, 'commissionType'|'commissionValue'>>) => void;
    onApplyPenalty: (courierId: number, amount: number, description: string) => void;
    onProcessPayout: (transactionId: string, processedAmount: number, transferEvidence?: string) => void;
    onDeclinePayout: (transactionId: string) => void;
}

const ManageCourierModal: React.FC<ManageCourierModalProps> = ({ isOpen, onClose, courierStats, courierUser, payoutRequests, users, courierTransactions, onUpdateSettings, onApplyPenalty, onProcessPayout, onDeclinePayout }) => {
    const { shipments, addToast } = useAppContext();
    const [settings, setSettings] = useState({
        commissionType: courierStats.commissionType,
        commissionValue: courierStats.commissionValue,
    });
    const [penaltyAmount, setPenaltyAmount] = useState(0);
    const [penaltyReason, setPenaltyReason] = useState('');
    const [transferEvidence, setTransferEvidence] = useState<Record<string, string>>({});

    const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>, transactionId: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTransferEvidence(prev => ({ ...prev, [transactionId]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => { setSettings({ commissionType: courierStats.commissionType, commissionValue: courierStats.commissionValue }); }, [courierStats]);
    const handleSettingsSave = () => { onUpdateSettings(courierUser.id, settings); onClose(); };
    const handlePenaltyApply = () => { if (penaltyAmount > 0 && penaltyReason) { onApplyPenalty(courierUser.id, penaltyAmount, penaltyReason); setPenaltyAmount(0); setPenaltyReason(''); onClose(); }};
    const handleProcessClick = (payout: CourierTransaction) => {
        if (payout.paymentMethod === 'Bank Transfer' && !transferEvidence[payout.id]) {
            addToast('Please upload proof of transfer for this payout.', 'error');
            return;
        }
        
        if (confirm(`Are you sure you want to approve this payout of ${Math.abs(payout.amount).toFixed(2)} EGP for ${courierUser.name}?`)) {
            onProcessPayout(payout.id, Math.abs(payout.amount), transferEvidence[payout.id]);
            onClose(); // Close modal after processing
        }
    };

    const handleDeclineClick = (payout: CourierTransaction) => {
        if (confirm(`Are you sure you want to decline this payout request of ${Math.abs(payout.amount).toFixed(2)} EGP for ${courierUser.name}?`)) {
            onDeclinePayout(payout.id);
            onClose(); // Close modal after declining
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage ${courierUser.name}`} size="2xl">
            <div className="space-y-6">
                {/* Commission Settings */}
                <div className="p-4 bg-secondary rounded-lg">
                    <h3 className="font-bold text-foreground mb-3">Commission Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Type</label>
                            <select value={settings.commissionType} onChange={e => setSettings(s => ({ ...s, commissionType: e.target.value as CommissionType }))} className="w-full p-2 border border-border rounded-md bg-background">
                                <option value="flat">Flat Rate</option>
                                <option value="percentage">Percentage</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Value</label>
                            <input type="number" value={settings.commissionValue} onChange={e => setSettings(s => ({ ...s, commissionValue: parseFloat(e.target.value) }))} className="w-full p-2 border border-border rounded-md bg-background" />
                        </div>
                    </div>
                    <button onClick={handleSettingsSave} className="mt-4 w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold">Save Settings</button>
                </div>
                
                {/* Manual Penalty */}
                <div className="p-4 bg-secondary rounded-lg">
                    <h3 className="font-bold text-foreground mb-3">Apply Manual Penalty</h3>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-sm font-medium text-muted-foreground">Amount (EGP)</label>
                            <input type="number" value={penaltyAmount} onChange={e => setPenaltyAmount(parseFloat(e.target.value))} className="w-full p-2 border border-border rounded-md bg-background" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Reason</label>
                            <input type="text" value={penaltyReason} onChange={e => setPenaltyReason(e.target.value)} className="w-full p-2 border border-border rounded-md bg-background" />
                        </div>
                    </div>
                    <button onClick={handlePenaltyApply} className="mt-4 w-full bg-red-500 text-white py-2 rounded-lg font-semibold">Apply Penalty</button>
                </div>
                
                {/* Payout Requests */}
                {payoutRequests.length > 0 && (
                    <div className="p-4 bg-secondary rounded-lg">
                        <h3 className="font-bold text-foreground mb-3">Pending Payout Requests</h3>
                        <div className="space-y-3">
                            {payoutRequests.map(payout => (
                                <div key={payout.id} className="bg-background p-3 rounded-lg border border-border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-foreground">{(Number(-payout.amount) || 0).toFixed(2)} EGP</p>
                                            <p className="text-xs text-muted-foreground">{new Date(payout.timestamp).toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">{payout.paymentMethod}</p>
                                        </div>
                                         <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleDeclineClick(payout)} 
                                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded transition-colors"
                                                title="Decline this payout request"
                                            >
                                                Decline
                                            </button>
                                            <button 
                                                onClick={() => handleProcessClick(payout)} 
                                                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded transition-colors"
                                                title="Approve and process this payout"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                    {payout.paymentMethod === 'Bank Transfer' && (
                                        <div className="mt-2 pt-2 border-t border-border">
                                            <label className="text-xs font-medium text-muted-foreground">Proof of Transfer</label>
                                            <div className="flex items-center gap-2">
                                                <input type="file" accept="image/*" onChange={(e) => handleEvidenceUpload(e, payout.id)} className="w-full text-xs" />
                                                {transferEvidence[payout.id] && <UploadIcon className="w-4 h-4 text-green-500" />}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Referral Management */}
                <div className="p-4 bg-secondary rounded-lg">
                    <h3 className="font-bold text-foreground mb-3">Referral Management</h3>
                    <div className="space-y-3">
                        {/* Referrer Information */}
                        {courierUser.referrerId && (
                            <div className="bg-background p-3 rounded-lg border border-border">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Referred By</h4>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            {users.find(u => u.id === courierUser.referrerId)?.name || 'Unknown User'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            ID: {users.find(u => u.id === courierUser.referrerId)?.publicId || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-green-600">
                                            {(Number(users.find(u => u.id === courierUser.referrerId)?.referralCommission) || 0).toFixed(2)} EGP
                                        </p>
                                        <p className="text-xs text-muted-foreground">per delivery</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Referrals Made by This Courier */}
                        {(() => {
                            const referrals = users.filter(u => u.referrerId === courierUser.id && u.roles.includes(UserRole.COURIER));
                            return referrals.length > 0 ? (
                                <div className="bg-background p-3 rounded-lg border border-border">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Referrals Made ({referrals.length})</h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {referrals.map(referral => (
                                            <div key={referral.id} className="flex items-center justify-between py-1">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{referral.name}</p>
                                                    <p className="text-xs text-muted-foreground">{referral.publicId}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-green-600">
                                                        {courierTransactions.filter(t => 
                                                            t.courierId === courierUser.id && 
                                                            t.type === CourierTransactionType.REFERRAL_BONUS &&
                                                            t.description?.includes(referral.name)
                                                        ).length} bonuses earned
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-background p-3 rounded-lg border border-border text-center">
                                    <p className="text-sm text-muted-foreground">No referrals made yet</p>
                                </div>
                            );
                        })()}
                        
                        {/* Referral Earnings Summary */}
                        {(() => {
                            const referralEarnings = courierTransactions
                                .filter(t => t.courierId === courierUser.id && t.type === CourierTransactionType.REFERRAL_BONUS)
                                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                            
                            return (
                                <div className="bg-background p-3 rounded-lg border border-border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-muted-foreground">Total Referral Earnings</h4>
                                            <p className="text-lg font-bold text-green-600">{(Number(referralEarnings) || 0).toFixed(2)} EGP</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Commission Rate</p>
                                            <p className="text-sm font-medium text-foreground">
                                                {(Number(courierUser.referralCommission) || 0).toFixed(2)} EGP/delivery
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CourierPerformance;
