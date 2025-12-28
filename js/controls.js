// Pause button handlers
document.getElementById('pauseBtn').addEventListener('click', () => { if (window.soundManager) window.soundManager.play('click'); togglePause(); });
document.getElementById('resumeBtn').addEventListener('click', () => { if (window.soundManager) window.soundManager.play('click'); togglePause(); });
document.getElementById('quitBtn').addEventListener('click', () => { if (window.soundManager) window.soundManager.play('click'); quitGame(); });

// Touch controls
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchend', (e) => {
    if (!isGameRunning || isPaused) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
            queueDirection({x: 1, y: 0});
        } else {
            queueDirection({x: -1, y: 0});
        }
    } else {
        if (diffY > 0) {
            queueDirection({x: 0, y: 1});
        } else {
            queueDirection({x: 0, y: -1});
        }
    }
    if (window.soundManager) window.soundManager.play('move');
});

// Button controls
document.getElementById('upBtn').addEventListener('click', () => {
    if (window.soundManager) window.soundManager.play('click');
    queueDirection({x: 0, y: -1});
});

document.getElementById('downBtn').addEventListener('click', () => {
    if (window.soundManager) window.soundManager.play('click');
    queueDirection({x: 0, y: 1});
});

document.getElementById('leftBtn').addEventListener('click', () => {
    if (window.soundManager) window.soundManager.play('click');
    queueDirection({x: -1, y: 0});
});

document.getElementById('rightBtn').addEventListener('click', () => {
    if (window.soundManager) window.soundManager.play('click');
    queueDirection({x: 1, y: 0});
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    // Pause with Space or Escape
    if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
    }
    
    if (!isGameRunning || isPaused) return;
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'ц':
        case 'Ц':
            queueDirection({x: 0, y: -1});
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
        case 'ы':
        case 'Ы':
            queueDirection({x: 0, y: 1});
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
        case 'ф':
        case 'Ф':
            queueDirection({x: -1, y: 0});
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
        case 'в':
        case 'В':
            queueDirection({x: 1, y: 0});
            break;
    }
});

// Start and restart buttons
document.getElementById('startBtn').addEventListener('click', () => { if (window.soundManager) window.soundManager.play('click'); startGame(); });
document.getElementById('restartBtn').addEventListener('click', () => { if (window.soundManager) window.soundManager.play('click'); startGame(); });

// Position the right-side stack (pause → theme → stats) under the bottom of .level-progress
(function positionRightStack() {
    const stack = document.querySelector('.right-stack');
    const anchor = document.querySelector('.level-progress');
    if (!stack || !anchor) return;

    function updatePosition() {
        const rect = anchor.getBoundingClientRect();
        const stackRect = stack.getBoundingClientRect();
        // desired top = bottom of anchor + small gap
        const gap = 8;
        let desiredTop = rect.bottom + gap;
        // clamp so stack remains in viewport
        const maxTop = Math.max(window.innerHeight - stackRect.height - 12, 8);
        let top = Math.min(Math.max(desiredTop, 8), maxTop);
        stack.style.top = `${top}px`;
    }

    // run immediately and on resize/scroll
    updatePosition();
    window.addEventListener('resize', updatePosition, {passive: true});
    window.addEventListener('scroll', updatePosition, {passive: true});

    // observe changes to anchor size/content
    const observer = new MutationObserver(updatePosition);
    observer.observe(anchor, { childList: true, subtree: true, attributes: true });
})();
