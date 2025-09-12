// src/components/common/ShipmentStatusBadge.tsx



import React from 'react';
import { ShipmentStatus } from '../../types';

export const ShipmentStatusBadge: React.FC<{ status: ShipmentStatus }> = ({ status }) => {
    const statusStyles: Record<ShipmentStatus, string> = {
        [ShipmentStatus.WAITING_FOR_PACKAGING]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        [ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        [ShipmentStatus.ASSIGNED_TO_COURIER]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        [ShipmentStatus.OUT_FOR_DELIVERY]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
        [ShipmentStatus.DELIVERED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        [ShipmentStatus.DELIVERY_FAILED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>;
};