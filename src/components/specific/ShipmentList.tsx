import React, { useState, useEffect, useMemo } from 'react';
import { Shipment, ShipmentStatus, PartnerTier, UserRole } from '../../types';
import { ShipmentStatusBadge } from '../common/ShipmentStatusBadge';
import { PencilIcon, ClockIcon } from '../Icons';
import { useAppContext } from '../../context/AppContext';

interface ShipmentListProps {
    shipments: Shipment[]; 
    onSelect?: (shipment: Shipment) => void;
    priceColumnTitle?: string;
    showPackageValue?: boolean;
    showClientFee?: boolean;
    showCourierCommission?: boolean;
    showNetProfit?: boolean;
    showEditableFees?: boolean;
    updateShipmentFees?: (shipmentId: string, fees: { clientFlatRateFee?: number; courierCommission?: number }) => void;
}

export const ShipmentList: React.FC<ShipmentListProps> = ({ 
    shipments, 
    onSelect,
    priceColumnTitle = 'Price',
    showPackageValue = false,
    showClientFee = false,
    showCourierCommission = false,
    showNetProfit = false,
    showEditableFees = false,
    updateShipmentFees,
}) => {
    const { currentUser, tierSettings, users } = useAppContext();
    const [editingCell, setEditingCell] = useState<{ shipmentId: string; field: 'clientFee' | 'courierCommission' } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [now, setNow] = useState(new Date());
    const [sortConfig, setSortConfig] = useState<{ key: 'daysInPhase' | null; direction: 'ascending' | 'descending' }>({ key: null, direction: 'ascending' });

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // Function to calculate tier-discounted price
    const calculateDiscountedPrice = (shipment: Shipment): number => {
        const basePrice = Number(shipment.price) || 0;
        
        // If this is the client's own shipment, apply their tier discount
        if (currentUser?.id === shipment.clientId && currentUser?.partnerTier) {
            const tierSetting = tierSettings.find(t => t.tierName === currentUser.partnerTier);
            if (tierSetting && tierSetting.discountPercentage > 0) {
                const discountAmount = basePrice * (tierSetting.discountPercentage / 100);
                return basePrice - discountAmount;
            }
        }
        
        return basePrice;
    };

    const isEditable = (status: ShipmentStatus) => ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(status);
    
    const startEditing = (shipment: Shipment, field: 'clientFee' | 'courierCommission') => {
        if (!isEditable(shipment.status) || !showEditableFees || !updateShipmentFees) return;
        setEditingCell({ shipmentId: shipment.id, field });
        const value = field === 'clientFee' ? shipment.clientFlatRateFee : shipment.courierCommission;
        setEditValue(String(value || 0));
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value);
    };

    const saveEdit = (shipmentId: string) => {
        if (editingCell && updateShipmentFees) {
            const value = parseFloat(editValue);
            if (!isNaN(value)) {
                const fees = editingCell.field === 'clientFee' 
                    ? { clientFlatRateFee: value } 
                    : { courierCommission: value };
                updateShipmentFees(shipmentId, fees);
            }
        }
        setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, shipmentId: string) => {
        if (e.key === 'Enter') {
            saveEdit(shipmentId);
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };
    
    const getDaysInPhase = (shipment: Shipment): number | null => {
        if (!shipment.creationDate) return null;

        const startTime = new Date(shipment.creationDate);

        const outForDeliveryEntry = shipment.statusHistory?.find(
            h => h.status === ShipmentStatus.OUT_FOR_DELIVERY
        );

        const endTime = outForDeliveryEntry
            ? new Date(outForDeliveryEntry.timestamp)
            : now;
        
        const diffTime = Math.abs(endTime.getTime() - startTime.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays;
    };
    
    const sortedShipments = useMemo(() => {
        let sortableItems = [...shipments];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = getDaysInPhase(a) ?? -1;
                const bValue = getDaysInPhase(b) ?? -1;
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [shipments, sortConfig]);

    const requestSort = (key: 'daysInPhase') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const renderFeeCell = (shipment: Shipment, field: 'clientFee' | 'courierCommission', value: number | undefined) => {
        const isEditingThisCell = editingCell?.shipmentId === shipment.id && editingCell?.field === field;
        if (isEditingThisCell) {
            return (
                <input
                    type="number"
                    value={editValue}
                    onChange={handleEditChange}
                    onBlur={() => saveEdit(shipment.id)}
                    onKeyDown={(e) => handleKeyDown(e, shipment.id)}
                    className="w-20 p-1 border rounded bg-background"
                    autoFocus
                />
            );
        }
        
        // Safely convert to number and format
        const numericValue = Number(value) || 0;
        
        return (
            <span onClick={() => startEditing(shipment, field)} className={`flex items-center gap-1 ${isEditable(shipment.status) && showEditableFees ? 'cursor-pointer hover:text-primary' : ''}`}>
                {numericValue.toFixed(2)}
                {isEditable(shipment.status) && showEditableFees && <PencilIcon className="w-3 h-3 text-muted-foreground" />}
            </span>
        );
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                 <thead className="bg-secondary">
                    <tr>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Shipment</th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th 
                            className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer"
                            onClick={() => requestSort('daysInPhase')}
                        >
                            Duration
                        </th>
                        {showPackageValue && <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{priceColumnTitle}</th>}
                        {showClientFee && <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Client Fee</th>}
                        {showCourierCommission && <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Courier Comm.</th>}
                        {showNetProfit && <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Net Profit</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {sortedShipments.map(s => {
                        // Safely calculate netProfit with null checks
                        const clientFee = Number(s.clientFlatRateFee) || 0;
                        const courierCommission = Number(s.courierCommission) || 0;
                        const netProfit = clientFee - courierCommission;
                        const days = getDaysInPhase(s);
                        const basePrice = Number(s.price) || 0;
                        const discountedPrice = calculateDiscountedPrice(s);
                        
                        return (
                            <tr key={s.id} onClick={() => onSelect?.(s)} className={`hover:bg-accent ${onSelect ? 'cursor-pointer' : ''}`}>
                                <td className="px-4 py-3">
                                    <p className="font-mono text-sm font-semibold text-foreground">{s.id}</p>
                                    <p className="text-xs text-muted-foreground">{s.recipientName}</p>
                                </td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(s.creationDate).toLocaleDateString()}</td>
                                <td className="px-4 py-3"><ShipmentStatusBadge status={s.status} /></td>
                                <td className="px-4 py-3 text-sm">
                                    {days !== null && (
                                        <div className="flex items-center gap-2">
                                            <ClockIcon className="w-4 h-4 text-muted-foreground"/>
                                            <span className="font-mono">{days.toFixed(1)} days</span>
                                        </div>
                                    )}
                                </td>
                                {showPackageValue && <td className="px-4 py-3 font-mono font-semibold text-primary">
                                    <div>
                                        {(s.paymentMethod === 'Transfer' ? 0 : discountedPrice).toFixed(2)}
                                        {discountedPrice < basePrice && currentUser?.id === s.clientId && (
                                            <div className="text-xs text-muted-foreground line-through">{basePrice.toFixed(2)}</div>
                                        )}
                                    </div>
                                </td>}
                                {showClientFee && <td className="px-4 py-3 font-mono text-green-600 dark:text-green-400">{renderFeeCell(s, 'clientFee', s.clientFlatRateFee)}</td>}
                                {showCourierCommission && <td className="px-4 py-3 font-mono text-red-600 dark:text-red-400">{renderFeeCell(s, 'courierCommission', s.courierCommission)}</td>}
                                {showNetProfit && <td className={`px-4 py-3 font-mono font-bold ${netProfit >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}>{(Number(netProfit) || 0).toFixed(2)}</td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
             {shipments.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="font-semibold">No Shipments Found</p>
                    <p className="text-sm">There are no shipments matching the current criteria.</p>
                </div>
            )}
        </div>
    );
};