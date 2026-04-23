import { updateState, subscribe, getState } from './state.js';
import {
    setSequenceType,
    startAlignmentMode,
    returnToLanding,
    toggleAdvancedOptions,
    toggleTheme,
    clearSeq,
    loadExample,
    switchTab,
    handleFileDrop,
    handleFileUpload,
    fetchNCBI
} from './inputController.js';

import { initBgAnimation } from '../js/bgAnimation.js';

let _lastAlignType = undefined;
let _bgAnim = null;

export function initUIController() {
    _bgAnim = initBgAnimation();
    subscribe(render);

    function triggerRecomputePrompt() {
        if (window.lastAlignmentResult) {
            document.getElementById('recomputeMsg')?.classList.remove('hidden');
        }
    }

    document.getElementById('seq1')?.addEventListener('input', triggerRecomputePrompt);
    document.getElementById('seq2')?.addEventListener('input', triggerRecomputePrompt);

    // Bind Parameter Inputs
    const bindAndListen = (id, action, paramKey, eventType = "input") => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(eventType, (e) => updateState(action, paramKey ? { key: paramKey, value: e.target.value } : e.target.value));
    };

    bindAndListen('paramMatchScore', 'SET_PARAMETER', 'matchScore');
    bindAndListen('paramMismatchScore', 'SET_PARAMETER', 'mismatchPenalty');
    bindAndListen('paramMatrix', 'SET_PARAMETER', 'matrix', 'change');
    bindAndListen('paramGapOpen', 'SET_PARAMETER', 'gapOpen');
    bindAndListen('paramGapExtend', 'SET_PARAMETER', 'gapExtend');
    bindAndListen('paramWordSize', 'SET_PARAMETER', 'wordSize');
    bindAndListen('paramExpectThreshold', 'SET_PARAMETER', 'expectThreshold');
    bindAndListen('paramDbSize', 'SET_PARAMETER', 'dbSize');
    bindAndListen('paramGapMath', 'SET_GAP_MODE', null, 'change');

    // DNA Scoring Mode Toggle
    document.getElementById('scoringModeCustom')?.addEventListener('click', () => updateState('SET_SCORING_MODE', 'CUSTOM'));
    document.getElementById('scoringModeMatrix')?.addEventListener('click', () => updateState('SET_SCORING_MODE', 'MATRIX'));

    // UI Visual Sync for Sliders
    ['Open', 'Ext'].forEach(typ => {
        document.getElementById(`paramGap${typ === 'Open' ? 'Open' : 'Extend'}`)?.addEventListener('input', (e) => {
            const v = document.getElementById(`gap${typ}Val`);
            if (v) v.innerText = e.target.value;
        });
    });

    // Sequence type toggle — single dispatch through state. setSequenceType also
    // updates button classes and textarea placeholders (visual-only, no state side-effects).
    document.getElementById('typeProteinBtn')?.addEventListener('click', () => {
        updateState('SET_SEQUENCE_TYPE', 'protein');
        setSequenceType('protein'); // purely for button class + placeholder updates
    });
    document.getElementById('typeDnaBtn')?.addEventListener('click', () => {
        updateState('SET_SEQUENCE_TYPE', 'dna');
        setSequenceType('dna'); // purely for button class + placeholder updates
    });

    // Landing card navigation (SPA hash routing)
    document.getElementById('btnGlobalAlign')?.addEventListener('click', () => { window.location.hash = '/global-alignment'; });
    document.getElementById('btnLocalAlign')?.addEventListener('click', () => { window.location.hash = '/local-alignment'; });
    document.getElementById('btnBlastAlign')?.addEventListener('click', () => { window.location.hash = '/blast-like-search'; });
    document.getElementById('btnReturnLanding')?.addEventListener('click', () => { window.location.hash = '/pairwise-sequence-alignment'; });

    // Global Nav Links
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => toggleTheme());
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => document.getElementById('mobileMenu')?.classList.toggle('hidden'));

    // Sequence Workspace interactions
    [1, 2].forEach(n => {
        document.getElementById(`btnLoadEx${n}`)?.addEventListener('click', () => loadExample(n));
        document.getElementById(`btnClearSeq${n}`)?.addEventListener('click', () => clearSeq(n));

        ['manual', 'upload', 'ncbi'].forEach(t => {
            document.getElementById(`tab-${n}-${t}`)?.addEventListener('click', () => switchTab(n, t));
        });

        const dropZone = document.getElementById(`content-${n}-upload`);
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-green-500', 'bg-green-500/5'); });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-green-500', 'bg-green-500/5'));
            dropZone.addEventListener('drop', (e) => handleFileDrop(e, n));
        }

        document.getElementById(`file-upload-${n}`)?.addEventListener('change', (e) => handleFileUpload(e, n));

        document.getElementById(`ncbi-search-${n}`)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchNCBI(n); });
        document.getElementById(`btn-fetch-${n}`)?.addEventListener('click', () => fetchNCBI(n));
    });

    document.getElementById('btnToggleAdvanced')?.addEventListener('click', () => {
        updateState('TOGGLE_ADVANCED_OPTIONS');
        toggleAdvancedOptions();
    });
    document.getElementById('btnResetGapsGroup')?.addEventListener('click', () => updateState('RESET_GAP_OVERRIDES'));
    document.getElementById('paramEndGaps')?.addEventListener('change', (e) => document.getElementById('endGapParams')?.classList.toggle('hidden', !e.target.checked));

    // Trigger initial render
    updateState('INIT');
}

function setVisibility(id, condition) {
    const el = document.getElementById(id);
    if (!el) return;
    if (condition) el.classList.remove("hidden");
    else el.classList.add("hidden");
}

function render(state, derivedUI) {
    const { visibility, locks, labels } = derivedUI;

    if (_bgAnim) _bgAnim.setSeqType(state.sequenceType);

    // 1. Render Input Values
    const setVal = (id, val) => {
        const e = document.getElementById(id);
        if (e && String(e.value) !== String(val)) {
            e.value = val;
            e.classList.remove('animate-value-glow');
            void e.offsetWidth; // trigger reflow
            e.classList.add('animate-value-glow');
        }
    };
    setVal('paramMatchScore', state.parameters.matchScore);
    setVal('paramMismatchScore', state.parameters.mismatchPenalty);
    setVal('paramMatrix', state.parameters.matrix);
    setVal('paramGapOpen', state.parameters.gapOpen);
    setVal('paramGapExtend', state.parameters.gapExtend);
    setVal('paramWordSize', state.parameters.wordSize);
    setVal('paramExpectThreshold', state.parameters.expectThreshold);
    setVal('paramGapMath', state.gapMode);

    // Update Slider UI Gradients
    const gapOpenEl = document.getElementById('paramGapOpen');
    const gapExtEl = document.getElementById('paramGapExtend');

    function animateTextValue(id, val) {
        const el = document.getElementById(id);
        if (el && String(el.innerText) !== String(val)) {
            el.innerText = val;
            el.classList.remove('animate-value-glow');
            void el.offsetWidth;
            el.classList.add('animate-value-glow');
        }
    }

    if (gapOpenEl) {
        animateTextValue('gapOpenVal', state.parameters.gapOpen);
        const max = parseFloat(gapOpenEl.max) || 30;
        const pct = ((state.parameters.gapOpen / max) * 100).toFixed(1);
        gapOpenEl.style.background = `linear-gradient(to right,var(--primary) ${pct}%,var(--chip-bg) ${pct}%)`;
    }
    if (gapExtEl) {
        animateTextValue('gapExtVal', state.parameters.gapExtend);
        const max = parseFloat(gapExtEl.max) || 5;
        const pct = ((state.parameters.gapExtend / max) * 100).toFixed(1);
        gapExtEl.style.background = `linear-gradient(to right,var(--primary) ${pct}%,var(--chip-bg) ${pct}%)`;
    }

    // 2. Render Constraints (Locks & Tooltips)
    const mathEl = document.getElementById('paramGapMath');
    if (mathEl) {
        mathEl.disabled = locks.gapMode;
        // Lock icon label next to the Gap Math selector
        let lockIcon = document.getElementById('gapModeLockIcon');
        if (locks.gapMode) {
            mathEl.title = labels.gapModeReason || "Locked by constraints";
            mathEl.classList.add('opacity-50', 'cursor-not-allowed', 'bg-black/5', 'dark:bg-white/5');
            if (!lockIcon) {
                lockIcon = document.createElement('span');
                lockIcon.id = 'gapModeLockIcon';
                lockIcon.className = 'text-[10px] text-amber-500 font-semibold ml-1 align-middle';
                lockIcon.title = labels.gapModeReason;
                lockIcon.innerHTML = '🔒 Controlled by algorithm';
                mathEl.parentElement?.querySelector('label')?.appendChild(lockIcon);
            } else {
                lockIcon.title = labels.gapModeReason;
            }
        } else {
            mathEl.title = "";
            mathEl.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-black/5', 'dark:bg-white/5');
            lockIcon?.remove();
        }
    }

    // 3. Render Matrix Hint Label
    let matrixHintEl = document.getElementById('matrixHintLabel');
    if (!matrixHintEl) {
        matrixHintEl = document.createElement('p');
        matrixHintEl.id = 'matrixHintLabel';
        matrixHintEl.className = 'text-xs text-primary font-medium mt-1 transition-opacity';
        document.getElementById('paramMatrix')?.parentElement.appendChild(matrixHintEl);
    }
    matrixHintEl.innerText = labels.matrixHint;

    // 4. Render Visibility groups
    setVisibility('scoringModeToggleGroup', visibility.scoringModeToggle);
    setVisibility('customScoreGroup', visibility.matchMismatch);
    setVisibility('customScoreHeader', visibility.matchMismatch);
    setVisibility('matrixSelectorGroup', visibility.matrixSelector);

    // Hide the empty padding container if nothing inside it is visible
    const showTop = visibility.scoringModeToggle || visibility.matchMismatch || visibility.matrixSelector;
    setVisibility('topParametersBlock', showTop);

    const advancedContainer = document.getElementById('advancedOptionsBlock');
    if (advancedContainer) {
        if (!showTop) {
            advancedContainer.classList.remove('border-t', 'border-border', 'pt-2');
        } else {
            advancedContainer.classList.add('border-t', 'border-border', 'pt-2');
        }
    }

    setVisibility('gapMathSelectorGroup', visibility.gapModeSelector !== false); // always show gap math
    setVisibility('ncbiWordSizeGroup', visibility.wordSize);
    setVisibility('ncbiWordSizeHeader', visibility.wordSize);
    setVisibility('endGapsGroup', visibility.endGaps);

    // Also toggle the Reset Gaps button visibility alongside User Modified gaps
    setVisibility('btnResetGapsGroup', state.ui.userModifiedGap);

    // 5. Safe OptGroup display toggling (accessibility optimized)
    const pGroup = document.getElementById('proteinMatrices');
    const dGroup = document.getElementById('dnaMatrices');

    if (pGroup) {
        pGroup.disabled = !visibility.proteinMatrices;
        pGroup.hidden = !visibility.proteinMatrices;
        Array.from(pGroup.children).forEach(o => {
            o.disabled = !visibility.proteinMatrices;
            o.hidden = !visibility.proteinMatrices;
        });
    }
    if (dGroup) {
        dGroup.disabled = !visibility.dnaMatrices;
        dGroup.hidden = !visibility.dnaMatrices;
        Array.from(dGroup.children).forEach(o => {
            o.disabled = !visibility.dnaMatrices;
            o.hidden = !visibility.dnaMatrices;
        });
    }

    const select = document.getElementById('paramMatrix');
    if (select) select.value = state.parameters.matrix;

    // 6. DNA Scoring Toggle Visuals
    const btnC = document.getElementById('scoringModeCustom');
    const btnM = document.getElementById('scoringModeMatrix');
    const activeClass = ['bg-black', 'text-white', 'dark:bg-white', 'dark:text-black', 'shadow-sm'];
    const inactiveClass = ['text-muted', 'hover:text-black', 'dark:hover:text-white', 'bg-transparent'];

    if (btnC && btnM) {
        if (state.scoringMode === 'CUSTOM') {
            btnC.classList.add(...activeClass); btnC.classList.remove(...inactiveClass);
            btnM.classList.remove(...activeClass); btnM.classList.add(...inactiveClass);
        } else {
            btnM.classList.add(...activeClass); btnM.classList.remove(...inactiveClass);
            btnC.classList.remove(...activeClass); btnC.classList.add(...inactiveClass);
        }
    }

    // 7. Auto-open advanced options when switching modes if top is hidden, or if state requested it
    if (_lastAlignType !== state.alignmentType) {
        if (!showTop || visibility.forceAdvancedOptionsOpen) {
            document.getElementById('advancedOptionsBlock')?.classList.remove('hidden');
            const icon = document.getElementById('optionsToggleIcon1');
            if (icon) { icon.classList.remove('fa-gear'); icon.classList.add('fa-chevron-up'); }
        }

        // Title Updates with specific BADGE
        let tStr = "", badge = "";
        if (state.alignmentType === 'global') {
            tStr = "Global Alignment"; badge = '<span class="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-gray-500">EMBOSS Mode</span>';
        } else if (state.alignmentType === 'local') {
            tStr = "Local Alignment"; badge = '<span class="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-gray-500">EMBOSS Mode</span>';
        } else {
            tStr = "BLAST-like Search"; badge = '<span class="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-blue-500">NCBI Mode</span>';
        }
        const bEl = document.getElementById('workspaceTitle');
        if (bEl) bEl.innerHTML = `${tStr} ${badge}`;

        _lastAlignType = state.alignmentType;
    }

    // Check if we need to show the recompute prompt after a state change
    if (window.lastAlignmentResult) {
        document.getElementById('recomputeMsg')?.classList.remove('hidden');
    }

    if (_bgAnim) _bgAnim.setSeqType(state.sequenceType);
}
