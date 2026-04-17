from flask import Flask, render_template, request, jsonify, session
import re
import time
import difflib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import PyPDF2
import docx
import ast

# Ensure NLTK packages are downloaded
try:
    nltk.data.find('corpora/stopwords')
except:
    nltk.download('stopwords')
    nltk.download('wordnet')

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))


app = Flask(__name__)
app.secret_key = 'plagix_super_secret_dev_key'

# --- Plagiarism Logic ---

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    words = text.split()
    words = [lemmatizer.lemmatize(w) for w in words if w not in stop_words]
    return " ".join(words)

def calculate_jaccard(str1, str2):
    a = set(str1.split())
    b = set(str2.split())
    if not a or not b: return 0
    c = a.intersection(b)
    return float(len(c)) / (len(a) + len(b) - len(c))

def calculate_levenshtein(str1, str2):
    # Returns a ratio of similarity based on edits
    return difflib.SequenceMatcher(None, str1, str2).ratio()

def calculate_cosine(str1, str2):
    try:
        tfidf = TfidfVectorizer().fit_transform([str1, str2])
        return cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
    except:
        return 0

def get_ast_structure(code):
    try:
        tree = ast.parse(code)
        structure = []
        for node in ast.walk(tree):
            structure.append(node.__class__.__name__)
        return " ".join(structure)
    except Exception:
        return None

def highlight_matches(text1, text2):
    # Generates side-by-side highlighted HTML
    words1 = text1.split()
    words2 = text2.split()
    
    matcher = difflib.SequenceMatcher(None, words1, words2)
    
    hlt1 = []
    hlt2 = []
    matched_words_count = 0
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        w1_chunk = " ".join(words1[i1:i2])
        w2_chunk = " ".join(words2[j1:j2])
        
        if tag == 'equal':
            match_len = i2 - i1
            if match_len > 10:
                intensity = "high-match"
            elif match_len > 4:
                intensity = "mid-match"
            else:
                intensity = "low-match"
                
            if w1_chunk: hlt1.append(f'<span class="match-highlight {intensity}">{w1_chunk}</span>')
            if w2_chunk: hlt2.append(f'<span class="match-highlight {intensity}">{w2_chunk}</span>')
            matched_words_count += match_len
        elif tag == 'replace':
            if w1_chunk: hlt1.append(w1_chunk)
            if w2_chunk: hlt2.append(w2_chunk)
        elif tag == 'delete':
            if w1_chunk: hlt1.append(w1_chunk)
        elif tag == 'insert':
            if w2_chunk: hlt2.append(w2_chunk)
            
    return " ".join(hlt1), " ".join(hlt2), matched_words_count

def get_sentence_level_similarity(text1, text2):
    sentences1 = [s.strip() for s in re.split(r'[.!?\n]+', text1) if len(s.strip()) > 10]
    sentences2 = [s.strip() for s in re.split(r'[.!?\n]+', text2) if len(s.strip()) > 10]
    
    results = []
    for s1 in sentences1:
        best_score = 0
        p1 = preprocess_text(s1)
        for s2 in sentences2:
            p2 = preprocess_text(s2)
            score = calculate_levenshtein(p1, p2)
            if score > best_score:
                best_score = score
        if best_score > 0.2:
            results.append({"sentence": s1, "score": round(best_score * 100)})
    
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:5]

def get_exact_matched_phrases(text1, text2, min_words=4):
    words1 = text1.split()
    words2 = text2.split()
    
    matcher = difflib.SequenceMatcher(None, [w.lower() for w in words1], [w.lower() for w in words2])
    phrases = []
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal' and (i2 - i1) >= min_words:
            phrases.append(" ".join(words1[i1:i2]))
    return list(set(phrases))[:5]

def get_similarity_report(text1, text2):
    start_time = time.time()
    
    p1 = preprocess_text(text1)
    p2 = preprocess_text(text2)
    
    cosine = calculate_cosine(p1, p2)
    jaccard = calculate_jaccard(p1, p2)
    levenshtein = calculate_levenshtein(p1, p2)
    
    # Combined weighted score
    overall_score = (0.4 * cosine) + (0.3 * jaccard) + (0.3 * levenshtein)
    
    # Detailed highlights and insights
    t1_highlighted, t2_highlighted, matched_count = highlight_matches(text1, text2)
    
    words1_len = len(text1.split())
    words2_len = len(text2.split())
    total_words = max(words1_len, words2_len)
    
    unique_percent = max(100 - (overall_score * 100), 0)
    process_time = time.time() - start_time
    
    # 💎 WOW Feature: AST Code Plagiarism Check
    ast1 = get_ast_structure(text1)
    ast2 = get_ast_structure(text2)
    code_match = None
    if ast1 and ast2:
        code_match = round(calculate_levenshtein(ast1, ast2) * 100)

    return {
        "overall_score": overall_score * 100,
        "metrics": {
            "cosine": cosine * 100,
            "jaccard": jaccard * 100,
            "levenshtein": levenshtein * 100
        },
        "insights": {
            "word_count": total_words,
            "matched_words": matched_count,
            "unique_percent": unique_percent,
            "time_ms": round(process_time * 1000),
            "code_structural_match": code_match
        },
        "highlights": {
            "text1": t1_highlighted,
            "text2": t2_highlighted
        },
        "advanced": {
            "sentences": get_sentence_level_similarity(text1, text2),
            "phrases": get_exact_matched_phrases(text1, text2)
        }
    }

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

@app.route('/calculate', methods=['POST'])
def calculate():
    if not session.get('logged_in'):
        session['usage_count'] = session.get('usage_count', 0) + 1
        if session['usage_count'] > 5:
            return jsonify({"error": "limit_reached"})

    data = request.json
    t1 = data.get('text1', '')
    t2 = data.get('text2', '')
    
    if not t1 or not t2:
        return jsonify({"error": "Empty input"}), 400
        
    report = get_similarity_report(t1, t2)
    
    if not session.get('logged_in'):
        report['usage'] = {
            'checks_used': session['usage_count'],
            'checks_limit': 5
        }
        
    return jsonify(report)

@app.route('/login_bypass', methods=['POST'])
def login_bypass():
    session['logged_in'] = True
    session['usage_count'] = 0
    return jsonify({"status": "success"})

@app.route('/extract_text', methods=['POST'])
def extract_text():
    file = request.files.get('file')
    if not file: return jsonify({"error": "No file"}), 400
    
    text = ""
    filename = file.filename.lower()
    
    try:
        if filename.endswith('.pdf'):
            pdf = PyPDF2.PdfReader(file)
            text = " ".join([page.extract_text() for page in pdf.pages])
        elif filename.endswith('.docx'):
            doc = docx.Document(file)
            text = " ".join([p.text for p in doc.paragraphs])
        else:
            text = file.read().decode('utf-8', errors='ignore')
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=8000, debug=True)
