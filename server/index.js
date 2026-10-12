import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

// Electron 28 embeds Node 18, which lacks a global File (needed by groq-sdk uploads)
if (typeof globalThis.File === "undefined") {
  globalThis.File = (await import("node:buffer")).File;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment config BEFORE importing anything that relies on it (like Prisma)
dotenv.config({ path: process.env.ENV_FILE || path.join(__dirname, ".env") });

const port = process.env.PORT || 5000;
const host = process.env.HOST || "localhost";

async function startServer() {
  try {
    // 2. Now import app & prisma safely
    const { default: app } = await import("./src/app.js");
    const { default: prisma } = await import("./src/database/connection.js");

    // 3. Eagerly connect to the database to catch connection errors immediately
    await prisma.$connect();
    console.log("Database connection established.");
    
    // 4. Use a persistent HTTP listener (http.createServer) instead of app.listen
    // to prevent the Node.js event loop from exiting on startup in latest Express/Node combinations
    const server = http.createServer(app);
    server.listen(port, host, () => {
      console.log(`Express server running on http://${host}:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server due to database connection error:", error);
    process.exit(1);
  }
}

startServer();
