import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Permission, CustomRole } from '../types';
import { Modal } from '../components/common/Modal';
import { StatCard } from '../components/common/StatCard';
import { PlusCircleIcon, PencilIcon, TrashIcon, UsersIcon, KeyIcon, LockClosedIcon, ChevronDownIcon } from '../components/Icons';

// Helper to format permission keys for display
const formatPermissionName = (permission: string) => {
    return permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const RoleManagement = () => {
    const { customRoles, users, hasPermission, addRole, updateRole, deleteRole, addToast } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);

    if (!hasPermission(Permission.MANAGE_ROLES)) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground">You do not have permission to manage roles.</p>
            </div>
        );
    }

    const openModal = (mode: 'add' | 'edit', role?: CustomRole) => {
        setModalMode(mode);
        setSelectedRole(role || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedRole(null);
    };

    const handleDeleteClick = (role: CustomRole) => {
        if (role.isSystemRole) {
            addToast('System roles cannot be deleted.', 'error');
            return;
        }
        setRoleToDelete(role);
    };

    const confirmDelete = () => {
        if (roleToDelete) {
            deleteRole(roleToDelete.id);
            setRoleToDelete(null);
        }
    };

    const systemRolesCount = useMemo(() => customRoles.filter(r => r.isSystemRole).length, [customRoles]);
    const customRolesCount = customRoles.length - systemRolesCount;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Role Management</h2>
                    <p className="text-muted-foreground mt-1">Define roles and manage their permissions across the application.</p>
                </div>
                <button onClick={() => openModal('add')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition shadow-sm">
                    <PlusCircleIcon className="w-5 h-5"/>
                    Create New Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Roles" value={customRoles.length} icon={<UsersIcon />} color="#3b82f6" />
                <StatCard title="Custom Roles" value={customRolesCount} icon={<PencilIcon />} color="#16a34a" />
                <StatCard title="System Roles" value={systemRolesCount} icon={<LockClosedIcon />} color="#f97316" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customRoles.map(role => {
                    const userCount = users.filter(u => (u.roles || []).includes(role.name as any)).length;
                    return (
                        <div key={role.id} className="card flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                            <div className="p-5">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold text-foreground">{role.name}</h3>
                                    {role.isSystemRole && <span title="System Role"><LockClosedIcon className="w-5 h-5 text-muted-foreground" /></span>}
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">A system-defined role with a set of permissions for core functionalities.</p>
                            </div>
                            <div className="p-5 border-y border-border bg-secondary flex-grow grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-primary">{userCount}</p>
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Users</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-primary">{role.permissions.length}</p>
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Permissions</p>
                                </div>
                            </div>
                            <div className="p-3 flex items-center justify-end gap-2">
                                <button onClick={() => openModal('edit', role)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-accent transition text-sm">
                                    <PencilIcon className="w-4 h-4"/>
                                    Edit
                                </button>
                                <button onClick={() => handleDeleteClick(role)} disabled={role.isSystemRole} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-700 dark:text-red-400 font-semibold rounded-lg hover:bg-red-500/20 transition text-sm disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed">
                                    <TrashIcon className="w-4 h-4"/>
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <RoleModal 
                    isOpen={isModalOpen} 
                    onClose={closeModal} 
                    mode={modalMode}
                    role={selectedRole}
                    addRole={addRole}
                    updateRole={updateRole}
                />
            )}
            
            <Modal isOpen={!!roleToDelete} onClose={() => setRoleToDelete(null)} title="Confirm Deletion">
                 {roleToDelete && (
                    <div>
                        <p>Are you sure you want to delete the role <strong>{roleToDelete.name}</strong>?</p>
                        <p className="text-sm text-muted-foreground mt-2">Users with this role will lose their permissions. This action cannot be undone.</p>
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setRoleToDelete(null)} className="px-4 py-2 bg-secondary rounded-lg font-semibold">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold">Delete Role</button>
                        </div>
                    </div>
                 )}
            </Modal>
        </div>
    );
};

// --- Role Modal Component ---
interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    role: CustomRole | null;
    addRole: (role: Omit<CustomRole, 'id'>) => Promise<void>;
    updateRole: (roleId: string, data: Partial<CustomRole>) => Promise<void>;
}

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, mode, role, addRole, updateRole }) => {
    const [name, setName] = useState(role?.name || '');
    const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(role?.permissions || []);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

    const permissionGroups = useMemo(() => Object.values(Permission).reduce((acc: Record<string, Permission[]>, p) => {
        const group = p.split('_')[0];
        if (!acc[group]) acc[group] = [];
        acc[group].push(p);
        return acc;
    }, {}), []);

    const toggleSection = (groupName: string) => {
        setOpenSections(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const handleSelectAll = (groupName: string, isChecked: boolean) => {
        const groupPermissions = permissionGroups[groupName];
        if (isChecked) {
            setSelectedPermissions(prev => [...new Set([...prev, ...groupPermissions])]);
        } else {
            setSelectedPermissions(prev => prev.filter(p => !groupPermissions.includes(p)));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'add') {
            const roleData = { name, permissions: selectedPermissions, isSystemRole: false };
            addRole(roleData).then(onClose);
        } else if (role) {
            const roleData = { name, permissions: selectedPermissions };
            updateRole(role.id, roleData).then(onClose);
        }
    };

    const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
        <button type="button" onClick={() => onChange(!checked)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Create New Role' : `Edit Role: ${role?.name}`} size="4xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Role Name</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                        required 
                        disabled={role?.isSystemRole}
                    />
                     {role?.isSystemRole && <p className="text-xs text-muted-foreground mt-2 p-2 bg-secondary rounded">Permissions for system roles can be modified, but the role name is fixed.</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Permissions</label>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto p-4 bg-secondary rounded-lg border border-border">
                        {Object.entries(permissionGroups).map(([groupName, permissions]) => {
                            const isAllSelected = permissions.every(p => selectedPermissions.includes(p));
                            return (
                                <div key={groupName} className="bg-background border border-border rounded-lg overflow-hidden">
                                    <button type="button" onClick={() => toggleSection(groupName)} className="w-full flex justify-between items-center p-4">
                                        <h4 className="font-semibold text-foreground capitalize">{groupName}</h4>
                                        <ChevronDownIcon className={`w-5 h-5 text-muted-foreground transition-transform ${openSections[groupName] ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openSections[groupName] && (
                                        <div className="p-4 border-t border-border">
                                            <div className="pb-3 mb-3 border-b border-border">
                                                <label className="flex items-center gap-3 w-full cursor-pointer">
                                                    <input type="checkbox" checked={isAllSelected} onChange={(e) => handleSelectAll(groupName, e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                                                    <span className="text-sm font-semibold text-muted-foreground">Select All</span>
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                                {permissions.map(p => (
                                                    <label key={p} className="flex items-center justify-between">
                                                        <span className="text-sm text-foreground">{formatPermissionName(p)}</span>
                                                        <ToggleSwitch
                                                            checked={selectedPermissions.includes(p)}
                                                            onChange={(isChecked) => {
                                                                if (isChecked) {
                                                                    setSelectedPermissions(prev => [...new Set([...prev, p])]);
                                                                } else {
                                                                    setSelectedPermissions(prev => prev.filter(perm => perm !== p));
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-accent transition">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition">{mode === 'add' ? 'Create Role' : 'Save Changes'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default RoleManagement;