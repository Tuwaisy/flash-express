import React from 'react';
import { Shipment, PaymentMethod } from '../../types';
import { LogoIcon } from '../Icons';

// --- Code 39 Barcode Generation Logic ---
const CODE39_MAP: { [key: string]: string } = {
    '0': 'bwbwwwbbw', '1': 'bbwbwwwbw', '2': 'bwbbwwwbw', '3': 'bbbbwwwbw',
    '4': 'bwbwbbwbw', '5': 'bbwbwbbwbw', '6': 'bwbbwbbwbw', '7': 'bwbwwwbbwbw',
    '8': 'bbwbwwbbw', '9': 'bwbbwwbbw', 'A': 'bbwbwwwbbw', 'B': 'bwbbwwwbbw',
    'C': 'bbbbwwwbbw', 'D': 'bwbwbbwbbw', 'E': 'bbwbwbbwbbw', 'F': 'bwbbwbbwbbw',
    'G': 'bwbwwwbbbwbw', 'H': 'bbwbwwwbbbwbw', 'I': 'bwbbwwwbbbwbw', 'J': 'bwbwbbwbbbwbw',
    'K': 'bbwbwwwbwbw', 'L': 'bwbbwwwbwbw', 'M': 'bbbbwwwbwbw', 'N': 'bwbwbbwbwbw',
    'O': 'bbwbwbbwbwbw', 'P': 'bwbbwbbwbwbw', 'Q': 'bwbwwwbbwbwbw', 'R': 'bbwbwwbbwbw',
    'S': 'bwbbwwbbwbw', 'T': 'bwbwbbwbbwbw', 'U': 'bbwbbwbwwwbw', 'V': 'bwwbbwbwwwbw',
    'W': 'bbwbbwbbwwwbw', 'X': 'bwwbwbwbbwbw', 'Y': 'bbwbwbwbbwbw', 'Z': 'bwwbwbwbbwbw',
    '-': 'bwwbwbwwwbw', '.': 'bbwbwbwwwbw', ' ': 'bwwbbwbwwwbw', '$': 'bwwbwwbwwbwbw',
    '/': 'bwwbwwbwbwwbw', '+': 'bwwbwbwwbwwbw', '%': 'bwbwwbwwbwwbw',
    '*': 'bwwbwbbwbwwwbw' // Start/Stop character
};

const generateBarcodeSVG = (text: string) => {
    const fullText = `*${text.toUpperCase().replace(/[^A-Z0-9-]/g, '')}*`;
    let path = '';
    let currentX = 0;
    const barWidth = 1.5;
    const wideBarWidth = barWidth * 2.5;
    
    for (const char of fullText) {
        const encoding = CODE39_MAP[char];
        if (encoding) {
            for (let i = 0; i < encoding.length; i++) {
                const isBar = i % 2 === 0;
                const isWide = encoding[i] === 'B' || encoding[i] === 'w';
                const width = isWide ? wideBarWidth : barWidth;
                
                if (isBar) {
                    path += `M${currentX},0 V60 `;
                }
                currentX += width;
            }
             // Add inter-character gap
            currentX += barWidth;
        }
    }

    return (
        <svg x="0px" y="0px" viewBox={`0 0 ${currentX} 60`} className="w-full h-12">
            <path d={path} stroke="#000000" strokeWidth={barWidth} />
        </svg>
    );
};
// --- End Barcode Logic ---

export const ShipmentLabel: React.FC<{ shipment: Shipment }> = ({ shipment }) => {

    const shippingFee = shipment.clientFlatRateFee || (shipment.price - shipment.packageValue);
    const serialNumber = shipment.id.split('-').slice(2).join('-');

    return (
        <div className="bg-white p-8 border-4 border-dashed border-slate-300 w-full printable-label-container">
            <div className="printable-label" style={{ fontFamily: 'sans-serif', color: 'black' }}>
                <header className="flex justify-between items-center pb-4 border-b-2 border-black">
                    <div className="flex items-center gap-3">
                         <LogoIcon className="w-12 h-12"/>
                         <div>
                            <h1 className="text-2xl font-extrabold text-black">Flash Express</h1>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm">Date: {new Date(shipment.creationDate).toLocaleDateString()}</p>
                        <p className="text-sm">Shipment ID:</p>
                        <p className="font-bold font-mono text-lg">{shipment.id}</p>
                    </div>
                </header>
                <main className="grid grid-cols-2 gap-8 my-8">
                    <div className="pr-8 border-r-2 border-dashed border-slate-400">
                        <h2 className="text-xs font-bold uppercase text-slate-600 mb-2">FROM</h2>
                        <p className="font-bold text-lg">{shipment.clientName}</p>
                        <p>{shipment.fromAddress.street}, {shipment.fromAddress.details}</p>
                        <p>{shipment.fromAddress.city}, {shipment.fromAddress.zone}</p>
                    </div>
                     <div>
                        <h2 className="text-xs font-bold uppercase text-slate-600 mb-2">TO</h2>
                        <p className="font-bold text-xl">{shipment.recipientName}</p>
                        <p className="text-lg">{shipment.toAddress.street}, {shipment.toAddress.details}</p>
                        <p className="text-lg">{shipment.toAddress.city}, {shipment.toAddress.zone}</p>
                        <p className="font-bold text-lg mt-2">Phone: {shipment.recipientPhone}</p>
                    </div>
                </main>
                <footer className="border-t-2 border-black pt-4">
                     <div className="grid grid-cols-2 gap-8">
                        <div>
                             <p className="text-xs uppercase font-bold text-slate-600">Payment Details</p>
                             <p className="text-2xl font-bold">{shipment.paymentMethod}</p>
                             {shipment.paymentMethod === PaymentMethod.COD && (
                                <div className="mt-2">
                                    <div className="flex justify-between text-sm"><span>Package Value:</span> <span>{(Number(shipment.packageValue) || 0).toFixed(2)} EGP</span></div>
                                    <div className="flex justify-between text-sm"><span>Shipping Fee:</span> <span>{(Number(shippingFee) || 0).toFixed(2)} EGP</span></div>
                                    <div className="flex justify-between text-xl font-extrabold mt-1 border-t border-black pt-1"><span>COD Amount:</span> <span className="text-green-600">{(Number(shipment.price) || 0).toFixed(2)} EGP</span></div>
                                </div>
                             )}
                             <p className="text-xs uppercase font-bold text-slate-600 mt-4">Package</p>
                             <p>{shipment.packageDescription}{shipment.isLargeOrder && ' (Large Order)'}</p>
                        </div>
                        <div className="text-center">
                            {generateBarcodeSVG(serialNumber)}
                            <p className="font-mono tracking-widest text-sm mt-1">{shipment.id}</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};