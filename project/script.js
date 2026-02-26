// Help toggle between login and signup forms
function switchTab(type) {
    const loginTab = document.getElementById('loginTabBtn');
    const signupTab = document.getElementById('signupTabBtn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (type === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

// Popup display helper
function showPopup(message, isSimulation = false) {
    const containerId = isSimulation ? 'simPopupContainer' : 'popupContainer';
    const messageId = isSimulation ? 'simPopupMessage' : 'popupMessage';
    const container = document.getElementById(containerId);
    const messageEl = document.getElementById(messageId);

    if (container && messageEl) {
        messageEl.textContent = message;
        container.classList.remove('hidden');

        const duration = isSimulation ? 4000 : 3000;
        setTimeout(() => {
            container.classList.add('hidden');
        }, duration);
    }
}

// Authentication handling
document.addEventListener('DOMContentLoaded', () => {
    // Signup handle
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;

            if (!email || !password) return;

            let users = JSON.parse(localStorage.getItem('users') || '[]');
            if (users.some(u => u.email === email)) {
                showPopup("Email already registered!");
                return;
            }

            users.push({ email, password });
            localStorage.setItem('users', JSON.stringify(users));
            showPopup("Signup successful! Switched to login.");
            setTimeout(() => switchTab('login'), 1000);
        });
    }

    // Login handle
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            let users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                localStorage.setItem('session', JSON.stringify({ email }));
                window.location.href = 'dashboard.html';
            } else {
                showPopup("Invalid email or password");
            }
        });
    }

    // Dashboard initialization
    if (window.location.pathname.includes('dashboard.html')) {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session) {
            window.location.href = 'index.html';
            return;
        }

        const emailSpan = document.getElementById('userEmailSpan');
        if (emailSpan) emailSpan.textContent = session.email;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('session');
                window.location.href = 'index.html';
            });
        }

        // Start error simulation
        startErrorSimulation();
    }
});

// Error Simulation System
function startErrorSimulation() {
    const errorMessages = [
        "Teams Login Issue",
        "Cart Item Add Issue",
        "Customer Details Not Verified"
    ];

    function scheduleNextError() {
        const delay = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000; // 5-10 seconds
        setTimeout(() => {
            // Only show if not on landing page anymore
            if (window.location.pathname.includes('dashboard.html')) {
                const randomMsg = errorMessages[Math.floor(Math.random() * errorMessages.length)];
                showPopup(randomMsg, true);
                scheduleNextError();
            }
        }, delay);
    }

    scheduleNextError();
}
