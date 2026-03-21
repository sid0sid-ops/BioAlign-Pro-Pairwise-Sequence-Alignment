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
    window._downloadPlot = async () => {
        const el = document.getElementById('plotlyMatrix');
        if (el && window.Plotly && el.data) {
            try {
                const url = await Plotly.toImage(el, { format: 'png', height: 1200, width: 1600 });
                const response = await fetch('http://localhost:3001/export-heatmap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: url })
                });
                if (response.ok) {
                    showToast('High-Res Heatmap saved to export/ folder via Server! (Research Grade)', 'success');
                } else {
                    throw new Error('Server unavailable');
                }
            } catch (err) {
                console.warn('[Export] Local server export failed, falling back to browser download.', err);
                Plotly.downloadImage(el, { format: 'png', height: 800, width: 1200, filename: 'alignment_heatmap' });
                showToast('Heatmap downloaded via browser (Server may be offline)', 'success');
            }
        } else {
            showToast('No heatmap available to export.', 'error');
        }
    };

    // Setup listeners that might not be inline
    setupMatrixUI();

    setSequenceType('protein'); // default

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

