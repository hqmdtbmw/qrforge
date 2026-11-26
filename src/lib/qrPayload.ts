// The text that actually goes into the QR code, for every type the app
// supports. This used to live inside CreateQRModal, mixed in with the
// form state. It is pure string building, so it lives here now where the
// test suite can reach it without a browser.

import type { QRType } from "../constants/qrTypes";
import { crc16 } from "./utils";

// Every field the form can hold. They are all optional here because the
// tests pass just the ones a case needs, and the form fills in the rest
// with its own defaults before it calls this.
export interface QrFields {
  [key: string]: any;
  text?: string;
  url?: string;
  phone?: string;
  message?: string;
  email?: string;
  subject?: string;
  body?: string;
  ssid?: string;
  password?: string;
  encryption?: string;
  firstName?: string;
  lastName?: string;
  org?: string;
  title?: string;
  jobTitle?: string;
  website?: string;
  address?: string;
  notes?: string;
  eventTitle?: string;
  location?: string;
  description?: string;
  amount?: string;
  currency?: string;
  bankStandard?: string;
  bankName?: string;
  bankAccount?: string;
  bankIban?: string;
  bankBic?: string;
  bankUpiId?: string;
  bankPixKey?: string;
  bankReference?: string;
  bankCity?: string;
  nqrPayload?: string;
  fileUrl?: string;
  profileName?: string;
  socialLinks?: unknown;
  menuItems?: unknown;
  flowSteps?: unknown;
}

// Pix static QR code (BRCode, the EMVCo format Brazilian banks scan).
// Built field by field: 00 is the format marker, 26 holds the Pix key,
// 52 to 62 are the merchant details, and 63 is the CRC16 checksum over
// everything before it.
export function buildPixPayload(fields: QrFields): string {
  const pixKey = fields.bankPixKey || "";
  const name = (fields.bankName || "QRForge").substring(0, 25).toUpperCase();
  const city = (fields.bankCity || "CITY").substring(0, 15).toUpperCase();
  const amount = fields.amount ? parseFloat(fields.amount).toFixed(2) : "0.00";

  let payload = "000201";
  payload += "26" + (22 + pixKey.length).toString().padStart(2, "0");
  payload += "0014BR.GOV.BCB.PIX";
  payload += "01" + pixKey.length.toString().padStart(2, "0") + pixKey;
  payload += "52040000";
  payload += "5303986";
  if (parseFloat(amount) > 0) {
    payload += "54" + amount.length.toString().padStart(2, "0") + amount;
  }
  payload += "5802BR";
  payload += "59" + name.length.toString().padStart(2, "0") + name;
  payload += "60" + city.length.toString().padStart(2, "0") + city;
  payload += "62070503***";
  payload += "6304";

  return payload + crc16(payload);
}

export function buildQrPayload(qrType: QRType, fields: QrFields): string {
  switch (qrType) {
    case "text":
      return fields.text || "";
    case "link":
      return fields.url || "";
    case "phone":
      return `tel:${fields.phone || ""}`;
    case "sms":
      return `SMSTO:${fields.phone || ""}:${fields.message || ""}`;
    case "email":
      return `mailto:${fields.email || ""}?subject=${encodeURIComponent(fields.subject || "")}&body=${encodeURIComponent(fields.body || "")}`;
    case "wifi":
      return `WIFI:T:${fields.encryption || ""};S:${fields.ssid || ""};P:${fields.password || ""};;`;
    case "whatsapp":
      return `https://wa.me/${fields.phone || ""}?text=${encodeURIComponent(fields.message || "")}`;
    case "instagram":
      return `https://instagram.com/${(fields.text || "").replace("@", "")}`;
    case "twitter":
      return `https://twitter.com/${(fields.text || "").replace("@", "")}`;
    case "linkedin":
      return `https://linkedin.com/in/${fields.text || ""}`;
    case "vcard":
      return `BEGIN:VCARD\\nVERSION:3.0\\nN:${fields.lastName || ""};${fields.firstName || ""}\\nORG:${fields.org || ""}\\nTITLE:${fields.jobTitle || fields.title || ""}\\nEMAIL:${fields.email || ""}\\nTEL:${fields.phone || ""}\\nURL:${fields.website || ""}\\nADR:;;${fields.address || ""}\\nNOTE:${fields.notes || ""}\\nEND:VCARD`;
    case "social":
      return JSON.stringify({ type: "social", profileName: fields.profileName, links: fields.socialLinks });
    case "file":
      return fields.fileUrl || "";
    case "event":
      return `BEGIN:VEVENT\\nSUMMARY:${fields.eventTitle || ""}\\nLOCATION:${fields.location || ""}\\nDESCRIPTION:${fields.description || ""}\\nEND:VEVENT`;
    case "crypto":
      return `${(fields.currency || "BTC").toLowerCase()}:${fields.address || ""}?amount=${fields.amount || ""}`;
    case "bank": {
      if (fields.bankStandard === "sepa") {
        // SEPA Credit Transfer (SCT) format
        return `BCD\\n001\\n1\\nSCT\\n${fields.bankBic || ""}\\n${fields.bankName || ""}\\n${fields.bankIban || ""}\\nEUR${fields.amount || "0.00"}\\n\\n${fields.bankReference || ""}`;
      }
      if (fields.bankStandard === "upi") {
        return `upi://pay?pa=${fields.bankUpiId || ""}&pn=${encodeURIComponent(fields.bankName || "")}&am=${fields.amount || ""}&cu=INR&tn=${encodeURIComponent(fields.bankReference || "")}`;
      }
      if (fields.bankStandard === "pix") {
        return buildPixPayload(fields);
      }
      if (fields.bankStandard === "nqr") {
        return fields.nqrPayload || `nqr://pay?acc=${fields.bankAccount || ""}&bank=${fields.bankName || ""}&name=${encodeURIComponent(fields.bankName || "")}&am=${fields.amount || ""}`;
      }
      return `Bank: ${fields.bankName || ""}\\nAccount: ${fields.bankAccount || ""}\\nAmount: ${fields.amount || ""} ${fields.currency || ""}\\nRef: ${fields.bankReference || ""}`;
    }
    case "menu":
      return JSON.stringify({ type: "menu", items: fields.menuItems });
    case "flow":
      return JSON.stringify({ type: "flow", steps: fields.flowSteps });
    default:
      return fields.text || fields.url || "";
  }
}
