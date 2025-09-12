const axios = require('axios');

/**
 * WhatsApp Business API Token Management Service
 * Handles token refresh and permanent token generation
 */
class WhatsAppTokenManager {
    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.businessId = process.env.WHATSAPP_BUSINESS_ID;
        this.appId = process.env.WHATSAPP_APP_ID;
        this.appSecret = process.env.WHATSAPP_APP_SECRET;
        this.clientId = process.env.WHATSAPP_CLIENT_ID;
        this.clientSecret = process.env.WHATSAPP_CLIENT_SECRET;
        
        // Validate required credentials
        if (!this.accessToken || !this.appId || !this.appSecret) {
            throw new Error('Missing required credentials for WhatsApp Token Manager');
        }
        
        // Check token expiry every 24 hours
        this.startTokenMonitoring();
    }

    /**
     * Start monitoring token expiry and refresh when needed
     */
    startTokenMonitoring() {
        // Check token status immediately
        this.checkTokenStatus();
        
        // Set up periodic checks (every 24 hours)
        setInterval(() => {
            this.checkTokenStatus();
        }, 24 * 60 * 60 * 1000); // 24 hours
        
        console.log('🔄 WhatsApp Token monitoring started - checking every 24 hours');
    }

    /**
     * Check if the current token is valid and get expiry information
     */
    async checkTokenStatus() {
        try {
            const response = await axios.get(`https://graph.facebook.com/v18.0/debug_token`, {
                params: {
                    input_token: this.accessToken,
                    access_token: `${this.appId}|${this.appSecret}`
                }
            });

            const tokenData = response.data.data;
            console.log('📋 Token Status:', {
                is_valid: tokenData.is_valid,
                expires_at: tokenData.expires_at ? new Date(tokenData.expires_at * 1000) : 'Never (Permanent)',
                scopes: tokenData.scopes,
                type: tokenData.type
            });

            // If token expires in less than 7 days, refresh it
            if (tokenData.expires_at) {
                const expiryDate = new Date(tokenData.expires_at * 1000);
                const daysUntilExpiry = (expiryDate - new Date()) / (1000 * 60 * 60 * 24);
                
                if (daysUntilExpiry < 7) {
                    console.log(`⚠️  Token expires in ${Math.ceil(daysUntilExpiry)} days, refreshing...`);
                    await this.refreshToken();
                } else {
                    console.log(`✅ Token is valid for ${Math.ceil(daysUntilExpiry)} more days`);
                }
            } else {
                console.log('✅ Token is permanent - no expiry');
            }

        } catch (error) {
            console.error('❌ Error checking token status:', error.response?.data || error.message);
            
            // If token is invalid, try to refresh
            if (error.response?.status === 401 || error.response?.status === 400) {
                console.log('🔄 Token appears invalid, attempting refresh...');
                await this.refreshToken();
            }
        }
    }

    /**
     * Refresh the access token to extend its lifetime
     */
    async refreshToken() {
        try {
            const response = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    fb_exchange_token: this.accessToken
                }
            });

            const newToken = response.data.access_token;
            const expiresIn = response.data.expires_in;

            console.log('🔄 Token refreshed successfully!');
            console.log(`📅 New token expires in: ${expiresIn ? `${expiresIn / (60 * 60 * 24)} days` : 'Never (Permanent)'}`);

            // Update environment variable (this would need to be persisted externally)
            process.env.WHATSAPP_ACCESS_TOKEN = newToken;
            this.accessToken = newToken;

            // Log the new token for manual update in Railway/production
            console.log('🔑 NEW ACCESS TOKEN (update in Railway):');
            console.log(newToken);
            
            return newToken;

        } catch (error) {
            console.error('❌ Error refreshing token:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Generate a long-lived (permanent) access token
     */
    async generateLongLivedToken() {
        try {
            // Step 1: Get long-lived user access token
            const userTokenResponse = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    fb_exchange_token: this.accessToken
                }
            });

            const longLivedUserToken = userTokenResponse.data.access_token;
            console.log('✅ Step 1: Long-lived user token obtained');

            // Step 2: Get permanent page access token
            const pageTokenResponse = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
                params: {
                    access_token: longLivedUserToken
                }
            });

            // Find the business account
            const businessAccount = pageTokenResponse.data.data.find(account => 
                account.id === this.businessId
            );

            if (businessAccount) {
                const permanentToken = businessAccount.access_token;
                
                console.log('🎉 PERMANENT TOKEN GENERATED!');
                console.log('🔑 Permanent Access Token:');
                console.log(permanentToken);
                console.log('📝 Update your Railway environment variables with this token');
                
                return permanentToken;
            } else {
                throw new Error(`Business account ${this.businessId} not found`);
            }

        } catch (error) {
            console.error('❌ Error generating permanent token:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get current token information
     */
    getCurrentToken() {
        return this.accessToken;
    }
}

module.exports = WhatsAppTokenManager;
