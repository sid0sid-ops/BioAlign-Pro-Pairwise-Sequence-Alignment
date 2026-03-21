/**
 * @file ui/inputController.js
 * @description Reads, structures, and sanitizes sequences and parameters from the DOM text areas prior to passing them to the engine.
 * @pipelineLocation Frontend interactive phase. The first point of contact with user-supplied data.
 * @changeImpact Modifying DOM selector IDs or value retrieval here will cause the engine to receive null data and crash when the 'Align' button is clicked.
 */

/**
 * @file ui/inputController.js
 * @description User interaction logic, managing sliders, parameters, textareas, and API drops.
 * @pipeline Handles all non-computation DOM events up until the user hits the Compute button. Manages DNA vs Protein states, fetches NCBI sequences asynchronously via eutils, and toggles parameters.
 */
export const PROTEIN_CHARS = /^[ACDEFGHIKLMNPQRSTVWYBZXUO*-]+$/i;
export const DNA_RNA_CHARS = /^[ACGTURYMKSWBDHVN-]+$/i;

export let currentAlgo = 'global';
export let seqType = 'protein';

export function startAlignmentMode(mode) {
    currentAlgo = mode;
    const landing = document.getElementById('landingStage');
    const workspace = document.getElementById('workspaceStage');

    if (landing) {
        landing.classList.add('hidden');
        landing.style.display = 'none';
    }
    if (workspace) {
        workspace.classList.remove('hidden');
        workspace.classList.add('flex');
        workspace.style.display = 'flex';
    }

    const title = document.getElementById('workspaceTitle');
    if (title) {
        if (mode === 'global') {
            title.innerHTML = `Global Alignment <span class="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-red-500 font-normal whitespace-normal w-max max-w-full leading-tight">Needleman-Wunsch</span>`;
        } else if (mode === 'local') {
            title.innerHTML = `Local Alignment <span class="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-emerald-400 font-normal whitespace-normal w-max max-w-full leading-tight">Smith-Waterman</span>`;
        } else if (mode === 'blast') {
            title.innerHTML = `BLAST-like Search <span class="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-blue-500 font-normal whitespace-normal w-max max-w-full leading-tight">Heuristic</span>`;
        }
    }

    const gapMathSelect = document.getElementById('paramGapMath');
    if (gapMathSelect) {
        if (mode === 'blast') {
            gapMathSelect.value = 'linear';
            gapMathSelect.disabled = true;
            gapMathSelect.title = "BLAST uses linear gap math automatically";
            syncWordSizeUI('linear');
        } else {
            if (gapMathSelect.disabled) {
                gapMathSelect.value = 'affine';
                gapMathSelect.disabled = false;
                gapMathSelect.title = "";
                syncWordSizeUI('affine');
            }
        }
    }
}

export function returnToLanding() {
    const landing = document.getElementById('landingStage');
    const workspace = document.getElementById('workspaceStage');
    const results = document.getElementById('resultsSection');

    if (workspace) {
        workspace.classList.add('hidden');
        workspace.classList.remove('flex');
        workspace.style.display = 'none';
    }
    if (landing) {
        landing.classList.remove('hidden');
        landing.style.display = '';
    }
    if (results) {
        results.classList.add('hidden');
        results.classList.remove('flex');
        results.style.display = 'none';
    }
}

export function sanitizeSequence(raw) {
    return raw
        .split('\n')
        .filter(l => !l.trim().startsWith('>'))
        .map(l => l
            .replace(/\d+/g, '')
            .replace(/[\s\t\r\u00A0\u200B]/g, '')
        )
        .join('')
        .toUpperCase();
}

export function getActiveTab(seqNum) {
    for (const t of ['manual', 'upload', 'ncbi']) {
        const btn = document.getElementById(`tab-${seqNum}-${t}`);
        if (btn && btn.classList.contains('active')) return t;
    }
    return 'manual';
}

export function getRawSequence(seqNum) {
    const tab = getActiveTab(seqNum);
    const raw = tab === 'ncbi'
        ? (document.getElementById(`seq${seqNum}-ext`)?.value || '')
        : (document.getElementById(`seq${seqNum}`)?.value || '');
    return sanitizeSequence(raw);
}

export function validateSequence(seq, seqNum) {
    if (!seq) { showToast(`Sequence ${seqNum} is empty.`, 'error'); return false; }
    const pattern = seqType === 'dna' ? DNA_RNA_CHARS : PROTEIN_CHARS;
    const clean = seq.replace(/^>[^\n]*\n?/, '').replace(/\s/g, '');
    if (!pattern.test(clean)) {
        const expected = seqType === 'dna' ? 'DNA/RNA (ACGTURYMKSWBDHVN)' : 'Protein (ACDEFGHIKLMNPQRSTVWY...)';
        showToast(`Sequence ${seqNum}: Invalid characters for ${expected} mode.`, 'error');
        return false;
    }
    return true;
}

export function setSequenceType(type) {
    seqType = type;
    const dnaBtn = document.getElementById('typeDnaBtn');
    const protBtn = document.getElementById('typeProteinBtn');
    const dnaGrp = document.getElementById('dnaMatrices');
    const protGrp = document.getElementById('proteinMatrices');
    const mtxSelect = document.getElementById('paramMatrix');

    if (type === 'dna') {
        if (dnaBtn) dnaBtn.className = "px-6 py-2 rounded-full text-sm font-medium transition-colors bg-black text-white dark:bg-white dark:text-black shadow-md";
        if (protBtn) protBtn.className = "px-6 py-2 rounded-full text-sm font-medium transition-colors text-muted hover:text-black dark:hover:text-white";
        if (dnaGrp) { dnaGrp.disabled = false; dnaGrp.classList.remove('hidden'); }
        if (protGrp) { protGrp.disabled = true; protGrp.classList.add('hidden'); }
        if (mtxSelect) mtxSelect.value = "DNAFULL";

        const s1 = document.getElementById('seq1');
        const s2 = document.getElementById('seq2');
        if (s1) s1.placeholder = "Paste DNA / RNA sequence (e.g., AGTCGATCGTAT...)";
        if (s2) s2.placeholder = "Paste DNA / RNA sequence (e.g., AGTCGATCGTAT...)";
        const csg = document.getElementById('customScoreGroup');
        if (csg) csg.classList.remove('hidden');
        syncCustomScoreUI(document.getElementById('paramGapMath')?.value || 'affine');
    } else {
        if (protBtn) protBtn.className = "px-6 py-2 rounded-full text-sm font-medium transition-colors bg-black text-white dark:bg-white dark:text-black shadow-md";
        if (dnaBtn) dnaBtn.className = "px-6 py-2 rounded-full text-sm font-medium transition-colors text-muted hover:text-black dark:hover:text-white";
        if (dnaGrp) { dnaGrp.disabled = true; dnaGrp.classList.add('hidden'); }
        if (protGrp) { protGrp.disabled = false; protGrp.classList.remove('hidden'); }
        if (mtxSelect) mtxSelect.value = "BLOSUM62";

        const s1 = document.getElementById('seq1');
        const s2 = document.getElementById('seq2');
        if (s1) s1.placeholder = "Paste Protein sequence (e.g., MVLSPADKTN...)";
        if (s2) s2.placeholder = "Paste Protein sequence (e.g., MVLSPADKTN...)";
        syncCustomScoreUI('emboss-protein');
    }
}

export function syncWordSizeUI(gapMathValue) {
    const group = document.getElementById('ncbiWordSizeGroup');
    if (!group) return;
    if (gapMathValue === 'linear') {
        group.classList.remove('hidden');
    } else {
        group.classList.add('hidden');
    }
    syncCustomScoreUI(gapMathValue);
}

/**
 * applyModeDefaults — reads current seqType + currentAlgo + gapMath
 * and pushes the published EMBOSS / NCBI default gap parameters into the UI sliders.
 *
 * Mode → defaults mapping (from modeConfigs.js):
 *   protein_needle  : gapOpen=10, gapExtend=0.5  (Affine)
 *   protein_water   : gapOpen=10, gapExtend=0.5  (Affine)
 *   protein_ncbi_global : gapOpen=11, gapExtend=1.0 (Linear)
 *   blastp_like     : gapOpen=11, gapExtend=1.0  (Linear)
 *   dna_needle      : gapOpen=10, gapExtend=0.5  (Affine)
 *   dna_water       : gapOpen=10, gapExtend=0.5  (Affine)
 *   blastn          : gapOpen=5,  gapExtend=2.0  (Linear/BLAST)
 */
export function applyModeDefaults() {
    const gapMathEl = document.getElementById('paramGapMath');
    const gapOpenEl = document.getElementById('paramGapOpen');
    const gapExtEl = document.getElementById('paramGapExtend');
    const gapOpenValEl = document.getElementById('gapOpenVal');
    const gapExtValEl = document.getElementById('gapExtVal');

    if (!gapMathEl) return;
    const gapMath = gapMathEl.value;

    // Determine which defaults apply based on sequence type + algo + gap model
    let defaults;

    const isLocal = (currentAlgo === 'local' || currentAlgo === 'blast');
    const isBlastn = (currentAlgo === 'blast' && seqType === 'dna');
    const isBlastp = (currentAlgo === 'blast' && seqType === 'protein');

    if (gapMath === 'linear') {
        if (isBlastn || (isLocal && seqType === 'dna')) {
            defaults = { gapOpen: 5, gapExtend: 2.0 };       // BLASTN
        } else {
            defaults = { gapOpen: 11, gapExtend: 1.0 };      // NCBI Protein linear
        }
    } else {
        // Affine — same defaults for both global/local and DNA/protein
        defaults = { gapOpen: 10, gapExtend: 0.5 };          // EMBOSS Gotoh affine
    }

    if (gapOpenEl) {
        gapOpenEl.value = defaults.gapOpen;
        if (gapOpenValEl) gapOpenValEl.innerText = defaults.gapOpen;
        // Sync the range slider background fill
        const max = parseFloat(gapOpenEl.max) || 30;
        const pct = ((defaults.gapOpen / max) * 100).toFixed(1);
        gapOpenEl.style.background = `linear-gradient(to right,var(--primary) ${pct}%,var(--chip-bg) ${pct}%)`;
    }
    if (gapExtEl) {
        gapExtEl.value = defaults.gapExtend;
        if (gapExtValEl) gapExtValEl.innerText = defaults.gapExtend;
        const max = parseFloat(gapExtEl.max) || 5;
        const pct = ((defaults.gapExtend / max) * 100).toFixed(1);
        gapExtEl.style.background = `linear-gradient(to right,var(--primary) ${pct}%,var(--chip-bg) ${pct}%)`;
    }

    const wordSizeEl = document.getElementById('paramWordSize');
    const expectEl = document.getElementById('paramExpectThreshold');
    if (wordSizeEl) {
        if (isBlastn || (isLocal && seqType === 'dna')) wordSizeEl.value = 11;
        else if (isBlastp || (isLocal && seqType === 'protein')) wordSizeEl.value = 3;
    }
    if (expectEl) {
        expectEl.value = 0.05; // Standard NCBI BLAST E-value cutoff
    }

    // Also sync the downstream word-size / custom score panels
    syncWordSizeUI(gapMath);
}

export function syncCustomScoreUI(gapMathValue) {
    const csg = document.getElementById('customScoreGroup');
    const mEl = document.getElementById('paramMatchScore');
    const mmEl = document.getElementById('paramMismatchScore');
    if (!csg) return;

    const isNcbi = (gapMathValue === 'linear');
    const isDna = (seqType === 'dna');

    if (isNcbi && isDna) {
        csg.classList.remove('hidden');
        if (mEl && (mEl.value === '' || mEl.value === '0')) mEl.value = 2;
        if (mmEl && (mmEl.value === '' || mmEl.value === '0')) mmEl.value = -3;
    } else {
        csg.classList.add('hidden');
        if (mEl) mEl.value = 1;
        if (mmEl) mmEl.value = -3;
    }
}

export function clearSeq(seqNum) {
    const el = document.getElementById('seq' + seqNum);
    if (el) el.value = '';
    const rs = document.getElementById('resultsSection');
    if (rs) { rs.classList.add('hidden'); rs.classList.remove('flex'); }
    switchTab(seqNum, 'manual');
}

export function loadExample(seqNum) {
    let ex = "";
    if (seqType === 'dna') {
        ex = seqNum === 1 ? "AAGCTTAAGGCCATGCTAGCTA" : "AAGCTTCGCCATGCATGCTA";
    } else {
        ex = seqNum === 1
            ? "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHF"
            : "MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDL";
    }
    const el = document.getElementById('seq' + seqNum);
    if (el) el.value = ex;
    switchTab(seqNum, 'manual');
}

export function switchTab(seqNum, tabName) {
    ['manual', 'ncbi', 'upload'].forEach(t => {
        const btn = document.getElementById('tab-' + seqNum + '-' + t);
        if (btn) btn.className = "tab-btn px-3 py-1 text-xs font-medium rounded-md transition-colors text-muted";
    });

    const activeBtn = document.getElementById('tab-' + seqNum + '-' + tabName);
    if (activeBtn) activeBtn.className = "tab-btn active px-3 py-1 text-xs font-medium rounded-md transition-colors bg-black text-white dark:bg-white dark:text-black shadow-sm";

    const manualContent = document.getElementById('content-' + seqNum + '-manual');
    const ncbiContent = document.getElementById('content-' + seqNum + '-ncbi');
    const uploadContent = document.getElementById('content-' + seqNum + '-upload');

    if (manualContent) { manualContent.classList.add('hidden'); manualContent.classList.remove('block'); }
    if (ncbiContent) { ncbiContent.classList.add('hidden'); ncbiContent.classList.remove('block'); }
    if (uploadContent) { uploadContent.classList.add('hidden'); uploadContent.classList.remove('flex'); }

    const target = document.getElementById('content-' + seqNum + '-' + tabName);
    if (!target) return;

    if (tabName === 'upload') {
        target.classList.add('flex');
        target.classList.remove('hidden');
    } else {
        target.classList.add('block');
        target.classList.remove('hidden');
    }
}

export function toggleAdvancedOptions() {
    const block = document.getElementById('advancedOptionsBlock');
    const icon = document.getElementById('optionsToggleIcon1');
    if (!block) return;

    if (block.classList.contains('hidden')) {
        block.classList.remove('hidden');
        if (icon) { icon.classList.remove('fa-gear'); icon.classList.add('fa-chevron-up'); }
    } else {
        block.classList.add('hidden');
        if (icon) { icon.classList.remove('fa-chevron-up'); icon.classList.add('fa-gear'); }
    }
}

export function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    const icon = document.getElementById('themeIcon');

    if (isDark) {
        html.classList.remove('dark');
        if (icon) icon.className = 'fa-solid fa-moon text-black';
    } else {
        html.classList.add('dark');
        if (icon) icon.className = 'fa-solid fa-sun text-white';
    }
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    const cl = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
        : (type === 'error' ? 'bg-destructive/10 border-destructive/50 text-destructive'
            : 'bg-surface/90 border-border text-white');
    const ic = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-circle-xmark' : 'fa-info-circle');
    t.className = `flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg transform transition-all translate-y-10 opacity-0 ${cl}`;
    t.innerHTML = `<i class="fa-solid ${ic}"></i> <span class="font-medium text-sm">${message}</span>`;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.remove('translate-y-10', 'opacity-0'));
    setTimeout(() => {
        t.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => t.remove(), 300);
    }, 4000);
}

export function handleFileDrop(e, seqNum) {
    e.preventDefault();
    e.currentTarget.classList.remove('border-green-500', 'bg-green-500/5');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0], seqNum);
}

export function handleFileUpload(e, seqNum) {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0], seqNum);
}

export function processFile(file, seqNum) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const el = document.getElementById('seq' + seqNum);
        if (el) el.value = e.target.result;
        switchTab(seqNum, 'manual');
        showToast(`Loaded file: ${file.name}`, 'success');
    };
    reader.onerror = () => showToast(`Error reading file: ${file.name}`, 'error');
    reader.readAsText(file);
}

export async function fetchNCBI(seqNum) {
    const input = document.getElementById('ncbi-search-' + seqNum);
    if (!input) return;
    const val = input.value.trim();
    if (val.length < 4) { showToast("Please enter a valid Accession ID", "error"); return; }
    const acc = val.toUpperCase();
    let isProt = acc.includes('_') ? /^[ANXWY]P_/.test(acc) : /^[A-Z]{3}\d{5,7}$/.test(acc);
    let isNuc = acc.includes('_') ? /^[NX][MRCGTW]_/.test(acc) : (/^[A-Z]{1}\d{5}$/.test(acc) || /^[A-Z]{2}\d{6}$/.test(acc) || /^[A-Z]{4}\d{8,9}$/.test(acc));

    if (seqType === 'protein' && isNuc) { showToast("Error: DNA/RNA accession in Protein mode.", "error"); return; }
    if (seqType === 'dna' && isProt) { showToast("Error: Protein accession in DNA/RNA mode.", "error"); return; }

    await executeFetch(seqNum, val);
}

async function executeFetch(seqNum, accessionId) {
    const s = document.getElementById('ncbi-status-' + seqNum);
    const t = document.getElementById('seq' + seqNum + '-ext');
    const b = document.getElementById('btn-fetch-' + seqNum);
    if (s) { s.classList.remove('hidden'); s.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-primary"></i> <span class="status-text text-primary text-xs">Connecting...</span>`; }
    if (b) { b.disabled = true; b.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`; }

    try {
        const dbType = seqType === 'protein' ? 'protein' : 'nuccore';
        const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=${dbType}&id=${encodeURIComponent(accessionId)}&rettype=fasta&retmode=text`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP Error: ${r.status}`);
        const d = await r.text();
        if (d.toLowerCase().includes("error") || !d.trim().startsWith(">")) throw new Error("Invalid format or ID not found.");
        let seq = "", desc = "";
        for (let l of d.split(/\r?\n/)) {
            if (l.trim().startsWith('>')) { if (!desc) desc = l.trim().substring(1); continue; }
            seq += l.trim();
        }
        if (t) { t.value = seq; t.classList.remove('hidden'); t.setAttribute('data-desc', desc); }
        if (s) s.innerHTML = `<i class="fa-solid fa-check text-emerald-400"></i> <span class="text-emerald-400 text-xs font-semibold">Ready.</span>`;
        showToast(`Loaded ${desc}`, "success");
    } catch (e) {
        if (s) s.innerHTML = `<i class="fa-solid fa-circle-xmark text-destructive"></i> <span class="text-destructive text-xs font-semibold">${e.message}</span>`;
        if (t) { t.classList.add('hidden'); t.value = ""; t.removeAttribute('data-desc'); }
    } finally {
        if (b) { b.disabled = false; b.innerText = "Fetch"; }
    }
}
