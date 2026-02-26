/**
 * Authentication Logic
 */

// Toggle between Login and Signup
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

// Show standard auth popup
function showPopup(message) {
    const container = document.getElementById('popupContainer');
    const messageEl = document.getElementById('popupMessage');
    if (container && messageEl) {
        messageEl.textContent = message;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('hidden'), 3000);
    }
}

/**
 * Dashboard Navigation
 */
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));

    // Show target section
    const sectionName = 'section' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
    const target = document.getElementById(sectionName);
    if (target) target.classList.add('active');

    // Update sidebar active state
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    const menuItemName = 'menu' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
    const activeItem = document.getElementById(menuItemName);
    if (activeItem) activeItem.classList.add('active');
}

/**
 * Error Simulation Engine
 */
let errorStack = JSON.parse(localStorage.getItem('errorStack') || '[]');

function startErrorSimulation() {
    const errorMessages = [
        "Teams Login Issue",
        "Cart Item Add Issue",
        "Customer Details Not Verified"
    ];

    function scheduleNextError() {
        if (!window.location.pathname.includes('dashboard.html')) return;

        // Requirement: increase the popup time upto every 5 mins (300,000 ms)
        // We'll use a random interval between 4 and 5 minutes (240k - 300k ms)
        const delay = Math.floor(Math.random() * (300000 - 240000 + 1)) + 240000;

        setTimeout(() => {
            const randomMsg = errorMessages[Math.floor(Math.random() * errorMessages.length)];
            generateError(randomMsg);
            scheduleNextError();
        }, delay);
    }

    scheduleNextError();
}

function generateError(message) {
    // Show popup
    const container = document.getElementById('simPopupContainer');
    const messageEl = document.getElementById('simPopupMessage');

    if (container && messageEl) {
        messageEl.textContent = message;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('hidden'), 4000);
    }

    // Log error
    const timestamp = new Date().toLocaleTimeString('en-GB'); // HH:MM:SS
    const idNum = Math.floor(Math.random() * 9000 + 1000);
    const errorId = 'ERR-' + idNum;

    const errorObj = {
        id: errorId,
        message: message,
        time: timestamp,
        isResolved: false,
        activeAction: 'none' // Can be 'start', 'working', 'completed'
    };

    // Add to memory stack
    errorStack.unshift(errorObj);

    // Save to LocalStorage
    localStorage.setItem('errorStack', JSON.stringify(errorStack));

    // Update Table
    updateErrorTable();
}

function updateErrorTable() {
    const tableBody = document.getElementById('errorTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    errorStack.forEach(err => {
        const row = document.createElement('tr');
        row.id = 'row-' + err.id;

        const resolveClass = err.isResolved ? 'resolved' : '';
        const resolveText = err.isResolved ? 'Resolved' : 'Resolve';

        row.innerHTML = `
            <td id="cell-id-${err.id}">${err.id}</td>
            <td id="cell-msg-${err.id}">${err.message}</td>
            <td id="cell-time-${err.id}">${err.time}</td>
            <td id="cell-status-${err.id}">
                <button id="status-btn-${err.id}" class="resolve-btn ${resolveClass}" onclick="toggleStatus('${err.id}')">${resolveText}</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function toggleStatus(errorId) {
    const index = errorStack.findIndex(err => err.id === errorId);
    if (index !== -1) {
        errorStack[index].isResolved = !errorStack[index].isResolved;
        localStorage.setItem('errorStack', JSON.stringify(errorStack));
        updateErrorTable();
    }
}

/**
 * Event Listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    // Handle Login/Signup forms
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;

            let users = JSON.parse(localStorage.getItem('users') || '[]');
            if (users.some(u => u.email === email)) {
                showPopup("Email already registered!");
                return;
            }

            users.push({ email, password });
            localStorage.setItem('users', JSON.stringify(users));
            showPopup("Signup successful! Switch to login.");
            setTimeout(() => switchTab('login'), 1000);
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            let users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                localStorage.setItem('session', JSON.stringify({ email: email }));
                window.location.href = 'dashboard.html';
            } else {
                showPopup("Invalid Credentials");
            }
        });
    }

    // Dashboard init
    if (window.location.pathname.includes('dashboard.html')) {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session) {
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('userEmailSpan').textContent = session.email;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('session');
                window.location.href = 'index.html';
            });
        }

        // Initialize table with existing logs
        updateErrorTable();
        // Start engine
        startErrorSimulation();
    }
});
