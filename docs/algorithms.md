# BioAlign-Pro: Algorithms & Mathematical Foundations

BioAlign-Pro computes pairwise sequence alignments via exact dynamic programming (DP) algorithms and validated deterministic heuristics. This document outlines the mathematical models driving the alignment engine.

## 1. Global Alignment (Needleman-Wunsch)

The Needleman-Wunsch (1970) algorithm computes the optimal global alignment between two sequences, $A$ of length $m$ and $B$ of length $n$. BioAlign-Pro utilizes an **affine gap penalty** scheme to biologically penalize gap initiations more heavily than gap extensions.

### Recurrence Relations
Three matrices are computed simultaneously: $M$ (matches/mismatches), $I_A$ (insertions in sequence A), and $I_B$ (insertions in sequence B). 

Let $g_o$ be the gap-open penalty, $g_e$ be the gap-extension penalty, and $S(a_i, b_j)$ be the substitution score from the chosen matrix (e.g., BLOSUM62 or EDNAFULL).

$$
M(i,j) = \max \begin{cases} 
M(i-1, j-1) + S(a_i, b_j) \\
I_A(i-1, j-1) + S(a_i, b_j) \\
I_B(i-1, j-1) + S(a_i, b_j)
\end{cases}
$$

$$
I_A(i,j) = \max \begin{cases}
M(i-1, j) + g_o + g_e \\
I_A(i-1, j) + g_e
\end{cases}
$$

$$
I_B(i,j) = \max \begin{cases}
M(i, j-1) + g_o + g_e \\
I_B(i, j-1) + g_e
\end{cases}
$$

The final alignment score is $\max(M(m,n), I_A(m,n), I_B(m,n))$.

## 2. Local Alignment (Smith-Waterman)

The Smith-Waterman (1981) algorithm identifies the optimal local alignment (highest scoring sub-region). The recurrence is identical to Needleman-Wunsch with two critical modifications:

1. **Zero-truncation**: Negative scores are reset to zero, allowing the alignment path to restart anywhere.
2. **Global Maximum**: The traceback originates from the highest score found *anywhere* in the DP matrix, rather than strictly at $(m, n)$.

$$
M(i,j) = \max \begin{cases} 
0 \\
M(i-1, j-1) + S(a_i, b_j) \\
I_A(i-1, j-1) + S(a_i, b_j) \\
I_B(i-1, j-1) + S(a_i, b_j)
\end{cases}
$$

## 3. Heuristic Database Search (BLAST-like) & E-Values

For rapid, database-style scanning, BioAlign-Pro implements a seed-and-extend heuristic similar to the Basic Local Alignment Search Tool (BLAST).

### Karlin-Altschul Statistics
To determine if a local alignment score $S$ is biologically meaningful or arose by random chance, BioAlign-Pro calculates the **Expectation value (E-value)**. 

The E-value represents the number of distinct local alignments expected to achieve a score $\ge S$ by chance, given a search space size $m \times n$:

$$ E = K \cdot m \cdot n \cdot e^{-\lambda S} $$

Where:
- $m, n$ = lengths of the two sequences
- $S$ = raw alignment score
- $K, \lambda$ = Karlin-Altschul statistical parameters derived from the spatial properties of the scoring matrix and background compositional frequencies of the sequence type.

BioAlign-Pro utilizes strict thresholding, throwing a "No significant similarity" exception returning the NCBI-yellow warning state if $E > 10.0$.

## References
1. Needleman, S. B., & Wunsch, C. D. (1970). A general method applicable to the search for similarities in the amino acid sequence of two proteins. *Journal of molecular biology*, 48(3), 443-453.
2. Smith, T. F., & Waterman, M. S. (1981). Identification of common molecular subsequences. *Journal of molecular biology*, 147(1), 195-197.
3. Karlin, S., & Altschul, S. F. (1990). Methods for assessing the statistical significance of molecular sequence features by using general scoring schemes. *Proceedings of the National Academy of Sciences*, 87(6), 2264-2268.
