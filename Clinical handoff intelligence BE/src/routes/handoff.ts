import express from "express";
import multer from "multer";
import {
  handoffController,
  uploadHandoffController,
  viewHandoffController,
  synthesizeHandoffController,
  emergencyAccessController,
  auditLogController,
  listFilesController,
  shareHandoffController,
} from "../controllers/handoffController";

const router = express.Router();

// ---------------------------------------------------------------------------
// Multer – keep file in memory, never touch the filesystem unencrypted.
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype === "image/jpeg") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and JPEG files are accepted."));
    }
  },
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** POST /api/handoff – Generate AI handoff summary from form data */
router.post("/", handoffController);

/** POST /api/handoff/upload – Encrypt and store a patient file (.vortexa) */
router.post("/upload", upload.single("file"), uploadHandoffController);

/** GET /api/handoff/list – List all stored .vortexa files with metadata */
router.get("/list", listFilesController);

/** GET /api/handoff/view/:fileId – Decrypt and stream a patient file */
router.get("/view/:fileId", viewHandoffController);

/** POST /api/handoff/synthesize – AI synthesis from an uploaded .vortexa file */
router.post("/synthesize", synthesizeHandoffController);

/** POST /api/handoff/share – Patient-consented handoff sharing */
router.post("/share", shareHandoffController);

/** POST /api/handoff/emergency-access – Break-the-Glass protocol */
router.post("/emergency-access", emergencyAccessController);

/** GET /api/handoff/audit-log – View the tamper-evident audit trail */
router.get("/audit-log", auditLogController);

export default router;