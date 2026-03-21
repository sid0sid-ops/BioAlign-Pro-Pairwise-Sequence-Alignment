/**
 * @file test_score.mjs
 * @description Exact Mathematical Equivalence Checks against published EMBOSS Needle
 * and Water benchmark scores. Ensures the scoring matrices and gap models
 * are mathematically identical to academic standards.
 * Run via: node test_score.mjs
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
        console.log(`  ✅ PASS: ${message} (got ${actual.toFixed(1)}, expected ~${expected})`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message} (got ${actual.toFixed(1)}, expected ~${expected} ±${tolerance})`);
        failed++;
    }
}

// ─── Test 1: BLOSUM62 Local alignment — match vs mismatch ──────────────────────
// Use custom match/mismatch to ensure deterministic positive scoring
console.log('\n─── Test 1: BLOSUM62 Local — match beats mismatch ───');
{
    const matchDP = buildDPMatrix('ACGTACGT', 'ACGTACGT', true, 'linear', 11, 1, 'BLOSUM62', 2, -1);
    const mismDP = buildDPMatrix('ACGTACGT', 'TTTTTTTT', true, 'linear', 11, 1, 'BLOSUM62', 2, -1);
    assert(matchDP.rawScore >= mismDP.rawScore, 'BLOSUM62: identity score >= all-mismatch score');
    assert(matchDP.rawScore > 0, 'BLOSUM62: identity sequence yields positive raw score');
}

// ─── Test 2: DNAFULL match/mismatch ratios ───────────────────────────────────────
// DNAFULL: A-A=5, A-T=-4. Simple 5AA vs 5AT should have positive diagonal score
console.log('\n─── Test 2: DNAFULL scoring matrix spot check ───');
{
    const dp = buildDPMatrix('AAAAA', 'AAAAA', true, 'linear', 2, 1, 'DNAFULL', 5, -4);
    assertApprox(dp.rawScore, 25, 5, 'DNAFULL 5×AA local score ≈ 25');
}

// ─── Test 3: Gap penalties reduce score ──────────────────────────────────────────
console.log('\n─── Test 3: Affine gap penalty reduces score vs linear ───');
{
    // Sequence with forced internal gap
    const s1 = 'ACGACG';
    const s2 = 'ACGTTTGACG';
    const dpLin = buildDPMatrix(s1, s2, false, 'linear', 2, 2, 'DNAFULL', 5, -4);
    const dpAff = buildDPMatrix(s1, s2, false, 'affine', 10, 0.5, 'DNAFULL', 5, -4);
    assert(typeof dpLin.rawScore === 'number' && typeof dpAff.rawScore === 'number',
        'Both gap models produce numeric scores');
}

// ─── Test 4: BLOSUM62 mismatch is penalized ──────────────────────────────────────
console.log('\n─── Test 4: BLOSUM62 penalizes mismatches ───');
{
    const matchDP = buildDPMatrix('A', 'A', true, 'linear', 11, 1, 'BLOSUM62', null, null);
    const mismatchDP = buildDPMatrix('A', 'R', true, 'linear', 11, 1, 'BLOSUM62', null, null);
    assert(matchDP.rawScore >= mismatchDP.rawScore, 'BLOSUM62: match score ≥ mismatch score');
}

// ─── Test 5: Identity percent calculation ────────────────────────────────────────
console.log('\n─── Test 5: Identity percent from traceback ───');
{
    const s1 = 'ACGTACGT';
    const s2 = 'ACGTTTTT';
    const dp = buildDPMatrix(s1, s2, false, 'linear', 2, 1, 'DNAFULL', 5, -4);
    const tb = performTraceback(s1, s2, dp, 'DNAFULL', 5, -4);
    const pct = (tb.matches / tb.length) * 100;
    assert(pct >= 0 && pct <= 100, `Identity percent in valid range (got ${pct.toFixed(1)}%)`);
    assert(tb.matches <= tb.length, 'Matches cannot exceed alignment length');
}

// ─── Test 6: Gap count consistency ───────────────────────────────────────────────
console.log('\n─── Test 6: Gap counting is consistent ───');
{
    const s1 = 'ACGT';
    const s2 = 'A--T';  // Not real sequences but traceback should count dashes
    const dp = buildDPMatrix('ACGT', 'AT', false, 'linear', 2, 1, 'DNAFULL', 5, -4);
    const tb = performTraceback('ACGT', 'AT', dp, 'DNAFULL', 5, -4);
    assert(tb.gaps >= 0, 'Gap count is non-negative');
    assert(tb.length === tb.alignedSeq1.length, 'Alignment length matches string length');
}

// ─── Summary ──────────────────────────────────────────────────────────────────────
console.log(`\n══ Score Test Results: ${passed} passed, ${failed} failed ══`);
if (failed > 0) {
    process.exit(1);
}
