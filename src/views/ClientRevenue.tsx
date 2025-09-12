import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole, Shipment, ShipmentStatus } from '../types';
import { StatCard } from '../components/common/StatCard';
import { ShipmentStatusBadge } from '../components/common/ShipmentStatusBadge';
import { exportToCsv } from '../utils/pdf';
import { 
    WalletIcon, 
    ChartBarIcon, 
    PackageIcon, 
    DocumentDownloadIcon,
    CheckCircleIcon,
    ClockIcon,
    CurrencyDollarIcon
} from '../components/Icons';

const ClientRevenue: React.FC = () => {
    const { currentUser, shipments } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | ShipmentStatus>('all');

    // Only show this view to clients
    if (!currentUser || !currentUser.roles?.includes(UserRole.CLIENT)) {
        return <div className="text-center py-16 text-muted-foreground">Access denied.</div>;
    }

    const clientShipments = shipments.filter(s => s.clientId === currentUser.id);
    
    // Filter shipments based on search and status
    const filteredShipments = useMemo(() => {
        return clientShipments.filter(s => {
            const matchesSearch = s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                s.recipientName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
            return matchesSearch && matchesStatus;
        });
    }, [clientShipments, searchTerm, selectedStatus]);

    // Calculate financial metrics
    const deliveredShipments = clientShipments.filter(s => s.status === ShipmentStatus.DELIVERED);
    const pendingShipments = clientShipments.filter(s => ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status));
    
    // Client revenue calculations
    const totalCollectedValue = deliveredShipments.reduce((sum, s) => {
        return sum + (Number(s.packageValue) || 0);
    }, 0);
    
    const totalShippingFees = deliveredShipments.reduce((sum, s) => {
        return sum + (Number(s.clientFlatRateFee) || 0);
    }, 0);
    
    const netRevenue = totalCollectedValue - totalShippingFees;
    
    const pendingValue = pendingShipments.reduce((sum, s) => {
        const packageValue = Number(s.packageValue) || 0;
        const shippingFee = Number(s.clientFlatRateFee) || 0;
        return sum + Math.max(0, packageValue - shippingFee);
    }, 0);

    // Export function
    const handleExport = () => {
        const headers = ['Shipment ID', 'Recipient', 'Date', 'Status', 'Package Value (EGP)', 'Shipping Fee (EGP)', 'Net Revenue (EGP)'];
        const data = filteredShipments.map(s => {
            const packageValue = Number(s.packageValue) || 0;
            const shippingFee = Number(s.clientFlatRateFee) || 0;
            const revenue = s.status === ShipmentStatus.DELIVERED ? Math.max(0, packageValue - shippingFee) : 0;
            
            return [
                s.id,
                s.recipientName,
                new Date(s.creationDate).toLocaleDateString(),
                s.status,
                packageValue.toFixed(2),
                shippingFee.toFixed(2),
                revenue.toFixed(2)
            ];
        });
        exportToCsv(headers, data, 'Client_Revenue_Report');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-foreground">My Revenue</h1>
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
                >
                    <DocumentDownloadIcon />
                    Export Report
                </button>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Collected" 
                    value={`${(Number(totalCollectedValue) || 0).toFixed(2)} EGP`} 
                    icon={<CurrencyDollarIcon />} 
                    color="#10b981" 
                />
                <StatCard 
                    title="Shipping Fees Paid" 
                    value={`${(Number(totalShippingFees) || 0).toFixed(2)} EGP`} 
                    icon={<PackageIcon />} 
                    color="#f59e0b" 
                />
                <StatCard 
                    title="Net Revenue" 
                    value={`${(Number(netRevenue) || 0).toFixed(2)} EGP`} 
                    icon={<ChartBarIcon />} 
                    color="#3b82f6" 
                />
                <StatCard 
                    title="Pending Revenue" 
                    value={`${(Number(pendingValue) || 0).toFixed(2)} EGP`} 
                    icon={<ClockIcon />} 
                    color="#8b5cf6" 
                />
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search by Shipment ID or Recipient..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background text-foreground"
                        />
                    </div>
                    <div className="flex-1">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as 'all' | ShipmentStatus)}
                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background text-foreground"
                        >
                            <option value="all">All Statuses</option>
                            {Object.values(ShipmentStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Shipments Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-left">Shipment</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-left">Date</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-left">Status</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Package Value</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Shipping Fee</th>
                                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Net Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredShipments.map(s => {
                                const packageValue = Number(s.packageValue) || 0;
                                const shippingFee = Number(s.clientFlatRateFee) || 0;
                                const revenue = s.status === ShipmentStatus.DELIVERED ? Math.max(0, packageValue - shippingFee) : 0;
                                
                                return (
                                    <tr key={s.id} className="hover:bg-accent">
                                        <td className="px-4 py-3">
                                            <p className="font-mono text-sm font-semibold text-foreground">{s.id}</p>
                                            <p className="text-xs text-muted-foreground">{s.recipientName}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {new Date(s.creationDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ShipmentStatusBadge status={s.status} />
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-foreground">
                                            {packageValue.toFixed(2)} EGP
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-red-600 dark:text-red-400">
                                            {shippingFee.toFixed(2)} EGP
                                        </td>
                                        <td className={`px-4 py-3 text-right font-mono font-semibold ${
                                            s.status === ShipmentStatus.DELIVERED 
                                                ? 'text-green-600 dark:text-green-400' 
                                                : 'text-muted-foreground'
                                        }`}>
                                            {s.status === ShipmentStatus.DELIVERED ? `${revenue.toFixed(2)} EGP` : 'Pending'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                {filteredShipments.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        No shipments found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientRevenue;
