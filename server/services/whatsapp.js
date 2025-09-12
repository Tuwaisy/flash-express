const twilio = require('twilio');
const axios = require('axios');
const WhatsAppTokenManager = require('./whatsapp-token-manager');

class WhatsAppService {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.isProduction = this.environment === 'production';
        this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
            ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
            : null;
        this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
        this.businessApi = {
            phoneId: process.env.WHATSAPP_BUSINESS_PHONE_ID,
            accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
            businessId: process.env.WHATSAPP_BUSINESS_ID,
            verifyToken: process.env.WHATSAPP_VERIFY_TOKEN
        };
        this.businessPhone = process.env.BUSINESS_PHONE_NUMBER || '+201008831881';
        this.isEnabled = process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'true' && 
                        (!!this.twilioClient || (this.businessApi.phoneId && this.businessApi.accessToken));
        
        // Initialize token manager for automatic token refresh (only if required credentials are available)
        const hasTokenManagerCredentials = process.env.WHATSAPP_APP_ID && 
                                          process.env.WHATSAPP_APP_SECRET && 
                                          process.env.WHATSAPP_CLIENT_ID && 
                                          process.env.WHATSAPP_CLIENT_SECRET;
        
        if (this.businessApi.phoneId && this.businessApi.accessToken && hasTokenManagerCredentials) {
            try {
                this.tokenManager = new WhatsAppTokenManager();
                console.log('🔄 WhatsApp Token Manager initialized');
            } catch (error) {
                console.warn('⚠️ WhatsApp Token Manager failed to initialize:', error.message);
            }
        } else if (this.businessApi.phoneId && this.businessApi.accessToken) {
            console.log('ℹ️ Token Manager not initialized - missing credentials for automatic refresh');
            console.log('📝 To enable automatic token refresh, add these environment variables:');
            console.log('   WHATSAPP_APP_ID, WHATSAPP_APP_SECRET, WHATSAPP_CLIENT_ID, WHATSAPP_CLIENT_SECRET');
        }
        
        if (this.isEnabled) {
            const provider = this.isProduction && this.businessApi.phoneId ? 'Business API' : 'Twilio';
            console.log(`✅ WhatsApp service initialized (${provider}) with business number:`, this.businessPhone);
        } else {
            console.log('⚠️ WhatsApp service disabled - missing credentials or disabled in config');
        }
    }

    formatPhoneNumber(phoneNumber, forBusinessApi = false) {
        // Clean the phone number
        let formatted = phoneNumber.replace(/\s+/g, '').replace(/[-()]/g, '');
        
        // Handle Egyptian phone numbers specifically
        if (formatted.startsWith('+201')) {
            // Already in correct format: +201xxxxxxxxx
            formatted = formatted;
        } else if (formatted.startsWith('+20')) {
            // +20 but might be missing the 1: +20xxxxxxxxx -> +201xxxxxxxxx
            if (formatted.length === 12) {
                formatted = '+201' + formatted.substring(3);
            } else {
                formatted = formatted; // Already correct
            }
        } else if (formatted.startsWith('+01')) {
            // Incorrect format: +01xxxxxxxxx -> +201xxxxxxxxx
            formatted = '+201' + formatted.substring(3);
        } else if (formatted.startsWith('201')) {
            // Missing +: 201xxxxxxxxx -> +201xxxxxxxxx
            formatted = '+' + formatted;
        } else if (formatted.startsWith('20')) {
            // Missing + and 1: 20xxxxxxxxx -> +201xxxxxxxxx
            if (formatted.length === 11) {
                formatted = '+201' + formatted.substring(2);
            } else {
                formatted = '+' + formatted;
            }
        } else if (formatted.startsWith('01')) {
            // Egyptian mobile without country code: 01xxxxxxxxx -> +201xxxxxxxxx
            formatted = '+2' + formatted;
        } else if (formatted.startsWith('1') && formatted.length === 9) {
            // Egyptian mobile without 0 and country code: 1xxxxxxxxx -> +201xxxxxxxxx
            formatted = '+20' + formatted;
        } else if (!formatted.startsWith('+')) {
            // No country code, assume Egyptian: xxxxxxxxxx -> +20xxxxxxxxxx
            formatted = '+20' + formatted;
        }
        
        // Validate Egyptian number format (+20 + 10 digits total = 13 characters)
        // Common Egyptian mobile networks: 10x, 11x, 12x, 15x + 8 subscriber digits
        if (!formatted.match(/^\+20(10|11|12|15)[0-9]{8}$/)) {
            console.warn(`⚠️ Invalid Egyptian phone number format: ${phoneNumber} -> ${formatted} (Expected: +20 + network (10,11,12,15) + 8 digits)`);
        }
        
        if (forBusinessApi) {
            // Business API needs number without +
            return formatted.startsWith('+') ? formatted.substring(1) : formatted;
        } else {
            // Twilio needs the full international format
            return formatted;
        }
    }

    async sendMessage(to, message, mediaUrl = null) {
        if (!this.isEnabled) {
            return { success: false, error: 'WhatsApp service disabled' };
        }
        
        // Try Business API first in production, fallback to Twilio if it fails
        if (this.isProduction && this.businessApi.phoneId && this.businessApi.accessToken) {
            try {
                const result = await this.sendViaBusinessApi(to, message, mediaUrl);
                return result;
            } catch (error) {
                const errorData = error.response?.data?.error;
                const errorCode = errorData?.code;
                const errorMessage = errorData?.message || error.message;
                
                // Check for specific Business API errors
                if (errorCode === 131032) {
                    console.error('❌ Business API: Invalid test phone number (account in test mode), falling back to Twilio');
                } else if (error.response?.status === 401) {
                    console.error('❌ Business API: Authentication failed (token expired), falling back to Twilio');
                } else {
                    console.error('❌ Business API failed, falling back to Twilio:', errorMessage);
                }
                
                // Fallback to Twilio if Business API fails
                if (this.twilioClient) {
                    try {
                        return await this.sendViaTwilio(to, message, mediaUrl);
                    } catch (twilioError) {
                        console.error('❌ Twilio fallback also failed:', twilioError.message);
                        return { success: false, error: `Business API failed (${errorMessage}), Twilio failed (${twilioError.message})` };
                    }
                } else {
                    return { success: false, error: `Business API failed: ${errorMessage}` };
                }
            }
        } else {
            // Use Twilio for development or when Business API not configured
            try {
                return await this.sendViaTwilio(to, message, mediaUrl);
            } catch (error) {
                console.error('❌ Twilio message failed:', error.message);
                return { success: false, error: error.message };
            }
        }
    }

    async sendViaTwilio(to, message, mediaUrl = null) {
        if (!this.twilioClient) {
            throw new Error('Twilio client not configured');
        }
        const formattedPhone = this.formatPhoneNumber(to, false);
        const whatsappTo = formattedPhone.startsWith('whatsapp:') ? formattedPhone : `whatsapp:${formattedPhone}`;
        const messageOptions = { body: message, from: this.whatsappNumber, to: whatsappTo };
        if (mediaUrl) messageOptions.mediaUrl = [mediaUrl];
        const result = await this.twilioClient.messages.create(messageOptions);
        return { success: true, provider: 'twilio', messageId: result.sid, status: result.status };
    }

    async sendViaBusinessApi(to, message, mediaUrl = null) {
        const formattedPhone = this.formatPhoneNumber(to, true);
        const payload = { messaging_product: 'whatsapp', to: formattedPhone, type: 'text', text: { body: message } };
        if (mediaUrl) {
            payload.type = 'image';
            payload.image = { link: mediaUrl };
            delete payload.text;
        }
        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${this.businessApi.phoneId}/messages`,
            payload,
            { headers: { 'Authorization': `Bearer ${this.businessApi.accessToken}`, 'Content-Type': 'application/json' } }
        );
        const messageId = response.data.messages[0]?.id;
        return { success: true, provider: 'business_api', messageId: messageId, status: response.data.messages[0]?.message_status };
    }

    async sendVerificationCode(phone, code, purpose = 'verification') {
        const message = `شحنة إكسبريس Verification\n\nYour ${purpose} code: ${code}\n\nExpires in 10 minutes\nSupport: ${this.businessPhone}`;
        return await this.sendMessage(phone, message);
    }

    // Template 1: Order Received (when shipment is created)
    async sendOrderReceived(shipmentId, recipientPhone, recipientName, priority = 'Standard') {
        const trackingUrl = `${process.env.FRONTEND_URL || 'https://www.shuhna.net'}/track/${shipmentId}`;
        const firstName = recipientName ? recipientName.split(' ')[0] : 'عميلنا الكريم';
        
        const message = `مرحباً ${firstName}، تم استلام طلبك ${shipmentId} 🎉
يتم تحضير شحنتك ويمكنك متابعتها من هنا: ${trackingUrl}

شحنة إكسبريس - خدمة التوصيل المميزة
للدعم: ${this.businessPhone}`;

        return await this.sendMessage(recipientPhone, message);
    }

    // Template 2: Out for Delivery
    async sendOutForDelivery(shipmentId, recipientPhone, recipientName) {
        const trackingUrl = `${process.env.FRONTEND_URL || 'https://www.shuhna.net'}/track/${shipmentId}`;
        const firstName = recipientName ? recipientName.split(' ')[0] : 'عميلنا الكريم';
        
        const message = `مرحباً ${firstName}، طلبك ${shipmentId} 🚚 في طريقه للتوصيل اليوم.
يرجى التأكد من وجود شخص لاستلامه. تابع من هنا: ${trackingUrl}

شحنة إكسبريس - خدمة التوصيل المميزة  
للدعم: ${this.businessPhone}`;

        return await this.sendMessage(recipientPhone, message);
    }

    // Template 3: Verification Code (during delivery)
    async sendDeliveryVerificationCode(shipmentId, recipientPhone, code, recipientName) {
        const firstName = recipientName ? recipientName.split(' ')[0] : 'عميلنا الكريم';
        
        const message = `كود التسليم لطلبك ${shipmentId} هو: ${code} 🔐
يرجى إعطاء هذا الكود للمندوب عند استلام الطرد.

شحنة إكسبريس - خدمة التوصيل المميزة
للدعم: ${this.businessPhone}`;

        return await this.sendMessage(recipientPhone, message);
    }

    // Get estimated delivery time based on priority
    getEstimatedDeliveryTime(priority) {
        switch (priority?.toLowerCase()) {
            case 'express':
                return 'خلال 24 ساعة'; // Within 24 hours
            case 'urgent':
                return 'خلال 48 ساعة'; // Within 48 hours  
            case 'standard':
            default:
                return 'خلال 3 أيام'; // Within 3 days
        }
    }

    // Legacy method for backward compatibility - routes to new templates
    async sendStatusUpdate(shipmentId, recipientPhone, recipientName, status, trackingUrl = null) {
        // Route to appropriate new template based on status
        switch (status) {
            case 'Waiting for Packaging':
            case 'Packaged and Waiting for Assignment':
                return await this.sendOrderReceived(shipmentId, recipientPhone, recipientName);
            case 'Out for Delivery':
                return await this.sendOutForDelivery(shipmentId, recipientPhone, recipientName);
            default:
                // Keep existing behavior for other statuses
                const statusEmojis = { 'pending': '⏳', 'confirmed': '✅', 'picked_up': '📋', 'in_transit': '🚛', 'out_for_delivery': '🚚', 'delivered': '✅', 'failed_delivery': '❌', 'returned': '↩️', 'cancelled': '❌' };
                const emoji = statusEmojis[status] || '📋';
                const statusDisplay = status.replace('_', ' ').toUpperCase();
                let message = `${emoji} شحنة إكسبريس\n\nمرحباً ${recipientName},\n\nالحالة: ${statusDisplay}\nرقم التتبع: ${shipmentId}`;
                if (trackingUrl) message += `\n\nتابع: ${trackingUrl}`;
                message += `\n\nللدعم: ${this.businessPhone}`;
                return await this.sendMessage(recipientPhone, message);
        }
    }

    async sendClientNotification(clientPhone, clientName, shipmentId, status, message) {
        const statusEmojis = { 'confirmed': '✅', 'picked_up': '�', 'delivered': '✅', 'failed_delivery': '❌', 'returned': '↩️' };
        const emoji = statusEmojis[status] || '�';
        const whatsappMessage = `${emoji} شحنة إكسبريس\n\nHello ${clientName},\n\n${message}\n\nShipment: ${shipmentId}\nStatus: ${status.replace('_', ' ').toUpperCase()}\n\nSupport: ${this.businessPhone}`;
        return await this.sendMessage(clientPhone, whatsappMessage);
    }

    async sendWelcomeMessage(phone, name, userType) {
        let message;
        if (userType === 'client') {
            message = `🎉 Welcome to شحنة إكسبريس\n\nHello ${name}!\n\nYour account is active.\nYou can now create and track shipments.\n\nSupport: ${this.businessPhone}`;
        } else {
            message = `🎉 Welcome to شحنة إكسبريس Team\n\nHello ${name}!\n\nYour ${userType} account is ready.\n\nSupport: ${this.businessPhone}`;
        }
        return await this.sendMessage(phone, message);
    }

    formatPhone(phone) {
        return this.formatPhoneNumber(phone, false);
    }

    isAvailable() {
        return this.isEnabled;
    }

    async refreshToken() {
        if (this.tokenManager) {
            try {
                const newToken = await this.tokenManager.refreshToken();
                this.businessApi.accessToken = newToken;
                console.log('✅ WhatsApp access token refreshed successfully');
                return { success: true, token: newToken };
            } catch (error) {
                console.error('❌ Failed to refresh WhatsApp token:', error.message);
                return { success: false, error: error.message };
            }
        } else {
            return { success: false, error: 'Token manager not initialized' };
        }
    }

    async generatePermanentToken() {
        if (this.tokenManager) {
            try {
                const permanentToken = await this.tokenManager.generateLongLivedToken();
                console.log('🎉 Permanent WhatsApp token generated successfully');
                return { success: true, token: permanentToken };
            } catch (error) {
                console.error('❌ Failed to generate permanent token:', error.message);
                return { success: false, error: error.message };
            }
        } else {
            return { success: false, error: 'Token manager not initialized' };
        }
    }

    async checkTokenStatus() {
        if (this.tokenManager) {
            try {
                await this.tokenManager.checkTokenStatus();
                return { success: true };
            } catch (error) {
                console.error('❌ Failed to check token status:', error.message);
                return { success: false, error: error.message };
            }
        } else {
            return { success: false, error: 'Token manager not initialized' };
        }
    }

    getStatus() {
        return {
            enabled: this.isEnabled,
            environment: this.environment,
            provider: this.isProduction && this.businessApi.phoneId ? 'business_api' : 'twilio',
            businessPhone: this.businessPhone,
            twilioConfigured: !!this.twilioClient,
            businessApiConfigured: !!(this.businessApi.phoneId && this.businessApi.accessToken),
            tokenManagerActive: !!this.tokenManager,
            businessId: this.businessApi.businessId,
            phoneId: this.businessApi.phoneId
        };
    }
}

module.exports = new WhatsAppService();
