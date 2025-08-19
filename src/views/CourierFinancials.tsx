// src/views/CourierFinancials.tsx



import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CourierStats, CourierTransaction, CourierTransactionStatus, CourierTransactionType } from '../types';
import { Modal } from '../components/common/Modal';
import { DownloadIcon } from '../components/Icons';

// --- Reusable Components (could be moved to /components/specific) ---

const CourierEarningsSummary: React.FC<{ courierStats: CourierStats }> = ({ courierStats }) => {
    const successRate = (courierStats.deliveriesCompleted + courierStats.deliveriesFailed) > 0 ?
        (courierStats.deliveriesCompleted / (courierStats.deliveriesCompleted + courierStats.deliveriesFailed)) * 100 : 100;

    const avgEarningsPerDelivery = courierStats.deliveriesCompleted > 0 ?
        courierStats.totalEarnings / courierStats.deliveriesCompleted : 0;

    return (
        <div className="card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                    <div className="text-sm text-muted-foreground">Total Earnings</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{(Number(courierStats.totalEarnings) || 0).toFixed(2)} EGP</div>
                </div>
                <div>
                    <div className="text-sm text-muted-foreground">Current Balance</div>
                    <div className="text-2xl font-bold text-foreground">{(Number(courierStats.currentBalance) || 0).toFixed(2)} EGP</div>
                </div>
                <div>
                    <div className="text-sm text-muted-foreground">Pending Payouts</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(Number(courierStats.pendingEarnings) || 0).toFixed(2)} EGP</div>
                </div>
                 <div>
                    <div className="text-sm text-muted-foreground">Avg. Per Delivery</div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{(Number(avgEarningsPerDelivery) || 0).toFixed(2)} EGP</div>
                </div>
            </div>
             <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Performance:</span>
                    <div className="flex items-center" title={`Rating: ${courierStats.performanceRating}`}>
                        {[...Array(5)].map((_, i) => (<span key={i} className={`text-xl ${i < Math.floor(courierStats.performanceRating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>⭐</span>))}
                        <span className="ml-1 text-sm font-medium">({courierStats.performanceRating}/5.0)</span>
                    </div>
                </div>
                 <div className="text-sm text-muted-foreground">
                    Success Rate: <span className="font-bold text-foreground">{(Number(successRate) || 0).toFixed(1)}%</span>
                </div>
                {courierStats.isRestricted && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs font-medium">🚫 Restricted</span>
                )}
            </div>
        </div>
    );
};

const TransactionHistory: React.FC<{ transactions: CourierTransaction[] }> = ({ transactions }) => {
    const statusStyles: Record<CourierTransactionStatus, string> = {
        [CourierTransactionStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        [CourierTransactionStatus.PROCESSED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        [CourierTransactionStatus.FAILED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return (
        <div className="card overflow-hidden">
            <div className="p-5 border-b border-border"><h2 className="text-xl font-bold text-foreground">Transaction History</h2></div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-secondary">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Description</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Amount (EGP)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {transactions.map(t => (
                            <tr key={t.id}>
                                <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{new Date(t.timestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                    {t.description}
                                    {t.transferEvidencePath && (
                                        <a href={`/${t.transferEvidencePath}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                            <DownloadIcon className="w-4 h-4"/> View Proof
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 py-1 font-semibold text-xs rounded-full ${t.amount >= 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'}`}>{t.type}</span>
                                    {(t.type === CourierTransactionType.WITHDRAWAL_REQUEST || t.type === CourierTransactionType.WITHDRAWAL_PROCESSED) && <span className={`ml-2 px-2 py-1 font-semibold text-xs rounded-full ${statusStyles[t.status]}`}>{t.status}</span>}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${t.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{(Number(t.amount) || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No transactions recorded.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main View ---

const CourierFinancials = () => {
    const { currentUser, courierStats, courierTransactions, requestCourierPayout, addToast } = useAppContext();
    const [isPayoutModalOpen, setPayoutModalOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer'>('Cash');
    
    if (!currentUser) return null;

    const myStats = courierStats.find(cs => cs.courierId === currentUser.id);
    const myTransactions = courierTransactions.filter(ct => ct.courierId === currentUser.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const hasPendingPayout = myTransactions.some(t => t.type === CourierTransactionType.WITHDRAWAL_REQUEST && t.status === CourierTransactionStatus.PENDING);

    const handleRequestPayout = () => {
        if (!myStats) return;
        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0) {
            addToast('Please enter a valid positive amount.', 'error');
            return;
        }
        if (amount > myStats.currentBalance) {
            addToast('Payout amount cannot exceed your current balance.', 'error');
            return;
        }
        requestCourierPayout(currentUser.id, amount, paymentMethod);
        addToast('Payout requested successfully!', 'success');
        setPayoutModalOpen(false);
        setPayoutAmount('');
    };

    if (!myStats) {
        return <div className="text-center p-8 card">Could not load your financial data.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">My Earnings</h1>
                    <p className="text-muted-foreground mt-1">Your performance and financial summary.</p>
                </div>
                <button 
                    onClick={() => setPayoutModalOpen(true)}
                    disabled={myStats.currentBalance <= 0 || hasPendingPayout}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition disabled:bg-muted disabled:cursor-not-allowed"
                    title={hasPendingPayout ? 'You already have a pending payout request' : ''}
                >
                    Request Payout
                </button>
            </div>
            
            <CourierEarningsSummary courierStats={myStats} />
            <TransactionHistory transactions={myTransactions} />

            <Modal isOpen={isPayoutModalOpen} onClose={() => setPayoutModalOpen(false)} title="Request a Payout">
                <div className="space-y-4">
                    <p>Your current balance is <strong className="text-green-600 dark:text-green-400">{(Number(myStats.currentBalance) || 0).toFixed(2)} EGP</strong>.</p>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                        >
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="payout-amount" className="block text-sm font-medium text-muted-foreground mb-1">
                            Amount to withdraw (EGP)
                        </label>
                        <input
                            id="payout-amount"
                            type="number"
                            value={payoutAmount}
                            onChange={e => setPayoutAmount(e.target.value)}
                            placeholder={`Max ${myStats.currentBalance.toFixed(2)}`}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                            min="0.01"
                            step="0.01"
                            max={myStats.currentBalance}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">Once confirmed, an administrator will process your request. The funds will then be deducted from your balance and transferred to you.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setPayoutModalOpen(false)} className="px-4 py-2 bg-secondary rounded-lg font-semibold">Cancel</button>
                        <button onClick={handleRequestPayout} className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold">Confirm Request</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CourierFinancials;