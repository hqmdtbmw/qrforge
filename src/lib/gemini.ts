import axios from 'axios';
import { auth } from '../firebase';
import {
  buildContentSuggestionRequest,
  buildDesignSuggestionRequest,
  normalizeSuggestions,
} from './aiSuggestionClient';

export async function generateQRDesignSuggestions(prompt: string) {
  try {
    const token = await auth.currentUser?.getIdToken();
    const request = buildDesignSuggestionRequest(prompt, token);
    const response = await axios.post(request.url, request.body, {
      headers: request.headers,
    });
    return normalizeSuggestions(response.data);
  } catch (error) {
    console.error("AI Design Suggestion Error:", error);
    return null;
  }
}

export async function suggestQRContent(type: string, context: string) {
  try {
    const token = await auth.currentUser?.getIdToken();
    const request = buildContentSuggestionRequest(type, context, token);
    const response = await axios.post(request.url, request.body, {
      headers: request.headers,
    });
    return normalizeSuggestions(response.data);
  } catch (error) {
    console.error("AI Content Suggestion Error:", error);
    return null;
  }
}
