import axios from 'axios';
import { auth } from '../firebase';

const API_BASE = '/api/notifications';

export const notificationService = {
  async sendWelcome(email: string, phone?: string, name?: string) {
    try {
      const response = await axios.post(`${API_BASE}/send-welcome`, {
        email,
        phone,
        name
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
      throw error;
    }
  },

  async sendOTP(otp: string, email?: string, phone?: string) {
    try {
      const response = await axios.post(`${API_BASE}/send-otp`, {
        email,
        phone,
        otp
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send OTP:', error);
      throw error;
    }
  },

  async sendPush(tokens: string[], title: string, body: string, data?: any) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.post(`${API_BASE}/push`, {
        tokens,
        title,
        body,
        data
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }
};
