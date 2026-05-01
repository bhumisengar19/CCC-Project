# CCC Project - Plagiarism Detection System

The **CCC Project** is an advanced web-based Plagiarism Checker designed to analyze and compare text documents for similarities. While it utilizes multiple scoring algorithms (Cosine Similarity, Jaccard Index, Levenshtein Distance), the core focus and most efficient component of our direct phrase matching is powered by the **KMP (Knuth-Morris-Pratt) Algorithm**.

---

## 🔍 Core Algorithm: KMP (Knuth-Morris-Pratt)

### What is KMP?
The **Knuth-Morris-Pratt (KMP)** algorithm is a highly efficient string pattern matching algorithm invented in 1977. 

In the context of this plagiarism checker, KMP is used to accurately and quickly detect **exact phrase repetitions** (direct copy-pasting) between two bodies of text. 

### Why Use KMP? (The Problem with Brute Force)
If we want to check if a specific phrase from Document A exists in Document B, the naive "brute force" approach would be to check every single starting word in Document B.
- **Brute Force Time Complexity:** `O(n × m)` (where `n` is text length, `m` is phrase length).
- **KMP Time Complexity:** **`O(n + m)`**

KMP achieves this massive speedup by never re-evaluating characters (or words) that it has already matched. It uses a **"Failure Function"** (or Prefix Table).

---

## 🧠 The Failure Function (Prefix Table)

The secret weapon of KMP is the `fail[]` array. Before we even look at the main text, KMP pre-processes the pattern we are looking for.

It answers the question: *"If a mismatch occurs at word X, how far back should I jump without missing any potential matches?"*

**Example Pattern:** `["the", "cat", "sat", "the", "cat"]`

| Index | Word  | fail[] | Reason |
|-------|-------|--------|--------|
| 0     | "the" | 0      | No prefix/suffix possible |
| 1     | "cat" | 0      | "the","cat" has no matching prefix/suffix |
| 2     | "sat" | 0      | No match |
| 3     | "the" | 1      | Prefix "the" matches suffix "the" (length 1) |
| 4     | "cat" | 2      | Prefix "the","cat" matches suffix "the","cat" (length 2) |

If we match the first 4 words but fail on the 5th, KMP knows it doesn't need to start all over. It knows the prefix `["the", "cat"]` is already valid and just shifts the pattern optimally.

---

## 💻 How It Is Used in This Project

In `app.py`, KMP is implemented to find direct 4-word copied chunks between `Text 1` and `Text 2`. It contributes a specific **15% weight** to the final plagiarism score.

The implementation is broken down into three main functions:

1. **`_kmp_failure_function(pattern)`**
   Builds the partial match table for the chunk of text we are checking.

2. **`kmp_search(text_words, pattern_words)`**
   Uses the built table to perform the linear `O(n + m)` search through the target document. Returns the exact index positions of matches.

3. **`calculate_kmp_phrase_match(text1, text2)`**
   Slides a 4-word window across the original document, calling `kmp_search` for each window against the second document. It calculates what percentage of the document was directly copy-pasted.

### Summary of Algorithm Benefits for Plagiarism:
- **Catches direct plagiarism:** Identifies exactly where text was copy-pasted.
- **High Performance:** `O(n+m)` allows the server to compare thousands of words in milliseconds.
- **Language Aware:** By tokenizing into words first, it ignores spacing issues and focuses on actual structural copying.
