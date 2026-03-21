/**
 * @file visualization/heatmapRenderer.js
 * @description Heavy visualization renderer dealing with complex DP Matrix tables and 2D Plot.js Heatmaps.
 * @pipeline Receives the multi-dimensional H-score and Traceback-matrix arrays and converts them into HTML grids highlighting the pathway with scientific arrows.
 */
export function setupMatrixUI() {
    const btnTable = document.getElementById('chart-tab-table');
    const btnHeatmap = document.getElementById('chart-tab-heatmap');
    const contentTable = document.getElementById('chart-content-table');
    const contentHeatmap = document.getElementById('chart-content-heatmap');

    if (btnTable && btnHeatmap) {
        btnTable.addEventListener('click', () => {
            btnTable.className = "px-3 py-1 text-xs font-medium rounded-md transition-colors bg-black text-white dark:bg-white dark:text-black shadow-sm";
            btnHeatmap.className = "px-3 py-1 text-xs font-medium rounded-md transition-colors text-muted hover:text-black dark:hover:text-white";
            contentTable.classList.remove('hidden');
            contentTable.classList.add('block');
            contentHeatmap.classList.remove('flex', 'flex-col');
            contentHeatmap.classList.add('hidden');
        });

        btnHeatmap.addEventListener('click', () => {
            btnHeatmap.className = "px-3 py-1 text-xs font-medium rounded-md transition-colors bg-black text-white dark:bg-white dark:text-black shadow-sm";
            btnTable.className = "px-3 py-1 text-xs font-medium rounded-md transition-colors text-muted hover:text-black dark:hover:text-white";
            contentHeatmap.classList.remove('hidden');
            contentHeatmap.classList.add('flex', 'flex-col');
            contentTable.classList.remove('block');
            contentTable.classList.add('hidden');
            window.dispatchEvent(new Event('resize'));
        });
    }
}

let forceRenderTable = false;

export function renderDPTable(result) {
    const dp = result.dp || (result.additional_metrics ? result.additional_metrics : null);
    if (!dp || !dp.H) return;

    const { H, TB, n, m } = dp;
    const isLocal = result.metadata ? (result.metadata.algorithm.includes('Local') || result.metadata.algorithm.includes('BLAST')) : (result.algorithm && result.algorithm.includes('Local'));
    const tracePath = result.tracePath || [];
    const traceSet = new Set(tracePath.map(p => `${p[0]},${p[1]}`));

    // FIXED: Use raw original sequences for headers — never gap-stripped aligned sequences.
    // Gap-stripped aligned seqs can be shorter than n/m causing undefined on the last columns.
    const metrics = result.additional_metrics || {};
    const seq1 = metrics.rawSeq1 || (metrics.alignedSeq1 ? metrics.alignedSeq1.replace(/-/g, '') : '');
    const seq2 = metrics.rawSeq2 || (metrics.alignedSeq2 ? metrics.alignedSeq2.replace(/-/g, '') : '');

    const container = document.getElementById('dpTableContainer');
    if (!container) return;

    if (n * m > 40000 && !forceRenderTable) {
        container.innerHTML = `<div class="p-6 flex flex-col items-center justify-center text-center text-red-500 font-sans">
            <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
            <p>Sequences too large (${n}×${m}) to render as HTML table safely.<br>Use the High-Performance Heatmap view.</p>
            <button id="forceRenderBtn" class="mt-4 px-4 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition">Render Table Anyway (May lag browser)</button>
            </div>`;

        document.getElementById('forceRenderBtn')?.addEventListener('click', () => {
            forceRenderTable = true;
            renderDPTable(result);
        });
        return;
    }

    // Reset force toggle for next runs
    forceRenderTable = false;

    const W = m + 1;
    let maxScore = -Infinity;
    let minScore = Infinity;
    for (let i = 0; i < H.length; i++) {
        if (H[i] > maxScore) maxScore = H[i];
        if (H[i] < minScore) minScore = H[i];
    }
    const scoreRange = maxScore > 0 ? maxScore : 1; // avoid div by zero

    let html = `
    <table style="border-collapse:collapse;font-family:'Courier New',monospace;font-size:11px;width:max-content;">
        <thead>
            <tr>
                <th style="${thStyle()}"></th>
                <th style="${thStyle()}"><span class="text-muted">−</span></th>
                ${Array.from({ length: m }, (_, j) =>
        `<th style="${thStyle()}"><span class="text-black dark:text-gray-200" style="font-size:12px;">${seq2[j]}</span><sub class="text-muted" style="font-size:9px;">${j + 1}</sub></th>`
    ).join('')}
            </tr>
        </thead>
        <tbody>`;

    for (let i = 0; i <= n; i++) {
        const rowLabel = i === 0 ? '<span class="text-muted">−</span>'
            : `<span class="text-black dark:text-gray-200" style="font-size:12px;">${seq1[i - 1]}</span><sub class="text-muted" style="font-size:9px;">${i}</sub>`;

        html += `<tr>
            <th style="${thStyle()}">${rowLabel}</th>`;

        for (let j = 0; j <= m; j++) {
            const idx = i * W + j;
            const val = H[idx];
            const tb = TB[idx];
            const onPath = traceSet.has(`${i},${j}`);

            const displayVal = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));

            // Score based color intensity
            let intensity = Math.min(1, Math.max(0, val / scoreRange));
            let cellBg = 'background:var(--surface);';
            let cellBorder = ''; // Border is now handled definitively by .dp-cell CSS with !important
            let cellClass = 'dp-cell';

            if (onPath) {
                cellClass += ' dp-highlight';
                cellBg = ''; // Handled by CSS
                cellBorder = ''; // Handled by CSS
            } else {
                if (val > 0) cellBg = `background:rgba(16, 185, 129, ${intensity * 0.4});`; // Greenish
                else if (val < 0) cellBg = `background:rgba(239, 68, 68, ${Math.min(1, Math.abs(val / minScore)) * 0.4});`; // Reddish
            }

            let scoreColor = 'var(--foreground)';
            if (val > 0) scoreColor = '#059669';
            if (val < 0) scoreColor = '#dc2626';
            if (val === 0 && i > 0 && j > 0) scoreColor = 'var(--muted)';

            let arrows = '';
            // New 0-3 Code Spec: 0=STOP, 1=DIAGONAL, 2=UP, 3=LEFT
            const tbH = tb & 3;
            if (i === 0 && j === 0) {
                arrows = '';
            } else if (tbH === 0) {
                arrows = ''; // Stop
            } else {
                if (tbH === 1) arrows = `<span style="color:#0d9488;font-size:13px;" title="Diagonal (match/mismatch)">&#8598;</span>`;
                else if (tbH === 2) arrows = `<span style="color:#2563eb;font-size:13px;" title="Up (gap in Seq2)">&#8593;</span>`;
                else if (tbH === 3) arrows = `<span style="color:#d97706;font-size:13px;" title="Left (gap in Seq1)">&#8592;</span>`;
            }

            html += `<td class="${cellClass}" style="${cellBorder}${cellBg}">
                <span style="display:block;font-weight:700;color:${scoreColor};font-size:11px;line-height:1.2;">${displayVal}</span>
                <span style="display:block;line-height:1;min-height:14px;">${arrows || '&nbsp;'}</span>
            </td>`;
        }
        html += '</tr>';
    }

    html += `</tbody></table>

    <!-- Legend -->
    <div class="flex flex-wrap gap-3 pt-3 text-[11px] font-sans items-center">
        <span class="font-semibold text-gray-700 dark:text-gray-300">Arrows:</span>
        <span class="text-black dark:text-gray-300"><span style="color:#0d9488;font-size:14px;">&#8598;</span> Diagonal — match / mismatch</span>
        <span class="text-black dark:text-gray-300"><span style="color:#2563eb;font-size:14px;">&#8593;</span> Up — gap in Seq&nbsp;2</span>
        <span class="text-black dark:text-gray-300"><span style="color:#d97706;font-size:14px;">&#8592;</span> Left — gap in Seq&nbsp;1</span>
        <span class="ml-2 font-semibold text-gray-700 dark:text-gray-300">Path:</span>
        <span style="display:inline-block;width:14px;height:14px;background:#ffcc00;border:1.5px solid #ff8800;border-radius:2px;vertical-align:middle;"></span>
        <span class="text-black dark:text-gray-300 align-middle">Optimal alignment path</span>
        <span class="ml-2 font-semibold text-gray-700 dark:text-gray-300">Scores:</span>
        <span class="text-black dark:text-gray-300"><span style="color:#059669;">&#9679;</span>&nbsp;Positive</span>
        <span class="text-black dark:text-gray-300"><span style="color:#dc2626;">&#9679;</span>&nbsp;Negative</span>
        <span class="text-black dark:text-gray-300"><span style="color:var(--muted);">&#9679;</span>&nbsp;Zero</span>
    </div>`;

    container.innerHTML = html;
}

function thStyle() {
    return `border:1px solid #94a3b8;background:var(--surface,#f9fafb);
            padding:4px 6px;text-align:center;font-weight:700;min-width:46px;
            position:sticky;top:0;z-index:2;font-family:'Courier New',monospace;font-size:11px;`;
}

export function renderHeatmap(result) {
    const dp = result.dp || (result.additional_metrics ? result.additional_metrics : null);
    if (!dp || !dp.H) return;

    const { H, n, m } = dp;
    const metrics = result.additional_metrics || {};
    // Use raw original sequences for axis labels
    const seq1 = metrics.rawSeq1 || (result.alignedSeq1 ? result.alignedSeq1.replace(/-/g, '') : '');
    const seq2 = metrics.rawSeq2 || (result.alignedSeq2 ? result.alignedSeq2.replace(/-/g, '') : '');

    const container = document.getElementById('plotlyMatrix');
    if (!container) return;

    if (n * m > 2_000_000) {
        container.innerHTML = `<div class="flex items-center justify-center p-4 text-center text-muted font-sans h-full">
            <p>Heatmap skipped — matrix size ${n}×${m} exceeds browser render limit.</p></div>`;
        return;
    }

    const zData = [];
    for (let i = 0; i <= n; i++) {
        const row = [];
        for (let j = 0; j <= m; j++) row.push(H[i * (m + 1) + j]);
        zData.push(row);
    }

    const yLabels = ['-', ...Array.from({ length: n }, (_, i) => `${seq1[i]}(${i + 1})`)];
    const xLabels = ['-', ...Array.from({ length: m }, (_, j) => `${seq2[j]}(${j + 1})`)];

    const data = [{
        z: zData, x: xLabels, y: yLabels,
        type: 'heatmap',
        colorscale: 'RdYlGn',
        reversescale: false,
        hoverongaps: false,
        hovertemplate: 'Seq2: %{x}<br>Seq1: %{y}<br>Score: %{z}<extra></extra>'
    }];

    const isDark = document.documentElement.classList.contains('dark');
    const layout = {
        title: { text: 'DP Score Heatmap', font: { color: isDark ? '#fff' : '#000', size: 13 } },
        margin: { t: 45, r: 20, l: 60, b: 60 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: isDark ? '#fff' : '#000' },
        xaxis: { title: 'Sequence 2', side: 'bottom', tickangle: -45, titlefont: { size: 11 } },
        yaxis: { title: 'Sequence 1', autorange: 'reversed', titlefont: { size: 11 } }
    };

    if (window.Plotly) {
        Plotly.newPlot('plotlyMatrix', data, layout, { responsive: true, displayModeBar: false });
    } else {
        container.innerHTML = '<div class="text-muted font-sans p-4 text-center text-sm">Plotly.js not loaded — add the CDN script to index.html.</div>';
    }
}
