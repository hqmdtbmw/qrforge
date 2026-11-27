import test from "node:test";
import assert from "node:assert/strict";
import {
  buildContentPrompt,
  buildDesignPrompt,
  parseContentSuggestions,
  parseDesignSuggestions,
} from "../src/lib/aiSuggestions.ts";

test("the design prompt asks for three designs with the fields the client applies", () => {
  assert.equal(
    buildDesignPrompt("a coffee shop loyalty card"),
    'Generate 3 QR code designs for: "a coffee shop loyalty card". Return a JSON array of 3 objects, each with fgColor, bgColor, eyeFrameColor and eyeInnerColor as hex colour strings, matrixStyle, eyeFrameStyle and eyeInnerStyle as style names, and an optional margin in pixels.'
  );
});

test("the design prompt keeps the user's words in it", () => {
  const prompt = buildDesignPrompt("wedding invitations, navy and gold");
  assert.match(prompt, /wedding invitations, navy and gold/);
  assert.match(prompt, /JSON array of 3 objects/);
});

test("the content prompt names the type and the context and asks for title and content", () => {
  assert.equal(
    buildContentPrompt("vcard", "Ada Lovelace, software engineer"),
    'Suggest optimized content for a QR code of type "vcard" with context: "Ada Lovelace, software engineer". Return a JSON object with a \'suggestions\' array of 3 objects, each with a title and a content string.'
  );
});

test("the content prompt works with an empty context", () => {
  assert.match(buildContentPrompt("link", ""), /with context: ""/);
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

test("a good design reply comes back as the array the client expects", () => {
  const parsed = parseDesignSuggestions(JSON.stringify([goodDesign]));
  assert.deepEqual(parsed, [goodDesign]);
});

test("three good designs all come through", () => {
  const designs = [goodDesign, { ...goodDesign, fgColor: "#003087" }, { ...goodDesign, bgColor: "#f5f0e6" }];
  assert.equal(parseDesignSuggestions(JSON.stringify(designs))?.length, 3);
});

test("a design without a margin is still fine, margin is optional", () => {
  const { margin, ...noMargin } = goodDesign;
  assert.deepEqual(parseDesignSuggestions(JSON.stringify([noMargin])), [noMargin]);
});

test("a design missing a colour is dropped, the good ones are kept", () => {
  const broken = { ...goodDesign };
  delete (broken as Record<string, unknown>).bgColor;
  const parsed = parseDesignSuggestions(JSON.stringify([broken, goodDesign]));
  assert.deepEqual(parsed, [goodDesign]);
});

test("a design with a string margin is dropped, it would break the layout", () => {
  const broken = { ...goodDesign, margin: "8" };
  assert.equal(parseDesignSuggestions(JSON.stringify([broken])), null);
});

test("a design reply that is not an array is no good at all", () => {
  assert.equal(parseDesignSuggestions(JSON.stringify(goodDesign)), null);
  assert.equal(parseDesignSuggestions(JSON.stringify({ designs: [goodDesign] })), null);
});

test("a design reply that is not JSON at all gives back null", () => {
  assert.equal(parseDesignSuggestions("here are your designs..."), null);
  assert.equal(parseDesignSuggestions(""), null);
});

test("an empty design array gives back null, not an empty list", () => {
  assert.equal(parseDesignSuggestions("[]"), null);
});

test("a content reply in the object shape comes back as just the array", () => {
  // This is the shape the prompt asks for. The server used to send the
  // whole object back, and the client checks suggestions.length, which
  // an object does not have, so nothing ever showed up.
  const reply = JSON.stringify({
    suggestions: [
      { title: "Work card", content: "BEGIN:VCARD\nFN:Ada Lovelace\nEND:VCARD" },
      { title: "Short link", content: "https://example.com/ada" },
      { title: "Plain text", content: "Ada Lovelace, software engineer" },
    ],
  });
  const parsed = parseContentSuggestions(reply);
  assert.equal(parsed?.length, 3);
  assert.equal(parsed?.[0].title, "Work card");
  assert.equal(parsed?.[0].content, "BEGIN:VCARD\nFN:Ada Lovelace\nEND:VCARD");
  assert.equal(parsed?.[1].content, "https://example.com/ada");
});

test("a content reply that is already a bare array works too", () => {
  const reply = JSON.stringify([{ title: "One", content: "https://example.com" }]);
  assert.deepEqual(parseContentSuggestions(reply), [{ title: "One", content: "https://example.com" }]);
});

test("plain string suggestions are turned into objects with a content field", () => {
  const reply = JSON.stringify({ suggestions: ["https://example.com/a", "https://example.com/b"] });
  assert.deepEqual(parseContentSuggestions(reply), [
    { content: "https://example.com/a" },
    { content: "https://example.com/b" },
  ]);
});

test("a content item without any content is dropped, the rest are kept", () => {
  const reply = JSON.stringify({
    suggestions: [{ title: "No content here" }, { title: "Good one", content: "hello" }, ""],
  });
  assert.deepEqual(parseContentSuggestions(reply), [{ title: "Good one", content: "hello" }]);
});

test("a content reply with no usable suggestions gives back null", () => {
  assert.equal(parseContentSuggestions(JSON.stringify({ suggestions: [] })), null);
  assert.equal(parseContentSuggestions(JSON.stringify({ suggestions: [{ title: "Empty" }] })), null);
  assert.equal(parseContentSuggestions(JSON.stringify({ other: "shape" })), null);
  assert.equal(parseContentSuggestions("not json"), null);
});

test("a content reply with a non-string title keeps the content and drops the title", () => {
  const reply = JSON.stringify({ suggestions: [{ title: 42, content: "hello" }] });
  assert.deepEqual(parseContentSuggestions(reply), [{ content: "hello" }]);
});
