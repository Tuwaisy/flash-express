// src/views/AdminFinancials.tsx



import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Permission, Shipment, ShipmentStatus, PaymentMethod, ClientFinancialSummary, User, PartnerTier } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { CheckCircleIcon, WalletIcon, PackageIcon, DocumentDownloadIcon, PencilIcon, TruckIcon, XCircleIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { ShipmentList } from '../components/specific/ShipmentList';

interface AdminFinancialsProps {
    setActiveView: (view: string) => void;
}

const AdminFinancials: React.FC<AdminFinancialsProps> = ({ setActiveView }) => {
    const { 
        currentUser, 
        getAdminFinancials, 
        getClientFinancials, 
        hasPermission,
        updateClientFlatRate,
        setShipmentFilter,
        shipments,
    } = useAppContext();

    const [showClientRateModal, setShowClientRateModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientFinancialSummary | null>(null);
    const [isShipmentsModalOpen, setIsShipmentsModalOpen] = useState(false);
    const [tempFlatRate, setTempFlatRate] = useState<number>(0);
    
    const clientShipments = useMemo(() => {
        if (!selectedClient) return [];
        return shipments.filter(s => s.clientId === selectedClient.clientId);
    }, [shipments, selectedClient]);


    // Access control
    if (!currentUser || !hasPermission(Permission.VIEW_ADMIN_FINANCIALS)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-600">Only users with appropriate permissions can access financial data.</p>
                </div>
            </div>
        );
    }

    const adminFinancials = getAdminFinancials();
    const clientFinancials = getClientFinancials();

    // Add safety checks for undefined values
    const safeAdminFinancials = {
        cashToCollect: adminFinancials?.cashToCollect || 0,
        totalCODCollected: adminFinancials?.totalCODCollected || 0,
        undeliveredPackagesValue: adminFinancials?.undeliveredPackagesValue || 0,
        totalFees: adminFinancials?.totalFees || 0,
        totalRevenue: adminFinancials?.totalRevenue || 0,
        totalCommission: adminFinancials?.totalCommission || 0,
        netRevenue: adminFinancials?.netRevenue || 0,
        totalOrders: adminFinancials?.totalOrders || 0,
        totalCollectedMoney: adminFinancials?.totalCollectedMoney || 0,
        uncollectedTransferFees: adminFinancials?.uncollectedTransferFees || 0,
        totalOwedToCouriers: adminFinancials?.totalOwedToCouriers || 0,
    };

    const openClientRateModal = (client: ClientFinancialSummary) => {
        setSelectedClient(client);
        setTempFlatRate(client.flatRateFee);
        setShowClientRateModal(true);
    };
    
    const handleViewClientShipments = (client: ClientFinancialSummary) => {
        setSelectedClient(client);
        setIsShipmentsModalOpen(true);
    };


    const handleClientRateUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedClient && tempFlatRate >= 0) {
            updateClientFlatRate(selectedClient.clientId, tempFlatRate);
            setShowClientRateModal(false);
        }
    };
    
    const navigateWithFilter = (filter: (shipment: Shipment) => boolean) => {
        setShipmentFilter(() => filter);
        setActiveView('total-shipments');
    };

    const handleExportFinancials = () => {
        const headers = ['Metric', 'Value'];
        const data = [
            ['Cash to Collect (In Transit COD)', `${safeAdminFinancials.cashToCollect.toFixed(2)} EGP`],
            ['Total COD Collected (Delivered)', `${safeAdminFinancials.totalCODCollected.toFixed(2)} EGP`],
            ['Undelivered Packages Value', `${safeAdminFinancials.undeliveredPackagesValue.toFixed(2)} EGP`],
            ['Potential Fees from Pending Orders', `${safeAdminFinancials.totalFees.toFixed(2)} EGP`],
            ['Total Revenue (Shipping Fees)', `${safeAdminFinancials.totalRevenue.toFixed(2)} EGP`],
            ['Total Commission (Paid to Couriers)', `${safeAdminFinancials.totalCommission.toFixed(2)} EGP`],
            ['Net Profit (Revenue - Commission)', `${safeAdminFinancials.netRevenue.toFixed(2)} EGP`],
            ['Total Delivered Orders', safeAdminFinancials.totalOrders.toString()]
        ];
        exportToCsv(headers, data, 'Admin_Financial_Report');
    };

    const handleExportClientSummary = () => {
        const headers = ['Client Name', 'Total Orders', 'Order Sum (EGP)', 'Flat Rate Fee (EGP)'];
        const data = clientFinancials.map(client => [
            client.clientName,
            client.totalOrders.toString(),
            client.orderSum.toFixed(2),
            client.flatRateFee.toFixed(2)
        ]);
        exportToCsv(headers, data, 'Client_Financial_Summary');
    };

    const getTierBadgeColor = (tier: PartnerTier) => {
        switch (tier) {
            case PartnerTier.GOLD: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case PartnerTier.SILVER: return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300';
            case PartnerTier.BRONZE: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            default: return 'bg-secondary text-secondary-foreground';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Admin Financial Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Enhanced financial overview with detailed tracking metrics.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={handleExportFinancials} 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export Report</span>
                    </button>
                </div>
            </div>

            {/* Enhanced Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard 
                    title="Cash to Collect" 
                    value={`${safeAdminFinancials.cashToCollect.toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#f59e0b"
                    subtitle="COD for packages out for delivery"
                    onClick={() => navigateWithFilter(s => s.paymentMethod === PaymentMethod.COD && [ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status))}
                />
                <StatCard 
                    title="Total COD Collected" 
                    value={`${safeAdminFinancials.totalCODCollected.toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#16a34a"
                    subtitle="From delivered packages"
                    onClick={() => navigateWithFilter(s => s.paymentMethod === PaymentMethod.COD && s.status === ShipmentStatus.DELIVERED)}
                />
                <StatCard 
                    title="Undelivered Packages" 
                    value={`${safeAdminFinancials.undeliveredPackagesValue.toFixed(2)} EGP`} 
                    icon={<PackageIcon className="w-7 h-7"/>} 
                    color="#f59e0b"
                    subtitle="Value of pending deliveries"
                    onClick={() => navigateWithFilter(s => ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status))}
                />
                <StatCard
                    title="Uncollected Transfer Fees"
                    value={`${safeAdminFinancials.uncollectedTransferFees.toFixed(2)} EGP`}
                    icon={<XCircleIcon className="w-7 h-7"/>}
                    color="#ef4444"
                    subtitle="Shipping fees for pending transfers"
                    onClick={() => navigateWithFilter(s => s.paymentMethod === PaymentMethod.TRANSFER && ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status))}
                />
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Revenue" 
                    value={`${safeAdminFinancials.totalRevenue.toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#16a34a"
                    subtitle="Shipping fees earned"
                    onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED || s.status === ShipmentStatus.DELIVERY_FAILED)}
                />
                <StatCard 
                    title="Total Commission" 
                    value={`${safeAdminFinancials.totalCommission.toFixed(2)} EGP`} 
                    icon={<TruckIcon className="w-7 h-7"/>} 
                    color="#f97316"
                    subtitle="Paid to couriers"
                    onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED)}
                />
                <StatCard 
                    title="Net Profit" 
                    value={`${safeAdminFinancials.netRevenue.toFixed(2)} EGP`} 
                    icon={<CheckCircleIcon className="w-7 h-7"/>} 
                    color="#3b82f6"
                    subtitle="Revenue - Commission"
                    onClick={() => navigateWithFilter(s => s.status === ShipmentStatus.DELIVERED || s.status === ShipmentStatus.DELIVERY_FAILED)}
                />
                 <StatCard 
                    title="Total Owed to Couriers" 
                    value={`${safeAdminFinancials.totalOwedToCouriers.toFixed(2)} EGP`} 
                    icon={<TruckIcon className="w-7 h-7"/>} 
                    color="#8b5cf6"
                    subtitle="Current balance across all couriers"
                    onClick={() => setActiveView('courier-performance')}
                />
            </div>

            {/* Client Financial Summary */}
            <div className="card overflow-hidden">
                <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Client Financial Summary</h2>
                        <p className="text-muted-foreground mt-1 text-sm">Revenue breakdown by client with adjustable flat rates.</p>
                    </div>
                    <button 
                        onClick={handleExportClientSummary}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-left">
                        <thead className="bg-secondary border-b border-border">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Orders</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Sum</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Flat Rate Fee</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Partner Tier</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {clientFinancials.map(client => (
                                <tr key={client.clientId}>
                                    <td className="px-6 py-4 font-semibold text-foreground">{client.clientName}</td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        <button onClick={() => handleViewClientShipments(client)} className="text-primary hover:underline">
                                            {client.totalOrders}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">{client.orderSum.toFixed(2)} EGP</td>
                                    <td className="px-6 py-4 font-semibold text-primary">{client.flatRateFee.toFixed(2)} EGP</td>
                                    <td className="px-6 py-4">
                                        {client.partnerTier ? (
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTierBadgeColor(client.partnerTier)}`}>
                                                {client.partnerTier}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">Not Assigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => openClientRateModal(client)}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-md"
                                            title="Edit Flat Rate"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                 {/* Mobile Cards */}
                <div className="lg:hidden p-4 space-y-4 bg-secondary">
                    {clientFinancials.map(client => (
                        <div key={client.clientId} className="responsive-card !bg-card">
                            <div className="responsive-card-header">
                                <span className="font-semibold text-foreground">{client.clientName}</span>
                                <button 
                                    onClick={() => openClientRateModal(client)}
                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-md -mr-2 -mt-2"
                                    title="Edit Flat Rate"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                            </div>
                             <div className="responsive-card-item">
                                <span className="responsive-card-label">Flat Rate</span>
                                <span className="responsive-card-value font-semibold text-primary">{client.flatRateFee.toFixed(2)} EGP</span>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Partner Tier</span>
                                <span className="responsive-card-value">
                                    {client.partnerTier ? (
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTierBadgeColor(client.partnerTier)}`}>
                                            {client.partnerTier}
                                        </span>
                                    ) : ( 'N/A' )}
                                </span>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Total Orders</span>
                                 <button onClick={() => handleViewClientShipments(client)} className="responsive-card-value text-primary hover:underline">
                                    {client.totalOrders}
                                </button>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Order Sum</span>
                                <span className="responsive-card-value">{client.orderSum.toFixed(2)} EGP</span>
                            </div>
                        </div>
                    ))}
                </div>

                {clientFinancials.length === 0 && (
                     <div className="text-center py-16 text-muted-foreground">
                        <p className="font-semibold">No Client Data</p>
                        <p className="text-sm">No client financial information is available yet.</p>
                    </div>
                )}
            </div>

            {/* Client Flat Rate Modal */}
            <Modal 
                isOpen={showClientRateModal} 
                onClose={() => setShowClientRateModal(false)} 
                title={`Update Flat Rate for ${selectedClient?.clientName}`}
            >
                <form onSubmit={handleClientRateUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Flat Rate Fee (EGP)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={tempFlatRate}
                            onChange={(e) => setTempFlatRate(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                            required
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            This fee is charged per package but not visible to the client.
                        </p>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setShowClientRateModal(false)} 
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold"
                        >
                            Update Rate
                        </button>
                    </div>
                </form>
            </Modal>
            
             <Modal isOpen={isShipmentsModalOpen} onClose={() => setIsShipmentsModalOpen(false)} title={`Shipments for ${selectedClient?.clientName}`} size="4xl">
                <div className="max-h-[70vh] overflow-y-auto">
                    <ShipmentList shipments={clientShipments} />
                </div>
            </Modal>
        </div>
    );
};

export default AdminFinancials;