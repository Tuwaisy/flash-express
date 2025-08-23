// src/views/ClientAnalytics.tsx


import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole, User, Shipment, ShipmentStatus, TransactionType, PartnerTier } from '../types';
import { ArrowUpCircleIcon, DocumentDownloadIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { Modal } from '../components/common/Modal';
import { ShipmentList } from '../components/specific/ShipmentList';

interface ClientAnalyticsProps {
    onSelectShipment: (shipment: Shipment) => void;
    setActiveView: (view: string) => void;
}

const ClientAnalytics: React.FC<ClientAnalyticsProps> = ({ onSelectShipment, setActiveView }) => {
    const { users, shipments, clientTransactions, processClientPayout, declineClientPayout, addToast } = useAppContext();
    const { t } = useLanguage();
    const [mainTab, setMainTab] = useState<'summary' | 'payouts'>('summary');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'shipmentCount', direction: 'desc' });
    const [selectedClient, setSelectedClient] = useState<User | null>(null);

    // State for filtering
    const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
    const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
    const [payoutsFilter, setPayoutsFilter] = useState('');

    // State for filtering shipments within the modal
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | ShipmentStatus>('all');

    const clientData = useMemo(() => {
        const clients = users.filter(u => (u.roles || []).includes(UserRole.CLIENT));
        let data = clients.map(client => {
            const clientShipments = shipments.filter(s => s.clientId === client.id);
            const payoutRequests = clientTransactions.filter(t => t.userId === client.id && t.type === TransactionType.WITHDRAWAL_REQUEST && t.status === 'Pending');
            return {
                id: client.id,
                publicId: client.publicId,
                name: client.name,
                partnerTier: client.partnerTier,
                manualTierAssignment: client.manualTierAssignment,
                walletBalance: client.walletBalance || 0,
                shipmentCount: clientShipments.length,
                flatRateFee: client.flatRateFee || 0,
                payoutRequestCount: payoutRequests.length,
            };
        });

        if (selectedClientFilter !== 'all') {
            data = data.filter(client => client.id === parseInt(selectedClientFilter));
        }
        if (selectedTierFilter !== 'all') {
            data = data.filter(client => client.partnerTier === selectedTierFilter);
        }

        return data.sort((a, b) => {
            const aValue = a[sortConfig.key as keyof typeof a];
            const bValue = b[sortConfig.key as keyof typeof b];

            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            if (sortConfig.key === 'partnerTier') {
                const tierOrder = { [PartnerTier.GOLD]: 3, [PartnerTier.SILVER]: 2, [PartnerTier.BRONZE]: 1 };
                const aTierValue = tierOrder[a.partnerTier as keyof typeof tierOrder] || 0;
                const bTierValue = tierOrder[b.partnerTier as keyof typeof tierOrder] || 0;
                if (aTierValue < bTierValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aTierValue > bTierValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [users, shipments, clientTransactions, sortConfig, selectedClientFilter, selectedTierFilter]);

    const payoutRequests = useMemo(() => {
        return clientTransactions
            .filter(t => t.type === TransactionType.WITHDRAWAL_REQUEST && t.status === 'Pending')
            .map(transaction => {
                const client = users.find(u => u.id === transaction.userId);
                return { ...transaction, clientName: client?.name || 'Unknown Client', clientEmail: client?.email || 'N/A' };
            })
            .filter(payout => {
                if (!payoutsFilter.trim()) return true;
                return payout.clientName.toLowerCase().includes(payoutsFilter.toLowerCase().trim());
            })
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [clientTransactions, users, payoutsFilter]);
    
    const modalShipments = useMemo(() => {
        if (!selectedClient) return [];
        let filtered = shipments.filter(s => s.clientId === selectedClient.id);

        if (selectedDate) {
            filtered = filtered.filter(s => s.creationDate.startsWith(selectedDate));
        }
        if (searchTerm.trim()) {
            const lowerCaseSearch = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(s => s.id.toLowerCase().includes(lowerCaseSearch) || s.recipientName.toLowerCase().includes(lowerCaseSearch));
        }
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(s => s.status === selectedStatus);
        }
        return filtered.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
    }, [shipments, selectedClient, selectedDate, searchTerm, selectedStatus]);
    
    const requestSort = (key: string) => {
        const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ key, direction });
    };

    const handleViewShipments = (clientId: number) => {
        const client = users.find(u => u.id === clientId);
        if (client) {
            setSelectedClient(client);
        }
    };

    const handleProcessPayout = (id: string) => {
        processClientPayout(id);
        addToast("Payout processed successfully", "success");
    }

    const handleDeclinePayout = (id: string) => {
        if (confirm('Are you sure you want to decline this payout request?')) {
            declineClientPayout(id);
            addToast("Payout declined successfully", "success");
        }
    }

    const handleExportSummary = () => {
        const headers = ['Client Name', 'Client ID', 'Total Shipments', 'Wallet Balance (EGP)', 'Flat Rate (EGP)', 'Partner Tier', 'Pending Payouts'];
        const data = clientData.map(c => [
            c.name,
            c.publicId,
            c.shipmentCount,
            (Number(c.walletBalance) || 0).toFixed(2),
            (Number(c.flatRateFee) || 0).toFixed(2),
            c.partnerTier || 'N/A',
            c.payoutRequestCount,
        ]);
        exportToCsv(headers, data, 'Client_Analytics_Summary');
    };

    const handleExportPayouts = () => {
        const headers = ['Date', 'Client Name', 'Client Email', 'Amount (EGP)', 'Description'];
        const data = payoutRequests.map(p => [
            new Date(p.date).toLocaleString(),
            p.clientName,
            p.clientEmail,
            Math.abs(Number(p.amount) || 0).toFixed(2),
            p.description,
        ]);
        exportToCsv(headers, data, 'Pending_Client_Payouts');
    };
    
    const getTierBadgeColor = (tier?: PartnerTier) => {
        switch (tier) {
            case PartnerTier.GOLD: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case PartnerTier.SILVER: return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300';
            case PartnerTier.BRONZE: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            default: return 'bg-secondary text-secondary-foreground';
        }
    };

    const SortableHeader: React.FC<{ title: string, sortKey: string }> = ({ title, sortKey }) => (
         <th className="p-4 text-xs font-medium text-muted-foreground uppercase cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center gap-1">
                {title}
                {sortConfig.key === sortKey && <ArrowUpCircleIcon className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />}
            </div>
        </th>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{t('clientAnalytics.title')}</h1>
                    <p className="text-muted-foreground mt-1">Overview of client shipment volumes and pending payouts.</p>
                </div>
                 <button 
                    onClick={mainTab === 'summary' ? handleExportSummary : handleExportPayouts}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                 >
                    <DocumentDownloadIcon className="w-5 h-5"/>
                    Export CSV
                </button>
            </div>
            
             <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setMainTab('summary')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${mainTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                        Client Summary
                    </button>
                    <button onClick={() => setMainTab('payouts')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${mainTab === 'payouts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                        Pending Payouts
                        {payoutRequests.length > 0 && <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">{payoutRequests.length}</span>}
                    </button>
                </nav>
            </div>
            
            {mainTab === 'summary' && (
                <div className="card overflow-hidden">
                    <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
                        <select
                            value={selectedClientFilter}
                            onChange={e => setSelectedClientFilter(e.target.value)}
                            className="w-full md:w-1/3 px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                        >
                            <option value="all">Filter by Client</option>
                            {users.filter(u => u.roles.includes(UserRole.CLIENT)).map(client => (
                                <option key={client.id} value={client.id}>{client.name} ({client.publicId})</option>
                            ))}
                        </select>
                        <select
                            value={selectedTierFilter}
                            onChange={e => setSelectedTierFilter(e.target.value)}
                            className="w-full md:w-1/3 px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                        >
                            <option value="all">Filter by Tier</option>
                            {Object.values(PartnerTier).map(tier => (
                                <option key={tier} value={tier}>{tier}</option>
                            ))}
                            <option value="">Not Assigned</option>
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary">
                                <tr>
                                    <SortableHeader title="Client" sortKey="name" />
                                    <SortableHeader title="ID" sortKey="publicId" />
                                    <SortableHeader title="Total Shipments" sortKey="shipmentCount" />
                                    <SortableHeader title="Wallet Balance" sortKey="walletBalance" />
                                    <SortableHeader title="Partner Tier" sortKey="partnerTier" />
                                    <SortableHeader title="Flat Rate" sortKey="flatRateFee" />
                                    <SortableHeader title="Pending Payouts" sortKey="payoutRequestCount" />
                                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-border">
                                {clientData.map(client => (
                                    <tr key={client.id}>
                                        <td className="p-4 font-semibold">
                                            <button onClick={() => setActiveView('users')} className="text-primary hover:underline">
                                                {client.name}
                                            </button>
                                        </td>
                                        <td className="p-4 font-mono text-xs text-muted-foreground">{client.publicId}</td>
                                        <td className="p-4 text-muted-foreground font-mono">{client.shipmentCount}</td>
                                        <td className="p-4 text-green-600 dark:text-green-400 font-semibold font-mono">{(Number(client.walletBalance) || 0).toFixed(2)} EGP</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTierBadgeColor(client.partnerTier)}`}>
                                                {client.partnerTier || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-primary font-semibold">{(Number(client.flatRateFee) || 0).toFixed(2)} EGP</td>
                                        <td className="p-4 text-blue-600 font-semibold">{client.payoutRequestCount}</td>
                                        <td className="p-4">
                                            <button onClick={() => handleViewShipments(client.id)} className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-sm">View Shipments</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {mainTab === 'payouts' && (
                <div className="card overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <input
                            type="text"
                            placeholder="Filter by client name..."
                            value={payoutsFilter}
                            onChange={e => setPayoutsFilter(e.target.value)}
                            className="w-full md:w-1/3 px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                        />
                    </div>
                    <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead className="bg-secondary">
                                <tr>
                                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Date</th>
                                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Client</th>
                                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-border">
                                {payoutRequests.map(payout => (
                                    <tr key={payout.id}>
                                        <td className="p-4 text-sm text-muted-foreground">{new Date(payout.date).toLocaleString()}</td>
                                        <td className="p-4">
                                            <p className="font-semibold">{payout.clientName}</p>
                                            <p className="text-xs text-muted-foreground">{payout.clientEmail}</p>
                                        </td>
                                        <td className="p-4 font-bold text-red-600">-{Math.abs(Number(payout.amount) || 0).toFixed(2)} EGP</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleProcessPayout(payout.id)} className="px-3 py-1.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 text-sm">Process</button>
                                                <button onClick={() => handleDeclinePayout(payout.id)} className="px-3 py-1.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 text-sm">Decline</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {payoutRequests.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">No pending payouts.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <Modal isOpen={!!selectedClient} onClose={() => setSelectedClient(null)} title={`Shipments for ${selectedClient?.name}`} size="4xl">
                <div className="space-y-4">
                     <div className="mb-4 bg-secondary p-3 rounded-lg flex flex-col sm:flex-row gap-4 items-center flex-wrap">
                        <input type="text" placeholder="Search ID or Recipient..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-grow w-full sm:w-auto px-3 py-2 border border-border rounded-lg bg-background" />
                        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)} className="w-full sm:w-auto px-3 py-2 border border-border rounded-lg bg-background">
                            <option value="all">All Statuses</option>
                            {Object.values(ShipmentStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-auto px-3 py-2 border border-border rounded-lg bg-background" />
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <ShipmentList shipments={modalShipments} onSelect={(shipment) => { onSelectShipment(shipment); setSelectedClient(null); }} />
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default ClientAnalytics;