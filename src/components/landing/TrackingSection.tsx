import React, { useState } from 'react';
import { Search, Package, MapPin, CheckCircle, Clock, AlertTriangle, Truck } from 'lucide-react';

interface TrackingSectionProps {
  t: (key: string) => string;
}

const TrackingSection: React.FC<TrackingSectionProps> = ({ t }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim() || !phoneNumber.trim()) return;

    setIsLoading(true);
    setTrackingResult(null);

    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackingId: trackingNumber.trim(),
          phone: phoneNumber.trim(),
        }),
      });

      if (response.ok) {
        const shipment = await response.json();
        
        // Map shipment status to tracking display
        const getStatusInfo = (status: string) => {
          switch (status) {
            case 'Pending':
              return {
                status: 'Order Confirmed',
                location: 'Processing Center',
                details: 'Your order has been confirmed and is being prepared.',
                icon: <Clock className="h-5 w-5" />,
                color: 'text-blue-600'
              };
            case 'Assigned':
              return {
                status: 'Assigned to Courier',
                location: 'Local Hub',
                details: 'Your package has been assigned to a courier.',
                icon: <Package className="h-5 w-5" />,
                color: 'text-blue-600'
              };
            case 'In Transit':
              return {
                status: 'In Transit',
                location: 'En Route',
                details: 'Your package is on its way.',
                icon: <Truck className="h-5 w-5" />,
                color: 'text-blue-600'
              };
            case 'Out for Delivery':
              return {
                status: 'Out for Delivery',
                location: 'Local Area',
                details: 'Your package is out for delivery and will arrive soon.',
                icon: <Truck className="h-5 w-5" />,
                color: 'text-orange-600'
              };
            case 'Delivered':
              return {
                status: 'Delivered',
                location: 'Destination',
                details: 'Package delivered successfully.',
                icon: <CheckCircle className="h-5 w-5" />,
                color: 'text-green-600'
              };
            case 'Delivery Failed':
              return {
                status: 'Delivery Failed',
                location: 'Local Hub',
                details: 'Delivery attempt failed. Will retry next business day.',
                icon: <AlertTriangle className="h-5 w-5" />,
                color: 'text-red-600'
              };
            default:
              return {
                status: 'Processing',
                location: 'Hub',
                details: 'Your package is being processed.',
                icon: <Package className="h-5 w-5" />,
                color: 'text-blue-600'
              };
          }
        };

        const statusInfo = getStatusInfo(shipment.status);
        setTrackingResult({
          trackingId: shipment.id,
          ...statusInfo
        });
      } else {
        const errorData = await response.json();
        setTrackingResult({
          trackingId: trackingNumber.toUpperCase(),
          status: 'Not Found',
          location: 'N/A',
          details: errorData.error || 'Shipment not found or incorrect phone number.',
          icon: <AlertTriangle className="h-5 w-5" />,
          color: 'text-red-600'
        });
      }
    } catch (error) {
      console.error('Tracking error:', error);
      setTrackingResult({
        trackingId: trackingNumber.toUpperCase(),
        status: 'Error',
        location: 'N/A',
        details: 'Unable to track shipment. Please try again later.',
        icon: <AlertTriangle className="h-5 w-5" />,
        color: 'text-red-600'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <section id="tracking" className="py-20 tracking-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-[#061A40] mb-4">
                {t('trackTitle')}
              </h2>
              <p className="text-xl text-gray-600">
                {t('trackSubtitle')}
              </p>
            </div>
            
            <div className="tracking-form rounded-2xl p-8 shadow-xl">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="tracking-number-landing" className="sr-only">Tracking Number</label>
                         <input
                            id="tracking-number-landing"
                            type="text"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder={t('trackPlaceholder')}
                            className="tracking-input w-full px-6 py-4 text-lg rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="phone-number-landing" className="sr-only">Phone Number</label>
                        <input
                            id="phone-number-landing"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder={t('trackPhonePlaceholder')}
                            className="tracking-input w-full px-6 py-4 text-lg rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none"
                            required
                        />
                    </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="tracking-button w-full disabled:opacity-50 px-8 py-4 text-lg font-bold bg-[#FFD000] text-[#061A40] flex items-center justify-center space-x-2 hover:bg-[#e6bb00] rounded-xl transition-colors duration-300"
                >
                  {isLoading ? (
                    <div className="loading-spinner w-6 h-6 border-2 border-[#061A40] border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      <span>{t('trackButton')}</span>
                    </>
                  )}
                </button>
              </form>
              
              {trackingResult && (
                <div className="result-slide mt-8 p-6 bg-gray-50 rounded-xl border-l-4 border-[#FFD000]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-[#061A40]">
                      Tracking ID: {trackingResult.trackingId}
                    </h4>
                    <div className={`flex items-center space-x-2 ${trackingResult.color}`}>
                      {trackingResult.icon}
                      <span className="font-medium">{trackingResult.status}</span>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Current Location</div>
                        <div className="font-medium text-[#061A40]">{trackingResult.location}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Details</div>
                        <div className="font-medium text-[#061A40]">{trackingResult.details}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
  );
};

export default TrackingSection;