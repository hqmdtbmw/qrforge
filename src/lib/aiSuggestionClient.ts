// The pure parts of the two AI suggestion calls in gemini.ts. I pulled
// them out here so they can be tested without a network call and without
// Firebase: building each request, and checking what comes back before
// the modal reads it. The modal does suggestions.length on the result,
// so anything that is not an array would leave it with nothing to show
// and no clear error. The server already validates the shape, but the
// client used to trust whatever came back, and the wrapped object shape
// broke content suggestions once before, so I check here too.

export interface AiSuggestionRequest {
  url: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

function authHeaders(token?: string | null): Record<string, string> {
  if (typeof token !== "string" || token.length === 0) return {};
  return { Authorization: `Bearer ${token}` };
}

// The request for a design suggestion: the prompt, the endpoint, and
// the signed-in user's token when there is one.
export function buildDesignSuggestionRequest(prompt: string, token?: string | null): AiSuggestionRequest {
  return {
    url: "/api/ai/generate-design",
    body: { prompt },
    headers: authHeaders(token),
  };
}

// The request for a content suggestion: the QR type, the context, and
// the signed-in user's token when there is one.
export function buildContentSuggestionRequest(type: string, context: string, token?: string | null): AiSuggestionRequest {
  return {
    url: "/api/ai/suggest-content",
    body: { type, context },
    headers: authHeaders(token),
  };
}

// Check a reply from either suggestion endpoint before the modal reads
// it. A real array passes through as it is, an object holding a
// suggestions array is unwrapped to just that array, and anything else
// gives back null, so the caller can show its error instead of handing
// the modal something it cannot read. An empty array stays an empty
// array, it is a valid reply with nothing in it.
export function normalizeSuggestions(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null) {
    const suggestions = (data as Record<string, unknown>).suggestions;
    if (Array.isArray(suggestions)) return suggestions;
  }
  return null;
}
