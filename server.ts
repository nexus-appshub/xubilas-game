import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// API Route to log signups to Google Sheets
app.post("/api/log-signup", async (req: Request, res: Response) => {
  const { email, username, timestamp } = req.body;

  // Option 1: Simple Apps Script Web App (Recommended for beginners)
  if (process.env.GOOGLE_SCRIPT_URL) {
    try {
      const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, timestamp }),
      });
      if (response.ok) {
        return res.json({ success: true, method: "apps-script" });
      }
    } catch (error) {
      console.error("Apps Script logging failed:", error);
    }
  }

  // Option 2: Legacy Service Account Auth
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn("Google Sheets credentials not fully set, skipping log");
    return res.status(200).json({ message: "Skipped logging (missing credentials)" });
  }

  try {
    const { google } = await import("googleapis");
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:C",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[email, username, timestamp]],
      },
    });
    res.json({ success: true, method: "service-account" });
  } catch (error) {
    console.error("Error logging to Google Sheets:", error);
    res.status(500).json({ error: "Failed to log signup" });
  }
});

async function startServer() {
  const mode = process.env.NODE_ENV || "development";
  console.log(`Starting server in ${mode} mode...`);
  
  try {
    if (mode !== "production") {
      console.log("Initializing Vite dev server...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware integrated.");
    } else {
      console.log("Serving static files from dist...");
      app.use(express.static(path.join(__dirname, "dist")));
      app.get("*", (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, "dist", "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`>>> Neural Arena Server active at http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("CRITICAL: Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
