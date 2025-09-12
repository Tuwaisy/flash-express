// src/components/specific/TrackingTimeline.tsx



import React from 'react';
import { Shipment, ShipmentStatus } from '../../types';
import { ClipboardListIcon, UserCircleIcon, TruckIcon, CheckCircleIcon, XCircleIcon, ArchiveBoxIcon, SwitchHorizontalIcon } from '../Icons';

// This maps each status to a visual step on the timeline.
// This allows multiple statuses to correspond to the same visual step.
const statusOrderMapping: Record<string, number> = {
    [ShipmentStatus.WAITING_FOR_PACKAGING]: 0,
    [ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT]: 1,
    [ShipmentStatus.ASSIGNED_TO_COURIER]: 2,
    [ShipmentStatus.OUT_FOR_DELIVERY]: 3,
    [ShipmentStatus.DELIVERED]: 4,
    // This status is handled separately
    [ShipmentStatus.DELIVERY_FAILED]: -1,
};


const timelineSteps = [
    { status: ShipmentStatus.WAITING_FOR_PACKAGING, icon: <ClipboardListIcon />, title: 'Shipment Created', description: 'The shipment request has been received.' },
    { status: ShipmentStatus.PACKAGED_AND_WAITING_FOR_ASSIGNMENT, icon: <ArchiveBoxIcon />, title: 'Packaged', description: 'Your shipment is packaged and awaiting a courier.' },
    { status: ShipmentStatus.ASSIGNED_TO_COURIER, icon: <UserCircleIcon />, title: 'Courier Assigned', description: 'A courier has been assigned to the package.' },
    { status: ShipmentStatus.OUT_FOR_DELIVERY, icon: <TruckIcon />, title: 'Out for Delivery', description: 'The package is on its final leg of the journey.' },
    { status: ShipmentStatus.DELIVERED, icon: <CheckCircleIcon />, title: 'Delivered', description: 'The package has been successfully delivered.' },
];


export const TrackingTimeline: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
    const currentStatusIndex = statusOrderMapping[shipment.status] ?? -1;
    const isFailed = shipment.status === ShipmentStatus.DELIVERY_FAILED;

    // A shipment is in progress if its status is found in our timeline order
    const shipmentInProgress = currentStatusIndex > -1;

    return (
        <div className="relative">
            {/* The vertical line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border"></div>

            <div className="space-y-8">
                {timelineSteps.map((step, index) => {
                    const isCompleted = shipmentInProgress && currentStatusIndex >= index;

                    const historyEntry = shipment.statusHistory?.find(h => statusOrderMapping[h.status] === index);

                    return (
                        <div key={step.status} className="relative flex items-start">
                            <div className={`absolute left-0 top-1 flex items-center justify-center w-8 h-8 rounded-full z-10 ${
                                isCompleted ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                                {React.cloneElement(step.icon, { className: 'w-5 h-5' })}
                            </div>
                            <div className="pl-12">
                                <p className={`font-bold pt-1 ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</p>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                                {isCompleted && historyEntry && (
                                     <p className="text-xs text-green-600 font-medium mt-1">{new Date(historyEntry.timestamp).toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isFailed && (
                     <div className="relative flex items-start">
                        <div className="absolute left-0 top-1 flex items-center justify-center w-8 h-8 rounded-full z-10 bg-red-600 text-white">
                            <XCircleIcon className="w-5 h-5"/>
                        </div>
                        <div className="pl-12">
                            <p className="font-bold pt-1 text-red-800 dark:text-red-300">Delivery Attempt Failed</p>
                            <p className="text-sm text-muted-foreground">{shipment.failureReason || 'The courier was unable to deliver the package.'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};