// Berechnungslogik für den Citrat-Dosierungsrechner.
// WICHTIG: Diese Werte sind Orientierungswerte nach den auf den Geräteprotokoll-
// Seiten dokumentierten Formeln/Tabellen und ersetzen nicht die Eingabe am Gerät
// oder das zentrumsspezifisch freigegebene Protokoll.

const deviceDefaults = {
  generic:      { bloodFlow: 150, citrateConc: 136, targetDose: 3.0, caMode: 'blood' },
  multifiltrate:{ bloodFlow: 100, citrateConc: 136, targetDose: 4.0, caMode: 'effluent', effluentFlow: 2000, caDosePerEffluent: 1.7, caStockConc: 200 },
  prismaflex:   { bloodFlow: 120, citrateConc: 136, targetDose: 3.0, caMode: 'blood', caReplacementRatio: 0.5 },
  omni:         { bloodFlow: 150, citrateConc: 136, targetDose: 4.0, caMode: 'effluent', effluentFlow: 2000, caDosePerEffluent: 1.7, caStockConc: 500 },
};

const deviceHints = {
  generic: 'Geräteprotokoll-Seite',
  multifiltrate: 'multiFiltrate-Ci-Ca-Protokollseite',
  prismaflex: 'Prismaflex/Prismax-Protokollseite',
  omni: 'OMNI-Protokollseite',
};

// Nikkiso Aquarius: reines Tabellen-Lookup, keine Formel (siehe Aquarius-Protokollseite)
const aquariusTable = {
  orange: [
    { bloodPump: 120, citrate: 180, accusol: 1400 },
    { bloodPump: 150, citrate: 230, accusol: 1800 },
    { bloodPump: 180, citrate: 270, accusol: 2100 },
    { bloodPump: 200, citrate: 300, accusol: 2400 },
    { bloodPump: 230, citrate: 350, accusol: 2700 },
  ],
  purple: [
    { bloodPump: 100, citrate: 150, accusol: 1100 },
    { bloodPump: 110, citrate: 170, accusol: 1300 },
    { bloodPump: 130, citrate: 200, accusol: 1500 },
    { bloodPump: 140, citrate: 210, accusol: 1700 },
    { bloodPump: 160, citrate: 240, accusol: 1900 },
  ]
};

function applyDeviceDefaults() {
  const deviceSelect = document.getElementById('deviceSelect');
  const formulaPanel = document.getElementById('formulaPanel');
  const aquariusPanel = document.getElementById('aquariusPanel');
  const adjustmentSection = document.getElementById('adjustmentSection');
  const aquariusAdjustSection = document.getElementById('aquariusAdjustSection');
  if (!deviceSelect) return;

  const device = deviceSelect.value;

  if (device === 'aquarius') {
    if (formulaPanel) formulaPanel.style.display = 'none';
    if (adjustmentSection) adjustmentSection.style.display = 'none';
    if (aquariusPanel) aquariusPanel.style.display = 'grid';
    if (aquariusAdjustSection) aquariusAdjustSection.style.display = 'block';
    calculateAquarius();
    return;
  }
  if (formulaPanel) formulaPanel.style.display = 'grid';
  if (adjustmentSection) adjustmentSection.style.display = 'block';
  if (aquariusPanel) aquariusPanel.style.display = 'none';
  if (aquariusAdjustSection) aquariusAdjustSection.style.display = 'none';

  const cfg = deviceDefaults[device] || deviceDefaults.generic;
  document.getElementById('bloodFlow').value = cfg.bloodFlow;
  document.getElementById('citrateConc').value = cfg.citrateConc;
  document.getElementById('targetDose').value = cfg.targetDose;

  const caByBloodField = document.getElementById('caByBloodField');
  const caByEffluentFields = document.getElementById('caByEffluentFields');

  if (cfg.caMode === 'effluent') {
    caByBloodField.style.display = 'none';
    caByEffluentFields.style.display = 'block';
    document.getElementById('effluentFlow').value = cfg.effluentFlow;
    document.getElementById('caDosePerEffluent').value = cfg.caDosePerEffluent;
    document.getElementById('caStockConc').value = cfg.caStockConc;
  } else {
    caByBloodField.style.display = 'block';
    caByEffluentFields.style.display = 'none';
    document.getElementById('caReplacementRatio').value = cfg.caReplacementRatio || 0.5;
  }

  const hintEl = document.getElementById('deviceHintText');
  const hintEl2 = document.getElementById('deviceHintText2');
  if (hintEl) hintEl.textContent = deviceHints[device] || 'Geräteprotokoll-Seite';
  if (hintEl2) hintEl2.textContent = deviceHints[device] || 'dein Gerät';

  calculateDosing();
}

function calculateDosing() {
  const deviceSelect = document.getElementById('deviceSelect');
  const device = deviceSelect ? deviceSelect.value : 'generic';
  const cfg = deviceDefaults[device] || deviceDefaults.generic;

  const bloodFlow = parseFloat(document.getElementById('bloodFlow').value);       // ml/min
  const citrateConc = parseFloat(document.getElementById('citrateConc').value);   // mmol/l
  const targetDose = parseFloat(document.getElementById('targetDose').value);     // mmol Citrat pro Liter Blut

  if ([bloodFlow, citrateConc, targetDose].some(v => isNaN(v) || v <= 0)) {
    document.getElementById('resultCitrateRate').textContent = 'Bitte gültige Werte eingeben';
    document.getElementById('resultCaRate').textContent = '—';
    return;
  }

  const bloodFlowLPerH = (bloodFlow * 60) / 1000; // ml/min -> l/h
  const citrateNeedMmolPerH = targetDose * bloodFlowLPerH;
  const citrateRateMlPerH = (citrateNeedMmolPerH / citrateConc) * 1000;
  document.getElementById('resultCitrateRate').textContent = citrateRateMlPerH.toFixed(1) + ' ml/h';

  if (cfg.caMode === 'effluent') {
    const effluentFlow = parseFloat(document.getElementById('effluentFlow').value); // ml/h
    const caDosePerEffluent = parseFloat(document.getElementById('caDosePerEffluent').value); // mmol/l Effluent
    const caStockConc = parseFloat(document.getElementById('caStockConc').value); // mmol/l
    if ([effluentFlow, caDosePerEffluent, caStockConc].some(v => isNaN(v) || v <= 0)) {
      document.getElementById('resultCaRate').textContent = 'Bitte gültige Werte eingeben';
      return;
    }
    const caNeedMmolPerH = caDosePerEffluent * (effluentFlow / 1000);
    const caRateMlPerH = (caNeedMmolPerH / caStockConc) * 1000;
    document.getElementById('resultCaRate').textContent = caRateMlPerH.toFixed(1) + ' ml/h (' + caNeedMmolPerH.toFixed(2) + ' mmol/h)';
  } else {
    const caRatio = parseFloat(document.getElementById('caReplacementRatio').value); // mmol Ca pro mmol Citrat
    if (isNaN(caRatio) || caRatio <= 0) {
      document.getElementById('resultCaRate').textContent = 'Bitte gültige Werte eingeben';
      return;
    }
    const caRateMmolPerH = citrateNeedMmolPerH * caRatio;
    document.getElementById('resultCaRate').textContent = caRateMmolPerH.toFixed(2) + ' mmol/h (Substitutionslösung nach Zentrumsstandard)';
  }
}

function calculateAquarius() {
  const protocolSelect = document.getElementById('aquariusProtocol');
  const weightSelect = document.getElementById('aquariusWeight');
  if (!protocolSelect || !weightSelect) return;
  const row = aquariusTable[protocolSelect.value][parseInt(weightSelect.value, 10)];
  document.getElementById('aqBloodPump').textContent = row.bloodPump + ' ml/min';
  document.getElementById('aqCitrate').textContent = row.citrate + ' ml/h';
  document.getElementById('aqAccusol').textContent = row.accusol + ' ml/h';
}

// --- Anpassung nach Istwerten: geräteabhängige Schemata ---

function adjustFresenius(pfCa, sysCa) {
  let citrateText, caText;
  if (pfCa > 0.45) citrateText = 'Citratdosis um 0,3 mmol/l ERHÖHEN — und Arzt informieren';
  else if (pfCa >= 0.41) citrateText = 'Citratdosis um 0,2 mmol/l erhöhen';
  else if (pfCa >= 0.35) citrateText = 'Citratdosis um 0,1 mmol/l erhöhen';
  else if (pfCa >= 0.25) citrateText = 'Keine Änderung — im Zielbereich (0,25–0,34)';
  else if (pfCa >= 0.20) citrateText = 'Citratdosis um 0,1 mmol/l senken';
  else if (pfCa >= 0.15) citrateText = 'Citratdosis um 0,2 mmol/l senken';
  else citrateText = 'Citratdosis um 0,3 mmol/l SENKEN — und Arzt informieren';

  if (sysCa > 1.45) caText = 'Calciumdosis um 0,6 mmol/l SENKEN — und Arzt informieren';
  else if (sysCa >= 1.31) caText = 'Calciumdosis um 0,4 mmol/l senken';
  else if (sysCa >= 1.21) caText = 'Calciumdosis um 0,2 mmol/l senken';
  else if (sysCa >= 1.12) caText = 'Keine Änderung — im Zielbereich (1,12–1,20)';
  else if (sysCa >= 1.05) caText = 'Calciumdosis um 0,2 mmol/l erhöhen';
  else if (sysCa >= 0.95) caText = 'Calciumdosis um 0,4 mmol/l erhöhen';
  else caText = 'Calciumdosis um 0,6 mmol/l ERHÖHEN — und Arzt informieren';

  return { citrateText, caText };
}

function adjustPrismaflex(pfCa, sysCa) {
  let citrateText, caText;
  if (pfCa < 0.25) citrateText = 'Prismocitrat-Fluss um 200 ml/h senken (Postfilter-Ca zu niedrig)';
  else if (pfCa > 0.35) citrateText = 'Prismocitrat-Fluss um 200 ml/h erhöhen (Postfilter-Ca zu hoch)';
  else citrateText = 'Keine Änderung — im Zielbereich (0,25–0,35)';

  if (sysCa < 0.80) caText = 'Calciumgluconat 10%: +10 ml/h (bzw. Calciumchlorid 5,5%: +5 ml/h)';
  else if (sysCa < 1.00) caText = 'Calciumgluconat 10%: +5 ml/h (bzw. Calciumchlorid 5,5%: +2,5 ml/h)';
  else if (sysCa <= 1.20) caText = 'Keine Änderung — im Zielbereich (1,00–1,20)';
  else if (sysCa <= 1.33) caText = 'Calciumgluconat 10%: −5 ml/h (bzw. Calciumchlorid 5,5%: −2,5 ml/h)';
  else caText = 'Calciumgluconat 10%: −10 ml/h (bzw. Calciumchlorid 5,5%: −5 ml/h)';

  return { citrateText, caText };
}

function adjustGeneric(pfCa, sysCa) {
  // Orientierung an gängigen Zielbereichen (0,25-0,35 postfilter / 1,0-1,2 systemisch),
  // ohne herstellerspezifische Schrittgrößen — als grobe Richtung gedacht.
  let citrateText, caText;
  if (pfCa > 0.35) citrateText = 'Citratdosis leicht erhöhen (~10%) — Postfilter-Ca über Zielbereich';
  else if (pfCa < 0.25) citrateText = 'Citratdosis leicht senken (~10%) — Postfilter-Ca unter Zielbereich';
  else citrateText = 'Keine Änderung — im üblichen Zielbereich (0,25–0,35)';

  if (sysCa > 1.20) caText = 'Calciumdosis leicht senken (~10-15%) — systemisches Ca über Zielbereich';
  else if (sysCa < 1.00) caText = 'Calciumdosis leicht erhöhen (~10-15%) — systemisches Ca unter Zielbereich';
  else caText = 'Keine Änderung — im üblichen Zielbereich (1,0–1,2)';

  return { citrateText, caText };
}

function adjustOmni(pfCa, sysCa) {
  // B. Braun OMNI gibt kein einheitliches numerisches Schrittschema vor (zentrumsabhängig).
  let citrateText, caText;
  if (pfCa > 0.4) citrateText = 'Postfilter-Ca über Zielbereich (0,25–0,4) — Citratdosis nach Zentrumsprotokoll in kleinen Schritten senken';
  else if (pfCa < 0.25) citrateText = 'Postfilter-Ca unter Zielbereich (0,25–0,4) — Citratdosis nach Zentrumsprotokoll in kleinen Schritten erhöhen';
  else citrateText = 'Keine Änderung — im Zielbereich (0,25–0,4)';

  if (sysCa > 1.2) caText = 'Systemisches Ca über Norm — Calciumdosis nach Zentrumsprotokoll reduzieren';
  else if (sysCa < 1.0) caText = 'Systemisches Ca unter Norm — Calciumdosis nach Zentrumsprotokoll erhöhen; bei gleichzeitig steigendem Ca-Bedarf trotz Erhöhung an Citratakkumulation denken (siehe OMNI-Protokollseite)';
  else caText = 'Keine Änderung — im Normbereich';

  return { citrateText, caText };
}

const deviceAdjustFn = {
  generic: adjustGeneric,
  multifiltrate: adjustFresenius,
  prismaflex: adjustPrismaflex,
  omni: adjustOmni,
};

function calculateAdjustment() {
  const deviceSelect = document.getElementById('deviceSelect');
  const device = deviceSelect ? deviceSelect.value : 'generic';
  const pfCa = parseFloat(document.getElementById('postfilterCa').value);
  const sysCa = parseFloat(document.getElementById('systemicCa').value);

  const citrateResultEl = document.getElementById('adjustCitrateResult');
  const caResultEl = document.getElementById('adjustCaResult');

  if (isNaN(pfCa) || isNaN(sysCa)) {
    citrateResultEl.textContent = 'Bitte beide Werte eintragen';
    caResultEl.textContent = 'Bitte beide Werte eintragen';
    return;
  }

  const fn = deviceAdjustFn[device] || adjustGeneric;
  const result = fn(pfCa, sysCa);
  citrateResultEl.textContent = result.citrateText;
  caResultEl.textContent = result.caText;
}

function calculateAquariusAdjustment() {
  const sysCa = parseFloat(document.getElementById('aqSystemicCa').value);
  const resultEl = document.getElementById('aqAdjustResult');
  if (isNaN(sysCa)) {
    resultEl.textContent = 'Bitte Wert eintragen';
    return;
  }
  let text;
  if (sysCa < 0.8) text = 'Bolus 5 ml CaCl₂ 10% (3,4 mmol) sofort + Rate um 50 ml/h erhöhen — max. 175 ml/h, danach Arzt informieren';
  else if (sysCa < 0.9) text = 'Rate um 25 ml/h erhöhen — max. 175 ml/h, danach Arzt informieren';
  else if (sysCa <= 1.2) text = 'Keine Änderung — im Zielbereich (0,9–1,2)';
  else text = 'Rate um 25 ml/h senken; bei CaCl₂-Stopp systemisches iCa nach 3 Std. kontrollieren, Arzt informieren falls > 1,5';
  resultEl.textContent = text;
}

const calcBtn = document.getElementById('calcBtn');
if (calcBtn) {
  calcBtn.addEventListener('click', calculateDosing);
  document.getElementById('deviceSelect').addEventListener('change', applyDeviceDefaults);
  document.getElementById('aquariusCalcBtn').addEventListener('click', calculateAquarius);
  document.getElementById('aquariusProtocol').addEventListener('change', calculateAquarius);
  document.getElementById('aquariusWeight').addEventListener('change', calculateAquarius);
  document.getElementById('adjustBtn').addEventListener('click', calculateAdjustment);
  document.getElementById('aqAdjustBtn').addEventListener('click', calculateAquariusAdjustment);
  window.addEventListener('DOMContentLoaded', applyDeviceDefaults);
}

// --- PubMed: aktuelle Literatur automatisch laden ---
// Nutzt die öffentliche NCBI E-utilities API (kostenlos, kein Key für diesen Umfang nötig).
// Zeigt nur bibliografische Metadaten (Titel, Autoren, Journal, Jahr) + Link zu PubMed —
// keine Abstracts, aus Urheberrechtsgründen.
async function loadPubMedLiterature(containerId, maxResults) {
  const container = document.getElementById(containerId);
  if (!container) return;
  maxResults = maxResults || 6;

  const term = encodeURIComponent(
    '(citrate anticoagulation[Title/Abstract]) AND (CRRT[Title/Abstract] OR CVVHD[Title/Abstract] OR "continuous renal replacement therapy"[Title/Abstract] OR dialysis[Title/Abstract])'
  );

  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=${maxResults}&sort=date&retmode=json&term=${term}`
    );
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult && searchData.esearchresult.idlist;

    if (!ids || ids.length === 0) {
      container.innerHTML = '<p style="color: var(--color-grey); font-size: 0.9rem;">Aktuell keine Ergebnisse abrufbar.</p>';
      return;
    }

    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`
    );
    const summaryData = await summaryRes.json();

    const items = ids.map(id => summaryData.result[id]).filter(Boolean);

    container.innerHTML = items.map(item => {
      const authors = (item.authors || []).slice(0, 3).map(a => a.name).join(', ');
      const authorsText = authors + ((item.authors || []).length > 3 ? ' et al.' : '');
      const year = (item.pubdate || '').split(' ')[0];
      return `
        <div class="lit-item">
          <a href="https://pubmed.ncbi.nlm.nih.gov/${item.uid}/" target="_blank" rel="noopener">${item.title}</a>
          <div class="lit-meta">${authorsText} — ${item.fulljournalname || item.source || ''}, ${year}</div>
        </div>`;
    }).join('');

  } catch (err) {
    container.innerHTML = '<p style="color: var(--color-grey); font-size: 0.9rem;">Literatur konnte gerade nicht geladen werden. Versuch es später erneut oder besuche PubMed direkt.</p>';
  }
}

if (document.getElementById('pubmed-list')) {
  loadPubMedLiterature('pubmed-list', 6);
}
