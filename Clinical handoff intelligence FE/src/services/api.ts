import axios from "axios";
import type { ClinicalSynthesis, AuditEntry } from "../types/handoff";

const BASE = "http://localhost:3000/api/handoff";

// Generate AI handoff from patient form data
export const generateHandoff = async (data: unknown) => {
  const response = await axios.post(BASE, data);
  return response.data;
};

// Upload an encrypted file to the backend
export const uploadHandoffFile = async (
  file: File
): Promise<{ success: boolean; fileId: string; originalName: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(`${BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// Get a viewable URL for a stored encrypted file
export const getHandoffFileUrl = (fileId: string) =>
  `${BASE}/view/${fileId}`;

// Synthesize clinical data from an uploaded .vortexa file via Featherless AI
export const synthesizeHandoffFile = async (
  fileId: string,
  patientContext?: string
): Promise<{ success: boolean; synthesis: ClinicalSynthesis }> => {
  const response = await axios.post(`${BASE}/synthesize`, {
    fileId,
    patientContext,
  });
  return response.data;
};

// Break-the-Glass emergency access
export const emergencyAccess = async (params: {
  fileId: string;
  doctorName: string;
  doctorId: string;
  reason: string;
}): Promise<Blob> => {
  const response = await axios.post(`${BASE}/emergency-access`, params, {
    responseType: "blob",
  });
  return response.data;
};

// Get the tamper-evident audit log
export const getAuditLog = async (): Promise<{
  success: boolean;
  entries: AuditEntry[];
}> => {
  const response = await axios.get(`${BASE}/audit-log`);
  return response.data;
};

// List all stored .vortexa files with metadata
export const listHandoffFiles = async (): Promise<{
  success: boolean;
  files: {
    fileId: string;
    displayName: string;
    contentType: string;
    mimeTag: string;
    sizeBytes: number;
    uploadedAt: string;
  }[];
}> => {
  const response = await axios.get(`${BASE}/list`);
  return response.data;
};

// Patient-consented handoff sharing
export const shareHandoff = async (params: {
  fileId: string;
  hospitalName: string;
  patientName?: string;
  doctorName?: string;
}): Promise<{
  success: boolean;
  message: string;
  shareUrl: string;
  sharedAt: string;
}> => {
  const response = await axios.post(`${BASE}/share`, params);
  return response.data;
};