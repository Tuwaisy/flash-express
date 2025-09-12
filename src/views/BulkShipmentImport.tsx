import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { DocumentDownloadIcon, UploadIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';

export const BulkShipmentImport: React.FC = () => {
    const { addToast } = useAppContext();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
                addToast('Please select a CSV file', 'error');
                return;
            }
            setFile(selectedFile);
            setResults(null);
            parseCSVForPreview(selectedFile);
        }
    };

    const parseCSVForPreview = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            const data = lines.slice(1, 6).map((line, index) => { // Preview first 5 rows
                const values = line.split(',').map(v => v.trim());
                const row: any = { rowIndex: index + 1 };
                headers.forEach((header, i) => {
                    row[header] = values[i] || '';
                });
                return row;
            }).filter(row => Object.values(row).some(val => val !== ''));

            setPreviewData(data);
        };
        reader.readAsText(file);
    };

    const parseCSV = (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const lines = text.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim());
                    
                    const data = lines.slice(1).map(line => {
                        const values = line.split(',').map(v => v.trim());
                        const row: any = {};
                        headers.forEach((header, i) => {
                            // Map CSV headers to expected field names
                            const fieldMapping: { [key: string]: string } = {
                                'Client Email': 'clientEmail',
                                'Recipient Name': 'recipientName',
                                'Recipient Phone': 'recipientPhone',
                                'Package Description': 'packageDescription',
                                'Package Value (EGP)': 'packageValue',
                                'From Street': 'fromStreet',
                                'From Details': 'fromDetails',
                                'From City': 'fromCity',
                                'From Zone': 'fromZone',
                                'To Street': 'toStreet',
                                'To Details': 'toDetails',
                                'To City': 'toCity',
                                'To Zone': 'toZone',
                                'Payment Method': 'paymentMethod',
                                'Amount to Collect': 'amountToCollect',
                                'Is Large Order': 'isLargeOrder',
                                'Package Weight (kg)': 'packageWeight',
                                'Package Dimensions (LxWxH cm)': 'packageDimensions',
                                'Notes': 'notes'
                            };
                            
                            const fieldName = fieldMapping[header] || header;
                            row[fieldName] = values[i] || '';
                        });
                        return row;
                    }).filter(row => Object.values(row).some(val => val !== ''));
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    };

    const handleImport = async () => {
        if (!file) {
            addToast('Please select a file first', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const shipments = await parseCSV(file);
            
            if (shipments.length === 0) {
                addToast('No valid shipments found in the file', 'error');
                setIsProcessing(false);
                return;
            }

            const response = await fetch('/api/shipments/bulk-import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ shipments }),
            });

            const result = await response.json();

            if (response.ok) {
                setResults(result.results);
                addToast(result.message, 'success');
            } else {
                addToast(result.error || 'Import failed', 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            addToast('Failed to process import', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadTemplate = () => {
        // Create template CSV content
        const headers = [
            'Client Email',
            'Recipient Name', 
            'Recipient Phone',
            'Package Description',
            'Package Value (EGP)',
            'From Street',
            'From Details',
            'From City', 
            'From Zone',
            'To Street',
            'To Details',
            'To City',
            'To Zone',
            'Payment Method',
            'Amount to Collect',
            'Is Large Order',
            'Package Weight (kg)',
            'Package Dimensions (LxWxH cm)',
            'Notes'
        ];

        const sampleData = [
            [
                'testclient@shuhna.com',
                'John Doe',
                '+201234567890',
                'Electronics - Smartphone',
                '500',
                '123 Main St',
                'Apt 101',
                'Cairo',
                'Nasr City',
                '456 Oak Ave',
                'Building 5',
                'Alexandria',
                'Downtown',
                'COD',
                '520',
                'FALSE',
                '0.5',
                '15x10x5',
                'Sample shipment 1'
            ],
            [
                'testclient@shuhna.com',
                'Jane Smith',
                '+201987654321',
                'Clothing - T-Shirt',
                '150',
                '123 Main St',
                'Apt 101',
                'Cairo',
                'Nasr City',
                '789 Pine St',
                'Floor 3',
                'Giza',
                'Dokki',
                'Transfer',
                '0',
                'FALSE',
                '0.3',
                '20x15x2',
                'Sample shipment 2'
            ]
        ];

        const csvContent = [headers, ...sampleData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'bulk-shipments-template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">Bulk Shipment Import</h2>
                <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <DocumentDownloadIcon className="w-5 h-5" />
                    Download Template
                </button>
            </div>

            <div className="card">
                <div className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Instructions</h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>1. Download the CSV template above</p>
                        <p>2. Fill in your shipment data following the format</p>
                        <p>3. Save the file and upload it below</p>
                        <p>4. Review the preview and click Import to process</p>
                    </div>
                    
                    <div className="mt-4">
                        <label htmlFor="csv-file" className="block text-sm font-medium text-foreground mb-2">
                            Select CSV File
                        </label>
                        <input
                            id="csv-file"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                    </div>

                    {previewData.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-lg font-semibold text-foreground mb-3">Preview (First 5 rows)</h4>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-secondary">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Row</th>
                                            <th className="px-3 py-2 text-left">Client Email</th>
                                            <th className="px-3 py-2 text-left">Recipient</th>
                                            <th className="px-3 py-2 text-left">Phone</th>
                                            <th className="px-3 py-2 text-left">Description</th>
                                            <th className="px-3 py-2 text-left">Value</th>
                                            <th className="px-3 py-2 text-left">Payment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {previewData.map((row, index) => (
                                            <tr key={index}>
                                                <td className="px-3 py-2">{row.rowIndex}</td>
                                                <td className="px-3 py-2">{row['Client Email']}</td>
                                                <td className="px-3 py-2">{row['Recipient Name']}</td>
                                                <td className="px-3 py-2">{row['Recipient Phone']}</td>
                                                <td className="px-3 py-2">{row['Package Description']}</td>
                                                <td className="px-3 py-2">{row['Package Value (EGP)']}</td>
                                                <td className="px-3 py-2">{row['Payment Method']}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {file && (
                        <div className="flex justify-end">
                            <button
                                onClick={handleImport}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                            >
                                <UploadIcon className="w-5 h-5" />
                                {isProcessing ? 'Processing...' : 'Import Shipments'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {results && (
                <div className="card">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Import Results</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                    <span className="text-green-800 dark:text-green-200 font-semibold">Successful</span>
                                </div>
                                <p className="text-2xl font-bold text-green-600">{results.successful.length}</p>
                            </div>
                            
                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <XCircleIcon className="w-5 h-5 text-red-600" />
                                    <span className="text-red-800 dark:text-red-200 font-semibold">Failed</span>
                                </div>
                                <p className="text-2xl font-bold text-red-600">{results.failed.length}</p>
                            </div>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-800 dark:text-blue-200 font-semibold">Total</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-600">{results.total}</p>
                            </div>
                        </div>

                        {results.successful.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-semibold text-green-600 mb-2">✅ Successfully Created Shipments</h4>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-green-50 dark:bg-green-900/20">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Row</th>
                                                <th className="px-3 py-2 text-left">Shipment ID</th>
                                                <th className="px-3 py-2 text-left">Client</th>
                                                <th className="px-3 py-2 text-left">Recipient</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {results.successful.map((item: any, index: number) => (
                                                <tr key={index}>
                                                    <td className="px-3 py-2">{item.rowIndex}</td>
                                                    <td className="px-3 py-2 font-mono">{item.shipmentId}</td>
                                                    <td className="px-3 py-2">{item.clientEmail}</td>
                                                    <td className="px-3 py-2">{item.recipientName}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {results.failed.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-red-600 mb-2">❌ Failed Shipments</h4>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-red-50 dark:bg-red-900/20">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Row</th>
                                                <th className="px-3 py-2 text-left">Error</th>
                                                <th className="px-3 py-2 text-left">Recipient</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {results.failed.map((item: any, index: number) => (
                                                <tr key={index}>
                                                    <td className="px-3 py-2">{item.rowIndex}</td>
                                                    <td className="px-3 py-2 text-red-600">{item.error}</td>
                                                    <td className="px-3 py-2">{item.data?.recipientName || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
