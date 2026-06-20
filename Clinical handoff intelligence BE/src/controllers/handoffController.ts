import type { Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
// uuid ships as ESM-only in v9+ – use require() in this CommonJS project.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid") as { v4: () => string };
// pdf-parse exports the function as module.exports directly.
// Unwrap .default if present (some bundlers wrap it), otherwise use as-is.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _pdfParseModule = require("pdf-parse");
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> =
  typeof _pdfParseModule === "function"
    ? _pdfParseModule
    : (_pdfParseModule as { default: (buf: Buffer) => Promise<{ text: string }> }).default;

import { generateAIHandoff } from "../services/aiServices";
import { encryptFile, decryptFile } from "../utils/cryptoEngine";
import { synthesizeMedicalDocument } from "../services/featherlessService";
import { appendAuditLog, readAuditLog } from "../utils/auditLogger";

// ---------------------------------------------------------------------------
// Storage paths
// ---------------------------------------------------------------------------
const STORAGE_DIR = path.resolve(__dirname, "../../storage/handoffs");

// ---------------------------------------------------------------------------
// 1. Existing: POST /api/handoff  – AI handoff from form data
// ---------------------------------------------------------------------------
export const handoffController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const handoff = await generateAIHandoff(req.body);
    res.status(200).json(handoff);
  } catch (error) {
    console.error("Handoff Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI handoff",
    });
  }
};

// ---------------------------------------------------------------------------
// 2. POST /api/handoff/upload  – Encrypt and persist a patient file
// ---------------------------------------------------------------------------
export const uploadHandoffController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file provided." });
      return;
    }

    const { mimetype, originalname, buffer } = req.file;

    if (mimetype !== "application/pdf" && mimetype !== "image/jpeg") {
      res.status(415).json({
        success: false,
        message: "Unsupported file type. Only PDF and JPEG are accepted.",
      });
      return;
    }

    const encryptedPayload = encryptFile(buffer);

    const fileId = uuidv4();
    const mimeTag = mimetype === "application/pdf" ? "pdf" : "jpg";
    const filename = `handoff_${fileId}_${mimeTag}.vortexa`;
    const filePath = path.join(STORAGE_DIR, filename);

    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.writeFile(filePath, encryptedPayload);

    // Audit the upload
    await appendAuditLog({
      event: "FILE_UPLOADED",
      actor: "patient",
      fileId: filename,
      details: `Encrypted upload of "${originalname}" stored as ${filename}`,
    });

    console.log(`[Upload] Stored encrypted file → ${filename}`);

    res.status(201).json({
      success: true,
      fileId: filename,
      originalName: originalname,
    });
  } catch (error) {
    console.error("[Upload] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to encrypt and store the file.",
    });
  }
};

// ---------------------------------------------------------------------------
// 3. GET /api/handoff/view/:fileId  – Decrypt and stream in-memory
// ---------------------------------------------------------------------------
export const viewHandoffController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawFileId = req.params["fileId"];
    const fileId: string = Array.isArray(rawFileId) ? rawFileId[0] : rawFileId;

    if (!fileId || fileId.includes("..") || fileId.includes("/") || fileId.includes("\\")) {
      res.status(400).json({ success: false, message: "Invalid fileId." });
      return;
    }
    if (!fileId.endsWith(".vortexa")) {
      res.status(400).json({ success: false, message: "Invalid file extension." });
      return;
    }

    const filePath = path.join(STORAGE_DIR, fileId);

    let encryptedPayload: Buffer;
    try {
      encryptedPayload = await fs.readFile(filePath);
    } catch {
      res.status(404).json({ success: false, message: "File not found." });
      return;
    }

    const plainBuffer = decryptFile(encryptedPayload);

    const mimeTagMatch = fileId.match(/_([a-z]+)\.vortexa$/);
    const mimeTag = mimeTagMatch ? mimeTagMatch[1] : null;

    let contentType: string;
    if (mimeTag === "pdf") {
      contentType = "application/pdf";
    } else if (mimeTag === "jpg") {
      contentType = "image/jpeg";
    } else {
      const magic = plainBuffer.subarray(0, 4);
      if (magic[0] === 0x25 && magic[1] === 0x50) {
        contentType = "application/pdf";
      } else if (magic[0] === 0xff && magic[1] === 0xd8) {
        contentType = "image/jpeg";
      } else {
        contentType = "application/octet-stream";
      }
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", plainBuffer.length);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Content-Disposition", "inline");
    res.status(200).send(plainBuffer);
  } catch (error) {
    console.error("[View] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to decrypt and retrieve the file.",
    });
  }
};

// ---------------------------------------------------------------------------
// 4. POST /api/handoff/synthesize  – AI synthesis from uploaded .vortexa file
// ---------------------------------------------------------------------------
export const synthesizeHandoffController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { fileId, patientContext } = req.body as {
      fileId: string;
      patientContext?: string;
    };

    if (!fileId || !fileId.endsWith(".vortexa")) {
      res.status(400).json({ success: false, message: "Valid fileId is required." });
      return;
    }

    if (fileId.includes("..") || fileId.includes("/") || fileId.includes("\\")) {
      res.status(400).json({ success: false, message: "Invalid fileId." });
      return;
    }

    const filePath = path.join(STORAGE_DIR, fileId);

    let encryptedPayload: Buffer;
    try {
      encryptedPayload = await fs.readFile(filePath);
    } catch {
      res.status(404).json({ success: false, message: "File not found." });
      return;
    }

    // Decrypt entirely in memory
    const plainBuffer = decryptFile(encryptedPayload);

    // Extract text from PDF (or use a placeholder for JPEG)
    let extractedText: string;
    const mimeTagMatch = fileId.match(/_([a-z]+)\.vortexa$/);
    const mimeTag = mimeTagMatch ? mimeTagMatch[1] : null;

    if (mimeTag === "pdf") {
      const parsed = await pdfParse(plainBuffer);
      extractedText = parsed.text;
    } else {
      extractedText =
        "[Image file: text extraction not available for JPEG files. " +
        "Please provide a PDF for AI synthesis.]";
    }

    if (!extractedText.trim()) {
      res.status(422).json({
        success: false,
        message: "No readable text found in the document.",
      });
      return;
    }

    // Run through Featherless AI
    const synthesis = await synthesizeMedicalDocument(extractedText, patientContext);

    // Audit the synthesis event
    await appendAuditLog({
      event: "AI_SYNTHESIS",
      actor: "patient",
      fileId,
      details: "AI clinical synthesis performed on decrypted document.",
    });

    res.status(200).json({ success: true, synthesis });
  } catch (error) {
    console.error("[Synthesize] Error:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to synthesize document.",
    });
  }
};

// ---------------------------------------------------------------------------
// 5. POST /api/handoff/emergency-access  – Break-the-Glass Protocol
// ---------------------------------------------------------------------------
export const emergencyAccessController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { fileId, doctorName, doctorId, reason } = req.body as {
      fileId: string;
      doctorName: string;
      doctorId: string;
      reason: string;
    };

    if (!fileId || !doctorName || !doctorId || !reason) {
      res.status(400).json({
        success: false,
        message: "fileId, doctorName, doctorId, and reason are required.",
      });
      return;
    }

    if (fileId.includes("..") || fileId.includes("/") || fileId.includes("\\")) {
      res.status(400).json({ success: false, message: "Invalid fileId." });
      return;
    }

    if (!fileId.endsWith(".vortexa")) {
      res.status(400).json({ success: false, message: "Invalid file extension." });
      return;
    }

    const filePath = path.join(STORAGE_DIR, fileId);

    let encryptedPayload: Buffer;
    try {
      encryptedPayload = await fs.readFile(filePath);
    } catch {
      res.status(404).json({ success: false, message: "File not found." });
      return;
    }

    // Decrypt entirely in memory – no temp files
    const plainBuffer = decryptFile(encryptedPayload);

    // Write immutable, tamper-evident audit entry BEFORE returning data
    await appendAuditLog({
      event: "EMERGENCY_ACCESS",
      actor: `${doctorName} (ID: ${doctorId})`,
      fileId,
      details: `Break-the-Glass override. Reason: ${reason}`,
    });

    // Determine content type
    const mimeTagMatch = fileId.match(/_([a-z]+)\.vortexa$/);
    const mimeTag = mimeTagMatch ? mimeTagMatch[1] : null;
    const contentType =
      mimeTag === "pdf"
        ? "application/pdf"
        : mimeTag === "jpg"
        ? "image/jpeg"
        : "application/octet-stream";

    console.warn(
      `[EMERGENCY ACCESS] Doctor ${doctorName} (${doctorId}) accessed file ${fileId}. Reason: ${reason}`
    );

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", plainBuffer.length);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("X-Emergency-Access", "true");
    res.setHeader("Content-Disposition", "inline");
    res.status(200).send(plainBuffer);
  } catch (error) {
    console.error("[EmergencyAccess] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process emergency access request.",
    });
  }
};

// ---------------------------------------------------------------------------
// 6. GET /api/handoff/audit-log  – View the tamper-evident audit trail
// ---------------------------------------------------------------------------
export const auditLogController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const entries = await readAuditLog();
    res.status(200).json({ success: true, entries });
  } catch (error) {
    console.error("[AuditLog] Error:", error);
    res.status(500).json({ success: false, message: "Failed to read audit log." });
  }
};

// ---------------------------------------------------------------------------
// 7. GET /api/handoff/list  – List all stored encrypted files with metadata
// ---------------------------------------------------------------------------
export const listFilesController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    const dirEntries = await fs.readdir(STORAGE_DIR, { withFileTypes: true });

    const files = await Promise.all(
      dirEntries
        .filter((e) => e.isFile() && e.name.endsWith(".vortexa"))
        .map(async (e) => {
          const stat = await fs.stat(path.join(STORAGE_DIR, e.name));

          // Derive original MIME from filename tag: handoff_<uuid>_<tag>.vortexa
          const mimeTagMatch = e.name.match(/_([a-z]+)\.vortexa$/);
          const mimeTag = mimeTagMatch ? mimeTagMatch[1] : "unknown";
          const contentType =
            mimeTag === "pdf" ? "application/pdf" : mimeTag === "jpg" ? "image/jpeg" : "unknown";

          // Derive a human-readable display name from the UUID portion
          const uuidMatch = e.name.match(/^handoff_([a-f0-9-]+)_/);
          const shortId = uuidMatch ? uuidMatch[1].slice(0, 8) : e.name;

          return {
            fileId: e.name,
            displayName: `Medical Record – ${shortId}`,
            contentType,
            mimeTag,
            sizeBytes: stat.size,
            uploadedAt: stat.birthtime.toISOString(),
          };
        })
    );

    // Newest first
    files.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    res.status(200).json({ success: true, files });
  } catch (error) {
    console.error("[ListFiles] Error:", error);
    res.status(500).json({ success: false, message: "Failed to list files." });
  }
};

// ---------------------------------------------------------------------------
// 8. POST /api/handoff/share  – Patient-consented handoff share
// ---------------------------------------------------------------------------
export const shareHandoffController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { fileId, hospitalName, patientName, doctorName } = req.body as {
      fileId: string;
      hospitalName: string;
      patientName?: string;
      doctorName?: string;
    };

    if (!fileId || !hospitalName) {
      res.status(400).json({
        success: false,
        message: "fileId and hospitalName are required.",
      });
      return;
    }

    if (fileId.includes("..") || fileId.includes("/") || fileId.includes("\\")) {
      res.status(400).json({ success: false, message: "Invalid fileId." });
      return;
    }

    // Verify file exists
    const filePath = path.join(STORAGE_DIR, fileId);
    try {
      await fs.access(filePath);
    } catch {
      res.status(404).json({ success: false, message: "File not found." });
      return;
    }

    // Write consent audit entry
    await appendAuditLog({
      event: "HANDOFF_SHARED",
      actor: patientName ?? "patient",
      fileId,
      details: `Patient consented to share handoff with "${hospitalName}"${
        doctorName ? ` (Requesting doctor: ${doctorName})` : ""
      }`,
    });

    // Build a view URL the receiving hospital can use
    const shareUrl = `http://localhost:3000/api/handoff/view/${fileId}`;

    res.status(200).json({
      success: true,
      message: `Handoff shared with ${hospitalName} with patient consent.`,
      shareUrl,
      sharedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Share] Error:", error);
    res.status(500).json({ success: false, message: "Failed to share handoff." });
  }
};