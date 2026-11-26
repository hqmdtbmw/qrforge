import { createNotification } from './db';

const TIPS = [
  "Tip: Dynamic QR codes can be updated even after printing! 🔄",
  "Tip: Add your logo to QR codes to increase brand recognition. 🎨",
  "Tip: Check your analytics to see which locations scan your codes most. 📍",
  "Tip: Use folders to organize your QR codes by campaign or client. 📁",
  "Tip: Pro users can create unlimited dynamic QR codes! 🚀",
  "Tip: Share your referral link to earn extra Pro days. 🎁",
  "Tip: Social Studio lets you build beautiful landing pages in seconds. 🌐",
  "Tip: Bulk Forge can generate hundreds of QR codes at once. ⚡"
];

const REMINDERS = [
  "Don't forget to check your scan stats today! 📊",
  "New ideas? Save them in your Idea Forge. 💡",
  "Your Pro trial is active. Have you tried all features yet? 💎",
  "Organize your workspace with folders for better productivity. 📂"
];

class EngagementService {
  private interval: any = null;

  start(userId: string) {
    if (this.interval) return;

    // Send a welcome tip after 15 seconds
    setTimeout(() => {
      this.sendRandomTip(userId);
    }, 15000);

    // Periodic engagement every 15 minutes (simulated for demo/active sessions)
    // In a real app, this would be server-side push notifications
    this.interval = setInterval(() => {
      const chance = Math.random();
      if (chance > 0.5) {
        this.sendRandomTip(userId);
      } else if (chance > 0.1) {
        this.sendRandomReminder(userId);
      }
    }, 15 * 60 * 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async sendRandomTip(userId: string) {
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    await createNotification(userId, 'info', 'Pro Tip 💡', tip);
  }

  private async sendRandomReminder(userId: string) {
    const reminder = REMINDERS[Math.floor(Math.random() * REMINDERS.length)];
    await createNotification(userId, 'info', 'Reminder 🔔', reminder);
  }
}

export const engagementService = new EngagementService();
