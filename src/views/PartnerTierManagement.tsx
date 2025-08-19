// src/views/PartnerTierManagement.tsx

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { TierSetting, PartnerTier } from '../types';
import { ShieldIcon, AwardIcon, CrownIcon } from '../components/Icons';

const PartnerTierManagement = () => {
    const { tierSettings, updateTierSettings, addToast } = useAppContext();
    const [localSettings, setLocalSettings] = useState<TierSetting[]>([]);

    useEffect(() => {
        // Sort settings by threshold for consistent display
        const sorted = [...tierSettings].sort((a, b) => a.shipmentThreshold - b.shipmentThreshold);
        setLocalSettings(sorted);
    }, [tierSettings]);

    const handleInputChange = (tierName: PartnerTier, field: 'shipmentThreshold' | 'discountPercentage', value: string) => {
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) return;

        setLocalSettings(prev => prev.map(setting =>
            setting.tierName === tierName
                ? { ...setting, [field]: numericValue }
                : setting
        ));
    };

    const handleSaveChanges = () => {
        // Basic validation
        for (const setting of localSettings) {
            if (setting.shipmentThreshold < 0 || setting.discountPercentage < 0) {
                addToast('Thresholds and discounts cannot be negative.', 'error');
                return;
            }
        }
        updateTierSettings(localSettings);
        addToast('Partner tier settings saved successfully!', 'success');
    };

    const tierIcons: Record<PartnerTier, React.ReactElement> = {
        [PartnerTier.BRONZE]: <ShieldIcon className="w-10 h-10 text-yellow-700" />,
        [PartnerTier.SILVER]: <AwardIcon className="w-10 h-10 text-gray-500" />,
        [PartnerTier.GOLD]: <CrownIcon className="w-10 h-10 text-yellow-500" />,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Partner Tier Management</h1>
                    <p className="text-muted-foreground mt-1">Configure the shipment thresholds and discount percentages for each loyalty tier.</p>
                </div>
                <button
                    onClick={handleSaveChanges}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition shadow-sm"
                >
                    Save Changes
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {localSettings.map(setting => (
                    <div key={setting.tierName} className="card p-6 border-t-4" style={{ borderTopColor: setting.tierName === 'Bronze' ? '#B45309' : setting.tierName === 'Silver' ? '#6B7280' : '#FBBF24' }}>
                        <div className="flex items-center gap-4">
                            {tierIcons[setting.tierName]}
                            <h2 className="text-2xl font-bold text-foreground">{setting.tierName} Tier</h2>
                        </div>
                        <div className="mt-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Shipments per Month
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={setting.shipmentThreshold}
                                        onChange={e => handleInputChange(setting.tierName, 'shipmentThreshold', e.target.value)}
                                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                                    />
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground">
                                        or more
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Required shipments in the last 30 days.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Discount Percentage
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={setting.discountPercentage}
                                        onChange={e => handleInputChange(setting.tierName, 'discountPercentage', e.target.value)}
                                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                                    />
                                     <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground">
                                        %
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Discount applied to the shipping fee.</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartnerTierManagement;