from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import os
import json
import numpy as np
import difflib
import ast
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from flask_cors import CORS

app = Flask(__name__)
app.secret_key = "duply_secret_key_premium_2024"
CORS(app)

# --- Similarity Algorithms ---

def get_jaccard_sim(str1, str2):
    a = set(str1.lower().split())
    b = set(str2.lower().split())
    c = a.intersection(b)
    divisor = len(a.union(b))
    return float(len(c)) / divisor if divisor > 0 else 0

def get_levenshtein_sim(str1, str2):
    # Normalized Levenshtein similarity using difflib
    return difflib.SequenceMatcher(None, str1, str2).ratio()

def get_cosine_sim(str1, str2):
    try:
        vectorizer = TfidfVectorizer().fit_transform([str1, str2])
        vectors = vectorizer.toarray()
        return float(cosine_similarity(vectors)[0][1])
    except:
        return 0.0

def calculate_similarity(text1, text2):
    if not text1.strip() or not text2.strip():
        return 0.0, 0.0, 0.0, 0.0
    
    cosine = get_cosine_sim(text1, text2)
    jaccard = get_jaccard_sim(text1, text2)
    levenshtein = get_levenshtein_sim(text1, text2)
    
    # Weighted score: 0.4 cosine + 0.3 jaccard + 0.3 levenshtein
    final_score = (0.4 * cosine) + (0.3 * jaccard) + (0.3 * levenshtein)
    
    return round(final_score * 100, 2), round(cosine * 100, 2), round(jaccard * 100, 2), round(levenshtein * 100, 2)

# --- Code Plagiarism Detection ---

def compare_code_ast(code1, code2):
    try:
        tree1 = ast.parse(code1)
        tree2 = ast.parse(code2)
        
        # Simple structural comparison based on node counts/types
        nodes1 = [type(node).__name__ for node in ast.walk(tree1)]
        nodes2 = [type(node).__name__ for node in ast.walk(tree2)]
        
        matcher = difflib.SequenceMatcher(None, nodes1, nodes2)
        return round(matcher.ratio() * 100, 2)
    except Exception as e:
        print(f"AST Error: {e}")
        return 0.0

# --- Routes ---

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

@app.route('/api/check', methods=['POST'])
def check_plagiarism():
    data = request.json
    text1 = data.get('text1', '')
    text2 = data.get('text2', '')
    mode = data.get('mode', 'text') # text or code
    
    if mode == 'code':
        score = compare_code_ast(text1, text2)
        results = {
            "score": score,
            "cosine": 0,
            "jaccard": 0,
            "levenshtein": 0,
            "is_code": True
        }
    else:
        final, cos, jac, lev = calculate_similarity(text1, text2)
        results = {
            "score": final,
            "cosine": cos,
            "jaccard": jac,
            "levenshtein": lev,
            "is_code": False
        }
    
    # Generate highlights (simple sentence-level comparison)
    sentences1 = text1.split('.')
    highlights = []
    for s in sentences1:
        if len(s.strip()) < 5: continue
        # Find matches for each sentence in text2
        max_sentence_sim = 0
        for s2 in text2.split('.'):
            sim = get_levenshtein_sim(s, s2)
            if sim > max_sentence_sim:
                max_sentence_sim = sim
        
        highlights.append({
            "text": s.strip(),
            "score": round(max_sentence_sim * 100, 2)
        })

    results['highlights'] = highlights
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
