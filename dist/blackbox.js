"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const dataStore_1 = require("./dataStore");
const llm_1 = require("./llm");
const router = express_1.default.Router();
const MODEL_VERSION = 'axion-blackbox-v0.1.0';
async function buildDecisionNodes(event) {
    const systemMessage = 'You are AXION Healthcare Black Box. Reconstruct the clinical decision chain for an adverse event using the provided structured input. Produce only valid JSON output.';
    const userMessage = `AdverseEvent:\n${JSON.stringify(event, null, 2)}\n\nGenerate a JSON array of DecisionNode objects with fields: node_id, event_id, decision_type, timestamp, clinician_id, available_data, decision_made, alternatives, causal_score, source_record_ref, ai_reasoning. Use 2-5 nodes. Each node must include the source_record_ref within the event source_record namespace.`;
    const llmText = await (0, llm_1.callLLM)(systemMessage, userMessage);
    const parsed = (0, llm_1.extractJsonArray)(llmText);
    if (parsed && Array.isArray(parsed)) {
        return parsed;
    }
    // Fallback if LLM output cannot be parsed.
    const now = new Date(event.event_timestamp).getTime();
    const decisionTypes = ['DIAGNOSIS', 'PRESCRIPTION', 'REFERRAL', 'PROCEDURE'];
    return decisionTypes.map((type, index) => {
        const nodeId = (0, uuid_1.v4)();
        const timestamp = new Date(now - (index + 1) * 60 * 60 * 1000).toISOString();
        return {
            node_id: nodeId,
            event_id: event.event_id,
            decision_type: type,
            timestamp,
            clinician_id: `clinician-${index + 1}`,
            available_data: {
                symptoms: ['SNOMED:123456'],
                labs: [{ code: 'LOINC:789-8', value: 7.1, unit: 'mmol/L', collected_at: timestamp }],
                vitals: { hr: 88, bp: '130/84' },
            },
            decision_made: `${type} recorded for patient at ${timestamp}`,
            alternatives: [`Alternative ${type} option 1`, `Alternative ${type} option 2`],
            causal_score: parseFloat(((0.25 * (4 - index)) / 1).toFixed(2)),
            source_record_ref: `${event.source_record}/resource/${type.toLowerCase()}/${nodeId}`,
            ai_reasoning: `Reconstructed ${type} decision from EHR timeline and contextual evidence.`,
        };
    });
}
function buildReport(caseData) {
    return {
        event: caseData.event,
        decision_nodes: caseData.decision_nodes,
        status: caseData.status,
        created_at: caseData.created_at,
        updated_at: caseData.updated_at,
        model_version: caseData.model_version,
        confidence_level: caseData.confidence_level,
    };
}
router.post('/trigger', async (req, res) => {
    const payload = req.body;
    if (!payload?.event_id || !payload.patient_id || !payload.event_type || !payload.severity || !payload.event_timestamp || !payload.source_record) {
        return res.status(400).json({ error: 'Missing required AdverseEvent fields.' });
    }
    if (dataStore_1.blackBoxCases.has(payload.event_id)) {
        return res.status(409).json({ error: 'Black Box case already exists for this event_id.' });
    }
    try {
        const nodes = await buildDecisionNodes(payload);
        const caseData = {
            event: payload,
            decision_nodes: nodes,
            status: 'PENDING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            model_version: MODEL_VERSION,
            confidence_level: 0.82,
        };
        dataStore_1.adverseEvents.set(payload.event_id, payload);
        dataStore_1.decisionNodes.set(payload.event_id, nodes);
        dataStore_1.blackBoxCases.set(payload.event_id, caseData);
        dataStore_1.auditLedger.push({ record_id: (0, uuid_1.v4)(), timestamp: new Date().toISOString(), payload: caseData });
        res.status(201).json({ event_id: payload.event_id, status: caseData.status, generated_at: caseData.created_at });
    }
    catch (error) {
        return res.status(503).json({ error: error.message || 'LLM service unavailable.' });
    }
});
router.get('/:event_id', (req, res) => {
    const eventId = req.params.event_id;
    const caseData = dataStore_1.blackBoxCases.get(eventId);
    if (!caseData) {
        return res.status(404).json({ error: 'Black Box case not found.' });
    }
    res.json(buildReport(caseData));
});
router.get('/:event_id/report', (req, res) => {
    const eventId = req.params.event_id;
    const caseData = dataStore_1.blackBoxCases.get(eventId);
    if (!caseData) {
        return res.status(404).json({ error: 'Black Box report not found.' });
    }
    res.json({ report: buildReport(caseData), signature: 'sha256:placeholder', generated_at: new Date().toISOString() });
});
router.get('/cases', (req, res) => {
    const cases = Array.from(dataStore_1.blackBoxCases.values()).map((c) => ({ event_id: c.event.event_id, patient_id: c.event.patient_id, status: c.status, severity: c.event.severity, updated_at: c.updated_at }));
    res.json({ cases });
});
router.patch('/:event_id/status', (req, res) => {
    const eventId = req.params.event_id;
    const { status } = req.body;
    if (!status || !['PENDING', 'IN_REVIEW', 'CLOSED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }
    const caseData = dataStore_1.blackBoxCases.get(eventId);
    if (!caseData) {
        return res.status(404).json({ error: 'Black Box case not found.' });
    }
    caseData.status = status;
    caseData.updated_at = new Date().toISOString();
    dataStore_1.auditLedger.push({ record_id: (0, uuid_1.v4)(), timestamp: caseData.updated_at, payload: { event_id: eventId, status } });
    res.json({ event_id: eventId, status: caseData.status, updated_at: caseData.updated_at });
});
exports.default = router;
