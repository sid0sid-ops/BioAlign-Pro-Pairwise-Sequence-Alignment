/**
 * @file visualization/heatmapRenderer.js
 * @description Translates the massive 2D numerical DP score matrix into a rasterized HTML5 Canvas gradient heatmap for visual trace analysis.
 * @pipelineLocation Rendering tier. Operates directly on the raw ArrayBuffer matrices dumped by the Web Workers.
 * @changeImpact Modifying the canvas pixel buffer scale (ImageData array) will easily cause unrecoverable Canvas 2D Context crashes if coordinates exceed bounds.
 */

/**
 * @file visualization/heatmapRenderer.js
 * @description High-performance pure HTML5 Canvas renderer for DP Matrix tables and Heatmaps.
 * @pipeline Replaces Plotly.js and heavy DOM tables. Computes cell colors and draws text directly to a scaling canvas context, bypassing browser DOM limits.
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

            // Trigger custom resize to re-paint the canvas using requestAnimationFrame to ensure CSS layout has updated clientWidth
            requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        });
    }
}

/**
 * Renders the explicit DP table (scores + arrows) via Canvas text.
 */
export function renderDPTable(result) {
    const dp = result.dp || (result.additional_metrics ? result.additional_metrics : null);
    if (!dp || !dp.H) return;

    const { H, TB, n, m } = dp;
    const isLocal = result.metadata ? (result.metadata.algorithm.includes('Local') || result.metadata.algorithm.includes('BLAST')) : false;
    const tracePath = result.tracePath || [];
    const traceSet = new Set(tracePath.map(p => `${p[0]},${p[1]}`));

    const metrics = result.additional_metrics || {};
    const seq1 = metrics.rawSeq1 || (result.alignedSeq1 ? result.alignedSeq1.replace(/-/g, '') : '');
    const seq2 = metrics.rawSeq2 || (result.alignedSeq2 ? result.alignedSeq2.replace(/-/g, '') : '');

    const container = document.getElementById('dpTableContainer');
    if (!container) return;

    // Hard limit: drawing text for millions of cells is still CPU intensive.
    // We limit the text-based table to 200,000 cells (~450x450).
    const cellCount = n * m;
    if (cellCount > 200_000) {
        container.innerHTML = `<div class="p-6 flex flex-col items-center justify-center text-center text-red-500 font-sans h-full">
            <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
            <p>Sequences too large (${n}×${m}) to render as numeric text.<br>Use the High-Performance Heatmap tab.</p>
            </div>`;
        return;
    }

    const W = m + 1;
    let maxScore = -Infinity;
    let minScore = Infinity;
    for (let i = 0; i < H.length; i++) {
        if (H[i] > maxScore) maxScore = H[i];
        if (H[i] < minScore) minScore = H[i];
    }
    const scoreRange = maxScore > 0 ? maxScore : 1;
    const isDark = document.documentElement.classList.contains('dark');

    const CELL_W = 46;
    const CELL_H = 40;
    const canvasWidth = (m + 2) * CELL_W;
    const canvasHeight = (n + 2) * CELL_H;

    container.innerHTML = `
        <div style="width:100%; height:600px; overflow:auto; background:var(--surface,#f9fafb); border-radius:8px; border:1px solid var(--border,#e5e7eb);">
            <canvas id="dpTableCanvas" width="${canvasWidth}" height="${canvasHeight}" style="display:block;"></canvas>
        </div>
        <div class="flex flex-wrap gap-3 pt-3 text-[11px] font-sans items-center mt-2">
            <span class="font-semibold text-gray-700 dark:text-gray-300">Arrows:</span>
            <span class="text-black dark:text-gray-300"><span style="color:#0d9488;font-size:14px;">&#8598;</span> Diagonal</span>
            <span class="text-black dark:text-gray-300"><span style="color:#2563eb;font-size:14px;">&#8593;</span> Up</span>
            <span class="text-black dark:text-gray-300"><span style="color:#d97706;font-size:14px;">&#8592;</span> Left</span>
            <span class="ml-2 font-semibold text-gray-700 dark:text-gray-300">Path:</span>
            <span style="display:inline-block;width:14px;height:14px;background:#ffcc00;border:1.5px solid #ff8800;border-radius:2px;vertical-align:middle;"></span>
            <span class="text-black dark:text-gray-300 align-middle">Optimal trace</span>
        </div>
    `;

    const canvas = document.getElementById('dpTableCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    // Fill background
    ctx.fillStyle = isDark ? '#080808' : '#f9fafb';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Scaling for crisp text
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw Headers
    ctx.font = 'bold 12px Courier New, monospace';
    ctx.strokeStyle = isDark ? '#333' : '#cbd5e1';

    for (let j = 0; j <= m; j++) {
        const x = (j + 1) * CELL_W;
        ctx.strokeRect(x, 0, CELL_W, CELL_H);
        ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
        ctx.fillText(j === 0 ? '-' : seq2[j - 1], x + (CELL_W / 2), CELL_H / 2);
    }
    for (let i = 0; i <= n; i++) {
        const y = (i + 1) * CELL_H;
        ctx.strokeRect(0, y, CELL_W, CELL_H);
        ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
        ctx.fillText(i === 0 ? '-' : seq1[i - 1], CELL_W / 2, y + (CELL_H / 2));
    }

    // Draw Matrix
    for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= m; j++) {
            const idx = i * W + j;
            const val = H[idx];
            const tb = TB[idx];
            const onPath = traceSet.has(`${i},${j}`);

            const x = (j + 1) * CELL_W;
            const y = (i + 1) * CELL_H;

            // Background cell color
            if (onPath) {
                ctx.fillStyle = '#ffcc00';
            } else {
                let intensity = Math.min(1, Math.max(0, val / scoreRange));
                if (val > 0) ctx.fillStyle = `rgba(16, 185, 129, ${intensity * 0.4})`;
                else if (val < 0) ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(1, Math.abs(val / minScore)) * 0.4})`;
                else ctx.fillStyle = isDark ? '#111' : '#fff';
            }

            ctx.fillRect(x, y, CELL_W, CELL_H);
            ctx.strokeRect(x, y, CELL_W, CELL_H);

            // Text
            let scoreColor = isDark ? '#fff' : '#000';
            if (!onPath) {
                if (val > 0) scoreColor = '#059669';
                if (val < 0) scoreColor = '#dc2626';
                if (val === 0 && i > 0 && j > 0) scoreColor = '#94a3b8';
            } else {
                scoreColor = '#000'; // high contrast on yellow
            }

            ctx.font = 'bold 11px Courier New, monospace';
            ctx.fillStyle = scoreColor;
            ctx.fillText(Number.isInteger(val) ? val.toString() : val.toFixed(1), x + (CELL_W / 2), y + 12);

            // Arrows (0-3 spec: 0=STOP, 1=DIAGONAL, 2=UP, 3=LEFT)
            const tbH = tb & 3;
            if (!(i === 0 && j === 0) && tbH !== 0) {
                ctx.font = '14px Arial';
                if (tbH === 1) { ctx.fillStyle = onPath ? '#b45309' : '#0d9488'; ctx.fillText('↖', x + (CELL_W / 2), y + 26); }
                else if (tbH === 2) { ctx.fillStyle = onPath ? '#1d4ed8' : '#2563eb'; ctx.fillText('↑', x + (CELL_W / 2), y + 26); }
                else if (tbH === 3) { ctx.fillStyle = onPath ? '#9a3412' : '#d97706'; ctx.fillText('←', x + (CELL_W / 2), y + 26); }
            }
        }
    }
}

/**
 * Renders the dense macroscopic heatmap using pure ctx.fillRect() loops.
 * No Plotly.js dependencies. Can rapidly render matrices up to 25 million cells (5000 x 5000).
 */
export function renderHeatmap(result) {
    const dp = result.dp || (result.additional_metrics ? result.additional_metrics : null);
    if (!dp || !dp.H) return;

    const { H, n, m } = dp;
    const tracePath = result.tracePath || [];
    const container = document.getElementById('plotlyMatrix');
    if (!container) return;

    if (n * m > 25_000_000) {
        container.innerHTML = `<div class="flex items-center justify-center p-4 text-center text-red-500 font-sans h-full">
            <p>Heatmap limit exceeded — memory constraints prevent drawing > 25 million cells.</p></div>`;
        return;
    }

    container.innerHTML = `
        <div style="width:100%; height:100%; position:relative; display:flex; flex-direction:column;">
            <canvas id="pureCanvasHeatmap" style="flex-grow:1; width:100%; height:100%; min-height:400px; display:block; border-radius:8px;"></canvas>
            <div class="flex flex-wrap justify-between text-xs text-muted mt-2 px-2">
                <div class="flex items-center gap-2">
                    <span style="display:inline-block;width:12px;height:12px;background:rgb(30,58,138);border-radius:2px;"></span> Low Score
                    <span style="display:inline-block;width:12px;height:12px;background:rgb(255,255,255);border-radius:2px;border:1px solid #ccc;margin-left:8px;"></span> Neutral (Zero)
                    <span style="display:inline-block;width:12px;height:12px;background:rgb(185,28,28);border-radius:2px;margin-left:8px;"></span> High Score
                </div>
                <div class="flex items-center gap-2 font-mono font-semibold">
                    <span style="display:inline-block;width:20px;height:3px;background:#000;dark:background:#fff;"></span> Optimal Trace
                </div>
            </div>
        </div>
    `;

    const canvas = document.getElementById('pureCanvasHeatmap');
    const ctx = canvas.getContext('2d', { alpha: false });

    const dpr = window.devicePixelRatio || 1;
    let W_px = canvas.clientWidth;
    let H_px = canvas.clientHeight;

    // Dynamic resize hook
    const paint = () => {
        W_px = canvas.clientWidth;
        H_px = canvas.clientHeight;
        canvas.width = W_px * dpr;
        canvas.height = H_px * dpr;
        ctx.scale(dpr, dpr);

        let maxScore = -1e9;
        let minScore = 1e9;
        const len = H.length;
        for (let i = 0; i < len; i++) {
            if (H[i] > maxScore) maxScore = H[i];
            if (H[i] < minScore) minScore = H[i];
        }

        const rangePos = maxScore > 0 ? maxScore : 1;
        const rangeNeg = minScore < 0 ? Math.abs(minScore) : 1;

        const cellW = W_px / (m + 1);
        const cellH = H_px / (n + 1);
        const ROW_W = m + 1;

        // Determine theme
        const isDark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDark ? '#000' : '#fff';
        ctx.fillRect(0, 0, W_px, H_px);

        // Fast paint loop: Diverging Color Map (Blue <-> White <-> Red)
        for (let i = 0; i <= n; i++) {
            const y = i * cellH;
            const roundedY = Math.floor(y);
            const roundedH = Math.ceil(cellH) + 0.5;

            for (let j = 0; j <= m; j++) {
                const val = H[i * ROW_W + j];
                let r, g, b;

                if (val >= 0) {
                    const ratio = Math.min(1, val / rangePos);
                    // Blue-White-Red (Scientific 'RdBu' Divergent) -> White (255, 255, 255) to Red (185, 28, 28)
                    r = Math.floor(255 - (70 * ratio));
                    g = Math.floor(255 - (227 * ratio));
                    b = Math.floor(255 - (227 * ratio));
                } else {
                    const ratio = Math.min(1, Math.abs(val) / rangeNeg);
                    // White (255, 255, 255) to Deep Blue (30, 58, 138)
                    r = Math.floor(255 - (225 * ratio));
                    g = Math.floor(255 - (197 * ratio));
                    b = Math.floor(255 - (117 * ratio));
                }

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                const x = Math.floor(j * cellW);
                const roundedW = Math.ceil(cellW) + 0.5;
                ctx.fillRect(x, roundedY, roundedW, roundedH);
            }
        }

        // Overlay Traceback Path
        if (tracePath && tracePath.length > 0) {
            ctx.beginPath();
            // TracePath cells are [i, j]. Canvas coordinates: x = j * w, y = i * h
            for (let k = 0; k < tracePath.length; k++) {
                const p = tracePath[k];
                const cx = (p[1] * cellW) + (cellW / 2);
                const cy = (p[0] * cellH) + (cellH / 2);

                if (k === 0) ctx.moveTo(cx, cy);
                else ctx.lineTo(cx, cy);
            }

            ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
            ctx.lineWidth = Math.max(1.5, Math.min(cellW, cellH) * 0.4);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.shadowColor = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
            ctx.shadowBlur = 4;

            ctx.stroke();

            // Reset shadow to not affect subsequent repaints
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }
    };

    window.addEventListener('resize', paint);
    paint();
}
