# 🔍 Plagix - Intelligent Plagiarism Checker

Plagix is a modern, web-based plagiarism detection tool built with Python (Flask) and Machine Learning techniques. It doesn't just look for generic word matches; it combines multiple algorithms to analyze structural similarity, sentence flow, and exact phrase copying to generate a comprehensive risk report.

## 🌟 Key Features
- **Multi-Algorithm Analysis:** Uses a weighted combination of 4 different text analysis algorithms.
- **File Upload Support:** Automatically extracts text from `.pdf`, `.docx`, and `.txt` files.
- **Code Plagiarism Detection:** Uses AST (Abstract Syntax Tree) parsing to detect structural code copying, even if variable names are changed.
- **Side-by-Side Diff:** Highlights exactly which words and sentences were matched using GitHub-style color coding.
- **Intelligent Risk Scoring:** Categorizes the similarity into Critical, High Risk, Medium Risk, or Low Risk with an AI-like reasoning explanation.
- **Authentication:** Secure user signup and login system (SQLite + SQLAlchemy).

---

## ⚙️ Algorithms Used

Plagix calculates an overall plagiarism score by combining the following algorithms:

### 1. KMP (Knuth-Morris-Pratt) String Matching (15% Weight)
*A classic Data Structures & Algorithms (DSA) technique.*
- **Why we use it:** To detect direct copy-pasting of exact phrases.
- **How it works:** It uses a "failure function" (prefix table) to efficiently search for 4-word chunks from the source text inside the target text in **O(n+m)** time. This is vastly faster than brute-force searching, making it highly effective for catching direct phrase plagiarism.
- *(See `KMP_EXPLANATION.md` for a full deep-dive into how this is implemented).*

### 2. Cosine Similarity via TF-IDF (35% Weight)
- Calculates the cosine of the angle between two vectors (representing the texts). Excellent for determining if two documents are discussing the same underlying topics, regardless of word order.

### 3. Jaccard Similarity (25% Weight)
- Measures the intersection of words over the union of words. High Jaccard scores indicate a massive overlap in vocabulary between the two texts.

### 4. Levenshtein Distance (25% Weight)
- Measures the minimum number of single-character edits (insertions, deletions, substitutions) required to change one word/sentence into another. Great for detecting "sneaky" paraphrasing where a few words are swapped out.

---

## 🚀 How to Run Locally

### Prerequisites
Make sure you have Python 3.8+ installed on your system.

### 1. Install Dependencies
Open your terminal and run:
```bash
pip install flask flask-sqlalchemy werkzeug scikit-learn numpy nltk PyPDF2 python-docx
```

### 2. Download NLTK Data
The app requires some natural language toolkits. Running the app will try to download them automatically, but you can also do it manually in Python:
```python
import nltk
nltk.download('stopwords')
nltk.download('wordnet')
```

### 3. Start the Server
Navigate to the project folder and run:
```bash
python app.py
```

### 4. Access the Web App
Open your browser and go to:  
👉 `http://127.0.0.1:8000`

---

## 📁 Project Structure

- `app.py`: The core backend server, routing, and algorithm logic (including KMP).
- `templates/`: Contains the HTML interface (`index.html`, `dashboard.html`, `auth.html`, etc.).
- `static/`: Contains the CSS, JS, and UI assets.
- `KMP_EXPLANATION.md`: A beginner-friendly, detailed walkthrough of the KMP algorithm implementation used in this project.
- `plagix.db`: SQLite database for user authentication.

---

*Developed as a Computer Science project demonstrating applied Data Structures, Algorithms, and Machine Learning.*
