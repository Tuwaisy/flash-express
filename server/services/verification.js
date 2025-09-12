const whatsAppService = require('./whatsapp');
const smsService = require('./sms');
const { knex } = require('../db');

class VerificationService {
    constructor() {
        this.codeExpiry = 10 * 60 * 1000; // 10 minutes
        this.maxAttempts = 3;
        this.cooldownPeriod = 60 * 1000; // 1 minute between requests
    }

    /**
     * Generate a 6-digit verification code
     */
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Generate ID for verification records
     */
    generateId(prefix) {
        return `${prefix}_${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Send verification code with WhatsApp primary and SMS backup
     */
    async sendVerificationCode(phone, purpose = 'login', metadata = {}) {
        try {
            // Check cooldown period
            const recentAttempt = await knex('verifications')
                .where({ phone, purpose })
                .where('created_at', '>', new Date(Date.now() - this.cooldownPeriod))
                .orderBy('created_at', 'desc')
                .first();

            if (recentAttempt) {
                return {
                    success: false,
                    error: 'Please wait before requesting another code',
                    cooldownRemaining: this.cooldownPeriod - (Date.now() - new Date(recentAttempt.created_at).getTime())
                };
            }

            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + this.codeExpiry);
            const formattedPhone = whatsAppService.formatPhoneNumber(phone);

            // Try WhatsApp first
            let whatsappResult = { success: false };
            let smsResult = { success: false };
            let primaryChannel = 'none';
            let backupChannel = 'none';

            if (whatsAppService.isAvailable()) {
                whatsappResult = await whatsAppService.sendVerificationCode(formattedPhone, code, purpose);
                if (whatsappResult.success) {
                    primaryChannel = 'whatsapp';
                }
            }

            // If WhatsApp failed, try SMS as backup
            if (!whatsappResult.success && smsService.isAvailable()) {
                smsResult = await smsService.sendVerificationCode(formattedPhone, code, purpose);
                if (smsResult.success) {
                    backupChannel = 'sms';
                }
            }

            const success = whatsappResult.success || smsResult.success;
            const channel = whatsappResult.success ? 'whatsapp' : (smsResult.success ? 'sms' : 'failed');

            // Store verification record
            const verificationId = this.generateId('VER');
            await knex('verifications').insert({
                id: verificationId,
                phone: formattedPhone,
                code,
                purpose,
                channel,
                expires_at: expiresAt,
                attempts: 0,
                verified: false,
                metadata: JSON.stringify(metadata),
                created_at: new Date(),
                updated_at: new Date()
            });

            console.log(`🔐 Verification code ${code} sent to ${formattedPhone} via ${channel} for ${purpose}`);

            return {
                success,
                verificationId,
                channel,
                expiresAt,
                message: success 
                    ? `Verification code sent via ${channel}` 
                    : 'Failed to send verification code',
                whatsappResult,
                smsResult
            };

        } catch (error) {
            console.error('❌ Verification service error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify the code provided by user
     */
    async verifyCode(phone, code, purpose = 'login') {
        try {
            const formattedPhone = whatsAppService.formatPhoneNumber(phone);
            
            const verification = await knex('verifications')
                .where({ 
                    phone: formattedPhone, 
                    code, 
                    purpose,
                    verified: false 
                })
                .where('expires_at', '>', new Date())
                .orderBy('created_at', 'desc')
                .first();

            if (!verification) {
                return {
                    success: false,
                    error: 'Invalid or expired verification code'
                };
            }

            // Check attempts
            if (verification.attempts >= this.maxAttempts) {
                return {
                    success: false,
                    error: 'Too many failed attempts. Please request a new code.'
                };
            }

            // Update verification as successful
            await knex('verifications')
                .where({ id: verification.id })
                .update({ 
                    verified: true, 
                    verified_at: new Date(),
                    updated_at: new Date()
                });

            console.log(`✅ Phone number ${formattedPhone} verified successfully for ${purpose}`);

            return {
                success: true,
                verificationId: verification.id,
                message: 'Phone number verified successfully',
                metadata: verification.metadata ? JSON.parse(verification.metadata) : {}
            };

        } catch (error) {
            console.error('❌ Code verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send delivery verification code (for couriers)
     */
    async sendDeliveryVerificationCode(shipmentId, recipientPhone, recipientName) {
        try {
            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + this.codeExpiry);
            const formattedPhone = whatsAppService.formatPhoneNumber(recipientPhone);

            // Try WhatsApp first
            let whatsappResult = { success: false };
            let smsResult = { success: false };

            if (whatsAppService.isAvailable()) {
                whatsappResult = await whatsAppService.sendDeliveryVerificationCode(
                    shipmentId, 
                    formattedPhone, 
                    code, 
                    recipientName
                );
            }

            // If WhatsApp failed, try SMS as backup
            if (!whatsappResult.success && smsService.isAvailable()) {
                smsResult = await smsService.sendDeliveryVerificationCode(
                    shipmentId, 
                    formattedPhone, 
                    code, 
                    recipientName
                );
            }

            const success = whatsappResult.success || smsResult.success;
            const channel = whatsappResult.success ? 'whatsapp' : (smsResult.success ? 'sms' : 'failed');

            // Store in delivery_verifications table
            await knex('delivery_verifications')
                .insert({ 
                    shipmentId, 
                    code, 
                    expires_at: expiresAt,
                    channel,
                    created_at: new Date()
                })
                .onConflict('shipmentId')
                .merge();

            console.log(`🚚 Delivery verification code ${code} sent to ${formattedPhone} via ${channel} for shipment ${shipmentId}`);

            return {
                success,
                code,
                channel,
                expiresAt,
                message: success 
                    ? `Delivery verification code sent via ${channel}` 
                    : 'Failed to send delivery verification code',
                whatsappResult,
                smsResult
            };

        } catch (error) {
            console.error('❌ Delivery verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify delivery code
     */
    async verifyDeliveryCode(shipmentId, code) {
        try {
            const verification = await knex('delivery_verifications')
                .where({ shipmentId, code })
                .where('expires_at', '>', new Date())
                .first();

            if (!verification) {
                return {
                    success: false,
                    error: 'Invalid or expired delivery verification code'
                };
            }

            // Mark as verified by updating the shipment or verification record
            await knex('delivery_verifications')
                .where({ shipmentId })
                .update({ 
                    verified: true,
                    verified_at: new Date()
                });

            console.log(`✅ Delivery code verified for shipment ${shipmentId}`);

            return {
                success: true,
                message: 'Delivery verification successful',
                shipmentId
            };

        } catch (error) {
            console.error('❌ Delivery code verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean up expired verification codes
     */
    async cleanupExpiredCodes() {
        try {
            const deleted = await knex('verifications')
                .where('expires_at', '<', new Date())
                .del();

            const deliveryDeleted = await knex('delivery_verifications')
                .where('expires_at', '<', new Date())
                .del();

            if (deleted > 0 || deliveryDeleted > 0) {
                console.log(`🧹 Cleaned up ${deleted} expired verification codes and ${deliveryDeleted} expired delivery codes`);
            }

        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            whatsapp: whatsAppService.getStatus(),
            sms: smsService.getStatus(),
            codeExpiry: this.codeExpiry,
            maxAttempts: this.maxAttempts
        };
    }
}

module.exports = new VerificationService();
