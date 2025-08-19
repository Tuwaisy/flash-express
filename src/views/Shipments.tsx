// src/views/Shipments.tsx


import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole, Shipment, ShipmentStatus, Permission } from '../types';
import { exportToCsv } from '../utils/pdf';
import { DocumentDownloadIcon } from '../components/Icons';
import { ShipmentList } from '../components/specific/ShipmentList';

interface ShipmentsViewProps {
    onSelectShipment: (shipment: Shipment) => void;
}

const isShipmentOverdue = (shipment: Shipment) => {
    if ([ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(shipment.status)) {
        return false;
    }
    const twoAndHalfDaysAgo = new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000);
    return new Date(shipment.creationDate) < twoAndHalfDaysAgo;
};


const ShipmentsView: React.FC<ShipmentsViewProps> = ({ onSelectShipment }) => {
    const { currentUser, shipments, users, updateShipmentFees, getCourierName, hasPermission } = useAppContext();
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<'all' | number>('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | ShipmentStatus>('all');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [showOverdueOnly, setShowOverdueOnly] = useState(false);
    
    const clients = users.filter(u => (u.roles || []).includes(UserRole.CLIENT));

    const canViewAll = hasPermission(Permission.VIEW_ALL_SHIPMENTS);
    const canViewOwn = hasPermission(Permission.VIEW_OWN_SHIPMENTS);
    const canSeeAdminFinancials = hasPermission(Permission.VIEW_ADMIN_FINANCIALS);
    const isAssigner = currentUser?.roles.includes(UserRole.ASSIGNING_USER);
    const isSuperUser = currentUser?.roles.includes(UserRole.SUPER_USER);

    if (!currentUser || (!canViewAll && !canViewOwn)) {
        return <div className="p-8 text-center">Access Denied.</div>;
    }

    const visibleShipments = useMemo(() => {
        let filtered = canViewAll ? shipments : shipments.filter(s => s.clientId === currentUser.id);

        // Apply filters
        if (selectedDate) {
            filtered = filtered.filter(s => s.creationDate.startsWith(selectedDate));
        }

        if (searchTerm.trim()) {
            const lowerCaseSearch = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(s => 
                s.id.toLowerCase().includes(lowerCaseSearch) ||
                s.recipientName.toLowerCase().includes(lowerCaseSearch)
            );
        }

        if (selectedStatus !== 'all') {
            filtered = filtered.filter(s => s.status === selectedStatus);
        }
        
        if (showOverdueOnly) {
            filtered = filtered.filter(isShipmentOverdue);
        }

        // Admin-only filter
        if (canViewAll && selectedClientId !== 'all') {
            filtered = filtered.filter(s => s.clientId === selectedClientId);
        }
        
        return filtered.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
    }, [currentUser, shipments, selectedDate, searchTerm, selectedClientId, selectedStatus, canViewAll, showOverdueOnly]);

    const handleExport = () => {
        if (!currentUser) return;
        
        const shipmentsToExport = visibleShipments;
        
        if (canViewAll) {
            const headers = ['ID', 'Client', 'Recipient', 'Recipient Phone', 'Date', 'Status', 'Courier', 'Total COD (EGP)', 'Package Value (EGP)'];
            if (!isSuperUser) {
                headers.push('Client Fee (EGP)');
            }
            if (canSeeAdminFinancials) {
                 headers.push('Courier Commission (EGP)', 'Net Profit (EGP)');
            }
            const body = shipmentsToExport.map(s => {
                const courierName = getCourierName(s.courierId);
                
                // Safely convert to numbers with fallbacks
                const clientFee = Number(s.clientFlatRateFee) || 0;
                const courierCommission = Number(s.courierCommission) || 0;
                const price = Number(s.price) || 0;
                const packageValue = Number(s.packageValue) || 0;
                
                const row: (string | number)[] = [
                    s.id, s.clientName, s.recipientName, s.recipientPhone,
                    new Date(s.creationDate).toLocaleDateString(), s.status,
                    courierName, (Number(price) || 0).toFixed(2), (Number(packageValue) || 0).toFixed(2)
                ];
                
                if (!isSuperUser) {
                    row.push((Number(clientFee) || 0).toFixed(2));
                }

                if (canSeeAdminFinancials) {
                    let netProfit = 0;
                    if (s.courierId && s.clientFlatRateFee && s.courierCommission) {
                        netProfit = clientFee - courierCommission;
                    }
                    row.push((Number(courierCommission) || 0).toFixed(2), (Number(netProfit) || 0).toFixed(2));
                }
                return row;
            });
            exportToCsv(headers, body, 'All_Shipments_Report');
        } else if (canViewOwn) {
            const headers = ['ID', 'Recipient', 'Date', 'Status', 'Price (EGP)'];
            const body = shipmentsToExport.map(s => [
                s.id, s.recipientName, new Date(s.creationDate).toLocaleDateString(), s.status, (Number(s.price) || 0).toFixed(2)
            ]);
            exportToCsv(headers, body, `Client_Shipments_${currentUser.name.replace(/\s/g, '_')}`);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold text-foreground">
                   {canViewAll ? 'All Shipments' : 'My Shipments'}
               </h2>
            </div>
            
            <div className="mb-6 card flex flex-col lg:flex-row gap-4 items-center flex-wrap">
                <div className="flex-grow w-full lg:w-auto">
                    <input 
                        type="text"
                        placeholder={canViewAll ? "Search by Shipment ID or Recipient..." : "Search by ID or Recipient..."}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                    />
                </div>
                {canViewAll && (
                    <div className="flex-grow w-full lg:w-auto">
                        <select
                            value={selectedClientId}
                            onChange={e => setSelectedClientId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                        >
                            <option value="all">All Clients</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                 <div className="flex-grow w-full lg:w-auto">
                    <select
                        value={selectedStatus}
                        onChange={e => setSelectedStatus(e.target.value as 'all' | ShipmentStatus)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                    >
                        <option value="all">All Statuses</option>
                        {Object.values(ShipmentStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                        aria-label="Filter by creation date"
                    />
                    {selectedDate && (
                        <button
                            onClick={() => setSelectedDate('')}
                            className="px-4 py-2 text-sm font-semibold text-muted-foreground rounded-lg hover:bg-accent transition"
                            aria-label="Clear date filter"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="overdue-filter"
                        checked={showOverdueOnly}
                        onChange={e => setShowOverdueOnly(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="overdue-filter" className="ml-2 text-sm font-medium text-foreground">
                        Show Overdue Only
                    </label>
                </div>
                
                <div className="lg:ml-auto w-full lg:w-auto">
                     <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                       <DocumentDownloadIcon className="w-5 h-5"/>
                       Export as CSV
                   </button>
                </div>
            </div>
            <div className="card overflow-hidden">
                <ShipmentList 
                    shipments={visibleShipments} 
                    onSelect={onSelectShipment}
                    showPackageValue={isAssigner}
                    priceColumnTitle={isAssigner ? 'Total COD' : 'Price'}
                    showClientFee={!isSuperUser}
                    showCourierCommission={canSeeAdminFinancials}
                    showNetProfit={canSeeAdminFinancials}
                    showEditableFees={canSeeAdminFinancials}
                    updateShipmentFees={canSeeAdminFinancials ? updateShipmentFees : undefined}
                />
            </div>
        </>
    );
};

export default ShipmentsView;