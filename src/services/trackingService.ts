import { UAParser } from 'ua-parser-js';
import { nanoid } from 'nanoid';

interface TrackingEvent {
  type: string;
  data?: any;
  timestamp: string;
}

class TrackingService {
  private sessionId: string;
  private startTime: number;
  private events: TrackingEvent[] = [];
  private userId: string | null = null;

  constructor() {
    this.sessionId = nanoid();
    this.startTime = Date.now();
    this.setupListeners();
  }

  setUserId(uid: string) {
    this.userId = uid;
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    // Track page views
    window.addEventListener('popstate', () => this.trackPageView());
    
    // Track visibility change (to calculate duration)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });

    // Track beforeunload
    window.addEventListener('beforeunload', () => this.flush());
  }

  trackPageView() {
    this.trackEvent('page_view', { path: window.location.pathname });
  }

  trackEvent(type: string, data?: any) {
    const event = {
      type,
      data,
      timestamp: new Date().toISOString()
    };
    this.events.push(event);
    
    // Auto-flush if we have many events
    if (this.events.length >= 10) {
      this.flush();
    }
  }

  async flush() {
    if (this.events.length === 0 || !this.userId) return;

    const endTime = Date.now();
    const duration = Math.floor((endTime - this.startTime) / 1000);
    
    const parser = new UAParser();
    const ua = parser.getResult();

    const payload = {
      userId: this.userId,
      sessionId: this.sessionId,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      referrer: document.referrer,
      path: window.location.pathname,
      device: {
        os: ua.os.name,
        browser: ua.browser.name,
        type: ua.device.type || 'desktop'
      },
      events: [...this.events],
      source: this.getUtmSource()
    };

    try {
      // Send to server-side endpoint for processing
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Clear events after successful flush
      this.events = [];
      // Reset start time for the "next" segment of the session if they stay on page
      this.startTime = Date.now();
    } catch (err) {
      console.error('Failed to flush analytics:', err);
    }
  }

  private getUtmSource() {
    const params = new URLSearchParams(window.location.search);
    return params.get('utm_source') || params.get('ref') || 'direct';
  }
}

export const trackingService = new TrackingService();
