// ================= GLOBAL VARIABLES & ELEMENTS =================
const confettiCanvas = document.getElementById("confetti");
const ctx = confettiCanvas.getContext("2d");
confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;
let particles = [];
const colors = ['#ff7eb3', '#ff758c', '#a29bfe', '#fdcb6e', '#55efc4'];

// Stage Elements
const stage1_Heart = document.getElementById('start-card');
const stage2_Gift = document.getElementById('main-stage');
const stage3_Ticket = document.getElementById('ticket-stage');
const stage4_Photos = document.getElementById('photo-stage');
const stage5_Letter = document.getElementById('letter-stage');

// Interaction Elements
const heartBtn = document.getElementById('heartBtn');
const progressCircle = document.getElementById('progress');
const cardLayer = document.getElementById('card-layer');
const quoteCards = document.querySelectorAll('.quote-card');
const giftBtn = document.getElementById('giftBtn');
const giftInstruction = document.querySelector('.instruction-gift');
const claimBtn = document.getElementById('claimBtn');
const photoCards = document.querySelectorAll('.photo-card');
const bookContainer = document.querySelector('.book-container');
const bookCover = document.getElementById('bookCover');

// ================= HELPER: TRANSITION =================
function transitionStages(currentStage, nextStage, delay = 500) {
    currentStage.classList.add('hidden');
    setTimeout(() => {
        nextStage.classList.remove('hidden');
        Array.from(nextStage.children).forEach(child => {
            if(child.classList.contains('fade-in-up')) {
                child.style.animation = 'none';
                child.offsetHeight; 
                child.style.animation = null; 
            }
        });
    }, delay);
}

// ================= PHASE 1: HEART HOLD =================
const HOLD_DURATION = 1500; 
let holdStart = 0, isHeld = false;
const radius = progressCircle.r.baseVal.value;
const circumference = 2 * Math.PI * radius;

progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = circumference;

const startHold = (e) => {
    if(e.type !== 'touchstart') e.preventDefault();
    isHeld = true; holdStart = Date.now();
    requestAnimationFrame(updateProgress);
};
const endHold = () => {
    isHeld = false;
    progressCircle.style.strokeDashoffset = circumference;
};

heartBtn.addEventListener('mousedown', startHold);
heartBtn.addEventListener('touchstart', {handleEvent: startHold, passive: false});
window.addEventListener('mouseup', endHold);
window.addEventListener('touchend', endHold);

function updateProgress() {
    if (!isHeld) return;
    const elapsed = Date.now() - holdStart;
    const progress = Math.min(elapsed / HOLD_DURATION, 1);
    progressCircle.style.strokeDashoffset = circumference - (progress * circumference);
    if (progress >= 1) {
        isHeld = false;
        transitionStages(stage1_Heart, stage2_Gift);
    } else {
        requestAnimationFrame(updateProgress);
    }
}

// ================= PHASE 2: DRAG CARDS (NEW PHYSICS ENGINE) =================
let cardsRemoved = 0;

// Config for physics
const THROW_SPEED_THRESHOLD = 0.35; // How fast you need to flick (px/ms)
const SCREEN_DIAGONAL = Math.sqrt(window.innerWidth**2 + window.innerHeight**2);

quoteCards.forEach(card => {
    let isDragging = false;
    
    // Position tracking
    let startX, startY; 
    let currentX = 0, currentY = 0; 
    let xOffset = 0, yOffset = 0; // Stores position where you dropped it last
    
    // Velocity tracking
    let lastX = 0, lastY = 0;
    let lastTime = 0;
    let velocityX = 0, velocityY = 0;
    
    // Get initial rotation from CSS
    let initialRotation = getRotation(card);

    // Event Listeners
    card.addEventListener('touchstart', (e) => startDrag(e.touches[0], card), {passive: false});
    card.addEventListener('mousedown', (e) => startDrag(e, card));

    function startDrag(e, item) {
        if(item.classList.contains('thrown')) return;
        
        isDragging = true;
        
        // Record starting positions relative to the saved offset
        startX = e.clientX - xOffset;
        startY = e.clientY - yOffset;
        
        // Reset velocity trackers
        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = Date.now();
        velocityX = 0; 
        velocityY = 0;

        // Remove transition so it follows finger instantly
        item.style.transition = 'none'; 
        item.style.zIndex = '100'; // Bring to front
        
        // Attach move/end listeners
        const moveHandler = (ev) => drag(ev.touches ? ev.touches[0] : ev, item);
        const endHandler = () => endDrag(item, moveHandler, endHandler);

        document.addEventListener('touchmove', moveHandler, {passive: false});
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('touchend', endHandler);
        document.addEventListener('mouseup', endHandler);
    }

    function drag(e, item) {
        if (!isDragging) return;
        
        // 1. Update Position
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;

        // 2. Update Velocity (Thrust calculation)
        const now = Date.now();
        const dt = now - lastTime;
        
        if (dt > 0) {
            // Calculate speed in pixels per millisecond
            velocityX = (e.clientX - lastX) / dt;
            velocityY = (e.clientY - lastY) / dt;
        }
        
        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = now;

        // 3. Move the card
        xOffset = currentX;
        yOffset = currentY;
        
        // Add a slight tilt based on X movement
        const rotateTilt = initialRotation + (currentX * 0.05);
        item.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotateTilt}deg)`;
    }

    function endDrag(item, moveFn, endFn) {
        if (!isDragging) return;
        isDragging = false;
        
        // Clean up listeners
        document.removeEventListener('touchmove', moveFn);
        document.removeEventListener('mousemove', moveFn);
        document.removeEventListener('touchend', endFn);
        document.removeEventListener('mouseup', endFn);
        
        item.style.zIndex = ''; // Restore z-index
        
        // Calculate Total Speed magnitude
        const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        
        // === PHYSICS LOGIC ===
        
        if (speed > THROW_SPEED_THRESHOLD) {
            // --- THROW DETECTED ---
            // Calculate a target point far off-screen based on the velocity direction
            
            // Normalize velocity vector
            const dirX = velocityX / speed;
            const dirY = velocityY / speed;
            
            // Project it far out (e.g. 1500px away)
            const throwDistance = 1500;
            const targetX = currentX + (dirX * throwDistance);
            const targetY = currentY + (dirY * throwDistance);
            
            // Apply a smooth "drift" animation
            // 0.8s ease-out gives it that "slowly leaves" feel
            item.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s';
            item.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${initialRotation + (dirX * 45)}deg)`;
            item.style.opacity = '0'; 
            item.classList.add('thrown');
            
            cardsRemoved++;
            if(cardsRemoved === quoteCards.length) revealGift();
            
        } else {
            // --- DROP DETECTED (STOPS WHERE YOU LEAVE) ---
            // We do NOT add a transition or change coords.
            // It simply stays exactly where xOffset and yOffset are.
            // Just re-apply the transform with slight rotation correction if needed.
            item.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${initialRotation}deg)`;
        }
    }
});

function getRotation(element) { 
    const style = element.getAttribute('style') || '';
    const match = style.match(/rotate\(([-0-9.]+)deg\)/); 
    return match ? parseFloat(match[1]) : 0; 
}

function revealGift() {
    // Hide the top text
    const topText = document.querySelector('.top-text-container');
    if(topText) {
        topText.style.transition = 'opacity 0.5s';
        topText.style.opacity = '0';
    }
    
    // Disable card layer clicks
    cardLayer.style.pointerEvents = 'none';
    
    // Show gift hint
    giftInstruction.classList.add('show');
}

giftBtn.addEventListener('click', () => {
    if(cardsRemoved < quoteCards.length) return;
    transitionStages(stage2_Gift, stage3_Ticket);
});

// ================= PHASE 3: TICKET =================
claimBtn.addEventListener('click', () => {
    transitionStages(stage3_Ticket, stage4_Photos);
});

// ================= PHASE 4: PHOTOS =================
let photosViewed = 0;
const photoArray = Array.from(photoCards).reverse(); 

photoArray.forEach((photo, index) => {
    photo.addEventListener('click', () => {
        if(index !== photosViewed) return;
        photo.classList.add('viewed');
        photosViewed++;
        if(photosViewed === photoCards.length) {
            setTimeout(() => {
                transitionStages(stage4_Photos, stage5_Letter);
                startConfetti();
            }, 600);
        }
    });
});

// ================= PHASE 5: BOOK/LETTER =================
let isBookOpen = false;
if(bookContainer && bookCover) {
    bookContainer.addEventListener('click', () => {
        isBookOpen = !isBookOpen;
        if(isBookOpen) {
            bookCover.classList.add('is-open');
            bookContainer.classList.add('open');
        } else {
            bookCover.classList.remove('is-open');
            bookContainer.classList.remove('open');
        }
    });
}

// ================= CONFETTI =================
function startConfetti() {
    particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * confettiCanvas.width, 
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            w: Math.random() * 10 + 5, h: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            vy: Math.random() * 3 + 2, vx: Math.random() * 4 - 2, rot: Math.random() * 360
        });
    }
    animateConfetti();
}

function animateConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let activeParticles = false;
    particles.forEach((p) => {
        p.y += p.vy; p.x += p.vx; p.rot += 2;
        if (p.y < confettiCanvas.height) activeParticles = true;
        ctx.fillStyle = p.color; ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
    if (activeParticles) requestAnimationFrame(animateConfetti);
}