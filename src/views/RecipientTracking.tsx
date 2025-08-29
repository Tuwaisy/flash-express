import React, { useState } from 'react';
import { Shipment, ShipmentStatus, ShipmentPriority } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LogoIcon, PhoneIcon, UserCircleIcon, MapPinIcon } from '../components/Icons';
import { ShipmentStatusBadge } from '../components/common/ShipmentStatusBadge';
import { TrackingTimeline } from '../components/specific/TrackingTimeline';
import { apiFetch } from '../api/client';

interface RecipientTrackingProps {
    onBackToApp: () => void;
}

const RecipientTracking: React.FC<RecipientTrackingProps> = ({ onBackToApp }) => {
    const { t } = useLanguage();
    const [trackingId, setTrackingId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTrackPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        setShipment(null);
        setError(null);

        if (!trackingId.trim() || !phoneNumber.trim()) {
            setError('Please enter both a tracking ID and phone number.');
            return;
        }

        setIsLoading(true);

        try {
            const foundShipment = await apiFetch('/api/track', {
                method: 'POST',
                body: JSON.stringify({
                    trackingId: trackingId,
                    phone: phoneNumber,
                }),
            });
            setShipment(foundShipment);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getEstimatedDelivery = (shipment: Shipment): string => {
        if (shipment.status === ShipmentStatus.DELIVERED && shipment.deliveryDate) {
            return `Delivered on ${new Date(shipment.deliveryDate).toLocaleDateString()}`;
        }
        const creationDate = new Date(shipment.creationDate);
        let deliveryDays = 3;
        if (shipment.priority === ShipmentPriority.URGENT) deliveryDays = 2;
        if (shipment.priority === ShipmentPriority.EXPRESS) deliveryDays = 1;

        creationDate.setDate(creationDate.getDate() + deliveryDays);
        return creationDate.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="p-4 border-b border-border bg-card sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <LogoIcon className="w-9 h-9" />
                        <h1 className="text-xl font-bold text-foreground">Shuhna Express Tracking</h1>
                    </div>
                    <button onClick={onBackToApp} className="text-sm font-semibold text-primary hover:text-primary/90">
                        Back to Portal
                    </button>
                </div>
            </header>
            <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-6xl mx-auto">
                    {!shipment ? (
                        <div className="w-full max-w-lg mx-auto card p-8 shadow-lg">
                            <h2 className="text-3xl font-bold text-foreground text-center">{t('trackTitle')}</h2>
                            <p className="text-muted-foreground text-center mt-2 mb-8">{t('trackSubtitle')}</p>
                            
                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6" role="alert">
                                    <strong className="font-bold">Tracking Failed: </strong>
                                    <span className="block sm:inline">{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleTrackPackage} className="space-y-6">
                                <div>
                                    <label htmlFor="trackingId" className="block text-sm font-medium text-muted-foreground">Shipment ID</label>
                                    <div className="relative mt-1">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                            <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-4V3a1 1 0 00-1-1H9zm-1 4a1 1 0 100 2 1 1 0 000-2zM8 9a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" /></svg>
                                        </span>
                                        <input id="trackingId" type="text" value={trackingId} onChange={e => setTrackingId(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background" placeholder="e.g., FLS123456" required />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-muted-foreground">Phone Number (Sender or Recipient)</label>
                                    <div className="relative mt-1">
                                         <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                            <PhoneIcon className="h-5 w-5 text-muted-foreground" />
                                        </span>
                                        <input id="phoneNumber" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-primary focus:border-primary bg-background" placeholder="01xxxxxxxxx" required />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Example for Egyptian number: 01012345678</p>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full flex justify-center bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition duration-300 disabled:bg-muted">
                                    {isLoading ? 'Searching...' : 'Track Now'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="card p-6 sm:p-8 rounded-2xl shadow-lg animate-fade-in-up space-y-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-border">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tracking ID</p>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-tighter">{shipment.id}</h2>
                                </div>
                                <ShipmentStatusBadge status={shipment.status} />
                            </div>

                             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Origin</p>
                                    <p className="text-lg font-semibold text-foreground">{shipment.fromAddress.city}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Destination</p>
                                    <p className="text-lg font-semibold text-foreground">{shipment.toAddress.city}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Sent Date</p>
                                    <p className="text-lg font-semibold text-foreground">{new Date(shipment.creationDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Estimated Delivery</p>
                                    <p className="text-lg font-semibold text-foreground">{getEstimatedDelivery(shipment)}</p>
                                </div>
                            </div>
                            
                            <div className="grid lg:grid-cols-5 gap-8 pt-8 border-t border-border">
                                <div className="lg:col-span-3">
                                     <h3 className="text-xl font-bold text-foreground mb-6">Tracking History</h3>
                                    <TrackingTimeline shipment={shipment} />
                                </div>
                                 <div className="lg:col-span-2 space-y-6">
                                    <h3 className="text-xl font-bold text-foreground">Route Information</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
                                                    <UserCircleIcon className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                                <h4 className="font-semibold text-foreground">Sender</h4>
                                            </div>
                                            <div className="pl-11 mt-1 border-l-2 border-dashed border-border ml-4 pb-8">
                                                <div className="pl-4">
                                                    <p className="text-foreground">{shipment.clientName}</p>
                                                    <p className="text-sm text-muted-foreground">{shipment.fromAddress.street}, {shipment.fromAddress.zone}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="-mt-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                                    <MapPinIcon className="w-5 h-5 text-primary" />
                                                </div>
                                                <h4 className="font-semibold text-foreground">Recipient</h4>
                                            </div>
                                            <div className="pl-11 mt-1 ml-4">
                                                <div className="pl-4">
                                                    <p className="text-foreground">{shipment.recipientName}</p>
                                                    <p className="text-sm text-muted-foreground">{shipment.toAddress.street}, {shipment.toAddress.zone}</p>
                                                    <p className="text-sm text-muted-foreground">{shipment.recipientPhone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RecipientTracking;