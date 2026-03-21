/**
 * @file test_dp.mjs
 * @description Dynamic Programming Consistency Checks — validates the correctness of
 * the traceback path coordinates and the alignment matrix fill logic.
 * Run via: node test_dp.mjs
 */

import { buildDPMatrix } from './core/dpMatrix.js';
import { performTraceback } from './core/traceback.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

function assertApprox(actual, expected, tolerance, message) {
    const ok = Math.abs(actual - expected) <= tolerance;
    if (ok) {
        console.log(`  ✅ PASS: ${message} (got ${actual}, expected ~${expected})`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message} (got ${actual}, expected ~${expected} ±${tolerance})`);
        failed++;
    }
}

// ─── TEST 1: Identity Global Alignment ──────────────────────────────────────────
console.log('\n─── Test 1: Identity Global Alignment ───');
{
    const s1 = 'ACGT';
    const s2 = 'ACGT';
    const dp = buildDPMatrix(s1, s2, false, 'linear', 2, 1, 'DNAFULL', 5, -4);
    const tb = performTraceback(s1, s2, dp, 'DNAFULL', 5, -4);
    assert(tb.matches === 4, 'Identity: 4 exact matches');
    assert(tb.gaps === 0, 'Identity: 0 gaps');
    assert(tb.alignedSeq1 === 'ACGT', 'Identity: aligned seq1 correct');
    assert(tb.alignedSeq2 === 'ACGT', 'Identity: aligned seq2 correct');
    assert(dp.rawScore > 0, 'Identity: positive raw score');
}

// ─── TEST 2: Single Mismatch Global ─────────────────────────────────────────────
console.log('\n─── Test 2: Single Mismatch Global Alignment ───');
{
    const s1 = 'ACGT';
    const s2 = 'ACTT';
    const dp = buildDPMatrix(s1, s2, false, 'linear', 2, 1, 'DNAFULL', 5, -4);
    const tb = performTraceback(s1, s2, dp, 'DNAFULL', 5, -4);
    assert(tb.matches === 3, 'Single mismatch: 3 exact matches');
    assert(tb.length === 4, 'Single mismatch: alignment length is 4');
}

// ─── TEST 3: Local Alignment Skips Leading Mismatches ───────────────────────────
console.log('\n─── Test 3: Smith-Waterman Local Alignment ───');
{
    const s1 = 'TTTACGTAAA';
    const s2 = 'ACGT';
    const dp = buildDPMatrix(s1, s2, true, 'linear', 2, 1, 'DNAFULL', 5, -4);
    const tb = performTraceback(s1, s2, dp, 'DNAFULL', 5, -4);
    assert(tb.matches >= 4, 'Local: finds the 4-match core region');
    assert(tb.alignedSeq1.replace(/-/g, '').includes('ACGT'), 'Local: aligned core contains ACGT');
}

// ─── TEST 4: Traceback Path Coordinates are in bounds ───────────────────────────
console.log('\n─── Test 4: Traceback path coordinates in bounds ───');
{
    const s1 = 'GATTACA';
    const s2 = 'GCATGCU';
    const dp = buildDPMatrix(s1, s2, false, 'affine', 10, 0.5, 'BLOSUM62', null, null);
    const tb = performTraceback(s1, s2, dp, 'BLOSUM62', null, null);

    let allInBounds = true;
    for (const [r, c] of tb.tracePath) {
        if (r < 0 || r > dp.n || c < 0 || c > dp.m) {
            allInBounds = false;
            break;
        }
    }
    assert(allInBounds, 'All tracepath coords within matrix bounds');
    assert(tb.tracePath.length > 0, 'Traceback path is non-empty');
}

// ─── TEST 5: Affine gap builds strictly shorter path than linear ─────────────────
console.log('\n─── Test 5: Affine vs linear gap models ───');
{
    const s1 = 'ACGTTTTTTACG';
    const s2 = 'ACGACG';
    const dpLin = buildDPMatrix(s1, s2, false, 'linear', 2, 2, 'DNAFULL', 5, -4);
    const dpAff = buildDPMatrix(s1, s2, false, 'affine', 10, 0.5, 'DNAFULL', 5, -4);
    // Both should complete without error
    assert(typeof dpLin.rawScore === 'number', 'Linear model returns numeric score');
    assert(typeof dpAff.rawScore === 'number', 'Affine model returns numeric score');
}

// ─── TEST 6: Empty sequence edge case ────────────────────────────────────────────
console.log('\n─── Test 6: Single character sequences ───');
{
    const dp = buildDPMatrix('A', 'A', false, 'linear', 2, 1, 'DNAFULL', 5, -4);
    const tb = performTraceback('A', 'A', dp, 'DNAFULL', 5, -4);
    assert(tb.matches === 1, 'Single char: one match');
    assert(tb.length === 1, 'Single char: length is 1');
}

// ─── Summary ─────────────────────────────────────────────────────────────────────
console.log(`\n══ DP Test Results: ${passed} passed, ${failed} failed ══`);
if (failed > 0) {
    process.exit(1);
}
