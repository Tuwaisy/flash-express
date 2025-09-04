// src/views/CreateShipment.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Address, PaymentMethod, ZONES, ShipmentPriority, Shipment, User, Permission, UserRole, PartnerTier } from '../types';
import { PlusCircleIcon, UploadIcon, DownloadIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';
import Papa from 'papaparse';

type BulkShipment = Omit<Shipment, 'id' | 'clientId' | 'clientName' | 'fromAddress' | 'status' | 'creationDate' | 'isLargeOrder' | 'price' | 'clientFlatRateFee' | 'courierCommission'> & {
    amountToCollect?: number;
    csvShippingFeeIncluded?: boolean; // Temporary field for CSV processing only
};

const CreateShipment = () => {
    const { currentUser, users, addShipment, addToast, calculatePriorityPrice, hasPermission, tierSettings } = useAppContext();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('single');

    const canCreateForOthers = hasPermission(Permission.CREATE_SHIPMENTS_FOR_OTHERS);
    const clients = useMemo(() => users.filter(u => u.roles.includes(UserRole.CLIENT)), [users]);
    
    // State for Single Shipment
    const [selectedClientId, setSelectedClientId] = useState<string>(canCreateForOthers ? '' : String(currentUser?.id));
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [toAddress, setToAddress] = useState<Address>({ street: '', city: 'Cairo', zone: ZONES.GreaterCairo.Cairo[0], details: '' });
    const [packageDescription, setPackageDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
    const [priority, setPriority] = useState<ShipmentPriority>(ShipmentPriority.STANDARD);
    const [packageValue, setPackageValue] = useState('');
    const [amountReceived, setAmountReceived] = useState('');
    const [amountToCollect, setAmountToCollect] = useState('');
    const [includeShippingFee, setIncludeShippingFee] = useState(false);
    const [bulkSelectedClientId, setBulkSelectedClientId] = useState<string>(canCreateForOthers ? '' : String(currentUser?.id));
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<BulkShipment[]>([]);
    const [verificationResults, setVerificationResults] = useState<{ isValid: boolean, errors: string[] }[]>([]);

    useEffect(() => {
        if (paymentMethod === PaymentMethod.TRANSFER) {
            setPackageValue('0');
        }
    }, [paymentMethod]);

    // Phone validation function
    const isValidPhoneNumber = (phone: string): boolean => {
        // Accept 11 digits starting with 01, or 10 digits starting with 1
        return /^01\d{9}$/.test(phone) || /^1\d{9}$/.test(phone);
    };

    // Normalize phone number (add 0 if starts with 1 and is 10 digits)
    const normalizePhoneNumber = (phone: string): string => {
        if (phone.length === 10 && phone.startsWith('1')) {
            return '0' + phone;
        }
        return phone;
    };

    const clientForShipment = useMemo(() => {
        if (canCreateForOthers) {
            return clients.find(c => c.id === parseInt(selectedClientId));
        }
        return currentUser;
    }, [canCreateForOthers, selectedClientId, clients, currentUser]);

    // --- Price Calculation with Discount ---
    const numericPackageValue = parseFloat(packageValue) || 0;
    
    const { feeBeforeDiscount, discountPercentage, discountAmount, finalFee } = useMemo(() => {
        if (!clientForShipment) return { feeBeforeDiscount: 0, discountPercentage: 0, discountAmount: 0, finalFee: 0 };
    
        const fee = calculatePriorityPrice(clientForShipment.flatRateFee || 0, priority, clientForShipment);
        
        const applicableTier = clientForShipment.partnerTier
            ? tierSettings.find(t => t.tierName === clientForShipment.partnerTier)
            : null;
        
        const discountPerc = applicableTier ? applicableTier.discountPercentage : 0;
        const discountAmt = fee * (discountPerc / 100);
        const final = fee - discountAmt;

        return { feeBeforeDiscount: fee, discountPercentage: discountPerc, discountAmount: discountAmt, finalFee: final };
    }, [clientForShipment, priority, tierSettings, calculatePriorityPrice]);
    
    const totalPrice = useMemo(() => {
        if (paymentMethod === PaymentMethod.TRANSFER) {
            const baseAmount = parseFloat(amountToCollect) || 0;
            return includeShippingFee ? baseAmount + finalFee : baseAmount;
        }
        return numericPackageValue + finalFee;
    }, [paymentMethod, finalFee, numericPackageValue, amountToCollect, includeShippingFee]);


    const handleSingleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientForShipment) {
            addToast(canCreateForOthers ? 'Please select a client.' : 'User not found.', 'error');
            return;
        }
        if (!clientForShipment.address || !clientForShipment.address.street || !clientForShipment.address.city || !clientForShipment.address.zone) {
             addToast(`${clientForShipment.name} does not have a complete default address (street, city, zone) in their profile. Please update their profile first.`, 'error');
            return;
        }
        if (!isValidPhoneNumber(recipientPhone)) {
            addToast('Phone number must be 11 digits starting with 01 or 10 digits starting with 1', 'error');
            return;
        }

        const normalizedPhone = normalizePhoneNumber(recipientPhone);

        const shipment: Omit<Shipment, 'id' | 'status' | 'creationDate'> = {
            clientId: clientForShipment.id,
            clientName: clientForShipment.name,
            recipientName,
            recipientPhone: normalizedPhone,
            fromAddress: clientForShipment.address,
            toAddress,
            packageDescription,
            isLargeOrder: false,
            price: totalPrice,
            paymentMethod,
            priority,
            packageValue: numericPackageValue,
            clientFlatRateFee: finalFee,
            amountReceived: paymentMethod === PaymentMethod.TRANSFER ? (parseFloat(amountReceived) || 0) : undefined,
            amountToCollect: paymentMethod === PaymentMethod.TRANSFER ? (parseFloat(amountToCollect) || 0) : undefined,
        };

        addShipment(shipment);
        addToast('Shipment created successfully!', 'success');
        
        // Reset form
        if (canCreateForOthers) setSelectedClientId('');
        setRecipientName('');
        setRecipientPhone('');
        setToAddress({ street: '', city: 'Cairo', zone: ZONES.GreaterCairo.Cairo[0], details: '' });
        setPackageDescription('');
        setPaymentMethod(PaymentMethod.COD);
        setPriority(ShipmentPriority.STANDARD);
        setPackageValue('');
        setAmountReceived('');
        setAmountToCollect('');
    };

    const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedZone = e.target.value;
        const parentGroup = e.target.options[e.target.selectedIndex]?.parentElement?.getAttribute('label');
        setToAddress(prev => ({ 
            ...prev, 
            zone: selectedZone, 
            city: parentGroup === 'Cairo' ? 'Cairo' : parentGroup === 'Giza' ? 'Giza' : 'Cairo'
        }));
    };

    const allZones = Object.values(ZONES.GreaterCairo.Cairo).concat(Object.values(ZONES.GreaterCairo.Giza));

    // --- Bulk Upload Logic ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setParsedData([]);
            setVerificationResults([]);
        }
    };

    const handleParseAndVerify = () => {
        if (!file) {
            addToast('Please select a file to upload.', 'error');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                const shipments: BulkShipment[] = data.map(row => {
                    // Normalize phone number
                    let phone = String(row['Recipient Phone'] || '').replace(/\D/g, ''); // Remove non-digits
                    
                    // If phone starts with 1 and is 10 digits, add 0 at the beginning
                    if (phone.length === 10 && phone.startsWith('1')) {
                        phone = '0' + phone;
                    }
                    
                    // Parse amount to collect and shipping fee included
                    const amountToCollect = parseFloat(row['Amount to Collect']) || 0;
                    const shippingFeeIncluded = String(row['Shipping Fee Included']).toLowerCase() === 'true';
                    
                    return {
                        recipientName: row['Recipient Name'],
                        recipientPhone: phone,
                        toAddress: {
                            street: row['Recipient Street'],
                            city: row['City'] || 'Cairo',
                            zone: row['Zone'],
                            details: row['Address Details'] || '',
                        },
                        packageDescription: row['Package Description'],
                        paymentMethod: row['Payment Method'] as PaymentMethod,
                        priority: row['Priority'] as ShipmentPriority,
                        packageValue: parseFloat(row['Package Value']),
                        amountToCollect: amountToCollect,
                        csvShippingFeeIncluded: shippingFeeIncluded, // Temporary field for processing
                    };
                });
                setParsedData(shipments);
                verifyData(shipments);
            }
        });
    };

    const verifyData = (shipments: BulkShipment[]) => {
        const results = shipments.map(shipment => {
            const errors: string[] = [];
            const validPaymentMethods: string[] = [PaymentMethod.COD, PaymentMethod.TRANSFER];
            const validCities = ['Cairo', 'Giza'];
            const allValidZones = [...ZONES.GreaterCairo.Cairo, ...ZONES.GreaterCairo.Giza];

            if (!shipment.recipientName) errors.push('Recipient Name is required.');
            if (!shipment.recipientPhone) {
                errors.push('Recipient Phone is required.');
            } else {
                const phone = shipment.recipientPhone;
                // Accept 11 digits starting with 01, or 10 digits starting with 1 (which we normalize to 01)
                if (!/^01\d{9}$/.test(phone)) {
                    errors.push('Phone must be 11 digits starting with 01 or 10 digits starting with 1 (e.g., 01000909899 or 1000909899).');
                }
            }
            if (!shipment.toAddress.street) errors.push('Recipient Street is required.');
            if (!validCities.includes(shipment.toAddress.city)) errors.push('City must be Cairo or Giza.');
            if (!allValidZones.includes(shipment.toAddress.zone)) errors.push('Invalid Zone for selected city.');
            if (!validPaymentMethods.includes(shipment.paymentMethod)) errors.push('Invalid Payment Method. Must be COD or Transfer.');
            if (!Object.values(ShipmentPriority).includes(shipment.priority)) errors.push('Invalid Priority.');
            if (isNaN(shipment.packageValue) || (shipment.paymentMethod === PaymentMethod.COD && shipment.packageValue <= 0)) {
                errors.push('Invalid Package Value for COD.');
            }
            
            return { isValid: errors.length === 0, errors };
        });
        setVerificationResults(results);
    };

    const handleBulkUpload = () => {
        const clientForBulk = users.find(u => u.id === parseInt(bulkSelectedClientId));

        if (!clientForBulk) {
            addToast('Please select a client to upload for.', 'error');
            return;
        }
        if (!clientForBulk.address) {
            addToast(`Client ${clientForBulk.name} does not have a default address.`, 'error');
            return;
        }

        const validShipments = parsedData.filter((_, index) => verificationResults[index]?.isValid);

        if (validShipments.length === 0) {
            addToast('No valid shipments to upload.', 'error');
            return;
        }
        
        validShipments.forEach(shipment => {
             const baseFee = clientForBulk.flatRateFee || 0;
             const priorityAdjustedFee = calculatePriorityPrice(baseFee, shipment.priority, clientForBulk);
             
             let calculatedPrice;
             let finalAmountToCollect = 0;
             
             if (shipment.paymentMethod === PaymentMethod.TRANSFER) {
                 // For Transfer: Use amount to collect from CSV, optionally including shipping fee
                 const baseAmountToCollect = shipment.amountToCollect || 0;
                 finalAmountToCollect = shipment.csvShippingFeeIncluded ? baseAmountToCollect + priorityAdjustedFee : baseAmountToCollect;
                 calculatedPrice = finalAmountToCollect;
             } else { // COD
                 calculatedPrice = (shipment.packageValue || 0) + priorityAdjustedFee;
             }
            
            // Remove CSV processing fields before creating shipment
            const { csvShippingFeeIncluded, ...cleanShipment } = shipment;
            
            addShipment({
                ...cleanShipment,
                 isLargeOrder: false,
                 price: calculatedPrice,
                 clientFlatRateFee: priorityAdjustedFee,
                 clientId: clientForBulk.id,
                 clientName: clientForBulk.name,
                 fromAddress: clientForBulk.address!,
                 amountToCollect: shipment.paymentMethod === PaymentMethod.TRANSFER ? finalAmountToCollect : undefined,
            });
        });
        
        addToast(`${validShipments.length} shipments uploaded successfully for ${clientForBulk.name}!`, 'success');
        setFile(null);
        setParsedData([]);
        setVerificationResults([]);
    };
    
    const downloadTemplate = () => {
        const headers = [
            'Recipient Name', 'Recipient Phone', 
            'Recipient Street', 'City', 'Zone', 'Address Details',
            'Package Description', 'Payment Method', 'Priority', 'Package Value',
            'Amount to Collect', 'Shipping Fee Included'
        ];
        
        const baseFee = currentUser?.flatRateFee || 75;
        const standardFee = currentUser ? calculatePriorityPrice(baseFee, ShipmentPriority.STANDARD, currentUser) : baseFee;
        const urgentFee = currentUser ? calculatePriorityPrice(baseFee, ShipmentPriority.URGENT, currentUser) : baseFee * 1.5;
        const expressFee = currentUser ? calculatePriorityPrice(baseFee, ShipmentPriority.EXPRESS, currentUser) : baseFee * 2.0;

        const cairoZones = ZONES.GreaterCairo.Cairo.join(' | ');
        const gizaZones = ZONES.GreaterCairo.Giza.join(' | ');
        
        const templateData = [
            headers,
            // Complete Cairo zones in order
            ['Ahmed Hassan', '01123456789', '15 Tahrir Square', 'Cairo', 'Nasr City', 'Apartment 3, Floor 2', 'Electronics - Mobile Phone', 'COD', 'Standard', '800.00', '875.00', 'TRUE'],
            ['Fatma Ali', '1234567890', '25 Nile Corniche', 'Cairo', 'Heliopolis', 'Villa 12, Ground Floor', 'Books and Stationery', 'Transfer', 'Urgent', '300.00', '350.00', 'TRUE'],
            ['Mohamed Sayed', '01987654321', '45 New Cairo St', 'Cairo', 'New Cairo', 'Flat 7, Floor 4', 'Clothing - Jacket', 'COD', 'Express', '250.00', '375.00', 'TRUE'],
            ['Nour Ibrahim', '1555666777', '78 5th Settlement Rd', 'Cairo', '5th Settlement', 'Building 5, Floor 1', 'Home Appliances', 'Transfer', 'Standard', '1200.00', '0.00', 'FALSE'],
            ['Omar Khaled', '01444555666', '12 3rd Settlement Ave', 'Cairo', '3rd Settlement', 'Apartment 15, Floor 8', 'Sports Equipment', 'COD', 'Urgent', '600.00', '687.50', 'TRUE'],
            ['Layla Ahmed', '1333444555', '33 1st Settlement Blvd', 'Cairo', '1st Settlement', 'Villa 3, Second Floor', 'Baby Products', 'Transfer', 'Express', '400.00', '500.00', 'TRUE'],
            ['Youssef Mahmoud', '01222333444', '56 Rehab City St', 'Cairo', 'Rehab City', 'Building 22, Floor 3', 'Electronics - Laptop', 'COD', 'Standard', '2500.00', '2575.00', 'TRUE'],
            ['Maha Mostafa', '1111222333', '89 Madinty Blvd', 'Cairo', 'Madinty', 'Apartment 8, Floor 6', 'Beauty Products', 'Transfer', 'Urgent', '150.00', '225.00', 'TRUE'],
            ['Karim Fathy', '01999888777', '67 El Shorouk Ave', 'Cairo', 'El Shorouk', 'Villa 7, Ground Floor', 'Automotive Parts', 'COD', 'Express', '350.00', '475.00', 'TRUE'],
            ['Sara Nabil', '1888777666', '44 El Obour City', 'Cairo', 'El Obour', 'Building 11, Floor 2', 'Toys and Games', 'Transfer', 'Standard', '180.00', '0.00', 'FALSE'],
            ['Tamer Adel', '01777666555', '23 Maadi St', 'Cairo', 'Maadi', 'Apartment 19, Floor 5', 'Health Supplements', 'COD', 'Urgent', '320.00', '407.50', 'TRUE'],
            ['Dina Essam', '1666555444', '78 Zahraa El Maadi', 'Cairo', 'Zahraa El Maadi', 'Villa 14, First Floor', 'Kitchen Appliances', 'Transfer', 'Express', '900.00', '1025.00', 'TRUE'],
            ['Hany Salah', '01555444333', '90 Katameya Heights', 'Cairo', 'Katameya', 'Building 8, Floor 4', 'Computer Accessories', 'COD', 'Standard', '220.00', '295.00', 'TRUE'],
            ['Rania Gamal', '1444333222', '34 Mokattam Hills', 'Cairo', 'Mokattam', 'Apartment 6, Floor 3', 'Fashion Accessories', 'Transfer', 'Urgent', '280.00', '350.00', 'TRUE'],
            ['Sherif Wael', '01333222111', '67 Downtown Cairo', 'Cairo', 'Downtown Cairo', 'Villa 9, Second Floor', 'Office Supplies', 'COD', 'Express', '160.00', '285.00', 'TRUE'],
            ['Noha Tarek', '1222111000', '45 Garden City', 'Cairo', 'Garden City', 'Building 13, Floor 7', 'Pet Supplies', 'Transfer', 'Standard', '130.00', '0.00', 'FALSE'],
            ['Amr Hosny', '01111000999', '89 Zamalek St', 'Cairo', 'Zamalek', 'Apartment 21, Floor 6', 'Music Instruments', 'COD', 'Urgent', '750.00', '837.50', 'TRUE'],
            ['Eman Farid', '1000999888', '12 Shubra St', 'Cairo', 'Shubra', 'Building 4, Floor 1', 'Household Items', 'Transfer', 'Express', '95.00', '170.00', 'TRUE'],
            ['Mahmoud Reda', '01999888111', '56 Abbassia Sq', 'Cairo', 'Abbassia', 'Apartment 11, Floor 5', 'Garden Tools', 'COD', 'Standard', '180.00', '255.00', 'TRUE'],
            ['Yasmin Fouad', '1888777000', '78 Ain Shams', 'Cairo', 'Ain Shams', 'Villa 2, Ground Floor', 'Craft Supplies', 'Transfer', 'Urgent', '140.00', '215.00', 'TRUE'],
            ['Ahmed Samir', '01777666000', '23 El Marg', 'Cairo', 'El Marg', 'Building 7, Floor 2', 'Electrical Tools', 'COD', 'Express', '290.00', '415.00', 'TRUE'],
            ['Mariam Said', '1666555000', '45 Matariya', 'Cairo', 'Matariya', 'Apartment 14, Floor 4', 'Educational Books', 'Transfer', 'Standard', '110.00', '0.00', 'FALSE'],
            ['Hassan Omar', '01555444000', '67 Helwan', 'Cairo', 'Helwan', 'Villa 6, First Floor', 'Medical Equipment', 'COD', 'Urgent', '850.00', '937.50', 'TRUE'],
            ['Nadine Adham', '1444333000', '89 15th of May City', 'Cairo', '15th of May City', 'Building 9, Floor 3', 'Art Supplies', 'Transfer', 'Express', '200.00', '275.00', 'TRUE'],
            ['Khaled Ashraf', '01333222000', '12 New Capital', 'Cairo', 'New Administrative Capital', 'Apartment 25, Floor 8', 'Furniture', 'COD', 'Standard', '1500.00', '1575.00', 'TRUE'],
            // Complete Giza zones in order
            ['Nadia Youssef', '1222111999', '34 Mohandessin', 'Giza', 'Mohandessin', 'Building 16, Floor 6', 'Jewelry', 'Transfer', 'Urgent', '600.00', '675.00', 'TRUE'],
            ['Bassam Kamal', '01111000888', '56 Dokki St', 'Giza', 'Dokki', 'Apartment 12, Floor 4', 'Shoes', 'COD', 'Express', '320.00', '445.00', 'TRUE'],
            ['Reem Mansour', '1000999777', '78 Agouza', 'Giza', 'Agouza', 'Villa 8, Second Floor', 'Perfumes', 'Transfer', 'Standard', '250.00', '0.00', 'FALSE'],
            ['Tarek Zaki', '01999888000', '90 Haram St', 'Giza', 'Haram', 'Building 3, Floor 1', 'Souvenirs', 'COD', 'Urgent', '120.00', '207.50', 'TRUE'],
            ['Salma Nasser', '1888777999', '23 Faisal St', 'Giza', 'Faisal', 'Apartment 17, Floor 7', 'Mobile Accessories', 'Transfer', 'Express', '85.00', '160.00', 'TRUE'],
            ['Mostafa Galal', '01777666999', '45 Giza Square', 'Giza', 'Giza Square', 'Villa 11, Ground Floor', 'Board Games', 'COD', 'Standard', '95.00', '170.00', 'TRUE'],
            ['Hala Magdy', '1666555999', '67 Imbaba', 'Giza', 'Imbaba', 'Building 12, Floor 5', 'Skincare Products', 'Transfer', 'Urgent', '170.00', '245.00', 'TRUE'],
            ['Waleed Saad', '01555444999', '89 Boulak El Dakrour', 'Giza', 'Boulak El Dakrour', 'Apartment 20, Floor 2', 'Phone Cases', 'COD', 'Express', '45.00', '170.00', 'TRUE'],
            ['Dalia Fahmy', '1444333999', '12 Warraq', 'Giza', 'Warraq', 'Villa 4, First Floor', 'Fitness Equipment', 'Transfer', 'Standard', '400.00', '0.00', 'FALSE'],
            ['Ayman Helmy', '01333222999', '34 6th October', 'Giza', '6th of October City', 'Building 18, Floor 3', 'Video Games', 'COD', 'Urgent', '280.00', '367.50', 'TRUE'],
            ['Ghada Sameh', '1222111888', '56 Sheikh Zayed', 'Giza', 'Sheikh Zayed', 'Apartment 9, Floor 6', 'Handbags', 'Transfer', 'Express', '350.00', '425.00', 'TRUE'],
            ['Ragab Mohsen', '01111000777', '78 Hadayek October', 'Giza', 'Hadayek October', 'Villa 15, Second Floor', 'Tools', 'COD', 'Standard', '190.00', '265.00', 'TRUE'],
            ['Mona Abdel', '1000999666', '90 Mansoureya', 'Giza', 'Mansoureya', 'Building 6, Floor 4', 'Cosmetics', 'Transfer', 'Urgent', '130.00', '205.00', 'TRUE'],
            ['Islam Rizk', '01999888666', '23 Nazlet El Semman', 'Giza', 'Nazlet El Semman', 'Apartment 13, Floor 1', 'Camera Equipment', 'COD', 'Express', '650.00', '775.00', 'TRUE'],
            ['Nesma Lotfy', '1888777888', '45 Maryoteya', 'Giza', 'Maryoteya', 'Villa 10, Ground Floor', 'Travel Accessories', 'Transfer', 'Standard', '220.00', '0.00', 'FALSE'],
            ['Adel Farouk', '01777666888', '67 Bahariya Oasis Road', 'Giza', 'Bahariya Oasis Road', 'Building 14, Floor 5', 'Camping Gear', 'COD', 'Urgent', '380.00', '467.50', 'TRUE']
        ];
        
        const csv = Papa.unparse(templateData);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'bulk_upload_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const allVerified = verificationResults.length > 0 && verificationResults.every(r => r.isValid);


    return (
        <div className="card max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6">{t('nav.createShipment')}</h2>

            <div className="border-b border-border mb-6">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('single')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'single' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                        {t('createSingleShipment')}
                    </button>
                    <button onClick={() => setActiveTab('bulk')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'bulk' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                        {t('bulkUploadShipments')}
                    </button>
                </nav>
            </div>

            {activeTab === 'single' && (
                <form onSubmit={handleSingleSubmit} className="space-y-6">
                    {canCreateForOthers && (
                         <div className="p-4 bg-secondary rounded-lg">
                            <label className="block text-sm font-medium text-foreground mb-1">{t('createShipmentForClient')}</label>
                            <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary text-foreground bg-background" required>
                                <option value="" disabled>{t('selectClient')}</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {/* Recipient Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t('recipientName')}</label>
                            <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary text-foreground bg-background" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t('recipientPhone')}</label>
                            <input 
                                type="text" 
                                inputMode="numeric" 
                                pattern="[0-9]*" 
                                value={recipientPhone} 
                                onChange={e => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    // Allow up to 11 digits for input
                                    if (value.length <= 11) {
                                        setRecipientPhone(value);
                                    }
                                }} 
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-primary focus:border-primary text-foreground bg-background ${
                                    recipientPhone.length > 0 && !isValidPhoneNumber(recipientPhone) ? 'border-red-500' : 'border-border'
                                }`}
                                placeholder="01000909899 or 1000909899" 
                                required 
                            />
                            <p className="text-xs text-muted-foreground mt-1">11 digits starting with 01 or 10 digits starting with 1</p>
                            {recipientPhone.length > 0 && !isValidPhoneNumber(recipientPhone) && (
                                <p className="text-xs text-red-500 mt-1">Phone must be 11 digits starting with 01 or 10 digits starting with 1</p>
                            )}
                        </div>
                    </div>
                    {/* Address Info */}
                     <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Recipient Street Address</label>
                        <input type="text" value={toAddress.street} onChange={e => setToAddress(prev => ({ ...prev, street: e.target.value }))} className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Zone</label>
                            <select value={toAddress.zone} onChange={handleZoneChange} className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background">
                                <optgroup label="Cairo">
                                    {ZONES.GreaterCairo.Cairo.map(z => <option key={z} value={z}>{z}</option>)}
                                </optgroup>
                                <optgroup label="Giza">
                                    {ZONES.GreaterCairo.Giza.map(z => <option key={z} value={z}>{z}</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Address Details (Apt, Floor, etc.)</label>
                            <input type="text" value={toAddress.details} onChange={e => setToAddress(prev => ({ ...prev, details: e.target.value }))} className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" />
                        </div>
                    </div>

                    {/* Package Info */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Package Description</label>
                        <textarea value={packageDescription} onChange={e => setPackageDescription(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" rows={2} required></textarea>
                    </div>

                     {/* Financial Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Payment Method</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background">
                                <option value={PaymentMethod.COD}>Cash on Delivery (COD)</option>
                                <option value={PaymentMethod.TRANSFER}>InstaPay (Pre-paid)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as ShipmentPriority)} className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background">
                                {Object.values(ShipmentPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Package Value (EGP)</label>
                            <input type="number" step="0.01" value={packageValue} onChange={e => setPackageValue(e.target.value)} disabled={paymentMethod === PaymentMethod.TRANSFER} className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" required />
                        </div>
                    </div>
                    
                    {paymentMethod === PaymentMethod.TRANSFER && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Amount Received from Client</label>
                                    <input type="number" step="0.01" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" placeholder="e.g., 500" required />
                                    <p className="text-xs text-muted-foreground mt-1">The amount you already collected.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Amount to Collect from Recipient</label>
                                    <input type="number" step="0.01" value={amountToCollect} onChange={e => setAmountToCollect(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" placeholder="e.g., 200" required />
                                    <p className="text-xs text-muted-foreground mt-1">Amount courier will collect (0 if none).</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                <input 
                                    type="checkbox" 
                                    id="includeShippingFee" 
                                    checked={includeShippingFee} 
                                    onChange={e => setIncludeShippingFee(e.target.checked)}
                                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                                />
                                <label htmlFor="includeShippingFee" className="text-sm font-medium text-foreground cursor-pointer">
                                    Include shipping fee ({(Number(finalFee) || 0).toFixed(2)} EGP) in total amount to collect
                                </label>
                            </div>
                        </div>
                    )}
                    
                    {/* Pricing Summary */}
                    <div className="p-4 bg-secondary rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Base Shipping Fee:</span>
                            <span className="font-semibold text-foreground">{(Number(feeBeforeDiscount) || 0).toFixed(2)} EGP</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                <div>
                                    <span className="text-muted-foreground">Partner Discount </span>
                                    <span className="font-semibold">({clientForShipment?.partnerTier} - {discountPercentage}%)</span>
                                </div>
                                <span className="font-semibold">- {(Number(discountAmount) || 0).toFixed(2)} EGP</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold">Final Shipping Fee:</span>
                            <span className="font-bold text-foreground">{(Number(finalFee) || 0).toFixed(2)} EGP</span>
                        </div>
                         <div className="flex justify-between text-sm pt-2 border-t border-border">
                            <span className="text-muted-foreground">Package Value:</span>
                            <span className="font-semibold text-foreground">{(Number(numericPackageValue) || 0).toFixed(2)} EGP</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2">
                            <span className="text-foreground">
                                {paymentMethod === PaymentMethod.TRANSFER ? 'Total to Collect from Recipient:' : 'Total to Collect (COD):'}
                            </span>
                            <span className="text-primary">{(Number(totalPrice) || 0).toFixed(2)} EGP</span>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end">
                        <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition shadow-lg">
                            <PlusCircleIcon />
                            Create Shipment
                        </button>
                    </div>
                </form>
            )}
            {activeTab === 'bulk' && (
                <div className="space-y-6">
                    {canCreateForOthers && (
                        <div className="p-4 bg-secondary rounded-lg">
                            <label className="block text-sm font-medium text-foreground mb-1">Upload Shipments For Client</label>
                            <select value={bulkSelectedClientId} onChange={e => setBulkSelectedClientId(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary text-foreground bg-background" required>
                                <option value="" disabled>Select a client...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row items-center gap-4 p-4 border-2 border-dashed border-border rounded-lg">
                        <input type="file" accept=".csv" onChange={handleFileChange} className="text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                        <button onClick={downloadTemplate} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-accent transition text-sm">
                            <DownloadIcon className="w-4 h-4" /> Download Template
                        </button>
                         <button onClick={handleParseAndVerify} disabled={!file} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-sm disabled:bg-muted">
                            <UploadIcon className="w-4 h-4" /> Verify File
                        </button>
                    </div>

                    {verificationResults.length > 0 && (
                        <div className="space-y-4">
                            <div className="p-4 bg-secondary rounded-lg">
                                <h3 className="font-bold text-lg text-foreground">Verification Results</h3>
                                <p className="text-foreground">{parsedData.length} rows found. {parsedData.length - verificationResults.filter(r => !r.isValid).length} valid shipments.</p>
                            </div>

                            <div className="max-h-80 overflow-y-auto space-y-2">
                                {parsedData.map((shipment, index) => (
                                    <div key={index} className={`p-3 rounded-lg border ${verificationResults[index].isValid ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
                                        <div className="flex items-start gap-3">
                                            {verificationResults[index].isValid ? <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5"/> : <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5"/>}
                                            <div>
                                                <p className="font-semibold text-foreground">{shipment.recipientName} - {shipment.toAddress.zone}</p>
                                                {!verificationResults[index].isValid && (
                                                    <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 mt-1">
                                                        {verificationResults[index].errors.map((err, i) => <li key={i}>{err}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end">
                                 <button onClick={handleBulkUpload} disabled={!allVerified} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition shadow-lg disabled:bg-muted">
                                    <PlusCircleIcon />
                                    Upload Valid Shipments
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CreateShipment;