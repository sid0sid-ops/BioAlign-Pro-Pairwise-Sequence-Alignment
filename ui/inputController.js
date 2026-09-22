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
import { getState, updateState } from './state.js';

export const PROTEIN_CHARS = /^[ACDEFGHIKLMNPQRSTVWYBZXUO*-]+$/i;
export const DNA_RNA_CHARS = /^[ACGTURYMKSWBDHVN-]+$/i;

/** @returns {string} The currently active alignment algorithm. */
export const getCurrentAlgo = () => getState().alignmentType;
/** @param {string} val - 'global' | 'local' | 'blast' */
export const setCurrentAlgo = (val) => {
    updateState('SET_ALIGNMENT_TYPE', val);
};

/** @returns {string} The currently active sequence type. */
export const getSeqType = () => getState().sequenceType;
/** @param {string} val - 'protein' | 'dna' */
export const setSeqType = (val) => {
    updateState('SET_SEQUENCE_TYPE', val);
};

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

    // Sync sequence type UI when entering workspace
    setSequenceType(getSeqType());
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
    if (!raw) return '';
    return raw
        .split('\n')
        .filter((l) => !l.trim().startsWith('>'))
        .join('')
        .replace(/\s+/g, '') // strip whitespace only; preserve numbers & symbols so validator catches them
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
    const raw =
        tab === 'ncbi'
            ? document.getElementById(`seq${seqNum}-ext`)?.value || ''
            : document.getElementById(`seq${seqNum}`)?.value || '';
    return sanitizeSequence(raw);
}

/**
 * Detailed sequence validator that returns validation status and specific diagnostic errors.
 * @param {string} seq - Sequence string (FASTA headers stripped, whitespace removed)
 * @param {number} seqNum - 1 or 2
 * @param {string} [type] - 'protein' | 'dna' (defaults to active sequenceType)
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateSequenceDetail(seq, seqNum, type = getSeqType()) {
    if (!seq || seq.trim().length === 0) {
        return { valid: false, error: `Sequence ${seqNum} is empty. Please enter or paste a sequence.` };
    }

    // 1. Explicit check for numbers / numeric digits (0-9)
    const digits = seq.match(/[0-9]/g);
    if (digits && digits.length > 0) {
        const uniqueDigits = [...new Set(digits)].slice(0, 5).join(', ');
        return {
            valid: false,
            error: `Sequence ${seqNum} contains numeric digits (${uniqueDigits}). Biological sequences cannot contain numbers.`
        };
    }

    const currentType = (type || 'protein').toLowerCase();

    // 2. Validate against selected biological mode
    if (currentType === 'dna') {
        const invalidChars = seq.match(/[^ACGTUNRYMKSWBDHV*-]/gi);
        if (invalidChars && invalidChars.length > 0) {
            const unique = [...new Set(invalidChars.map((c) => c.toUpperCase()))];
            // Check if user accidentally entered amino acids (e.g. E, F, I, L, P, Q, Z, etc.)
            const aminoAcids = unique.filter((c) => 'EFILPQZ'.includes(c));
            if (aminoAcids.length > 0) {
                return {
                    valid: false,
                    error: `Sequence ${seqNum} contains amino acid residues (${aminoAcids.join(', ')}) invalid for Nucleotide mode. Please enter DNA/RNA or switch to Protein mode.`
                };
            }
            return {
                valid: false,
                error: `Sequence ${seqNum} contains invalid character(s) (${unique.slice(0, 5).join(', ')}) for Nucleotide mode. Allowed: A, C, G, T, U and IUPAC ambiguity codes.`
            };
        }
    } else {
        // Protein mode
        const invalidChars = seq.match(/[^ACDEFGHIKLMNPQRSTVWYBZXUO*-]/gi);
        if (invalidChars && invalidChars.length > 0) {
            const unique = [...new Set(invalidChars.map((c) => c.toUpperCase()))].slice(0, 5);
            return {
                valid: false,
                error: `Sequence ${seqNum} contains invalid amino acid residue(s) (${unique.join(', ')}). Only standard IUPAC amino acids are permitted.`
            };
        }
    }

    return { valid: true, error: null };
}

/**
 * Updates UI inline error and textarea border for a given sequence number.
 * @param {number} seqNum - 1 or 2
 * @param {string|null} errorMsg - Error message to display, or null to clear
 */
export function setSequenceInputError(seqNum, errorMsg) {
    const textarea = document.getElementById(`seq${seqNum}`);
    const errContainer = document.getElementById(`seq${seqNum}-validation-error`);

    if (errorMsg) {
        if (textarea) {
            textarea.classList.add('border-red-500', 'focus:border-red-500', 'ring-1', 'ring-red-500');
            textarea.classList.remove(
                'focus:border-black',
                'dark:focus:border-white',
                'focus:ring-black',
                'dark:focus:ring-white'
            );
        }
        if (errContainer) {
            const textSpan = errContainer.querySelector('.error-text');
            if (textSpan) textSpan.innerText = errorMsg;
            errContainer.classList.remove('hidden');
        }
    } else {
        if (textarea) {
            textarea.classList.remove('border-red-500', 'focus:border-red-500', 'ring-1', 'ring-red-500');
            textarea.classList.add(
                'focus:border-black',
                'dark:focus:border-white',
                'focus:ring-black',
                'dark:focus:ring-white'
            );
        }
        if (errContainer) {
            errContainer.classList.add('hidden');
        }
    }
}

/**
 * Validates a sequence, updating inline UI indicators and showing a toast on failure.
 * @param {string} seq
 * @param {number} seqNum
 * @param {boolean} [silent=false]
 * @returns {boolean}
 */
export function validateSequence(seq, seqNum, silent = false) {
    const res = validateSequenceDetail(seq, seqNum, getSeqType());
    if (!res.valid) {
        setSequenceInputError(seqNum, res.error);
        if (!silent) {
            showToast(res.error, 'error');
        }
        return false;
    }
    setSequenceInputError(seqNum, null);
    return true;
}

/**
 * Re-validates sequence input in real-time.
 * @param {number} seqNum
 */
export function checkSequenceInput(seqNum) {
    const raw = document.getElementById(`seq${seqNum}`)?.value || '';
    if (!raw.trim()) {
        setSequenceInputError(seqNum, null);
        return;
    }
    const clean = sanitizeSequence(raw);
    validateSequence(clean, seqNum, true);
}

export function setSequenceType(type) {
    const isDna = type === 'dna';

    const dnaBtns = [document.getElementById('typeDnaBtn'), document.getElementById('workspaceTypeDnaBtn')].filter(
        Boolean
    );

    const protBtns = [
        document.getElementById('typeProteinBtn'),
        document.getElementById('workspaceTypeProteinBtn')
    ].filter(Boolean);

    if (isDna) {
        dnaBtns.forEach((b) => {
            b.classList.add('active');
            b.classList.remove('text-muted');
        });
        protBtns.forEach((b) => {
            b.classList.remove('active');
            b.classList.add('text-muted');
        });

        const s1 = document.getElementById('seq1');
        const s2 = document.getElementById('seq2');
        if (s1) s1.placeholder = 'Paste your Nucleotide sequence (FASTA or raw: A, C, G, T, U)';
        if (s2) s2.placeholder = 'Paste your Nucleotide sequence (FASTA or raw: A, C, G, T, U)';
    } else {
        protBtns.forEach((b) => {
            b.classList.add('active');
            b.classList.remove('text-muted');
        });
        dnaBtns.forEach((b) => {
            b.classList.remove('active');
            b.classList.add('text-muted');
        });

        const s1 = document.getElementById('seq1');
        const s2 = document.getElementById('seq2');
        if (s1) s1.placeholder = 'Paste your protein sequence (FASTA or raw: IUPAC amino acids)';
        if (s2) s2.placeholder = 'Paste your protein sequence (FASTA or raw: IUPAC amino acids)';
    }

    // Smart Sequence Transition: If user had loaded an example sequence,
    // swap to the corresponding example for the new sequence type.
    const s1El = document.getElementById('seq1');
    const s2El = document.getElementById('seq2');
    if (s1El && s2El) {
        const val1 = s1El.value || '';
        const isProtExample = val1.includes('HBA_HUMAN') || val1.includes('sp|P69905');
        const isDnaExample = val1.includes('Human_TP53_Exon4') || val1.includes('TP53');

        if (isDna && isProtExample) {
            loadExample(1);
            loadExample(2);
        } else if (!isDna && isDnaExample) {
            loadExample(1);
            loadExample(2);
        } else {
            // Re-validate existing inputs against the new type
            checkSequenceInput(1);
            checkSequenceInput(2);
        }
    }

    // Hide any previous alignment results when switching sequence type to prevent mismatch
    const rs = document.getElementById('resultsSection');
    if (rs) {
        rs.classList.add('hidden');
        rs.classList.remove('flex');
        rs.style.display = 'none';
    }
}

// These functions have been deprecated and removed, as parameter sync is handled by uiController
export function applyModeDefaults() {}
export function syncWordSizeUI() {}
export function syncCustomScoreUI() {}

export function clearSeq(seqNum) {
    const el = document.getElementById('seq' + seqNum);
    if (el) {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const ext = document.getElementById('seq' + seqNum + '-ext');
    if (ext) {
        ext.value = '';
        ext.classList.add('hidden');
    }
    setSequenceInputError(seqNum, null);
    const rs = document.getElementById('resultsSection');
    if (rs) {
        rs.classList.add('hidden');
        rs.classList.remove('flex');
    }
    switchTab(seqNum, 'manual');
    showToast(`Cleared Sequence ${seqNum}`, 'info');
}

export function loadExample(seqNum) {
    let ex;
    const isDna = getSeqType() === 'dna';
    if (isDna) {
        ex =
            seqNum === 1
                ? '>Human_TP53_Exon4_partial\nATGGACTATTCCTGAGTCTCCAGGTGAAATAGTGCCAACAATAAAAACTATCCCCCAGGCCCTCTCATCTAATCCTGTGAAAACCCAGGTCCAGGAGGCTTTCCAACTCCCACATCAGGCAACTCAAAACCTGGACCCTGCTTCTA'
                : '>Mouse_TP53_Exon4_partial\nATGGATTATTCCTGAGTCCCAAGGTGAAATAGTGCGAACAATGAAGACTATCCCCCAAGCCCTCTCACCTAATCCCGTGAAAACCCAGGTCCAGGAGGCTTTCCAACTCCCACACCAGGCAACTCAAAACATGGACTCTTCTTCTA';
    } else {
        ex =
            seqNum === 1
                ? '>sp|P69905|HBA_HUMAN Hemoglobin subunit alpha\nMVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR'
                : '>sp|P68871|HBB_HUMAN Hemoglobin subunit beta\nMVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH';
    }
    const el = document.getElementById('seq' + seqNum);
    if (el) {
        el.value = ex;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setSequenceInputError(seqNum, null);
    switchTab(seqNum, 'manual');
    const label = isDna
        ? seqNum === 1
            ? 'Human TP53 Exon4'
            : 'Mouse TP53 Exon4'
        : seqNum === 1
          ? 'HBA_HUMAN (Hemoglobin Alpha)'
          : 'HBB_HUMAN (Hemoglobin Beta)';
    showToast(`Loaded example: ${label}`, 'success');
}

export function switchTab(seqNum, tabName) {
    ['manual', 'ncbi', 'upload'].forEach((t) => {
        const btn = document.getElementById('tab-' + seqNum + '-' + t);
        if (btn) btn.className = 'tab-btn px-3 py-1 text-xs font-medium rounded-md transition-colors text-muted';
    });

    const activeBtn = document.getElementById('tab-' + seqNum + '-' + tabName);
    if (activeBtn)
        activeBtn.className =
            'tab-btn active px-3 py-1 text-xs font-medium rounded-md transition-colors bg-black text-white dark:bg-white dark:text-black shadow-sm';

    const manualContent = document.getElementById('content-' + seqNum + '-manual');
    const ncbiContent = document.getElementById('content-' + seqNum + '-ncbi');
    const uploadContent = document.getElementById('content-' + seqNum + '-upload');

    if (manualContent) {
        manualContent.classList.add('hidden');
        manualContent.classList.remove('block');
    }
    if (ncbiContent) {
        ncbiContent.classList.add('hidden');
        ncbiContent.classList.remove('block');
    }
    if (uploadContent) {
        uploadContent.classList.add('hidden');
        uploadContent.classList.remove('flex');
    }

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
        if (icon) {
            icon.classList.remove('fa-gear');
            icon.classList.add('fa-chevron-up');
        }
    } else {
        block.classList.add('hidden');
        if (icon) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-gear');
        }
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
    const cl =
        type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
            : type === 'error'
              ? 'bg-destructive/10 border-destructive/50 text-destructive'
              : 'bg-surface/90 border-border text-white';
    const ic = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-xmark' : 'fa-info-circle';
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
    let val = input.value.trim();
    if (val.length < 3) {
        showToast('Please enter a valid Accession or UniProt ID', 'error');
        return;
    }

    // Extract ID if user pasted FASTA header like sp|P69905|HBA_HUMAN
    if (val.includes('|')) {
        const parts = val.split('|');
        if (parts.length >= 2 && parts[1].trim()) val = parts[1].trim();
    }

    await executeFetch(seqNum, val);
}

async function executeFetch(seqNum, rawAccession) {
    const s = document.getElementById('ncbi-status-' + seqNum);
    const t = document.getElementById('seq' + seqNum + '-ext');
    const b = document.getElementById('btn-fetch-' + seqNum);
    if (s) {
        s.classList.remove('hidden');
        s.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-primary"></i> <span class="status-text text-primary text-xs">Fetching sequence...</span>`;
    }
    if (b) {
        b.disabled = true;
        b.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    }

    const isProtein = getSeqType() === 'protein';
    const cleanAcc = rawAccession.toUpperCase().trim();

    try {
        let fastaText = '';
        let sourceDb = 'NCBI';

        // Check if UniProt format (e.g. P69905, P68871, Q9BYF1)
        const isUniProt =
            /^[A-NR-Z][0-9][A-Z][A-Z0-9]{2}[0-9]$/i.test(cleanAcc) || /^[OPQ][0-9][A-Z0-9]{3}[0-9]$/i.test(cleanAcc);

        if (isProtein && isUniProt) {
            try {
                const uRes = await fetch(`https://rest.uniprot.org/uniprotkb/${encodeURIComponent(cleanAcc)}.fasta`);
                if (uRes.ok) {
                    const uData = await uRes.text();
                    if (uData.trim().startsWith('>')) {
                        fastaText = uData;
                        sourceDb = 'UniProt';
                    }
                }
            } catch {
                // fallback to NCBI below
            }
        }

        // If not UniProt or UniProt fetch didn't succeed, fetch from NCBI Entrez
        if (!fastaText) {
            const dbType = isProtein ? 'protein' : 'nuccore';
            const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=${dbType}&id=${encodeURIComponent(cleanAcc)}&rettype=fasta&retmode=text`;
            const r = await fetch(url);
            if (!r.ok) throw new Error(`NCBI HTTP Error ${r.status}`);
            const d = await r.text();
            if (!d.toLowerCase().includes('error') && d.trim().startsWith('>')) {
                fastaText = d;
                sourceDb = 'NCBI';
            } else if (isProtein && !isUniProt) {
                // Secondary fallback: attempt UniProt if NCBI returned an error for protein
                try {
                    const uRes = await fetch(
                        `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(cleanAcc)}.fasta`
                    );
                    if (uRes.ok) {
                        const uData = await uRes.text();
                        if (uData.trim().startsWith('>')) {
                            fastaText = uData;
                            sourceDb = 'UniProt';
                        }
                    }
                } catch {}
            }
        }

        if (!fastaText || !fastaText.trim().startsWith('>')) {
            throw new Error(`Accession "${cleanAcc}" not found in NCBI / UniProt databases.`);
        }

        let seq = '',
            desc = '';
        for (const l of fastaText.split(/\r?\n/)) {
            const trimmed = l.trim();
            if (trimmed.startsWith('>')) {
                if (!desc) desc = trimmed.substring(1);
                continue;
            }
            seq += trimmed;
        }

        seq = seq.replace(/[^A-Za-z]/g, '').toUpperCase();
        if (!seq) throw new Error('Fetched sequence contained no valid residue data.');

        if (t) {
            t.value = seq;
            t.classList.remove('hidden');
            t.setAttribute('data-desc', desc);
        }
        if (s)
            s.innerHTML = `<i class="fa-solid fa-check text-emerald-400"></i> <span class="text-emerald-400 text-xs font-semibold">Ready (${sourceDb}: ${seq.length} residues)</span>`;
        showToast(`Loaded [${sourceDb}] ${desc.slice(0, 50)}...`, 'success');
    } catch (e) {
        if (s)
            s.innerHTML = `<i class="fa-solid fa-circle-xmark text-destructive"></i> <span class="text-destructive text-xs font-semibold">${e.message}</span>`;
        if (t) {
            t.classList.add('hidden');
            t.value = '';
            t.removeAttribute('data-desc');
        }
        showToast(e.message, 'error');
    } finally {
        if (b) {
            b.disabled = false;
            b.innerText = 'Fetch';
        }
    }
}

// handleMatrixChange deprecated and fully managed by state.js
export function handleMatrixChange() {}
