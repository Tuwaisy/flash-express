

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { User, Address, ZONES } from '../types';
import { PencilIcon } from '../components/Icons';

const Profile = () => {
    const { currentUser, updateUser } = useAppContext();
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<User>>({});

    const getAvailableZones = (city: string): string[] => {
        if (city === 'Cairo') return ZONES.GreaterCairo.Cairo;
        if (city === 'Giza') return ZONES.GreaterCairo.Giza;
        if (city === 'Alexandria') return ZONES.Alexandria;
        if (city === 'Other') return ZONES.Other;
        return [];
    };
    
    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name,
                phone: currentUser.phone || '',
                address: currentUser.address || { street: '', city: 'Cairo', zone: ZONES.GreaterCairo.Cairo[0], details: '' }
            });
        }
    }, [currentUser]);
    
    if (!currentUser) return null;

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('address.')) {
            const field = name.split('.')[1] as keyof Address;
            let newAddress = { ...formData.address!, [field]: value };

            if (field === 'city') {
                const newCity = value as string;
                const availableZonesForNewCity = getAvailableZones(newCity);
                const firstZoneForCity = availableZonesForNewCity.length > 0 ? availableZonesForNewCity[0] : '';
                newAddress.zone = firstZoneForCity;
            }

            setFormData(prev => ({ ...prev, address: newAddress }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSave = () => {
        updateUser(currentUser.id, formData);
        setIsEditing(false);
    };

    const availableZones = getAvailableZones(formData.address?.city || 'Cairo');

    return (
        <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-start mb-6">
                <div>
                     <h1 className="text-3xl font-bold text-foreground">{t('myProfile')}</h1>
                     <p className="text-muted-foreground mt-1">{t('viewEditPersonalInfo')}</p>
                 </div>
                 {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition">
                         <PencilIcon className="w-5 h-5"/>
                         {t('editProfile')}
                     </button>
                 ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent font-semibold">{t('cancel')}</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">{t('saveChanges')}</button>
                    </div>
                 )}
            </div>
            
            <div className="card p-8 space-y-8">
                {/* Personal Information */}
                <div className="border-b border-border pb-8">
                     <h2 className="text-lg font-bold text-foreground mb-4">{t('personalInformation')}</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('fullName')}</label>
                            {isEditing ? (
                                <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg"/>
                            ) : (
                                <p className="text-lg text-foreground p-2">{currentUser.name}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('emailAddress')}</label>
                            <p className="text-lg text-muted-foreground p-2 bg-secondary rounded-lg">{currentUser.email}</p>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('phoneNumber')}</label>
                            {isEditing ? (
                                <>
                                    <input type="tel" name="phone" value={formData.phone || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg" placeholder="01xxxxxxxxx"/>
                                    <p className="text-xs text-muted-foreground mt-1">{t('phoneExample')}</p>
                                </>
                            ) : (
                                <p className="text-lg text-foreground p-2">{currentUser.phone || t('notSet')}</p>
                            )}
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-muted-foreground mb-1">{t('role')}</label>
                             <p className="text-lg text-muted-foreground p-2 bg-secondary rounded-lg">{(currentUser.roles || []).join(' & ')}</p>
                        </div>
                     </div>
                </div>

                {/* Default Address */}
                <div>
                     <h2 className="text-lg font-bold text-foreground mb-4">Default Pickup Address</h2>
                     {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Street Address</label>
                                <input
                                    type="text"
                                    name="address.street"
                                    value={formData.address?.street || ''}
                                    onChange={handleFormChange}
                                    className="w-full px-4 py-2 border border-border rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">City</label>
                                    <select name="address.city" value={formData.address?.city || 'Cairo'} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary">
                                       <option value="Cairo">Cairo</option>
                                       <option value="Giza">Giza</option>
                                       <option value="Alexandria">Alexandria</option>
                                       <option value="Other">Other Governorates</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Zone</label>
                                    <select name="address.zone" value={formData.address?.zone || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg">
                                       {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Apartment, Suite, etc.</label>
                                <input type="text" name="address.details" value={formData.address?.details || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg" />
                            </div>
                        </div>
                     ) : (
                        currentUser.address ? (
                             <div className="text-lg text-foreground p-4 bg-secondary rounded-lg">
                                 <p className="font-semibold">{currentUser.address.street}</p>
                                 <p>{currentUser.address.details}</p>
                                 <p>{currentUser.address.city}, {currentUser.address.zone}</p>
                             </div>
                        ) : (
                            <p className="text-muted-foreground">Please set your default address.</p>
                        )
                     )}
                </div>
            </div>
        </div>
    );
};

export default Profile;