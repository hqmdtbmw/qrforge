import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { UAParser } from "ua-parser-js";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Resend } from "resend";
import twilio from "twilio";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { z } from "zod";
import http from "http";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase config comes from environment variables only. There is no
// config file in this repo, so clone it, copy .env.example to .env.local,
// fill in your values, and the server picks them up.
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const databaseId = process.env.VITE_FIREBASE_DATABASE_ID;

const isPlaceholderConfig = !projectId;

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!admin.apps.length && !isPlaceholderConfig) {
  try {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        projectId: projectId,
      });
    } else {
      admin.initializeApp({
        projectId: projectId,
      });
    }
    console.log("Firebase Admin initialized with project:", projectId);
  } catch (err) {
    console.error("Firebase Admin initialization failed:", err);
  }
}

// Get Firestore with fallback for named database
let db: admin.firestore.Firestore | null = null;
if (admin.apps.length) {
  try {
    db = getFirestore(admin.app(), databaseId || undefined);
    console.log("Firestore initialized with databaseId:", databaseId || "(default)");
  } catch (error) {
    console.warn("Failed to initialize Firestore with databaseId, falling back to (default):", error);
    db = getFirestore(admin.app());
  }
}
const auth = (!admin.apps.length) ? null : admin.auth();
const messaging = (!admin.apps.length) ? null : admin.messaging();

// Initialize Notification Services
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

let twilioClient: any = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  } catch (err) {
    console.error("Twilio initialization failed:", err);
  }
}

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "DUMMY_KEY" });

// Middleware to verify Firebase Auth token
const verifyAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).authenticatedUser = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Middleware to verify Pro status for AI features
const verifyProStatus = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // Check if default admin
    if (email === "omojvilamotel@gmail.com" && decodedToken.email_verified) {
      return next();
    }

    // Check Firestore for role
    if (!db) {
      return res.status(503).json({ error: "Database not connected. Cannot verify subscription status." });
    }
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: "User profile not found" });
    }

    const userData = userDoc.data();
    const role = userData?.role;

    if (role === "pro" || role === "business" || role === "admin") {
      return next();
    } else {
      return res.status(403).json({ error: "Pro subscription required for AI features" });
    }
  } catch (error) {
    console.error("Auth verification error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const app = express();

app.use(express.json());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." }
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI request limit reached, please try again later." }
});

app.use("/api/", apiLimiter);
app.use("/api/notifications/", authLimiter);
app.use("/api/ai/", aiLimiter);

// Python microservice proxy (local/dev only; Vercel rewrites handle it in production)
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
app.use("/api/py", async (req, res) => {
  const targetUrl = `${PYTHON_SERVICE_URL}${req.originalUrl.replace(/^\/api\/py/, "")}`;
  try {
    const response = await axios({
      method: req.method as any,
      url: targetUrl,
      data: req.method !== 'GET' ? req.body : undefined,
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000,
      validateStatus: () => true,
    });
    res.status(response.status).json(response.data);
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED') {
      res.status(502).json({ error: "Python service unavailable. Ensure it's running on port 8000." });
    } else {
      res.status(502).json({ error: "Python proxy error", detail: err.message });
    }
  }
});

// Custom Domain Middleware
app.use(async (req, res, next) => {
  const host = req.headers.host;
  if (!host || host.includes('localhost') || host.includes('run.app') || host === 'qrforge.app' || !db) {
    return next();
  }

  try {
    const qrsRef = db.collection("qrcodes");
    const snapshot = await qrsRef.where("fields.branding.customDomain", "==", host).limit(1).get();
    
    if (!snapshot.empty) {
      const qrData = snapshot.docs[0].data();
      if (qrData.status === 'active') {
        req.url = `/r/${qrData.shortId}`;
      }
    }
  } catch (err) {
    console.error("Custom domain lookup error:", err);
  }
  next();
});

// Shared redirect logic (used by both Express route and Vercel handler)
async function handleRedirect(req: express.Request, res: express.Response, shortId: string) {
  if (!db) return res.status(503).send("Service temporarily unavailable");
  try {
    const qrsRef = db.collection("qrcodes");
    const snapshot = await qrsRef.where("shortId", "==", shortId).limit(1).get();

    if (snapshot.empty) return res.status(404).send("QR Code not found");

    const qrDoc = snapshot.docs[0];
    const qrData = qrDoc.data();

    // Check Owner Subscription Status
    const ownerSnap = await db.collection("users").doc(qrData.ownerId).get();
    const ownerData = ownerSnap.data();
    
    const isProRole = ['pro', 'business', 'admin'].includes(ownerData?.role || '');
    const isTrialing = ownerData?.subscription?.status === 'trialing';
    const trialEnd = ownerData?.subscription?.trialEnd?.toDate();
    const isTrialValid = isTrialing && trialEnd && trialEnd > new Date();
    const hasProAccess = isProRole || isTrialValid;

    // Lock Pro features if no access
    const isProFeature = qrData.qrType === 'file' || qrData.qrType === 'social' || qrData.campaignId || qrData.password;
    if (isProFeature && !hasProAccess) {
      return res.status(403).send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8F9FB;">
            <div style="background: white; padding: 3rem; border-radius: 2.5rem; box-shadow: 0 20px 50px rgba(0,0,0,0.1); text-align: center; max-width: 450px; border: 1px solid #eee;">
              <div style="width: 64px; height: 64px; background: #ff5c0010; color: #ff5c00; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h1 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em;">Asset Locked</h1>
              <p style="color: #666; line-height: 1.6; font-size: 0.9rem; margin-bottom: 2rem;">This premium asset has been locked because the owner's Pro subscription or trial has expired.</p>
              <a href="/" style="display: inline-block; background: #ff5c00; color: white; padding: 1rem 2rem; rounded-radius: 1rem; text-decoration: none; font-weight: 900; font-size: 0.8rem; border-radius: 12px; box-shadow: 0 10px 20px rgba(255,92,0,0.2);">LEARN MORE</a>
            </div>
          </body>
        </html>
      `);
    }

    if (!qrData.isActive) return res.status(403).send("This QR code is inactive");

    const ua = new UAParser(req.headers["user-agent"]).getResult();
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const referrer = req.headers["referer"] || "";
    
    let socialSource = "direct";
    if (referrer.includes("facebook.com")) socialSource = "facebook";
    else if (referrer.includes("twitter.com")) socialSource = "twitter";
    else if (referrer.includes("instagram.com")) socialSource = "instagram";

    let location = { country: "Unknown", city: "Unknown" };
    try {
      const geoResponse = await axios.get(`https://ip-api.com/json/${ip}?fields=status,country,city`);
      if (geoResponse.data.status === 'success') {
        location = { country: geoResponse.data.country, city: geoResponse.data.city };
      }
    } catch (geoErr) {
      console.error("Geo lookup error:", geoErr);
    }

    const scanEvent = {
      qrId: qrDoc.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      device: { os: ua.os.name || "Unknown", browser: ua.browser.name || "Unknown", type: ua.device.type || "desktop" },
      location,
      userAgent: req.headers["user-agent"],
      ip: ip,
      referrer,
      socialSource
    };

    // Use runTransaction for atomicity
    try {
      await db.runTransaction(async (transaction) => {
        transaction.update(qrDoc.ref, {
          "stats.totalScans": admin.firestore.FieldValue.increment(1),
          "stats.lastScanAt": admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.set(qrDoc.ref.collection("ScanEvent").doc(), scanEvent);
      });
    } catch (txErr) {
      console.error("Transaction failed, falling back to individual writes:", txErr);
      await qrDoc.ref.collection("ScanEvent").add(scanEvent);
      await qrDoc.ref.update({
        "stats.totalScans": admin.firestore.FieldValue.increment(1),
        "stats.lastScanAt": admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Trigger notification (fire-and-forget)
    const triggerNotification = async () => {
      try {
        const ownerId = qrData.ownerId;
        const qrName = qrData.name || "Your QR Code";
        const locationStr = `${location.city}, ${location.country}`;
        
        await db.collection("notifications").add({
          userId: ownerId,
          type: 'info',
          title: 'New Scan! 🎯',
          message: `"${qrName}" was just scanned in ${locationStr}.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: { qrId: qrDoc.id, location, device: scanEvent.device }
        });

        const ownerSnap = await db.collection("users").doc(ownerId).get();
        const ownerData = ownerSnap.data();
        const isPro = ['pro', 'business', 'admin'].includes(ownerData?.role || '');
        
        if (isPro && ownerData?.fcmTokens?.length > 0 && messaging) {
          await messaging.sendEachForMulticast({
            tokens: ownerData.fcmTokens,
            notification: { title: 'QR Scanned! 🎯', body: `"${qrName}" scanned in ${locationStr}` },
            data: { qrId: qrDoc.id, type: 'scan_alert' }
          });
        }
      } catch (err) {
        console.error("Notification trigger error:", err);
      }
    };
    triggerNotification();

    // Log to public activity for landing page (fire-and-forget)
    db.collection("system").doc("public").collection("activity").add({
      city: location.city,
      country: location.country,
      type: qrData.type || 'URL',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});

    let targetUrl = qrData.content;

    // Handle special types
    if (qrData.qrType === 'social') return res.redirect(`/view/${shortId}`);
    if (qrData.qrType === 'menu' || qrData.qrType === 'flow') {
      const host = req.headers.host || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      return res.redirect(`${protocol}://${host}/view/${shortId}`);
    }

    // A/B Testing Logic
    if (qrData.campaignId) {
      const campaignSnap = await db.collection("campaigns").doc(qrData.campaignId).get();
      if (campaignSnap.exists) {
        const campaignData = campaignSnap.data();
        if (campaignData?.status === 'active' && campaignData.variations?.length > 0) {
          const variations = campaignData.variations;
          const randomIndex = Math.floor(Math.random() * variations.length);
          const selectedVariationId = variations[randomIndex];
          
          if (selectedVariationId !== qrDoc.id) {
            const variationSnap = await db.collection("qrcodes").doc(selectedVariationId).get();
            if (variationSnap.exists) {
              const variationData = variationSnap.data();
              targetUrl = variationData.content;
              
              variationSnap.ref.collection("ScanEvent").add({ ...scanEvent, qrId: selectedVariationId }).catch(() => {});
              variationSnap.ref.update({
                "stats.totalScans": admin.firestore.FieldValue.increment(1),
                "stats.lastScanAt": admin.firestore.FieldValue.serverTimestamp()
              }).catch(() => {});
            }
          }
        }
      }
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
        targetUrl = `https://${targetUrl}`;
      } else {
        return res.send(`
          <html>
            <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8F9FB;">
              <div style="background: white; padding: 2rem; border-radius: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 400px;">
                <h1 style="margin: 0 0 1rem 0; font-size: 1.5rem;">QR Content</h1>
                <p style="color: #666; line-height: 1.5;">${qrData.content}</p>
              </div>
            </body>
          </html>
        `);
      }
    }

    res.redirect(targetUrl);
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send("Internal Server Error");
  }
}

// Redirect Route for Dynamic QRs
app.get("/r/:shortId", async (req, res) => {
  await handleRedirect(req, res, req.params.shortId);
});

// API Routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/analytics/session", verifyAuth, async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    sessionId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || !db) return res.status(400).json({ error: "Invalid request", details: parsed.error?.flatten() });
  const { userId, sessionId, ...sessionData } = req.body;
  // Ensure the authenticated user can only write their own sessions
  const authUser = (req as any).authenticatedUser;
  if (authUser.uid !== userId) {
    return res.status(403).json({ error: "Forbidden: userId must match authenticated user" });
  }
  try {
    await db.collection("users").doc(userId).collection("sessions").doc(sessionId).set({ ...sessionData, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Failed" }); }
});

app.post("/api/notifications/send-welcome", verifyAuth, async (req, res) => {
  const schema = z.object({ email: z.string().email(), phone: z.string().optional(), name: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  const { email, phone, name } = parsed.data;
  // Only allow sending to own email
  const authUser = (req as any).authenticatedUser;
  if (authUser.email !== email) {
    return res.status(403).json({ error: "Forbidden: email must match authenticated user" });
  }
  try {
    if (resend) await resend.emails.send({ from: "QR Forge <welcome@qrforge.app>", to: email, subject: "Welcome!", html: `<h1>Welcome, ${name || 'Operative'}!</h1>` });
    if (phone && twilioClient && process.env.TWILIO_PHONE_NUMBER) await twilioClient.messages.create({ body: `Welcome to QR Forge!`, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Failed" }); }
});

app.post("/api/ai/generate-design", verifyProStatus, async (req, res) => {
  const schema = z.object({ prompt: z.string().min(1).max(500) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid prompt" });
  try {
    const result = await genAI.models.generateContent({ model: "gemini-1.5-flash", contents: `Generate 3 QR designs for: "${parsed.data.prompt}". Return JSON array.`, config: { responseMimeType: "application/json" } });
    res.json(JSON.parse(result.text));
  } catch (error) { res.status(500).json({ error: "Failed" }); }
});

app.post("/api/ai/suggest-content", verifyProStatus, async (req, res) => {
  const schema = z.object({ type: z.string().min(1), context: z.string().max(1000).optional().default("") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
  try {
    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Suggest optimized content for a QR code of type "${parsed.data.type}" with context: "${parsed.data.context}". Return a JSON object with a 'suggestions' array of 3 content strings.`,
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(result.text));
  } catch (error) { res.status(500).json({ error: "Failed to generate suggestions" }); }
});

// ===== API v1 Endpoints =====

// QR Code schemas
const createQRSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  qrType: z.string().default("url"),
  fields: z.any().optional(),
  design: z.any().optional(),
  folderId: z.string().nullable().optional(),
  orgId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

const updateQRSchema = createQRSchema.partial();

const generateShortId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper to check user's plan limits
async function checkPlanLimit(userId: string): Promise<{ ok: boolean; limit?: number; current?: number; error?: string }> {
  if (!db) return { ok: false, error: "Database not connected" };
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return { ok: false, error: "User not found" };
  const userData = userDoc.data()!;
  const role = userData.role || 'free';

  const planLimits: Record<string, number> = { free: 10, pro: 500, business: 5000, admin: 999999 };
  const limit = planLimits[role] || 10;

  if (role === 'admin') return { ok: true };

  const qrsSnap = await db.collection("qrcodes").where("ownerId", "==", userId).count().get();
  const current = qrsSnap.data().count;

  if (current >= limit) {
    return { ok: false, limit, current, error: `Plan limit reached (${current}/${limit}). Upgrade to create more.` };
  }
  return { ok: true, limit, current };
}

// POST /api/v1/qrcodes - Create QR code
app.post("/api/v1/qrcodes", verifyAuth, async (req, res) => {
  const parsed = createQRSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const authUser = (req as any).authenticatedUser;

  if (!db) return res.status(503).json({ error: "Database not connected" });

  try {
    const limitCheck = await checkPlanLimit(authUser.uid);
    if (!limitCheck.ok) {
      return res.status(403).json({ error: limitCheck.error, limit: limitCheck.limit, current: limitCheck.current });
    }

    const shortId = generateShortId();
    const qrRef = await db.collection("qrcodes").add({
      ...parsed.data,
      shortId,
      ownerId: authUser.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      stats: { totalScans: 0, profileViews: 0, lastScanAt: null },
    });

    const newDoc = await qrRef.get();
    res.status(201).json({ id: qrRef.id, shortId, ...newDoc.data() });
  } catch (error) {
    console.error("Create QR error:", error);
    res.status(500).json({ error: "Failed to create QR code" });
  }
});

// GET /api/v1/qrcodes - List QR codes
app.get("/api/v1/qrcodes", verifyAuth, async (req, res) => {
  const authUser = (req as any).authenticatedUser;
  if (!db) return res.status(503).json({ error: "Database not connected" });

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    let query: FirebaseFirestore.Query = db.collection("qrcodes").where("ownerId", "==", authUser.uid);

    if (req.query.folderId) {
      query = query.where("folderId", "==", req.query.folderId);
    }
    if (req.query.qrType) {
      query = query.where("qrType", "==", req.query.qrType);
    }
    if (req.query.isActive !== undefined) {
      query = query.where("isActive", "==", req.query.isActive === "true");
    }

    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    query = query.orderBy("createdAt", "desc").offset(offset).limit(limit);

    const snapshot = await query.get();
    const qrs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: qrs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("List QR error:", error);
    res.status(500).json({ error: "Failed to list QR codes" });
  }
});

// GET /api/v1/qrcodes/:id - Get single QR code
app.get("/api/v1/qrcodes/:id", verifyAuth, async (req, res) => {
  const authUser = (req as any).authenticatedUser;
  if (!db) return res.status(503).json({ error: "Database not connected" });

  try {
    const qrDoc = await db.collection("qrcodes").doc(req.params.id).get();
    if (!qrDoc.exists) return res.status(404).json({ error: "QR code not found" });

    const data = qrDoc.data()!;
    if (data.ownerId !== authUser.uid && data.orgId !== authUser.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ id: qrDoc.id, ...data });
  } catch (error) {
    console.error("Get QR error:", error);
    res.status(500).json({ error: "Failed to get QR code" });
  }
});

// PUT /api/v1/qrcodes/:id - Update QR code
app.put("/api/v1/qrcodes/:id", verifyAuth, async (req, res) => {
  const parsed = updateQRSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const authUser = (req as any).authenticatedUser;
  if (!db) return res.status(503).json({ error: "Database not connected" });

  try {
    const qrRef = db.collection("qrcodes").doc(req.params.id);
    const qrDoc = await qrRef.get();
    if (!qrDoc.exists) return res.status(404).json({ error: "QR code not found" });

    const data = qrDoc.data()!;
    if (data.ownerId !== authUser.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await qrRef.update({ ...parsed.data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const updated = await qrRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Update QR error:", error);
    res.status(500).json({ error: "Failed to update QR code" });
  }
});

// DELETE /api/v1/qrcodes/:id - Delete QR code
app.delete("/api/v1/qrcodes/:id", verifyAuth, async (req, res) => {
  const authUser = (req as any).authenticatedUser;
  if (!db) return res.status(503).json({ error: "Database not connected" });

  try {
    const qrRef = db.collection("qrcodes").doc(req.params.id);
    const qrDoc = await qrRef.get();
    if (!qrDoc.exists) return res.status(404).json({ error: "QR code not found" });

    const data = qrDoc.data()!;
    if (data.ownerId !== authUser.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Delete ScanEvent subcollection
    const scanEvents = await qrRef.collection("ScanEvent").get();
    const batch = db.batch();
    scanEvents.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(qrRef);
    await batch.commit();

    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error("Delete QR error:", error);
    res.status(500).json({ error: "Failed to delete QR code" });
  }
});

// POST /api/v1/payments/webhook - Paystack webhook
app.post("/api/v1/payments/webhook", async (req, res) => {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) {
    return res.status(500).json({ error: "Paystack secret not configured" });
  }

  const hash = req.headers["x-paystack-signature"];
  if (!hash) return res.status(401).json({ error: "Missing signature" });

  const crypto = await import("crypto");
  const expectedHash = crypto.createHmac("sha512", PAYSTACK_SECRET).update(JSON.stringify(req.body)).digest("hex");
  if (hash !== expectedHash) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;
  if (!db) return res.status(503).json({ error: "Database not connected" });

  try {
    if (event.event === "charge.success") {
      const metadata = event.data.metadata || {};
      const userId = metadata.userId;
      const plan = metadata.plan || "pro";

      if (userId) {
        await db.collection("users").doc(userId).update({
          role: plan,
          "subscription.status": "active",
          "subscription.plan": plan,
          "subscription.paystackReference": event.data.reference,
          "subscription.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
          "subscription.expiresAt": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        console.log(`Subscription activated for user ${userId}: ${plan}`);
      }

      res.json({ success: true });
    } else if (event.event === "charge.failed" || event.event === "subscription.not_renew") {
      const metadata = event.data.metadata || {};
      const userId = metadata.userId;
      if (userId) {
        await db.collection("users").doc(userId).update({
          "subscription.status": "expired",
          "subscription.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      res.json({ success: true });
    } else {
      res.json({ success: true, ignored: event.event });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// POST /api/v1/api-keys/generate - Generate API key
app.post("/api/v1/api-keys/generate", verifyAuth, async (req, res) => {
  const authUser = (req as any).authenticatedUser;
  if (!db) return res.status(503).json({ error: "Database not connected" });

  try {
    const crypto = await import("crypto");
    const apiKey = `qrf_${crypto.randomBytes(24).toString("hex")}`;

    await db.collection("users").doc(authUser.uid).update({
      apiKey,
      apiKeyCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ apiKey });
  } catch (error) {
    console.error("API key generation error:", error);
    res.status(500).json({ error: "Failed to generate API key" });
  }
});

// GET /api/v1/api-keys/verify - Verify API key (for API access)
app.get("/api/v1/api-keys/verify", async (req, res) => {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) return res.status(401).json({ error: "API key required" });
  if (!db) return res.status(503).json({ error: "Database not connected" });

  try {
    const usersSnap = await db.collection("users").where("apiKey", "==", apiKey).limit(1).get();
    if (usersSnap.empty) return res.status(401).json({ error: "Invalid API key" });

    const userData = usersSnap.docs[0].data();
    res.json({ valid: true, userId: usersSnap.docs[0].id, role: userData.role || "free" });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// Start function: Vite middleware + HTTP listener
export async function startServer() {
  const PORT = 3000;

  // Vite middleware for development (never on Vercel)
  if (process.env.NODE_ENV !== "production") {
    if (!process.env.VERCEL) {
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      app.use(vite.middlewares);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  // Only start listener when running standalone (not on Vercel serverless)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
  }
}

// Start if not on Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
