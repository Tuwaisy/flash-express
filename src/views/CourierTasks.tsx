// src/views/CourierTasks.tsx



import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Shipment, ShipmentStatus, PaymentMethod, UserRole } from '../types';
import { BarcodeScanner } from '../components/common/BarcodeScanner';
import { Modal } from '../components/common/Modal';
import { ShipmentStatusBadge } from '../components/common/ShipmentStatusBadge';
import { StatCard } from '../components/common/StatCard';
import { QrcodeIcon, WalletIcon, CurrencyDollarIcon, PackageIcon, CheckCircleIcon, CameraIcon } from '../components/Icons';

interface CourierTasksProps {
    setActiveView: (view: string) => void;
}

const CourierTasks: React.FC<CourierTasksProps> = ({ setActiveView }) => {
    const { currentUser, shipments, users, updateShipmentStatus, addToast, sendDeliveryVerificationCode, verifyDelivery } = useAppContext();
    const { t } = useLanguage();
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [highlightedTask, setHighlightedTask] = useState<string | null>(null);
    const [isFailureModalOpen, setFailureModalOpen] = useState(false);
    const [failureShipment, setFailureShipment] = useState<Shipment | null>(null);
    const [failureReason, setFailureReason] = useState('Recipient Unreachable');
    const [failurePhoto, setFailurePhoto] = useState<string | null>(null);
    const shipmentTaskRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
    
    // State for the new delivery verification modal
    const [verificationShipment, setVerificationShipment] = useState<Shipment | null>(null);
    const [verificationStep, setVerificationStep] = useState<'send' | 'verify'>('send');
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerificationLoading, setIsVerificationLoading] = useState(false);

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<'all' | number>('all');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const clients = useMemo(() => users.filter(u => (u.roles || []).includes(UserRole.CLIENT)), [users]);
    
    // Camera state
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);


    if (!currentUser) return null;
    
    const myDeliveryTasks = useMemo(() => {
        let tasks = shipments.filter(s => s.courierId === currentUser.id && ![ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED].includes(s.status));
        
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            tasks = tasks.filter(s => 
                s.id.toLowerCase().includes(lowerSearch) ||
                s.recipientName.toLowerCase().includes(lowerSearch) ||
                s.toAddress.street.toLowerCase().includes(lowerSearch) ||
                s.toAddress.zone.toLowerCase().includes(lowerSearch)
            );
        }

        if (selectedClientId !== 'all') {
            tasks = tasks.filter(s => s.clientId === selectedClientId);
        }

        if (selectedDate) {
            tasks = tasks.filter(s => s.creationDate.startsWith(selectedDate));
        }

        return tasks;
    }, [shipments, currentUser.id, searchTerm, selectedClientId, selectedDate]);
    
    // Calculate financial metrics
    const totalCashToCollect = myDeliveryTasks
        .filter(s => s.paymentMethod === PaymentMethod.COD)
        .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    
    const myDeliveredShipments = shipments.filter(s => s.courierId === currentUser.id && s.status === ShipmentStatus.DELIVERED);
    const totalCODCollected = myDeliveredShipments
        .filter(s => s.paymentMethod === PaymentMethod.COD)
        .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    
    const pendingDeliveries = myDeliveryTasks.length;

    const handleUpdateStatus = (shipmentId: string, status: ShipmentStatus) => {
        updateShipmentStatus(shipmentId, status);
    };

    // --- Camera Logic ---
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setIsCameraActive(false);
    }, [stream]);

    const startCamera = async () => {
        stopCamera(); // Ensure any previous stream is stopped
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
            setIsCameraActive(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            addToast("Could not access camera. Please check permissions.", "error");
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG for smaller size
                setFailurePhoto(dataUrl);
                stopCamera();
            }
        }
    };

    const handleRetakePhoto = () => {
        setFailurePhoto(null);
        startCamera();
    };
    
    // Cleanup effect when the modal is closed
    useEffect(() => {
        if (!isFailureModalOpen) {
            stopCamera();
        }
    }, [isFailureModalOpen, stopCamera]);


    const handleStartFailure = (shipment: Shipment) => {
        setFailureShipment(shipment);
        setFailureReason('Recipient Unreachable');
        setFailurePhoto(null);
        setFailureModalOpen(true);
    };

    const handleSaveFailure = () => {
        if(failureShipment && failureReason){
            updateShipmentStatus(failureShipment.id, ShipmentStatus.DELIVERY_FAILED, { failureReason, failurePhoto });
            setFailureModalOpen(false);
            setFailureShipment(null);
        }
    };
    
    // --- Delivery Verification Handlers ---
    const openVerificationModal = (shipment: Shipment) => {
        setVerificationShipment(shipment);
        setVerificationStep('send');
        setVerificationCode('');
        setIsVerificationLoading(false);
    };

    const closeVerificationModal = () => {
        setVerificationShipment(null);
    };

    const handleSendCode = async () => {
        if (!verificationShipment) return;
        setIsVerificationLoading(true);
        const success = await sendDeliveryVerificationCode(verificationShipment.id);
        if (success) {
            setVerificationStep('verify');
        }
        setIsVerificationLoading(false);
    };

    const handleVerifyAndDeliver = async () => {
        if (!verificationShipment || verificationCode.length !== 6) return;
        setIsVerificationLoading(true);
        const success = await verifyDelivery(verificationShipment.id, verificationCode);
        if (success) {
            closeVerificationModal();
        }
        setIsVerificationLoading(false);
    };


    const handleScanSuccess = useCallback((decodedText: string) => {
        setScannerOpen(false);
        const foundTask = myDeliveryTasks.find(t => t.id === decodedText);

        if(foundTask) {
            addToast(`Scanned: ${decodedText}. Task is ready.`, 'success');
            const taskElement = shipmentTaskRefs.current[decodedText];
            if(taskElement) {
                taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedTask(decodedText);
                setTimeout(() => setHighlightedTask(null), 3000); // Remove highlight after 3s
            }
        } else {
            addToast(`Scanned code ${decodedText} not found in your current tasks.`, 'error');
        }
    }, [myDeliveryTasks, addToast]);

    const nextAction: Record<string, { label: string; nextStatus: ShipmentStatus } | null> = {
        [ShipmentStatus.ASSIGNED_TO_COURIER]: { label: 'Start Delivery', nextStatus: ShipmentStatus.OUT_FOR_DELIVERY },
        [ShipmentStatus.OUT_FOR_DELIVERY]: null, // Special case with two buttons
    };
    
    const TaskCard: React.FC<{task: Shipment}> = ({ task }) => (
         <div className="card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <p className="font-mono text-sm text-muted-foreground">{task.id}</p>
                <p className="text-lg font-bold text-foreground">Deliver to: {task.recipientName}</p>
                <p className="text-muted-foreground">{task.toAddress.street}, {task.toAddress.zone}</p>
                 <p className="text-sm font-semibold text-foreground mt-1">Payment: {task.paymentMethod} ({(Number(task.price) || 0) > 0 ? `${(Number(task.price) || 0).toFixed(2)} EGP` : 'Pre-Paid'})</p>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                <div className="flex-grow"><ShipmentStatusBadge status={task.status} /></div>
                <>
                    {nextAction[task.status] && (
                        <button onClick={() => handleUpdateStatus(task.id, nextAction[task.status]!.nextStatus)} className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition w-full md:w-auto">
                           {nextAction[task.status]!.label}
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
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">{t('nav.myTasks')}</h2>
                <button 
                    onClick={() => setScannerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition"
                >
                    <QrcodeIcon className="w-5 h-5"/>
                    Scan Package
                </button>
            </div>

            {/* Courier Dashboard KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Cash to Collect" 
                    value={`${(Number(totalCashToCollect) || 0).toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#f97316"
                    subtitle={`${myDeliveryTasks.filter(s => s.paymentMethod === PaymentMethod.COD).length} COD packages`}
                />
                <StatCard 
                    title="Total COD Collected" 
                    value={`${(Number(totalCODCollected) || 0).toFixed(2)} EGP`} 
                    icon={<CurrencyDollarIcon className="w-7 h-7"/>} 
                    color="#16a34a"
                    subtitle={`From ${myDeliveredShipments.filter(s => s.paymentMethod === PaymentMethod.COD).length} completed deliveries`}
                    onClick={() => setActiveView('completed-orders')}
                />
                <StatCard 
                    title="Pending Deliveries" 
                    value={pendingDeliveries} 
                    icon={<PackageIcon className="w-7 h-7"/>} 
                    color="#3b82f6"
                    subtitle="Currently assigned"
                />
                <StatCard 
                    title="Total Deliveries" 
                    value={myDeliveredShipments.length} 
                    icon={<CheckCircleIcon className="w-7 h-7"/>} 
                    color="#8b5cf6"
                    subtitle="All time completed"
                    onClick={() => setActiveView('completed-orders')}
                />
            </div>

            <div className="card p-4 flex flex-col md:flex-row gap-4 flex-wrap">
                <input
                    type="text"
                    placeholder="Search by ID, recipient, address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                />
                <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full md:w-auto px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                >
                    <option value="all">Filter by Client</option>
                    {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                </select>
                 <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary"
                    aria-label="Filter by creation date"
                />
            </div>

             <div className="space-y-4">
                {myDeliveryTasks.length === 0 && <p className="text-muted-foreground card p-4">You have no active tasks matching the current filters.</p>}
                {myDeliveryTasks.map(task => (
                    <div 
                        key={task.id} 
                        ref={el => { shipmentTaskRefs.current[task.id] = el; }}
                        className={`rounded-xl transition-all duration-500 ${highlightedTask === task.id ? 'ring-4 ring-primary ring-offset-2' : ''}`}
                    >
                        <TaskCard task={task} />
                    </div>
                ))}
            </div>

             <Modal isOpen={isScannerOpen} onClose={() => setScannerOpen(false)} title="Scan Package Barcode">
                <div className="w-full h-96 flex justify-center items-center">
                   {isScannerOpen && <BarcodeScanner onScanSuccess={handleScanSuccess} />}
                </div>
            </Modal>
             <Modal isOpen={isFailureModalOpen} onClose={() => setFailureModalOpen(false)} title="Delivery Failed - Please Provide Reason">
                {failureShipment && (
                    <div className="space-y-4">
                        <div className="bg-secondary p-4 rounded-lg">
                            <p className="font-semibold text-foreground">Shipment: {failureShipment.id}</p>
                            <p className="text-sm text-muted-foreground">To: {failureShipment.recipientName}</p>
                            <p className="text-sm text-muted-foreground">{failureShipment.toAddress.street}, {failureShipment.toAddress.zone}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Reason for delivery failure *
                            </label>
                             <select
                                value={failureReason}
                                onChange={(e) => setFailureReason(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background"
                            >
                                <option value="Recipient Unreachable">Recipient Unreachable</option>
                                <option value="Cancelled by Client">Cancelled by Client</option>
                                <option value="Order Lost">Order Lost</option>
                                <option value="Damaged Package">Damaged Package</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Evidence Photo (Optional)
                            </label>
                            <div className="w-full p-4 bg-secondary rounded-lg">
                                {!isCameraActive && !failurePhoto && (
                                    <button type="button" onClick={startCamera} className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:bg-accent hover:border-primary transition">
                                        <CameraIcon className="w-10 h-10 mb-2"/>
                                        <span className="font-semibold">Take Photo</span>
                                    </button>
                                )}
                                {isCameraActive && (
                                    <div className="space-y-3">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-slate-900 aspect-video object-cover"></video>
                                        <canvas ref={canvasRef} className="hidden"></canvas>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={capturePhoto} className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90">Capture</button>
                                            <button type="button" onClick={stopCamera} className="px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-accent">Cancel</button>
                                        </div>
                                    </div>
                                )}
                                {!isCameraActive && failurePhoto && (
                                    <div className="space-y-3 text-center">
                                        <img src={failurePhoto} alt="Failure preview" className="rounded-lg max-h-64 mx-auto" />
                                        <button type="button" onClick={handleRetakePhoto} className="px-4 py-2 bg-foreground text-background font-semibold rounded-lg hover:bg-foreground/90">Retake Photo</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setFailureModalOpen(false)}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveFailure}
                                disabled={!failureReason}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-muted disabled:cursor-not-allowed"
                            >
                                Mark as Failed
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={!!verificationShipment} onClose={closeVerificationModal} title="Confirm Delivery with Recipient">
                {verificationShipment && (
                    <div className="space-y-4">
                        <div className="bg-secondary p-4 rounded-lg">
                            <p className="font-semibold text-foreground">Shipment: {verificationShipment.id}</p>
                            <p className="text-sm text-muted-foreground">Recipient: {verificationShipment.recipientName}</p>
                            <p className="text-sm text-muted-foreground">Phone: {verificationShipment.recipientPhone}</p>
                        </div>

                        {verificationStep === 'send' ? (
                            <div>
                                <p className="mb-4">Click below to send a 6-digit verification code to the recipient's phone number.</p>
                                <button
                                    onClick={handleSendCode}
                                    disabled={isVerificationLoading}
                                    className="w-full px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:bg-muted"
                                >
                                    {isVerificationLoading ? 'Sending...' : 'Send Code to Recipient'}
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
                                    className="w-full text-center tracking-[1em] font-mono text-2xl px-4 py-2 border border-border rounded-lg bg-background"
                                />
                                <button
                                    onClick={handleVerifyAndDeliver}
                                    disabled={isVerificationLoading || verificationCode.length !== 6}
                                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-muted"
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

export default CourierTasks;