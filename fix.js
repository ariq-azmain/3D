// Emergency fix for orientation and loading issues
document.addEventListener('DOMContentLoaded', function() {
    // Force hide orientation warning after 3 seconds if still showing
    setTimeout(() => {
        const warning = document.getElementById('orientationWarning');
        if (warning && warning.style.display === 'flex') {
            const isLandscape = window.innerWidth > window.innerHeight;
            if (isLandscape) {
                warning.style.display = 'none';
                document.getElementById('loadingScreen').style.display = 'flex';
            }
        }
    }, 3000);
    
    // Force start game if stuck on start screen
    setTimeout(() => {
        const startScreen = document.getElementById('startScreen');
        const gameContainer = document.getElementById('gameContainer');
        
        if (startScreen && !startScreen.classList.contains('hidden') && 
            gameContainer && gameContainer.classList.contains('hidden')) {
            // Auto-start after 5 seconds if user doesn't click
            startGame();
        }
    }, 5000);
    
    // Fix for touch events not working
    document.addEventListener('touchstart', function(e) {
        // Prevent default only for game elements
        if (e.target.closest('#mobileControls') || 
            e.target.closest('.screen') ||
            e.target.closest('#gameCanvas')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Fix for iOS safari 100vh issue
    function setVH() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setVH();
    window.addEventListener('resize', setVH);
});