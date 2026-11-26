import axios from 'axios';
import { auth } from '../firebase';

export async function generateQRDesignSuggestions(prompt: string) {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await axios.post('/api/ai/generate-design', { prompt }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error("AI Design Suggestion Error:", error);
    return null;
  }
}

export async function suggestQRContent(type: string, context: string) {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await axios.post('/api/ai/suggest-content', { type, context }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error("AI Content Suggestion Error:", error);
    return null;
  }
}
