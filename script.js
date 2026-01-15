// Galactic War Game - Performance Optimized Version
// Dedicated to Commander Ariq Azmain

// Main Game Variables
let scene, camera, renderer;
let player, enemies = [], bullets = [], bombs = [], missiles = [], particles = [], healthPacks = [];
let joystickMove = { x: 0, y: 0, active: false };
let joystickRotate = { x: 0, y: 0, active: false };
let deviceOrientation = { alpha: 0, beta: 90, gamma: 0 };
let frame = null;
let stars = [];

// Performance optimizations
let lastTime = 0;
let fixedTimeStep = 1/60; // 60 FPS target
let accumulator = 0;
let particlePool = [];
let bulletPool = [];
const MAX_PARTICLES = 200;
const MAX_BULLETS = 100;

// Game State
let gameState = {
    score: 0,
    wave: 1,
    health: 100,
    shields: 100,
    maxHealth: 100,
    maxShields: 100,
    gameOver: false,
    paused: false,
    currentWeapon: 'bullet',
    ammo: {
        bullet: Infinity,
        bomb: 10,
        missile: 5
    },
    enemiesRemaining: 0,
    enemiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    bossActive: false,
    speed: 0,
    maxSpeed: 50,
    acceleration: 0.5,
    rotationSpeed: 0.05,
    lastHealthPack: 0,
    highScore: localStorage.getItem('galacticWarHighScore') || 0,
    totalWaves: localStorage.getItem('galacticWarWaves') || 0,
    totalKills: localStorage.getItem('galacticWarKills') || 0
};

// Sound System - Optimized
let sounds = {
    bullet: null,
    bomb: null,
    missile: null,
    explosion: null,
    hit: null,
    powerup: null,
    warning: null,
    background: null
};

// DOM Elements
let loadingScreen, startScreen, gameOverScreen, pauseScreen, instructionsScreen;
let hud, mobileControls, gameContainer;
let startGameBtn, instructionsBtn, settingsBtn, backToMenuBtn;
let restartBtn, menuBtn, resumeBtn, restartPauseBtn, menuPauseBtn;
let movementJoystick, rotationJoystick, primaryFireBtn, specialFireBtn, speedBoostBtn, brakeBtn;
let weaponButtons = [];
let fullscreenBtn;
let orientationWarning, forceStartBtn;

// Audio elements
let audioElements = {
    backgroundMusic: null,
    bulletSound: null,
    bombSound: null,
    missileSound: null,
    explosionSound: null,
    hitSound: null,
    powerupSound: null,
    warningSound: null
};

// Initialize object pools
function initObjectPools() {
    // Create particle pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        scene.add(mesh);
        particlePool.push({
            mesh: mesh,
            active: false,
            lifeTime: 0,
            maxLifeTime: 0,
            velocity: new THREE.Vector3(),
            color: new THREE.Color(),
            size: 0.2
        });
    }
    
    // Create bullet pool
    for (let i = 0; i < MAX_BULLETS; i++) {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        scene.add(mesh);
        bulletPool.push({
            mesh: mesh,
            active: false,
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            type: 'bullet',
            size: 0.2,
            homing: false,
            target: null,
            lifeTime: 0
        });
    }
}

// Get particle from pool
function getParticleFromPool() {
    for (let i = 0; i < particlePool.length; i++) {
        if (!particlePool[i].active) {
            particlePool[i].active = true;
            particlePool[i].mesh.visible = true;
            return particlePool[i];
        }
    }
    return null; // No available particles
}

// Get bullet from pool
function getBulletFromPool() {
    for (let i = 0; i < bulletPool.length; i++) {
        if (!bulletPool[i].active) {
            bulletPool[i].active = true;
            bulletPool[i].mesh.visible = true;
            return bulletPool[i];
        }
    }
    return null; // No available bullets
}

// Initialize the game
function init() {
    // First check orientation
    checkOrientation();
    
    getDOMElements();
    setupEventListeners();
    setupAudio();
    showLoadingScreen();
    
    // Add orientation change listener
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    // Initialize Three.js and start the game
    setTimeout(() => {
        initThreeJS();
        initObjectPools(); // Initialize object pools
        initGame();
        animate();
        
        setTimeout(() => {
            hideLoadingScreen();
            showStartScreen();
        }, 2000);
    }, 500);
}

function checkOrientation() {
    orientationWarning = document.getElementById('orientationWarning');
    forceStartBtn = document.getElementById('forceStartBtn');
    
    // Check if device is in portrait mode
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isPortrait) {
        orientationWarning.style.display = 'flex';
        // Hide all game elements
        document.querySelectorAll('#loadingScreen, #startScreen, .screen').forEach(el => {
            el.style.display = 'none';
        });
    } else {
        orientationWarning.style.display = 'none';
        // Show loading screen
        document.getElementById('loadingScreen').style.display = 'flex';
    }
    
    // Force start button
    if (forceStartBtn) {
        forceStartBtn.addEventListener('click', () => {
            orientationWarning.style.display = 'none';
            document.getElementById('loadingScreen').style.display = 'flex';
        });
    }
}

function handleOrientationChange() {
    checkOrientation();
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function getDOMElements() {
    loadingScreen = document.getElementById('loadingScreen');
    startScreen = document.getElementById('startScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    pauseScreen = document.getElementById('pauseScreen');
    instructionsScreen = document.getElementById('instructionsScreen');
    hud = document.getElementById('hud');
    mobileControls = document.getElementById('mobileControls');
    gameContainer = document.getElementById('gameContainer');
    fullscreenBtn = document.getElementById('fullscreenBtn');
    orientationWarning = document.getElementById('orientationWarning');
    forceStartBtn = document.getElementById('forceStartBtn');
    
    // Buttons
    startGameBtn = document.getElementById('startGameBtn');
    instructionsBtn = document.getElementById('instructionsBtn');
    settingsBtn = document.getElementById('settingsBtn');
    backToMenuBtn = document.getElementById('backToMenuBtn');
    restartBtn = document.getElementById('restartBtn');
    menuBtn = document.getElementById('menuBtn');
    resumeBtn = document.getElementById('resumeBtn');
    restartPauseBtn = document.getElementById('restartPauseBtn');
    menuPauseBtn = document.getElementById('menuPauseBtn');
    
    // Joysticks
    movementJoystick = document.getElementById('movementJoystick');
    rotationJoystick = document.getElementById('rotationJoystick');
    
    // Fire buttons
    primaryFireBtn = document.getElementById('primaryFireBtn');
    specialFireBtn = document.getElementById('specialFireBtn');
    speedBoostBtn = document.getElementById('speedBoostBtn');
    brakeBtn = document.getElementById('brakeBtn');
    
    // Weapon buttons
    weaponButtons = document.querySelectorAll('.weapon-btn');
    
    // Audio elements
    audioElements.backgroundMusic = document.getElementById('backgroundMusic');
    audioElements.bulletSound = document.getElementById('bulletSound');
    audioElements.bombSound = document.getElementById('bombSound');
    audioElements.missileSound = document.getElementById('missileSound');
    audioElements.explosionSound = document.getElementById('explosionSound');
    audioElements.hitSound = document.getElementById('hitSound');
    audioElements.powerupSound = document.getElementById('powerupSound');
    audioElements.warningSound = document.getElementById('warningSound');
    
    // Update high score display
    document.getElementById('highScoreDisplay').textContent = gameState.highScore;
    document.getElementById('wavesSurvivedDisplay').textContent = gameState.totalWaves;
    document.getElementById('enemiesDestroyedDisplay').textContent = gameState.totalKills;
}

function setupEventListeners() {
    // Menu buttons
    startGameBtn.addEventListener('click', startGame);
    instructionsBtn.addEventListener('click', showInstructions);
    settingsBtn.addEventListener('click', showSettings);
    backToMenuBtn.addEventListener('click', showStartScreen);
    
    // Game control buttons
    restartBtn.addEventListener('click', restartGame);
    menuBtn.addEventListener('click', goToMenu);
    resumeBtn.addEventListener('click', resumeGame);
    restartPauseBtn.addEventListener('click', restartGame);
    menuPauseBtn.addEventListener('click', goToMenu);
    
    // Fullscreen button
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Add this for orientation support
    if (window.DeviceOrientationEvent) {
        // Request permission for iOS 13+
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.addEventListener('click', function requestPermission() {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', handleDeviceOrientation);
                        }
                    })
                    .catch(console.error);
                document.removeEventListener('click', requestPermission);
            });
        } else {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
        }
    }
    
    // Mobile controls
    setupMobileControls();
    
    // Weapon selection
    weaponButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            weaponButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            gameState.currentWeapon = this.dataset.weapon;
        });
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case ' ':
                if (!gameState.paused && !gameState.gameOver) {
                    fireWeapon();
                }
                break;
            case '1':
                gameState.currentWeapon = 'bullet';
                updateWeaponSelection();
                break;
            case '2':
                gameState.currentWeapon = 'bomb';
                updateWeaponSelection();
                break;
            case '3':
                gameState.currentWeapon = 'missile';
                updateWeaponSelection();
                break;
            case 'escape':
                togglePause();
                break;
            case 'r':
                if (!gameState.paused && !gameState.gameOver) {
                    fireSpecialWeapon();
                }
                break;
            case 'f':
                toggleFullscreen();
                break;
        }
    });
    
    // Device orientation for mobile
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleDeviceOrientation);
    }
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // Prevent default touch behaviors
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('.joystick-base') || e.target.closest('.action-btn') || e.target.closest('.fire-btn')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
    }
}

function setupMobileControls() {
    // Movement joystick
    setupJoystick(movementJoystick, joystickMove);
    
    // Rotation joystick
    setupJoystick(rotationJoystick, joystickRotate);
    
    // Fire buttons
    primaryFireBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameState.paused && !gameState.gameOver) {
            fireWeapon();
        }
    });
    
    specialFireBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameState.paused && !gameState.gameOver) {
            fireSpecialWeapon();
        }
    });
    
    // Speed boost button
    speedBoostBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        gameState.acceleration = 2;
    });
    
    speedBoostBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        gameState.acceleration = 0.5;
    });
    
    // Brake button
    brakeBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        gameState.speed = Math.max(0, gameState.speed - 5);
    });
}

function setupJoystick(element, joystickData) {
    const base = element.querySelector('.joystick-base');
    const handle = element.querySelector('.joystick-handle');
    let startX = 0, startY = 0;
    let baseRect = null;
    
    base.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        baseRect = base.getBoundingClientRect();
        startX = baseRect.left + baseRect.width / 2;
        startY = baseRect.top + baseRect.height / 2;
        joystickData.active = true;
        updateJoystickPosition(touch.clientX, touch.clientY, joystickData, handle, startX, startY, baseRect.width);
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!joystickData.active || !baseRect) return;
        e.preventDefault();
        const touch = e.touches[0];
        updateJoystickPosition(touch.clientX, touch.clientY, joystickData, handle, startX, startY, baseRect.width);
    });
    
    document.addEventListener('touchend', (e) => {
        if (!joystickData.active) return;
        e.preventDefault();
        joystickData.active = false;
        joystickData.x = 0;
        joystickData.y = 0;
        handle.style.transform = 'translate(-50%, -50%)';
    });
}

function updateJoystickPosition(x, y, joystickData, handle, startX, startY, baseSize) {
    const deltaX = x - startX;
    const deltaY = y - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = baseSize / 3;
    
    if (distance > maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        joystickData.x = Math.cos(angle) * maxDistance;
        joystickData.y = Math.sin(angle) * maxDistance;
    } else {
        joystickData.x = deltaX;
        joystickData.y = deltaY;
    }
    
    // Normalize values to -1 to 1
    joystickData.x = joystickData.x / maxDistance;
    joystickData.y = joystickData.y / maxDistance;
    
    // Update handle position
    handle.style.transform = `translate(${joystickData.x * 20}px, ${joystickData.y * 20}px)`;
}

function handleDeviceOrientation(event) {
    // Use device orientation for rotation if available
    if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
        deviceOrientation = {
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma
        };
    }
}

function setupAudio() {
    // Preload audio files with optimizations
    try {
        audioElements.backgroundMusic.volume = 0.2; // Reduced volume
        audioElements.bulletSound.volume = 0.1;
        audioElements.bombSound.volume = 0.3;
        audioElements.missileSound.volume = 0.2;
        audioElements.explosionSound.volume = 0.4;
        audioElements.hitSound.volume = 0.3;
        audioElements.powerupSound.volume = 0.3;
        audioElements.warningSound.volume = 0.4;
    } catch (e) {
        console.log("Audio setup error: ", e);
    }
}

function playSound(soundElement) {
    if (soundElement) {
        soundElement.currentTime = 0;
        soundElement.play().catch(e => console.log("Audio play error: ", e));
    }
}

function showLoadingScreen() {
    loadingScreen.classList.remove('hidden');
    
    const progress = document.querySelector('.progress');
    let progressValue = 0;
    
    const interval = setInterval(() => {
        progressValue += Math.random() * 15 + 5;
        if (progressValue > 100) progressValue = 100;
        progress.style.width = `${progressValue}%`;
        
        if (progressValue >= 100) {
            clearInterval(interval);
        }
    }, 200);
}

function hideLoadingScreen() {
    loadingScreen.classList.add('hidden');
}

function showStartScreen() {
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    instructionsScreen.classList.add('hidden');
    hud.classList.add('hidden');
    mobileControls.classList.add('hidden');
}

function showInstructions() {
    startScreen.classList.add('hidden');
    instructionsScreen.classList.remove('hidden');
}

function showSettings() {
    // Simple settings toggle
    alert("Settings:\n\n- Sound: ON\n- Vibration: ON\n- Graphics: HIGH\n\nMore options coming soon!");
}

function startGame() {
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    
    // Check if mobile device and show controls
    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        mobileControls.classList.remove('hidden');
    }
    
    gameState.paused = false;
    gameState.gameOver = false;
    
    resetGame();
    startWave();
    
    // Start background music
    if (audioElements.backgroundMusic) {
        audioElements.backgroundMusic.play().catch(e => console.log("Background music error: ", e));
    }
}

function togglePause() {
    if (gameState.gameOver) return;
    
    gameState.paused = !gameState.paused;
    if (gameState.paused) {
        pauseScreen.classList.remove('hidden');
        document.getElementById('pauseScore').textContent = gameState.score;
        document.getElementById('pauseWave').textContent = gameState.wave;
        document.getElementById('pauseHealth').textContent = `${Math.round(gameState.health)}%`;
        
        // Pause audio
        if (audioElements.backgroundMusic) {
            audioElements.backgroundMusic.pause();
        }
    } else {
        pauseScreen.classList.add('hidden');
        // Resume audio
        if (audioElements.backgroundMusic) {
            audioElements.backgroundMusic.play().catch(e => console.log("Audio resume error: ", e));
        }
    }
}

function resumeGame() {
    gameState.paused = false;
    pauseScreen.classList.add('hidden');
    // Resume audio
    if (audioElements.backgroundMusic) {
        audioElements.backgroundMusic.play().catch(e => console.log("Audio resume error: ", e));
    }
}

function restartGame() {
    gameState.paused = false;
    gameState.gameOver = false;
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    
    resetGame();
    startWave();
    
    // Start background music
    if (audioElements.backgroundMusic) {
        audioElements.backgroundMusic.play().catch(e => console.log("Background music error: ", e));
    }
}

function goToMenu() {
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    showStartScreen();
    
    // Stop background music
    if (audioElements.backgroundMusic) {
        audioElements.backgroundMusic.pause();
        audioElements.backgroundMusic.currentTime = 0;
    }
}

function resetGame() {
    // Reset game state
    gameState.score = 0;
    gameState.wave = 1;
    gameState.health = 100;
    gameState.shields = 100;
    gameState.currentWeapon = 'bullet';
    gameState.ammo = {
        bullet: Infinity,
        bomb: 10,
        missile: 5
    };
    gameState.enemiesRemaining = 0;
    gameState.enemiesKilled = 0;
    gameState.shotsFired = 0;
    gameState.shotsHit = 0;
    gameState.bossActive = false;
    gameState.speed = 0;
    gameState.lastHealthPack = Date.now();
    
    // Clear all game objects using object pools
    enemies.forEach(enemy => {
        enemy.mesh.visible = false;
        scene.remove(enemy.mesh);
    });
    
    // Reset object pools
    bulletPool.forEach(bullet => {
        bullet.active = false;
        bullet.mesh.visible = false;
    });
    
    particlePool.forEach(particle => {
        particle.active = false;
        particle.mesh.visible = false;
    });
    
    healthPacks.forEach(healthPack => {
        healthPack.mesh.visible = false;
        scene.remove(healthPack.mesh);
    });
    
    enemies = [];
    bullets = [];
    bombs = [];
    missiles = [];
    particles = [];
    healthPacks = [];
    
    // Reset player position and rotation
    if (player) {
        player.mesh.position.set(0, 0, 0);
        player.mesh.rotation.set(0, 0, 0);
        player.velocity.set(0, 0, 0);
    }
    
    // Update HUD
    updateHUD();
    updateWeaponSelection();
}

function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000011, 50, 1000);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 5, 20);
    
    // Create renderer with performance optimizations
    renderer = new THREE.WebGLRenderer({ 
        antialias: false, // Disable antialiasing for better performance
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = false; // Disable shadows for performance
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Append renderer to game container
    if (gameContainer) {
        gameContainer.appendChild(renderer.domElement);
    } else {
        document.body.appendChild(renderer.domElement);
    }
    
    // Add lights - Simplified for performance
    const ambientLight = new THREE.AmbientLight(0x333355, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = false; // Disable shadows
    scene.add(directionalLight);
    
    // Create space frame (bounding box) - Simplified
    createSpaceFrame();
    
    // Create starfield - Optimized
    createStarfield();
    
    // Create player
    createPlayer();
}

function createSpaceFrame() {
    // Simplified space frame for performance
    const size = 1000;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x0088ff,
        transparent: true,
        opacity: 0.3
    });
    
    frame = new THREE.LineSegments(edges, lineMaterial);
    scene.add(frame);
}

function createStarfield() {
    // Optimized starfield with fewer stars
    const starCount = 500; // Reduced from 2000
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
        // Random positions within frame
        const size = 500;
        starPositions[i] = (Math.random() - 0.5) * size;
        starPositions[i + 1] = (Math.random() - 0.5) * size;
        starPositions[i + 2] = (Math.random() - 0.5) * size;
        
        // Random colors (mostly white/blue)
        const color = Math.random() > 0.3 ? 0.8 : Math.random() * 0.5 + 0.5;
        starColors[i] = color;
        starColors[i + 1] = color;
        starColors[i + 2] = Math.min(1, color + 0.2);
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        size: 1.5, // Slightly larger stars
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
    stars.push(starField);
}

function createPlayer() {
    const group = new THREE.Group();
    
    // Simplified ship body for better performance
    const bodyGeometry = new THREE.ConeGeometry(0.8, 2, 6); // Reduced segments
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x0080ff,
        shininess: 50, // Reduced shininess
        emissive: 0x002244,
        emissiveIntensity: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    body.castShadow = false; // Disable shadows
    group.add(body);
    
    // Simplified cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.5, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2); // Reduced segments
    const cockpitMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7,
        shininess: 50
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.y = 0.4;
    cockpit.castShadow = false;
    group.add(cockpit);
    
    // Simplified wings
    const wingGeometry = new THREE.BoxGeometry(2.5, 0.1, 1.2);
    const wingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x0044aa,
        shininess: 30
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.x = -1.2;
    leftWing.position.z = -0.6;
    leftWing.castShadow = false;
    group.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.x = 1.2;
    rightWing.position.z = -0.6;
    rightWing.castShadow = false;
    group.add(rightWing);
    
    // Engines
    const engineGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1, 6); // Reduced segments
    const engineMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff5500,
        emissive: 0x442200,
        emissiveIntensity: 0.5
    });
    
    const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    leftEngine.position.x = -0.7;
    leftEngine.position.z = -1;
    leftEngine.rotation.x = Math.PI / 2;
    group.add(leftEngine);
    
    const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    rightEngine.position.x = 0.7;
    rightEngine.position.z = -1;
    rightEngine.rotation.x = Math.PI / 2;
    group.add(rightEngine);
    
    // Engine glow - Simplified
    const glowGeometry = new THREE.SphereGeometry(0.4, 6, 6); // Reduced segments
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.6
    });
    
    const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    leftGlow.position.x = -0.7;
    leftGlow.position.z = -1.6;
    group.add(leftGlow);
    
    const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    rightGlow.position.x = 0.7;
    rightGlow.position.z = -1.6;
    group.add(rightGlow);
    
    // Weapons
    const weaponGeometry = new THREE.BoxGeometry(0.3, 0.3, 1);
    const weaponMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888,
        shininess: 30
    });
    
    const leftWeapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    leftWeapon.position.x = -1;
    leftWeapon.position.y = 0.2;
    leftWeapon.position.z = 0.5;
    group.add(leftWeapon);
    
    const rightWeapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    rightWeapon.position.x = 1;
    rightWeapon.position.y = 0.2;
    rightWeapon.position.z = 0.5;
    group.add(rightWeapon);
    
    group.position.set(0, 0, 0);
    scene.add(group);
    
    player = {
        mesh: group,
        velocity: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        engineGlows: [leftGlow, rightGlow],
        weapons: [leftWeapon, rightWeapon]
    };
}

function createEnemy(type, position) {
    const group = new THREE.Group();
    let size, color, health, speed, fireRate;
    
    switch(type) {
        case 'scout':
            size = 0.6;
            color = 0x00ff00;
            health = 30;
            speed = 0.1;
            fireRate = 0.02;
            break;
        case 'fighter':
            size = 0.9;
            color = 0xffaa00;
            health = 60;
            speed = 0.07;
            fireRate = 0.015;
            break;
        case 'capital':
            size = 1.5;
            color = 0xff0000;
            health = 150;
            speed = 0.04;
            fireRate = 0.01;
            break;
        case 'boss':
            size = 3;
            color = 0xff00ff;
            health = 500;
            speed = 0.02;
            fireRate = 0.005;
            break;
    }
    
    // Enemy body - Simplified geometry
    const geometry = type === 'boss' ? 
        new THREE.OctahedronGeometry(size) : 
        new THREE.DodecahedronGeometry(size, 0);
    
    const material = new THREE.MeshPhongMaterial({ 
        color: color,
        shininess: 10, // Reduced for performance
        emissive: color,
        emissiveIntensity: 0.2
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false; // Disable shadows
    group.add(mesh);
    
    // Enemy AI properties
    const enemy = {
        mesh: group,
        type: type,
        health: health,
        maxHealth: health,
        position: position.clone(),
        targetPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        speed: speed,
        fireRate: fireRate,
        lastShot: 0,
        lastDirectionChange: 0,
        attackPattern: Math.floor(Math.random() * 3), // 0: direct, 1: circling, 2: zigzag
        circlingAngle: 0,
        zigzagDirection: 1
    };
    
    // Set initial target
    updateEnemyTarget(enemy);
    
    enemies.push(enemy);
    scene.add(group);
    return enemy;
}

function updateEnemyTarget(enemy) {
    // Set new target position (random around player)
    const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
    );
    
    enemy.targetPosition.copy(player.mesh.position).add(offset);
    enemy.lastDirectionChange = Date.now();
}

function createBullet(position, direction, type = 'bullet') {
    // Get bullet from pool instead of creating new ones
    const bullet = getBulletFromPool();
    if (!bullet) return null; // No available bullets
    
    let speed, size, color;
    
    switch(type) {
        case 'bullet':
            speed = 2;
            size = 0.2;
            color = 0x00ffff;
            playSound(audioElements.bulletSound);
            break;
        case 'bomb':
            speed = 1;
            size = 0.5;
            color = 0xffaa00;
            playSound(audioElements.bombSound);
            break;
        case 'missile':
            speed = 1.5;
            size = 0.3;
            color = 0xff55ff;
            playSound(audioElements.missileSound);
            break;
    }
    
    // Configure the bullet from pool
    bullet.mesh.position.copy(position);
    bullet.mesh.material.color.set(color);
    bullet.position.copy(position);
    bullet.velocity.copy(direction.clone().normalize().multiplyScalar(speed));
    bullet.type = type;
    bullet.size = size;
    bullet.homing = type === 'missile';
    bullet.target = null;
    bullet.lifeTime = type === 'missile' ? 5 : 3;
    
    if (type === 'missile' && enemies.length > 0) {
        // Find nearest enemy for homing
        let nearestDist = Infinity;
        enemies.forEach(enemy => {
            const dist = position.distanceTo(enemy.mesh.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                bullet.target = enemy;
            }
        });
    }
    
    bullets.push(bullet);
    return bullet;
}

function createEnemyBullet(position, direction, type = 'small') {
    const bullet = getBulletFromPool();
    if (!bullet) return null;
    
    const size = type === 'large' ? 0.4 : 0.2;
    const color = type === 'large' ? 0xff5555 : 0xff8888;
    const damage = type === 'large' ? 20 : 10;
    
    bullet.mesh.position.copy(position);
    bullet.mesh.material.color.set(color);
    bullet.position.copy(position);
    bullet.velocity.copy(direction.clone().normalize().multiplyScalar(type === 'large' ? 1 : 1.5));
    bullet.type = type;
    bullet.damage = damage;
    bullet.size = size;
    bullet.homing = false;
    bullet.lifeTime = 2;
    
    bullets.push(bullet);
    return bullet;
}

function createParticle(position, color, size, velocity, lifeTime = 1.0) {
    // Get particle from pool
    const particle = getParticleFromPool();
    if (!particle) return null;
    
    particle.mesh.position.copy(position);
    particle.mesh.material.color.set(color);
    particle.mesh.material.opacity = 1.0;
    particle.position.copy(position);
    particle.velocity.copy(velocity);
    particle.color.set(color);
    particle.lifeTime = lifeTime;
    particle.maxLifeTime = lifeTime;
    particle.size = size;
    
    particles.push(particle);
    return particle;
}

function createHealthPack(position) {
    const geometry = new THREE.OctahedronGeometry(1);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        shininess: 50,
        emissive: 0x220000,
        transparent: true,
        opacity: 0.9
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    
    const healthPack = {
        mesh: mesh,
        position: position.clone(),
        rotation: new THREE.Vector3(0, 0.02, 0),
        value: 30
    };
    
    healthPacks.push(healthPack);
    scene.add(mesh);
    
    // Show notification
    const notice = document.getElementById('healthPickupNotice');
    notice.classList.remove('hidden');
    setTimeout(() => notice.classList.add('hidden'), 3000);
    
    playSound(audioElements.powerupSound);
    
    return healthPack;
}

function fireWeapon() {
    if (gameState.ammo[gameState.currentWeapon] <= 0) {
        // Switch to bullet if out of ammo
        gameState.currentWeapon = 'bullet';
        updateWeaponSelection();
        return;
    }
    
    gameState.shotsFired++;
    
    const weaponPositions = player.weapons.map(weapon => {
        const position = new THREE.Vector3();
        weapon.getWorldPosition(position);
        return position;
    });
    
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(player.mesh.quaternion);
    
    switch(gameState.currentWeapon) {
        case 'bullet':
            // Fire from both weapons
            weaponPositions.forEach(pos => {
                createBullet(pos, forward, 'bullet');
            });
            break;
            
        case 'bomb':
            if (gameState.ammo.bomb > 0) {
                createBullet(player.mesh.position, forward, 'bomb');
                gameState.ammo.bomb--;
            }
            break;
            
        case 'missile':
            if (gameState.ammo.missile > 0) {
                createBullet(player.mesh.position, forward, 'missile');
                gameState.ammo.missile--;
            }
            break;
    }
    
    updateHUD();
}

function fireSpecialWeapon() {
    // Fire all weapons at once
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(player.mesh.quaternion);
    
    // Fire one of each type if available
    if (gameState.ammo.bomb > 0) {
        createBullet(player.mesh.position, forward, 'bomb');
        gameState.ammo.bomb--;
    }
    
    if (gameState.ammo.missile > 0) {
        createBullet(player.mesh.position, forward, 'missile');
        gameState.ammo.missile--;
    }
    
    // Always fire bullets
    const weaponPositions = player.weapons.map(weapon => {
        const position = new THREE.Vector3();
        weapon.getWorldPosition(position);
        return position;
    });
    
    weaponPositions.forEach(pos => {
        createBullet(pos, forward, 'bullet');
    });
    
    updateHUD();
}

function startWave() {
    const enemyCount = Math.min(5 + gameState.wave * 2, 20); // Limit maximum enemies
    gameState.enemiesRemaining = enemyCount;
    
    // Check for boss wave
    if (gameState.wave % 5 === 0) {
        gameState.bossActive = true;
        createEnemy('boss', new THREE.Vector3(0, 0, -200));
        gameState.enemiesRemaining = 1;
        
        // Show boss warning
        const warning = document.getElementById('bossWarning');
        warning.classList.remove('hidden');
        playSound(audioElements.warningSound);
        setTimeout(() => warning.classList.add('hidden'), 3000);
    } else {
        gameState.bossActive = false;
        
        // Create mixed enemies
        for (let i = 0; i < enemyCount; i++) {
            const type = Math.random() < 0.6 ? 'scout' : (Math.random() < 0.7 ? 'fighter' : 'capital');
            const angle = (i / enemyCount) * Math.PI * 2;
            const radius = 100 + Math.random() * 50;
            
            const position = new THREE.Vector3(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius * 0.5,
                -150 - Math.random() * 50
            );
            
            createEnemy(type, position);
        }
    }
    
    updateHUD();
}

function updatePlayer(deltaTime) {
    if (!player || gameState.paused || gameState.gameOver) return;
    
    // Handle movement from joystick
    const moveForce = new THREE.Vector3(
        joystickMove.x,
        0,
        -joystickMove.y  // Invert y for intuitive controls
    );
    
    // Handle rotation from joystick
    if (joystickRotate.active) {
        player.mesh.rotation.y -= joystickRotate.x * gameState.rotationSpeed * 60 * deltaTime;
        player.mesh.rotation.x += joystickRotate.y * gameState.rotationSpeed * 60 * deltaTime;
    }
    
    // Handle device orientation rotation
    if (window.DeviceOrientationEvent && !joystickRotate.active) {
        const beta = deviceOrientation.beta || 0;
        const gamma = deviceOrientation.gamma || 0;
        
        // Convert device orientation to rotation (simplified)
        player.mesh.rotation.x = (beta - 90) * (Math.PI / 180);
        player.mesh.rotation.y = gamma * (Math.PI / 180);
    }
    
    // Apply movement in local space
    moveForce.applyQuaternion(player.mesh.quaternion);
    moveForce.multiplyScalar(gameState.acceleration);
    
    // Update speed
    if (moveForce.length() > 0) {
        gameState.speed = Math.min(gameState.maxSpeed, gameState.speed + deltaTime * 600);
    } else {
        gameState.speed = Math.max(0, gameState.speed - deltaTime * 300);
    }
    
    // Apply movement based on forward direction and speed
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(player.mesh.quaternion);
    forward.multiplyScalar(gameState.speed * deltaTime);
    
    player.mesh.position.add(forward);
    player.mesh.position.add(moveForce.multiplyScalar(deltaTime * 600));
    
    // Keep player within bounds
    const bounds = 400;
    player.mesh.position.x = THREE.MathUtils.clamp(player.mesh.position.x, -bounds, bounds);
    player.mesh.position.y = THREE.MathUtils.clamp(player.mesh.position.y, -bounds, bounds);
    player.mesh.position.z = THREE.MathUtils.clamp(player.mesh.position.z, -bounds, bounds);
    
    // Update camera position (third person)
    const cameraOffset = new THREE.Vector3(0, 5, 20);
    cameraOffset.applyQuaternion(player.mesh.quaternion);
    camera.position.copy(player.mesh.position).add(cameraOffset);
    camera.lookAt(player.mesh.position);
    
    // Animate engine glow
    const intensity = 0.3 + (gameState.speed / gameState.maxSpeed) * 0.4;
    player.engineGlows.forEach(glow => {
        glow.material.opacity = intensity + Math.random() * 0.2;
        const scale = 0.8 + (gameState.speed / gameState.maxSpeed) * 0.4;
        glow.scale.setScalar(scale);
    });
}

function updateEnemies(deltaTime) {
    const now = Date.now();
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Update AI behavior
        updateEnemyAI(enemy, deltaTime, now);
        
        // Update position
        enemy.mesh.position.add(enemy.velocity);
        
        // Face player
        enemy.mesh.lookAt(player.mesh.position);
        
        // Enemy firing - Reduce frequency for performance
        if (now - enemy.lastShot > 1000 / enemy.fireRate) {
            const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, enemy.mesh.position).normalize();
            
            // Randomly choose between small and large fire
            const fireType = Math.random() < 0.3 ? 'large' : 'small';
            createEnemyBullet(enemy.mesh.position.clone(), toPlayer, fireType);
            
            enemy.lastShot = now;
        }
        
        // Rotate enemy for visual effect - Reduced frequency
        enemy.mesh.rotation.x += 0.01 * deltaTime * 60;
        enemy.mesh.rotation.y += 0.01 * deltaTime * 60;
        
        // Check bounds
        const bounds = 500;
        if (Math.abs(enemy.mesh.position.x) > bounds || 
            Math.abs(enemy.mesh.position.y) > bounds || 
            Math.abs(enemy.mesh.position.z) > bounds) {
            // Reset enemy position
            enemy.mesh.position.set(
                (Math.random() - 0.5) * bounds,
                (Math.random() - 0.5) * bounds,
                -bounds
            );
        }
    }
}

function updateEnemyAI(enemy, deltaTime, now) {
    // Change direction periodically
    if (now - enemy.lastDirectionChange > 3000) {
        updateEnemyTarget(enemy);
    }
    
    // Calculate direction to target
    const direction = new THREE.Vector3().subVectors(enemy.targetPosition, enemy.mesh.position).normalize();
    
    // Apply attack pattern
    switch(enemy.attackPattern) {
        case 0: // Direct attack
            enemy.velocity.lerp(direction.multiplyScalar(enemy.speed), 0.1);
            break;
            
        case 1: // Circling attack
            enemy.circlingAngle += deltaTime;
            const circleRadius = 50;
            const circlePos = new THREE.Vector3(
                Math.cos(enemy.circlingAngle) * circleRadius,
                Math.sin(enemy.circlingAngle) * circleRadius,
                0
            );
            const circleDirection = new THREE.Vector3().subVectors(
                player.mesh.position.clone().add(circlePos),
                enemy.mesh.position
            ).normalize();
            enemy.velocity.lerp(circleDirection.multiplyScalar(enemy.speed), 0.05);
            break;
            
        case 2: // Zigzag attack
            if (now - enemy.lastDirectionChange > 1000) {
                enemy.zigzagDirection *= -1;
                enemy.lastDirectionChange = now;
            }
            const zigzagOffset = new THREE.Vector3(enemy.zigzagDirection * 20, 0, 0);
            const zigzagDirection = new THREE.Vector3().subVectors(
                player.mesh.position.clone().add(zigzagOffset),
                enemy.mesh.position
            ).normalize();
            enemy.velocity.lerp(zigzagDirection.multiplyScalar(enemy.speed), 0.1);
            break;
    }
}

function updateBullets(deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        if (!bullet.active) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Update homing missiles
        if (bullet.homing && bullet.target) {
            const direction = new THREE.Vector3().subVectors(bullet.target.mesh.position, bullet.position).normalize();
            bullet.velocity.lerp(direction.multiplyScalar(1.5), 0.1);
        }
        
        // Update position
        bullet.position.add(bullet.velocity.clone().multiplyScalar(deltaTime * 60));
        bullet.mesh.position.copy(bullet.position);
        
        // Rotate missiles
        if (bullet.type === 'missile') {
            bullet.mesh.lookAt(bullet.position.clone().add(bullet.velocity));
        }
        
        // Check lifetime
        bullet.lifeTime -= deltaTime;
        if (bullet.lifeTime <= 0) {
            bullet.active = false;
            bullet.mesh.visible = false;
            bullets.splice(i, 1);
        }
        
        // Check bounds
        const bounds = 600;
        if (Math.abs(bullet.position.x) > bounds || 
            Math.abs(bullet.position.y) > bounds || 
            Math.abs(bullet.position.z) > bounds) {
            bullet.active = false;
            bullet.mesh.visible = false;
            bullets.splice(i, 1);
        }
    }
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        if (!particle.active) {
            particles.splice(i, 1);
            continue;
        }
        
        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 60));
        particle.mesh.position.copy(particle.position);
        
        particle.lifeTime -= deltaTime;
        const alpha = particle.lifeTime / particle.maxLifeTime;
        
        particle.mesh.material.opacity = alpha;
        particle.mesh.scale.setScalar(particle.size * alpha);
        
        if (particle.lifeTime <= 0) {
            particle.active = false;
            particle.mesh.visible = false;
            particles.splice(i, 1);
        }
    }
}

function updateHealthPacks(deltaTime) {
    for (let i = healthPacks.length - 1; i >= 0; i--) {
        const healthPack = healthPacks[i];
        
        // Rotate
        healthPack.mesh.rotation.x += healthPack.rotation.x * deltaTime * 60;
        healthPack.mesh.rotation.y += healthPack.rotation.y * deltaTime * 60;
        healthPack.mesh.rotation.z += healthPack.rotation.z * deltaTime * 60;
        
        // Pulsate
        const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
        healthPack.mesh.scale.setScalar(scale);
        
        // Check bounds
        const bounds = 500;
        if (Math.abs(healthPack.mesh.position.x) > bounds || 
            Math.abs(healthPack.mesh.position.y) > bounds || 
            Math.abs(healthPack.mesh.position.z) > bounds) {
            scene.remove(healthPack.mesh);
            healthPacks.splice(i, 1);
        }
    }
    
    // Spawn health packs randomly - Reduced frequency
    const now = Date.now();
    if (now - gameState.lastHealthPack > 30000 && healthPacks.length < 2 && Math.random() < 0.005) {
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 300
        );
        createHealthPack(position);
        gameState.lastHealthPack = now;
    }
}

function checkCollisions() {
    // Player bullets vs enemies - Optimized collision detection
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet.active || bullet.type === 'small' || bullet.type === 'large') continue;
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            // Fast distance check before more expensive collision
            const distance = bullet.position.distanceTo(enemy.mesh.position);
            const hitDistance = bullet.size + (enemy.type === 'boss' ? 3 : 1);
            
            if (distance < hitDistance) {
                // Calculate damage based on bullet type
                let damage = 0;
                switch(bullet.type) {
                    case 'bullet': damage = 10; break;
                    case 'bomb': damage = 50; break;
                    case 'missile': damage = 30; break;
                }
                
                enemy.health -= damage;
                gameState.shotsHit++;
                
                // Create hit effect - Reduced particles
                for (let k = 0; k < 3; k++) {
                    createParticle(
                        bullet.position.clone(),
                        bullet.type === 'bomb' ? 0xffaa00 : 0x00ffff,
                        0.2,
                        new THREE.Vector3(
                            (Math.random() - 0.5) * 0.5,
                            (Math.random() - 0.5) * 0.5,
                            (Math.random() - 0.5) * 0.5
                        ),
                        0.5
                    );
                }
                
                // Remove bullet
                bullet.active = false;
                bullet.mesh.visible = false;
                bullets.splice(i, 1);
                
                // Check if enemy is destroyed
                if (enemy.health <= 0) {
                    // Create explosion - Reduced particles
                    for (let k = 0; k < 8; k++) {
                        createParticle(
                            enemy.mesh.position.clone(),
                            enemy.type === 'boss' ? 0xff00ff : 0xff5500,
                            0.3,
                            new THREE.Vector3(
                                (Math.random() - 0.5) * 2,
                                (Math.random() - 0.5) * 2,
                                (Math.random() - 0.5) * 2
                            ),
                            1.0
                        );
                    }
                    
                    // Add score
                    let score = 0;
                    switch(enemy.type) {
                        case 'scout': score = 100; break;
                        case 'fighter': score = 250; break;
                        case 'capital': score = 500; break;
                        case 'boss': score = 5000; break;
                    }
                    
                    gameState.score += score;
                    gameState.enemiesKilled++;
                    gameState.enemiesRemaining--;
                    
                    // Play explosion sound
                    playSound(audioElements.explosionSound);
                    
                    // Remove enemy
                    scene.remove(enemy.mesh);
                    enemies.splice(j, 1);
                } else {
                    // Play hit sound
                    playSound(audioElements.hitSound);
                }
                
                break;
            }
        }
    }
    
    // Enemy bullets vs player
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet.active) continue;
        
        if (bullet.type === 'small' || bullet.type === 'large') {
            const distance = bullet.position.distanceTo(player.mesh.position);
            
            if (distance < 2) {
                // Hit player
                const damage = bullet.type === 'large' ? 20 : 10;
                
                if (gameState.shields > 0) {
                    gameState.shields -= damage;
                    
                    // Create shield hit effect - Reduced particles
                    for (let j = 0; j < 3; j++) {
                        createParticle(
                            bullet.position.clone(),
                            0x00aaff,
                            0.15,
                            new THREE.Vector3(
                                (Math.random() - 0.5) * 0.3,
                                (Math.random() - 0.5) * 0.3,
                                (Math.random() - 0.5) * 0.3
                            ),
                            0.3
                        );
                    }
                } else {
                    gameState.health -= damage;
                    
                    // Create hull hit effect - Reduced particles
                    for (let j = 0; j < 3; j++) {
                        createParticle(
                            bullet.position.clone(),
                            0xff5500,
                            0.2,
                            new THREE.Vector3(
                                (Math.random() - 0.5) * 0.5,
                                (Math.random() - 0.5) * 0.5,
                                (Math.random() - 0.5) * 0.5
                            ),
                            0.5
                        );
                    }
                    
                    // Screen shake and red effect for low health
                    if (gameState.health < 30) {
                        camera.position.x += (Math.random() - 0.5) * 0.5;
                        camera.position.y += (Math.random() - 0.5) * 0.5;
                        document.body.classList.add('screen-red');
                        setTimeout(() => document.body.classList.remove('screen-red'), 300);
                        
                        // Show warning
                        document.getElementById('lowHealthWarning').classList.remove('hidden');
                        playSound(audioElements.warningSound);
                    }
                }
                
                // Play hit sound
                playSound(audioElements.hitSound);
                
                // Remove bullet
                bullet.active = false;
                bullet.mesh.visible = false;
                bullets.splice(i, 1);
                
                // Check if player is destroyed
                if (gameState.health <= 0) {
                    gameOver();
                }
            }
        }
    }
    
    // Health packs vs player
    for (let i = healthPacks.length - 1; i >= 0; i--) {
        const healthPack = healthPacks[i];
        const distance = healthPack.mesh.position.distanceTo(player.mesh.position);
        
        if (distance < 2) {
            // Collect health pack
            gameState.health = Math.min(100, gameState.health + healthPack.value);
            
            // Create collection effect - Reduced particles
            for (let j = 0; j < 8; j++) {
                createParticle(
                    healthPack.mesh.position.clone(),
                    0xff0000,
                    0.15,
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 0.3,
                        (Math.random() - 0.5) * 0.3,
                        (Math.random() - 0.5) * 0.3
                    ),
                    0.7
                );
            }
            
            // Play powerup sound
            playSound(audioElements.powerupSound);
            
            // Remove health pack
            scene.remove(healthPack.mesh);
            healthPacks.splice(i, 1);
            
            // Update HUD
            updateHUD();
        }
    }
    
    // Enemy vs player collision
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const distance = enemy.mesh.position.distanceTo(player.mesh.position);
        const collisionDistance = enemy.type === 'boss' ? 4 : 2;
        
        if (distance < collisionDistance) {
            // Collision damage
            gameState.health -= 30;
            
            // Create collision effect - Reduced particles
            for (let j = 0; j < 8; j++) {
                createParticle(
                    player.mesh.position.clone(),
                    0xff0000,
                    0.3,
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 1,
                        (Math.random() - 0.5) * 1,
                        (Math.random() - 0.5) * 1
                    ),
                    1.0
                );
            }
            
            // Also damage enemy
            enemy.health -= 50;
            
            // Screen shake
            camera.position.x += (Math.random() - 0.5) * 2;
            camera.position.y += (Math.random() - 0.5) * 2;
            
            // Check if enemy is destroyed
            if (enemy.health <= 0) {
                scene.remove(enemy.mesh);
                enemies.splice(i, 1);
                gameState.enemiesRemaining--;
                gameState.score += enemy.type === 'boss' ? 5000 : 200;
                gameState.enemiesKilled++;
                
                playSound(audioElements.explosionSound);
            }
            
            // Check if player is destroyed
            if (gameState.health <= 0) {
                gameOver();
            }
            
            updateHUD();
        }
    }
}

function updateHUD() {
    // Update health and shields
    document.getElementById('healthFill').style.width = `${gameState.health}%`;
    document.getElementById('shieldFill').style.width = `${gameState.shields}%`;
    document.getElementById('healthValue').textContent = `${Math.round(gameState.health)}%`;
    document.getElementById('shieldValue').textContent = `${Math.round(gameState.shields)}%`;
    
    // Update score and wave
    document.getElementById('scoreValue').textContent = gameState.score;
    document.getElementById('enemyCount').textContent = gameState.enemiesRemaining;
    document.getElementById('waveValue').textContent = gameState.wave;
    
    // Update speed
    const speedPercent = (gameState.speed / gameState.maxSpeed) * 100;
    document.getElementById('speedFill').style.width = `${speedPercent}%`;
    document.getElementById('speedValue').textContent = `${Math.round(speedPercent)}%`;
    
    // Update ammo counts
    document.getElementById('bulletCount').textContent = gameState.ammo.bullet === Infinity ? "∞" : gameState.ammo.bullet;
    document.getElementById('bombCount').textContent = gameState.ammo.bomb;
    document.getElementById('missileCount').textContent = gameState.ammo.missile;
    
    // Update minimap player dot position
    const playerDot = document.getElementById('playerDot');
    const playerX = (player.mesh.position.x / 500) * 40;
    const playerY = (player.mesh.position.y / 500) * 40;
    playerDot.style.transform = `translate(${playerX}px, ${playerY}px)`;
}

function updateWeaponSelection() {
    weaponButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.weapon === gameState.currentWeapon) {
            btn.classList.add('active');
        }
    });
}

function checkWaveCompletion() {
    if (gameState.enemiesRemaining <= 0 && !gameState.gameOver && enemies.length === 0) {
        // Wave completed
        gameState.wave++;
        
        // Add bonus score
        gameState.score += gameState.wave * 500;
        
        // Recharge shields and health slightly
        gameState.shields = Math.min(100, gameState.shields + 20);
        gameState.health = Math.min(100, gameState.health + 10);
        
        // Restock ammo
        gameState.ammo.bomb = Math.min(15, gameState.ammo.bomb + 3);
        gameState.ammo.missile = Math.min(8, gameState.ammo.missile + 2);
        
        // Start next wave after delay
        setTimeout(() => {
            startWave();
            updateHUD();
        }, 3000);
    }
}

function gameOver() {
    gameState.gameOver = true;
    
    // Create explosion effect - Reduced particles
    for (let i = 0; i < 15; i++) {
        createParticle(
            player.mesh.position.clone(),
            0xff5500,
            0.4,
            new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3
            ),
            2.0
        );
    }
    
    // Update statistics
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('galacticWarHighScore', gameState.highScore);
    }
    
    gameState.totalWaves = Math.max(gameState.totalWaves, gameState.wave);
    gameState.totalKills += gameState.enemiesKilled;
    localStorage.setItem('galacticWarWaves', gameState.totalWaves);
    localStorage.setItem('galacticWarKills', gameState.totalKills);
    
    // Calculate accuracy
    const accuracy = gameState.shotsFired > 0 ? 
        Math.round((gameState.shotsHit / gameState.shotsFired) * 100) : 0;
    
    // Calculate rank
    let rank = "ROOKIE";
    const score = gameState.score;
    if (score >= 50000) rank = "ELITE COMMANDER";
    else if (score >= 25000) rank = "VETERAN";
    else if (score >= 10000) rank = "CAPTAIN";
    else if (score >= 5000) rank = "LIEUTENANT";
    else if (score >= 1000) rank = "ENSIGN";
    
    // Update game over screen
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalWaves').textContent = gameState.wave;
    document.getElementById('finalEnemies').textContent = gameState.enemiesKilled;
    document.getElementById('finalAccuracy').textContent = `${accuracy}%`;
    document.getElementById('rankValue').textContent = rank;
    
    // Stop background music
    if (audioElements.backgroundMusic) {
        audioElements.backgroundMusic.pause();
        audioElements.backgroundMusic.currentTime = 0;
    }
    
    // Play explosion sound
    playSound(audioElements.explosionSound);
    
    // Show game over screen
    setTimeout(() => {
        hud.classList.add('hidden');
        mobileControls.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
    }, 2000);
}

function onWindowResize() {
    checkOrientation(); // Check orientation on resize
    
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    // Calculate delta time
    const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0;
    lastTime = currentTime;
    
    // Skip updates if game is paused or over
    if (gameState.paused || gameState.gameOver) {
        renderer.render(scene, camera);
        return;
    }
    
    // Fixed time step for consistent physics
    accumulator += deltaTime;
    
    while (accumulator >= fixedTimeStep) {
        // Update game objects with fixed time step
        updatePlayer(fixedTimeStep);
        updateEnemies(fixedTimeStep);
        updateBullets(fixedTimeStep);
        updateParticles(fixedTimeStep);
        updateHealthPacks(fixedTimeStep);
        
        // Check collisions
        checkCollisions();
        
        // Check wave completion
        checkWaveCompletion();
        
        // Rotate space frame and stars slowly
        if (frame) {
            frame.rotation.y += 0.0001 * fixedTimeStep * 60;
            frame.rotation.x += 0.00005 * fixedTimeStep * 60;
        }
        
        stars.forEach(starField => {
            starField.rotation.y += 0.00005 * fixedTimeStep * 60;
        });
        
        // Regenerate shields slowly
        if (gameState.shields < gameState.maxShields) {
            gameState.shields = Math.min(gameState.maxShields, gameState.shields + fixedTimeStep * 5);
        }
        
        accumulator -= fixedTimeStep;
    }
    
    // Update HUD (less frequently for performance)
    if (currentTime % 100 < 16) { // Update HUD at ~60fps
        updateHUD();
    }
    
    // Render scene
    renderer.render(scene, camera);
}

function initGame() {
    // Set initial HUD values
    updateHUD();
    updateWeaponSelection();
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', init);