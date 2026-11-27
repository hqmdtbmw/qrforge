import test from "node:test";
import assert from "node:assert/strict";
import { buildPaynowPayload, buildPromptpayPayload, buildQrPayload, buildPixPayload } from "../src/lib/qrPayload.ts";
import { crc16 } from "../src/lib/utils.ts";

test("text and link pass their field straight through", () => {
  assert.equal(buildQrPayload("text", { text: "hello there" }), "hello there");
  assert.equal(buildQrPayload("link", { url: "https://mdtbmw.com" }), "https://mdtbmw.com");
  assert.equal(buildQrPayload("text", {}), "");
});

test("phone and sms use the tel and SMSTO formats", () => {
  assert.equal(buildQrPayload("phone", { phone: "+2348132996542" }), "tel:+2348132996542");
  assert.equal(
    buildQrPayload("sms", { phone: "+2348132996542", message: "hi" }),
    "SMSTO:+2348132996542:hi"
  );
});

test("email encodes the subject and body", () => {
  assert.equal(
    buildQrPayload("email", { email: "a@b.com", subject: "hello world", body: "line one & two" }),
    "mailto:a@b.com?subject=hello%20world&body=line%20one%20%26%20two"
  );
});

test("wifi uses the WIFI scheme with encryption, ssid and password", () => {
  assert.equal(
    buildQrPayload("wifi", { encryption: "WPA", ssid: "home-net", password: "s3cret" }),
    "WIFI:T:WPA;S:home-net;P:s3cret;;"
  );
  assert.equal(
    buildQrPayload("wifi", { encryption: "nopass", ssid: "open-net", password: "" }),
    "WIFI:T:nopass;S:open-net;P:;;"
  );
});

test("whatsapp builds a wa.me link with the message encoded", () => {
  assert.equal(
    buildQrPayload("whatsapp", { phone: "2348132996542", message: "hello there" }),
    "https://wa.me/2348132996542?text=hello%20there"
  );
});

test("social handles strip a leading @, once", () => {
  assert.equal(buildQrPayload("instagram", { text: "@mdtbmw" }), "https://instagram.com/mdtbmw");
  assert.equal(buildQrPayload("twitter", { text: "mdtbmw" }), "https://twitter.com/mdtbmw");
  assert.equal(buildQrPayload("linkedin", { text: "mdtbmw" }), "https://linkedin.com/in/mdtbmw");
});

test("vcard keeps the field order and the literal backslash-n separators", () => {
  const out = buildQrPayload("vcard", {
    firstName: "Daniel",
    lastName: "Attah",
    org: "HeyTek",
    jobTitle: "Designer",
    email: "info@mdtbmw.com",
    phone: "+2348132996542",
    website: "https://mdtbmw.com",
    address: "Benin City",
    notes: "say hi",
  });
  assert.equal(
    out,
    "BEGIN:VCARD\\nVERSION:3.0\\nN:Attah;Daniel\\nORG:HeyTek\\nTITLE:Designer\\nEMAIL:info@mdtbmw.com\\nTEL:+2348132996542\\nURL:https://mdtbmw.com\\nADR:;;Benin City\\nNOTE:say hi\\nEND:VCARD"
  );
});

test("vcard falls back to title when there is no job title", () => {
  const out = buildQrPayload("vcard", { firstName: "A", lastName: "B", title: "Manager" });
  assert.match(out, /TITLE:Manager/);
});

test("event builds a VEVENT block", () => {
  assert.equal(
    buildQrPayload("event", { eventTitle: "Launch", location: "Lagos", description: "doors open" }),
    "BEGIN:VEVENT\\nSUMMARY:Launch\\nLOCATION:Lagos\\nDESCRIPTION:doors open\\nEND:VEVENT"
  );
});

test("crypto lowercases the currency and appends the amount", () => {
  assert.equal(
    buildQrPayload("crypto", { currency: "BTC", address: "1A2b3C", amount: "0.01" }),
    "btc:1A2b3C?amount=0.01"
  );
  assert.equal(
    buildQrPayload("crypto", { currency: "ETH", address: "0xabc", amount: "" }),
    "eth:0xabc?amount="
  );
});

test("file passes the uploaded file url through", () => {
  assert.equal(buildQrPayload("file", { fileUrl: "https://cdn.example.com/menu.pdf" }), "https://cdn.example.com/menu.pdf");
});

test("social, menu and flow encode their data as JSON", () => {
  const links = [{ id: "1", platform: "instagram", url: "https://instagram.com/mdtbmw" }];
  assert.equal(
    buildQrPayload("social", { profileName: "Daniel", socialLinks: links }),
    JSON.stringify({ type: "social", profileName: "Daniel", links })
  );
  const items = [{ id: "1", name: "Jollof", price: "2500" }];
  assert.equal(
    buildQrPayload("menu", { menuItems: items }),
    JSON.stringify({ type: "menu", items })
  );
  const steps = [{ id: "1", type: "info", title: "Welcome" }];
  assert.equal(
    buildQrPayload("flow", { flowSteps: steps }),
    JSON.stringify({ type: "flow", steps })
  );
});

test("bank sepa builds the SCT credit transfer payload", () => {
  assert.equal(
    buildQrPayload("bank", {
      bankStandard: "sepa",
      bankBic: "DEUTDEFF",
      bankName: "Daniel Attah",
      bankIban: "DE89370400440532013000",
      amount: "25.00",
      bankReference: "invoice 12",
    }),
    "BCD\\n001\\n1\\nSCT\\nDEUTDEFF\\nDaniel Attah\\nDE89370400440532013000\\nEUR25.00\\n\\ninvoice 12"
  );
});

test("bank upi builds the upi pay link with encoded names", () => {
  assert.equal(
    buildQrPayload("bank", {
      bankStandard: "upi",
      bankUpiId: "daniel@okbank",
      bankName: "Daniel Attah",
      amount: "100",
      bankReference: "lunch money",
    }),
    "upi://pay?pa=daniel@okbank&pn=Daniel%20Attah&am=100&cu=INR&tn=lunch%20money"
  );
});

test("bank pix builds a full BRCode payload with a valid crc", () => {
  const out = buildPixPayload({
    bankPixKey: "daniel@example.com",
    bankName: "Daniel Attah",
    bankCity: "Benin City",
    amount: "150.50",
  });
  assert.equal(
    out,
    "00020126400014BR.GOV.BCB.PIX0118daniel@example.com5204000053039865406150.505802BR5912DANIEL ATTAH6010BENIN CITY62070503***6304F67F"
  );
  // The last four characters are the CRC16 of everything before them.
  assert.equal(out.slice(-4), crc16(out.slice(0, -4)));
  assert.equal(buildQrPayload("bank", {
    bankStandard: "pix",
    bankPixKey: "daniel@example.com",
    bankName: "Daniel Attah",
    bankCity: "Benin City",
    amount: "150.50",
  }), out);
});

test("bank pix leaves the amount field out when the amount is zero", () => {
  const out = buildPixPayload({ bankPixKey: "abc", bankName: "Shop", bankCity: "Lagos", amount: "" });
  assert.ok(!out.includes("54"), "no 54 field for a zero amount");
  assert.equal(out.slice(-4), crc16(out.slice(0, -4)));
});

test("bank pix trims long names and cities to the field limits", () => {
  const out = buildPixPayload({
    bankPixKey: "abc",
    bankName: "A Very Long Business Name That Goes Past Twenty Five Chars",
    bankCity: "A Very Long City Name Here",
    amount: "",
  });
  assert.ok(out.includes("5925A VERY LONG BUSINESS NAME"), "name cut to 25 chars, uppercased");
  assert.ok(out.includes("6015A VERY LONG CIT"), "city cut to 15 chars, uppercased");
  assert.equal(out.slice(-4), crc16(out.slice(0, -4)));
});

test("bank pix falls back to QRForge and CITY when nothing is given", () => {
  const out = buildPixPayload({ bankPixKey: "k" });
  assert.ok(out.includes("5907QRFORGE"), "default merchant name");
  assert.ok(out.includes("6004CITY"), "default city");
  assert.equal(out.slice(-4), crc16(out.slice(0, -4)));
});

test("bank nqr uses a supplied payload, otherwise builds one", () => {
  assert.equal(
    buildQrPayload("bank", { bankStandard: "nqr", nqrPayload: "nqr://pay?custom=1" }),
    "nqr://pay?custom=1"
  );
  assert.equal(
    buildQrPayload("bank", { bankStandard: "nqr", bankAccount: "0123456789", bankName: "GTBank", amount: "5000" }),
    "nqr://pay?acc=0123456789&bank=GTBank&name=GTBank&am=5000"
  );
});

test("bank paynow builds a full EMVCo payload with a valid crc", () => {
  const out = buildPaynowPayload({
    bankPaynowProxyType: "0",
    bankPaynowProxy: "+6581234567",
    bankName: "Daniel Attah",
    bankCity: "Singapore",
    amount: "25.50",
  });
  assert.equal(
    out,
    "00020101021126380009SG.PAYNOW010100211+658123456703010520400005303702540525.505802SG5912DANIEL ATTAH6009SINGAPORE63042351"
  );
  // The last four characters are the CRC16 of everything before them.
  assert.equal(out.slice(-4), crc16(out.slice(0, -4)));
  assert.equal(buildQrPayload("bank", {
    bankStandard: "paynow",
    bankPaynowProxy: "+6581234567",
    bankName: "Daniel Attah",
    bankCity: "Singapore",
    amount: "25.50",
  }), out);
});

test("bank paynow takes a UEN proxy and leaves the amount out when it is zero", () => {
  const out = buildPaynowPayload({
    bankPaynowProxyType: "2",
    bankPaynowProxy: "201234567A",
    bankName: "Shop",
    bankCity: "Singapore",
    amount: "",
  });
  assert.ok(out.includes("0101202"), "proxy type 2 for a UEN");
  assert.ok(out.includes("0210201234567A"), "the UEN value itself");
  assert.ok(!out.includes("54"), "no 54 field for a zero amount");
  assert.equal(out.slice(-4), crc16(out.slice(0, -4)));
});

test("bank promptpay builds a full EMVCo payload with a valid crc", () => {
  const out = buildPromptpayPayload({
    bankPromptpayProxyType: "01",
    bankPromptpayProxy: "0812345678",
    bankName: "Daniel Attah",
    bankCity: "Bangkok",
    amount: "100.00",
  });
  assert.equal(
    out,
    "00020101021129430016A000000677010111010201021300668123456785204000053037645406100.005802TH5912DANIEL ATTAH6007BANGKOK6304306A"
  );
  assert.equal(out.slice(-4), crc16(out.slice(0, -4)));
  assert.equal(buildQrPayload("bank", {
    bankStandard: "promptpay",
    bankPromptpayProxy: "0812345678",
    bankName: "Daniel Attah",
    bankCity: "Bangkok",
    amount: "100.00",
  }), out);
});

test("bank promptpay turns a mobile number into the 13 digit proxy", () => {
  const out = buildPromptpayPayload({
    bankPromptpayProxyType: "01",
    bankPromptpayProxy: "081 234 5678",
    bankName: "Shop",
    bankCity: "Bangkok",
    amount: "",
  });
  assert.ok(out.includes("02130066812345678"), "0066 plus the number without its leading zero");
  assert.ok(!out.includes("54"), "no 54 field for a zero amount");
  assert.equal(out.slice(-4), crc16(out.slice(0, -4)));
});

test("bank promptpay keeps a national id proxy as it is", () => {
  const out = buildPromptpayPayload({
    bankPromptpayProxyType: "02",
    bankPromptpayProxy: "1234567890123",
    bankName: "Shop",
    bankCity: "Bangkok",
    amount: "",
  });
  assert.ok(out.includes("010202"), "proxy type 02 for a national id");
  assert.ok(out.includes("02131234567890123"), "the 13 digit id itself");
  assert.equal(out.slice(-4), crc16(out.slice(0, -4)));
});

test("bank with an unknown standard falls back to plain text", () => {
  assert.equal(
    buildQrPayload("bank", {
      bankStandard: "generic",
      bankName: "GTBank",
      bankAccount: "0123456789",
      amount: "5000",
      currency: "NGN",
      bankReference: "rent",
    }),
    "Bank: GTBank\\nAccount: 0123456789\\nAmount: 5000 NGN\\nRef: rent"
  );
});

test("an unknown type falls back to text, then url", () => {
  assert.equal(buildQrPayload("app" as never, { text: "hello", url: "https://x.com" }), "hello");
  assert.equal(buildQrPayload("app" as never, { url: "https://x.com" }), "https://x.com");
  assert.equal(buildQrPayload("app" as never, {}), "");
});
