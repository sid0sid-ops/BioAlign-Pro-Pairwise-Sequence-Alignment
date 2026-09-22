import { initBgAnimation } from '../js/bgAnimation.js';
import {
    checkSequenceInput,
    clearSeq,
    fetchNCBI,
    handleFileDrop,
    handleFileUpload,
    loadExample,
    returnToLanding,
    setSequenceType,
    startAlignmentMode,
    switchTab,
    toggleAdvancedOptions,
    toggleTheme
} from './inputController.js';
import { getState, subscribe, updateState } from './state.js';

let _lastAlignType;
let _bgAnim = null;
let _proteinOptGroup = null;
let _dnaOptGroup = null;

export function initUIController() {
    _bgAnim = initBgAnimation();
    _proteinOptGroup = document.getElementById('proteinMatrices');
    _dnaOptGroup = document.getElementById('dnaMatrices');
    subscribe(render);

    function triggerRecomputePrompt() {
        if (window.lastAlignmentResult) {
            document.getElementById('recomputeMsg')?.classList.remove('hidden');
        }
    }

    document.getElementById('seq1')?.addEventListener('input', () => {
        triggerRecomputePrompt();
        checkSequenceInput(1);
    });
    document.getElementById('seq2')?.addEventListener('input', () => {
        triggerRecomputePrompt();
        checkSequenceInput(2);
    });

    // Bind Parameter Inputs
    const NUMERIC_KEYS = [
        'matchScore',
        'mismatchPenalty',
        'gapOpen',
        'gapExtend',
        'wordSize',
        'expectThreshold',
        'dbSize',
        'thresholdT',
        'xDropoff'
    ];
    const bindAndListen = (id, action, paramKey, eventType = 'input') => {
        const el = document.getElementById(id);
        if (el)
            el.addEventListener(eventType, (e) => {
                let val = e.target.value;
                if (paramKey && NUMERIC_KEYS.includes(paramKey)) {
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) val = parsed;
                }
                updateState(action, paramKey ? { key: paramKey, value: val } : val);
                triggerRecomputePrompt();
            });
    };

    bindAndListen('paramMatchScore', 'SET_PARAMETER', 'matchScore');
    bindAndListen('paramMismatchScore', 'SET_PARAMETER', 'mismatchPenalty');
    bindAndListen('paramMatrix', 'SET_PARAMETER', 'matrix', 'change');
    bindAndListen('paramGapOpen', 'SET_PARAMETER', 'gapOpen');
    bindAndListen('paramGapExtend', 'SET_PARAMETER', 'gapExtend');
    bindAndListen('paramWordSize', 'SET_PARAMETER', 'wordSize');
    bindAndListen('paramThresholdT', 'SET_PARAMETER', 'thresholdT');
    bindAndListen('paramXDropoff', 'SET_PARAMETER', 'xDropoff');
    bindAndListen('paramExpectThreshold', 'SET_PARAMETER', 'expectThreshold');
    bindAndListen('paramDbSize', 'SET_PARAMETER', 'dbSize');
    bindAndListen('paramGapMath', 'SET_GAP_MODE', null, 'change');

    // DNA Scoring Mode Toggle
    document.getElementById('scoringModeCustom')?.addEventListener('click', () => {
        updateState('SET_SCORING_MODE', 'CUSTOM');
        triggerRecomputePrompt();
    });
    document.getElementById('scoringModeMatrix')?.addEventListener('click', () => {
        updateState('SET_SCORING_MODE', 'MATRIX');
        triggerRecomputePrompt();
    });

    // UI Visual Sync for Sliders (Continuous Monochrome Bar)
    const updateSliderFill = (slider, valEl) => {
        if (!slider) return;
        const val = parseFloat(slider.value);
        if (valEl) valEl.innerText = slider.value;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const pct = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100)).toFixed(1);
        slider.style.background = `linear-gradient(to right, var(--slider-fill) ${pct}%, var(--slider-track) ${pct}%)`;
    };

    ['Open', 'Extend'].forEach((typ) => {
        const slider = document.getElementById(`paramGap${typ}`);
        const valEl = document.getElementById(`gap${typ === 'Open' ? 'Open' : 'Ext'}Val`);
        slider?.addEventListener('input', () => updateSliderFill(slider, valEl));
    });

    ['Open', 'Extend'].forEach((typ) => {
        const slider = document.getElementById(`paramEndGap${typ}`);
        const valEl = document.getElementById(`endGap${typ === 'Open' ? 'Open' : 'Ext'}Val`);
        slider?.addEventListener('input', () => updateSliderFill(slider, valEl));
    });

    // Sequence type toggle — single dispatch through state. setSequenceType also
    // updates button classes and textarea placeholders (visual-only, no state side-effects).
    const handleProteinSelect = () => {
        updateState('SET_SEQUENCE_TYPE', 'protein');
        setSequenceType('protein');
    };
    const handleDnaSelect = () => {
        updateState('SET_SEQUENCE_TYPE', 'dna');
        setSequenceType('dna');
    };

    document.getElementById('typeProteinBtn')?.addEventListener('click', handleProteinSelect);
    document.getElementById('workspaceTypeProteinBtn')?.addEventListener('click', handleProteinSelect);

    document.getElementById('typeDnaBtn')?.addEventListener('click', handleDnaSelect);
    document.getElementById('workspaceTypeDnaBtn')?.addEventListener('click', handleDnaSelect);

    // Landing card navigation (SPA hash routing)
    document.getElementById('btnGlobalAlign')?.addEventListener('click', () => {
        window.location.hash = '/global-alignment';
    });
    document.getElementById('btnLocalAlign')?.addEventListener('click', () => {
        window.location.hash = '/local-alignment';
    });
    document.getElementById('btnBlastAlign')?.addEventListener('click', () => {
        window.location.hash = '/blast-like-search';
    });
    document.getElementById('btnReturnLanding')?.addEventListener('click', () => {
        window.location.hash = '/pairwise-sequence-alignment';
    });

    // Global Nav Links
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => toggleTheme());
    document
        .getElementById('mobileMenuBtn')
        ?.addEventListener('click', () => document.getElementById('mobileMenu')?.classList.toggle('hidden'));

    // Sequence Workspace interactions
    [1, 2].forEach((n) => {
        document.getElementById(`btnLoadEx${n}`)?.addEventListener('click', () => loadExample(n));
        document.getElementById(`btnClearSeq${n}`)?.addEventListener('click', () => clearSeq(n));

        ['manual', 'upload', 'ncbi'].forEach((t) => {
            document.getElementById(`tab-${n}-${t}`)?.addEventListener('click', () => switchTab(n, t));
        });

        const dropZone = document.getElementById(`content-${n}-upload`);
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-green-500', 'bg-green-500/5');
            });
            dropZone.addEventListener('dragleave', () =>
                dropZone.classList.remove('border-green-500', 'bg-green-500/5')
            );
            dropZone.addEventListener('drop', (e) => handleFileDrop(e, n));
        }

        document.getElementById(`file-upload-${n}`)?.addEventListener('change', (e) => handleFileUpload(e, n));

        document.getElementById(`ncbi-search-${n}`)?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') fetchNCBI(n);
        });
        document.getElementById(`btn-fetch-${n}`)?.addEventListener('click', () => fetchNCBI(n));
    });

    document.getElementById('btnToggleAdvanced')?.addEventListener('click', () => {
        updateState('TOGGLE_ADVANCED_OPTIONS');
        toggleAdvancedOptions();
    });
    document.getElementById('btnResetGapsGroup')?.addEventListener('click', () => {
        updateState('RESET_GAP_OVERRIDES');
        triggerRecomputePrompt();
    });
    document.getElementById('paramEndGaps')?.addEventListener('change', (e) => {
        document.getElementById('endGapParams')?.classList.toggle('hidden', !e.target.checked);
        triggerRecomputePrompt();
    });

    // Trigger initial render
    updateState('INIT');
}

function setVisibility(id, condition) {
    const el = document.getElementById(id);
    if (!el) return;
    if (condition) el.classList.remove('hidden');
    else el.classList.add('hidden');
}

function render(state, derivedUI) {
    const { visibility, locks, labels } = derivedUI;

    if (_bgAnim) _bgAnim.setSeqType(state.sequenceType);

    // Sync active chips across landing and workspace
    const isProtein = state.sequenceType === 'protein';
    ['typeProteinBtn', 'workspaceTypeProteinBtn'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            if (isProtein) {
                el.classList.add('active');
                el.classList.remove('text-muted');
            } else {
                el.classList.remove('active');
                el.classList.add('text-muted');
            }
        }
    });
    ['typeDnaBtn', 'workspaceTypeDnaBtn'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            if (!isProtein) {
                el.classList.add('active');
                el.classList.remove('text-muted');
            } else {
                el.classList.remove('active');
                el.classList.add('text-muted');
            }
        }
    });

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
    setVal('paramThresholdT', state.parameters.thresholdT ?? 11);
    setVal('paramXDropoff', state.parameters.xDropoff ?? (state.sequenceType === 'dna' ? 30 : 20));
    setVal('paramExpectThreshold', state.parameters.expectThreshold);
    setVal('paramDbSize', state.parameters.dbSize ?? '');
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

    const applyContinuousFill = (el, val, valId) => {
        if (!el) return;
        animateTextValue(valId, val);
        const min = parseFloat(el.min) || 0;
        const max = parseFloat(el.max) || 100;
        const pct = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100)).toFixed(1);
        el.style.background = `linear-gradient(to right, var(--slider-fill) ${pct}%, var(--slider-track) ${pct}%)`;
    };

    applyContinuousFill(gapOpenEl, state.parameters.gapOpen, 'gapOpenVal');
    applyContinuousFill(gapExtEl, state.parameters.gapExtend, 'gapExtVal');

    const endOpenEl = document.getElementById('paramEndGapOpen');
    const endExtEl = document.getElementById('paramEndGapExtend');
    applyContinuousFill(endOpenEl, state.parameters.endGapOpen || 10, 'endGapOpenVal');
    applyContinuousFill(endExtEl, state.parameters.endGapExtend || 0.5, 'endGapExtVal');

    // 2. Render Constraints (Locks & Tooltips)
    const mathEl = document.getElementById('paramGapMath');
    if (mathEl) {
        mathEl.disabled = locks.gapMode;
        // Lock icon label next to the Gap Math selector
        let lockIcon = document.getElementById('gapModeLockIcon');
        if (locks.gapMode) {
            mathEl.title = labels.gapModeReason || 'Locked by constraints';
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
            mathEl.title = '';
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
    setVisibility('gapExtendGroup', visibility.gapExtend !== false);
    setVisibility('ncbiWordSizeGroup', visibility.wordSize);
    setVisibility('ncbiWordSizeHeader', visibility.wordSize);
    setVisibility('endGapsGroup', visibility.endGaps);

    // Dynamically update Gap Open label based on Linear vs Affine
    const gapOpenLabel = document.getElementById('gapOpenLabelText');
    if (gapOpenLabel) {
        gapOpenLabel.innerText =
            state.gapMode === 'linear' ? 'Linear Gap Penalty (Cost per residue)' : 'Gap Open Penalty (Existence)';
    }

    // Also toggle the Reset Gaps button visibility alongside User Modified gaps
    setVisibility('btnResetGapsGroup', state.ui.userModifiedGap);

    // 5. Physical OptGroup attachment/detachment
    // Native macOS/browser selects ignore hidden/disabled on <optgroup>, so we physically add/remove them
    const select = document.getElementById('paramMatrix');
    if (select) {
        if (!_proteinOptGroup) _proteinOptGroup = document.getElementById('proteinMatrices');
        if (!_dnaOptGroup) _dnaOptGroup = document.getElementById('dnaMatrices');

        if (_proteinOptGroup && _dnaOptGroup) {
            if (state.sequenceType === 'protein') {
                if (select.contains(_dnaOptGroup)) {
                    select.removeChild(_dnaOptGroup);
                }
                if (!select.contains(_proteinOptGroup)) {
                    select.appendChild(_proteinOptGroup);
                }
            } else {
                if (select.contains(_proteinOptGroup)) {
                    select.removeChild(_proteinOptGroup);
                }
                if (!select.contains(_dnaOptGroup)) {
                    select.appendChild(_dnaOptGroup);
                }
            }
        }
        select.value = state.parameters.matrix;
    }

    // 6. DNA Scoring Toggle Visuals
    const btnC = document.getElementById('scoringModeCustom');
    const btnM = document.getElementById('scoringModeMatrix');
    const activeClass = ['bg-black', 'text-white', 'dark:bg-white', 'dark:text-black', 'shadow-sm'];
    const inactiveClass = ['text-muted', 'hover:text-black', 'dark:hover:text-white', 'bg-transparent'];

    if (btnC && btnM) {
        if (state.scoringMode === 'CUSTOM') {
            btnC.classList.add(...activeClass);
            btnC.classList.remove(...inactiveClass);
            btnM.classList.remove(...activeClass);
            btnM.classList.add(...inactiveClass);
        } else {
            btnM.classList.add(...activeClass);
            btnM.classList.remove(...inactiveClass);
            btnC.classList.remove(...activeClass);
            btnC.classList.add(...inactiveClass);
        }
    }

    // 7. Auto-open advanced options when switching modes if top is hidden, or if state requested it
    if (_lastAlignType !== state.alignmentType) {
        if (!showTop || visibility.forceAdvancedOptionsOpen) {
            document.getElementById('advancedOptionsBlock')?.classList.remove('hidden');
            const icon = document.getElementById('optionsToggleIcon1');
            if (icon) {
                icon.classList.remove('fa-gear');
                icon.classList.add('fa-chevron-up');
            }
        }

        // Title Updates with specific BADGE
        let tStr;
        let badge;
        if (state.alignmentType === 'global') {
            tStr = 'Global Alignment';
            badge =
                '<span class="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-gray-500">EMBOSS Mode</span>';
        } else if (state.alignmentType === 'local') {
            tStr = 'Local Alignment';
            badge =
                '<span class="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-gray-500">EMBOSS Mode</span>';
        } else {
            tStr = 'BLAST-like Search';
            badge =
                '<span class="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-blue-500">NCBI Mode</span>';
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
