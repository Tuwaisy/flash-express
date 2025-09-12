const express = require('express');
const whatsappService = require('./services/whatsapp');
const router = express.Router();

/**
 * WhatsApp Token Management Endpoints
 * These endpoints help manage WhatsApp Business API tokens
 */

// Get WhatsApp service status and token information
router.get('/status', async (req, res) => {
    try {
        const status = whatsappService.getStatus();
        
        // Check token status if token manager is available
        if (status.tokenManagerActive) {
            const tokenCheck = await whatsappService.checkTokenStatus();
            status.tokenStatus = tokenCheck;
        }
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Refresh the current access token
router.post('/refresh-token', async (req, res) => {
    try {
        const result = await whatsappService.refreshToken();
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    newToken: result.token.substring(0, 20) + '...' // Show partial token for security
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate a permanent (long-lived) access token
router.post('/generate-permanent-token', async (req, res) => {
    try {
        const result = await whatsappService.generatePermanentToken();
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Permanent token generated successfully',
                data: {
                    permanentToken: result.token,
                    instructions: [
                        '1. Copy the permanent token above',
                        '2. Update your Railway environment variable: WHATSAPP_ACCESS_TOKEN',
                        '3. Restart your Railway service',
                        '4. This token should never expire and won\'t need refresh'
                    ]
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test WhatsApp messaging (send test message)
router.post('/test-message', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone and message are required'
            });
        }
        
        const result = await whatsappService.sendMessage(phone, message);
        
        res.json({
            success: result.success,
            data: result,
            message: result.success ? 'Test message sent successfully' : 'Failed to send test message'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Check specific token validity
router.post('/check-token', async (req, res) => {
    try {
        const result = await whatsappService.checkTokenStatus();
        
        res.json({
            success: result.success,
            data: result,
            message: result.success ? 'Token status checked successfully' : 'Failed to check token status'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
