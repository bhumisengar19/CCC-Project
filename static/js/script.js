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
const btnText = document.getElementById('btnText');
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
function processFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('text/') || f.name.endsWith('.md') || f.name.endsWith('.py'));
    
    if (files.length > 0) {
        const reader1 = new FileReader();
        reader1.onload = (event) => { t1.value = event.target.result; showIndicator(); setTimeout(doneTyping, doneTypingInterval); };
        reader1.readAsText(files[0]);
        
        if (files.length > 1) {
            const reader2 = new FileReader();
            reader2.onload = (event) => { t2.value = event.target.result; };
            reader2.readAsText(files[1]);
        }
        
        indicator.style.opacity = '1';
        indicator.innerText = 'Files Loaded';
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
    document.getElementById('quickStatusLine').innerText = "Running environment scan...";
    
    try {
        const response = await fetch('/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text1: t1.value, text2: t2.value })
        });
        
        const data = await response.json();
        
        // Reveal Results
        resultsContainer.style.display = 'flex';
        
        // Count up animation
        const targetScore = Math.round(data.overall_score);
        animateValue("bigScore", 0, targetScore, 1000);
        
        // Progress Bar
        const bar = document.getElementById('scoreBar');
        requestAnimationFrame(() => {
            bar.style.width = `${targetScore}%`;
            bar.style.backgroundColor = targetScore > 75 ? '#ef4444' : targetScore > 40 ? '#f59e0b' : '#10b981';
        });

        // Status Text
        const statusEl = document.getElementById('resultStatus');
        if (targetScore > 75) {
            statusEl.innerText = "High Plagiarism Match";
            statusEl.style.color = '#ef4444';
        } else if (targetScore > 40) {
            statusEl.innerText = "Moderate Match Found";
            statusEl.style.color = '#f59e0b';
        } else {
            statusEl.innerText = "Low Similarity - Safe";
            statusEl.style.color = '#10b981';
        }

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
        
        document.getElementById('quickStatusLine').innerText = "Scan Complete";

    } catch (e) {
        alert("Verification failed: " + e.message);
        document.getElementById('quickStatusLine').innerText = "Error encountered.";
    } finally {
        // Reset UX
        btn.disabled = false;
        btnText.innerText = "Analyze Similarity";
        btn.style.opacity = '1';
    }
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

