// Ariq Azmain's Galactic War - Mission Edition
// Fixed Version - Game Start Issues Resolved

// Game Configuration
const CONFIG = {
    // Graphics Settings
    SHADOWS: true,
    BLOOM: false, // Disabled for performance
    PARTICLES: true,
    POST_PROCESSING: false, // Disabled for performance
    
    // Game Settings
    PLAYER_SPEED: 50,
    PLAYER_ROTATION_SPEED: 0.05,
    PLAYER_BOOST_MULTIPLIER: 2,
    
    // Weapon Settings
    BULLET_SPEED: 100,
    BOMB_SPEED: 60,
    MISSILE_SPEED: 80,
    BOMB_RELOAD_TIME: 5000,
    MISSILE_RELOAD_TIME: 10000,
    
    // Mission Settings
    WAYPOINT_DISTANCE: 1000,
    TOTAL_WAYPOINTS: 5,
    STATION_HEALTH: 10000,
    
    // Enemy Settings
    ENEMY_SPEED: 20,
    ENEMY_FIRE_RATE: 2000, // Increased for easier gameplay
    ENEMY_DAMAGE: 10
};

// Game State
let gameState = {
    currentScreen: 'loading',
    isPaused: false,
    isGameOver: false,
    missionStarted: false,
    currentWaypoint: 1,
    missionComplete: false,
    missionStartTime: null,
    
    player: {
        health: 100,
        maxHealth: 100,
        energy: 100,
        maxEnergy: 100,
        score: 0,
        kills: 0,
        distance: 0,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        bulletsFired: 0,
        hits: 0
    },
    
    weapons: {
        bullets: Infinity,
        bombs: 10,
        maxBombs: 10,
        missiles: 3,
        maxMissiles: 3,
        drone: 1,
        nuke: 1
    },
    
    station: {
        health: CONFIG.STATION_HEALTH,
        maxHealth: CONFIG.STATION_HEALTH,
        outerLayerDestroyed: false,
        innerLayerDestroyed: false,
        coreDestroyed: false
    },
    
    settings: {
        difficulty: 'normal',
        masterVolume: 0.8,
        musicVolume: 0.7,
        sfxVolume: 0.9,
        voiceVolume: 0.85,
        autoAim: true,
        aiVoice: true,
        audioEnabled: false // Audio disabled by default
    },
    
    audio: {
        enabled: false, // Disabled due to browser restrictions
        backgroundMusic: null,
        bulletSound: null,
        explosionSound: null,
        missileSound: null,
        healthSound: null,
        warningSound: null,
        victorySound: null
    }
};

// Three.js Variables
let scene, camera, renderer;
let playerShip, waypoints = [], enemies = [], asteroids = [], healthPacks = [];
let bullets = [], bombs = [], missiles = [];
let clock = new THREE.Clock();
let deltaTime = 0;
let animationFrameId = null;

// Input State
let keys = {};
let mouse = { x: 0, y: 0, down: false };
let isBoosting = false;

// Mobile Controls
let joystickActive = false;
let joystickX = 0;
let joystickY = 0;

// Initialize Game
function initGame() {
    console.log("Initializing game...");
    
    // Setup event listeners first
    setupEventListeners();
    
    // Initialize Three.js
    initThreeJS();
    
    // Initialize audio system (simplified)
    initAudioSystem();
    
    // Show mobile controls when on touchscreen
    if ('ontouchstart' in window) {
        setTimeout(() => {
            document.getElementById('mobileControls').classList.remove('hidden');
            initMobileControls();
        }, 1000);
    }
    
    // Start loading simulation
    simulateLoading();
}

function simulateLoading() {
    console.log("Starting loading simulation...");
    
    let progress = 0;
    const loadingStages = [
        "Initializing Game Engine...",
        "Loading Graphics System...",
        "Setting Up Mission Environment...",
        "Preparing AI Systems...",
        "Finalizing Systems...",
        "Ready for Mission!"
    ];
    
    const interval = setInterval(() => {
        progress += Math.random() * 20 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            // Update progress bar
            document.getElementById('loadingProgress').style.width = progress + '%';
            document.getElementById('loadingText').textContent = loadingStages[loadingStages.length - 1];
            
            setTimeout(loadingComplete, 500);
        }
        
        // Update progress bar
        document.getElementById('loadingProgress').style.width = progress + '%';
        
        // Update loading text
        const stageIndex = Math.floor(progress / (100 / loadingStages.length));
        document.getElementById('loadingText').textContent = 
            loadingStages[Math.min(stageIndex, loadingStages.length - 1)];
            
    }, 200);
}

function loadingComplete() {
    console.log("Loading complete!");
    
    // Show welcome message
    if (gameState.settings.aiVoice) {
        showAITextResponse("Welcome to Galactic War, Commander Ariq Azmain. Your mission is ready. Good luck!");
    }
    
    // Hide loading screen
    document.getElementById('loadingScreen').classList.add('hidden');
    
    // Show main menu
    showScreen('mainMenu');
    
    // Load saved data
    loadSavedData();
    
    // Update audio status
    document.getElementById('audioStatus').classList.remove('active');
}

function initAudioSystem() {
    console.log("Initializing audio system in fallback mode...");
    
    // Set audio to disabled
    gameState.audio.enabled = false;
    gameState.settings.audioEnabled = false;
    
    // Update UI
    document.getElementById('audioStatus').classList.remove('active');
    document.getElementById('audioStatus').innerHTML = '<i class="fas fa-volume-mute"></i><span>AUDIO</span>';
    
    console.log("Audio system initialized in fallback mode!");
}

function showAITextResponse(text) {
    const aiResponse = document.getElementById('aiVoiceResponse');
    const aiMessage = document.getElementById('aiMessage');
    
    if (aiResponse && aiMessage) {
        aiMessage.textContent = text;
        aiResponse.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            aiResponse.classList.add('hidden');
        }, 5000);
    }
}

function showScreen(screenName) {
    console.log(`Showing screen: ${screenName}`);
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Hide popups
    document.getElementById('congratulationsPopup').classList.add('hidden');
    document.getElementById('aiVoiceResponse').classList.add('hidden');
    
    // Show requested screen
    const screenElement = document.getElementById(screenName + 'Screen');
    if (screenElement) {
        screenElement.classList.remove('hidden');
        gameState.currentScreen = screenName;
    }
}

function initThreeJS() {
    console.log("Initializing Three.js...");
    
    try {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000011);
        scene.fog = new THREE.Fog(0x000011, 100, 2000);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        camera.position.set(0, 10, 50);
        camera.lookAt(0, 0, 0);
        
        // Create renderer with simpler settings
        renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = CONFIG.SHADOWS;
        
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.innerHTML = '';
            gameContainer.appendChild(renderer.domElement);
        }
        
        // Setup lighting
        setupLighting();
        
        // Create stars background
        createStarfield();
        
        console.log("Three.js initialized successfully!");
        
    } catch (error) {
        console.error("Error initializing Three.js:", error);
        // Create simple fallback
        fallbackGraphics();
    }
}

function fallbackGraphics() {
    console.log("Using fallback graphics mode...");
    
    // Create simple scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 50);
    
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    document.getElementById('gameContainer').appendChild(renderer.domElement);
    
    // Simple lighting
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(light);
}

function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x333355, 0.6);
    scene.add(ambientLight);
    
    // Directional light
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(100, 100, 50);
    scene.add(sunLight);
    
    // Player light
    const playerLight = new THREE.PointLight(0x00a0ff, 1, 100);
    playerLight.position.set(0, 0, 0);
    scene.add(playerLight);
}

function createStarfield() {
    try {
        const starCount = 1000;
        const stars = new THREE.Group();
        
        for (let i = 0; i < starCount; i++) {
            const star = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            
            star.position.set(
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000
            );
            
            stars.add(star);
        }
        
        scene.add(stars);
        return stars;
    } catch (error) {
        console.error("Error creating starfield:", error);
        return null;
    }
}

function createPlayerShip() {
    try {
        const group = new THREE.Group();
        
        // Simple ship geometry
        const geometry = new THREE.ConeGeometry(2, 6, 8);
        const material = new THREE.MeshPhongMaterial({
            color: 0x0080ff,
            shininess: 50
        });
        
        const ship = new THREE.Mesh(geometry, material);
        ship.rotation.x = Math.PI / 2;
        group.add(ship);
        
        // Engine glow
        const engineLight = new THREE.PointLight(0xffff00, 1, 50);
        engineLight.position.set(0, 0, -3);
        group.add(engineLight);
        
        group.position.set(0, 0, 0);
        scene.add(group);
        
        playerShip = {
            mesh: group,
            velocity: new THREE.Vector3(0, 0, 0),
            speed: 0,
            maxSpeed: CONFIG.PLAYER_SPEED,
            rotationSpeed: CONFIG.PLAYER_ROTATION_SPEED,
            engineLight: engineLight
        };
        
        console.log("Player ship created successfully!");
        return playerShip;
    } catch (error) {
        console.error("Error creating player ship:", error);
        return null;
    }
}

function createWaypoints() {
    waypoints = [];
    
    for (let i = 0; i < CONFIG.TOTAL_WAYPOINTS; i++) {
        try {
            const waypoint = new THREE.Mesh(
                new THREE.SphereGeometry(20, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: i === 0 ? 0x00ff00 : 0x0088ff,
                    transparent: true,
                    opacity: 0.5,
                    wireframe: true
                })
            );
            
            // Position waypoints
            waypoint.position.set(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 100,
                -(i + 1) * CONFIG.WAYPOINT_DISTANCE
            );
            
            waypoint.userData = {
                isWaypoint: true,
                index: i + 1,
                reached: false
            };
            
            scene.add(waypoint);
            waypoints.push(waypoint);
            
            // Create enemy patrols
            createEnemyPatrol(waypoint.position, 2);
            
        } catch (error) {
            console.error(`Error creating waypoint ${i}:`, error);
        }
    }
    console.log(`Created ${waypoints.length} waypoints`);
}

function createEnemyPatrol(position, count) {
    for (let i = 0; i < count; i++) {
        const enemy = createEnemyShip();
        if (enemy) {
            enemy.position.set(
                position.x + (Math.random() - 0.5) * 300,
                position.y + (Math.random() - 0.5) * 150,
                position.z + (Math.random() - 0.5) * 300
            );
            
            scene.add(enemy);
            enemies.push(enemy);
        }
    }
}

function createEnemyShip() {
    try {
        const group = new THREE.Group();
        
        // Simple enemy geometry
        const geometry = new THREE.ConeGeometry(3, 4, 8);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0000
        });
        
        const enemy = new THREE.Mesh(geometry, material);
        group.add(enemy);
        
        enemy.userData = {
            isEnemy: true,
            health: 100,
            maxHealth: 100,
            speed: CONFIG.ENEMY_SPEED,
            fireRate: CONFIG.ENEMY_FIRE_RATE,
            lastFire: 0
        };
        
        return group;
    } catch (error) {
        console.error("Error creating enemy ship:", error);
        return null;
    }
}

function createAsteroidField() {
    asteroids = [];
    
    for (let i = 0; i < 30; i++) {
        try {
            const size = Math.random() * 10 + 5;
            const geometry = new THREE.SphereGeometry(size, 6, 6);
            const material = new THREE.MeshPhongMaterial({
                color: 0x888888
            });
            
            const asteroid = new THREE.Mesh(geometry, material);
            
            asteroid.position.set(
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 500,
                -(Math.random() * 5000)
            );
            
            asteroid.userData = {
                isAsteroid: true,
                size: size
            };
            
            scene.add(asteroid);
            asteroids.push(asteroid);
        } catch (error) {
            console.error("Error creating asteroid:", error);
        }
    }
}

function createHealthPacks() {
    healthPacks = [];
    
    for (let i = 0; i < 8; i++) {
        try {
            const geometry = new THREE.SphereGeometry(5, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.7
            });
            
            const healthPack = new THREE.Mesh(geometry, material);
            
            healthPack.position.set(
                (Math.random() - 0.5) * 800,
                (Math.random() - 0.5) * 400,
                -(Math.random() * 4000 + 500)
            );
            
            healthPack.userData = {
                isHealthPack: true,
                value: 20
            };
            
            scene.add(healthPack);
            healthPacks.push(healthPack);
        } catch (error) {
            console.error("Error creating health pack:", error);
        }
    }
}

function initMobileControls() {
    console.log("Initializing mobile controls...");
    
    const joystick = document.getElementById('leftJoystick');
    if (!joystick) return;
    
    const stick = joystick.querySelector('.stick');
    
    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
    });
    
    joystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!joystickActive) return;
        
        const rect = joystick.getBoundingClientRect();
        const touch = e.touches[0];
        
        const x = touch.clientX - (rect.left + rect.width / 2);
        const y = touch.clientY - (rect.top + rect.height / 2);
        
        const distance = Math.min(50, Math.sqrt(x*x + y*y));
        const angle = Math.atan2(y, x);
        
        // Move the stick
        stick.style.left = 35 + Math.cos(angle) * distance + 'px';
        stick.style.top = 35 + Math.sin(angle) * distance + 'px';
        
        // Calculate joystick values
        joystickX = x / 50;
        joystickY = y / 50;
    });
    
    joystick.addEventListener('touchend', () => {
        joystickActive = false;
        stick.style.left = '35px';
        stick.style.top = '35px';
        joystickX = 0;
        joystickY = 0;
    });
    
    // Fire buttons
    document.getElementById('fireBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        fireBullet();
    });
    
    document.getElementById('bombBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        fireBomb();
    });
    
    document.getElementById('missileBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        fireMissile();
    });
    
    document.getElementById('boostBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        isBoosting = true;
    });
    
    document.getElementById('boostBtn').addEventListener('touchend', (e) => {
        e.preventDefault();
        isBoosting = false;
    });
    
    console.log("Mobile controls initialized!");
}

function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    try {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            
            // Handle special keys
            switch(e.code) {
                case 'Escape':
                    togglePause();
                    break;
                case 'Space':
                    isBoosting = true;
                    break;
                case 'KeyR':
                    if (gameState.missionStarted && !gameState.isPaused) {
                        fireMissile();
                    }
                    break;
                case 'KeyB':
                    if (gameState.missionStarted && !gameState.isPaused) {
                        fireBomb();
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.code] = false;
            
            if (e.code === 'Space') {
                isBoosting = false;
            }
        });
        
        // Mouse controls
        document.addEventListener('mousedown', (e) => {
            mouse.down = true;
            if (gameState.missionStarted && !gameState.isPaused) {
                if (e.button === 0) {
                    fireBullet();
                } else if (e.button === 2) {
                    fireBomb();
                }
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            mouse.down = false;
        });
        
        document.addEventListener('mousemove', (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        
        // UI Button Events
        document.getElementById('newGameBtn').addEventListener('click', startNewGame);
        document.getElementById('howToPlayBtn').addEventListener('click', () => showScreen('howToPlay'));
        document.getElementById('backToMenuBtn').addEventListener('click', () => showScreen('mainMenu'));
        document.getElementById('settingsBtn').addEventListener('click', () => showScreen('settings'));
        document.getElementById('closeSettingsBtn').addEventListener('click', () => showScreen('mainMenu'));
        document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
        document.getElementById('retryBtn').addEventListener('click', startNewGame);
        document.getElementById('quitToMenuBtn').addEventListener('click', () => {
            showScreen('mainMenu');
        });
        document.getElementById('playAgainBtn').addEventListener('click', startNewGame);
        document.getElementById('backToMenuCompleteBtn').addEventListener('click', () => {
            showScreen('mainMenu');
        });
        document.getElementById('continueMissionBtn').addEventListener('click', continueMission);
        
        // AI Voice buttons
        document.getElementById('repeatVoiceBtn').addEventListener('click', () => {
            const aiMessage = document.getElementById('aiMessage').textContent;
            if (aiMessage) {
                showAITextResponse(aiMessage);
            }
        });
        
        document.getElementById('closeVoiceBtn').addEventListener('click', () => {
            document.getElementById('aiVoiceResponse').classList.add('hidden');
        });
        
        // Close performance warning
        document.getElementById('closePerfWarning').addEventListener('click', () => {
            document.getElementById('perfWarning').classList.add('hidden');
        });
        
        // Window resize
        window.addEventListener('resize', onWindowResize);
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        console.log("Event listeners setup complete!");
    } catch (error) {
        console.error("Error setting up event listeners:", error);
    }
}

function startNewGame() {
    console.log("Starting new game...");
    
    // Reset game state
    resetGameState();
    
    // Clear scene
    clearScene();
    
    // Reinitialize scene
    setupLighting();
    createStarfield();
    createPlayerShip();
    createWaypoints();
    createAsteroidField();
    createHealthPacks();
    
    // Show game HUD
    document.getElementById('gameHUD').classList.remove('hidden');
    document.getElementById('waypointIndicator').classList.remove('hidden');
    
    // Hide other screens
    document.getElementById('mainMenuScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('missionCompleteScreen').classList.add('hidden');
    document.getElementById('finalBattleHUD').classList.add('hidden');
    document.getElementById('congratulationsPopup').classList.add('hidden');
    
    // Start mission
    gameState.missionStarted = true;
    gameState.currentWaypoint = 1;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    gameState.missionStartTime = Date.now();
    
    // AI mission start message
    if (gameState.settings.aiVoice) {
        setTimeout(() => {
            showAITextResponse("Mission started. Good luck Commander! Follow the waypoints to the alien space station.");
        }, 1000);
    }
    
    // Update HUD
    updateHUD();
    updateWaypointDisplay();
    
    // Start game loop
    if (!animationFrameId) {
        console.log("Starting game animation loop...");
        animate();
    }
    
    console.log("New game started!");
}

function clearScene() {
    try {
        // Remove all objects from scene
        while(scene.children.length > 0) {
            const object = scene.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            scene.remove(object);
        }
        
        // Clear arrays
        waypoints = [];
        enemies = [];
        asteroids = [];
        healthPacks = [];
        bullets = [];
        bombs = [];
        missiles = [];
        
        playerShip = null;
        
        console.log("Scene cleared");
    } catch (error) {
        console.error("Error clearing scene:", error);
    }
}

function stopGameLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    console.log("Game loop stopped");
}

function resetGameState() {
    gameState = {
        currentScreen: 'game',
        isPaused: false,
        isGameOver: false,
        missionStarted: true,
        currentWaypoint: 1,
        missionComplete: false,
        missionStartTime: Date.now(),
        
        player: {
            health: 100,
            maxHealth: 100,
            energy: 100,
            maxEnergy: 100,
            score: 0,
            kills: 0,
            distance: 0,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            bulletsFired: 0,
            hits: 0
        },
        
        weapons: {
            bullets: Infinity,
            bombs: 10,
            maxBombs: 10,
            missiles: 3,
            maxMissiles: 3,
            drone: 1,
            nuke: 1
        },
        
        station: {
            health: CONFIG.STATION_HEALTH,
            maxHealth: CONFIG.STATION_HEALTH,
            outerLayerDestroyed: false,
            innerLayerDestroyed: false,
            coreDestroyed: false
        },
        
        settings: {
            difficulty: localStorage.getItem('galacticWarDifficulty') || 'normal',
            masterVolume: parseFloat(localStorage.getItem('galacticWarMasterVolume') || '0.8'),
            musicVolume: parseFloat(localStorage.getItem('galacticWarMusicVolume') || '0.7'),
            sfxVolume: parseFloat(localStorage.getItem('galacticWarSfxVolume') || '0.9'),
            voiceVolume: parseFloat(localStorage.getItem('galacticWarVoiceVolume') || '0.85'),
            autoAim: localStorage.getItem('galacticWarAutoAim') !== 'false',
            aiVoice: localStorage.getItem('galacticWarAiVoice') !== 'false',
            audioEnabled: false
        },
        
        audio: {
            enabled: false
        }
    };
    console.log("Game state reset");
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        console.log("Game paused");
    } else {
        console.log("Game resumed");
    }
}

function updatePlayerMovement() {
    if (!playerShip || !playerShip.mesh || gameState.isPaused) return;
    
    try {
        // Calculate movement direction
        const moveVector = new THREE.Vector3(0, 0, 0);
        
        if (joystickActive) {
            // Use mobile joystick
            moveVector.x = joystickX;
            moveVector.z = -joystickY;
        } else {
            // Use keyboard
            if (keys['KeyW'] || keys['ArrowUp']) {
                moveVector.z -= 1;
            }
            if (keys['KeyS'] || keys['ArrowDown']) {
                moveVector.z += 1;
            }
            if (keys['KeyA'] || keys['ArrowLeft']) {
                moveVector.x -= 1;
            }
            if (keys['KeyD'] || keys['ArrowRight']) {
                moveVector.x += 1;
            }
        }
        
        // Normalize and apply speed
        if (moveVector.length() > 0) {
            moveVector.normalize();
        }
        
        // Apply boost
        const speedMultiplier = isBoosting ? CONFIG.PLAYER_BOOST_MULTIPLIER : 1;
        moveVector.multiplyScalar(CONFIG.PLAYER_SPEED * speedMultiplier * deltaTime);
        
        // Update player position
        playerShip.mesh.position.add(moveVector);
        playerShip.velocity.copy(moveVector);
        playerShip.speed = playerShip.velocity.length();
        
        // Apply mouse rotation
        const rotationSpeed = 0.01;
        if (joystickActive) {
            playerShip.mesh.rotation.y = -joystickX * Math.PI * 0.5;
            playerShip.mesh.rotation.x = joystickY * Math.PI * 0.25;
        } else {
            playerShip.mesh.rotation.y = -mouse.x * Math.PI * 0.5;
            playerShip.mesh.rotation.x = mouse.y * Math.PI * 0.25;
        }
        
        // Update camera position
        const cameraOffset = new THREE.Vector3(0, 15, 30);
        cameraOffset.applyQuaternion(playerShip.mesh.quaternion);
        camera.position.copy(playerShip.mesh.position).add(cameraOffset);
        camera.lookAt(playerShip.mesh.position);
        
        // Update game state
        gameState.player.position = {
            x: playerShip.mesh.position.x,
            y: playerShip.mesh.position.y,
            z: playerShip.mesh.position.z
        };
        
        gameState.player.distance = Math.abs(playerShip.mesh.position.z);
        
        // Update engine light
        if (playerShip.engineLight) {
            playerShip.engineLight.intensity = 1 + playerShip.speed / CONFIG.PLAYER_SPEED;
        }
    } catch (error) {
        console.error("Error updating player movement:", error);
    }
}

function updateEnemies() {
    if (!playerShip || !playerShip.mesh) return;
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy.userData || !enemy.position) continue;
        
        try {
            // Move towards player
            const direction = new THREE.Vector3();
            direction.subVectors(playerShip.mesh.position, enemy.position).normalize();
            
            // Add some random movement
            direction.x += (Math.random() - 0.5) * 0.2;
            direction.y += (Math.random() - 0.5) * 0.2;
            direction.normalize();
            
            enemy.position.add(direction.multiplyScalar(enemy.userData.speed * deltaTime));
            
            // Face the player
            enemy.lookAt(playerShip.mesh.position);
            
            // Fire at player
            const now = Date.now();
            if (now - enemy.userData.lastFire > enemy.userData.fireRate) {
                fireEnemyWeapon(enemy);
                enemy.userData.lastFire = now;
            }
            
        } catch (error) {
            console.error("Error updating enemy:", error);
        }
    }
}

function fireEnemyWeapon(enemy) {
    if (!enemy || !enemy.position) return;
    
    try {
        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(1, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xff5555 })
        );
        
        bullet.position.copy(enemy.position);
        
        // Calculate direction to player
        const direction = new THREE.Vector3();
        direction.subVectors(playerShip.mesh.position, enemy.position).normalize();
        
        bullet.userData = {
            isEnemyBullet: true,
            damage: CONFIG.ENEMY_DAMAGE,
            velocity: direction.multiplyScalar(50),
            life: 3
        };
        
        scene.add(bullet);
        bullets.push(bullet);
    } catch (error) {
        console.error("Error firing enemy weapon:", error);
    }
}

function fireBullet() {
    if (!gameState.missionStarted || gameState.isPaused || !playerShip) return;
    
    // Update stats
    gameState.player.bulletsFired++;
    
    try {
        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        
        // Position bullet in front of ship
        const bulletPosition = playerShip.mesh.position.clone();
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(playerShip.mesh.quaternion);
        bulletPosition.add(forward.multiplyScalar(5));
        
        bullet.position.copy(bulletPosition);
        
        // Calculate direction
        const direction = new THREE.Vector3(mouse.x, mouse.y, -1).normalize();
        
        bullet.userData = {
            isPlayerBullet: true,
            damage: 10,
            velocity: direction.multiplyScalar(CONFIG.BULLET_SPEED),
            life: 2
        };
        
        scene.add(bullet);
        bullets.push(bullet);
        
    } catch (error) {
        console.error("Error firing bullet:", error);
    }
}

function fireBomb() {
    if (!gameState.missionStarted || gameState.isPaused || gameState.weapons.bombs <= 0 || !playerShip) return;
    
    gameState.weapons.bombs--;
    
    try {
        const bomb = new THREE.Mesh(
            new THREE.SphereGeometry(2, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff5500 })
        );
        
        const bombPosition = playerShip.mesh.position.clone();
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(playerShip.mesh.quaternion);
        bombPosition.add(forward.multiplyScalar(5));
        
        bomb.position.copy(bombPosition);
        
        const direction = new THREE.Vector3(mouse.x, mouse.y, -1).normalize();
        
        bomb.userData = {
            isPlayerBomb: true,
            damage: 50,
            velocity: direction.multiplyScalar(CONFIG.BOMB_SPEED),
            life: 3,
            explosionRadius: 20
        };
        
        scene.add(bomb);
        bombs.push(bomb);
        
        // Start bomb reload timer
        setTimeout(() => {
            if (gameState.weapons.bombs < gameState.weapons.maxBombs) {
                gameState.weapons.bombs++;
                updateHUD();
            }
        }, CONFIG.BOMB_RELOAD_TIME);
        
        updateHUD();
    } catch (error) {
        console.error("Error firing bomb:", error);
    }
}

function fireMissile() {
    if (!gameState.missionStarted || gameState.isPaused || gameState.weapons.missiles <= 0 || !playerShip) return;
    
    gameState.weapons.missiles--;
    
    try {
        const missile = new THREE.Mesh(
            new THREE.ConeGeometry(1, 4, 8),
            new THREE.MeshBasicMaterial({ color: 0xff00ff })
        );
        missile.rotation.x = Math.PI / 2;
        
        const missilePosition = playerShip.mesh.position.clone();
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(playerShip.mesh.quaternion);
        missilePosition.add(forward.multiplyScalar(5));
        
        missile.position.copy(missilePosition);
        
        const direction = new THREE.Vector3(mouse.x, mouse.y, -1).normalize();
        
        missile.userData = {
            isPlayerMissile: true,
            damage: 100,
            velocity: direction.multiplyScalar(CONFIG.MISSILE_SPEED),
            life: 4,
            homing: true,
            target: null
        };
        
        // Find nearest enemy as target
        if (enemies.length > 0) {
            let nearestEnemy = null;
            let nearestDistance = Infinity;
            
            enemies.forEach(enemy => {
                const distance = missile.position.distanceTo(enemy.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = enemy;
                }
            });
            
            if (nearestDistance < 200) {
                missile.userData.target = nearestEnemy;
            }
        }
        
        scene.add(missile);
        missiles.push(missile);
        
        // Start missile reload timer
        setTimeout(() => {
            if (gameState.weapons.missiles < gameState.weapons.maxMissiles) {
                gameState.weapons.missiles++;
                updateHUD();
            }
        }, CONFIG.MISSILE_RELOAD_TIME);
        
        updateHUD();
    } catch (error) {
        console.error("Error firing missile:", error);
    }
}

function updateProjectiles() {
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet.userData || !bullet.position) {
            bullets.splice(i, 1);
            continue;
        }
        
        try {
            bullet.position.add(bullet.userData.velocity.clone().multiplyScalar(deltaTime));
            bullet.userData.life -= deltaTime;
            
            if (bullet.userData.life <= 0) {
                scene.remove(bullet);
                bullets.splice(i, 1);
            }
        } catch (error) {
            bullets.splice(i, 1);
        }
    }
    
    // Update bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
        const bomb = bombs[i];
        if (!bomb.userData || !bomb.position) {
            bombs.splice(i, 1);
            continue;
        }
        
        try {
            bomb.position.add(bomb.userData.velocity.clone().multiplyScalar(deltaTime));
            bomb.userData.life -= deltaTime;
            
            if (bomb.userData.life <= 0) {
                createExplosion(bomb.position, bomb.userData.explosionRadius);
                scene.remove(bomb);
                bombs.splice(i, 1);
            }
        } catch (error) {
            bombs.splice(i, 1);
        }
    }
    
    // Update missiles
    for (let i = missiles.length - 1; i >= 0; i--) {
        const missile = missiles[i];
        if (!missile.userData || !missile.position) {
            missiles.splice(i, 1);
            continue;
        }
        
        try {
            // Homing missile logic
            if (missile.userData.homing && missile.userData.target && missile.userData.target.position) {
                const direction = new THREE.Vector3();
                direction.subVectors(missile.userData.target.position, missile.position).normalize();
                
                // Lerp towards target
                missile.userData.velocity.lerp(direction.multiplyScalar(CONFIG.MISSILE_SPEED), 0.1);
            }
            
            missile.lookAt(missile.position.clone().add(missile.userData.velocity));
            missile.rotation.x += Math.PI / 2;
            
            missile.position.add(missile.userData.velocity.clone().multiplyScalar(deltaTime));
            missile.userData.life -= deltaTime;
            
            if (missile.userData.life <= 0) {
                createExplosion(missile.position, 30);
                scene.remove(missile);
                missiles.splice(i, 1);
            }
        } catch (error) {
            missiles.splice(i, 1);
        }
    }
}

function checkCollisions() {
    if (!playerShip || !playerShip.mesh) return;
    
    // Check player bullets vs enemies
    for (let b = bullets.length - 1; b >= 0; b--) {
        const bullet = bullets[b];
        if (!bullet.userData || !bullet.userData.isPlayerBullet) continue;
        
        for (let e = enemies.length - 1; e >= 0; e--) {
            const enemy = enemies[e];
            if (bullet.position.distanceTo(enemy.position) < 10) {
                // Hit enemy
                enemy.userData.health -= bullet.userData.damage;
                gameState.player.hits++;
                
                // Create hit effect
                createHitEffect(bullet.position);
                
                // Remove bullet
                scene.remove(bullet);
                bullets.splice(b, 1);
                
                // Check if enemy is destroyed
                if (enemy.userData.health <= 0) {
                    destroyEnemy(enemy, e);
                }
                
                break;
            }
        }
    }
    
    // Check enemy bullets vs player
    for (let b = bullets.length - 1; b >= 0; b--) {
        const bullet = bullets[b];
        if (!bullet.userData || !bullet.userData.isEnemyBullet) continue;
        
        if (bullet.position.distanceTo(playerShip.mesh.position) < 5) {
            // Hit player
            gameState.player.health -= bullet.userData.damage;
            
            // Create hit effect
            createHitEffect(bullet.position);
            
            // Show damage overlay if health is low
            const damageOverlay = document.getElementById('damageOverlay');
            if (gameState.player.health < 30) {
                damageOverlay.classList.add('critical');
                
                // Show warning
                showWarning('damageWarning', 'TAKING DAMAGE!');
                
                // AI warning
                if (gameState.player.health < 20 && gameState.settings.aiVoice) {
                    showAITextResponse("Warning! Critical damage! Find health packs immediately!");
                }
            } else {
                damageOverlay.classList.remove('critical');
            }
            
            // Flash damage overlay
            damageOverlay.classList.remove('hidden');
            setTimeout(() => {
                damageOverlay.classList.add('hidden');
            }, 200);
            
            // Remove bullet
            scene.remove(bullet);
            bullets.splice(b, 1);
            
            // Update HUD
            updateHUD();
            
            // Check if player is destroyed
            if (gameState.player.health <= 0) {
                gameOver();
            }
        }
    }
    
    // Check bombs vs enemies
    for (let b = bombs.length - 1; b >= 0; b--) {
        const bomb = bombs[b];
        
        for (let e = enemies.length - 1; e >= 0; e--) {
            const enemy = enemies[e];
            if (bomb.position.distanceTo(enemy.position) < 15) {
                // Destroy bomb and damage enemy
                enemy.userData.health -= bomb.userData.damage;
                
                // Check if enemy is destroyed
                if (enemy.userData.health <= 0) {
                    destroyEnemy(enemy, e);
                }
                
                // Remove bomb
                scene.remove(bomb);
                bombs.splice(b, 1);
                break;
            }
        }
    }
    
    // Check missiles vs enemies
    for (let m = missiles.length - 1; m >= 0; m--) {
        const missile = missiles[m];
        
        for (let e = enemies.length - 1; e >= 0; e--) {
            const enemy = enemies[e];
            if (missile.position.distanceTo(enemy.position) < 10) {
                // Destroy missile and enemy
                enemy.userData.health -= missile.userData.damage;
                gameState.player.hits++;
                
                // Check if enemy is destroyed
                if (enemy.userData.health <= 0) {
                    destroyEnemy(enemy, e);
                }
                
                // Remove missile
                scene.remove(missile);
                missiles.splice(m, 1);
                break;
            }
        }
    }
    
    // Check player vs health packs
    for (let h = healthPacks.length - 1; h >= 0; h--) {
        const healthPack = healthPacks[h];
        if (playerShip.mesh.position.distanceTo(healthPack.position) < 10) {
            // Collect health pack
            gameState.player.health = Math.min(gameState.player.maxHealth, gameState.player.health + 20);
            
            // Show notification
            showNotification('healthPickup', '+20 Health Restored!');
            
            // AI comment
            if (gameState.settings.aiVoice && gameState.player.health > 70) {
                showAITextResponse("Health restored. Good work Commander!");
            }
            
            // Remove health pack
            scene.remove(healthPack);
            healthPacks.splice(h, 1);
            
            // Update HUD
            updateHUD();
        }
    }
    
    // Check player vs waypoints
    waypoints.forEach((waypoint, index) => {
        if (waypoint.userData.reached) return;
        
        if (playerShip.mesh.position.distanceTo(waypoint.position) < 100) {
            // Reached waypoint
            waypoint.userData.reached = true;
            gameState.currentWaypoint = index + 1;
            
            // Generate AI advice
            const aiAdvice = generateAIAdvice();
            
            // Show congratulations
            showCongratulations(`Waypoint ${index + 1} Reached!`, aiAdvice);
            
            // Update waypoint display
            updateWaypointDisplay();
            
            // If this is the last waypoint, start final battle
            if (index === waypoints.length - 1) {
                setTimeout(startFinalBattle, 2000);
            }
        }
    });
}

function generateAIAdvice() {
    const accuracy = gameState.player.bulletsFired > 0 
        ? Math.round((gameState.player.hits / gameState.player.bulletsFired) * 100) 
        : 0;
    
    const healthPercentage = (gameState.player.health / gameState.player.maxHealth) * 100;
    const enemyCount = enemies.length;
    
    let advice = "";
    
    if (accuracy > 70) {
        advice = "Excellent shooting accuracy! Your targeting is precise.";
    } else if (accuracy > 40) {
        advice = "Good shooting. Try to lead your targets more for better accuracy.";
    } else {
        advice = "Your accuracy needs improvement. Try to aim ahead of moving targets.";
    }
    
    if (healthPercentage < 50) {
        advice += " Your health is low. Be more evasive and look for health packs.";
    } else if (healthPercentage > 80) {
        advice += " Your health is optimal. Maintain this defensive strategy.";
    }
    
    if (enemyCount > 10) {
        advice += " Many enemies ahead. Consider using bombs for crowd control.";
    } else if (gameState.weapons.missiles < 2) {
        advice += " Missiles are low. Save them for tougher enemies.";
    }
    
    return advice || "Keep going Commander! You're doing well.";
}

function showWarning(type, message) {
    try {
        const warning = document.getElementById(type);
        if (warning) {
            const span = warning.querySelector('span');
            if (span) span.textContent = message;
            warning.classList.remove('hidden');
            
            // Hide after 3 seconds
            setTimeout(() => {
                warning.classList.add('hidden');
            }, 3000);
        }
    } catch (error) {
        console.error("Error showing warning:", error);
    }
}

function showNotification(type, message) {
    try {
        const notification = document.getElementById(type);
        if (notification) {
            const span = notification.querySelector('span');
            if (span) span.textContent = message;
            notification.classList.remove('hidden');
            
            // Hide after 3 seconds
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 3000);
        }
    } catch (error) {
        console.error("Error showing notification:", error);
    }
}

function destroyEnemy(enemy, index) {
    try {
        // Create explosion
        createExplosion(enemy.position, 20);
        
        // Update score
        gameState.player.kills++;
        gameState.player.score += 100;
        
        // Remove enemy
        scene.remove(enemy);
        enemies.splice(index, 1);
        
        // Update HUD
        updateHUD();
    } catch (error) {
        console.error("Error destroying enemy:", error);
    }
}

function createExplosion(position, size) {
    try {
        // Simple explosion effect
        const explosion = new THREE.Mesh(
            new THREE.SphereGeometry(size, 8, 8),
            new THREE.MeshBasicMaterial({ 
                color: 0xff5500,
                transparent: true,
                opacity: 0.7
            })
        );
        
        explosion.position.copy(position);
        scene.add(explosion);
        
        // Animate explosion
        const scale = { value: 1 };
        gsap.to(scale, {
            value: 3,
            duration: 0.3,
            onUpdate: () => {
                explosion.scale.set(scale.value, scale.value, scale.value);
            }
        });
        
        gsap.to(explosion.material, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                scene.remove(explosion);
            }
        });
    } catch (error) {
        console.error("Error creating explosion:", error);
    }
}

function createHitEffect(position) {
    try {
        const hitEffect = new THREE.PointLight(0xff0000, 2, 20);
        hitEffect.position.copy(position);
        scene.add(hitEffect);
        
        // Remove after short time
        setTimeout(() => {
            scene.remove(hitEffect);
        }, 100);
    } catch (error) {
        console.error("Error creating hit effect:", error);
    }
}

function showCongratulations(message, aiAdvice) {
    try {
        const congratsTitle = document.getElementById('congratsTitle');
        const congratsMessage = document.getElementById('congratsMessage');
        const aiAdviceText = document.getElementById('aiAdviceText');
        
        if (congratsTitle) congratsTitle.textContent = message;
        if (congratsMessage) congratsMessage.textContent = 'Proceeding to next objective...';
        if (aiAdviceText) aiAdviceText.textContent = aiAdvice;
        
        document.getElementById('congratulationsPopup').classList.remove('hidden');
        
        // Pause game
        gameState.isPaused = true;
        
        // Show AI advice
        if (gameState.settings.aiVoice) {
            showAITextResponse(`Waypoint reached. ${aiAdvice}`);
        }
    } catch (error) {
        console.error("Error showing congratulations:", error);
    }
}

function continueMission() {
    document.getElementById('congratulationsPopup').classList.add('hidden');
    gameState.isPaused = false;
}

function startFinalBattle() {
    // Hide waypoint indicator
    document.getElementById('waypointIndicator').classList.add('hidden');
    
    // Show final battle HUD
    document.getElementById('finalBattleHUD').classList.remove('hidden');
    
    // Create space station
    createSpaceStation();
    
    // Update mission text
    document.getElementById('missionText').textContent = 'Destroy the Alien Space Station!';
    
    // AI announcement
    if (gameState.settings.aiVoice) {
        showAITextResponse("Final battle initiated! The alien space station is ahead. Destroy all defenses and target the main reactor!");
    }
}

function createSpaceStation() {
    try {
        const station = new THREE.Mesh(
            new THREE.SphereGeometry(100, 16, 16),
            new THREE.MeshPhongMaterial({
                color: 0xff00ff
            })
        );
        
        station.position.set(0, 0, -CONFIG.WAYPOINT_DISTANCE * 6);
        station.userData = {
            isStation: true,
            health: CONFIG.STATION_HEALTH,
            maxHealth: CONFIG.STATION_HEALTH
        };
        
        scene.add(station);
        
        // Create station defenses
        createStationDefenses(station.position);
    } catch (error) {
        console.error("Error creating space station:", error);
    }
}

function createStationDefenses(position) {
    // Create defense turrets around the station
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const radius = 120;
        
        const turret = createTurret();
        turret.position.set(
            position.x + Math.cos(angle) * radius,
            position.y + Math.sin(angle) * radius * 0.5,
            position.z
        );
        
        scene.add(turret);
        enemies.push(turret);
    }
}

function createTurret() {
    try {
        const turret = new THREE.Mesh(
            new THREE.CylinderGeometry(5, 5, 10, 8),
            new THREE.MeshPhongMaterial({ color: 0xaa0000 })
        );
        
        turret.userData = {
            isEnemy: true,
            isTurret: true,
            health: 200,
            maxHealth: 200,
            fireRate: 2000,
            lastFire: 0
        };
        
        return turret;
    } catch (error) {
        console.error("Error creating turret:", error);
        return null;
    }
}

function updateHUD() {
    try {
        // Update health bar
        const healthPercent = (gameState.player.health / gameState.player.maxHealth) * 100;
        const healthBar = document.getElementById('healthBar');
        const healthText = document.getElementById('healthText');
        
        if (healthBar) healthBar.style.width = healthPercent + '%';
        if (healthText) healthText.textContent = Math.round(gameState.player.health) + '%';
        
        // Update energy bar
        const energyPercent = (gameState.player.energy / gameState.player.maxEnergy) * 100;
        const energyBar = document.getElementById('energyBar');
        const energyText = document.getElementById('energyText');
        
        if (energyBar) energyBar.style.width = energyPercent + '%';
        if (energyText) energyText.textContent = Math.round(gameState.player.energy) + '%';
        
        // Update score
        const scoreValue = document.getElementById('scoreValue');
        if (scoreValue) scoreValue.textContent = gameState.player.score;
        
        // Update enemy count
        const enemyCount = document.getElementById('enemyCount');
        if (enemyCount) enemyCount.textContent = enemies.length;
        
        // Update distance
        const distanceValue = document.getElementById('distanceValue');
        if (distanceValue) distanceValue.textContent = Math.round(gameState.player.distance) + 'm';
        
        // Update weapon counts
        const bulletCount = document.getElementById('bulletCount');
        const bombCount = document.getElementById('bombCount');
        const missileCount = document.getElementById('missileCount');
        
        if (bulletCount) bulletCount.textContent = '∞';
        if (bombCount) bombCount.textContent = gameState.weapons.bombs;
        if (missileCount) missileCount.textContent = gameState.weapons.missiles;
        
        // Update speed
        const speedValue = document.getElementById('speedValue');
        if (speedValue && playerShip) speedValue.textContent = Math.round(playerShip.speed || 0);
        
        // Update waypoint distance
        const waypointDistance = document.getElementById('waypointDistance');
        if (waypointDistance && waypoints[gameState.currentWaypoint - 1] && playerShip) {
            const distance = playerShip.mesh.position.distanceTo(waypoints[gameState.currentWaypoint - 1].position);
            waypointDistance.textContent = Math.round(distance) + 'm';
        }
    } catch (error) {
        console.error("Error updating HUD:", error);
    }
}

function updateWaypointDisplay() {
    try {
        // Update waypoint list
        document.querySelectorAll('.waypoint-item').forEach((item, index) => {
            if (index < gameState.currentWaypoint) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Update progress dots
        document.querySelectorAll('.progress-dots .dot').forEach((dot, index) => {
            if (index < gameState.currentWaypoint) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
        
        // Update mission progress
        const progressPercent = ((gameState.currentWaypoint - 1) / CONFIG.TOTAL_WAYPOINTS) * 100;
        const missionProgress = document.getElementById('missionProgress');
        if (missionProgress) missionProgress.style.width = progressPercent + '%';
        
        // Update mission text
        const missionText = document.getElementById('missionText');
        if (missionText && gameState.currentWaypoint <= CONFIG.TOTAL_WAYPOINTS) {
            missionText.textContent = `Reach Waypoint ${gameState.currentWaypoint}`;
        }
    } catch (error) {
        console.error("Error updating waypoint display:", error);
    }
}

function gameOver() {
    gameState.isGameOver = true;
    
    try {
        // Calculate accuracy
        const accuracy = gameState.player.bulletsFired > 0 
            ? Math.round((gameState.player.hits / gameState.player.bulletsFired) * 100) 
            : 0;
        
        // Generate AI analysis
        const aiAnalysis = generateGameOverAnalysis(accuracy);
        
        // Update final stats
        const finalDistance = document.getElementById('finalDistance');
        const finalKills = document.getElementById('finalKills');
        const finalWaypoints = document.getElementById('finalWaypoints');
        const finalScore = document.getElementById('finalScore');
        const aiAnalysisText = document.getElementById('aiAnalysisText');
        
        if (finalDistance) finalDistance.textContent = Math.round(gameState.player.distance) + 'm';
        if (finalKills) finalKills.textContent = gameState.player.kills;
        if (finalWaypoints) finalWaypoints.textContent = `${gameState.currentWaypoint - 1}/${CONFIG.TOTAL_WAYPOINTS}`;
        if (finalScore) finalScore.textContent = gameState.player.score;
        if (aiAnalysisText) aiAnalysisText.textContent = aiAnalysis;
        
        // Show game over screen
        document.getElementById('gameHUD').classList.add('hidden');
        document.getElementById('finalBattleHUD').classList.add('hidden');
        document.getElementById('waypointIndicator').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.remove('hidden');
        
        stopGameLoop();
        
        // AI analysis
        if (gameState.settings.aiVoice) {
            setTimeout(() => {
                showAITextResponse(`Mission failed. ${aiAnalysis}`);
            }, 1000);
        }
    } catch (error) {
        console.error("Error in game over:", error);
    }
}

function generateGameOverAnalysis(accuracy) {
    let analysis = "";
    
    if (gameState.player.distance < 1000) {
        analysis = "You didn't get far. Try to avoid enemy fire and navigate more carefully.";
    } else if (gameState.player.distance < 3000) {
        analysis = "Good progress. You need to work on your evasion skills and target prioritization.";
    } else {
        analysis = "Excellent distance covered. Your navigation skills are good.";
    }
    
    if (gameState.player.kills < 5) {
        analysis += " Your combat effectiveness needs improvement. Focus on accuracy and weapon management.";
    } else if (gameState.player.kills < 15) {
        analysis += " Decent number of enemies eliminated. Work on your reaction time.";
    } else {
        analysis += " Outstanding combat performance! Your targeting was exceptional.";
    }
    
    if (accuracy < 30) {
        analysis += " Your accuracy was poor. Practice leading moving targets.";
    } else if (accuracy < 60) {
        analysis += " Average accuracy. Try to time your shots better.";
    } else {
        analysis += " Excellent shooting accuracy!";
    }
    
    if (gameState.player.health < 30) {
        analysis += " You took too much damage. Be more defensive and collect health packs.";
    }
    
    analysis += " Next time, try to conserve special weapons for tougher enemies.";
    
    return analysis;
}

function missionComplete() {
    gameState.missionComplete = true;
    
    try {
        // Calculate mission time
        const missionTime = Math.round((Date.now() - gameState.missionStartTime) / 1000);
        const minutes = Math.floor(missionTime / 60);
        const seconds = missionTime % 60;
        
        // Calculate accuracy
        const accuracy = gameState.player.bulletsFired > 0 
            ? Math.round((gameState.player.hits / gameState.player.bulletsFired) * 100) 
            : 0;
        
        // Generate final AI analysis
        const finalAnalysis = generateFinalAnalysis(missionTime, accuracy);
        
        // Update mission complete stats
        const missionTimeEl = document.getElementById('missionTime');
        const totalKillsEl = document.getElementById('totalKills');
        const missionAccuracyEl = document.getElementById('missionAccuracy');
        const missionScoreEl = document.getElementById('missionScore');
        const finalAiAnalysis = document.getElementById('finalAiAnalysis');
        
        if (missionTimeEl) missionTimeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        if (totalKillsEl) totalKillsEl.textContent = gameState.player.kills;
        if (missionAccuracyEl) missionAccuracyEl.textContent = accuracy + '%';
        if (missionScoreEl) missionScoreEl.textContent = gameState.player.score;
        if (finalAiAnalysis) finalAiAnalysis.textContent = finalAnalysis;
        
        // Show mission complete screen
        document.getElementById('gameHUD').classList.add('hidden');
        document.getElementById('finalBattleHUD').classList.add('hidden');
        document.getElementById('missionCompleteScreen').classList.remove('hidden');
        
        // Create confetti effect
        createConfetti();
        
        stopGameLoop();
        
        // Save high score
        const savedHighScore = parseInt(localStorage.getItem('galacticWarHighScore') || '0');
        if (gameState.player.score > savedHighScore) {
            localStorage.setItem('galacticWarHighScore', gameState.player.score.toString());
        }
        
        // Update missions completed
        const savedMissions = parseInt(localStorage.getItem('galacticWarMissions') || '0');
        localStorage.setItem('galacticWarMissions', (savedMissions + 1).toString());
        
        // Update total kills
        const savedKills = parseInt(localStorage.getItem('galacticWarKills') || '0');
        localStorage.setItem('galacticWarKills', (savedKills + gameState.player.kills).toString());
        
        // AI congratulations
        if (gameState.settings.aiVoice) {
            setTimeout(() => {
                showAITextResponse(`Mission accomplished! Outstanding performance Commander! ${finalAnalysis}`);
            }, 1000);
        }
    } catch (error) {
        console.error("Error in mission complete:", error);
    }
}

function generateFinalAnalysis(missionTime, accuracy) {
    let analysis = "";
    
    if (missionTime < 180) {
        analysis = "Incredible speed! You completed the mission with exceptional efficiency. ";
    } else if (missionTime < 300) {
        analysis = "Good mission time. Your strategic planning was effective. ";
    } else {
        analysis = "Mission completed. You showed good persistence. ";
    }
    
    if (accuracy > 80) {
        analysis += "Your shooting accuracy was phenomenal! ";
    } else if (accuracy > 60) {
        analysis += "Good combat accuracy. ";
    } else {
        analysis += "Work on improving your targeting accuracy. ";
    }
    
    if (gameState.player.kills > 20) {
        analysis += "You eliminated a massive number of enemies. Excellent combat skills! ";
    } else if (gameState.player.kills > 10) {
        analysis += "Solid number of enemies destroyed. ";
    }
    
    if (gameState.player.health > 70) {
        analysis += "You maintained excellent ship integrity throughout the mission. ";
    } else if (gameState.player.health > 40) {
        analysis += "Your ship took some damage but remained operational. ";
    } else {
        analysis += "Your ship sustained heavy damage. Work on evasion techniques. ";
    }
    
    analysis += "Overall, an impressive performance worthy of promotion to Fleet Admiral!";
    
    return analysis;
}

function createConfetti() {
    try {
        const confettiContainer = document.querySelector('.confetti-container');
        if (!confettiContainer) return;
        
        confettiContainer.innerHTML = '';
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background: hsl(${Math.random() * 360}, 100%, 50%);
                top: -20px;
                left: ${Math.random() * 100}%;
                animation: fall ${Math.random() * 3 + 2}s linear infinite;
            `;
            
            confettiContainer.appendChild(confetti);
        }
    } catch (error) {
        console.error("Error creating confetti:", error);
    }
}

function onWindowResize() {
    try {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    } catch (error) {
        console.error("Error on window resize:", error);
    }
}

function loadSavedData() {
    try {
        // Load saved settings and stats from localStorage
        const savedHighScore = localStorage.getItem('galacticWarHighScore') || '0';
        const savedMissions = localStorage.getItem('galacticWarMissions') || '0';
        const savedKills = localStorage.getItem('galacticWarKills') || '0';
        
        const menuHighScore = document.getElementById('menuHighScore');
        const menuMissions = document.getElementById('menuMissions');
        const menuKills = document.getElementById('menuKills');
        
        if (menuHighScore) menuHighScore.textContent = savedHighScore;
        if (menuMissions) menuMissions.textContent = savedMissions;
        if (menuKills) menuKills.textContent = savedKills;
        
        // Load settings
        const difficulty = localStorage.getItem('galacticWarDifficulty');
        const autoAim = localStorage.getItem('galacticWarAutoAim');
        const aiVoice = localStorage.getItem('galacticWarAiVoice');
        
        if (difficulty) {
            gameState.settings.difficulty = difficulty;
            const difficultySelect = document.getElementById('difficultySelect');
            if (difficultySelect) difficultySelect.value = difficulty;
        }
        
        if (autoAim !== null) {
            gameState.settings.autoAim = autoAim === 'true';
            const autoAimCheck = document.getElementById('autoAimCheck');
            if (autoAimCheck) autoAimCheck.checked = gameState.settings.autoAim;
        }
        
        if (aiVoice !== null) {
            gameState.settings.aiVoice = aiVoice === 'true';
            const aiVoiceCheck = document.getElementById('aiVoiceCheck');
            if (aiVoiceCheck) aiVoiceCheck.checked = gameState.settings.aiVoice;
        }
        
    } catch (error) {
        console.error("Error loading saved data:", error);
    }
}

function saveSettings() {
    try {
        // Save settings to localStorage
        const difficultySelect = document.getElementById('difficultySelect');
        const autoAimCheck = document.getElementById('autoAimCheck');
        const aiVoiceCheck = document.getElementById('aiVoiceCheck');
        
        if (difficultySelect) {
            gameState.settings.difficulty = difficultySelect.value;
            localStorage.setItem('galacticWarDifficulty', gameState.settings.difficulty);
        }
        
        if (autoAimCheck) {
            gameState.settings.autoAim = autoAimCheck.checked;
            localStorage.setItem('galacticWarAutoAim', gameState.settings.autoAim.toString());
        }
        
        if (aiVoiceCheck) {
            gameState.settings.aiVoice = aiVoiceCheck.checked;
            localStorage.setItem('galacticWarAiVoice', gameState.settings.aiVoice.toString());
        }
        
        // Return to main menu
        showScreen('mainMenu');
    } catch (error) {
        console.error("Error saving settings:", error);
    }
}

function animate() {
    if (gameState.isPaused || gameState.isGameOver || !renderer || !scene || !camera) {
        // Still render the scene even if paused
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
        animationFrameId = requestAnimationFrame(animate);
        return;
    }
    
    try {
        // Calculate delta time
        deltaTime = clock.getDelta();
        
        // Update game systems
        if (gameState.missionStarted && !gameState.isPaused && !gameState.isGameOver) {
            updatePlayerMovement();
            updateEnemies();
            updateProjectiles();
            checkCollisions();
            updateHUD();
        }
        
        // Render scene
        renderer.render(scene, camera);
        
        // Update FPS counter
        updateFPSCounter();
        
        // Request next frame
        animationFrameId = requestAnimationFrame(animate);
    } catch (error) {
        console.error("Error in animation loop:", error);
        // Stop the loop on error
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
}

function updateFPSCounter() {
    try {
        const fps = deltaTime > 0 ? Math.round(1 / deltaTime) : 60;
        const fpsElement = document.getElementById('fpsCounter');
        
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${fps}`;
            
            // Color code based on FPS
            if (fps > 50) {
                fpsElement.style.color = '#00ff00';
            } else if (fps > 30) {
                fpsElement.style.color = '#ffff00';
            } else {
                fpsElement.style.color = '#ff0000';
                
                // Show performance warning if FPS is low
                const perfWarning = document.getElementById('perfWarning');
                if (perfWarning && perfWarning.classList.contains('hidden')) {
                    perfWarning.classList.remove('hidden');
                }
            }
        }
    } catch (error) {
        console.error("Error updating FPS counter:", error);
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing game...");
    initGame();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
});