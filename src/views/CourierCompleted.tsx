import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus, UserRole } from '../types';
import { exportToCsv } from '../utils/pdf';
import { DocumentDownloadIcon } from '../components/Icons';
import { ShipmentList } from '../components/specific/ShipmentList';

interface CourierCompletedProps {
    onSelectShipment: (shipment: Shipment) => void;
}

const CourierCompleted: React.FC<CourierCompletedProps> = ({ onSelectShipment }) => {
    const { currentUser, shipments, users } = useAppContext();
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<'all' | number>('all');
    const [selectedDate, setSelectedDate] = useState<string>('');
    
    const clients = useMemo(() => users.filter(u => u.roles.includes(UserRole.CLIENT)), [users]);

    const completedShipments = useMemo(() => {
        if (!currentUser) return [];
        let baseShipments = shipments.filter(s => s.courierId === currentUser.id && s.status === ShipmentStatus.DELIVERED);

        // Apply filters
        if (selectedDate) {
            const filterDate = new Date(selectedDate);
            baseShipments = baseShipments.filter(s => {
                if (!s.deliveryDate) return false;
                const deliveryDate = new Date(s.deliveryDate);
                return deliveryDate.toDateString() === filterDate.toDateString();
            });
        }
        if (selectedClientId !== 'all') {
            baseShipments = baseShipments.filter(s => s.clientId === selectedClientId);
        }
        if (searchTerm.trim() !== '') {
            const lowerCaseSearch = searchTerm.trim().toLowerCase();
            baseShipments = baseShipments.filter(s => 
                s.id.toLowerCase().includes(lowerCaseSearch) ||
                s.recipientName.toLowerCase().includes(lowerCaseSearch)
            );
        }
        
        return baseShipments.sort((a, b) => new Date(b.deliveryDate || 0).getTime() - new Date(a.deliveryDate || 0).getTime());
    }, [currentUser, shipments, selectedDate, searchTerm, selectedClientId]);

    const handleExport = () => {
        const headers = ['ID', 'Client', 'Recipient', 'Delivery Date', 'Status', 'Price (EGP)', 'Commission (EGP)'];
        const body = completedShipments.map(s => [
            s.id, s.clientName, s.recipientName, s.deliveryDate ? new Date(s.deliveryDate).toLocaleDateString() : 'N/A', s.status, (Number(s.price) || 0).toFixed(2), (Number(s.courierCommission) || 0).toFixed(2)
        ]);
        exportToCsv(headers, body, `My_Completed_Shipments`);
    };

    if (!currentUser) return null;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">My Completed Orders</h2>
            
            <div className="mb-6 card p-4 flex flex-col lg:flex-row gap-4 items-center flex-wrap">
                <div className="flex-grow w-full lg:w-auto">
                    <input 
                        type="text"
                        placeholder="Search by ID or Recipient..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                    />
                </div>
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
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                        aria-label="Filter by delivery date"
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
                <div className="lg:ml-auto w-full lg:w-auto">
                     <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                       <DocumentDownloadIcon className="w-5 h-5"/>
                       Export as CSV
                   </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <ShipmentList 
                    shipments={completedShipments} 
                    onSelect={onSelectShipment} 
                />
            </div>
        </div>
    );
};

export default CourierCompleted;