
import React, { useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';

export const BarcodeScanner: React.FC<{ onScanSuccess: (decodedText: string) => void; }> = ({ onScanSuccess }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            'reader', 
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        const handleSuccess = (decodedText: string) => {
            scanner.clear();
            onScanSuccess(decodedText);
        };

        const handleError = (_error: any) => {
            // This is called continuously, so we don't log it to avoid spam.
        };
        
        scanner.render(handleSuccess, handleError);

        // Cleanup function to stop the scanner when the component unmounts
        return () => {
            if (scanner && scanner.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
                 scanner.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode-scanner.", error);
                 });
            }
        };
    }, [onScanSuccess]);

    return <div id="reader" className="w-full"></div>;
};
