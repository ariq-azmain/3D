// Ariq Azmain's Galactic War - Mission Edition
// Complete Game System with Enhanced Graphics and AI

// Game Configuration
const CONFIG = {
    // Graphics Settings
    SHADOWS: true,
    BLOOM: true,
    PARTICLES: true,
    POST_PROCESSING: true,
    
    // Game Settings
    PLAYER_SPEED: 50,
    PLAYER_ROTATION_SPEED: 0.05,
    PLAYER_BOOST_MULTIPLIER: 2,
    
    // Weapon Settings
    BULLET_SPEED: 100,
    BOMB_SPEED: 60,
    MISSILE_SPEED: 80,
    BOMB_RELOAD_TIME: 5000, // 5 seconds
    MISSILE_RELOAD_TIME: 10000, // 10 seconds
    
    // Mission Settings
    WAYPOINT_DISTANCE: 1000,
    TOTAL_WAYPOINTS: 5,
    STATION_HEALTH: 10000,
    
    // Enemy Settings
    ENEMY_SPEED: 20,
    ENEMY_FIRE_RATE: 1000, // ms
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
    
    player: {
        health: 100,
        maxHealth: 100,
        energy: 100,
        maxEnergy: 100,
        score: 0,
        kills: 0,
        distance: 0,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
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
        autoAim: true
    }
};

// Three.js Variables
let scene, camera, renderer, composer;
let playerShip, waypoints = [], enemies = [], asteroids = [], healthPacks = [];
let bullets = [], bombs = [], missiles = [];
let clock = new THREE.Clock();
let deltaTime = 0;
let bloomPass;

// Input State
let keys = {};
let mouse = { x: 0, y: 0, down: false };
let isBoosting = false;

// Initialize Game
function initGame() {
    console.log("Initializing game...");
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize Three.js
    initThreeJS();
    
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
        "Loading Audio Assets...",
        "Finalizing Systems...",
        "Ready for Mission!"
    ];
    
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
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
    
    // Hide loading screen
    document.getElementById('loadingScreen').classList.add('hidden');
    
    // Show main menu
    showScreen('mainMenu');
    
    // Load saved data
    loadSavedData();
}

function showScreen(screenName) {
    console.log(`Showing screen: ${screenName}`);
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Show requested screen
    const screenElement = document.getElementById(screenName + 'Screen');
    if (screenElement) {
        screenElement.classList.remove('hidden');
        gameState.currentScreen = screenName;
    }
}

function initThreeJS() {
    console.log("Initializing Three.js...");
    
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000011, 100, 2000);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 10, 50);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = CONFIG.SHADOWS;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    document.getElementById('gameContainer').appendChild(renderer.domElement);
    
    // Setup lighting
    setupLighting();
    
    // Create stars background
    createStarfield();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x333355, 0.4);
    scene.add(ambientLight);
    
    // Directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(100, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    scene.add(sunLight);
    
    // Point light for player ship glow
    const playerLight = new THREE.PointLight(0x00a0ff, 1, 100);
    playerLight.position.set(0, 0, 0);
    scene.add(playerLight);
}

function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
        // Position
        positions[i] = (Math.random() - 0.5) * 2000;
        positions[i + 1] = (Math.random() - 0.5) * 2000;
        positions[i + 2] = (Math.random() - 0.5) * 2000;
        
        // Color
        const color = new THREE.Color();
        color.setHSL(Math.random(), 0.5, 0.5 + Math.random() * 0.5);
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        size: 0.7,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

function createPlayerShip() {
    const group = new THREE.Group();
    
    // Ship body
    const bodyGeometry = new THREE.ConeGeometry(2, 6, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x0080ff,
        shininess: 100,
        emissive: 0x002244,
        emissiveIntensity: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    group.add(body);
    
    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(1.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00ffff,
        transmission: 0.7,
        thickness: 0.5,
        roughness: 0.1
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.y = 0.8;
    group.add(cockpit);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(5, 0.3, 2);
    const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x0044aa,
        emissive: 0x001122,
        emissiveIntensity: 0.2
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-3, 0, -2);
    leftWing.castShadow = true;
    group.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(3, 0, -2);
    rightWing.castShadow = true;
    group.add(rightWing);
    
    // Engine glow
    const engineGlow = new THREE.PointLight(0xffff00, 2, 50);
    engineGlow.position.set(0, 0, -3);
    group.add(engineGlow);
    
    group.position.set(0, 0, 0);
    scene.add(group);
    
    playerShip = {
        mesh: group,
        velocity: new THREE.Vector3(0, 0, 0),
        speed: 0,
        maxSpeed: CONFIG.PLAYER_SPEED,
        rotationSpeed: CONFIG.PLAYER_ROTATION_SPEED,
        engineLight: engineGlow
    };
    
    // Set camera to follow player
    camera.position.set(0, 15, 30);
    camera.lookAt(playerShip.mesh.position);
}

function createWaypoints() {
    waypoints = [];
    
    for (let i = 0; i < CONFIG.TOTAL_WAYPOINTS; i++) {
        const waypoint = new THREE.Mesh(
            new THREE.SphereGeometry(20, 32, 32),
            new THREE.MeshBasicMaterial({
                color: i === 0 ? 0x00ff00 : 0x0088ff,
                transparent: true,
                opacity: 0.5,
                wireframe: true
            })
        );
        
        // Position waypoints in a line
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
        
        // Add glow effect
        const glow = new THREE.PointLight(i === 0 ? 0x00ff00 : 0x0088ff, 2, 200);
        glow.position.copy(waypoint.position);
        scene.add(glow);
        
        scene.add(waypoint);
        waypoints.push(waypoint);
        
        // Create enemy patrols near waypoints
        createEnemyPatrol(waypoint.position, 3);
    }
}

function createEnemyPatrol(position, count) {
    for (let i = 0; i < count; i++) {
        const enemy = createEnemyShip();
        enemy.position.set(
            position.x + (Math.random() - 0.5) * 300,
            position.y + (Math.random() - 0.5) * 150,
            position.z + (Math.random() - 0.5) * 300
        );
        
        scene.add(enemy);
        enemies.push(enemy);
    }
}

function createEnemyShip() {
    const group = new THREE.Group();
    
    // Enemy ship body (flying saucer)
    const bodyGeometry = new THREE.CylinderGeometry(3, 2, 1, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0x440000,
        emissiveIntensity: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // Dome
    const domeGeometry = new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff5555,
        transmission: 0.4,
        thickness: 0.3
    });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 0.5;
    group.add(dome);
    
    // Engine glow
    const engineLight = new THREE.PointLight(0xff0000, 1, 50);
    engineLight.position.set(0, -0.5, 0);
    group.add(engineLight);
    
    // Add to scene
    const enemy = group;
    enemy.userData = {
        isEnemy: true,
        health: 100,
        maxHealth: 100,
        speed: CONFIG.ENEMY_SPEED,
        fireRate: CONFIG.ENEMY_FIRE_RATE,
        lastFire: 0,
        target: null
    };
    
    return enemy;
}

function createAsteroidField() {
    asteroids = [];
    
    for (let i = 0; i < 50; i++) {
        const size = Math.random() * 10 + 5;
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: 0x888888,
            emissive: 0x222222,
            emissiveIntensity: 0.1
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
    }
}

function createHealthPacks() {
    healthPacks = [];
    
    for (let i = 0; i < 10; i++) {
        const geometry = new THREE.SphereGeometry(5, 16, 16);
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
    }
}

function setupEventListeners() {
    console.log("Setting up event listeners...");
    
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
                fireMissile();
                break;
            case 'KeyB':
                fireBomb();
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
        if (e.button === 0) { // Left click
            fireBullet();
        } else if (e.button === 2) { // Right click
            fireBomb();
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
    document.getElementById('quitToMenuBtn').addEventListener('click', () => showScreen('mainMenu'));
    document.getElementById('playAgainBtn').addEventListener('click', startNewGame);
    document.getElementById('backToMenuCompleteBtn').addEventListener('click', () => showScreen('mainMenu'));
    document.getElementById('continueMissionBtn').addEventListener('click', continueMission);
    document.getElementById('useDroneBtn').addEventListener('click', deployDrone);
    document.getElementById('useNukeBtn').addEventListener('click', useNuclearBomb);
    
    // Close performance warning
    document.getElementById('closePerfWarning').addEventListener('click', () => {
        document.getElementById('perfWarning').classList.add('hidden');
    });
    
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
}

function startNewGame() {
    console.log("Starting new game...");
    
    // Reset game state
    resetGameState();
    
    // Clear scene
    while(scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    
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
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('missionCompleteScreen').classList.add('hidden');
    
    // Start mission
    gameState.missionStarted = true;
    gameState.currentWaypoint = 1;
    
    // Update HUD
    updateHUD();
    updateWaypointDisplay();
    
    // Start game loop
    if (!gameState.isPaused) {
        animate();
    }
}

function resetGameState() {
    gameState = {
        currentScreen: 'game',
        isPaused: false,
        isGameOver: false,
        missionStarted: true,
        currentWaypoint: 1,
        missionComplete: false,
        
        player: {
            health: 100,
            maxHealth: 100,
            energy: 100,
            maxEnergy: 100,
            score: 0,
            kills: 0,
            distance: 0,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
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
        }
    };
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        // Show pause menu (to be implemented)
    } else {
        // Resume game
        animate();
    }
}

function updatePlayerMovement() {
    if (!playerShip || gameState.isPaused) return;
    
    // Calculate movement direction based on keys
    const moveVector = new THREE.Vector3(0, 0, 0);
    
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
    playerShip.mesh.rotation.y = -mouse.x * Math.PI * 0.5;
    playerShip.mesh.rotation.x = mouse.y * Math.PI * 0.25;
    
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
    
    // Update engine light intensity based on speed
    if (playerShip.engineLight) {
        playerShip.engineLight.intensity = 1 + playerShip.speed / CONFIG.PLAYER_SPEED;
    }
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        if (!enemy.userData) return;
        
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
        
        // Check collision with player bullets
        checkEnemyCollisions(enemy, index);
    });
}

function fireEnemyWeapon(enemy) {
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 8),
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
}

function fireBullet() {
    if (!gameState.missionStarted || gameState.isPaused) return;
    
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    
    // Position bullet in front of ship
    const bulletPosition = playerShip.mesh.position.clone();
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(playerShip.mesh.quaternion);
    bulletPosition.add(forward.multiplyScalar(5));
    
    bullet.position.copy(bulletPosition);
    
    // Calculate direction based on mouse position
    const direction = new THREE.Vector3(mouse.x, mouse.y, -1).normalize();
    
    bullet.userData = {
        isPlayerBullet: true,
        damage: 10,
        velocity: direction.multiplyScalar(CONFIG.BULLET_SPEED),
        life: 2
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    // Create muzzle flash
    createMuzzleFlash(bulletPosition);
}

function fireBomb() {
    if (!gameState.missionStarted || gameState.isPaused || gameState.weapons.bombs <= 0) return;
    
    gameState.weapons.bombs--;
    
    const bomb = new THREE.Mesh(
        new THREE.SphereGeometry(2, 16, 16),
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
}

function fireMissile() {
    if (!gameState.missionStarted || gameState.isPaused || gameState.weapons.missiles <= 0) return;
    
    gameState.weapons.missiles--;
    
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
}

function createMuzzleFlash(position) {
    const flash = new THREE.PointLight(0xffff00, 5, 20);
    flash.position.copy(position);
    scene.add(flash);
    
    // Remove flash after short time
    setTimeout(() => {
        scene.remove(flash);
    }, 50);
}

function updateProjectiles() {
    // Update bullets
    bullets.forEach((bullet, index) => {
        if (!bullet.userData) return;
        
        bullet.position.add(bullet.userData.velocity.clone().multiplyScalar(deltaTime));
        bullet.userData.life -= deltaTime;
        
        if (bullet.userData.life <= 0) {
            scene.remove(bullet);
            bullets.splice(index, 1);
        }
    });
    
    // Update bombs
    bombs.forEach((bomb, index) => {
        if (!bomb.userData) return;
        
        bomb.position.add(bomb.userData.velocity.clone().multiplyScalar(deltaTime));
        bomb.userData.life -= deltaTime;
        
        if (bomb.userData.life <= 0) {
            createExplosion(bomb.position, bomb.userData.explosionRadius);
            scene.remove(bomb);
            bombs.splice(index, 1);
        }
    });
    
    // Update missiles
    missiles.forEach((missile, index) => {
        if (!missile.userData) return;
        
        // Homing missile logic
        if (missile.userData.homing && missile.userData.target) {
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
            missiles.splice(index, 1);
        }
    });
}

function checkCollisions() {
    // Check player bullets vs enemies
    bullets.forEach((bullet, bulletIndex) => {
        if (!bullet.userData.isPlayerBullet) return;
        
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.position.distanceTo(enemy.position) < 10) {
                // Hit enemy
                enemy.userData.health -= bullet.userData.damage;
                
                // Create hit effect
                createHitEffect(bullet.position);
                
                // Remove bullet
                scene.remove(bullet);
                bullets.splice(bulletIndex, 1);
                
                // Check if enemy is destroyed
                if (enemy.userData.health <= 0) {
                    destroyEnemy(enemy, enemyIndex);
                }
            }
        });
    });
    
    // Check enemy bullets vs player
    bullets.forEach((bullet, bulletIndex) => {
        if (!bullet.userData.isEnemyBullet) return;
        
        if (bullet.position.distanceTo(playerShip.mesh.position) < 5) {
            // Hit player
            gameState.player.health -= bullet.userData.damage;
            
            // Create hit effect
            createHitEffect(bullet.position);
            
            // Show damage overlay if health is low
            if (gameState.player.health < 30) {
                document.getElementById('damageOverlay').classList.add('critical');
            }
            
            // Remove bullet
            scene.remove(bullet);
            bullets.splice(bulletIndex, 1);
            
            // Update HUD
            updateHUD();
            
            // Check if player is destroyed
            if (gameState.player.health <= 0) {
                gameOver();
            }
        }
    });
    
    // Check bombs vs enemies
    bombs.forEach((bomb, bombIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bomb.position.distanceTo(enemy.position) < 15) {
                // Destroy bomb and damage enemy
                enemy.userData.health -= bomb.userData.damage;
                
                // Check if enemy is destroyed
                if (enemy.userData.health <= 0) {
                    destroyEnemy(enemy, enemyIndex);
                }
            }
        });
    });
    
    // Check missiles vs enemies
    missiles.forEach((missile, missileIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (missile.position.distanceTo(enemy.position) < 10) {
                // Destroy missile and enemy
                enemy.userData.health -= missile.userData.damage;
                
                // Check if enemy is destroyed
                if (enemy.userData.health <= 0) {
                    destroyEnemy(enemy, enemyIndex);
                }
                
                // Remove missile
                scene.remove(missile);
                missiles.splice(missileIndex, 1);
            }
        });
    });
    
    // Check player vs health packs
    healthPacks.forEach((healthPack, index) => {
        if (playerShip.mesh.position.distanceTo(healthPack.position) < 10) {
            // Collect health pack
            gameState.player.health = Math.min(gameState.player.maxHealth, gameState.player.health + 20);
            
            // Show notification
            showNotification('healthPickup', '+20 Health Restored!');
            
            // Remove health pack
            scene.remove(healthPack);
            healthPacks.splice(index, 1);
            
            // Update HUD
            updateHUD();
        }
    });
    
    // Check player vs waypoints
    waypoints.forEach((waypoint, index) => {
        if (waypoint.userData.reached) return;
        
        if (playerShip.mesh.position.distanceTo(waypoint.position) < 100) {
            // Reached waypoint
            waypoint.userData.reached = true;
            gameState.currentWaypoint = index + 1;
            
            // Show congratulations
            showCongratulations(`Waypoint ${index + 1} Reached!`);
            
            // Update waypoint display
            updateWaypointDisplay();
            
            // If this is the last waypoint, start final battle
            if (index === waypoints.length - 1) {
                startFinalBattle();
            }
        }
    });
}

function checkEnemyCollisions(enemy, enemyIndex) {
    // Check collisions with player bullets, bombs, missiles
    // (This is handled in checkCollisions)
}

function destroyEnemy(enemy, index) {
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
}

function createExplosion(position, size) {
    // Create explosion particles
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        // Random position within explosion radius
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * size;
        
        positions[i] = position.x + Math.cos(angle) * radius;
        positions[i + 1] = position.y + Math.random() * size;
        positions[i + 2] = position.z + Math.sin(angle) * radius;
        
        // Random color (yellow to red)
        colors[i] = 1; // R
        colors[i + 1] = Math.random() * 0.5; // G
        colors[i + 2] = 0; // B
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    const explosion = new THREE.Points(particles, particleMaterial);
    scene.add(explosion);
    
    // Animate explosion
    gsap.to(explosion.material, {
        opacity: 0,
        duration: 1,
        onComplete: () => {
            scene.remove(explosion);
        }
    });
}

function createHitEffect(position) {
    const hitEffect = new THREE.PointLight(0xff0000, 5, 30);
    hitEffect.position.copy(position);
    scene.add(hitEffect);
    
    // Remove after short time
    setTimeout(() => {
        scene.remove(hitEffect);
    }, 100);
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
}

function createSpaceStation() {
    // This would create the final space station with multiple layers
    // For now, we'll just create a placeholder
    const station = new THREE.Mesh(
        new THREE.SphereGeometry(100, 32, 32),
        new THREE.MeshPhongMaterial({
            color: 0xff00ff,
            emissive: 0x440044,
            emissiveIntensity: 0.3
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
}

function createStationDefenses(position) {
    // Create defense turrets around the station
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
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
}

function deployDrone() {
    if (gameState.weapons.drone <= 0) return;
    
    gameState.weapons.drone--;
    
    // Create drone that follows and attacks enemies
    const drone = new THREE.Mesh(
        new THREE.SphereGeometry(3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    
    drone.position.copy(playerShip.mesh.position);
    
    drone.userData = {
        isDrone: true,
        health: 50,
        target: null,
        lastAttack: 0,
        attackRate: 1000
    };
    
    scene.add(drone);
}

function useNuclearBomb() {
    if (gameState.weapons.nuke <= 0) return;
    
    gameState.weapons.nuke--;
    
    // Create massive explosion that destroys everything
    createExplosion(playerShip.mesh.position, 500);
    
    // Destroy all enemies in range
    enemies.forEach((enemy, index) => {
        if (enemy.position.distanceTo(playerShip.mesh.position) < 500) {
            destroyEnemy(enemy, index);
        }
    });
    
    // Update HUD
    updateHUD();
}

function updateHUD() {
    // Update health bar
    const healthPercent = (gameState.player.health / gameState.player.maxHealth) * 100;
    document.getElementById('healthBar').style.width = healthPercent + '%';
    document.getElementById('healthText').textContent = Math.round(gameState.player.health) + '%';
    
    // Update energy bar
    const energyPercent = (gameState.player.energy / gameState.player.maxEnergy) * 100;
    document.getElementById('energyBar').style.width = energyPercent + '%';
    document.getElementById('energyText').textContent = Math.round(gameState.player.energy) + '%';
    
    // Update score
    document.getElementById('scoreValue').textContent = gameState.player.score;
    
    // Update enemy count
    document.getElementById('enemyCount').textContent = enemies.length;
    
    // Update distance
    document.getElementById('distanceValue').textContent = Math.round(gameState.player.distance) + 'm';
    
    // Update weapon counts
    document.getElementById('bulletCount').textContent = '∞';
    document.getElementById('bombCount').textContent = gameState.weapons.bombs;
    document.getElementById('missileCount').textContent = gameState.weapons.missiles;
    
    // Update speed
    document.getElementById('speedValue').textContent = Math.round(playerShip?.speed || 0);
    
    // Update waypoint distance
    if (waypoints[gameState.currentWaypoint - 1]) {
        const distance = playerShip.mesh.position.distanceTo(waypoints[gameState.currentWaypoint - 1].position);
        document.getElementById('waypointDistance').textContent = Math.round(distance) + 'm';
    }
}

function updateWaypointDisplay() {
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
    document.getElementById('missionProgress').style.width = progressPercent + '%';
    
    // Update mission text
    if (gameState.currentWaypoint <= CONFIG.TOTAL_WAYPOINTS) {
        document.getElementById('missionText').textContent = `Reach Waypoint ${gameState.currentWaypoint}`;
    }
}

function showCongratulations(message) {
    document.getElementById('congratsTitle').textContent = message;
    document.getElementById('congratsMessage').textContent = 'Proceeding to next objective...';
    document.getElementById('congratulationsPopup').classList.remove('hidden');
    
    // Pause game
    gameState.isPaused = true;
}

function continueMission() {
    document.getElementById('congratulationsPopup').classList.add('hidden');
    gameState.isPaused = false;
    
    // Resume game loop
    if (gameState.missionStarted && !gameState.isGameOver) {
        animate();
    }
}

function showNotification(type, message) {
    const notification = document.getElementById(type);
    if (notification) {
        notification.querySelector('span').textContent = message;
        notification.classList.remove('hidden');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

function gameOver() {
    gameState.isGameOver = true;
    
    // Update final stats
    document.getElementById('finalDistance').textContent = Math.round(gameState.player.distance) + 'm';
    document.getElementById('finalKills').textContent = gameState.player.kills;
    document.getElementById('finalWaypoints').textContent = `${gameState.currentWaypoint - 1}/${CONFIG.TOTAL_WAYPOINTS}`;
    document.getElementById('finalScore').textContent = gameState.player.score;
    
    // Show game over screen
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('finalBattleHUD').classList.add('hidden');
    document.getElementById('waypointIndicator').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function missionComplete() {
    gameState.missionComplete = true;
    
    // Update mission complete stats
    const missionTime = Math.round(gameState.player.distance / CONFIG.PLAYER_SPEED);
    const minutes = Math.floor(missionTime / 60);
    const seconds = missionTime % 60;
    
    document.getElementById('missionTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('totalKills').textContent = gameState.player.kills;
    document.getElementById('missionAccuracy').textContent = '85%'; // This would be calculated
    document.getElementById('missionScore').textContent = gameState.player.score;
    
    // Show mission complete screen
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('finalBattleHUD').classList.add('hidden');
    document.getElementById('missionCompleteScreen').classList.remove('hidden');
    
    // Create confetti effect
    createConfetti();
}

function createConfetti() {
    const confettiContainer = document.querySelector('.confetti-container');
    
    for (let i = 0; i < 100; i++) {
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
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
}

function loadSavedData() {
    // Load saved settings and stats from localStorage
    const savedHighScore = localStorage.getItem('galacticWarHighScore') || 0;
    const savedMissions = localStorage.getItem('galacticWarMissions') || 0;
    const savedKills = localStorage.getItem('galacticWarKills') || 0;
    
    document.getElementById('menuHighScore').textContent = savedHighScore;
    document.getElementById('menuMissions').textContent = savedMissions;
    document.getElementById('menuKills').textContent = savedKills;
}

function saveSettings() {
    // Save settings to localStorage
    const difficulty = document.getElementById('difficultySelect').value;
    const autoAim = document.getElementById('autoAimCheck').checked;
    
    localStorage.setItem('galacticWarDifficulty', difficulty);
    localStorage.setItem('galacticWarAutoAim', autoAim);
    
    // Return to main menu
    showScreen('mainMenu');
}

function animate() {
    if (!gameState.missionStarted || gameState.isPaused || gameState.isGameOver) return;
    
    requestAnimationFrame(animate);
    
    // Calculate delta time
    deltaTime = clock.getDelta();
    
    // Update game systems
    updatePlayerMovement();
    updateEnemies();
    updateProjectiles();
    checkCollisions();
    
    // Update HUD
    updateHUD();
    
    // Render scene
    renderer.render(scene, camera);
    
    // Update FPS counter
    updateFPSCounter();
}

function updateFPSCounter() {
    const fps = Math.round(1 / deltaTime);
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
            if (!document.getElementById('perfWarning').classList.contains('hidden')) {
                document.getElementById('perfWarning').classList.remove('hidden');
            }
        }
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing game...");
    initGame();
});