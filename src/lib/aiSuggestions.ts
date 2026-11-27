// The prompt building and response checking for the two Gemini
// endpoints in server.ts. This used to be inline in the route handlers,
// with the model reply passed straight to the client as JSON.parse
// output. That broke the content suggestions in a quiet way: the prompt
// asked for an object with a suggestions array, the server sent that
// whole object back, and the client checks suggestions.length, which an
// object does not have, so nothing ever showed up. These helpers live
// here so the shape the client needs can be tested without a network
// call, and the server only ever sends back replies the client can use.

// The design endpoint asks for 3 designs. Each one has to carry the
// fields CreateQRModal applies, colours as hex strings and the style
// names the QR library expects, so the prompt spells them out.
export function buildDesignPrompt(prompt: string): string {
  return `Generate 3 QR code designs for: "${prompt}". Return a JSON array of 3 objects, each with fgColor, bgColor, eyeFrameColor and eyeInnerColor as hex colour strings, matrixStyle, eyeFrameStyle and eyeInnerStyle as style names, and an optional margin in pixels.`;
}

// The content endpoint asks for 3 suggestions, each with a short title
// and the content itself. The client reads suggestion.title and
// suggestion.content, so the prompt asks for objects, not bare strings.
export function buildContentPrompt(type: string, context: string): string {
  return `Suggest optimized content for a QR code of type "${type}" with context: "${context}". Return a JSON object with a 'suggestions' array of 3 objects, each with a title and a content string.`;
}

export interface DesignSuggestion {
  fgColor: string;
  bgColor: string;
  eyeFrameColor: string;
  eyeInnerColor: string;
  matrixStyle: string;
  eyeFrameStyle: string;
  eyeInnerStyle: string;
  margin?: number;
}

const designFields = [
  "fgColor",
  "bgColor",
  "eyeFrameColor",
  "eyeInnerColor",
  "matrixStyle",
  "eyeFrameStyle",
  "eyeInnerStyle",
] as const;

function isDesignSuggestion(value: unknown): value is DesignSuggestion {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  for (const field of designFields) {
    if (typeof item[field] !== "string" || (item[field] as string).length === 0) return false;
  }
  if (item.margin !== undefined && typeof item.margin !== "number") return false;
  return true;
}

// Pull the usable designs out of a model reply. Anything that is not a
// JSON array of objects with all the fields the client applies is
// dropped, and null comes back when nothing usable is left, so the
// server can answer with an error instead of handing the client a
// design full of undefined colours.
export function parseDesignSuggestions(text: string): DesignSuggestion[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const designs = parsed.filter(isDesignSuggestion);
  return designs.length > 0 ? designs : null;
}

export interface ContentSuggestion {
  title?: string;
  content: string;
}

function toContentSuggestion(value: unknown): ContentSuggestion | null {
  if (typeof value === "string") {
    return value.length > 0 ? { content: value } : null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.content !== "string" || item.content.length === 0) return null;
  const suggestion: ContentSuggestion = { content: item.content };
  if (typeof item.title === "string" && item.title.length > 0) suggestion.title = item.title;
  return suggestion;
}

// Pull the usable content suggestions out of a model reply. The prompt
// asks for an object with a suggestions array, but the client wants the
// array itself, so this returns just the array, with plain strings
// turned into objects so older replies still work. Null comes back when
// nothing usable is left.
export function parseContentSuggestions(text: string): ContentSuggestion[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as Record<string, unknown>).suggestions)
      ? (parsed as Record<string, unknown>).suggestions as unknown[]
      : null;
  if (!list) return null;
  const suggestions = list
    .map(toContentSuggestion)
    .filter((item): item is ContentSuggestion => item !== null);
  return suggestions.length > 0 ? suggestions : null;
}
