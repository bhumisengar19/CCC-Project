// --- Page Transitions ---
function initPageTransitions() {
    const overlay = document.getElementById('transition-overlay');
    
    // On page load, play exit animation
    window.addEventListener('load', () => {
        overlay.classList.add('exit');
        setTimeout(() => {
            overlay.classList.remove('exit');
            overlay.style.transform = 'translateY(100%)';
        }, 600);
    });

    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && !href.startsWith('#')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                overlay.style.transform = 'translateY(100%)';
                overlay.classList.add('active');
                setTimeout(() => {
                    window.location.href = href;
                }, 600);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initCursorGlow();
    initTheme();
    initAnimations();
    initTypedText();
    initPageTransitions();
});

// --- Cursor Glow Effect ---
function initCursorGlow() {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    document.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
    });
}

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Add theme toggle button listener if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Animation for toggle
            themeToggle.classList.add('rotating');
            setTimeout(() => themeToggle.classList.remove('rotating'), 500);
        });
    }
}

// --- Typing Animation for Hero ---
function initTypedText() {
    const element = document.querySelector('.typing-text');
    if (!element) return;
    
    const words = ["Authenticity", "Originality", "Excellence", "Integrity"];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function type() {
        const currentWord = words[wordIndex];
        const displayText = isDeleting 
            ? currentWord.substring(0, charIndex--) 
            : currentWord.substring(0, charIndex++);
        
        element.textContent = displayText;

        if (!isDeleting && charIndex === currentWord.length + 1) {
            isDeleting = true;
            typeSpeed = 1500; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typeSpeed = 200;
        } else {
            typeSpeed = isDeleting ? 50 : 100;
        }

        setTimeout(type, typeSpeed);
    }

    type();
}

// --- Intersection Observer for Scroll Animations ---
function initAnimations() {
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.glass-card, .hero h1, .hero p, .btn-primary').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        observer.observe(el);
    });

    // CSS for the intersection observer animation
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

// --- Similarity Score Animation ---
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start) + '%';
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --- API Calls ---
async function checkPlagiarism() {
    const text1 = document.getElementById('text1')?.value;
    const text2 = document.getElementById('text2')?.value;
    const mode = document.getElementById('check-mode')?.value || 'text';
    
    if (!text1 || !text2) {
        alert("Please provide both texts for comparison.");
        return;
    }

    // Show loading state
    const btn = document.getElementById('check-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Scanning...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text1, text2, mode })
        });
        
        const data = await response.json();
        
        // Redirect to results with data in session/localstorage or pass it directly
        // For simplicity in this demo, we'll update the results on the same page or redirect
        localStorage.setItem('lastResult', JSON.stringify(data));
        window.location.href = '/results';
        
    } catch (error) {
        console.error("Error:", error);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- Magnetic Buttons ---
document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.05)`;
    });
    
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = `translate(0, 0) scale(1)`;
    });
});
