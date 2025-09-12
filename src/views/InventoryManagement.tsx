

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { InventoryItem, Permission } from '../types';
import { Modal } from '../components/common/Modal';
import { PlusCircleIcon, PencilIcon, TrashIcon, DocumentDownloadIcon, WalletIcon, ArchiveBoxIcon, XCircleIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';
import { StatCard } from '../components/common/StatCard';

const InventoryManagement = () => {
    const { inventoryItems, updateInventoryItem, addInventoryItem, deleteInventoryItem, hasPermission } = useAppContext();
    
    // Modal and form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
    const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
    const [formData, setFormData] = useState<{ name: string; quantity: number; unit: string; minStock: number; unitPrice: number; }>({
        name: '', quantity: 0, unit: 'units', minStock: 10, unitPrice: 0,
    });
    
    // Filtering and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    // Permissions
    const canManageInventory = hasPermission(Permission.MANAGE_INVENTORY);
    const canDeleteInventory = hasPermission(Permission.DELETE_INVENTORY_ITEM);
    const canSeeFinancials = hasPermission(Permission.VIEW_ADMIN_FINANCIALS);

    // Memoized calculations for KPIs and filtering
    const { totalInventoryValue, totalItems, lowStockCount } = useMemo(() => {
        const value = canSeeFinancials ? inventoryItems.reduce((acc, item) => acc + (Number(item.quantity) * (Number(item.unitPrice) || 0)), 0) : 0;
        const lowStock = inventoryItems.filter(item => item.minStock && item.quantity <= item.minStock).length;
        return {
            totalInventoryValue: value,
            totalItems: inventoryItems.length,
            lowStockCount: lowStock,
        };
    }, [inventoryItems, canSeeFinancials]);

    const filteredItems = useMemo(() => {
        return inventoryItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            if (showLowStockOnly) {
                return matchesSearch && item.minStock && item.quantity <= item.minStock;
            }
            return matchesSearch;
        });
    }, [inventoryItems, searchTerm, showLowStockOnly]);
    
    // Permission check
    if (!canManageInventory) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground">You do not have permission to manage inventory.</p>
            </div>
        );
    }
    
    // Modal handlers
    const openModal = (mode: 'add' | 'edit', item?: InventoryItem) => {
        setModalMode(mode);
        setCurrentItem(item || null);
        if (item) {
            setFormData({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                minStock: item.minStock || 10,
                unitPrice: item.unitPrice || 0,
            });
        } else {
            setFormData({ name: '', quantity: 0, unit: 'units', minStock: 10, unitPrice: 0 });
        }
        setIsModalOpen(true);
    };
    const closeModal = () => { setIsModalOpen(false); setCurrentItem(null); };

    // Delete handlers
    const handleDeleteClick = (item: InventoryItem) => { setItemToDelete(item); };
    const confirmDelete = () => { if(itemToDelete) { deleteInventoryItem(itemToDelete.id); setItemToDelete(null); } };

    // Form handlers
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: ['quantity', 'minStock', 'unitPrice'].includes(name) ? parseFloat(value) || 0 : value }));
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Partial<InventoryItem> = {
            name: formData.name, quantity: formData.quantity, unit: formData.unit,
            minStock: formData.minStock, unitPrice: formData.unitPrice,
        };
        if (modalMode === 'add') {
            addInventoryItem(payload as Omit<InventoryItem, 'id' | 'lastUpdated'>);
        } else if (currentItem) {
            updateInventoryItem(currentItem.id, payload);
        }
        closeModal();
    };
    
    // Export handler
    const handleExport = () => {
        const headers = ['ID', 'Item Name', 'Quantity', 'Unit', 'Last Updated'];
        if (canSeeFinancials) {
            headers.push('Min Stock', 'Unit Price (EGP)', 'Total Value (EGP)');
        }
        const data = filteredItems.map(item => {
            const row: (string | number)[] = [item.id, item.name, item.quantity, item.unit, new Date(item.lastUpdated).toLocaleString()];
            if (canSeeFinancials) {
                row.push(item.minStock || 0, (Number(item.unitPrice) || 0).toFixed(2), ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2));
            }
            return row;
        });
        exportToCsv(headers, data, 'Inventory_Report');
    };

    // Stock Level Bar Component
    const StockLevelBar: React.FC<{ item: InventoryItem }> = ({ item }) => {
        if (!item.minStock) {
            return <div className="font-mono text-foreground">{item.quantity} <span className="text-muted-foreground">{item.unit}</span></div>;
        }

        const safeMinStock = item.minStock || 1;
        const percentage = Math.min((item.quantity / (safeMinStock * 2)) * 100, 100);
        let barColor = 'bg-green-500';
        if (item.quantity <= safeMinStock) {
            barColor = 'bg-red-500';
        } else if (item.quantity <= safeMinStock * 1.5) {
            barColor = 'bg-yellow-500';
        }

        return (
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <span className="font-mono text-foreground font-semibold">{item.quantity}</span>
                    <span className="text-xs text-muted-foreground">min: {item.minStock}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5">
                    <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Inventory Dashboard</h1>
                    <p className="text-muted-foreground mt-1">At-a-glance overview of your stock levels and value.</p>
                </div>
                <button
                    onClick={() => openModal('add')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition shadow-sm"
                >
                    <PlusCircleIcon />
                    Add New Item
                </button>
            </div>
            
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {canSeeFinancials && <StatCard title="Total Inventory Value" value={`${(Number(totalInventoryValue) || 0).toFixed(2)} EGP`} icon={<WalletIcon />} color="#3b82f6" />}
                <StatCard title="Items in Stock" value={totalItems} icon={<ArchiveBoxIcon />} color="#10b981" />
                <div 
                    onClick={() => setShowLowStockOnly(prev => !prev)} 
                    className={`rounded-xl transition-all duration-300 ${showLowStockOnly ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                >
                    <StatCard title="Low Stock Items" value={lowStockCount} icon={<XCircleIcon />} color="#ef4444" onClick={() => {}} subtitle="Click to filter" />
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search inventory items..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                    />
                     <button
                        onClick={handleExport}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-semibold rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition"
                    >
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        <span>Export CSV</span>
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Item Name</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase w-48">Stock Level</th>
                                {canSeeFinancials && <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Unit Price</th>}
                                {canSeeFinancials && <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Total Value</th>}
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Last Updated</th>
                                <th className="p-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredItems.map(item => (
                                <tr key={item.id}>
                                    <td className="p-4 font-semibold text-foreground">{item.name}</td>
                                    <td className="p-4"><StockLevelBar item={item} /></td>
                                    {canSeeFinancials && <td className="p-4 font-mono text-green-600 dark:text-green-400">{(Number(item.unitPrice) || 0).toFixed(2)}</td>}
                                    {canSeeFinancials && <td className="p-4 font-mono font-semibold text-foreground">{(Number(item.quantity) * (Number(item.unitPrice) || 0)).toFixed(2)}</td>}
                                    <td className="p-4 text-sm text-muted-foreground">{new Date(item.lastUpdated).toLocaleString()}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openModal('edit', item)} className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-md"><PencilIcon /></button>
                                            {canDeleteInventory && (<button onClick={() => handleDeleteClick(item)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-accent rounded-md"><TrashIcon /></button>)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {filteredItems.length === 0 && (<div className="text-center py-12 text-muted-foreground">No inventory items match your search.</div>)}
            </div>

            {/* Modals for Add/Edit and Delete */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === 'add' ? 'Add New Inventory Item' : 'Edit Inventory Item'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Item Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Quantity</label>
                            <input type="number" name="quantity" value={formData.quantity} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Unit</label>
                            <input type="text" name="unit" placeholder="e.g., sheets, boxes" value={formData.unit} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" required />
                        </div>
                    </div>
                    <div className="p-4 border-t border-border mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Minimum Stock</label>
                                <input type="number" name="minStock" value={formData.minStock} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" required />
                            </div>
                            {canSeeFinancials && (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Unit Price (EGP)</label>
                                    <input type="number" step="0.01" name="unitPrice" value={formData.unitPrice} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" required />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold">Save Item</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Confirm Deletion">
                {itemToDelete && (
                    <div>
                        <p>Are you sure you want to delete <strong>{itemToDelete.name}</strong>?</p>
                        <p className="text-sm text-red-600 mt-2">This cannot be undone.</p>
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setItemToDelete(null)} className="px-4 py-2 bg-secondary rounded-lg font-semibold">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold">Delete Item</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default InventoryManagement;