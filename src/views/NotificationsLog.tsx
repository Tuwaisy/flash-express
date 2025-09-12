import { useAppContext } from '../context/AppContext';
import { ReplyIcon, PhoneIcon, MailIcon } from '../components/Icons';
import { NotificationChannel } from '../types';

const NotificationsLog = () => {
    const { notifications, notificationStatus, resendNotification } = useAppContext();
    
    const statusDisplay: Record<string, { text: string; color: string }> = {
        sending: { text: 'Sending...', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
        sent: { text: 'Sent', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
        failed: { text: 'Not Sent', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    };

    const sortedNotifications = notifications.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="card overflow-hidden">
             <div className="p-5 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Notifications Log</h2>
                <p className="text-muted-foreground mt-1 text-sm">A log of all system-generated notifications. Emails can be sent manually from this screen.</p>
            </div>
            
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden lg:block">
                <table className="w-full text-left">
                    <thead className="bg-secondary">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Channel</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipient</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipment ID</th>
                            <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sortedNotifications.map(n => {
                            const currentStatus = notificationStatus[n.id] || (n.sent ? 'sent' : 'failed');
                            return (
                                <tr key={n.id}>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">{new Date(n.date).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {n.channel === NotificationChannel.SMS ? (
                                                <PhoneIcon className="w-5 h-5 text-blue-500" />
                                            ) : (
                                                <MailIcon className="w-5 h-5 text-muted-foreground" />
                                            )}
                                            <span className="text-sm">{n.channel}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusDisplay[currentStatus].color}`}>
                                            {statusDisplay[currentStatus].text}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-foreground">{n.recipient}</td>
                                    <td className="px-6 py-4 text-sm text-foreground">{n.channel === NotificationChannel.EMAIL ? n.message.split('\n\n')[0] : n.message}</td>
                                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{n.shipmentId}</td>
                                    <td className="px-6 py-4">
                                        {n.channel === NotificationChannel.EMAIL && (
                                            <button 
                                                onClick={() => resendNotification(n.id)} 
                                                disabled={currentStatus === 'sending'}
                                                className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition disabled:bg-muted"
                                            >
                                                <ReplyIcon className="w-4 h-4 transform -scale-x-100"/>
                                                {currentStatus === 'sent' ? 'Resend' : 'Send'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden p-4 space-y-4 bg-secondary">
                {sortedNotifications.map(n => {
                     const currentStatus = notificationStatus[n.id] || (n.sent ? 'sent' : 'failed');
                    return (
                        <div key={n.id} className="responsive-card">
                            <div className="responsive-card-header">
                                <span className="font-mono text-sm text-foreground">{n.shipmentId}</span>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusDisplay[currentStatus].color}`}>
                                    {statusDisplay[currentStatus].text}
                                </span>
                            </div>
                            <div className="text-sm">
                                <p className="font-semibold">{n.channel === NotificationChannel.EMAIL ? n.message.split('\n\n')[0] : n.message}</p>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                     {n.channel === NotificationChannel.SMS ? (
                                        <PhoneIcon className="w-4 h-4 text-blue-500" />
                                    ) : (
                                        <MailIcon className="w-4 h-4" />
                                    )}
                                    To: {n.recipient}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{new Date(n.date).toLocaleString()}</p>
                            </div>
                            {n.channel === NotificationChannel.EMAIL && (
                                <button 
                                    onClick={() => resendNotification(n.id)}
                                    disabled={currentStatus === 'sending'}
                                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition disabled:bg-muted"
                                >
                                    <ReplyIcon className="w-4 h-4 transform -scale-x-100"/>
                                    {currentStatus === 'sent' ? 'Resend' : 'Send'}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {notifications.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="font-semibold">No Notifications Found</p>
                    <p className="text-sm">No notifications have been generated yet.</p>
                </div>
            )}
        </div>
    );
};

export default NotificationsLog;