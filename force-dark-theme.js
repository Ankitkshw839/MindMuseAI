// Force dark theme application across all pages
(function() {
    // This script runs immediately to force dark theme
    // Apply dark theme as early as possible, even before DOMContentLoaded
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.add('dark-theme');
    document.documentElement.style.setProperty('--bg-color', '#0f0c1d');
    document.documentElement.style.setProperty('--bg-color-secondary', '#171429');
    document.documentElement.style.setProperty('--text-color', '#ffffff');
    document.documentElement.style.setProperty('--text-muted', '#a3a3b9');
    document.documentElement.style.setProperty('--border-color', '#2b2b45');
    document.documentElement.style.setProperty('--input-bg', '#202035');
    document.documentElement.style.setProperty('--card-bg', '#1c1a2e');
    document.documentElement.style.setProperty('--primary-color', '#764af1');
    document.documentElement.style.setProperty('--primary-hover', '#6135dc');

    // Override theme selection to ensure consistency
    // This will check the saved theme and ensure it's always dark by default
    document.addEventListener('DOMContentLoaded', function() {
        // Force dark theme but preserve user preference in localStorage
        const savedTheme = localStorage.getItem('theme') || 'dark';
        
        // If there is a theme select element, update it to match the current theme
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = savedTheme;
        }
        
        // Apply the theme (will be dark by default)
        applyTheme(savedTheme);
        
        function applyTheme(theme) {
            if (theme === 'light') {
                document.documentElement.classList.remove('dark-theme');
                document.documentElement.classList.add('light-theme');
                document.documentElement.style.setProperty('--bg-color', '#f5f7fa');
                document.documentElement.style.setProperty('--bg-color-secondary', '#e9ecef');
                document.documentElement.style.setProperty('--text-color', '#343a40');
                document.documentElement.style.setProperty('--text-muted', '#6c757d');
                document.documentElement.style.setProperty('--border-color', '#ced4da');
                document.documentElement.style.setProperty('--input-bg', '#ffffff');
                document.documentElement.style.setProperty('--card-bg', '#ffffff');
            } else {
                document.documentElement.classList.remove('light-theme');
                document.documentElement.classList.add('dark-theme');
                document.documentElement.style.setProperty('--bg-color', '#0f0c1d');
                document.documentElement.style.setProperty('--bg-color-secondary', '#171429');
                document.documentElement.style.setProperty('--text-color', '#ffffff');
                document.documentElement.style.setProperty('--text-muted', '#a3a3b9');
                document.documentElement.style.setProperty('--border-color', '#2b2b45');
                document.documentElement.style.setProperty('--input-bg', '#202035');
                document.documentElement.style.setProperty('--card-bg', '#1c1a2e');
            }
        }
    });
})(); 