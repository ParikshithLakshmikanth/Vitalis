import { AdverseEvent, BlackBoxCase, DecisionNode, VerificationResult } from './models';

export const adverseEvents = new Map<string, AdverseEvent>();
export const decisionNodes = new Map<string, DecisionNode[]>();
export const blackBoxCases = new Map<string, BlackBoxCase>();
export const verificationResults = new Map<string, VerificationResult>();
export const verificationHistory = new Map<string, string[]>();
export const auditLedger: Array<{ record_id: string; timestamp: string; payload: unknown }> = [];
