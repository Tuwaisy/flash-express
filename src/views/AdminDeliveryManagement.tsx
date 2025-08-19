import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Shipment, ShipmentStatus, PaymentMethod, UserRole, Permission } from '../types';
import { Modal } from '../components/common/Modal';
import { ShipmentStatusBadge } from '../components/common/ShipmentStatusBadge';

const AdminDeliveryManagement = () => {
    const { 
        currentUser, shipments, users, updateShipmentStatus, addToast, 
        sendDeliveryVerificationCode, verifyDelivery, getCourierName, hasPermission 
    } = useAppContext();
    
    // State for modals and filters
    const [isFailureModalOpen, setFailureModalOpen] = useState(false);
    const [failureShipment, setFailureShipment] = useState<Shipment | null>(null);
    const [failureReason, setFailureReason] = useState('Recipient Unreachable');
    const [verificationShipment, setVerificationShipment] = useState<Shipment | null>(null);
    const [verificationStep, setVerificationStep] = useState<'send' | 'verify'>('send');
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerificationLoading, setIsVerificationLoading] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourierId, setSelectedCourierId] = useState<'all' | number>('all');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const couriers = useMemo(() => users.filter(u => u.roles.includes(UserRole.COURIER)), [users]);

    // Permission check
    if (!currentUser || !hasPermission(Permission.VIEW_ADMIN_DELIVERY_MANAGEMENT)) {
        return <div className="p-8 text-center">Access Denied. You do not have permission to view this page.</div>;
    }
    
    // Filtered delivery tasks
    const allDeliveryTasks = useMemo(() => {
        let tasks = shipments.filter(s => [ShipmentStatus.ASSIGNED_TO_COURIER, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status));
        
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            tasks = tasks.filter(s => 
                s.id.toLowerCase().includes(lowerSearch) ||
                s.recipientName.toLowerCase().includes(lowerSearch) ||
                s.toAddress.zone.toLowerCase().includes(lowerSearch) ||
                getCourierName(s.courierId).toLowerCase().includes(lowerSearch)
            );
        }
        if (selectedCourierId !== 'all') {
            tasks = tasks.filter(s => s.courierId === selectedCourierId);
        }
        if (selectedDate) {
            tasks = tasks.filter(s => s.creationDate.startsWith(selectedDate));
        }

        return tasks.sort((a,b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime());
    }, [shipments, searchTerm, selectedCourierId, selectedDate, getCourierName]);
    
    // Modal handlers (copied and adapted from CourierTasks)
    const handleUpdateStatus = (shipmentId: string, status: ShipmentStatus) => {
        updateShipmentStatus(shipmentId, status);
    };

    const handleStartFailure = (shipment: Shipment) => {
        setFailureShipment(shipment);
        setFailureReason('Recipient Unreachable');
        setFailureModalOpen(true);
    };

    const handleSaveFailure = () => {
        if(failureShipment && failureReason){
            updateShipmentStatus(failureShipment.id, ShipmentStatus.DELIVERY_FAILED, { failureReason });
            setFailureModalOpen(false);
            setFailureShipment(null);
        }
    };

    const openVerificationModal = (shipment: Shipment) => {
        setVerificationShipment(shipment);
        setVerificationStep('send');
        setVerificationCode('');
        setIsVerificationLoading(false);
    };

    const closeVerificationModal = () => setVerificationShipment(null);

    const handleSendCode = async () => {
        if (!verificationShipment) return;
        setIsVerificationLoading(true);
        const success = await sendDeliveryVerificationCode(verificationShipment.id);
        if (success) setVerificationStep('verify');
        setIsVerificationLoading(false);
    };

    const handleVerifyAndDeliver = async () => {
        if (!verificationShipment || verificationCode.length !== 6) return;
        setIsVerificationLoading(true);
        const success = await verifyDelivery(verificationShipment.id, verificationCode);
        if (success) closeVerificationModal();
        setIsVerificationLoading(false);
    };

    const TaskCard: React.FC<{task: Shipment}> = ({ task }) => (
         <div className="card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <p className="font-mono text-sm text-muted-foreground">{task.id}</p>
                <p className="text-lg font-bold text-foreground">To: {task.recipientName}</p>
                <p className="text-muted-foreground">{task.toAddress.street}, {task.toAddress.zone}</p>
                <p className="text-sm font-semibold text-foreground mt-1">Courier: {getCourierName(task.courierId)}</p>
                <p className="text-sm font-semibold text-foreground mt-1">Payment: {task.paymentMethod} ({(Number(task.price) || 0) > 0 ? `${(Number(task.price) || 0).toFixed(2)} EGP` : 'Pre-Paid'})</p>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                <div className="flex-grow"><ShipmentStatusBadge status={task.status} /></div>
                <>
                    {task.status === ShipmentStatus.ASSIGNED_TO_COURIER && (
                        <button onClick={() => handleUpdateStatus(task.id, ShipmentStatus.OUT_FOR_DELIVERY)} className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition w-full md:w-auto">
                           Start Delivery
                        </button>
                    )}
                    {task.status === ShipmentStatus.OUT_FOR_DELIVERY && (
                        <>
                            <button onClick={() => openVerificationModal(task)} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition w-full md:w-auto">
                                Verify & Deliver
                            </button>
                            <button onClick={() => handleStartFailure(task)} className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition w-full md:w-auto">
                                Delivery Failed
                            </button>
                        </>
                    )}
                </>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Admin Delivery Management</h1>
                <p className="text-muted-foreground mt-1">Oversee and manage all ongoing courier delivery tasks.</p>
            </div>

            <div className="card p-4 flex flex-col md:flex-row gap-4 flex-wrap">
                <input
                    type="text"
                    placeholder="Search by ID, recipient, courier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                />
                <select
                    value={selectedCourierId}
                    onChange={(e) => setSelectedCourierId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full md:w-auto px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                >
                    <option value="all">Filter by Courier</option>
                    {couriers.map(courier => (
                        <option key={courier.id} value={courier.id}>{courier.name}</option>
                    ))}
                </select>
                 <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-border rounded-lg"
                    aria-label="Filter by creation date"
                />
            </div>

             <div className="space-y-4">
                {allDeliveryTasks.length === 0 ? (
                    <div className="card text-center py-12 text-muted-foreground">No active delivery tasks match the current filters.</div>
                ) : (
                    allDeliveryTasks.map(task => <TaskCard key={task.id} task={task} />)
                )}
            </div>

            {/* Failure Modal */}
             <Modal isOpen={isFailureModalOpen} onClose={() => setFailureModalOpen(false)} title="Log Delivery Failure">
                {failureShipment && (
                    <div className="space-y-4">
                        <p>Marking shipment <strong>{failureShipment.id}</strong> as failed.</p>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Reason for failure *</label>
                             <select
                                value={failureReason}
                                onChange={(e) => setFailureReason(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            >
                                <option value="Recipient Unreachable">Recipient Unreachable</option>
                                <option value="Cancelled by Client">Cancelled by Client</option>
                                <option value="Order Lost">Order Lost</option>
                                <option value="Damaged Package">Damaged Package</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setFailureModalOpen(false)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg">Cancel</button>
                            <button onClick={handleSaveFailure} disabled={!failureReason} className="px-4 py-2 bg-red-500 text-white rounded-lg">Mark as Failed</button>
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* Verification Modal */}
            <Modal isOpen={!!verificationShipment} onClose={closeVerificationModal} title="Confirm Delivery">
                {verificationShipment && (
                    <div className="space-y-4">
                         <div className="bg-secondary p-4 rounded-lg">
                            <p className="font-semibold text-foreground">Shipment: {verificationShipment.id}</p>
                            <p className="text-sm text-muted-foreground">Recipient: {verificationShipment.recipientName}</p>
                            <p className="text-sm text-muted-foreground">Phone: {verificationShipment.recipientPhone}</p>
                        </div>
                        {verificationStep === 'send' ? (
                            <div>
                                <p className="mb-4">Send a 6-digit verification code to the recipient's phone.</p>
                                <button onClick={handleSendCode} disabled={isVerificationLoading} className="w-full px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg">
                                    {isVerificationLoading ? 'Sending...' : 'Send Code'}
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="mb-2">Enter the 6-digit code received by the recipient.</p>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    maxLength={6}
                                    placeholder="123456"
                                    className="w-full text-center tracking-[1em] font-mono text-2xl px-4 py-2 border border-border rounded-lg"
                                />
                                <button
                                    onClick={handleVerifyAndDeliver}
                                    disabled={isVerificationLoading || verificationCode.length !== 6}
                                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg"
                                >
                                    {isVerificationLoading ? 'Verifying...' : 'Confirm Delivery'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminDeliveryManagement;
