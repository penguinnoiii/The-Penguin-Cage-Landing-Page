document.addEventListener('DOMContentLoaded', function () {
    var body = document.body;
    var themeToggle = document.querySelector('.theme-toggle');
    var menuToggle = document.querySelector('.menu-toggle');
    var navLinks = document.querySelector('.nav-links');

    if (!body || !themeToggle || !menuToggle || !navLinks) {
        return;
    }

    body.classList.add('js');

    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark');
    }

    updateThemeButton();

    themeToggle.addEventListener('click', function () {
        body.classList.toggle('dark');
        var currentTheme = body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', currentTheme);
        updateThemeButton();
    });

    menuToggle.addEventListener('click', function () {
        var isOpen = navLinks.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            if (navLinks.classList.contains('open')) {
                navLinks.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });

    function updateThemeButton() {
        var isDark = body.classList.contains('dark');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
});