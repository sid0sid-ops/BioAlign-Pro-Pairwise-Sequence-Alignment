/**
 * @file js/main.js
 * @description The primary Single Page Application (SPA) entry point. Bootstraps controllers, binds DOM events, and manages application state.
 * @pipelineLocation Top-level controller. Directly interfaces with the user's browser interactions.
 * @changeImpact Altering event listeners or initialization logic here will sever the connection between the UI buttons and the underlying alignment engine.
 */

/**
 * ================================================================
 * @file main.js
 * @location Root Controller Layer
 * @pipeline UI Controller → Alignment Engine Dispatcher
 *
 * @description
 * Main entry point of BioAlign-Pro. This module initializes the
 * application after DOM load and connects the user interface to
 * the computational pipeline.
 *
 * Responsibilities:
 * - bind UI buttons and events
 * - collect user parameters
 * - trigger alignment execution
 * - route results to UI renderers
 * - expose export functions globally
 *
 * @pipeline_flow
 * index.html
 *     ↓
 * main.js
 *     ↓
 * alignmentEngine.js
 *     ↓
 * algorithms
 *
 * @inputs
 * user sequences
 * algorithm type
 * gap penalties
 * scoring matrices
 *
 * @outputs
 * structured alignment results passed to resultsController.js
 *
 * @modification_impact
 * Changing logic here affects:
 * - event handling
 * - parameter collection
 * - execution triggers
 *
 * Alignment mathematics remains unaffected.
 *
 * ================================================================
 */
import {
    startAlignmentMode,
    returnToLanding,
    setSequenceType,
    toggleAdvancedOptions,
    toggleTheme,
    clearSeq,
    loadExample,
    switchTab,
    handleFileDrop,
    handleFileUpload,
    fetchNCBI,
    syncWordSizeUI,
    syncCustomScoreUI,
    applyModeDefaults,
    getRawSequence,
    getActiveTab,
    validateSequence,
    showToast,
    seqType,
    currentAlgo
} from '../ui/inputController.js?v=27';

import { updateResultUI } from '../ui/resultsController.js?v=27';
import { runAlignment } from '../core/alignmentEngine.js?v=27';
import { setupMatrixUI } from '../visualization/heatmapRenderer.js?v=27';
import { downloadAlignmentTXT, downloadAlignmentCSV, downloadAlignmentJSON } from '../export/embossFormatter.js?v=27';
import { downloadAlignmentFASTA } from '../export/fastaExport.js?v=27';

document.addEventListener('DOMContentLoaded', () => {
    // Expose necessary functions to window for index.html inline onclick handlers
    window.startAlignmentMode = startAlignmentMode;
    window.returnToLanding = returnToLanding;
    window.setSequenceType = setSequenceType;
    window.toggleAdvancedOptions = toggleAdvancedOptions;
    window.toggleTheme = toggleTheme;
    window.clearSeq = clearSeq;
    window.loadExample = loadExample;
    window.switchTab = switchTab;
    window.handleFileDrop = handleFileDrop;
    window.handleFileUpload = handleFileUpload;
    window.fetchNCBI = fetchNCBI;
    window.syncWordSizeUI = syncWordSizeUI;
    window.syncCustomScoreUI = syncCustomScoreUI;
    window.applyModeDefaults = applyModeDefaults;

    window._downloadAlignmentTXT = () => { if (window.lastAlignmentResult) downloadAlignmentTXT(window.lastAlignmentResult); };
    window._downloadAlignmentCSV = () => { if (window.lastAlignmentResult) downloadAlignmentCSV(window.lastAlignmentResult); };
    window._downloadAlignmentJSON = () => { if (window.lastAlignmentResult) downloadAlignmentJSON(window.lastAlignmentResult); };
    window._downloadAlignmentFASTA = () => { if (window.lastAlignmentResult) downloadAlignmentFASTA(window.lastAlignmentResult); };
    window.runBenchmarkSuite = async () => {
        const { runBenchmarkSuite } = await import('../ui/validate.js?v=28');
        runBenchmarkSuite();
    };
    window._downloadPlot = () => {
        const canvas = document.getElementById('pureCanvasHeatmap');
        if (canvas) {
            try {
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8);
                a.download = `bioalign_heatmap_${timestamp}.png`;
                a.click();
                showToast('Heatmap snapshot downloaded successfully.', 'success');
            } catch (err) {
                console.error("Canvas export failed:", err);
                showToast('Failed to export Heatmap. Cross-origin taint?', 'error');
            }
        } else {
            showToast('No heatmap available to export. Ensure alignment has completed.', 'error');
        }
    };

    // Setup listeners that might not be inline
    setupMatrixUI();
    setSequenceType('protein'); // default

    // PHASE 3: SPA Hash Router
    function handleRoute() {
        const hash = window.location.hash || '#/pairwise-sequence-alignment';
        const route = hash.replace('#/', '');

        if (route === 'pairwise-sequence-alignment' || route === 'home' || !route) {
            returnToLanding();
        } else if (route === 'global-alignment') {
            startAlignmentMode('global');
        } else if (route === 'local-alignment') {
            startAlignmentMode('local');
        } else if (route === 'blast-like-search' || route === 'blast-search') {
            startAlignmentMode('blast');
        }
    }
    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // Process route natively on load

    const _alignmentCache = new Map();
    const MAX_SEQ_LENGTH = 50000;

    const runBtn = document.getElementById('runAlignmentBtn');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const t1 = getActiveTab(1);
            const t2 = getActiveTab(2);

            // Auto-fetch if user forgot to click fetch
            if (t1 === 'ncbi' && !(document.getElementById('seq1-ext')?.value)) {
                const sv = document.getElementById('ncbi-search-1')?.value?.trim();
                if (sv && sv.length >= 4) await window.fetchNCBI(1);
            }
            if (t2 === 'ncbi' && !(document.getElementById('seq2-ext')?.value)) {
                const sv = document.getElementById('ncbi-search-2')?.value?.trim();
                if (sv && sv.length >= 4) await window.fetchNCBI(2);
            }

            const s1 = getRawSequence(1);
            const s2 = getRawSequence(2);
            if (!validateSequence(s1, 1) || !validateSequence(s2, 2)) return;

            let n1 = 'Sequence 1';
            let n2 = 'Sequence 2';

            if (t1 === 'ncbi') n1 = document.getElementById('ncbi-search-1')?.value?.toUpperCase() || n1;
            else {
                const r1 = document.getElementById('seq1')?.value || '';
                if (r1.trim().startsWith('>')) n1 = r1.trim().split('\n')[0].substring(1).split(' ')[0];
            }

            if (t2 === 'ncbi') n2 = document.getElementById('ncbi-search-2')?.value?.toUpperCase() || n2;
            else {
                const r2 = document.getElementById('seq2')?.value || '';
                if (r2.trim().startsWith('>')) n2 = r2.trim().split('\n')[0].substring(1).split(' ')[0];
            }

            window.currentS1Name = n1;
            window.currentS2Name = n2;

            const title1 = document.getElementById('seq1Title');
            const title2 = document.getElementById('seq2Title');
            if (title1) title1.innerText = n1;
            if (title2) title2.innerText = n2;

            const gapMath = document.getElementById('paramGapMath')?.value || 'affine';
            const gapOp = parseFloat(document.getElementById('paramGapOpen')?.value || 10);
            const gapEx = parseFloat(document.getElementById('paramGapExtend')?.value || 0.5);
            const matrixName = document.getElementById('paramMatrix')?.value || 'BLOSUM62';
            const dbSize = parseInt(document.getElementById('paramDbSize')?.value, 10) || null;
            const expectThresh = parseFloat(document.getElementById('paramExpectThreshold')?.value || 0.05);

            let customMatch, customMismatch;
            if (gapMath === 'linear' && seqType === 'dna') {
                customMatch = parseFloat(document.getElementById('paramMatchScore')?.value || 2);
                customMismatch = parseFloat(document.getElementById('paramMismatchScore')?.value || -3);
            }

            if (s1.length > MAX_SEQ_LENGTH || s2.length > MAX_SEQ_LENGTH) {
                showToast(`Sequence too long (max ${MAX_SEQ_LENGTH} residues)`, "error");
                return;
            }

            const cacheKey = `${s1}|${s2}|${matrixName}|${gapOp}|${gapEx}|${currentAlgo}|${gapMath}|${seqType}|${expectThresh}`;

            if (_alignmentCache.has(cacheKey)) {
                window.lastAlignmentResult = _alignmentCache.get(cacheKey);
                updateResultUI(window.lastAlignmentResult);
                showToast("Result from cache (instant)", "success");
                return;
            }

            const loader = document.getElementById('loadingOverlay');
            if (loader) loader.classList.remove('hidden');

            const btn = document.getElementById('runAlignmentBtn');
            const ogHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...`;

            try {
                // Call robust engine returning standardized JSON
                const result = await runAlignment(s1, s2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, currentAlgo, dbSize, expectThresh);

                window.lastAlignmentResult = result;
                _alignmentCache.set(cacheKey, result);

                // Route structured JSON to generic UI consumer
                updateResultUI(result);

                showToast("Alignment complete", "success");
            } catch (err) {
                console.error(err);
                if (err.message && err.message.includes("No significant similarity")) {
                    showToast(err.message, "warning"); // NCBI style yellow warning for E-value cutoff
                } else {
                    showToast("Alignment failed: " + err.message, "error");
                }
                const rs = document.getElementById('resultsSection');
                if (rs) {
                    rs.classList.add('hidden');
                    rs.classList.remove('flex');
                }
            } finally {
                if (loader) loader.classList.add('hidden');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = ogHTML;
                }
            }
        });
    }
});

/**
 * Phase 0: Sample Sequence Injection
 */
document.addEventListener('DOMContentLoaded', () => {
    const btnProtein = document.getElementById('loadProteinSampleBtn');
    if (btnProtein) {
        btnProtein.addEventListener('click', () => {
            document.getElementById('seqType').value = 'protein';
            document.getElementById('seq1').value = ">Hemoglobin_Alpha_Human\nMVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR";
            document.getElementById('seq2').value = ">Hemoglobin_Beta_Human\nVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH";
        });
    }

    const btnDna = document.getElementById('loadDnaSampleBtn');
    if (btnDna) {
        btnDna.addEventListener('click', () => {
            document.getElementById('seqType').value = 'dna';
            document.getElementById('seq1').value = ">Ecoli_16S_rRNA_Fragment\nTGCCTAACACATGCAAGTCGAACGGTAACAGGAAGCAGCTTGCTGCTTTGCTGACGAGTGGCGGACGGGTGAGTAATGTCTGGGAAACTGCCTGATGGAGGGGGATAACTACTGGAAACGGTAGCTAATACCGCATAACGTCGCAAGACCAAAGAGGGGGACCTTCGGGCCTCTTGCCATCGGATGTGCCCAGATGGGATTAGCTAGTAGGTGGGGTAACGGCTCACCTAGGCGACGATCCCTAGCTGGTCTGAGAGGATGACCAGCCACACTGGAACTGAG";
            document.getElementById('seq2').value = ">Salmonella_16S_rRNA_Fragment\nTGCCTAACACATGCAAGTCGAACGGTAACAGGAAGCAGCTTGCTGCTTCGCTGACGAGTGGCGGACGGGTGAGTAATGTCTGGGAAACTGCCTGATGGAGGGGGATAACTACTGGAAACGGTAGCTAATACCGCATAACGTCGCAAGACCAAAGAGGGGGACCTTCGGGCCTCTTGCCATCGGATGTGCCCAGATGGGATTAGCTTGTTGGTGAGGTAACGGCTCACCAAGGCGACGATCCCTAGCTGGTCTGAGAGGATGACCAGCCACACTGGAACTGAG";
        });
    }
});

