import express from "express";
import { handoffController } from "../controllers/handoffController";

const router = express.Router();

router.post("/", handoffController);

export default router;