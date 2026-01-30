const whatsAppService = require('./whatsapp');
const smsService = require('./sms');
const { knex } = require('../db');

/**
 * Safely parse JSON values with fallback to default
 */
const safeJsonParse = (value, defaultValue = null) => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'object') return value; // Already parsed
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (e) {
            console.warn('safeJsonParse: Failed to parse string, returning default. Value:', value);
            return defaultValue;
        }
    }
    return defaultValue;
};

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

            // Try WhatsApp via Twilio as primary method
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

            // SMS backup is disabled - using WhatsApp via Twilio only
            // Uncomment below to enable SMS fallback if needed
            /*
            if (!whatsappResult.success && smsService.isAvailable()) {
                smsResult = await smsService.sendVerificationCode(formattedPhone, code, purpose);
                if (smsResult.success) {
                    backupChannel = 'sms';
                }
            }
            */

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

            // Try WhatsApp via Twilio as primary method
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

            // SMS backup is disabled - using WhatsApp via Twilio only
            // Uncomment below to enable SMS fallback if needed
            /*
            if (!whatsappResult.success && smsService.isAvailable()) {
                smsResult = await smsService.sendDeliveryVerificationCode(
                    shipmentId, 
                    formattedPhone, 
                    code, 
                    recipientName
                );
            }
            */

            const success = whatsappResult.success || smsResult.success;
            const channel = whatsappResult.success ? 'whatsapp' : (smsResult.success ? 'sms' : 'failed');

            // Store in delivery_verifications table - delete old one first to ensure fresh code
            await knex('delivery_verifications').where({ shipmentId }).del();
            
            await knex('delivery_verifications').insert({ 
                shipmentId, 
                code, 
                expires_at: expiresAt.toISOString(),
                channel,
                verified: false,
                created_at: new Date()
            });

            console.log(`🚚 Delivery verification code ${code} sent to ${formattedPhone} via ${channel} for shipment ${shipmentId}, expires at ${expiresAt.toISOString()}`);

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
            console.log(`🔍 Looking for delivery verification: shipmentId=${shipmentId}, code=${code}`);
            
            // Fetch the verification record
            const verification = await knex('delivery_verifications')
                .where({ shipmentId, code })
                .first();

            if (!verification) {
                console.warn(`⚠️ No valid verification found for shipment ${shipmentId} with code ${code}`);
                
                // Debug: Check if record exists at all
                const allVerifications = await knex('delivery_verifications')
                    .where({ shipmentId })
                    .select('*');
                console.log(`📋 All verifications for shipment ${shipmentId}:`, allVerifications);
                
                return {
                    success: false,
                    error: 'Invalid or expired delivery verification code'
                };
            }

            // Check if code is expired (handle both Date objects and ISO strings)
            const expiresAt = new Date(verification.expires_at);
            const now = new Date();
            
            if (now > expiresAt) {
                console.warn(`⚠️ Delivery code for shipment ${shipmentId} has expired (expires: ${expiresAt.toISOString()}, now: ${now.toISOString()})`);
                return {
                    success: false,
                    error: 'Delivery verification code has expired'
                };
            }

            console.log(`✅ Found valid verification for shipment ${shipmentId}`);


            // Get the shipment to verify it exists
            const shipment = await knex('shipments').where({ id: shipmentId }).first();
            if (!shipment) {
                return {
                    success: false,
                    error: 'Shipment not found'
                };
            }

            // Use transaction to update delivery verification and shipment status
            await knex.transaction(async (trx) => {
                // Mark verification as verified
                await trx('delivery_verifications')
                    .where({ shipmentId })
                    .update({ 
                        verified: true,
                        verified_at: new Date()
                    });

                // Update shipment status to Delivered
                const newStatus = 'Delivered';
                const updatePayload = { 
                    status: newStatus, 
                    deliveryDate: new Date().toISOString()
                };
                
                const currentHistory = safeJsonParse(shipment.statusHistory, []);
                currentHistory.push({ status: newStatus, timestamp: updatePayload.deliveryDate });
                updatePayload.statusHistory = JSON.stringify(currentHistory);

                await trx('shipments').where({ id: shipmentId }).update(updatePayload);

                console.log(`✅ Delivery code verified and shipment ${shipmentId} marked as Delivered`);
            });

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
