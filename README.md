# 🧬 BioAlign-Pro — Research-Grade Pairwise Sequence Alignment

> A publication-standard bioinformatics web application for pairwise DNA and protein sequence alignment using Needleman-Wunsch, Smith-Waterman, and BLAST-like heuristics. Integrates directly with the NCBI database, calculates exact Karlin-Altschul statistics, and supports Open Science reproducible exports.

[![Scientific Validation](https://github.com/sid0sid-ops/BioAlign-Pro-Pairwise-Sequence-Alignment/actions/workflows/ci.yml/badge.svg)](https://github.com/sid0sid-ops/BioAlign-Pro-Pairwise-Sequence-Alignment/actions)

---

## 👤 Authorship & Attribution

| Role | Name |
|---|---|
| **Designed & Developed by** | **Siddharth Tripathi** |
| **Under the Guidance of** | **Name:** Ashok Kumar (PhD) |
| | **Title:** Assistant Professor |
| | **Affiliation:** Systems Biology & Bioinformatics |
| | Panjab University, Chandigarh – 160014, INDIA |

---

## 📖 Navigation (Diátaxis Framework)

This documentation is organized according to the **Diátaxis** standard for research software:

1. [**Tutorials**](#1-tutorials): Step-by-step guides for learning the software.
2. [**How-To Guides**](#2-how-to-guides): Goal-oriented instructions for specific tasks.
3. [**Explanation (Theory)**](#3-explanation): High-level discussions of the underlying science.
4. [**Reference**](#4-reference): Technical specifications, matrices, and parameters.
5. [**Open Science & Transparency**](#5-open-science--transparency): Data availability and reproducibility checklists.

---

## 1. Tutorials

### Quick Start: Running Your First Alignment
1. Open the [**Live Application**](https://sid0sid-ops.github.io/BioAlign-Pro-Pairwise-Sequence-Alignment/).
2. Select **Protein** or **DNA/RNA** at the top.
3. Click the **Global Alignment** (Needleman-Wunsch) card.
4. In Sequence 1, click **NCBI** and enter `NP_000508.1` (Human Hemoglobin Alpha).
5. In Sequence 2, click **NCBI** and enter `NP_000509.1` (Human Hemoglobin Beta).
6. Click **Compute Alignment**. The system will mathematically align both sequences, compute the evolutionary distance, and render the interactive Dynamic Programming (DP) matrix.

### Recreating the Environment Locally (Docker)
To satisfy the "Reproducibility" tenet of open science, the entire environment is Dockerized.
```bash
# Clone the repository
git clone https://github.com/sid0sid-ops/BioAlign-Pro-Pairwise-Sequence-Alignment.git
cd BioAlign-Pro-Pairwise-Sequence-Alignment

# Build and run the isolated research environment
docker build -t bioalign-pro .
docker run -p 8080:80 bioalign-pro
```
The site will be available at `http://localhost:8080`.

---

## 2. How-To Guides

### How to filter results by E-Value
When performing a **BLAST-like Search**, the system mimics NCBI's heuristic pipeline.
1. Select **BLAST-like Search**.
2. Open the **Parameters** sidebar.
3. Under **Expect Threshold**, set your desired scientific cutoff (e.g., `0.05`).
4. Any alignment that yields an E-value greater than this threshold will be rigorously rejected, displaying the standard *"No significant similarity found"* warning.

### How to export data for publication
1. After successfully computing an alignment, scroll to the **Export & Validation** section.
2. Click **Download FASTA** to download the sequence alignment formatted with rich headers containing the Algorithm, Matrix, Score, Bit-Score, E-Value, Gap Math, and Identity.
3. Click **Download Raw DP Matrix (CSV)** to export the integer values of the underlying mathematical lattice for independent verification in R or Python.

---

## 3. Explanation

### Gap Mathematics (Linear vs. Affine)
This application supports two foundational gap penalty models, ensuring strict parity with both the EMBOSS suite and NCBI BLAST.
*   **Affine Gap Model (EMBOSS):** Evaluated strictly as `G_open + (k-1)G_ext`. Ideal for high-precision Needleman-Wunsch/Smith-Waterman computations where the initiation of a gap is phylogenetically rare, but extension is common.
*   **Linear Gap Model (NCBI):** Evaluated strictly as `G_open + k*G_ext`. This is required for BLAST heuristic modes, as the Karlin-Altschul (KA) statistical parameters ($`\lambda`$, $`K`$) are exclusively mathematically defined under this linearity.

### Karlin-Altschul Statistics
For local alignments, BioAlign-Pro calculates statistical significance utilizing the Karlin-Altschul parameters pre-calculated for standardized scoring matrices (e.g., BLOSUM62 with 11/1 gap costs). The raw alignment score $`S`$ is normalized into a Bit-Score $`S'`$, which is independent of the scoring system and sequence lengths:
$$S' = \frac{\lambda S - \ln K}{\ln 2}$$
The E-value $`E`$ represents the number of distinct local alignments expected by chance:
$$E = m n 2^{-S'}$$

---

## 4. Reference

### Supported Scoring Matrices
BioAlign-Pro natively supports and dynamically interpolates the following standardized evolutionary matrices:
*   **Protein:** `BLOSUM45`, `BLOSUM50`, `BLOSUM62` (Default), `BLOSUM80`, `BLOSUM90`, `PAM30`, `PAM70`, `PAM250`.
*   **Nucleotide:** `DNAFULL` (EMBOSS standard), `BLASTN` (Rigorous NCBI matching).

### Continuous Integration (CI/CD)
The repository uses GitHub Actions (`.github/workflows/ci.yml`) to run automated, rigorous validation on every push:
*   `test:dp`: Verifies the 2D matrix traversal pathways.
*   `test:score`: Checks DP mathematical outputs against established Needleman/Waterman benchmarks.
*   `test:standards`: Assesses code adherence to algorithmic contracts.

---

## 5. Open Science & Transparency

### Transparency Checklist (TOP Guidelines)
This project adheres to the Transparency and Openness Promotion (TOP) guidelines:
- [x] **Data Citation:** All scoring matrix tables are explicitly derived from the NCBI and EMBOSS public repositories.
- [x] **Analytical Code Transparency:** The dynamic programming algorithms (`algorithms/`) are entirely open-source, heavily commented, and isolated from UI logic.
- [x] **Environment Reproducibility:** A multi-stage `Dockerfile` is provided for guaranteed execution fidelity.
- [x] **Methodological Transparency:** Gap formulas and E-value derivations are fully documented in the *Explanation* section.

### Data Availability Statement
The substitution matrices (e.g., BLOSUM62, PAM250) embedded in `core/scoringMatricesData.js` were sourced directly from the [NCBI FTP server](https://ftp.ncbi.nlm.nih.gov/blast/matrices/). The Karlin-Altschul statistical constants ($`\lambda`$, $`K`$, $`H`$) utilized in `metrics/karlinParams.js` adhere to the published parameters corresponding to respective matrix-gap combinations. No proprietary or closed-source data is used in the computation of E-values or Bit-Scores.
