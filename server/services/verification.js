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

            // Use transaction to update delivery verification, shipment status, and process financials
            await knex.transaction(async (trx) => {
                // Mark verification as verified
                await trx('delivery_verifications')
                    .where({ shipmentId })
                    .update({ 
                        verified: true,
                        verified_at: new Date()
                    });

                // Update shipment status to Delivered and append history
                const newStatus = 'Delivered';
                const updatePayload = { 
                    status: newStatus, 
                    deliveryDate: new Date().toISOString()
                };
                const currentHistory = safeJsonParse(shipment.statusHistory, []);
                currentHistory.push({ status: newStatus, timestamp: updatePayload.deliveryDate });
                updatePayload.statusHistory = JSON.stringify(currentHistory);
                await trx('shipments').where({ id: shipmentId }).update(updatePayload);

                // --- Courier processing: commission + referral + notifications + recalc balances ---
                // CRITICAL FIX: Validate courier exists before creating transactions
                const deliveryingCourier = shipment.courierId ? await trx('users').where({ id: shipment.courierId }).first() : null;
                if (shipment.courierId && deliveryingCourier) {
                    const commissionAmount = Number(shipment.courierCommission) || 0;
                    if (commissionAmount > 0) {
                        await trx('courier_transactions').insert({
                            id: this.generateId('TRN'),
                            courierId: shipment.courierId,
                            type: 'Commission',
                            amount: commissionAmount,
                            description: `Commission for shipment ${shipment.id}`,
                            shipmentId: shipment.id,
                            timestamp: new Date().toISOString(),
                            status: 'Processed'
                        });

                        await trx('courier_stats').where({ courierId: shipment.courierId }).update({ consecutiveFailures: 0 });
                        await trx('in_app_notifications').insert({
                            id: this.generateId('INAPP'),
                            userId: shipment.courierId,
                            message: `You earned ${commissionAmount.toFixed(2)} EGP for delivering shipment ${shipment.id}.`,
                            link: '/courier-financials',
                            isRead: false,
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        await trx('courier_stats').where({ courierId: shipment.courierId }).update({ consecutiveFailures: 0 });
                    }

                    const deliveringCourier = await trx('users').where({ id: shipment.courierId }).first();
                    if (deliveringCourier && deliveringCourier.referrerId) {
                        const referrer = await trx('users').where({ id: deliveringCourier.referrerId }).first();
                        const standardReferralBonus = 15;
                        // CRITICAL FIX: Validate referrer exists before creating bonus transaction
                        if (referrer && Number(deliveringCourier.referrerId) > 0) {
                            await trx('courier_transactions').insert({
                                id: this.generateId('TRN_REF'),
                                courierId: referrer.id,
                                type: 'Referral Bonus',
                                amount: standardReferralBonus,
                                description: `Company referral bonus for shipment ${shipment.id} delivered by ${deliveringCourier.name}`,
                                shipmentId: shipment.id,
                                timestamp: new Date().toISOString(),
                                status: 'Processed'
                            });

                            await trx('in_app_notifications').insert({
                                id: this.generateId('INAPP'),
                                userId: referrer.id,
                                message: `You earned ${standardReferralBonus} EGP referral bonus for ${deliveringCourier.name}'s delivery.`,
                                link: '/courier-financials',
                                isRead: false,
                                timestamp: new Date().toISOString()
                            });
                        } else if (deliveringCourier.referrerId) {
                            console.warn(`⚠️ Referrer ${deliveringCourier.referrerId} not found for courier ${shipment.courierId}, skipping referral bonus`);
                        }
                    }

                    // Recalculate courier balance from processed transactions
                    const courierTransactions = await trx('courier_transactions').where({ courierId: shipment.courierId });
                    const includedCourierTx = courierTransactions.filter(t => t.status === 'Processed' && !['Withdrawal Request','Withdrawal Declined'].includes(t.type));
                    const calculatedCourierBalance = includedCourierTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
                    const totalEarnings = courierTransactions.filter(t => t.status === 'Processed' && Number(t.amount) > 0).reduce((s, t) => s + (Number(t.amount) || 0), 0);
                    await trx('courier_stats').where({ courierId: shipment.courierId }).update({ currentBalance: calculatedCourierBalance, totalEarnings });
                    await trx('users').where({ id: shipment.courierId }).update({ walletBalance: calculatedCourierBalance });
                }

                // --- Client wallet transactions and balance update ---
                const client = await trx('users').where({ id: shipment.clientId }).first();
                if (client) {
                    const shippingFee = Number(shipment.clientFlatRateFee) || 0;
                    let walletChange = 0;
                    if (shipment.paymentMethod === 'COD') {
                        const packageValue = Number(shipment.packageValue) || 0;
                        const transactions = [
                            { id: this.generateId('TRN'), userId: client.id, type: 'Deposit', amount: packageValue, date: new Date().toISOString(), description: `Package value collected for delivered shipment ${shipment.id}`, status: 'Processed' },
                            { id: this.generateId('TRN'), userId: client.id, type: 'Payment', amount: -shippingFee, date: new Date().toISOString(), description: `Shipping fee for delivered shipment ${shipment.id}`, status: 'Processed' }
                        ];
                        await trx('client_transactions').insert(transactions);
                        walletChange = packageValue - shippingFee;
                    } else if (shipment.paymentMethod === 'Transfer') {
                        const amountToCollect = Number(shipment.amountToCollect) || 0;
                        if (amountToCollect > 0) {
                            await trx('client_transactions').insert({ id: this.generateId('TRN'), userId: client.id, type: 'Deposit', amount: amountToCollect, date: new Date().toISOString(), description: `Amount collected from recipient for delivered shipment ${shipment.id}`, status: 'Processed' });
                            walletChange = amountToCollect;
                        }
                    } else if (shipment.paymentMethod === 'Wallet') {
                        const packageValue = Number(shipment.packageValue) || 0;
                        if (packageValue > 0) {
                            await trx('client_transactions').insert({ id: this.generateId('TRN'), userId: client.id, type: 'Deposit', amount: packageValue, date: new Date().toISOString(), description: `Package value collected for delivered shipment ${shipment.id}`, status: 'Processed' });
                            walletChange = packageValue;
                        }
                    }

                    // Recalculate and persist client wallet balance
                    const clientTransactions = await trx('client_transactions').where({ userId: client.id });
                    const newClientBalance = clientTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                    await trx('users').where({ id: client.id }).update({ walletBalance: newClientBalance });
                    console.log(`💰 Updated client ${client.id} wallet balance: ${newClientBalance.toFixed(2)} EGP`);
                }

                console.log(`✅ Delivery code verified, shipment ${shipmentId} marked as Delivered and wallets updated`);
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
