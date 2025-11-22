// Simple typing slideshow for the intro page
(() => {
    // New hero animation: show features with staggered entrance, wire up Skip and Login
    const skipBtn = document.getElementById('skipBtn');
    const loginBtn = document.getElementById('loginBtn');
    const features = Array.from(document.querySelectorAll('.feature'));
    const badge = document.querySelector('.badge');
    const title = document.querySelector('.hero-title');

    function staggerShowFeatures() {
        features.forEach((f, i) => {
            setTimeout(() => f.classList.add('show'), 420 + i * 220);
        });
    }

    function introSequence() {
        // small delay then show features and subtle scale on title
        setTimeout(() => {
            title.classList.add('entered');
            badge.classList.add('entered');
            staggerShowFeatures();
        }, 700);
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (skipBtn) skipBtn.addEventListener('click', () => window.location.href = '/');
        if (loginBtn) loginBtn.addEventListener('click', () => window.location.href = '/');
        introSequence();
    });

})();
