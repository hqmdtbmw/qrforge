import test from "node:test";
import assert from "node:assert/strict";
import {
  buildContentSuggestionRequest,
  buildDesignSuggestionRequest,
  normalizeSuggestions,
} from "../src/lib/aiSuggestionClient.ts";

test("the design request goes to the design endpoint with the prompt and a bearer token", () => {
  const request = buildDesignSuggestionRequest("a coffee shop loyalty card", "token-123");
  assert.equal(request.url, "/api/ai/generate-design");
  assert.deepEqual(request.body, { prompt: "a coffee shop loyalty card" });
  assert.deepEqual(request.headers, { Authorization: "Bearer token-123" });
});

test("the content request goes to the content endpoint with the type, the context and a bearer token", () => {
  const request = buildContentSuggestionRequest("vcard", "Ada Lovelace, software engineer", "token-123");
  assert.equal(request.url, "/api/ai/suggest-content");
  assert.deepEqual(request.body, { type: "vcard", context: "Ada Lovelace, software engineer" });
  assert.deepEqual(request.headers, { Authorization: "Bearer token-123" });
});

test("a missing token sends no authorization header instead of a bearer undefined", () => {
  assert.deepEqual(buildDesignSuggestionRequest("a coffee shop loyalty card").headers, {});
  assert.deepEqual(buildDesignSuggestionRequest("a coffee shop loyalty card", undefined).headers, {});
  assert.deepEqual(buildDesignSuggestionRequest("a coffee shop loyalty card", null).headers, {});
  assert.deepEqual(buildContentSuggestionRequest("link", "https://example.com").headers, {});
  assert.deepEqual(buildContentSuggestionRequest("link", "https://example.com", "").headers, {});
});

test("the design request keeps the user's exact prompt in the body", () => {
  const request = buildDesignSuggestionRequest("wedding invitations, navy and gold", "token-123");
  assert.equal((request.body as Record<string, unknown>).prompt, "wedding invitations, navy and gold");
});

const goodDesign = {
  fgColor: "#111111",
  bgColor: "#ffffff",
  eyeFrameColor: "#111111",
  eyeInnerColor: "#111111",
  matrixStyle: "dots",
  eyeFrameStyle: "rounded",
  eyeInnerStyle: "dot",
  margin: 8,
};

test("a real array of suggestions passes through as it is", () => {
  assert.deepEqual(normalizeSuggestions([goodDesign]), [goodDesign]);
  assert.deepEqual(
    normalizeSuggestions([{ title: "Work card", content: "BEGIN:VCARD\nFN:Ada Lovelace\nEND:VCARD" }]),
    [{ title: "Work card", content: "BEGIN:VCARD\nFN:Ada Lovelace\nEND:VCARD" }]
  );
});

test("a wrapped object is unwrapped to just its suggestions array", () => {
  // This is the shape that silently broke content suggestions before:
  // the server sent the whole object, and the modal checks
  // suggestions.length, which an object does not have.
  assert.deepEqual(
    normalizeSuggestions({ suggestions: [goodDesign, { ...goodDesign, fgColor: "#003087" }] }),
    [goodDesign, { ...goodDesign, fgColor: "#003087" }]
  );
});

test("an object without a suggestions array gives back null", () => {
  assert.equal(normalizeSuggestions({ designs: [goodDesign] }), null);
  assert.equal(normalizeSuggestions({ other: "shape" }), null);
  assert.equal(normalizeSuggestions({ suggestions: "not an array" }), null);
  assert.equal(normalizeSuggestions({}), null);
});

test("null, a string and a number give back null, not something the modal cannot read", () => {
  assert.equal(normalizeSuggestions(null), null);
  assert.equal(normalizeSuggestions(undefined), null);
  assert.equal(normalizeSuggestions("here are your designs..."), null);
  assert.equal(normalizeSuggestions(42), null);
});

test("an empty array stays an empty array", () => {
  assert.deepEqual(normalizeSuggestions([]), []);
  assert.deepEqual(normalizeSuggestions({ suggestions: [] }), []);
});
