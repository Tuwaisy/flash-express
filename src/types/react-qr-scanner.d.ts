declare module '@yudiel/react-qr-scanner' {
    import { FC } from 'react';

    interface ScannerProps {
        onScan: (result: { text: string }) => void;
        onError?: (error: Error) => void;
        onDecode?: (result: string) => void;
        stopDecoding?: boolean;
        constraints?: {
            video?: {
                facingMode?: { ideal: string } | string;
                width?: { ideal: number };
                height?: { ideal: number };
            };
        };
        [key: string]: any;
    }

    export const Scanner: FC<ScannerProps>;
}