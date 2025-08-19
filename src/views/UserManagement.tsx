// src/views/UserManagement.tsx

// FIX: Added React and hooks import
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole, ZONES, ShipmentPriority, Permission, CustomRole, PartnerTier, Address } from '../types';
import { Modal } from '../components/common/Modal';
// FIX: Removed unused PhoneIcon
import { PlusCircleIcon, PencilIcon, KeyIcon, TrashIcon, DocumentDownloadIcon, WalletIcon, UserCircleIcon, CrownIcon, MapPinIcon } from '../components/Icons';
import { exportToCsv } from '../utils/pdf';

const UserManagement = () => {
    const { users, addUser, updateUser, removeUser, resetPassword, currentUser, hasPermission, updateClientTaxCard, getTaxCardNumber, addToast, customRoles, updateClientTier } = useAppContext();
    const [mode, setMode] = useState<'add' | 'edit' | 'reset' | 'delete' | 'taxCard' | 'priorityPricing' | 'tier' | 'address' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({});
    const [tempTaxCardNumber, setTempTaxCardNumber] = useState('');
    const [tempPriorityMultipliers, setTempPriorityMultipliers] = useState<{
        [ShipmentPriority.STANDARD]: number;
        [ShipmentPriority.URGENT]: number;
        [ShipmentPriority.EXPRESS]: number;
    }>({
        [ShipmentPriority.STANDARD]: 100,
        [ShipmentPriority.URGENT]: 150,
        [ShipmentPriority.EXPRESS]: 200,
    });
    const [tempTier, setTempTier] = useState<PartnerTier | null>(null);
    
    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const filteredUsers = useMemo(() => {
        // FIX: Added explicit type to user parameter and role parameter
        return users.filter((user: User) => {
            const matchesSearch = searchTerm.trim() === '' ||
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.publicId.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesRole = filterRole === 'all' || (user.roles || []).some((role: UserRole | string) => role === filterRole);
            
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, filterRole]);
    

    if (!currentUser || !hasPermission(Permission.MANAGE_USERS)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You do not have permission to manage users.</p>
                </div>
            </div>
        );
    }

    const getAvailableRoles = (): CustomRole[] => {
        if (currentUser?.roles?.includes(UserRole.ADMIN)) {
            return customRoles;
        } else if (currentUser?.roles?.includes(UserRole.SUPER_USER)) {
            return customRoles.filter(role => role.name !== UserRole.ADMIN);
        }
        return [];
    };
    
    const getAvailableZones = (city: string): string[] => {
        if (city === 'Cairo') return ZONES.GreaterCairo.Cairo;
        if (city === 'Giza') return ZONES.GreaterCairo.Giza;
        if (city === 'Alexandria') return ZONES.Alexandria;
        if (city === 'Other') return ZONES.Other;
        return [];
    };

    const availableRoles = getAvailableRoles();
    
    const openModal = (modalMode: 'add' | 'edit' | 'reset' | 'delete' | 'taxCard' | 'priorityPricing' | 'tier' | 'address', user?: User) => {
        if ((modalMode === 'taxCard' || modalMode === 'priorityPricing' || modalMode === 'tier' || modalMode === 'address') && !currentUser?.roles?.includes(UserRole.ADMIN) && !currentUser?.roles?.includes(UserRole.SUPER_USER)) {
            addToast('Only administrators and super users can manage client settings', 'error');
            return;
        }
        
        const isEditingAdmin = user?.roles?.includes(UserRole.ADMIN);
        const isSuperUser = currentUser?.roles?.includes(UserRole.SUPER_USER);
        if ((modalMode === 'edit' || modalMode === 'delete' || modalMode === 'reset') && isEditingAdmin && isSuperUser) {
            addToast('Super users cannot modify administrator accounts', 'error');
            return;
        }
        
        setMode(modalMode);
        setSelectedUser(user || null);
        const clientRole = customRoles.find(r => r.name === UserRole.CLIENT);
        
        const defaultAddress: Address = { street: '', city: 'Cairo', zone: ZONES.GreaterCairo.Cairo[0], details: '' };

        setFormData(user ? { 
            ...user,
            address: user.address || defaultAddress
        } : { 
            roles: clientRole ? [clientRole.name] : [], 
            zones: [], 
            flatRateFee: 75.0,
            address: defaultAddress,
            priorityMultipliers: {
                [ShipmentPriority.STANDARD]: 1.0,
                [ShipmentPriority.URGENT]: 1.5,
                [ShipmentPriority.EXPRESS]: 2.0,
            }
        });
        
        if (modalMode === 'taxCard' && user) {
            setTempTaxCardNumber(getTaxCardNumber(user.id) || '');
        }
        
        if (modalMode === 'priorityPricing' && user) {
            const multipliers = user.priorityMultipliers || {
                [ShipmentPriority.STANDARD]: 1.0,
                [ShipmentPriority.URGENT]: 1.5,
                [ShipmentPriority.EXPRESS]: 2.0,
            };
            setTempPriorityMultipliers({
                [ShipmentPriority.STANDARD]: multipliers[ShipmentPriority.STANDARD] * 100,
                [ShipmentPriority.URGENT]: multipliers[ShipmentPriority.URGENT] * 100,
                [ShipmentPriority.EXPRESS]: multipliers[ShipmentPriority.EXPRESS] * 100,
            });
        }

        if (modalMode === 'tier' && user) {
            setTempTier(user.partnerTier || null);
        }
    };

    const closeModal = () => {
        setMode(null);
        setSelectedUser(null);
        setFormData({});
    };
    
    // FIX: Added explicit type for event parameter
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // FIX: Added explicit type for event parameter
    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const currentAddress = prev.address || { street: '', city: 'Cairo', zone: '', details: ''};
            const newAddress = { ...currentAddress, [name]: value };

            if (name === 'city') {
                const zonesForCity = getAvailableZones(value);
                newAddress.zone = zonesForCity[0] || '';
            }
            return { ...prev, address: newAddress as Address };
        });
    };

    const handleRoleChange = (roleName: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentRoles = prev.roles || [];
            if (isChecked) {
                return { ...prev, roles: [...currentRoles, roleName] };
            } else {
                return { ...prev, roles: currentRoles.filter(r => r !== roleName) };
            }
        });
    };
    
    const handleZoneChange = (zoneName: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentZones = prev.zones || [];
            if (isChecked) {
                return { ...prev, zones: [...currentZones, zoneName] };
            } else {
                return { ...prev, zones: currentZones.filter(z => z !== zoneName) };
            }
        });
    };


    // FIX: Added explicit type for event parameter
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'add') {
            addUser(formData as Omit<User, 'id' | 'publicId'>);
        } else if (mode === 'edit' && selectedUser) {
            updateUser(selectedUser.id, formData);
        } else if (mode === 'address' && selectedUser) {
            updateUser(selectedUser.id, { address: formData.address });
        } else if (mode === 'reset' && selectedUser && formData.password) {
            resetPassword(selectedUser.id, formData.password);
        } else if (mode === 'taxCard' && selectedUser) {
            handleTaxCardUpdate();
            return;
        } else if (mode === 'priorityPricing' && selectedUser) {
            handlePriorityPricingUpdate();
            return;
        } else if (mode === 'tier' && selectedUser) {
            handleTierUpdate();
            return;
        }
        closeModal();
    };
    
    const handleTierUpdate = () => {
        if (!selectedUser) return;
        updateClientTier(selectedUser.id, tempTier);
        addToast(`Tier updated for ${selectedUser.name}`, 'success');
        closeModal();
    };


    const handleTaxCardUpdate = () => {
        if (!selectedUser) return;
        
        if (!currentUser?.roles?.includes(UserRole.ADMIN) && !currentUser?.roles?.includes(UserRole.SUPER_USER)) {
            addToast('Only administrators and super users can manage tax card numbers', 'error');
            closeModal();
            return;
        }
        
        const taxCardRegex = /^\d{3}-\d{3}-\d{3}$/;
        if (tempTaxCardNumber && !taxCardRegex.test(tempTaxCardNumber)) {
            addToast('Tax card number must be in format XXX-XXX-XXX', 'error');
            return;
        }
        
        updateClientTaxCard(selectedUser.id, tempTaxCardNumber);
        addToast(`Tax card number updated for ${selectedUser.name}`, 'success');
        closeModal();
    };

    const handlePriorityPricingUpdate = () => {
        if (!selectedUser) return;
        
        if (!currentUser?.roles?.includes(UserRole.ADMIN) && !currentUser?.roles?.includes(UserRole.SUPER_USER)) {
            addToast('Only administrators and super users can manage priority pricing', 'error');
            closeModal();
            return;
        }
        
        const multipliers = {
            [ShipmentPriority.STANDARD]: tempPriorityMultipliers[ShipmentPriority.STANDARD] / 100,
            [ShipmentPriority.URGENT]: tempPriorityMultipliers[ShipmentPriority.URGENT] / 100,
            [ShipmentPriority.EXPRESS]: tempPriorityMultipliers[ShipmentPriority.EXPRESS] / 100,
        };

        if (multipliers[ShipmentPriority.STANDARD] <= 0 || multipliers[ShipmentPriority.URGENT] <= 0 || multipliers[ShipmentPriority.EXPRESS] <= 0) {
            addToast('All priority percentages must be positive numbers', 'error');
            return;
        }
        
        updateUser(selectedUser.id, { priorityMultipliers: multipliers });
        addToast(`Priority pricing updated for ${selectedUser.name}`, 'success');
        closeModal();
    };

    const handleDelete = () => {
        if (selectedUser) {
            removeUser(selectedUser.id);
        }
        closeModal();
    };
    
    const handleExport = () => {
        const headers = ['Public ID', 'Name', 'Email', 'Roles', 'Zones', 'Wallet Balance (EGP)'];
        const data = filteredUsers.map(user => [
            user.publicId,
            user.name,
            user.email,
            (user.roles || []).join(', '),
            user.zones?.join(', ') || 'N/A',
            user.walletBalance != null ? (Number(user.walletBalance) || 0).toFixed(2) : 'N/A'
        ]);
        exportToCsv(headers, data, 'User_List_Export');
    };

    const renderModalContent = () => {
        if (mode === 'delete' && selectedUser) {
            return (
                <div>
                    <p>Are you sure you want to delete the user <strong>{selectedUser.name}</strong>? This action cannot be undone.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={closeModal} className="px-4 py-2 bg-secondary rounded-lg font-semibold">Cancel</button>
                        <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold">Delete User</button>
                    </div>
                </div>
            )
        }
        
        if (mode === 'reset' && selectedUser) {
             return (
                 <form onSubmit={handleSubmit} className="space-y-4">
                     <p>Resetting password for <strong>{selectedUser.name}</strong>.</p>
                     <div>
                        <label htmlFor="reset-password" className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
                        <input id="reset-password" type="password" name="password" onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" required />
                    </div>
                     <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-secondary rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold">Reset Password</button>
                    </div>
                 </form>
             )
        }

        if (mode === 'address' && selectedUser) {
            const availableZones = getAvailableZones(formData.address?.city || 'Cairo');
            return (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p>Editing default pickup address for <strong>{selectedUser.name}</strong>.</p>
                    <div>
                        <label htmlFor="address-street" className="block text-sm font-medium text-muted-foreground mb-1">Street Address</label>
                        <input id="address-street" type="text" name="street" value={formData.address?.street || ''} onChange={handleAddressChange} className="w-full p-2 border border-border rounded bg-background" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="address-city" className="block text-sm font-medium text-muted-foreground mb-1">City</label>
                            <select id="address-city" name="city" value={formData.address?.city || 'Cairo'} onChange={handleAddressChange} className="w-full p-2 border border-border rounded bg-background">
                                <option value="Cairo">Cairo</option>
                                <option value="Giza">Giza</option>
                                <option value="Alexandria">Alexandria</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="address-zone" className="block text-sm font-medium text-muted-foreground mb-1">Zone</label>
                            <select id="address-zone" name="zone" value={formData.address?.zone || ''} onChange={handleAddressChange} className="w-full p-2 border border-border rounded bg-background">
                                {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="address-details" className="block text-sm font-medium text-muted-foreground mb-1">Address Details (Apt, Floor)</label>
                        <input id="address-details" type="text" name="details" value={formData.address?.details || ''} onChange={handleAddressChange} className="w-full p-2 border border-border rounded bg-background" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-secondary rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold">Save Address</button>
                    </div>
                </form>
            );
        }

        if (mode === 'tier' && selectedUser) {
            return (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p>Manually assign a partner tier for <strong>{selectedUser.name}</strong>.</p>
                    <div>
                        <label htmlFor="partner-tier" className="block text-sm font-medium text-muted-foreground mb-1">Partner Tier</label>
                        <select
                            id="partner-tier"
                            value={tempTier || 'auto'}
                            onChange={e => setTempTier(e.target.value === 'auto' ? null : e.target.value as PartnerTier)}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                        >
                            <option value="auto">Automatic (Based on shipments)</option>
                            {Object.values(PartnerTier).map(tier => (
                                <option key={tier} value={tier}>{tier}</option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Manual assignment overrides the automatic tier calculation.
                        </p>
                    </div>
                     <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-secondary rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold">Save Tier</button>
                    </div>
                </form>
            )
        }

        if (mode === 'priorityPricing' && selectedUser) {
            // FIX: Added explicit type for parameter
            const handleMultiplierChange = (priority: ShipmentPriority, value: string) => {
                setTempPriorityMultipliers(prev => ({
                    ...prev,
                    [priority]: parseFloat(value) || 0,
                }));
            };
    
            return (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p>Set custom priority fee percentages for <strong>{selectedUser.name}</strong> (e.g., 100 for standard rate, 150 for a 1.5x fee).</p>
                    <div>
                        <label htmlFor="priority-standard" className="block text-sm font-medium text-muted-foreground mb-1">{ShipmentPriority.STANDARD} (%)</label>
                        <input id="priority-standard" type="number" min="0" value={tempPriorityMultipliers[ShipmentPriority.STANDARD]} onChange={e => handleMultiplierChange(ShipmentPriority.STANDARD, e.target.value)} className="w-full p-2 border border-border rounded bg-background" />
                    </div>
                    <div>
                        <label htmlFor="priority-urgent" className="block text-sm font-medium text-muted-foreground mb-1">{ShipmentPriority.URGENT} (%)</label>
                        <input id="priority-urgent" type="number" min="0" value={tempPriorityMultipliers[ShipmentPriority.URGENT]} onChange={e => handleMultiplierChange(ShipmentPriority.URGENT, e.target.value)} className="w-full p-2 border border-border rounded bg-background" />
                    </div>
                    <div>
                        <label htmlFor="priority-express" className="block text-sm font-medium text-muted-foreground mb-1">{ShipmentPriority.EXPRESS} (%)</label>
                        <input id="priority-express" type="number" min="0" value={tempPriorityMultipliers[ShipmentPriority.EXPRESS]} onChange={e => handleMultiplierChange(ShipmentPriority.EXPRESS, e.target.value)} className="w-full p-2 border border-border rounded bg-background" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-secondary rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold">Save Pricing</button>
                    </div>
                </form>
            );
        }


        if (mode === 'add' || mode === 'edit') {
            const isCourier = (formData.roles || []).includes(UserRole.COURIER);
            const isClient = (formData.roles || []).includes(UserRole.CLIENT);
            return (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="user-name" className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
                        <input id="user-name" type="text" name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" required />
                    </div>
                    <div>
                        <label htmlFor="user-email" className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                        <input id="user-email" type="email" name="email" value={formData.email || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" required />
                    </div>
                    <div>
                        <label htmlFor="user-phone" className="block text-sm font-medium text-muted-foreground mb-1">Phone Number</label>
                        <input id="user-phone" type="tel" name="phone" value={formData.phone || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" placeholder="01xxxxxxxxx" />
                    </div>
                    {mode === 'add' && (
                        <div>
                           <label htmlFor="user-password" className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
                           <input id="user-password" type="password" name="password" onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background" required />
                       </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Roles</label>
                        <div className="grid grid-cols-2 gap-3 p-3 bg-secondary rounded-lg">
                            {/* FIX: Added explicit type for parameter */}
                            {availableRoles.map((r: CustomRole) => (
                                <label key={r.id} htmlFor={`role-${r.id}`} className="flex items-center gap-2 cursor-pointer">
                                    <input id={`role-${r.id}`} type="checkbox" checked={(formData.roles || []).includes(r.name)} onChange={e => handleRoleChange(r.name, e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                                    <span>{r.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {isCourier && (
                         <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 rounded-lg space-y-4">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-300">Courier Settings</h4>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">Assigned Zones</label>
                                <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-background rounded">
                                    {Object.entries(ZONES.GreaterCairo).map(([city, zoneList]) => (
                                        <div key={city}>
                                            <h5 className="font-semibold text-muted-foreground mt-2 px-1">{city}</h5>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-1">
                                                {/* FIX: Added explicit type for parameter */}
                                                {zoneList.map((zone: string) => (
                                                    <label key={zone} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                                        <input type="checkbox" checked={(formData.zones || []).includes(zone)} onChange={e => handleZoneChange(zone, e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                                                        <span>{zone}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                           </div>
                           {mode === 'add' && (
                               <div>
                                   <label htmlFor="user-referrer" className="block text-sm font-medium text-muted-foreground mb-1">Referred By (Optional)</label>
                                   <select id="user-referrer" name="referrerId" value={formData.referrerId || ''} onChange={handleFormChange} className="w-full px-4 py-2 border border-border rounded-lg bg-background">
                                       <option value="">No Referrer</option>
                                       {/* FIX: Added explicit type for parameter */}
                                       {users.filter((u: User) => (u.roles || []).includes(UserRole.COURIER)).map((c: User) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                   </select>
                               </div>
                           )}
                         </div>
                    )}
                    {isClient && (
                         <div className="p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 rounded-lg space-y-4">
                            <h4 className="font-semibold text-green-800 dark:text-green-300">Client Settings</h4>
                             <div>
                               <label htmlFor="client-flat-rate" className="block text-sm font-medium text-muted-foreground mb-1">Flat Rate Fee (EGP)</label>
                               <input id="client-flat-rate" type="number" step="0.01" min="0" name="flatRateFee" value={formData.flatRateFee ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, flatRateFee: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2 border border-border rounded-lg bg-background" />
                           </div>
                         </div>
                    )}
                    {(formData.roles?.includes(UserRole.ADMIN) || currentUser.roles?.includes(UserRole.ADMIN)) && formData.referrerId && (
                         <div className="p-4 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 rounded-lg space-y-4">
                            <h4 className="font-semibold text-purple-800 dark:text-purple-300">Referral Settings (for Referrer)</h4>
                            <div>
                                <label htmlFor="referral-commission" className="block text-sm font-medium text-muted-foreground mb-1">Referral Commission (EGP per delivery)</label>
                                <input id="referral-commission" type="number" step="0.01" min="0" name="referralCommission" value={formData.referralCommission ?? ''} onChange={(e) => setFormData(prev => ({...prev, referralCommission: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2 border border-border rounded-lg bg-background" />
                                <p className="text-xs text-muted-foreground mt-1">This commission is paid to the referring courier for each successful delivery made by this new courier.</p>
                            </div>
                         </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold">{mode === 'add' ? 'Create User' : 'Save Changes'}</button>
                    </div>
                </form>
            )
        }
        return null;
    };


    return (
        <div className="card">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">User Management</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Create, edit, and manage all users in the system.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleExport} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                        <DocumentDownloadIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button onClick={() => openModal('add')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition">
                        <PlusCircleIcon className="w-5 h-5"/>
                        New User
                    </button>
                </div>
            </div>

            <div className="p-4 bg-secondary border-b border-border flex flex-col md:flex-row gap-4">
                <input 
                    id="user-search"
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 border border-border rounded-lg bg-background"
                />
                 <select
                    id="role-filter"
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 border border-border rounded-lg bg-background"
                >
                    <option value="all">Filter by Role</option>
                    {/* FIX: Added explicit type for parameter */}
                    {customRoles.map((role: CustomRole) => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                </select>
            </div>
            
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Roles</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Details</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {/* FIX: Added explicit type for parameter */}
                        {filteredUsers.map((user: User) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                            <UserCircleIcon className="w-6 h-6 text-muted-foreground"/>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">{user.name}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                            <p className="font-mono text-xs text-muted-foreground/70 mt-1">{user.publicId}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {/* FIX: Added explicit type for parameter */}
                                        {(user.roles || []).map((role: UserRole | string) => (
                                            <span key={role} className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{role}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">
                                    {(user.roles || []).includes(UserRole.COURIER) && `Zones: ${user.zones?.join(', ') || 'N/A'}`}
                                    {(user.roles || []).includes(UserRole.CLIENT) && `Fee: ${(Number(user.flatRateFee) || 0).toFixed(2)} EGP`}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {hasPermission(Permission.EDIT_USER_PROFILE) && <button onClick={() => openModal('edit', user)} title="Edit User" className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-md"><PencilIcon /></button>}
                                        <button onClick={() => openModal('reset', user)} title="Reset Password" className="p-2 text-muted-foreground hover:text-orange-500 hover:bg-secondary rounded-md"><KeyIcon /></button>
                                        <button onClick={() => openModal('delete', user)} title="Delete User" className="p-2 text-muted-foreground hover:text-red-500 hover:bg-secondary rounded-md"><TrashIcon /></button>
                                         {(user.roles || []).includes(UserRole.CLIENT) && hasPermission(Permission.EDIT_CLIENT_ADDRESS) && (
                                            <button onClick={() => openModal('address', user)} title="Edit Default Address" className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-secondary rounded-md">
                                                <MapPinIcon className="w-5 h-5" />
                                            </button>
                                         )}
                                         {(user.roles || []).includes(UserRole.CLIENT) && <button onClick={() => openModal('priorityPricing', user)} title="Set Priority Pricing" className="p-2 text-muted-foreground hover:text-green-500 hover:bg-secondary rounded-md"><WalletIcon className="w-5 h-5"/></button>}
                                         {(user.roles || []).includes(UserRole.CLIENT) && <button onClick={() => openModal('tier', user)} title="Manage Tier" className="p-2 text-muted-foreground hover:text-yellow-500 hover:bg-secondary rounded-md"><CrownIcon className="w-5 h-5"/></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Modal isOpen={!!mode} onClose={closeModal} title={
                mode === 'add' ? 'Create New User' :
                mode === 'address' ? `Edit Address for ${selectedUser?.name}` :
                `Manage ${selectedUser?.name}`
             } size="2xl">
                {renderModalContent()}
            </Modal>
            
        </div>
    );
};

export default UserManagement;
