# BioAlign-Pro: Pairwise Sequence Alignment Engine

BioAlign-Pro is a research-grade, interactive biological sequence alignment and analysis application designed for DNA, RNA, and protein sequences. It provides exact, mathematically calibrated sequence alignments equivalent to bioinformatics standard command-line tools—specifically **EMBOSS** (`needle`, `water`) and **NCBI BLAST+** (`blastp`, `blastn`).

The platform enables bioinformaticians, researchers, and students to explore, experiment with, and analyze the interplay between alignment algorithms, substitution scoring matrices, and gap penalty models.

---

## 🌟 What BioAlign-Pro: Pairwise Sequence Alignment Engine Does

BioAlign-Pro: Pairwise Sequence Alignment Engine computes pairwise alignments between biological sequences across multiple algorithmic paradigms:

1. **Global Alignment (Needleman-Wunsch)**
   * Computes the mathematically optimal end-to-end alignment across the entire length of both sequences.
   * Employs Gotoh three-state affine dynamic programming to deliver 100% score, gap, and traceback parity with EMBOSS `needle`.
   * Ideal for comparing homologous genes, closely related orthologs, or sequences of roughly equal length.

2. **Local Alignment (Smith-Waterman)**
   * Identifies the optimal regional sub-alignment with maximum sequence similarity, ignoring divergent or non-homologous flanking regions.
   * Employs zero-floor truncation and maximum-coordinate backtracking to match EMBOSS `water` bit-for-bit.
   * Ideal for finding conserved motifs, shared functional domains, or aligning fragments within disparate length sequences.

3. **BLAST-like Seed-and-Extend Heuristic**
   * Employs biological $k$-mer word seeding, neighborhood expansion based on score thresholds ($T$), two-way gapless extension with dynamic $X$-dropoff bounding, and banded alignment.
   * Computes genuine **Karlin-Altschul statistics**, calculating real asymptotic Bit Scores and expect values ($E$-values).
   * Ideal for simulating NCBI database search heuristics and studying fast localized sequence queries.

---

## 🎛️ Parameters & Combinatorial Experimentation

BioAlign-Pro provides full freedom to configure and test any parameter combination, observing in real time how parameter changes affect alignment score, identity percentage, positive similarity, gap distribution, and traceback paths.

### 1. Sequence Types & Biological Validation
* **Protein Sequences**: Supports 20 standard amino acid residues. Automated biological validation guards against illegal characters, whitespace, numeric digits, and non-canonical symbols.
* **Nucleotide Sequences (DNA / RNA)**: Supports canonical bases (`A`, `C`, `G`, `T`, `U`). Cross-type residue checking prevents protein residues (e.g., `M`, `W`, `F`, `L`) from being processed in nucleotide modes.

### 2. Substitution Scoring Matrices
The choice of substitution matrix defines the evolutionary model and distance between sequences:
* **BLOSUM Series (Henikoff & Henikoff)**:
  * **BLOSUM62**: The gold standard for general protein sequence alignment (ideal for ~62% sequence identity).
  * **BLOSUM80 / BLOSUM90**: Tailored for closely related sequences with high conservation.
  * **BLOSUM45 / BLOSUM50**: Calibrated for divergent sequences and ancient evolutionary relationships.
* **PAM Series (Dayhoff et al.)**:
  * **PAM30 / PAM70**: Suited for closely related sequences (short evolutionary time frames).
  * **PAM250**: Optimized for distant evolutionary homolog detection.
* **Nucleotide Scoring Schemes**:
  * **DNAFULL / EDNAFULL**: Standard +5 match / -4 mismatch scoring system.
  * **BLASTN Standards**: Standard +1 match / -2 mismatch or +1 match / -3 mismatch schemes.
  * **Custom Match & Mismatch Values**: Full flexibility to test arbitrary user-defined positive match rewards and negative mismatch penalties.

### 3. Gap Models & Penalty Dynamics
Gaps represent insertion and deletion (indel) events that occur during biological evolution. BioAlign-Pro allows exhaustive experimentation with how indels are penalized:

* **Affine Gap Model (Gotoh 3-State Recurrence)**:
  $$\text{Gap Cost} = \text{Gap Open} + (k - 1) \times \text{Gap Extend}$$
  * **Gap Open**: The primary energetic penalty charged for creating a new insertion/deletion event. Higher values force the algorithm to minimize the total number of indels.
  * **Gap Extend**: The reduced penalty for lengthening an existing gap. Lower extension penalties encourage the algorithm to clump indels into continuous contiguous gaps rather than scattering individual gap spaces.
  * **Preset Configurations**: Test EMBOSS defaults (e.g., Open 10.0, Extend 0.5) vs. NCBI BLAST integer presets (e.g., Open 11, Extend 1; or Open 15, Extend 2).

* **Linear Gap Model (Single Penalty)**:
  $$\text{Gap Cost} = k \times \text{Gap Penalty}$$
  * Applies an identical per-residue penalty regardless of whether a gap is opened or extended.

* **Terminal End-Gap Penalization Toggle**:
  * **Penalized Terminal Gaps**: Standard global alignment where terminal overhanging gaps incur the full gap penalty.
  * **Free Terminal Gaps**: Semi-global alignment where leading and trailing end gaps are not penalized, making it easy to align a short sequence (e.g., a primer, probe, or single exon) against a long genomic sequence without severe penalty distortion.

### 4. BLAST Heuristic Controls
* **Word Size ($W$)**: Defines the seed $k$-mer length ($W=3$ for proteins, $W=11$ for DNA).
* **Neighborhood Threshold ($T$)**: Minimum scoring threshold for adjacent seed variants to be considered hits.
* **$X$-Dropoff**: The distance below the maximum achieved score that an extension is permitted to drift before being terminated.
* **$E$-Value Cutoff**: Mathematical threshold filtering alignments by statistical significance.

---

## 🔬 Interactive Exploration & Visual Telemetry

* **Dynamic Programming Heatmap**: Interactive score table visualization displaying local peaks, cumulative forward scores, and Gotoh traceback routes.
* **Conservation & Identity Bar**: Visual per-residue conservation tracks highlighting identical residues (`|`), conservative mutations (`:`), semi-conservative mutations (`.`), and gap indels.
* **Statistical Cards**: Real-time readouts of Alignment Length, Raw Score, Bit Score, $E$-Value, Identity %, Similarity (Positives) %, and Gap Count.
* **Standard Formats Export**: Export results directly to EMBOSS `.pair` alignment reports, multi-line FASTA files, or raw JSON datasets for external pipelines.

---

## 🚀 Quick Start

You can run BioAlign-Pro locally with either `npm` or `pnpm`:

```bash
# Clone the repository
git clone https://github.com/sid0sid-ops/BioAlign-Pro-Pairwise-Sequence-Alignment.git
cd BioAlign-Pro-Pairwise-Sequence-Alignment

# Install dependencies (using npm or pnpm)
npm install
# or
pnpm install

# Start the local browser development server
npm run dev
# or
pnpm dev
```

---

## 👨‍🔬 Authors & Acknowledgements

Siddharth Tripathi  
M.Sc. Centre for Systems Biology & Bioinformatics, Panjab University.

Acknowledgements:  
Special acknowledgement and gratitude to Dr. Ashok Kumar (Assistant Professor, Panjab University) for continued expert guidance, academic structure, and foundational instruction throughout the course of this biological engineering.
