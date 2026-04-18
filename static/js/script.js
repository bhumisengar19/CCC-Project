/**
 * PLAGIX Living Interface & Interaction Physics
 */

const state = {
    mouse: { x: 0, y: 0 },
    glow: { x: 0, y: 0 }
};

// --- Core Interaction Loop ---
function initInteractions() {
    const mouseGlow = document.querySelector('.mouse-glow');
    const sky = document.querySelector('.sky-background');
    const cards = document.querySelectorAll('.card');
    const magneticBtns = document.querySelectorAll('.btn');

    window.addEventListener('mousemove', (e) => {
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;
    });

    const update = () => {
        // 1. Mouse Glow Tracking
        state.glow.x += (state.mouse.x - state.glow.x) * 0.15;
        state.glow.y += (state.mouse.y - state.glow.y) * 0.15;
        if (mouseGlow) {
            mouseGlow.style.left = `${state.glow.x}px`;
            mouseGlow.style.top = `${state.glow.y}px`;
        }

        // 2. Parallax Effect (Sky & Clouds)
        const moveX = (state.mouse.x - window.innerWidth / 2) * 0.01;
        const moveY = (state.mouse.y - window.innerHeight / 2) * 0.01;
        if (sky) {
            sky.style.transform = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
        }

        requestAnimationFrame(update);
    };
    update();

    // 3. Magnetic Interaction for Buttons
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = (e.clientX - centerX) * 0.3;
            const deltaY = (e.clientY - centerY) * 0.3;
            
            btn.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = `translate(0, 0)`;
        });
    });

    // 4. Card Tilt Interaction
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const rotateY = (e.clientX - centerX) / (rect.width / 2) * 5; // Max 5 deg
            const rotateX = (centerY - e.clientY) / (rect.height / 2) * 5; // Max 5 deg
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
        });
    });
}

// --- Theme & Environment Logic ---
function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', target);
    localStorage.setItem('plagix_theme', target);
}

function generateStars() {
    const layer = document.getElementById('starsLayer');
    if (!layer) return;
    layer.innerHTML = '';
    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.width = `${Math.random() * 2 + 1}px`;
        star.style.height = star.style.width;
        star.style.animationDelay = `${Math.random() * 3}s`;
        layer.appendChild(star);
    }
}

// Initialization
(function init() {
    const saved = localStorage.getItem('plagix_theme') || 'light';
    document.body.setAttribute('data-theme', saved);
    generateStars();
    initInteractions();
})();

// --- Comparison Engine & Smart UX ---

// Smart Elements
const t1 = document.getElementById('text1');
const t2 = document.getElementById('text2');
const indicator = document.getElementById('typingIndicator');
const btn = document.getElementById('analyzeBtn');
const btnText = document.getElementById('analyzeBtnText');
const resultsContainer = document.getElementById('resultsContainer');

// 1. Live Feedback (Debounced)
let typingTimer;
const doneTypingInterval = 800; // 800ms

function showIndicator() {
    indicator.style.opacity = '1';
    indicator.innerText = 'Analyzing...';
}

function doneTyping() {
    if (t1.value.length > 0 && t2.value.length > 0) {
        indicator.innerText = 'Ready to Scan';
        setTimeout(() => indicator.style.opacity = '0', 2000);
    } else {
        indicator.style.opacity = '0';
    }
}

t1.addEventListener('input', () => {
    clearTimeout(typingTimer);
    showIndicator();
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
});

t2.addEventListener('input', () => {
    clearTimeout(typingTimer);
    showIndicator();
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
});

// 2. Drag and Drop & Manual Browse (Premium)
const dropZone = document.getElementById('dropZone');
const fileUpload = document.getElementById('fileUpload');

// Shared File Processor
async function processFiles(fileList) {
    // Collect up to top 2 files
    const files = Array.from(fileList).slice(0, 2);
    if (!files.length) return;
    
    indicator.style.opacity = '1';
    indicator.innerText = 'Extracting document data...';
    
    try {
        const uploadFile = async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/extract_text', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.text;
        };
        
        if (files[0]) {
            t1.value = await uploadFile(files[0]);
        }
        if (files[1]) {
            t2.value = await uploadFile(files[1]);
        }
        
        indicator.innerText = 'Files Loaded';
        showIndicator(); 
        setTimeout(doneTyping, doneTypingInterval);
        
    } catch(err) {
        alert("Failed to parse file: " + err.message);
        indicator.innerText = 'Parse Error';
    } finally {
        setTimeout(() => indicator.style.opacity = '0', 2000);
    }
}

// Drag & Drop Listeners
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    });
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if (e.dataTransfer.files) {
        processFiles(e.dataTransfer.files);
    }
});

// Manual Browse Listeners
dropZone.addEventListener('click', () => {
    if (fileUpload) fileUpload.click();
});

if (fileUpload) {
    fileUpload.addEventListener('change', (e) => {
        if (e.target.files) {
            processFiles(e.target.files);
        }
        // Reset so same files can be re-selected if necessary
        e.target.value = '';
    });
}


// 3. Smart Analysis Sequence
async function runSmartAnalysis() {
    if (!t1.value || !t2.value) {
        alert("Please provide both documents or paste text.");
        return;
    }

    // UX: Button Disable & Loader
    btn.disabled = true;
    btnText.innerText = "Analyzing document...";
    btn.style.opacity = '0.7';
    
    try {
        const response = await fetch('/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text1: t1.value, text2: t2.value })
        });
        
        const data = await response.json();
        
        // Quota Guard Condition
        if (data.error === 'limit_reached') {
            showModal();
            btn.disabled = false;
            btnText.innerText = "Analyze Similarity";
            btn.style.opacity = '1';
            return;
        }

        // Warning Label Generator
        if (data.usage) {
            const usageEl = document.getElementById('usageIndicator');
            const used = data.usage.checks_used;
            const limit = data.usage.checks_limit;
            usageEl.style.opacity = '1';
            
            if (used === limit - 1) {
                usageEl.innerText = `1 free check remaining.`;
                usageEl.style.color = '#ef4444';
                usageEl.style.background = 'rgba(239, 68, 68, 0.1)';
            } else if (used === limit) {
                usageEl.innerText = `Last free check used!`;
                usageEl.style.color = '#ef4444';
                usageEl.style.background = 'rgba(239, 68, 68, 0.1)';
            } else {
                usageEl.innerText = `${used}/${limit} free checks used`;
            }
        }
        
        // Reveal Results
        resultsContainer.style.display = 'flex';
        
        // Count up animation
        const targetScore = Math.round(data.overall_score);
        animateValue("bigScore", 0, targetScore, 1000);
        
        // Progress Bar (Vertical Height Update)
        const bar = document.getElementById('scoreBar');
        requestAnimationFrame(() => {
            bar.style.height = `${targetScore}%`;
            bar.style.backgroundColor = data.risk.color;
        });

        // Risk & Confidence Badges
        const riskEl = document.getElementById('riskBadge');
        riskEl.innerText = data.risk.level;
        riskEl.style.backgroundColor = `${data.risk.color}20`; // 20% alpha
        riskEl.style.color = data.risk.color;

        document.getElementById('confidenceVal').innerText = data.risk.confidence;

        // Status Text & AI Reasoning
        const statusEl = document.getElementById('resultStatus');
        const explainEl = document.getElementById('explainSimilarityText');
        
        statusEl.innerText = targetScore > 40 ? "Match Found" : "Safe - Low Match";
        statusEl.style.color = data.risk.color;
        explainEl.innerText = data.risk.reasoning;

        // Populate HTML Diff Comparison
        document.getElementById('diffContainer').innerHTML = data.diff;

        // Code Structural Analysis Activation
        const astAlert = document.getElementById('codeStructureAlert');
        if (data.insights.code_structural_match !== null) {
            astAlert.style.display = 'block';
            document.getElementById('codeStructureScore').innerText = `${data.insights.code_structural_match}%`;
        } else {
            astAlert.style.display = 'none';
        }

        // Reveal PDF Download Button
        document.getElementById('exportPdfBtn').style.display = 'block';

        // Multi-Algorithm Breakdown
        animateValue("statCosine", 0, Math.round(data.metrics.cosine), 1000);
        animateValue("statJaccard", 0, Math.round(data.metrics.jaccard), 1000);
        animateValue("statLevenshtein", 0, Math.round(data.metrics.levenshtein), 1000);

        // Mini Insights
        document.getElementById('statWords').innerText = data.insights.word_count;
        document.getElementById('statMatches').innerText = data.insights.matched_words;
        document.getElementById('statUnique').innerText = `${Math.round(data.insights.unique_percent)}%`;
        document.getElementById('statTime').innerText = `${data.insights.time_ms}ms`;

        // Advanced NLP Generation
        const sentenceBox = document.getElementById('sentenceList');
        if (data.advanced.sentences && data.advanced.sentences.length > 0) {
            sentenceBox.innerHTML = data.advanced.sentences.map(s => 
                `<div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                    <span style="color: var(--text); padding-right: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s.sentence}">"${s.sentence}"</span>
                    <span style="color: ${s.score > 70 ? '#ef4444' : s.score > 40 ? '#f59e0b' : '#10b981'}; font-weight: 700;">${s.score}%</span>
                </div>`
            ).join('');
        } else {
            sentenceBox.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">No highly similar semantic sentences flagged.</span>`;
        }

        const phraseBox = document.getElementById('phraseList');
        if (data.advanced.phrases && data.advanced.phrases.length > 0) {
            phraseBox.innerHTML = data.advanced.phrases.map(p => 
                `<div style="padding: 6px 10px; background: rgba(59, 130, 246, 0.1); border-left: 2px solid #3b82f6; border-radius: 4px; color: var(--text);">
                    ${p}
                </div>`
            ).join('');
        } else {
            phraseBox.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">No exact contiguous phrase hits found.</span>`;
        }

        // Side-by-Side Highlights
        const hl1 = document.getElementById('hl-text1');
        const hl2 = document.getElementById('hl-text2');
        hl1.innerHTML = data.highlights.text1 || "<em>No data</em>";
        hl2.innerHTML = data.highlights.text2 || "<em>No data</em>";

        // Sync Scroll
        hl1.addEventListener('scroll', () => { hl2.scrollTop = hl1.scrollTop; });
        hl2.addEventListener('scroll', () => { hl1.scrollTop = hl2.scrollTop; });
        


        // Save Session to User History (Real-world Usability Feature)
        const hist = JSON.parse(localStorage.getItem('plagix_history')) || [];
        hist.unshift({
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            score: targetScore,
            words: data.insights.word_count,
            timeMs: data.insights.time_ms,
            snippet: t2.value.substring(0, 60) + '...'
        });
        localStorage.setItem('plagix_history', JSON.stringify(hist.slice(0, 10))); // keep top 10
        renderHistory();

    } catch (err) {
        alert("Extraction Failed: " + err.message);
    } finally {
        btn.disabled = false;
        btnText.innerText = "Analyze Similarity";
        btn.style.opacity = '1';
    }
}

// 5. User History Database Engine
function renderHistory() {
    const historyGrid = document.getElementById('historyGrid');
    if (!historyGrid) return;
    
    const hist = JSON.parse(localStorage.getItem('plagix_history')) || [];
    if (hist.length === 0) {
        historyGrid.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">No recent analysis records in your workspace cache.</div>`;
        return;
    }
    
    historyGrid.innerHTML = hist.map(h => `
        <div class="card" style="padding: 1.25rem; border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">${h.date}</span>
                <span style="font-size: 13px; font-weight: 800; color: ${h.score > 75 ? '#ef4444' : h.score > 40 ? '#f59e0b' : '#10b981'};">${h.score}%</span>
            </div>
            <p style="font-size: 13px; color: var(--text); font-weight: 500; margin-bottom: 8px;">"${h.snippet}"</p>
            <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted); font-weight: 600;">
                <span>${h.words} Words</span>
                <span>•</span>
                <span>${h.timeMs}ms</span>
            </div>
        </div>
    `).join('');
}

// Render history on load
document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
    renderDocuments();
});

// 6. Documents Repository Engine
function renderDocuments() {
    const docGrid = document.querySelector('#view-documents .card');
    if (!docGrid) return;
    
    const hist = JSON.parse(localStorage.getItem('plagix_history')) || [];
    if (hist.length === 0) {
        docGrid.innerHTML = `<h3 style="color: var(--text-muted);">Your repository is empty.</h3>`;
        return;
    }
    
    // Create unique list based on snippets
    const uniqueDocs = Array.from(new Set(hist.map(h => h.snippet)));
    
    docGrid.style.textAlign = 'left';
    docGrid.style.padding = '1.5rem';
    docGrid.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
            ${uniqueDocs.map((doc, idx) => `
                <div class="card" style="padding: 1rem; border: 1px solid var(--border); background: rgba(59, 130, 246, 0.05);">
                    <div style="width: 32px; height: 32px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <p style="font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px;">Doc #00${idx + 1}</p>
                    <p style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">${doc}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// Utility: Number Counter
function animateValue(id, start, end, duration) {
    if (start === end) {
        document.getElementById(id).innerHTML = end;
        return;
    }
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// 4. Client-side Navigation Router
const navLinks = ['compare', 'history', 'documents', 'settings'];

navLinks.forEach(link => {
    const navBtn = document.getElementById(`nav-${link}`);
    const viewEl = document.getElementById(`view-${link}`);
    
    if (navBtn && viewEl) {
        navBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Demote all links and hide all views
            navLinks.forEach(l => {
                document.getElementById(`nav-${l}`)?.classList.remove('active');
                const v = document.getElementById(`view-${l}`);
                if (v) v.style.display = 'none';
            });
            // Promote requested
            navBtn.classList.add('active');
            viewEl.style.display = 'block';
        });
    }
});

