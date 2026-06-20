import type { Request, Response } from "express";
import { generateAIHandoff } from "../services/aiServices";

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