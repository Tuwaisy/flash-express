const whatsAppService = require('./whatsapp');
const smsService = require('./sms');

class NotificationService {
    constructor() {
        this.channels = {
            EMAIL: 'email',
            SMS: 'sms', 
            WHATSAPP: 'whatsapp',
            IN_APP: 'in_app'
        };
    }

    /**
     * Send notification through multiple channels
     */
    async sendNotification(shipment, status, channels = ['EMAIL', 'WHATSAPP']) {
        const results = {};

        try {
            // Get client and recipient information
            const { knex } = require('../db');
            const client = await knex('users').where({ id: shipment.clientId }).first();
            if (!client) {
                throw new Error('Client not found');
            }

            const recipientName = shipment.recipientName || 'Customer';
            const clientName = `${client.firstName} ${client.lastName}`;

            // Send WhatsApp notification to recipient
            if (channels.includes('WHATSAPP') && shipment.recipientPhone) {
                const whatsappResult = await whatsAppService.sendStatusUpdate(
                    shipment.id,
                    whatsAppService.formatPhoneNumber(shipment.recipientPhone),
                    recipientName,
                    status,
                    `${process.env.FRONTEND_URL || 'https://www.shuhna.net'}/track`
                );
                results.whatsapp_recipient = whatsappResult;
            }

            // Send WhatsApp notification to client (business owner)
            if (channels.includes('WHATSAPP') && client.phone && status !== 'Waiting for Packaging') {
                const clientMessage = this.getClientMessage(shipment, status, recipientName);
                const clientWhatsappResult = await whatsAppService.sendClientNotification(
                    whatsAppService.formatPhoneNumber(client.phone),
                    clientName,
                    shipment.id,
                    status,
                    clientMessage
                );
                results.whatsapp_client = clientWhatsappResult;
            }

            // Create notification record
            if (channels.includes('EMAIL') || channels.includes('WHATSAPP')) {
                await knex('notifications').insert({
                    id: this.generateId('NOT'),
                    shipmentId: shipment.id,
                    channel: channels.join(', '),
                    recipient: `${shipment.recipientPhone}${client.phone ? ', ' + client.phone : ''}`,
                    message: `Status update: ${status}`,
                    date: new Date().toISOString(),
                    status: status,
                    sent: results.whatsapp_recipient?.success || false
                });
            }

            return results;

        } catch (error) {
            console.error('❌ Notification service error:', error);
            return { error: error.message };
        }
    }

    /**
     * Send welcome message to new users
     */
    async sendWelcomeNotification(user) {
        if (!whatsAppService.isAvailable() || !user.phone) {
            return { success: false, reason: 'WhatsApp not available or no phone number' };
        }

        try {
            const userRoles = typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles;
            const primaryRole = userRoles?.[0];

            const result = await whatsAppService.sendWelcomeMessage(
                whatsAppService.formatPhoneNumber(user.phone),
                `${user.firstName} ${user.lastName}`,
                primaryRole
            );

            return result;

        } catch (error) {
            console.error('❌ Welcome notification error:', error);
            return { error: error.message };
        }
    }

    /**
     * Get client-specific message for status updates
     */
    getClientMessage(shipment, status, recipientName) {
        const messages = {
            'Packaged and Waiting for Assignment': `Your shipment to ${recipientName} has been packaged and is waiting for courier assignment.`,
            'Assigned to Courier': `Your shipment to ${recipientName} has been assigned to a courier.`,
            'Out for Delivery': `Your shipment to ${recipientName} is out for delivery.`,
            'Delivered': `Great news! Your shipment to ${recipientName} has been successfully delivered.`,
            'Delivery Failed': `Delivery to ${recipientName} failed. Our team is working to resolve this.`
        };

        return messages[status] || `Your shipment to ${recipientName} status: ${status}`;
    }

    /**
     * Generate notification ID
     */
    generateId(prefix) {
        return `${prefix}_${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
    }
}

module.exports = new NotificationService();
