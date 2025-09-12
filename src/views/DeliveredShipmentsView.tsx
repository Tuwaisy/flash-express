// src/views/DeliveredShipmentsView.tsx

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus, Permission } from '../types';
import { ShipmentList } from '../components/specific/ShipmentList';
import { exportToCsv } from '../utils/pdf';
import { DocumentDownloadIcon } from '../components/Icons';

interface DeliveredShipmentsViewProps {
    onSelectShipment: (shipment: Shipment) => void;
}

const DeliveredShipmentsView: React.FC<DeliveredShipmentsViewProps> = ({ onSelectShipment }) => {
    const { shipments, hasPermission } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>('');

    if (!hasPermission(Permission.VIEW_DELIVERED_SHIPMENTS)) {
        return <div className="p-8 text-center">Access Denied.</div>;
    }

    const deliveredShipments = useMemo(() => {
        let filtered = shipments.filter(s => s.status === ShipmentStatus.DELIVERED);

        if (selectedDate) {
            filtered = filtered.filter(s => s.deliveryDate && s.deliveryDate.startsWith(selectedDate));
        }
        if (searchTerm.trim()) {
            const lowerCaseSearch = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(s => 
                s.id.toLowerCase().includes(lowerCaseSearch) ||
                s.recipientName.toLowerCase().includes(lowerCaseSearch)
            );
        }
        
        return filtered.sort((a, b) => new Date(b.deliveryDate!).getTime() - new Date(a.deliveryDate!).getTime());
    }, [shipments, selectedDate, searchTerm]);
    
    const handleExport = () => {
        const headers = ['ID', 'Client', 'Recipient', 'Delivery Date', 'Courier'];
        const body = deliveredShipments.map(s => [
            s.id, s.clientName, s.recipientName, 
            s.deliveryDate ? new Date(s.deliveryDate).toLocaleDateString() : 'N/A',
            s.courierId ? `Courier ${s.courierId}` : 'N/A'
        ]);
        exportToCsv(headers, body, 'Delivered_Shipments_Report');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">Delivered Shipments</h2>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                    <DocumentDownloadIcon className="w-5 h-5"/>
                    Export CSV
                </button>
            </div>
            
            <div className="mb-6 card p-4 flex flex-col lg:flex-row gap-4 items-center">
                <input 
                    type="text"
                    placeholder="Search by Shipment ID or Recipient..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full lg:w-1/3 px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                />
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full lg:w-auto px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                    aria-label="Filter by delivery date"
                />
            </div>
            
            <div className="card overflow-hidden">
                <ShipmentList 
                    shipments={deliveredShipments} 
                    onSelect={onSelectShipment}
                    showClientFee={false}
                    showCourierCommission={false}
                    showNetProfit={false}
                />
            </div>
        </div>
    );
};

export default DeliveredShipmentsView;