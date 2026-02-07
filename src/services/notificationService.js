/**
 * Simple wrapper for browser Notifications
 */
export const notificationService = {
    requestPermission: async () => {
        if (!("Notification" in window)) {
            console.warn("This browser does not support desktop notification");
            return false;
        }

        if (Notification.permission === "granted") return true;

        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }

        return false;
    },

    send: (title, body, icon = '/logo.png') => {
        if (Notification.permission === "granted") {
            new Notification(title, { body, icon });
        } else {
            console.log(`[Notification Fallback] ${title}: ${body}`);
        }
    }
};
