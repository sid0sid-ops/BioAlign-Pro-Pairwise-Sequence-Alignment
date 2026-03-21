/**
 * @file test_research_standards.mjs
 * @description Contract & API Standard Conformance Checks — validates the shape and
 * fields of the alignment result object returned by the engine against the
 * research-grade contract defined in core/contracts.js.
 * Run via: node test_research_standards.mjs
 */

import { buildDPMatrix } from './core/dpMatrix.js';
import { performTraceback } from './core/traceback.js';
import { getKAParams, calculateStatistics } from './metrics/blastStatistics.js';

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

// ─── TEST 1: DP result shape ─────────────────────────────────────────────────────
console.log('\n─── Test 1: DP result shape conforms to contract ───');
{
    const dp = buildDPMatrix('ACGT', 'ACGT', false, 'linear', 2, 1, 'DNAFULL', 5, -4);
    assert('H' in dp, 'dp has .H (score matrix)');
    assert('TB' in dp, 'dp has .TB (traceback matrix)');
    assert('n' in dp && 'rawScore' in dp, 'dp has .n and .rawScore');
    assert(dp.n === 4, 'dp.n equals sequence length 4');
    assert(dp.m === 4, 'dp.m equals sequence length 4');
}

// ─── TEST 2: Traceback result shape ──────────────────────────────────────────────
console.log('\n─── Test 2: Traceback result shape conforms to contract ───');
{
    const s1 = 'ACGT';
    const s2 = 'ACGT';
    const dp = buildDPMatrix(s1, s2, false, 'linear', 2, 1, 'DNAFULL', 5, -4);
    const tb = performTraceback(s1, s2, dp, 'DNAFULL', 5, -4);
    assert('alignedSeq1' in tb, 'tb has .alignedSeq1');
    assert('alignedSeq2' in tb, 'tb has .alignedSeq2');
    assert('matchLine' in tb, 'tb has .matchLine');
    assert('matches' in tb, 'tb has .matches');
    assert('gaps' in tb, 'tb has .gaps');
    assert('length' in tb, 'tb has .length');
    assert('tracePath' in tb && Array.isArray(tb.tracePath), 'tb has .tracePath (Array)');
    assert(typeof tb.queryCoverage === 'number', 'tb has .queryCoverage (number)');
}

// ─── TEST 3: Aligned sequence lengths match ───────────────────────────────────────
console.log('\n─── Test 3: Aligned sequences equal length ───');
{
    const s1 = 'GATTACA';
    const s2 = 'GCATGCU';
    const dp = buildDPMatrix(s1, s2, false, 'affine', 10, 0.5, 'BLOSUM62', null, null);
    const tb = performTraceback(s1, s2, dp, 'BLOSUM62', null, null);
    assert(tb.alignedSeq1.length === tb.alignedSeq2.length, 'Aligned sequences equal length');
    assert(tb.alignedSeq1.length === tb.matchLine.length, 'Match line equals alignment length');
    assert(tb.length === tb.alignedSeq1.length, 'tb.length matches string lengths');
}

// ─── TEST 4: Karlin-Altschul parameters exist for known matrices ──────────────────
console.log('\n─── Test 4: Karlin-Altschul parameter lookup ───');
{
    const kaB62 = getKAParams('BLOSUM62', 11, 1);
    assert(kaB62 !== null, 'KA params exist for BLOSUM62');
    assert(kaB62 && kaB62.lambda > 0, 'BLOSUM62 lambda is positive');
    assert(kaB62 && kaB62.K > 0, 'BLOSUM62 K is positive');

    const kaDna = getKAParams('DNAFULL', 5, 2);
    assert(kaDna !== null, 'KA params exist for DNAFULL');

    const kaBLASTN = getKAParams('BLASTN', 5, 2);
    assert(kaBLASTN !== null, 'KA params exist for BLASTN');
}

// ─── TEST 5: Bit score and E-value computation ────────────────────────────────────
console.log('\n─── Test 5: Bit score & E-value computation ───');
{
    const stats = calculateStatistics(100, 50, 50, 'BLOSUM62', 11, 1);
    assert(stats !== null, 'calculateStatistics returns non-null for valid input');
    if (stats) {
        assert(parseFloat(stats.bitScore) > 0, `Bit score is positive (got ${stats.bitScore})`);
        assert(parseFloat(stats.eValue) >= 0, `E-value is non-negative (got ${stats.eValue})`);
    }

    const nullStats = calculateStatistics(-10, 50, 50, 'BLOSUM62', 11, 1);
    assert(nullStats === null, 'calculateStatistics returns null for negative raw score');
}

// ─── TEST 6: Query coverage is bounded [0, 100] ──────────────────────────────────
console.log('\n─── Test 6: Query coverage in valid range ───');
{
    const s1 = 'AGCTAGCTAGCT';
    const s2 = 'TAGCTAGCT';
    const dp = buildDPMatrix(s1, s2, true, 'linear', 2, 1, 'DNAFULL', 5, -4);
    const tb = performTraceback(s1, s2, dp, 'DNAFULL', 5, -4);
    assert(tb.queryCoverage >= 0 && tb.queryCoverage <= 100,
        `Query coverage in [0, 100] (got ${tb.queryCoverage.toFixed(1)}%)`);
}

// ─── Summary ──────────────────────────────────────────────────────────────────────
console.log(`\n══ Standards Test Results: ${passed} passed, ${failed} failed ══`);
if (failed > 0) {
    process.exit(1);
}
