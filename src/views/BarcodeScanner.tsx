import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Package, Zap, CheckCircle, X, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

interface BarcodeScannedResult {
    success: boolean;
    message: string;
    shipment?: {
        id: string;
        previousStatus: string;
        newStatus: string;
        recipientName: string;
        recipientPhone: string;
        courier?: string;
        scannedAt: string;
    };
    error?: string;
}

const BarcodeScanner: React.FC = () => {
    const { currentUser, addToast } = useAppContext();
    const { t } = useLanguage();
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<BarcodeScannedResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [scanHistory, setScanHistory] = useState<any[]>([]);

    useEffect(() => {
        // Load recent scan history
        loadScanHistory();
    }, []);

    const loadScanHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/barcode/history?limit=10', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setScanHistory(data.scans);
            }
        } catch (error) {
            console.error('Failed to load scan history:', error);
        }
    };

    const handleScan = async (result: string) => {
        if (!result || loading) return;
        
        setLoading(true);
        setIsScanning(false);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/barcode/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    barcode: result.trim(),
                    courierId: currentUser?.id,
                    scannerId: navigator.userAgent // Simple device identification
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                setScanResult(data);
                loadScanHistory(); // Refresh history
                addToast(data.message, 'success');
                
                // Auto-clear success message after 5 seconds
                setTimeout(() => {
                    setScanResult(null);
                }, 5000);
            } else {
                setScanResult({
                    success: false,
                    message: data.error || 'Failed to process scan',
                    error: data.error
                });
                addToast(data.error || 'Failed to process scan', 'error');
            }
        } catch (error) {
            const errorMsg = 'Network error occurred';
            setScanResult({
                success: false,
                message: errorMsg,
                error: 'Connection failed'
            });
            addToast(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleError = (error: any) => {
        console.error('Scanner error:', error);
        const errorMsg = 'Scanner error occurred';
        setScanResult({
            success: false,
            message: errorMsg,
            error: error.message
        });
        addToast(errorMsg, 'error');
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="card max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Barcode Scanner</h1>
                    <p className="text-muted-foreground">
                        {currentUser ? currentUser.name : 'Courier Scanner'}
                    </p>
                </div>
                <Package className="h-8 w-8 text-primary" />
            </div>

            {/* Scanner Section */}
            <div className="bg-secondary rounded-lg p-6 mb-6">
                {!isScanning ? (
                    <div className="text-center">
                        <button
                            onClick={() => setIsScanning(true)}
                            disabled={loading}
                            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center mx-auto disabled:opacity-50"
                        >
                            <Zap className="h-5 w-5 mr-2" />
                            {loading ? 'Processing...' : 'Start Scanning'}
                        </button>
                        <p className="text-sm text-muted-foreground mt-2">
                            Point your camera at the shipment barcode
                        </p>
                    </div>
                ) : (
                    <div>
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            <Scanner
                                onScan={(result) => {
                                    if (result && result.length > 0) {
                                        handleScan(result[0]?.rawValue || '');
                                    }
                                }}
                                onError={handleError}
                                components={{
                                    finder: true
                                }}
                                styles={{
                                    container: { width: '100%', height: '300px' },
                                }}
                            />
                        </div>
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setIsScanning(false)}
                                className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg border border-border"
                            >
                                Cancel Scanning
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Scan Result */}
            {scanResult && (
                <div className={`rounded-lg p-4 mb-6 ${
                    scanResult.success 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' 
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                }`}>
                    <div className="flex items-center">
                        {scanResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
                        ) : (
                            <X className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <p className={`font-medium ${
                                scanResult.success 
                                    ? 'text-green-800 dark:text-green-200' 
                                    : 'text-red-800 dark:text-red-200'
                            }`}>
                                {scanResult.message}
                            </p>
                            {scanResult.shipment && (
                                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <p><strong>Shipment ID:</strong> {scanResult.shipment.id}</p>
                                    <p><strong>Recipient:</strong> {scanResult.shipment.recipientName}</p>
                                    <p><strong>Previous Status:</strong> {scanResult.shipment.previousStatus}</p>
                                    <p><strong>New Status:</strong> {scanResult.shipment.newStatus}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Scans */}
            <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-card-foreground flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-primary" />
                        Recent Scans
                    </h2>
                </div>
                <div className="divide-y divide-border">
                    {scanHistory.map((scan) => (
                        <div key={scan.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-card-foreground">{scan.shipmentId}</p>
                                    <p className="text-sm text-muted-foreground">{scan.recipientName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {scan.previousStatus} → {scan.newStatus}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-card-foreground">
                                        {formatTime(scan.scannedAt)}
                                    </p>
                                    <div className="flex items-center mt-1">
                                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                        <span className="text-xs text-green-600 dark:text-green-400">Completed</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {scanHistory.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            No recent scans found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;