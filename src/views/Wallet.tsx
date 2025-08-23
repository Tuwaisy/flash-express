// src/views/Wallet.tsx



import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { TransactionType, ClientTransaction, ClientTransactionStatus } from '../types';
import { StatCard } from '../components/common/StatCard';
import { WalletIcon, ClockIcon } from '../components/Icons';
import { Modal } from '../components/common/Modal';
import { useState } from 'react';

const Wallet = () => {
    const { currentUser, clientTransactions, requestClientPayout, addToast } = useAppContext();
    const { t } = useLanguage();
    const [isPayoutModalOpen, setPayoutModalOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');

    if (!currentUser) return null;

    const myTransactions = clientTransactions.filter(t => t.userId === currentUser.id);
    const pendingPayouts = myTransactions.filter(t => t.type === TransactionType.WITHDRAWAL_REQUEST && t.status === 'Pending');
    const pendingAmount = pendingPayouts.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const availableBalance = Number(currentUser.walletBalance) || 0;
    
    const handleRequestPayout = () => {
        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0) {
            addToast('Please enter a valid positive amount.', 'error');
            return;
        }
        if (amount > availableBalance) {
            addToast('Payout amount cannot exceed your available balance.', 'error');
            return;
        }
        
        requestClientPayout(currentUser.id, amount);
        addToast('Payout requested successfully!', 'success');
        setPayoutModalOpen(false);
        setPayoutAmount('');
    };

    const getStatusStyles = (status?: ClientTransactionStatus): string => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'Processed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'Failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-secondary text-secondary-foreground';
        }
    };
    
    const getTypeStyles = (type: TransactionType): string => {
        switch (type) {
            case TransactionType.DEPOSIT: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case TransactionType.PAYMENT: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case TransactionType.WITHDRAWAL_REQUEST: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case TransactionType.WITHDRAWAL_PROCESSED: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            default: return 'bg-secondary text-secondary-foreground';
        }
    };

    return (
        <div className="space-y-8">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold text-foreground">My Wallet</h1>
                     <p className="text-muted-foreground mt-1">Your wallet is credited with the value of your delivered packages. You can use this balance to pay for future shipping fees.</p>
                 </div>
                 <button 
                    onClick={() => setPayoutModalOpen(true)}
                    disabled={availableBalance <= 0}
                    className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition disabled:bg-muted disabled:cursor-not-allowed"
                >
                    Request Payout
                </button>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title="Available Balance" 
                    value={`${(Number(availableBalance) || 0).toFixed(2)} EGP`} 
                    icon={<WalletIcon className="w-7 h-7"/>} 
                    color="#22c55e" 
                />
                 <StatCard 
                    title="Pending Payouts" 
                    value={`${(Number(-pendingAmount) || 0).toFixed(2)} EGP`} 
                    icon={<ClockIcon className="w-7 h-7"/>} 
                    color="#3b82f6" 
                />
            </div>

            <div className="card overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Transaction History</h2>
                </div>
                <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                           {myTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                               <tr key={t.id}>
                                   <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{new Date(t.date).toLocaleString()}</td>
                                   <td className="px-6 py-4 text-foreground">{t.description}</td>
                                   <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeStyles(t.type)}`}>
                                                {t.type}
                                            </span>
                                            {t.status && (
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyles(t.status)}`}>
                                                    {t.status}
                                                </span>
                                            )}
                                        </div>
                                   </td>
                                   <td className={`px-6 py-4 font-semibold text-right ${
                                       t.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                   }`}>
                                       {(Number(t.amount) || 0).toFixed(2)} EGP
                                   </td>
                               </tr>
                           ))}
                           {myTransactions.length === 0 && (
                               <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No transactions yet.</td></tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <Modal isOpen={isPayoutModalOpen} onClose={() => setPayoutModalOpen(false)} title="Request a Payout">
                <div className="space-y-4">
                    <p className="text-foreground">Your current available balance is <strong className="text-green-600">{(Number(availableBalance) || 0).toFixed(2)} EGP</strong>.</p>
                    <div>
                        <label htmlFor="payout-amount" className="block text-sm font-medium text-foreground mb-1">
                            Amount to withdraw (EGP)
                        </label>
                        <input
                            id="payout-amount"
                            type="number"
                            value={payoutAmount}
                            onChange={e => setPayoutAmount(e.target.value)}
                            placeholder={`Max ${(Number(availableBalance) || 0).toFixed(2)}`}
                            className="w-full px-4 py-2 border border-border rounded-lg"
                            min="0.01"
                            step="0.01"
                            max={availableBalance}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">An administrator will review and process your request. Once processed, the funds will be transferred to you.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setPayoutModalOpen(false)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold">Cancel</button>
                        <button onClick={handleRequestPayout} className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold">Confirm Request</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Wallet;