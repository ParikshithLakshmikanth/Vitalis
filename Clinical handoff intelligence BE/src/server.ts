import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import handoffRoute from "./routes/handoff";
import { initCryptoEngine } from "./utils/cryptoEngine";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/handoff", handoffRoute);

// ---------------------------------------------------------------------------
// Boot sequence: derive hardware-bound Master Key before accepting requests.
// ---------------------------------------------------------------------------
async function start() {
  try {
    await initCryptoEngine();
    app.listen(3000, () => {
      console.log("Server running on port 3000");
    });
  } catch (err) {
    console.error("[Server] Failed to initialise CryptoEngine:", err);
    process.exit(1);
  }
}

start();