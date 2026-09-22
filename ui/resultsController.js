/**
 * @file ui/resultsController.js
 * @description Pushes computed alignment strings, metric calculations, and generated HTML elements to the DOM output containers.
 * @pipelineLocation Frontend output phase. The absolute final stage of the application workflow.
 * @changeImpact Altering DOM innerHTML or textContent bindings here will break the display layers, preventing users from seeing their results.
 */

// Static imports
import * as viewerModule from '../visualization/alignmentViewer.js';
import * as conservationModule from '../visualization/conservationRenderer.js';
import * as heatmapModule from '../visualization/heatmapRenderer.js';

export function updateResultUI(res) {
    const resultsPanel = document.getElementById('resultsSection');
    if (resultsPanel) {
        resultsPanel.classList.remove('hidden');
        resultsPanel.classList.add('flex');
        resultsPanel.style.display = '';
    }

    const el = (id) => document.getElementById(id);

    // Safe accessors — prefer new contract fields, fall back to legacy bridge
    const score = res.alignment_score ?? res.stats?.rawScore ?? 0;
    const identityPct = res.identity_percent ?? res.stats?.identity ?? 0;
    const alignLen = res.alignment_length ?? res.stats?.alignmentLength ?? 0;
    const gaps = res.gaps ?? res.stats?.gaps ?? 0;
    const matches = res.additional_metrics?.matches ?? res.stats?.positives ?? '--';
    const simPct = res.similarity_percent ?? null;
    const matrixName = res.additional_metrics?.matrixName ?? res.metadata?.matrix ?? '—';
    const algoLabel = res.algorithm ?? res.metadata?.algorithm ?? '—';

    if (el('resScore')) el('resScore').innerText = parseFloat(score.toFixed(1));
    if (el('resIdentity')) el('resIdentity').innerText = `${identityPct}%`;
    if (el('resLength')) el('resLength').innerText = alignLen;
    if (el('resMatches')) el('resMatches').innerText = matches;
    if (el('resGaps')) el('resGaps').innerText = gaps;

    const pDiv = el('positives-display');
    const pSep = el('positives-divider');
    if (simPct !== null && simPct !== undefined) {
        if (el('resPositives')) el('resPositives').innerText = `${simPct}%`;
        if (pDiv) pDiv.classList.remove('hidden');
        if (pSep) pSep.classList.remove('hidden');
    } else {
        if (pDiv) pDiv.classList.add('hidden');
        if (pSep) pSep.classList.add('hidden');
    }

    const bsdDiv = document.getElementById('bit-score-display');
    const bsdSep = document.getElementById('bit-score-divider');
    const evDiv = document.getElementById('e-value-display');
    const evSep = document.getElementById('e-value-divider');
    const statsAfterSep = document.getElementById('stats-after-divider');

    const statsAvail = res.additional_metrics?.statsAvailable ?? res.stats?.statsAvailable ?? false;
    const bitScore = res.additional_metrics?.bit_score ?? res.stats?.bitScore;
    const eValue = res.additional_metrics?.e_value ?? res.stats?.eValue;

    if (statsAvail && bitScore !== null && bitScore !== undefined) {
        if (el('resBitScore')) el('resBitScore').innerText = Number(bitScore).toFixed(1);
        if (el('resEValue')) {
            const ev = Number(eValue);
            el('resEValue').innerText = ev < 1e-99 ? '0.0' : ev < 0.001 ? ev.toExponential(2) : ev.toFixed(4);
        }
        [bsdDiv, bsdSep, evDiv, evSep, statsAfterSep].forEach((el) => {
            if (el) el.style.display = '';
        });
    } else {
        [bsdDiv, bsdSep, evDiv, evSep, statsAfterSep].forEach((el) => {
            if (el) el.style.display = 'none';
        });
    }

    const gapModel = res.metadata?.gapModel || res.additional_metrics?.gapMath || 'affine';
    const gapOp = res.metadata?.gapOpen ?? res.additional_metrics?.gapOpen ?? 10;
    const gapEx = res.metadata?.gapExtend ?? res.additional_metrics?.gapExtend ?? 0.5;

    if (el('resGapModel')) {
        el('resGapModel').innerText = gapModel === 'linear' ? `Linear (${gapOp})` : `Affine (${gapOp} / ${gapEx})`;
    }

    const algoType = res.additional_metrics?.algoType || 'global';
    const algoNames = {
        global: 'Global Alignment (Needleman-Wunsch · EMBOSS needle)',
        local: 'Local Alignment (Smith-Waterman · EMBOSS water)',
        blast: 'BLAST-like Search (Heuristic · NCBI BLAST)'
    };
    const prettyAlgo = algoNames[algoType] || algoLabel;

    const gapDesc =
        gapModel === 'linear' ? `Linear Gap (Penalty: ${gapOp})` : `Affine Gap (Open: ${gapOp}, Extend: ${gapEx})`;

    const successMsg = el('successMessage');
    if (successMsg) {
        successMsg.innerHTML =
            `<i class="fa-solid fa-check-circle"></i> ` +
            `<b>${prettyAlgo}</b> · Matrix: <b>${matrixName}</b> · <b>${gapDesc}</b> · ` +
            `Score: <b>${parseFloat(score.toFixed(1))}</b> · Identity: <b>${identityPct}%</b>`;
    }

    // PHASE 2: Visualization Layer
    try {
        viewerModule.renderSequenceMap(res);
        conservationModule.renderGraphicSummary('graphicSummaryContainer', res);

        el('chartContainer')?.classList.remove('hidden');

        if (res.dp?.H) {
            heatmapModule.renderDPTable(res);
        } else {
            const dpCon = el('dpTableContainer');
            if (dpCon)
                dpCon.innerHTML = `<div class="p-6 text-center text-muted font-sans text-sm">
            <i class="fa-solid fa-table text-2xl mb-2 block"></i>
            Sequences too large for table view (${res.dp?.n ?? '?'}×${res.dp?.m ?? '?'}).<br>
            Switch to <b>Heatmap</b> for native Canvas representation.
            </div>`;
        }
        heatmapModule.renderHeatmap(res);
    } catch (err) {
        console.error('Failed to load visualization:', err);
    }

    resultsPanel.scrollIntoView({ behavior: 'smooth' });
}
