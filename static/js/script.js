document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initRealTimeFeedback();
    initAnimations();
});

// --- Theme Management ---
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if (!icon) return;
    icon.className = theme === 'light' ? 'ph-sun' : 'ph-moon';
}

// --- Real-Time Feedback ---
function initRealTimeFeedback() {
    const text1 = document.getElementById('text1');
    const text2 = document.getElementById('text2');
    const progressBar = document.getElementById('real-time-progress');
    const progressText = document.getElementById('real-time-score');

    if (!text1 || !text2) return;

    let timeout = null;

    const runQuickAnalysis = () => {
        const val1 = text1.value.trim();
        const val2 = text2.value.trim();

        if (val1.length === 0 || val2.length === 0) {
            progressBar.style.width = '0%';
            progressText.innerText = '0%';
            return;
        }

        // Debounce to avoid excessive API calls
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text1: val1, text2: val2, mode: 'text' })
                });
                const data = await response.json();
                
                if (data.score !== undefined) {
                    progressBar.style.width = data.score + '%';
                    animateCounter('real-time-score', data.score);
                }
            } catch (err) {
                console.error("Real-time analysis failed", err);
            }
        }, 800);
    };

    text1.addEventListener('input', runQuickAnalysis);
    text2.addEventListener('input', runQuickAnalysis);
}

// --- Counter Animation ---
function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    
    let current = parseFloat(el.innerText || "0");
    const step = (target - current) / 10;
    
    const update = () => {
        current += step;
        if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
            el.innerText = target + '%';
        } else {
            el.innerText = Math.round(current) + '%';
            requestAnimationFrame(update);
        }
    };
    
    requestAnimationFrame(update);
}

// --- Basic Page Animations ---
function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .hero, .auth-card').forEach(el => {
        observer.observe(el);
    });
}

// --- API Actions ---
async function analyzeFull() {
    const text1 = document.getElementById('text1').value;
    const text2 = document.getElementById('text2').value;
    const mode = document.getElementById('mode-selector')?.value || 'text';

    if (!text1 || !text2) {
        alert("Please provide both documents.");
        return;
    }

    const btn = document.getElementById('analyze-btn');
    const originalText = btn.innerText;
    btn.innerText = "Analyzing...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text1, text2, mode })
        });
        const data = await response.json();
        
        // Save to session storage for results page
        sessionStorage.setItem('plagix_results', JSON.stringify(data));
        window.location.href = '/results';
    } catch (err) {
        console.error(err);
        alert("Something went wrong.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
