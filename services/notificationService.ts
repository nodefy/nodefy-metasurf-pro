import { Notification } from '../types';

export const sendSurfscaleNotification = async (campaignName: string): Promise<Notification> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        message: `Surfscale Mode geactiveerd voor "${campaignName}"`,
        details: `Er is een automatische email verzonden naar Benjamin@nodefy.nl met de details van deze activering.`,
        type: 'EMAIL_SENT',
        isRead: false
    };
};
