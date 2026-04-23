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
import { updateState, getState } from './state.js';

export const PROTEIN_CHARS = /^[ACDEFGHIKLMNPQRSTVWYBZXUO*-]+$/i;
export const DNA_RNA_CHARS = /^[ACGTURYMKSWBDHVN-]+$/i;

/** @returns {string} The currently active alignment algorithm. */
export const getCurrentAlgo = () => getState().alignmentType;
/** @param {string} val - 'global' | 'local' | 'blast' */
export const setCurrentAlgo = (val) => { updateState('SET_ALIGNMENT_TYPE', val); };

/** @returns {string} The currently active sequence type. */
export const getSeqType = () => getState().sequenceType;
/** @param {string} val - 'protein' | 'dna' */
export const setSeqType = (val) => { updateState('SET_SEQUENCE_TYPE', val); };

// Compatibility shims — read-only views used by legacy callsites that imported
// the plain bindings directly. Use the getters/setters for all new code.
export const currentAlgo = getCurrentAlgo();
export const seqType = getSeqType();

export function startAlignmentMode(mode) {
    setCurrentAlgo(mode);
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
            .replace(/[^A-Za-z*-]/g, '')  // strip digits, symbols, whitespace — keep valid IUPAC + gap chars
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
    const pattern = getSeqType() === 'dna' ? DNA_RNA_CHARS : PROTEIN_CHARS;
    const clean = seq;
    if (!pattern.test(clean)) {
        const expected = getSeqType() === 'dna' ? 'Nucleotide (ACGTURYMKSWBDHVN)' : 'Protein (ACDEFGHIKLMNPQRSTVWY...)';
        showToast(`Sequence ${seqNum}: Invalid characters for ${expected} mode.`, 'error');
        return false;
    }
    return true;
}

export function setSequenceType(type) {
    // NOTE: state is already updated by the caller (uiController). This function
    // is PURELY for visual DOM updates: button classes and textarea placeholders.
    const dnaBtn = document.getElementById('typeDnaBtn');
    const protBtn = document.getElementById('typeProteinBtn');

    if (type === 'dna') {
        if (dnaBtn) dnaBtn.className = "px-6 py-2 rounded-full text-sm font-medium transition-colors bg-black text-white dark:bg-white dark:text-black shadow-md";
        if (protBtn) protBtn.className = "px-6 py-2 rounded-full text-sm font-medium transition-colors text-muted hover:text-black dark:hover:text-white";

        const s1 = document.getElementById('seq1');
        const s2 = document.getElementById('seq2');
        if (s1) s1.placeholder = "Paste your Nucleotide sequence (FASTA or raw)";
        if (s2) s2.placeholder = "Paste your Nucleotide sequence (FASTA or raw)";
    } else {
        if (protBtn) protBtn.className = "px-6 py-2 rounded-full text-sm font-medium transition-colors bg-black text-white dark:bg-white dark:text-black shadow-md";
        if (dnaBtn) dnaBtn.className = "px-6 py-2 rounded-full text-sm font-medium transition-colors text-muted hover:text-black dark:hover:text-white";

        const s1 = document.getElementById('seq1');
        const s2 = document.getElementById('seq2');
        if (s1) s1.placeholder = "Paste your protein sequence (FASTA or raw)";
        if (s2) s2.placeholder = "Paste your protein sequence (FASTA or raw)";
    }
}

// These functions have been deprecated and removed, as parameter sync is handled by uiController
export function applyModeDefaults() { }
export function syncWordSizeUI() { }
export function syncCustomScoreUI() { }

export function clearSeq(seqNum) {
    const el = document.getElementById('seq' + seqNum);
    if (el) el.value = '';
    const rs = document.getElementById('resultsSection');
    if (rs) { rs.classList.add('hidden'); rs.classList.remove('flex'); }
    switchTab(seqNum, 'manual');
}

export function loadExample(seqNum) {
    let ex = "";
    if (getSeqType() === 'dna') {
        ex = seqNum === 1
            ? ">Human_TP53_Exon4_partial\nATGGACTATTCCTGAGTCTCCAGGTGAAATAGTGCCAACAATAAAAACTATCCCCCAGGC\nCCTCTCATCTAATCCTGTGAAAACCCAGGTCCAGGAGGCTTTCCAACTCCCACATCAGGC\nAACTCAAAACCTGGACCCTGCTTCTA"
            : ">Mouse_TP53_Exon4_partial\nATGGATTATTCCTGAGTCCCAAGGTGAAATAGTGCGAACAATGAAGACTATCCCCCAAGC\nCCTCTCACCTAATCCCGTGAAAACCCAGGTCCAGGAGGCTTTCCAACTCCCACACCAGGC\nAACTCAAAACATGGACTCTTCTTCTA";
    } else {
        ex = seqNum === 1
            ? ">sp|P69905|HBA_HUMAN Hemoglobin subunit alpha\nMVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHG\nKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTP\nAVHASLDKFLASVSTVLTSKYR"
            : ">sp|P68871|HBB_HUMAN Hemoglobin subunit beta\nMVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPK\nVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFG\nKEFTPPVQAAYQKVVAGVANALAHKYH";
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
    // Limit toast stack to 5 to prevent DOM bloat on rapid-fire calls
    if (container.children.length >= 5) container.removeChild(container.firstChild);
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

    if (getSeqType() === 'protein' && isNuc) { showToast("Error: DNA/RNA accession in Protein mode.", "error"); return; }
    if (getSeqType() === 'dna' && isProt) { showToast("Error: Protein accession in DNA/RNA mode.", "error"); return; }

    await executeFetch(seqNum, val);
}

async function executeFetch(seqNum, accessionId) {
    const s = document.getElementById('ncbi-status-' + seqNum);
    const t = document.getElementById('seq' + seqNum + '-ext');
    const b = document.getElementById('btn-fetch-' + seqNum);
    if (s) { s.classList.remove('hidden'); s.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-primary"></i> <span class="status-text text-primary text-xs">Connecting...</span>`; }
    if (b) { b.disabled = true; b.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`; }

    try {
        const dbType = getSeqType() === 'protein' ? 'protein' : 'nuccore';
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

// handleMatrixChange deprecated and fully managed by state.js
export function handleMatrixChange() { }
