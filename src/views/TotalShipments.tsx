// src/views/TotalShipments.tsx

import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus, Permission } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PackageIcon, CheckCircleIcon, ClockIcon, XCircleIcon, TruckIcon, DocumentDownloadIcon } from '../components/Icons';
import { ShipmentList } from '../components/specific/ShipmentList';
import { exportToCsv } from '../utils/pdf';

interface TotalShipmentsProps {
    onSelectShipment?: (shipment: Shipment) => void;
}

export const TotalShipments: React.FC<TotalShipmentsProps> = ({ onSelectShipment }) => {
    const { shipments, hasPermission, getCourierName, updateShipmentFees } = useAppContext();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'Overdue' | ShipmentStatus>('all');
    const [selectedDate, setSelectedDate] = useState('');

    const canSeeAdminFinancials = hasPermission(Permission.VIEW_ADMIN_FINANCIALS);

    const isShipmentOverdue = (shipment: Shipment) => {
        if ([ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(shipment.status)) {
            return false;
        }
        // A shipment is overdue if it's been more than 2.5 days since creation and not yet delivered.
        const twoAndHalfDaysAgo = new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000);
        return new Date(shipment.creationDate) < twoAndHalfDaysAgo;
    };

    const stats = useMemo(() => {
        const total = shipments.length;
        const delivered = shipments.filter(s => s.status === ShipmentStatus.DELIVERED).length;
        const failed = shipments.filter(s => s.status === ShipmentStatus.DELIVERY_FAILED).length;
        const outForDelivery = shipments.filter(s => s.status === ShipmentStatus.OUT_FOR_DELIVERY).length;
        const overdue = shipments.filter(isShipmentOverdue).length;
        return { total, delivered, failed, outForDelivery, overdue };
    }, [shipments]);

    const filteredShipments = useMemo(() => {
        let filtered = [...shipments];

        if (selectedDate) {
            filtered = filtered.filter(s => s.creationDate.startsWith(selectedDate));
        }

        if (searchTerm.trim()) {
            const lowerCaseSearch = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(s =>
                s.id.toLowerCase().includes(lowerCaseSearch) ||
                s.recipientName.toLowerCase().includes(lowerCaseSearch) ||
                s.clientName.toLowerCase().includes(lowerCaseSearch)
            );
        }

        if (selectedStatus !== 'all') {
            if (selectedStatus === 'Overdue') {
                filtered = filtered.filter(isShipmentOverdue);
            } else {
                filtered = filtered.filter(s => s.status === selectedStatus);
            }
        }

        return filtered.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
    }, [shipments, selectedDate, searchTerm, selectedStatus]);

    const handleExport = () => {
        const headers = ['ID', 'Client', 'Recipient', 'Date', 'Status', 'Courier', 'Total COD (EGP)', 'Package Value (EGP)'];
        if (canSeeAdminFinancials) {
            headers.push('Client Fee (EGP)', 'Courier Commission (EGP)', 'Net Profit (EGP)');
        }
        
        const body = filteredShipments.map(s => {
            // Safely convert to numbers with fallbacks
            const price = Number(s.price) || 0;
            const packageValue = Number(s.packageValue) || 0;
            
            const row: (string | number)[] = [
                s.id, s.clientName, s.recipientName,
                new Date(s.creationDate).toLocaleDateString(), s.status,
                getCourierName(s.courierId), (Number(price) || 0).toFixed(2), (Number(packageValue) || 0).toFixed(2)
            ];

            if (canSeeAdminFinancials) {
                const clientFee = Number(s.clientFlatRateFee) || 0;
                const courierCommission = Number(s.courierCommission) || 0;
                let netProfit = 0;
                if (s.courierId && s.clientFlatRateFee && s.courierCommission) {
                    netProfit = clientFee - courierCommission;
                }
                row.push((Number(clientFee) || 0).toFixed(2), (Number(courierCommission) || 0).toFixed(2), (Number(netProfit) || 0).toFixed(2));
            }
            return row;
        });
        exportToCsv(headers, body, 'Total_Shipments_Report');
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Shipments Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Total Shipments" value={stats.total} icon={<PackageIcon />} color="#3b82f6" />
                <StatCard title="Delivered" value={stats.delivered} icon={<CheckCircleIcon />} color="#16a34a" />
                <StatCard title="Out for Delivery" value={stats.outForDelivery} icon={<TruckIcon />} color="#06b6d4" />
                <StatCard title="Failed" value={stats.failed} icon={<XCircleIcon />} color="#ef4444" />
                <StatCard title="Overdue" value={stats.overdue} icon={<ClockIcon />} color="#f97316" />
            </div>

            <div className="card">
                <div className="p-4 border-b border-border flex flex-col lg:flex-row gap-4 items-center flex-wrap">
                    <input
                        type="text"
                        placeholder="Search ID, Recipient, Client..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-grow w-full lg:w-auto px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                    />
                    <select
                        value={selectedStatus}
                        onChange={e => setSelectedStatus(e.target.value as any)}
                        className="w-full lg:w-auto px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Overdue">Overdue</option>
                        {Object.values(ShipmentStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full lg:w-auto px-4 py-2 border border-border rounded-lg"
                        aria-label="Filter by creation date"
                    />
                     <button 
                        onClick={handleExport}
                        className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        Export CSV
                    </button>
                </div>
                <ShipmentList
                    shipments={filteredShipments}
                    onSelect={onSelectShipment}
                    showPackageValue={true}
                    priceColumnTitle="Total COD"
                    showClientFee={canSeeAdminFinancials}
                    showCourierCommission={canSeeAdminFinancials}
                    showNetProfit={canSeeAdminFinancials}
                    showEditableFees={canSeeAdminFinancials}
                    updateShipmentFees={canSeeAdminFinancials ? updateShipmentFees : undefined}
                />
            </div>
        </div>
    );
};
