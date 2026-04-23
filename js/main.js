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
    getRawSequence,
    getActiveTab,
    validateSequence,
    showToast,
    getCurrentAlgo,
    getSeqType
} from '../ui/inputController.js';

import { initUIController } from '../ui/uiController.js';
import { getState } from '../ui/state.js';

import { updateResultUI } from '../ui/resultsController.js';
import { setupMatrixUI } from '../visualization/heatmapRenderer.js';
import { downloadAlignmentTXT, downloadAlignmentCSV, downloadAlignmentJSON } from '../export/embossFormatter.js';
import { downloadAlignmentFASTA } from '../export/fastaExport.js';

document.addEventListener('DOMContentLoaded', () => {
    // uiController.js owns all event wiring — no window.* shims needed for UI interactions.
    // Only export download helpers that are triggered from result-panel buttons in HTML.
    initUIController();

    window._downloadAlignmentTXT = () => { if (window.lastAlignmentResult) downloadAlignmentTXT(window.lastAlignmentResult); };
    window._downloadAlignmentCSV = () => { if (window.lastAlignmentResult) downloadAlignmentCSV(window.lastAlignmentResult); };
    window._downloadAlignmentJSON = () => { if (window.lastAlignmentResult) downloadAlignmentJSON(window.lastAlignmentResult); };
    window._downloadAlignmentFASTA = () => { if (window.lastAlignmentResult) downloadAlignmentFASTA(window.lastAlignmentResult); };
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

    // setupMatrixUI() is now handled by the state-driven render() in uiController.js. -> Actually it was missing!
    setupMatrixUI();

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
                if (sv && sv.length >= 4) await fetchNCBI(1);
            }
            if (t2 === 'ncbi' && !(document.getElementById('seq2-ext')?.value)) {
                const sv = document.getElementById('ncbi-search-2')?.value?.trim();
                if (sv && sv.length >= 4) await fetchNCBI(2);
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

            const appState = getState();
            const gapMath = appState.gapMode;
            const gapOp = appState.parameters.gapOpen;
            const gapEx = appState.parameters.gapExtend;
            const matrixName = appState.parameters.matrix;
            const dbSize = appState.parameters.dbSize;
            const expectThresh = appState.parameters.expectThreshold;

            let customMatch, customMismatch;
            if (appState.sequenceType === 'dna' && appState.scoringMode === 'CUSTOM') {
                customMatch = appState.parameters.matchScore;
                customMismatch = appState.parameters.mismatchPenalty;
            }

            if (s1.length > MAX_SEQ_LENGTH || s2.length > MAX_SEQ_LENGTH) {
                showToast(`Sequence too long (max ${MAX_SEQ_LENGTH} residues)`, "error");
                return;
            }

            // Resolve algorithm type via getter, fall back to URL hash if undefined.
            // Ensures the cache key and the engine always receive the correct algo string.
            let resolvedAlgo = getCurrentAlgo();
            if (!resolvedAlgo) {
                const h = window.location.hash;
                if (h.includes('global')) resolvedAlgo = 'global';
                else if (h.includes('local')) resolvedAlgo = 'local';
                else if (h.includes('blast')) resolvedAlgo = 'blast';
                else resolvedAlgo = 'global'; // safe fallback
                console.warn(`[BioAlign] currentAlgo was falsy — resolved from hash: "${resolvedAlgo}"`);
            }

            const cacheKey = `${s1}|${s2}|${matrixName}|${gapOp}|${gapEx}|${resolvedAlgo}|${gapMath}|${getSeqType()}|${expectThresh}`;

            if (_alignmentCache.has(cacheKey)) {
                window.lastAlignmentResult = _alignmentCache.get(cacheKey);
                document.getElementById('recomputeMsg')?.classList.add('hidden');
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
                // Offload Dynamic Programming to Web Worker to prevent UI Freeze
                const worker = new Worker(new URL('../core/alignmentWorker.js', import.meta.url), { type: 'module' });
                const jobId = Date.now();

                const result = await new Promise((resolve, reject) => {
                    worker.onmessage = (e) => {
                        if (e.data.id !== jobId) return;

                        if (e.data.type === 'progress') {
                            const loaderObj = document.getElementById('loadingOverlay');
                            if (loaderObj) {
                                // Currently loader holds a spinner, updating text could be placed here
                                // console.log(`Progress: ${e.data.stage}... ${e.data.percent}%`);
                            }
                            return;
                        }

                        if (e.data.success) {
                            resolve(e.data.result);
                        } else {
                            reject(new Error(e.data.error || 'Worker error'));
                        }
                        worker.terminate();
                    };

                    worker.onerror = (err) => {
                        reject(err);
                        worker.terminate();
                    };

                    worker.postMessage({
                        id: jobId,
                        seq1: s1, seq2: s2, seqType: getSeqType(),
                        gapMath, gapOp, gapEx, matrixName,
                        customMatch, customMismatch,
                        algoType: resolvedAlgo,
                        databaseSize: dbSize, expectThresh
                    });
                });

                window.lastAlignmentResult = result;
                _alignmentCache.set(cacheKey, result);

                // Route structured JSON to generic UI consumer
                document.getElementById('recomputeMsg')?.classList.add('hidden');
                updateResultUI(result);

                showToast(`${resolvedAlgo.toUpperCase()} alignment complete`, "success");
            } catch (err) {
                console.error(err);

                // 🔥 Only show error if alignment never succeeded
                if (!window.lastAlignmentResult) {
                    const errorTxt = (err.message && err.message.trim() !== '')
                        ? err.message
                        : (err.toString() !== '[object Object]'
                            ? err.toString()
                            : 'Unknown computation error.');

                    showToast("Alignment failed: " + errorTxt, "error");

                    const rs = document.getElementById('resultsSection');
                    if (rs) {
                        rs.classList.add('hidden');
                        rs.classList.remove('flex');
                    }
                } else {
                    console.warn("UI error after successful alignment");
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