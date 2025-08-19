

import { useAppContext } from '../context/AppContext';
import { ShipmentStatus, PaymentMethod, UserRole, ClientTransaction } from '../types';
import { exportToCsv } from '../utils/pdf';
import { StatCard } from '../components/common/StatCard';
import { ChartBarIcon, CheckCircleIcon, WalletIcon, DocumentDownloadIcon, CurrencyDollarIcon } from '../components/Icons';

const Financials = () => {
    const { currentUser, shipments, getTaxCardNumber } = useAppContext();
    
    // This view is for non-admin users to see basic financial information
    // Admin users should use the AdminFinancials view for complete access
    if (!currentUser) return null;

    const deliveredShipments = shipments.filter(s => s.status === ShipmentStatus.DELIVERED && s.deliveryDate);
    const isClient = (currentUser.roles || []).includes(UserRole.CLIENT);
    
    // For clients, only show their own shipments
    const filteredShipments = isClient 
        ? deliveredShipments.filter(s => s.clientId === currentUser.id)
        : deliveredShipments;
    
    const totalRevenue = filteredShipments.reduce((sum, s) => sum + (s.clientFlatRateFee || 0), 0);
    const totalDelivered = filteredShipments.length;
    const totalCOD = filteredShipments.filter(s => s.paymentMethod === PaymentMethod.COD).reduce((sum, s) => sum + s.price, 0);
    
    const taxCardNumber = isClient && currentUser.id 
        ? getTaxCardNumber(currentUser.id) 
        : '';

    // Prepare data for the chart (last 30 days)
    const revenueByDay: { [key: string]: number } = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        revenueByDay[dateString] = 0;
    }

    filteredShipments.forEach(s => {
        if(s.deliveryDate) {
            const dateString = s.deliveryDate.split('T')[0];
            if(revenueByDay.hasOwnProperty(dateString)) {
                revenueByDay[dateString] += (s.clientFlatRateFee || 0);
            }
        }
    });
    
    const chartData = Object.entries(revenueByDay).map(([date, revenue]) => ({
        date: new Date(date).getDate().toString(), // Just the day number
        revenue
    }));
    const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1); // Avoid division by zero

    const handleExport = () => {
        const headers = ['Shipment ID', 'Delivery Date', 'Client', 'Payment Method', 'Revenue (EGP)'];
        const body = filteredShipments
            .sort((a,b) => new Date(b.deliveryDate!).getTime() - new Date(a.deliveryDate!).getTime())
            .map(s => [
                s.id,
                new Date(s.deliveryDate!).toLocaleDateString(),
                s.clientName,
                s.paymentMethod,
                (Number(s.clientFlatRateFee) || 0).toFixed(2)
            ]);
        
        exportToCsv(headers, body, 'Financial_Report');
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold text-foreground">My Financials</h1>
                     <p className="text-muted-foreground mt-1">
                         {isClient 
                             ? 'Your order history and financial summary.' 
                             : 'An overview of the company\'s financial performance.'}
                     </p>
                 </div>
                 <button onClick={handleExport} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                     <DocumentDownloadIcon className="w-5 h-5"/>
                     Export as CSV
                 </button>
            </div>

            {/* Tax Card Number for Clients */}
            {isClient && taxCardNumber && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">Tax Information</h3>
                    <p className="text-blue-800 dark:text-blue-300">
                        Tax Card Number: <span className="font-mono font-bold">{taxCardNumber}</span>
                    </p>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Revenue" value={`${(Number(totalRevenue) || 0).toFixed(2)} EGP`} icon={<ChartBarIcon className="w-7 h-7"/>} color="#16a34a" />
                <StatCard title="Shipments Delivered" value={totalDelivered} icon={<CheckCircleIcon className="w-7 h-7"/>} color="#3b82f6" />
                <StatCard title="COD Collected" value={`${(Number(totalCOD) || 0).toFixed(2)} EGP`} icon={<WalletIcon className="w-7 h-7"/>} color="#f97316"/>
            </div>

            {/* Revenue Chart */}
            <div className="card">
                <h2 className="text-xl font-bold text-foreground mb-4">Daily Revenue (Last 30 Days)</h2>
                <div className="h-64 flex items-end gap-2 border-l border-b border-border pl-4 pb-4">
                   {chartData.map(({ date, revenue }) => (
                       <div key={date} className="flex-1 h-full flex flex-col justify-end items-center group">
                            <div 
                                className="w-full bg-primary/60 hover:bg-primary/80 transition-colors rounded-t-md"
                                style={{ height: `${(revenue / maxRevenue) * 100}%` }}
                                title={`Day ${date}: ${(Number(revenue) || 0).toFixed(2)} EGP`}
                            ></div>
                            <span className="text-xs text-muted-foreground mt-1">{date}</span>
                       </div>
                   ))}
                </div>
            </div>

            {/* Transactions Table */}
            <div className="card overflow-hidden">
                <div className="p-5">
                    <h2 className="text-xl font-bold text-foreground">All Transactions</h2>
                </div>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-left">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipment ID</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivery Date</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Method</th>
                                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                           {filteredShipments.sort((a,b) => new Date(b.deliveryDate!).getTime() - new Date(a.deliveryDate!).getTime()).map(s => (
                               <tr key={s.id}>
                                   <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{s.id}</td>
                                   <td className="px-6 py-4 text-foreground">{new Date(s.deliveryDate!).toLocaleDateString()}</td>
                                   <td className="px-6 py-4 text-muted-foreground">{s.clientName}</td>
                                   <td className="px-6 py-4 text-muted-foreground">{s.paymentMethod}</td>
                                   <td className="px-6 py-4 font-semibold text-foreground text-right">{(Number(s.clientFlatRateFee) || 0).toFixed(2)} EGP</td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Cards */}
                <div className="lg:hidden p-4 space-y-4 bg-secondary">
                     {filteredShipments.sort((a,b) => new Date(b.deliveryDate!).getTime() - new Date(a.deliveryDate!).getTime()).map(s => (
                        <div key={s.id} className="responsive-card !bg-card">
                            <div className="responsive-card-header">
                                <span className="font-mono text-sm text-muted-foreground">{s.id}</span>
                                <span className="font-semibold text-foreground">{(Number(s.clientFlatRateFee) || 0).toFixed(2)} EGP</span>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Client</span>
                                <span className="responsive-card-value">{s.clientName}</span>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Date</span>
                                <span className="responsive-card-value">{new Date(s.deliveryDate!).toLocaleDateString()}</span>
                            </div>
                            <div className="responsive-card-item">
                                <span className="responsive-card-label">Payment</span>
                                <span className="responsive-card-value">{s.paymentMethod}</span>
                            </div>
                        </div>
                     ))}
                </div>
                {filteredShipments.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <p className="font-semibold">No Delivered Shipments</p>
                        <p className="text-sm">There are no financial transactions to display yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Financials;