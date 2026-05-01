# 📘 KMP Algorithm — Full Explanation
### Used in: `app.py` (Plagiarism Checker Project)

---

## 📌 What is KMP?

**KMP stands for Knuth-Morris-Pratt** — named after the three computer scientists who invented it (Donald Knuth, James Morris, Vaughan Pratt) in **1977**.

It is a **string pattern matching algorithm**.

> **Simple definition:** Given a long text and a short pattern, KMP efficiently finds ALL positions where the pattern appears inside the text.

---

## ❓ Why Not Just Use Brute Force?

The naive (brute-force) way to search for a pattern in text:

```
For every position i in text:
    Check if pattern matches starting at i
    If mismatch → go back and try position i+1
```

### Problem with brute force:
- If text has **n** words and pattern has **m** words
- Worst case: **O(n × m)** comparisons
- Example: text = 10,000 words, pattern = 50 words → up to **500,000 comparisons**!

### KMP Solution:
- Uses a **"failure function"** to avoid re-checking characters we already matched
- Worst case: **O(n + m)** — just one pass through the text + one pass to build the table
- Same example: only ~**10,050 comparisons** ✅

---

## 🧠 Core Concept: The Failure Function (Prefix Table)

This is the heart of KMP. It pre-processes the **pattern** to find:

> *"If a mismatch happens at position j in the pattern, how far back do I jump — without missing any possible match?"*

### How it works — Step by Step:

Suppose our pattern (as words) is:
```
["the", "cat", "sat", "the", "cat"]
  [0]    [1]    [2]    [3]    [4]
```

The failure table `fail[]` stores:
> *"The length of the longest proper prefix of pattern[0..i] that is also a suffix."*

| Index | Word  | fail[] | Reason |
|-------|-------|--------|--------|
| 0     | "the" | 0      | No prefix/suffix possible for 1 element |
| 1     | "cat" | 0      | "the","cat" has no prefix = suffix |
| 2     | "sat" | 0      | No match |
| 3     | "the" | 1      | prefix["the"] = suffix["the"] → length 1 |
| 4     | "cat" | 2      | prefix["the","cat"] = suffix["the","cat"] → length 2 |

So `fail = [0, 0, 0, 1, 2]`

**What this means:** If we match 4 words of the pattern but fail at word 5, instead of restarting from scratch, we jump back to position `fail[3] = 1`. We already know the first 1 word still matches!

---

## 🔍 How the KMP Search Works

```
text    = ["I", "saw", "the", "cat", "sat", "on", "the", "cat", "mat"]
pattern = ["the", "cat", "sat"]
```

**Step-by-step:**

```
i=0 (text="I"),   j=0 (pat="the") → no match, i++
i=1 (text="saw"), j=0 (pat="the") → no match, i++
i=2 (text="the"), j=0 (pat="the") → MATCH, j++
i=3 (text="cat"), j=1 (pat="cat") → MATCH, j++
i=4 (text="sat"), j=2 (pat="sat") → MATCH, j++
j == len(pattern) → ✅ FOUND at index i - m + 1 = 4 - 3 + 1 = 2
```

Pattern found starting at position **2** ("the cat sat")!

---

## 📂 Where Is It Used in `app.py`?

Three functions were added, all clearly marked with the `# DSA ALGORITHM: KMP` comment block:

---

### 1. `_kmp_failure_function(pattern)` — builds the prefix table

```python
def _kmp_failure_function(pattern):
    """Build the KMP failure (partial match) table for a pattern list."""
    m = len(pattern)
    fail = [0] * m
    j = 0
    for i in range(1, m):
        while j > 0 and pattern[i] != pattern[j]:
            j = fail[j - 1]   # fall back using failure table
        if pattern[i] == pattern[j]:
            j += 1
        fail[i] = j
    return fail
```

**What it does:** Builds the prefix/failure table for a given pattern (list of words).  
**Called by:** `kmp_search()`

---

### 2. `kmp_search(text_words, pattern_words)` — finds all matches

```python
def kmp_search(text_words, pattern_words):
    """Return list of start indices where pattern_words appears in text_words."""
    n, m = len(text_words), len(pattern_words)
    if m == 0 or n < m:
        return []
    fail = _kmp_failure_function(pattern_words)
    matches = []
    j = 0
    for i in range(n):
        while j > 0 and text_words[i] != pattern_words[j]:
            j = fail[j - 1]   # partial match; fall back
        if text_words[i] == pattern_words[j]:
            j += 1
        if j == m:            # full pattern matched!
            matches.append(i - m + 1)
            j = fail[j - 1]   # look for overlapping matches too
    return matches
```

**What it does:** Uses the failure table to scan through text and find all positions where the pattern appears.  
**Returns:** A list of starting indices (empty list = not found).

---

### 3. `calculate_kmp_phrase_match(text1, text2, phrase_len=4)` — the plagiarism scorer

```python
def calculate_kmp_phrase_match(text1, text2, phrase_len=4):
    words1 = [w.lower() for w in text1.split()]
    words2 = [w.lower() for w in text2.split()]
    total_phrases = len(words1) - phrase_len + 1
    matched_phrases = 0
    for i in range(total_phrases):
        pattern = words1[i : i + phrase_len]   # take 4-word chunk
        if kmp_search(words2, pattern):         # search in text2
            matched_phrases += 1
    return matched_phrases / total_phrases
```

**What it does:**
1. Takes every 4-word sliding window from `text1`
2. Uses KMP to search for that exact 4-word phrase in `text2`
3. Returns: `matched_phrases / total_phrases` → a score from 0.0 to 1.0

**Called by:** `get_similarity_report()` — contributes **15%** to the final plagiarism score.

---

### 4. Inside `get_similarity_report()` — score wired in

```python
kmp_score = calculate_kmp_phrase_match(p1, p2)  # DSA: KMP phrase search

# Combined weighted score (KMP contributes 15%)
overall_score = (0.35 * cosine) + (0.25 * jaccard) + (0.25 * levenshtein) + (0.15 * kmp_score)
```

And returned in the API JSON response:
```python
"metrics": {
    "cosine":           cosine * 100,
    "jaccard":          jaccard * 100,
    "levenshtein":      levenshtein * 100,
    "kmp_phrase_match": kmp_score * 100   # ← KMP result shown here
}
```

---

## 🎯 Why KMP Fits a Plagiarism Checker?

| Reason | Explanation |
|--------|-------------|
| **Exact phrase detection** | KMP finds *exact* 4-word chunks copied from one text into another — the most direct sign of plagiarism |
| **Efficient** | O(n+m) is perfect for comparing large documents |
| **Works on words, not characters** | We tokenize text into words first, making it more meaningful for language |
| **Complements other algorithms** | Cosine/Jaccard/Levenshtein measure overall similarity; KMP catches *specific copied phrases* |
| **Case-insensitive** | All words are lowercased before matching, so "The Cat" = "the cat" |

---

## ⚖️ Complexity Comparison

| Algorithm | Time Complexity | Space |
|-----------|----------------|-------|
| Brute Force Search | O(n × m) | O(1) |
| **KMP Search** | **O(n + m)** | O(m) for failure table |

Where:
- `n` = number of words in text
- `m` = number of words in pattern (4 in our case)

---

## 🗂️ Summary Flow in the Project

```
User submits Text1 + Text2
        ↓
preprocess_text() → lowercase, remove stopwords
        ↓
┌────────────────────────────────────────────────┐
│  calculate_cosine()       → 35% of score       │
│  calculate_jaccard()      → 25% of score       │
│  calculate_levenshtein()  → 25% of score       │
│  calculate_kmp_phrase_match() → 15%  ← KMP!   │
└────────────────────────────────────────────────┘
        ↓
overall_score = weighted average of all 4
        ↓
Return risk level, metrics, highlights to frontend
```

---

## ✅ Quick Recap for Viva

1. **KMP** = efficient string/pattern matching algorithm invented in 1977
2. **Key innovation** = the **failure function** avoids re-scanning already-matched characters
3. **Time complexity** = O(n + m) vs brute force O(n × m)
4. **In this project** = detects exact 4-word phrases copied between two documents
5. **Score contribution** = 15% of the final plagiarism score via `kmp_phrase_match`
6. **3 functions** = `_kmp_failure_function` → `kmp_search` → `calculate_kmp_phrase_match`
