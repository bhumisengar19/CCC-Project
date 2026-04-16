import os
import ast
import difflib
import numpy as np
import spacy
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Initialize Flask app
app = Flask(__name__)
app.secret_key = "plagix_simple_secret_key"
CORS(app)

# Load SpaCy model for semantic analysis
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    # Fallback if model isn't downloaded yet (e.g., in CI or first run)
    import subprocess
    subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

# --- CORE LOGIC: PREPROCESSING ---
def preprocess_text(text):
    """
    Lowercase, remove punctuation, remove stopwords, and lemmatize.
    """
    doc = nlp(text.lower())
    tokens = [token.lemma_ for token in doc if not token.is_stop and not token.is_punct and not token.is_space]
    return " ".join(tokens)

# --- CORE LOGIC: SIMILARITY ALGORITHMS ---

def get_jaccard_similarity(str1, str2):
    """Intersection over Union of words."""
    a = set(str1.split())
    b = set(str2.split())
    intersection = len(a.intersection(b))
    union = len(a.union(b))
    return intersection / union if union > 0 else 0

def get_cosine_similarity(str1, str2):
    """TF-IDF based cosine similarity."""
    try:
        vectorizer = TfidfVectorizer().fit_transform([str1, str2])
        vectors = vectorizer.toarray()
        return cosine_similarity(vectors)[0][1]
    except Exception:
        return 0

def get_levenshtein_similarity(str1, str2):
    """Normalized ratio using difflib."""
    return difflib.SequenceMatcher(None, str1, str2).ratio()

def get_semantic_similarity(str1, str2):
    """Simple SpaCy document similarity (word vectors)."""
    doc1 = nlp(str1)
    doc2 = nlp(str2)
    if doc1.vector_norm and doc2.vector_norm:
        return doc1.similarity(doc2)
    return 0

def calculate_weighted_score(text1, text2):
    """
    final = 0.4*cosine + 0.3*jaccard + 0.3*levenshtein
    """
    # Preprocess for structural similarity
    clean1 = preprocess_text(text1)
    clean2 = preprocess_text(text2)
    
    cos = get_cosine_similarity(clean1, clean2)
    jac = get_jaccard_similarity(clean1, clean2)
    lev = get_levenshtein_similarity(text1, text2) # Use raw for Levenshtein structure
    
    weighted = (0.4 * cos) + (0.3 * jac) + (0.3 * lev)
    
    # Semantic check (as an additional insight)
    semantic = get_semantic_similarity(text1, text2)
    
    return {
        "score": round(weighted * 100, 1),
        "cosine": round(cos * 100, 1),
        "jaccard": round(jac * 100, 1),
        "levenshtein": round(lev * 100, 1),
        "semantic": round(semantic * 100, 1)
    }

# --- CORE LOGIC: CODE PLAGIARISM ---
def compare_code_ast(code1, code2):
    """Compare Python code structure using AST."""
    try:
        tree1 = ast.parse(code1)
        tree2 = ast.parse(code2)
        
        # Simple structural comparison (node types)
        nodes1 = [type(n).__name__ for n in ast.walk(tree1)]
        nodes2 = [type(n).__name__ for n in ast.walk(tree2)]
        
        ratio = difflib.SequenceMatcher(None, nodes1, nodes2).ratio()
        return round(ratio * 100, 1)
    except Exception:
        return 0

# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/auth')
def auth():
    return render_template('auth.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/results')
def results():
    return render_template('results.html')

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    t1 = data.get('text1', '')
    t2 = data.get('text2', '')
    mode = data.get('mode', 'text') # text or code
    
    if not t1 or not t2:
        return jsonify({"error": "Missing input text"}), 400
    
    if mode == 'code':
        score = compare_code_ast(t1, t2)
        return jsonify({"score": score, "mode": "code"})
    
    results = calculate_weighted_score(t1, t2)
    
    # Highlight logic (sentence level)
    sentences1 = [s.text.strip() for s in nlp(t1).sents]
    highlights = []
    for s in sentences1:
        if not s: continue
        # Find best match for this sentence in t2
        best_match = 0
        for s2 in [s_val.text.strip() for s_val in nlp(t2).sents]:
            if not s2: continue
            sim = get_levenshtein_similarity(s, s2)
            if sim > best_match:
                best_match = sim
        
        highlights.append({
            "text": s,
            "sim": round(best_match * 100, 1)
        })
        
    results['highlights'] = highlights
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, port=8000)
