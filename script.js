document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded');
    
    // Get elements
    const splash = document.getElementById('splash');
    const mainContent = document.querySelector('.main-content');
    
    // Show main content after delay
    setTimeout(() => {
        console.log('Showing main content');
        if (splash) {
            splash.style.display = 'none';
        }
        if (mainContent) {
            mainContent.classList.add('visible');
        }
    }, 3000);

    // Navigation
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Stars background
    createStars();

    // Add logout button dynamically if needed (e.g., on non-login pages)
    // This assumes the server redirects unauthenticated users from protected pages
    if (navLinks && !window.location.pathname.endsWith('/') && !window.location.pathname.endsWith('index.html')) { 
        const logoutLi = document.createElement('li');
        const logoutLink = document.createElement('a');
        logoutLink.href = '/logout'; // Link directly to the server logout route
        logoutLink.textContent = 'Logout';
        logoutLi.appendChild(logoutLink);
        navLinks.appendChild(logoutLi);
    }
});

function createStars() {
    const starsContainer = document.createElement('div');
    starsContainer.className = 'stars';
    document.body.appendChild(starsContainer);

    // Create 200 stars
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Random size between 1 and 3 pixels
        const size = Math.random() * 2 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // Random position
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        
        // Random animation duration between 2 and 5 seconds
        const duration = Math.random() * 3 + 2;
        star.style.setProperty('--duration', `${duration}s`);
        
        starsContainer.appendChild(star);
    }
}

// Add scroll reveal animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observer);

// Observe all cards and sections
document.querySelectorAll('.feature-card, .job-card, .info-card, section').forEach(el => {
    el.classList.add('fade-in-element');
    observer.observe(el);
});

// // Session Management - REMOVED
// function checkLoginStatus() {
//     ...
// }

// // Google Authentication - REMOVED
// function handleGoogleLogin() {
//     ...
// }

// // Handle logout - REMOVED (Logout is now a direct link to /logout)
// function handleLogout() {
//     ...
// } 
