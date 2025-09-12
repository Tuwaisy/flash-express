const twilio = require('twilio');

class SMSService {
    constructor() {
        // Initialize Twilio client for SMS
        this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
            ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
            : null;
            
        this.smsNumber = process.env.TWILIO_SMS_NUMBER; // Your Twilio SMS number
        this.isEnabled = process.env.ENABLE_SMS_NOTIFICATIONS === 'true' && !!this.twilioClient && !!this.smsNumber;
        
        if (this.isEnabled) {
            console.log('✅ SMS service initialized with number:', this.smsNumber);
        } else {
            console.log('⚠️ SMS service disabled - missing credentials or disabled in config');
        }
    }

    /**
     * Send SMS message using Twilio
     */
    async sendMessage(to, message) {
        if (!this.isEnabled) {
            console.log('SMS service is disabled');
            return { success: false, error: 'SMS service disabled' };
        }

        try {
            const result = await this.twilioClient.messages.create({
                body: message,
                from: this.smsNumber,
                to: to
            });
            
            console.log(`📱 SMS sent to ${to}: ${result.sid}`);
            return { 
                success: true, 
                messageId: result.sid,
                status: result.status 
            };
            
        } catch (error) {
            console.error('❌ SMS failed:', error.message);
            return { 
                success: false, 
                error: error.message,
                code: error.code 
            };
        }
    }

    /**
     * Send verification code via SMS
     */
    async sendVerificationCode(phone, code, purpose = 'verification') {
        const message = `Shuhna Express: Your verification code is ${code}. Valid for 10 minutes. Do not share this code.`;
        return await this.sendMessage(phone, message);
    }

    /**
     * Send delivery verification code via SMS
     */
    async sendDeliveryVerificationCode(shipmentId, recipientPhone, code, recipientName) {
        const message = `Shuhna Express: Delivery code for shipment ${shipmentId} is ${code}. Share with courier to confirm delivery. Valid 10 mins.`;
        return await this.sendMessage(recipientPhone, message);
    }

    /**
     * Format phone number for SMS (international format)
     */
    formatPhoneNumber(phone) {
        if (!phone) return null;
        
        // Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Handle Egyptian phone numbers
        if (cleaned.startsWith('01')) {
            cleaned = '2' + cleaned; // Add country code
        } else if (cleaned.startsWith('201')) {
            // Already has country code
        } else if (cleaned.startsWith('2')) {
            // Country code without leading zero
        } else {
            // Assume it's a local number, add Egypt country code
            cleaned = '201' + cleaned;
        }
        
        return '+' + cleaned;
    }

    /**
     * Check if SMS service is available
     */
    isAvailable() {
        return this.isEnabled;
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            provider: this.twilioClient ? 'twilio' : 'none',
            smsNumber: this.smsNumber
        };
    }
}

module.exports = new SMSService();
