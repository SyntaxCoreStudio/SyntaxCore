import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

app.use(express.json({ limit: "20kb" }));

const allowed = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman
      if (allowed.length === 0) return cb(null, true); // if not set, allow all (dev only)
      return allowed.includes(origin)
        ? cb(null, true)
        : cb(new Error("Not allowed by CORS"));
    },
  }),
);

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests, try again later." },
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, message, website } = req.body;

    // Honeypot: if filled, treat as spam
    if (typeof website === "string" && website.trim().length > 0) {
      return res.json({ ok: true }); // pretend success to not help bots
    }
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim();
    const cleanMessage = String(message || "").trim();

    if (!cleanName || cleanName.length > 80) {
      return res.status(400).json({ ok: false, error: "Invalid name" });
    }
    if (!isValidEmail(cleanEmail) || cleanEmail.length > 120) {
      return res.status(400).json({ ok: false, error: "Invalid email" });
    }
    if (!cleanMessage || cleanMessage.length > 3000) {
      return res.status(400).json({ ok: false, error: "Invalid message" });
    }

    const subject = `${process.env.SUBJECT_PREFIX || "[Enquiry]"} ${cleanName}`;

    const mailToBusiness = {
      from: `"Website Contact" <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL,
      replyTo: cleanEmail,
      subject,
      text:
        `New website enquiry\n\n` +
        `Name: ${cleanName}\n` +
        `Email: ${cleanEmail}\n\n` +
        `Message:\n${cleanMessage}\n`,
    };

    await transporter.sendMail(mailToBusiness);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 3001, () => {
  console.log(
    `Contact server running on http://localhost:${process.env.PORT || 3001}`,
  );
});
