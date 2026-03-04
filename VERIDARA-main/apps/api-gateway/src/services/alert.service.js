class AlertService {
    constructor() {
        this.alerts = [];
    }

    /**
     * Sends a real-time notification to the user
     */
    async triggerAlert(userId, alertType, message, metadata = {}) {
        const alert = {
            id: `alert_${Date.now()}`,
            userId,
            type: alertType, // 'suspicious_activity', 'deepfake_detected', 'impersonation'
            message,
            metadata,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.alerts.push(alert);
        console.log(`[AlertService] ALERT TRIGGERED for User ${userId}: [${alertType}] ${message}`);

        // In production, this would trigger a WebSocket push or AWS SNS/SES
        return alert;
    }

    /**
     * Retrieves alerts for a user
     */
    async getAlerts(userId) {
        return this.alerts.filter(a => a.userId === userId);
    }
}

module.exports = new AlertService();
