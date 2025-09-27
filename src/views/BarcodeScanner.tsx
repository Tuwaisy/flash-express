import React, { useState, useEffect } from 'react';
// Dynamically import the scanner to avoid build issues
const Scanner = React.lazy(() => import('@yudiel/react-qr-scanner').then(module => ({ default: module.Scanner })));
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
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [isRequestingPermission, setIsRequestingPermission] = useState(false);

    useEffect(() => {
        // Load recent scan history
        loadScanHistory();
        // Don't auto-request permission on load for iOS compatibility
        checkCameraAvailability();
    }, []);

    const checkCameraAvailability = () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setHasPermission(false);
            setPermissionError('Camera not supported on this device');
            return;
        }
        // Set initial state as null - requiring user action to request permission
        setHasPermission(null);
    };

    const requestCameraPermission = async () => {
        setIsRequestingPermission(true);
        setPermissionError(null);
        
        try {
            console.log('🔒 Requesting camera permission for iOS/mobile device...');
            
            // iPhone Safari optimized camera constraints
            const iOSConstraints = {
                video: {
                    facingMode: { ideal: 'environment', exact: undefined },
                    width: { min: 320, ideal: 640, max: 1920 },
                    height: { min: 240, ideal: 480, max: 1080 },
                    aspectRatio: { ideal: 1.333 }
                }
            };

            console.log('📱 Attempting camera access with iOS constraints:', iOSConstraints);
            const stream = await navigator.mediaDevices.getUserMedia(iOSConstraints);
            
            // Test successful, stop the stream
            stream.getTracks().forEach(track => {
                console.log('🎥 Camera track obtained:', track.getSettings());
                track.stop();
            });

            console.log('✅ iPhone camera permission granted successfully');
            setHasPermission(true);
            setPermissionError(null);
            
            // Small delay to ensure state is updated before scanning
            setTimeout(() => {
                console.log('🚀 Starting scanner after permission success...');
                setIsScanning(true);
            }, 500);
            
        } catch (error: any) {
            console.error('❌ iPhone camera permission failed:', error.name, error.message);
            console.error('Full error details:', error);
            setHasPermission(false);
            
            let errorMessage = '';
            
            switch (error.name) {
                case 'NotAllowedError':
                    errorMessage = 'Camera permission denied. For iPhone Safari:\n• Tap the camera icon in the address bar\n• Select "Allow" for camera access\n• Then tap "Try Again" below';
                    break;
                case 'NotFoundError':
                    errorMessage = 'No camera found on this device.';
                    break;
                case 'NotSupportedError':
                case 'NotReadableError':
                    errorMessage = 'Camera is not supported or in use by another application.';
                    break;
                case 'OverconstrainedError':
                    errorMessage = 'Camera constraints not supported. Trying with basic settings...';
                    // Try again with basic constraints for iOS Safari compatibility
                    try {
                        console.log('Retrying with iOS-compatible constraints...');
                        const basicStream = await navigator.mediaDevices.getUserMedia({ 
                            video: { 
                                facingMode: 'environment',
                                width: { ideal: 640 },
                                height: { ideal: 480 }
                            } 
                        });
                        basicStream.getTracks().forEach(track => track.stop());
                        console.log('✅ iOS-compatible camera access successful');
                        setHasPermission(true);
                        setPermissionError(null);
                        setTimeout(() => setIsScanning(true), 500);
                        setIsRequestingPermission(false);
                        return;
                    } catch (basicError) {
                        console.error('iOS-compatible camera request failed:', basicError);
                        errorMessage = 'Camera access failed. Please enable camera permissions in Safari Settings > Camera.';
                    }
                    break;
                case 'SecurityError':
                    errorMessage = 'Camera access blocked. Please use HTTPS or enable camera access in browser settings.';
                    break;
                case 'AbortError':
                    errorMessage = 'Camera request cancelled. Please try again and allow camera access.';
                    break;
                default:
                    errorMessage = `Camera error: ${error.message || 'Please enable camera access in your browser settings'}`;
            }
            
            console.error('Setting permission error:', errorMessage);
            setPermissionError(errorMessage);
        } finally {
            setIsRequestingPermission(false);
        }
    };

    const loadScanHistory = async () => {
        try {
            const response = await fetch('/api/barcode/history?limit=10');
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
            const response = await fetch('/api/barcode/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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
        <div className="card max-w-4xl mx-auto mobile-safe-area">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 md:mb-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-foreground">Barcode Scanner</h1>
                    <p className="text-sm text-muted-foreground">
                        {currentUser ? currentUser.name : 'Courier Scanner'}
                    </p>
                </div>
                <Package className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
            </div>

            {/* Scanner Section */}
            <div className="bg-secondary rounded-lg p-4 md:p-6 mb-4 md:mb-6">
                {hasPermission === null && !isRequestingPermission ? (
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="p-4 bg-[#FFD000] rounded-full inline-block mb-4">
                                <Package className="h-12 w-12 text-[#061A40]" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">Camera Access Required</h3>
                            <p className="text-muted-foreground mb-6">
                                To scan barcodes, we need access to your device's camera.
                                <br />
                                <span className="text-sm">Tap the button below to grant permission.</span>
                            </p>
                        </div>
                        <button
                            onClick={requestCameraPermission}
                            disabled={isRequestingPermission}
                            className="bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 rounded-lg hover:bg-primary/90 transition-colors text-base md:text-lg font-semibold shadow-lg disabled:opacity-50 min-h-[48px] w-full sm:w-auto"
                        >
                            <Zap className="h-5 w-5 md:h-6 md:w-6 mr-2 inline" />
                            Enable Camera Access
                        </button>
                    </div>
                ) : isRequestingPermission ? (
                    <div className="text-center">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Requesting camera access...</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Please allow camera access when prompted by your browser.
                        </p>
                    </div>
                ) : hasPermission === false ? (
                    <div className="text-center">
                        <div className="mb-6">
                            <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Camera Access Denied</h3>
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
                                <p className="text-sm text-red-700 dark:text-red-300">{permissionError}</p>
                            </div>
                            <div className="text-sm text-muted-foreground mb-4">
                                <p className="mb-2"><strong>To fix this:</strong></p>
                                <ul className="text-left inline-block space-y-1">
                                    <li>• Tap the camera icon in your browser's address bar</li>
                                    <li>• Select "Allow" for camera permissions</li>
                                    <li>• Or go to your browser settings and enable camera access</li>
                                    <li>• Then tap "Try Again" below</li>
                                </ul>
                            </div>
                        </div>
                        <button
                            onClick={requestCameraPermission}
                            disabled={isRequestingPermission}
                            className="bg-primary text-primary-foreground px-4 py-3 md:px-6 md:py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[48px] w-full sm:w-auto"
                        >
                            {isRequestingPermission ? 'Requesting...' : 'Try Again'}
                        </button>
                    </div>
                ) : !isScanning ? (
                    <div className="text-center">
                        <button
                            onClick={() => setIsScanning(true)}
                            disabled={loading}
                            className="bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center mx-auto disabled:opacity-50 text-base md:text-lg font-semibold shadow-lg min-h-[48px] w-full sm:w-auto"
                        >
                            <Zap className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                            {loading ? 'Processing...' : 'Start Scanning'}
                        </button>
                        <p className="text-sm text-muted-foreground mt-3">
                            Point your camera at the shipment barcode to update its status
                        </p>
                    </div>
                ) : (
                    <div>
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            <React.Suspense fallback={<div>Loading scanner...</div>}>
                                <Scanner
                                    onScan={(result: { text: string }) => {
                                        if (result && result.text) {
                                            const scannedValue = result.text;
                                        console.log('Barcode scanned:', scannedValue);
                                        handleScan(scannedValue);
                                    }
                                }}
                                onError={handleError}
                                components={{
                                    finder: true,
                                    torch: true
                                }}
                                constraints={{
                                    video: { 
                                        facingMode: { ideal: 'environment' },
                                        width: { ideal: 1280 },
                                        height: { ideal: 720 }
                                    }
                                }}
                                styles={{
                                    container: { 
                                        width: '100%', 
                                        height: '250px',
                                        minHeight: '250px',
                                        borderRadius: '8px'
                                    },
                                }}
                                formats={['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8']}
                            />
                            </React.Suspense>
                        </div>
                        <div className="mt-3 md:mt-4 text-center space-y-2">
                            <button
                                onClick={() => setIsScanning(false)}
                                className="text-muted-foreground hover:text-foreground px-4 py-2 md:px-6 md:py-3 rounded-lg border border-border hover:bg-accent transition-colors min-h-[44px] w-full sm:w-auto"
                            >
                                Cancel Scanning
                            </button>
                            <p className="text-xs text-muted-foreground">
                                Position the barcode within the square frame
                            </p>
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
            <div className="bg-card border border-border rounded-lg mobile-safe-area">
                <div className="p-3 md:p-4 border-b border-border">
                    <h2 className="text-base md:text-lg font-semibold text-card-foreground flex items-center">
                        <Clock className="h-4 w-4 md:h-5 md:w-5 mr-2 text-primary" />
                        Recent Scans
                    </h2>
                </div>
                <div className="divide-y divide-border">
                    {scanHistory.length > 0 ? scanHistory.map((scan) => (
                        <div key={scan.id} className="p-3 md:p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-card-foreground truncate">{scan.shipmentId}</p>
                                    <p className="text-sm text-muted-foreground truncate">{scan.recipientName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {scan.previousStatus} → {scan.newStatus}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-muted-foreground">
                                        {formatTime(scan.scannedAt)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-6 text-center text-muted-foreground">
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No scans yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;