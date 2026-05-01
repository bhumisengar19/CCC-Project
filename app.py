from flask import Flask, render_template, request, jsonify, session, redirect
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
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
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///plagix.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(250), nullable=False)

with app.app_context():
    db.create_all()

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

# ============================================================
# DSA ALGORITHM: KMP (Knuth-Morris-Pratt) String Matching
# ============================================================
# KMP finds how many times a 'pattern' appears in a 'text'
# efficiently in O(n + m) time using a 'failure function'.
# This is much better than the naive O(n*m) brute-force search.
# Here we use it on word lists (treating each word as a token).

def _kmp_failure_function(pattern):
    """Build the KMP failure (partial match) table for a pattern list."""
    m = len(pattern)
    fail = [0] * m  # fail[i] = length of longest proper prefix-suffix
    j = 0
    for i in range(1, m):
        while j > 0 and pattern[i] != pattern[j]:
            j = fail[j - 1]   # fall back using failure table
        if pattern[i] == pattern[j]:
            j += 1
        fail[i] = j
    return fail

def kmp_search(text_words, pattern_words):
    """Return list of start indices where pattern_words appears in text_words."""
    n, m = len(text_words), len(pattern_words)
    if m == 0 or n < m:
        return []
    fail = _kmp_failure_function(pattern_words)
    matches = []
    j = 0  # number of pattern chars matched so far
    for i in range(n):
        while j > 0 and text_words[i] != pattern_words[j]:
            j = fail[j - 1]   # partial match; fall back
        if text_words[i] == pattern_words[j]:
            j += 1
        if j == m:            # full pattern matched!
            matches.append(i - m + 1)
            j = fail[j - 1]   # look for next match
    return matches

def calculate_kmp_phrase_match(text1, text2, phrase_len=4):
    """
    Slide a window of `phrase_len` words across text1,
    use KMP to search each phrase in text2, and compute
    what fraction of text1's phrases appear in text2.
    Returns a score between 0.0 and 1.0.
    """
    words1 = [w.lower() for w in text1.split()]
    words2 = [w.lower() for w in text2.split()]
    if len(words1) < phrase_len or len(words2) < phrase_len:
        return 0.0
    total_phrases = len(words1) - phrase_len + 1
    matched_phrases = 0
    for i in range(total_phrases):
        pattern = words1[i: i + phrase_len]
        if kmp_search(words2, pattern):  # found at least once
            matched_phrases += 1
    return matched_phrases / total_phrases

def get_similarity_report(text1, text2):
    start_time = time.time()
    
    p1 = preprocess_text(text1)
    p2 = preprocess_text(text2)
    
    cosine = calculate_cosine(p1, p2)
    jaccard = calculate_jaccard(p1, p2)
    levenshtein = calculate_levenshtein(p1, p2)
    kmp_score = calculate_kmp_phrase_match(p1, p2)  # DSA: KMP phrase search
    
    # Combined weighted score (KMP contributes 15%, others adjusted)
    overall_score = (0.35 * cosine) + (0.25 * jaccard) + (0.25 * levenshtein) + (0.15 * kmp_score)
    
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

    # --- NEW INTELLIGENCE FEATURES ---
    
    # 1. AI Reasoning Explanation
    explanation = ""
    if overall_score > 0.75:
        explanation = "Critical similarity. Large sections of text appear copied directly, with significant structural overlap."
    elif cosine > 0.6 and jaccard < 0.4:
        explanation = "High structural similarity detected. The ideas and sentence order are very similar, even if words were slightly changed."
    elif jaccard > 0.6:
        explanation = "High word overlap. Many phrases and specific terms are reused directly from the source."
    elif overall_score > 0.4:
        explanation = "Moderate similarity. Significant paraphrasing detected or common industrial language used."
    else:
        explanation = "Low similarity. Content appears original with only generic phrase matches."

    # 2. Confidence Score
    # Agreement between algorithms increases confidence
    std_dev = np.std([cosine, jaccard, levenshtein])
    if std_dev < 0.1: confidence = "High"
    elif std_dev < 0.25: confidence = "Medium"
    else: confidence = "Low"

    # 3. Risk Level
    risk_level = "Low Risk"
    risk_color = "#10b981"
    if overall_score > 0.8: 
        risk_level = "Critical"
        risk_color = "#991b1b"
    elif overall_score > 0.6: 
        risk_level = "High Risk"
        risk_color = "#ef4444"
    elif overall_score > 0.3: 
        risk_level = "Medium Risk"
        risk_color = "#f59e0b"

    # 4. Side-by-Side HTML Diff (GitHub Style)
    s1_lines = text1.splitlines()
    s2_lines = text2.splitlines()
    diff_gen = difflib.HtmlDiff()
    html_diff = diff_gen.make_table(s1_lines, s2_lines, context=True, numlines=3)

    return {
        "overall_score": overall_score * 100,
        "risk": {
            "level": risk_level,
            "color": risk_color,
            "reasoning": explanation,
            "confidence": confidence
        },
        "metrics": {
            "cosine": cosine * 100,
            "jaccard": jaccard * 100,
            "levenshtein": levenshtein * 100,
            "kmp_phrase_match": kmp_score * 100
        },
        "insights": {
            "word_count": total_words,
            "matched_words": matched_count,
            "unique_percent": unique_percent,
            "time_ms": round(process_time * 1000),
            "code_structural_match": code_match
        },
        "diff": html_diff,
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
    return render_template('index.html', is_index=True)

@app.route('/auth')
def auth():
    return render_template('auth.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/profile')
def profile():
    if not session.get('logged_in'):
        return redirect('/auth')
        
    user = User.query.get(session.get('user_id'))
    return render_template('profile.html', user=user)

@app.route('/calculate', methods=['POST'])
def calculate():
    session['usage_count'] = session.get('usage_count', 0) + 1
    if not session.get('logged_in') and session['usage_count'] > 10:
        return jsonify({"error": "limit_reached"})

    data = request.json
    t1 = data.get('text1', '')
    t2 = data.get('text2', '')
    
    if not t1 or not t2:
        return jsonify({"error": "Empty input"}), 400
        
    report = get_similarity_report(t1, t2)
    
    report['usage'] = {
        'checks_used': session['usage_count'],
        'checks_limit': 10
    }
        
    return jsonify(report)

@app.route('/login_bypass', methods=['POST'])
def login_bypass():
    session['logged_in'] = True
    session['usage_count'] = 0
    return jsonify({"status": "success"})

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Missing credentials"}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Account already exists"}), 400
        
    new_user = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(new_user)
    db.session.commit()
    
    session['logged_in'] = True
    session['user_id'] = new_user.id
    session['usage_count'] = 0
    return jsonify({"success": True})

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password_hash, password):
        session['logged_in'] = True
        session['user_id'] = user.id
        session['usage_count'] = 0
        return jsonify({"success": True})
        
    return jsonify({"error": "Invalid email or password"}), 401

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

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
