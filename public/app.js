const healthBtn = document.getElementById('healthBtn');
const healthResult = document.getElementById('healthResult');
const blackboxBtn = document.getElementById('blackboxBtn');
const blackboxGetBtn = document.getElementById('blackboxGetBtn');
const blackboxPayload = document.getElementById('blackboxPayload');
const blackboxEventId = document.getElementById('blackboxEventId');
const blackboxResult = document.getElementById('blackboxResult');
const mrvBtn = document.getElementById('mrvBtn');
const mrvGetBtn = document.getElementById('mrvGetBtn');
const mrvPayload = document.getElementById('mrvPayload');
const mrvRequestId = document.getElementById('mrvRequestId');
const mrvResult = document.getElementById('mrvResult');

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function setResult(element, status, value) {
  element.textContent = `HTTP ${status}\n\n${pretty(value)}`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    payload = { error: 'Unable to parse response as JSON', raw: text };
  }
  return { status: response.status, payload };
}

async function handleHealthCheck() {
  healthResult.textContent = 'Checking server health...';
  const result = await fetchJson('/health');
  setResult(healthResult, result.status, result.payload);
}

async function handleBlackBoxTrigger() {
  try {
    const payload = JSON.parse(blackboxPayload.value);
    blackboxResult.textContent = 'Sending Black Box request...';
    const result = await fetchJson('/api/v1/blackbox/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setResult(blackboxResult, result.status, result.payload);
    if (result.payload?.event_id) {
      blackboxEventId.value = result.payload.event_id;
    }
  } catch (error) {
    blackboxResult.textContent = `Invalid JSON: ${error.message}`;
  }
}

async function handleBlackBoxGet() {
  const eventId = blackboxEventId.value.trim();
  if (!eventId) {
    blackboxResult.textContent = 'Please enter an event_id to retrieve.';
    return;
  }
  blackboxResult.textContent = `Fetching Black Box case ${eventId}...`;
  const result = await fetchJson(`/api/v1/blackbox/${encodeURIComponent(eventId)}`);
  setResult(blackboxResult, result.status, result.payload);
}

async function handleMrvVerify() {
  try {
    const payload = JSON.parse(mrvPayload.value);
    mrvResult.textContent = 'Sending MRV verify request...';
    const result = await fetchJson('/api/v1/mrv/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setResult(mrvResult, result.status, result.payload);
    if (result.payload?.request_id) {
      mrvRequestId.value = result.payload.request_id;
    }
  } catch (error) {
    mrvResult.textContent = `Invalid JSON: ${error.message}`;
  }
}

async function handleMrvGet() {
  const requestId = mrvRequestId.value.trim();
  if (!requestId) {
    mrvResult.textContent = 'Please enter a request_id to retrieve.';
    return;
  }
  mrvResult.textContent = `Fetching MRV result ${requestId}...`;
  const result = await fetchJson(`/api/v1/mrv/result/${encodeURIComponent(requestId)}`);
  setResult(mrvResult, result.status, result.payload);
}

healthBtn.addEventListener('click', handleHealthCheck);
blackboxBtn.addEventListener('click', handleBlackBoxTrigger);
blackboxGetBtn.addEventListener('click', handleBlackBoxGet);
mrvBtn.addEventListener('click', handleMrvVerify);
mrvGetBtn.addEventListener('click', handleMrvGet);

blackboxPayload.value = JSON.stringify(
  {
    event_id: 'evt-12345',
    patient_id: 'patient-001',
    event_type: 'ADVERSE_DRUG_REACTION',
    severity: 'HIGH',
    event_timestamp: new Date().toISOString(),
    source_record: 'ehr://hospital/record/98765',
    details: {
      symptoms: ['rash', 'tachycardia'],
      medications: ['aspirin'],
      labs: [
        {
          code: 'LOINC:1234-5',
          value: 6.0,
          unit: 'mmol/L',
          collected_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        },
      ],
    },
  },
  null,
  2,
);

mrvPayload.value = JSON.stringify(
  {
    request_id: 'mrv-001',
    patient_id: 'patient-001',
    clinician_id: 'clinician-42',
    timestamp: new Date().toISOString(),
    symptoms: ['fever', 'cough'],
    labs: [
      {
        code: 'LOINC:12345-6',
        value: 7.2,
        unit: 'mmol/L',
        collected_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ],
    diagnosis: ['ICD10:R50', 'ICD10:J06.9'],
    prescription: {
      drug: 'Amoxicillin',
      dose: '500mg',
      frequency: 'TID',
      duration: '5 days',
      route: 'ORAL',
    },
  },
  null,
  2,
);
