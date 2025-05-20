// Initialize sidebar toggle functionality
function initSidebarToggle() {
    const toggleBtn = document.getElementById('toggle-sidebar-btn');
    const sidebar = document.getElementById('chat-history-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (!toggleBtn || !sidebar || !overlay) return;
    
    // Toggle sidebar
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
    
    // Close sidebar when clicking overlay
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initChatHistory();
    initSidebarToggle();
}); 