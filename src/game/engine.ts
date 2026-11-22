import * as THREE from "three";
import {
  BLOCK,
  BLOCK_DEFS,
  ITEMS,
  RECIPES,
  SMELTING_RECIPES,
  getFuelBurnTime,
  type BlockNum,
  type GameModeId,
  type ItemDef,
  type ItemId,
} from "./blocks";
import { createBlockAtlas, type BlockAtlas } from "./textures";
import { buildChunkGeometries } from "./mesher";
import {
  CHUNK_SIZE,
  chunkCoord,
  chunkKey,
  InfiniteWorld,
  WORLD_HEIGHT,
} from "./world";
import { GameAudio } from "./audio";
import { MobManager } from "./mobs";
import { PlayerCharacterModel } from "./playerModel";
import {
  loadSettings,
  saveWorldSave,
  type FurnaceData,
  type GameSettings,
  type WorldSave,
} from "./storage";

export interface MinecraftHudState {
  health: number; // 0..20 (10 hearts)
  maxHealth: number;
  hunger: number; // 0..20 (10 drumsticks)
  maxHunger: number;
  oxygen: number; // 0..20 (10 bubbles)
  maxOxygen: number;
  inWater: boolean;
  gameMode: GameModeId;
  hotbar: Array<{ item: ItemId; count: number } | null>;
  selectedSlot: number;
  heldItem: ItemId | null;
  heldDef: ItemDef | null;
  heldName: string;
  inventory: Record<string, number>;
  armorPoints: number; // 0..20 (10 armor shields)
  armor: {
    head: ItemId | null;
    chest: ItemId | null;
    legs: ItemId | null;
    feet: ItemId | null;
  };
  xp: number; // 0..100
  level: number;
  weather: "clear" | "rain" | "thunder";
  underwater: boolean;
  debug: {
    fps: number;
    x: number;
    y: number;
    z: number;
    chunkX: number;
    chunkZ: number;
    biome: string;
    facing: string;
    loadedChunks: number;
    dayTimeTicks: number;
    lightLevel: number;
    seed: number;
  };
  isF3Open: boolean;
  targetBlock: {
    name: string;
    x: number;
    y: number;
    z: number;
  } | null;
  crosshairActive: boolean;
  hurtFlash: boolean;
}

export interface EngineCallbacks {
  onHud: (hud: MinecraftHudState) => void;
  onOpenCrafting: (isWorkstation: boolean) => void;
  onOpenChest?: (chestPosKey: string) => void;
  onOpenFurnace?: (furnacePosKey: string) => void;
  onOpenChat?: (initialText?: string) => void;
  onChatMessage?: (msg: { id: string; text: string; type: "chat" | "system" | "command" | "error" }) => void;
  onNotification?: (msg: string) => void;
  onDeath: () => void;
  onPauseRequest: () => void;
  onWorldSaved?: () => void;
}

interface ChunkMeshRecord {
  opaqueMesh?: THREE.Mesh;
  waterMesh?: THREE.Mesh;
}

interface ShardParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

export class GameEngine {
  container: HTMLElement;
  callbacks: EngineCallbacks;

  // Scene & Three.js
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  audio: GameAudio;
  atlas: BlockAtlas;

  // World & Save
  save: WorldSave;
  world: InfiniteWorld;
  settings: GameSettings;
  chunkMeshes = new Map<string, ChunkMeshRecord>();
  dirtyChunks = new Set<string>();

  // Lighting & Sky
  sunLight: THREE.DirectionalLight;
  moonLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  skyMesh: THREE.Mesh;
  sunMesh: THREE.Mesh;
  moonMesh: THREE.Mesh;
  starsMesh: THREE.Points;
  torchLights: THREE.PointLight[] = [];

  // Player state
  player = {
    pos: new THREE.Vector3(0.5, 34, 0.5),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    health: 20,
    maxHealth: 20,
    hunger: 20,
    maxHunger: 20,
    saturation: 5,
    oxygen: 20,
    maxOxygen: 20,
    flying: false,
    onGround: false,
    inWater: false,
    headInWater: false,
    fallDistance: 0,
    sprinting: false,
    hotbar: [] as Array<{ item: ItemId; count: number } | null>,
    inventory: {} as Record<string, number>,
    armor: {
      head: null as ItemId | null,
      chest: null as ItemId | null,
      legs: null as ItemId | null,
      feet: null as ItemId | null,
    },
    xp: 0,
    level: 0,
    selectedSlot: 0,
  };

  mobManager: MobManager;
  hungerTimer = 0;

  // Weather System
  weather: "clear" | "rain" | "thunder" = "clear";
  weatherTimer = 220;
  lightningFlashTimer = 0;
  precipPoints: THREE.Points | null = null;
  precipPositions: Float32Array | null = null;
  precipColors: Float32Array | null = null;

  // XP Orbs
  xpOrbs: Array<{
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    value: number;
    age: number;
  }> = [];
  xpChimeStreak = 0;
  xpStreakResetTimer = 0;

  // Viewmodel & Held Item
  viewmodelGroup: THREE.Group;
  heldItemMesh: THREE.Group | null = null;
  swingAnim = 0; // 0..1
  isMining = false;
  isPlacing = false;
  walkBob = 0;

  // Third-Person Camera & 3D Character Model
  cameraMode: "first_person" | "third_person_back" | "third_person_front" = "first_person";
  playerModel: PlayerCharacterModel;

  // Crops & Agriculture Simulation
  activeCrops: Set<string> = new Set();
  cropTimer = 0;

  // Targeting & Mining
  targetBlock: { x: number; y: number; z: number; block: BlockNum } | null = null;
  targetNormal = new THREE.Vector3(0, 1, 0);
  highlightBox: THREE.LineSegments;
  crackMesh: THREE.Mesh;
  mineProgress = 0; // 0..1
  mineHitTimer = 0;
  lastHurtTime = 0;
  hurtFlash = false;
  drownTimer = 0;

  // Input & Pointer Lock
  keys: Record<string, boolean> = {};
  isPointerLocked = false;
  isPaused = false;
  isDead = false;
  isF3Open = false;
  lastSpacePress = 0;
  lastWPress = 0;

  // Particles
  shards: ShardParticle[] = [];
  shardGeometry: THREE.BufferGeometry;
  shardPoints: THREE.Points;

  // Timers & Stats
  lastFrameTime = performance.now();
  fpsCounter = 60;
  frameCount = 0;
  lastFpsCalc = performance.now();
  autoSaveTimer = 0;
  animFrameId: number | null = null;

  // Disposed flag
  private isDisposed = false;

  constructor(container: HTMLElement, save: WorldSave, callbacks: EngineCallbacks) {
    this.container = container;
    this.save = save;
    this.callbacks = callbacks;
    this.settings = loadSettings();

    // Init Audio
    this.audio = new GameAudio(this.settings.muted);

    // Init Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x78a7ff, 0.018);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, aspect, 0.05, 300);
    this.scene.add(this.camera);

    // Create Block Atlas & Materials
    this.atlas = createBlockAtlas();

    // Create Infinite World
    this.world = new InfiniteWorld(save.seed, save.edits);

    // Mob Manager & Entities
    this.mobManager = new MobManager(this.world, this.scene, this.audio);

    // Restore Player State
    this.player.health = save.player?.health ?? 20;
    this.player.hunger = save.player?.hunger ?? 20;
    this.player.oxygen = save.player?.oxygen ?? 20;
    this.player.yaw = save.player?.yaw ?? 0;
    this.player.pitch = save.player?.pitch ?? 0;
    this.player.flying = save.gameMode === "creative" ? (save.player?.flying ?? false) : false;
    this.player.selectedSlot = save.player?.selectedSlot ?? 0;
    this.player.hotbar = save.player?.hotbar ? [...save.player.hotbar] : [];
    if (this.player.hotbar.length < 9) {
      while (this.player.hotbar.length < 9) this.player.hotbar.push(null);
    }
    this.player.inventory = save.player?.inventory ? { ...save.player.inventory } : {};
    if (save.player?.armor) {
      this.player.armor = { ...save.player.armor };
    }
    this.player.xp = save.player?.xp ?? 0;
    this.player.level = save.player?.level ?? 0;
    this.weather = save.weather ?? "clear";
    if (!this.save.chests) this.save.chests = {};
    if (!this.save.furnaces) this.save.furnaces = {};

    // Initial position: find safe spawn if empty
    if (save.player?.pos && (save.player.pos[0] !== 0.5 || save.player.pos[2] !== 0.5)) {
      this.player.pos.set(save.player.pos[0], save.player.pos[1], save.player.pos[2]);
    } else {
      const sp = this.world.findSpawn();
      this.player.pos.set(sp.x, sp.y, sp.z);
    }

    // Sky, Sun, Moon & Lights
    const { sunLight, moonLight, ambientLight, skyMesh, sunMesh, moonMesh, starsMesh } = this.initAtmosphere();
    this.sunLight = sunLight;
    this.moonLight = moonLight;
    this.ambientLight = ambientLight;
    this.skyMesh = skyMesh;
    this.sunMesh = sunMesh;
    this.moonMesh = moonMesh;
    this.starsMesh = starsMesh;

    // Highlight Outline
    const wireGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlightBox = new THREE.LineSegments(
      wireGeo,
      new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2, transparent: true, opacity: 0.65 }),
    );
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);

    // Crack Overlay Box
    const crackGeo = new THREE.BoxGeometry(1.003, 1.003, 1.003);
    this.crackMesh = new THREE.Mesh(crackGeo, this.atlas.crackMaterials[0]);
    this.crackMesh.visible = false;
    this.scene.add(this.crackMesh);

    // Shard Particles System
    this.shardGeometry = new THREE.BufferGeometry();
    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    this.shardPoints = new THREE.Points(this.shardGeometry, particleMat);
    this.scene.add(this.shardPoints);

    // First Person Viewmodel
    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);
    this.rebuildViewmodel();

    // 3D Steve Character Model for Third-Person Mode
    this.playerModel = new PlayerCharacterModel();
    this.scene.add(this.playerModel.group);
    this.playerModel.group.visible = false;

    // Setup Torch / Glowstone Point Lights pool (up to 4 local dynamic lights)
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0xffc266, 0, 14, 1.6);
      this.scene.add(pl);
      this.torchLights.push(pl);
    }

    // Event Listeners
    this.setupInputs();

    // Setup Precipitation Particle System
    this.initPrecipitation();

    // Initial Chunk Load
    this.updateLoadedChunks(true);

    // Start Loop
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  // --------------------------------------------------------------------------
  // ATMOSPHERE & LIGHTING
  // --------------------------------------------------------------------------
  private initAtmosphere() {
    const ambientLight = new THREE.AmbientLight(0xdde8ff, 0.55);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5ea, 1.3);
    sunLight.castShadow = this.settings.shadows;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 120;
    const shadowD = 36;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    const moonLight = new THREE.DirectionalLight(0x5577aa, 0.25);
    moonLight.castShadow = false;
    this.scene.add(moonLight);

    // Sky Dome Mesh
    const skyGeo = new THREE.SphereGeometry(220, 16, 16);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x78a7ff, side: THREE.BackSide });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyMesh);

    // Sun Quad
    const sunGeo = new THREE.PlaneGeometry(16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff6c2, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(sunMesh);

    // Moon Quad
    const moonGeo = new THREE.PlaneGeometry(13, 13);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xf5f8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(moonMesh);

    // Stars
    const starCount = 300;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 210;
      const sinPhi = Math.sin(phi);
      starPos[i * 3] = r * sinPhi * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // upper hemisphere
      starPos[i * 3 + 2] = r * sinPhi * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0 });
    const starsMesh = new THREE.Points(starGeo, starMat);
    this.scene.add(starsMesh);

    return { sunLight, moonLight, ambientLight, skyMesh, sunMesh, moonMesh, starsMesh };
  }

  private updateDayNightCycle(dt: number) {
    // 24000 ticks per Minecraft day. 1 tick per ~0.05s -> full cycle ~ 20 mins (or ~12 mins speeded)
    const tickSpeed = 20; // ticks per real second
    this.save.dayTime = (this.save.dayTime + dt * tickSpeed) % 24000;
    const cycle = this.save.dayTime / 24000; // 0..1 (0: 6am, 0.25: 12pm, 0.5: 6pm, 0.75: 12am)
    const angle = cycle * Math.PI * 2 - Math.PI / 2;

    const sunDistance = 140;
    const sx = Math.cos(angle) * sunDistance;
    const sy = Math.sin(angle) * sunDistance;
    const sz = 0;

    // Follow player position
    const px = this.player.pos.x;
    const py = this.player.pos.y;
    const pz = this.player.pos.z;

    this.skyMesh.position.set(px, py, pz);
    this.starsMesh.position.set(px, py, pz);

    this.sunMesh.position.set(px + sx, py + sy, pz + sz);
    this.sunMesh.lookAt(px, py, pz);

    this.moonMesh.position.set(px - sx, py - sy, pz - sz);
    this.moonMesh.lookAt(px, py, pz);

    this.sunLight.position.set(px + sx, py + sy, pz + sz);
    this.sunLight.target.position.set(px, py, pz);
    this.sunLight.target.updateMatrixWorld();

    this.moonLight.position.set(px - sx, py - sy, pz - sz);
    this.moonLight.target.position.set(px, py, pz);
    this.moonLight.target.updateMatrixWorld();

    // Day / Night interpolation
    const isDay = sy > 0;
    const dayFactor = THREE.MathUtils.clamp((sy + 15) / 30, 0, 1);

    // Sky colors
    const daySky = new THREE.Color(0x78a7ff);
    const duskSky = new THREE.Color(0xcc6a3d);
    const nightSky = new THREE.Color(0x0a0f1d);
    const waterSky = new THREE.Color(0x112d4a);

    const currentSky = new THREE.Color();
    if (dayFactor > 0.5) {
      currentSky.copy(duskSky).lerp(daySky, (dayFactor - 0.5) * 2);
    } else {
      currentSky.copy(nightSky).lerp(duskSky, dayFactor * 2);
    }

    if (this.weather === "rain" || this.weather === "thunder") {
      const stormSky = new THREE.Color(0x323a48);
      currentSky.lerp(stormSky, this.weather === "thunder" ? 0.72 : 0.52);
    }

    if (this.player.headInWater) {
      currentSky.lerp(waterSky, 0.85);
    }

    if (this.lightningFlashTimer > 0) {
      currentSky.setHex(0xf4f7ff);
    }

    (this.skyMesh.material as THREE.MeshBasicMaterial).color.copy(currentSky);
    if (this.scene.fog) {
      this.scene.fog.color.copy(currentSky);
      (this.scene.fog as THREE.FogExp2).density = this.player.headInWater
        ? 0.08
        : this.weather === "thunder"
          ? 0.024
          : this.weather === "rain"
            ? 0.021
            : 0.016;
    }

    // Light intensities
    let sunInt = Math.max(0, dayFactor * 1.35);
    if (this.weather === "thunder") sunInt *= 0.2;
    else if (this.weather === "rain") sunInt *= 0.5;
    this.sunLight.intensity = sunInt;
    this.sunLight.color.set(isDay ? 0xfff5ea : 0xffa055);
    this.moonLight.intensity = Math.max(0, (1 - dayFactor) * 0.32);

    if (this.lightningFlashTimer > 0) {
      this.ambientLight.intensity = 2.4;
    } else {
      let amb = 0.18 + dayFactor * 0.42;
      if (this.weather === "thunder") amb *= 0.55;
      else if (this.weather === "rain") amb *= 0.75;
      this.ambientLight.intensity = amb;
    }

    // Stars opacity at night
    (this.starsMesh.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - dayFactor * 1.8);

    // Update nearby torch / glowstone point lights
    let lightIdx = 0;
    this.world.lightBlocks.forEach((info) => {
      if (lightIdx >= this.torchLights.length) return;
      const dist = this.player.pos.distanceTo(new THREE.Vector3(info.x, info.y, info.z));
      if (dist < 18) {
        const pl = this.torchLights[lightIdx++];
        pl.position.set(info.x, info.y, info.z);
        pl.color.setHex(info.color);
        pl.intensity = 1.6;
      }
    });
    while (lightIdx < this.torchLights.length) {
      this.torchLights[lightIdx++].intensity = 0;
    }
  }

  // --------------------------------------------------------------------------
  // WEATHER & PRECIPITATION
  // --------------------------------------------------------------------------
  private initPrecipitation() {
    const COUNT = 1200;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 36;
      positions[i * 3 + 1] = Math.random() * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 36;

      colors[i * 3 + 0] = 0.65;
      colors[i * 3 + 1] = 0.85;
      colors[i * 3 + 2] = 1.0;
    }

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    this.precipPoints = new THREE.Points(geom, mat);
    this.precipPoints.visible = false;
    this.scene.add(this.precipPoints);
    this.precipPositions = positions;
    this.precipColors = colors;
  }

  private updateWeather(dt: number) {
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      if (this.weather === "clear") {
        this.weather = Math.random() > 0.35 ? "rain" : "thunder";
        this.weatherTimer = 90 + Math.random() * 90;
        this.audio.startRain(this.weather === "thunder" ? 0.9 : 0.6);
        this.callbacks.onNotification?.(
          this.weather === "thunder" ? "A thunderstorm has started!" : "It started raining!",
        );
      } else {
        this.weather = "clear";
        this.weatherTimer = 240 + Math.random() * 180;
        this.audio.stopRain();
        this.callbacks.onNotification?.("The weather cleared up.");
      }
    }

    // Thunder strikes
    if (this.weather === "thunder") {
      if (Math.random() < 0.008) {
        this.lightningFlashTimer = 0.12;
        this.audio.thunderRumble();
      }
    }

    if (this.lightningFlashTimer > 0) {
      this.lightningFlashTimer -= dt;
    }

    this.updatePrecipitation(dt);
  }

  setWeather(w: "clear" | "rain" | "thunder") {
    this.weather = w;
    if (w === "clear") {
      this.audio.stopRain();
      this.weatherTimer = 240;
    } else {
      this.audio.startRain(w === "thunder" ? 0.9 : 0.6);
      this.weatherTimer = 120;
    }
  }

  private updatePrecipitation(dt: number) {
    if (!this.precipPoints || !this.precipPositions || !this.precipColors) return;

    if (this.weather === "clear") {
      this.precipPoints.visible = false;
      return;
    }

    const wx = Math.floor(this.player.pos.x);
    const wz = Math.floor(this.player.pos.z);
    const biome = this.world.getBiomeAt(wx, wz);

    // Desert has no precipitation
    if (biome.name === "Desert") {
      this.precipPoints.visible = false;
      return;
    }

    this.precipPoints.visible = true;
    const isSnow = biome.name === "Snowy Peaks";
    const COUNT = this.precipPositions.length / 3;

    const fallSpeed = isSnow ? 2.8 : 25.0;
    const mat = this.precipPoints.material as THREE.PointsMaterial;
    mat.size = isSnow ? 0.24 : 0.16;

    const px = this.player.pos.x;
    const py = this.player.pos.y;
    const pz = this.player.pos.z;

    const t = performance.now() * 0.001;

    for (let i = 0; i < COUNT; i++) {
      let x = this.precipPositions[i * 3 + 0];
      let y = this.precipPositions[i * 3 + 1];
      let z = this.precipPositions[i * 3 + 2];

      y -= fallSpeed * dt;
      if (isSnow) {
        x += Math.sin(t + i) * 0.04;
        z += Math.cos(t * 0.7 + i) * 0.04;
      }

      // Wrap around player
      if (y < py - 2) {
        y = py + 18 + Math.random() * 4;
        x = px + (Math.random() - 0.5) * 36;
        z = pz + (Math.random() - 0.5) * 36;
      }
      if (Math.abs(x - px) > 18) x = px + (Math.random() - 0.5) * 36;
      if (Math.abs(z - pz) > 18) z = pz + (Math.random() - 0.5) * 36;

      this.precipPositions[i * 3 + 0] = x;
      this.precipPositions[i * 3 + 1] = y;
      this.precipPositions[i * 3 + 2] = z;

      // Color
      if (isSnow) {
        this.precipColors[i * 3 + 0] = 1.0;
        this.precipColors[i * 3 + 1] = 1.0;
        this.precipColors[i * 3 + 2] = 1.0;
      } else {
        this.precipColors[i * 3 + 0] = 0.65;
        this.precipColors[i * 3 + 1] = 0.85;
        this.precipColors[i * 3 + 2] = 1.0;
      }
    }

    this.precipPoints.geometry.attributes.position.needsUpdate = true;
    this.precipPoints.geometry.attributes.color.needsUpdate = true;
  }

  // --------------------------------------------------------------------------
  // XP ORBS & LEVELING
  // --------------------------------------------------------------------------
  spawnXpOrbs(x: number, y: number, z: number, totalXp: number) {
    if (totalXp <= 0) return;
    const count = Math.min(6, Math.max(1, Math.ceil(totalXp / 2)));
    const perOrb = Math.max(1, Math.round(totalXp / count));

    for (let i = 0; i < count; i++) {
      const geom = new THREE.BoxGeometry(0.18, 0.18, 0.18);
      const mat = new THREE.MeshBasicMaterial({ color: 0x88ff20 });
      const mesh = new THREE.Mesh(geom, mat);
      const px = x + (Math.random() - 0.5) * 0.4;
      const py = y + 0.2 + Math.random() * 0.3;
      const pz = z + (Math.random() - 0.5) * 0.4;
      mesh.position.set(px, py, pz);
      this.scene.add(mesh);

      this.xpOrbs.push({
        mesh,
        pos: new THREE.Vector3(px, py, pz),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2.2,
          2.5 + Math.random() * 2.0,
          (Math.random() - 0.5) * 2.2,
        ),
        value: perOrb,
        age: 0,
      });
    }
  }

  addXp(amount: number) {
    this.player.xp += amount;
    while (this.player.xp >= 100) {
      this.player.xp -= 100;
      this.player.level += 1;
      this.audio.levelUp();
      this.callbacks.onNotification?.(`LEVEL UP! You reached Level ${this.player.level}!`);
    }
  }

  private updateXpOrbs(dt: number) {
    if (this.xpStreakResetTimer > 0) {
      this.xpStreakResetTimer -= dt;
      if (this.xpStreakResetTimer <= 0) {
        this.xpChimeStreak = 0;
      }
    }

    const playerTarget = new THREE.Vector3(
      this.player.pos.x,
      this.player.pos.y + 0.8,
      this.player.pos.z,
    );

    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      const orb = this.xpOrbs[i];
      orb.age += dt;

      // Spin & pulse color
      orb.mesh.rotation.x += dt * 3.5;
      orb.mesh.rotation.y += dt * 4.2;
      const hue = Math.sin(orb.age * 8) > 0 ? 0x88ff20 : 0xd4ff20;
      (orb.mesh.material as THREE.MeshBasicMaterial).color.setHex(hue);

      const dist = orb.pos.distanceTo(playerTarget);

      // Magnetize towards player if within 6 blocks
      if (dist < 6.0) {
        const pullDir = playerTarget.clone().sub(orb.pos).normalize();
        const pullSpeed = 9.0 * (1 - dist / 7.0);
        orb.vel.lerp(pullDir.multiplyScalar(pullSpeed), dt * 7.0);
      } else {
        // Gravity & drag
        orb.vel.y -= 12.0 * dt;
        orb.vel.x *= 0.94;
        orb.vel.z *= 0.94;
      }

      orb.pos.addScaledVector(orb.vel, dt);
      orb.mesh.position.copy(orb.pos);

      // Pickup condition
      if (dist < 0.75) {
        this.addXp(orb.value);
        this.audio.xpChime(this.xpChimeStreak++);
        this.xpStreakResetTimer = 1.2;

        this.scene.remove(orb.mesh);
        orb.mesh.geometry.dispose();
        (orb.mesh.material as THREE.Material).dispose();
        this.xpOrbs.splice(i, 1);
        continue;
      }

      // Despawn if older than 5 minutes
      if (orb.age > 300) {
        this.scene.remove(orb.mesh);
        orb.mesh.geometry.dispose();
        (orb.mesh.material as THREE.Material).dispose();
        this.xpOrbs.splice(i, 1);
      }
    }
  }

  // --------------------------------------------------------------------------
  // ARMOR & DEFENSE
  // --------------------------------------------------------------------------
  getArmorPoints(): number {
    let total = 0;
    const a = this.player.armor;
    if (!a) return 0;
    if (a.head) total += ITEMS[a.head]?.armor?.defense || 0;
    if (a.chest) total += ITEMS[a.chest]?.armor?.defense || 0;
    if (a.legs) total += ITEMS[a.legs]?.armor?.defense || 0;
    if (a.feet) total += ITEMS[a.feet]?.armor?.defense || 0;
    return Math.min(20, total);
  }

  equipArmor(item: ItemId): boolean {
    const def = ITEMS[item];
    if (!def || !def.armor) return false;
    const slot = def.armor.slot;
    const old = this.player.armor[slot];

    this.consumeItem(item, 1);
    this.player.armor[slot] = item;
    if (old) {
      this.addItem(old, 1);
    }
    this.audio.armorEquip();
    return true;
  }

  unequipArmor(slot: "head" | "chest" | "legs" | "feet") {
    const item = this.player.armor[slot];
    if (!item) return;
    this.player.armor[slot] = null;
    this.addItem(item, 1);
    this.audio.armorEquip();
  }

  // --------------------------------------------------------------------------
  // CHEST & FURNACE DATA HELPERS
  // --------------------------------------------------------------------------
  getChestSlots(posKey: string): Array<{ item: ItemId; count: number } | null> {
    if (!this.save.chests) this.save.chests = {};
    if (!this.save.chests[posKey]) {
      this.save.chests[posKey] = Array(27).fill(null);
    }
    return this.save.chests[posKey];
  }

  setChestSlots(posKey: string, slots: Array<{ item: ItemId; count: number } | null>) {
    if (!this.save.chests) this.save.chests = {};
    this.save.chests[posKey] = slots;
  }

  getFurnaceData(posKey: string): FurnaceData {
    if (!this.save.furnaces) this.save.furnaces = {};
    if (!this.save.furnaces[posKey]) {
      this.save.furnaces[posKey] = {
        input: null,
        fuel: null,
        output: null,
        burnTime: 0,
        maxBurnTime: 0,
        cookProgress: 0,
      };
    }
    return this.save.furnaces[posKey];
  }

  setFurnaceData(posKey: string, data: FurnaceData) {
    if (!this.save.furnaces) this.save.furnaces = {};
    this.save.furnaces[posKey] = data;
  }

  private updateFurnaces(dt: number) {
    if (!this.save.furnaces) return;
    for (const [posKey, furnace] of Object.entries(this.save.furnaces)) {
      if (!furnace) continue;

      // 1. Burn fuel
      if (furnace.burnTime > 0) {
        furnace.burnTime = Math.max(0, furnace.burnTime - dt);
      }

      // 2. Can smelt?
      const recipe = furnace.input
        ? SMELTING_RECIPES.find((r) => r.input === furnace.input!.item)
        : null;

      const canAcceptOutput =
        recipe &&
        (!furnace.output ||
          (furnace.output.item === recipe.output && furnace.output.count < 64));

      // 3. Needs fuel and has fuel?
      if (furnace.burnTime <= 0 && canAcceptOutput && furnace.fuel && furnace.fuel.count > 0) {
        const fuelDuration = getFuelBurnTime(furnace.fuel.item);
        if (fuelDuration > 0) {
          furnace.burnTime = fuelDuration;
          furnace.maxBurnTime = fuelDuration;
          furnace.fuel.count -= 1;
          if (furnace.fuel.count <= 0) furnace.fuel = null;
        }
      }

      // 4. Cook item if burning and valid
      if (furnace.burnTime > 0 && canAcceptOutput && recipe) {
        furnace.cookProgress += dt / 6.0; // 6 seconds per item
        if (Math.random() < 0.04) this.audio.furnaceCrackle();

        if (furnace.cookProgress >= 1.0) {
          furnace.cookProgress = 0;
          furnace.input!.count -= 1;
          if (furnace.input!.count <= 0) furnace.input = null;

          if (!furnace.output) {
            furnace.output = { item: recipe.output, count: 1 };
          } else {
            furnace.output.count += 1;
          }

          // Spawn XP at furnace position
          const [fx, fy, fz] = posKey.split(",").map(Number);
          if (!isNaN(fx)) {
            this.spawnXpOrbs(fx + 0.5, fy + 0.5, fz + 0.5, Math.ceil(recipe.xp));
          }
        }
      } else if (!canAcceptOutput) {
        furnace.cookProgress = 0;
      }
    }
  }

  // --------------------------------------------------------------------------
  // CHUNK MANAGEMENT
  // --------------------------------------------------------------------------
  private updateLoadedChunks(_forceImmediate = false) {
    const pcx = chunkCoord(this.player.pos.x);
    const pcz = chunkCoord(this.player.pos.z);
    const radius = this.settings.renderDistance;

    const neededKeys = new Set<string>();

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = chunkKey(cx, cz);
        neededKeys.add(key);

        if (!this.chunkMeshes.has(key) || this.dirtyChunks.has(key)) {
          this.world.ensureChunk(cx, cz);
          this.buildAndAttachChunkMesh(cx, cz);
          this.dirtyChunks.delete(key);
        }
      }
    }

    // Unload chunks far away
    for (const [key, record] of this.chunkMeshes) {
      if (!neededKeys.has(key)) {
        if (record.opaqueMesh) {
          this.scene.remove(record.opaqueMesh);
          record.opaqueMesh.geometry.dispose();
        }
        if (record.waterMesh) {
          this.scene.remove(record.waterMesh);
          record.waterMesh.geometry.dispose();
        }
        this.chunkMeshes.delete(key);
      }
    }
  }

  private buildAndAttachChunkMesh(cx: number, cz: number) {
    const key = chunkKey(cx, cz);
    const existing = this.chunkMeshes.get(key);
    if (existing) {
      if (existing.opaqueMesh) {
        this.scene.remove(existing.opaqueMesh);
        existing.opaqueMesh.geometry.dispose();
      }
      if (existing.waterMesh) {
        this.scene.remove(existing.waterMesh);
        existing.waterMesh.geometry.dispose();
      }
    }

    const { opaque, water } = buildChunkGeometries(this.world, this.atlas.tiles, cx, cz);

    let opaqueMesh: THREE.Mesh | undefined;
    if (opaque && opaque.getAttribute("position") && opaque.getAttribute("position").count > 0) {
      opaqueMesh = new THREE.Mesh(opaque, this.atlas.opaqueMaterial);
      opaqueMesh.castShadow = this.settings.shadows;
      opaqueMesh.receiveShadow = this.settings.shadows;
      this.scene.add(opaqueMesh);
    }

    let waterMesh: THREE.Mesh | undefined;
    if (water && water.getAttribute("position") && water.getAttribute("position").count > 0) {
      waterMesh = new THREE.Mesh(water, this.atlas.waterMaterial);
      this.scene.add(waterMesh);
    }

    this.chunkMeshes.set(key, { opaqueMesh, waterMesh });
  }

  markBlockDirty(wx: number, wyOrWz: number, maybeWz?: number) {
    const wz = typeof maybeWz === "number" ? maybeWz : wyOrWz;
    const cx = chunkCoord(wx);
    const cz = chunkCoord(wz);
    this.dirtyChunks.add(chunkKey(cx, cz));

    // Also mark neighbor chunks if on border
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    if (lx === 0) this.dirtyChunks.add(chunkKey(cx - 1, cz));
    if (lx === CHUNK_SIZE - 1) this.dirtyChunks.add(chunkKey(cx + 1, cz));
    if (lz === 0) this.dirtyChunks.add(chunkKey(cx, cz - 1));
    if (lz === CHUNK_SIZE - 1) this.dirtyChunks.add(chunkKey(cx, cz + 1));
  }

  // --------------------------------------------------------------------------
  // INPUTS & CONTROLS
  // --------------------------------------------------------------------------
  private setupInputs() {
    const dom = this.container;

    const onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.code] = true;

      // Number keys 1..9 for hotbar selection
      if (e.key >= "1" && e.key <= "9") {
        const slot = parseInt(e.key, 10) - 1;
        this.selectSlot(slot);
        return;
      }

      // 'E' for inventory / crafting modal
      if (e.code === "KeyE") {
        if (this.isPointerLocked) document.exitPointerLock();
        this.callbacks.onOpenCrafting(false);
        return;
      }

      // F3 Debug toggle
      if (e.code === "F3" || (e.code === "KeyF" && e.altKey)) {
        e.preventDefault();
        this.isF3Open = !this.isF3Open;
        return;
      }

      // F5 Third-Person Camera Toggle
      if (e.code === "F5") {
        e.preventDefault();
        this.toggleCameraMode();
        return;
      }

      // 'T' or '/' for In-Game Chat Console
      if ((e.code === "KeyT" || e.code === "Slash") && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (this.isPointerLocked) document.exitPointerLock();
        this.callbacks.onOpenChat?.(e.code === "Slash" ? "/" : "");
        return;
      }

      // Space double-tap in creative mode: toggle flying
      if (e.code === "Space" && this.save.gameMode === "creative") {
        const now = performance.now();
        if (now - this.lastSpacePress < 300) {
          this.player.flying = !this.player.flying;
          this.player.vel.y = 0;
        }
        this.lastSpacePress = now;
      }

      // 'F' key toggle flying in creative
      if (e.code === "KeyF" && this.save.gameMode === "creative" && !e.altKey) {
        this.player.flying = !this.player.flying;
        this.player.vel.y = 0;
      }

      // Double-tap W: toggle sprinting
      if (e.code === "KeyW") {
        const now = performance.now();
        if (now - this.lastWPress < 280) {
          this.player.sprinting = true;
        }
        this.lastWPress = now;
      }

      if (e.code === "ControlLeft" || e.code === "ControlRight") {
        this.player.sprinting = true;
      }

      // Escape key handles pause
      if (e.code === "Escape") {
        if (this.isPointerLocked) {
          document.exitPointerLock();
        } else {
          this.callbacks.onPauseRequest();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
      if (e.code === "KeyW" && !this.keys["KeyW"]) {
        this.player.sprinting = false;
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      this.audio.unlock();

      if (!this.isPointerLocked) {
        if (!this.isPaused && !this.isDead) {
          try {
            const p = dom.requestPointerLock() as unknown as Promise<void> | undefined;
            if (p && typeof p.catch === "function") p.catch(() => {});
          } catch {
            /* ignore pointerlock rejection */
          }
        }
        return;
      }

      if (e.button === 0) {
        // Left click: first check if melee attacking a mob
        const rayOrigin = this.camera.position.clone();
        const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        const held = this.getHeldItem();
        const heldDef = held ? ITEMS[held.item] : null;
        const attackDmg = heldDef?.attackDamage ?? heldDef?.tool?.attackDamage ?? 1;

        const hitMob = this.mobManager.attackRaycast(
          rayOrigin,
          rayDir,
          attackDmg,
          (drops, pos, xp) => {
            drops.forEach((d) => this.addItem(d.item, d.count));
            if (pos && xp) this.spawnXpOrbs(pos.x, pos.y, pos.z, xp);
          },
        );

        if (hitMob) {
          this.swingAnim = 0.65;
          return;
        }

        // Otherwise start mining block
        this.isMining = true;
        this.mineHitTimer = 0;
      } else if (e.button === 2) {
        // Right click: interact / place
        e.preventDefault();
        this.handleRightClick();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        this.isMining = false;
        this.mineProgress = 0;
        this.crackMesh.visible = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isPointerLocked) return;

      const sens = 0.0022;
      this.player.yaw -= e.movementX * sens;
      this.player.pitch -= e.movementY * sens;
      const maxPitch = Math.PI / 2 - 0.02;
      this.player.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.player.pitch));
    };

    const onWheel = (e: WheelEvent) => {
      if (!this.isPointerLocked) return;
      const dir = Math.sign(e.deltaY);
      let next = this.player.selectedSlot + dir;
      if (next < 0) next = 8;
      if (next > 8) next = 0;
      this.selectSlot(next);
    };

    const onPointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === dom;
      if (!this.isPointerLocked && !this.isDead && !this.isPaused) {
        // Don't auto pause if closing modal, but signal unlock
      }
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    const onResize = () => {
      if (this.isDisposed) return;
      const w = dom.clientWidth;
      const h = dom.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    dom.addEventListener("wheel", onWheel, { passive: true });
    document.addEventListener("pointerlockchange", onPointerLockChange);
    dom.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("resize", onResize);

    this.disposeListeners = () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      dom.removeEventListener("wheel", onWheel);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      dom.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("resize", onResize);
    };
  }

  private disposeListeners: () => void = () => {};

  selectSlot(index: number) {
    if (index >= 0 && index < 9) {
      this.player.selectedSlot = index;
      this.audio.ui();
      this.rebuildViewmodel();
    }
  }

  toggleCameraMode() {
    if (this.cameraMode === "first_person") {
      this.cameraMode = "third_person_back";
      this.callbacks.onNotification?.("Camera: Third Person (Back)");
    } else if (this.cameraMode === "third_person_back") {
      this.cameraMode = "third_person_front";
      this.callbacks.onNotification?.("Camera: Third Person (Front)");
    } else {
      this.cameraMode = "first_person";
      this.callbacks.onNotification?.("Camera: First Person");
    }
    this.audio.cameraSwitch();
  }

  executeCommand(raw: string): { success: boolean; message: string } {
    const trimmed = raw.trim();
    if (!trimmed) return { success: false, message: "" };

    if (!trimmed.startsWith("/")) {
      const msg = `<Steve> ${trimmed}`;
      this.callbacks.onChatMessage?.({
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: msg,
        type: "chat",
      });
      this.audio.chatPop();
      return { success: true, message: msg };
    }

    const parts = trimmed.slice(1).split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    this.audio.chatPop();

    switch (cmd) {
      case "help":
      case "?": {
        const helpLines = [
          "--- Available Commands ---",
          "/gamemode <survival|creative> - Change game mode",
          "/time set <day|noon|night|midnight> - Set time of day",
          "/weather <clear|rain|thunder> - Set atmospheric weather",
          "/tp <x> <y> <z> - Teleport coordinates",
          "/give <item_id> [count] - Add items to inventory",
          "/heal - Full health & hunger recovery",
          "/kill - Slay the player",
          "/seed - Display world seed",
          "/clear - Clear inventory",
          "/xp <add|set> <amount> - Modify player XP or level",
        ];
        helpLines.forEach((line) => {
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: line,
            type: "system",
          });
        });
        return { success: true, message: helpLines.join("\n") };
      }

      case "gamemode": {
        const modeArg = args[0]?.toLowerCase();
        let mode: GameModeId = "survival";
        if (modeArg === "creative" || modeArg === "1" || modeArg === "c") mode = "creative";
        else if (modeArg === "survival" || modeArg === "0" || modeArg === "s") mode = "survival";
        else {
          const err = "Usage: /gamemode <survival|creative>";
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: err,
            type: "error",
          });
          return { success: false, message: err };
        }
        this.save.gameMode = mode;
        if (mode === "creative") {
          this.player.health = 20;
          this.player.hunger = 20;
        } else {
          this.player.flying = false;
        }
        const msg = `Set game mode to ${mode.toUpperCase()} Mode`;
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: msg,
          type: "command",
        });
        this.callbacks.onNotification?.(msg);
        return { success: true, message: msg };
      }

      case "time": {
        if (args[0]?.toLowerCase() === "set") {
          const val = args[1]?.toLowerCase();
          let ticks = 6000;
          if (val === "day") ticks = 1000;
          else if (val === "noon") ticks = 6000;
          else if (val === "sunset" || val === "dusk") ticks = 12000;
          else if (val === "night") ticks = 13500;
          else if (val === "midnight") ticks = 18000;
          else if (!isNaN(Number(val))) ticks = parseInt(val, 10);
          else {
            const err = "Usage: /time set <day|noon|night|midnight|<ticks>>";
            this.callbacks.onChatMessage?.({
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              text: err,
              type: "error",
            });
            return { success: false, message: err };
          }
          this.save.dayTime = ticks % 24000;
          const msg = `Set the time to ${ticks}`;
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: msg,
            type: "command",
          });
          this.callbacks.onNotification?.(msg);
          return { success: true, message: msg };
        }
        const err = "Usage: /time set <day|noon|night|midnight|<ticks>>";
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: err,
          type: "error",
        });
        return { success: false, message: err };
      }

      case "weather": {
        const type = args[0]?.toLowerCase();
        if (type === "clear" || type === "rain" || type === "thunder") {
          this.setWeather(type);
          const msg = `Set the weather to ${type}`;
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: msg,
            type: "command",
          });
          this.callbacks.onNotification?.(msg);
          return { success: true, message: msg };
        }
        const err = "Usage: /weather <clear|rain|thunder>";
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: err,
          type: "error",
        });
        return { success: false, message: err };
      }

      case "tp":
      case "teleport": {
        if (args.length < 3) {
          const err = "Usage: /tp <x> <y> <z>";
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: err,
            type: "error",
          });
          return { success: false, message: err };
        }
        const tx = parseFloat(args[0]);
        const ty = parseFloat(args[1]);
        const tz = parseFloat(args[2]);
        if (isNaN(tx) || isNaN(ty) || isNaN(tz)) {
          const err = "Invalid coordinates.";
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: err,
            type: "error",
          });
          return { success: false, message: err };
        }
        this.player.pos.set(tx, ty, tz);
        this.player.vel.set(0, 0, 0);
        this.updateLoadedChunks(true);
        const msg = `Teleported Steve to ${tx.toFixed(1)}, ${ty.toFixed(1)}, ${tz.toFixed(1)}`;
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: msg,
          type: "command",
        });
        this.callbacks.onNotification?.(msg);
        return { success: true, message: msg };
      }

      case "give": {
        const itemId = args[0] as ItemId;
        const count = args[1] ? Math.max(1, parseInt(args[1], 10)) : 1;
        if (!ITEMS[itemId]) {
          const err = `Unknown item '${args[0]}'. See /help or creative catalog.`;
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: err,
            type: "error",
          });
          return { success: false, message: err };
        }
        this.addItem(itemId, count);
        const msg = `Gave ${count} [${ITEMS[itemId].name}] to Steve`;
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: msg,
          type: "command",
        });
        this.callbacks.onNotification?.(msg);
        return { success: true, message: msg };
      }

      case "heal": {
        this.player.health = 20;
        this.player.hunger = 20;
        this.player.saturation = 20;
        const msg = "Healed Steve to full health and hunger!";
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: msg,
          type: "command",
        });
        this.callbacks.onNotification?.(msg);
        return { success: true, message: msg };
      }

      case "kill": {
        this.player.health = 0;
        this.isDead = true;
        this.audio.hurt();
        this.callbacks.onDeath();
        const msg = "Steve fell out of the world.";
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: msg,
          type: "system",
        });
        return { success: true, message: msg };
      }

      case "seed": {
        const msg = `World Seed: ${this.save.seed}`;
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: msg,
          type: "system",
        });
        return { success: true, message: msg };
      }

      case "clear": {
        this.player.inventory = {};
        this.player.hotbar = Array(9).fill(null);
        this.rebuildViewmodel();
        const msg = "Cleared player inventory and hotbar.";
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: msg,
          type: "command",
        });
        return { success: true, message: msg };
      }

      case "xp": {
        const sub = args[0]?.toLowerCase();
        const amt = parseInt(args[1], 10);
        if (isNaN(amt)) {
          const err = "Usage: /xp <add|set> <amount>";
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: err,
            type: "error",
          });
          return { success: false, message: err };
        }
        if (sub === "add") {
          this.addXp(amt);
          const msg = `Added ${amt} XP to player.`;
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: msg,
            type: "command",
          });
          return { success: true, message: msg };
        } else if (sub === "set") {
          this.player.level = Math.max(0, amt);
          this.player.xp = 0;
          const msg = `Set player level to ${amt}.`;
          this.callbacks.onChatMessage?.({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: msg,
            type: "command",
          });
          return { success: true, message: msg };
        }
        const err = "Usage: /xp <add|set> <amount>";
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: err,
          type: "error",
        });
        return { success: false, message: err };
      }

      default: {
        const err = `Unknown command: /${cmd}. Type /help for available commands.`;
        this.callbacks.onChatMessage?.({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: err,
          type: "error",
        });
        return { success: false, message: err };
      }
    }
  }

  // --------------------------------------------------------------------------
  // FIRST-PERSON VIEWMODEL
  // --------------------------------------------------------------------------
  rebuildViewmodel() {
    if (this.heldItemMesh) {
      this.viewmodelGroup.remove(this.heldItemMesh);
      this.heldItemMesh = null;
    }

    const held = this.getHeldItem();
    const group = new THREE.Group();

    if (!held) {
      // Empty Hand
      const armGeo = new THREE.BoxGeometry(0.14, 0.44, 0.14);
      const armMat = new THREE.MeshLambertMaterial({ color: 0xc8926b });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(0.28, -0.26, -0.42);
      arm.rotation.set(-0.25, -0.2, 0.1);
      group.add(arm);
    } else {
      const def = ITEMS[held.item];
      if (def?.category === "tool" && def.tool) {
        // 3D Tool Model (Pickaxe / Axe / Shovel)
        const toolGroup = new THREE.Group();

        // Wooden handle
        const handleGeo = new THREE.BoxGeometry(0.035, 0.44, 0.035);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x825329 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, -0.04, 0);
        toolGroup.add(handle);

        if (def.tool.kind === "pickaxe") {
          // Central crosshead
          const headCenter = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.055, 0.045),
            new THREE.MeshLambertMaterial({ color: def.tool.headColor })
          );
          headCenter.position.set(0, 0.17, 0);
          toolGroup.add(headCenter);

          // Left curved tip
          const leftTip = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.05, 0.04),
            new THREE.MeshLambertMaterial({ color: def.tool.tipColor })
          );
          leftTip.position.set(-0.075, 0.155, 0);
          leftTip.rotation.z = 0.28;
          toolGroup.add(leftTip);

          // Right curved tip
          const rightTip = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.05, 0.04),
            new THREE.MeshLambertMaterial({ color: def.tool.tipColor })
          );
          rightTip.position.set(0.075, 0.155, 0);
          rightTip.rotation.z = -0.28;
          toolGroup.add(rightTip);
        } else if (def.tool.kind === "sword") {
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.065, 0.42, 0.025),
            new THREE.MeshLambertMaterial({ color: def.tool.headColor })
          );
          blade.position.set(0, 0.22, 0);
          toolGroup.add(blade);

          const tip = new THREE.Mesh(
            new THREE.BoxGeometry(0.075, 0.06, 0.03),
            new THREE.MeshLambertMaterial({ color: def.tool.tipColor })
          );
          tip.position.set(0, 0.44, 0);
          toolGroup.add(tip);

          const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.045, 0.045),
            new THREE.MeshLambertMaterial({ color: 0x5a3d24 })
          );
          guard.position.set(0, 0.02, 0);
          toolGroup.add(guard);

          const pommel = new THREE.Mesh(
            new THREE.BoxGeometry(0.055, 0.05, 0.05),
            new THREE.MeshLambertMaterial({ color: def.tool.headColor })
          );
          pommel.position.set(0, -0.24, 0);
          toolGroup.add(pommel);
        } else if (def.tool.kind === "bow") {
          const bowCurved = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.46, 0.06),
            new THREE.MeshLambertMaterial({ color: 0x6e451f })
          );
          bowCurved.position.set(0, 0.05, 0);
          toolGroup.add(bowCurved);

          const stringMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.48, 0.015),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
          );
          stringMesh.position.set(0, 0.05, -0.06);
          toolGroup.add(stringMesh);
        } else if (def.tool.kind === "hoe") {
          const hoeHead = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.05, 0.04),
            new THREE.MeshLambertMaterial({ color: def.tool.headColor })
          );
          hoeHead.position.set(0.04, 0.18, 0);
          toolGroup.add(hoeHead);
        } else if (def.tool.kind === "axe") {
          const axeHead = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.15, 0.045),
            new THREE.MeshLambertMaterial({ color: def.tool.headColor })
          );
          axeHead.position.set(0.05, 0.16, 0);
          toolGroup.add(axeHead);
        } else {
          const shovelHead = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.16, 0.035),
            new THREE.MeshLambertMaterial({ color: def.tool.headColor })
          );
          shovelHead.position.set(0, 0.17, 0);
          toolGroup.add(shovelHead);
        }

        toolGroup.position.set(0.32, -0.26, -0.46);
        toolGroup.rotation.set(0.2, -0.6, -0.35);
        group.add(toolGroup);
      } else if (def?.blockId !== undefined) {
        if (def.blockId === BLOCK.TORCH) {
          // 3D Torch
          const torchGroup = new THREE.Group();
          const stickGeo = new THREE.BoxGeometry(0.04, 0.28, 0.04);
          const stickMat = new THREE.MeshLambertMaterial({ color: 0x7a4e28 });
          const stick = new THREE.Mesh(stickGeo, stickMat);
          torchGroup.add(stick);

          const flameGeo = new THREE.BoxGeometry(0.06, 0.07, 0.06);
          const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb84d });
          const flame = new THREE.Mesh(flameGeo, flameMat);
          flame.position.set(0, 0.14, 0);
          torchGroup.add(flame);

          torchGroup.position.set(0.28, -0.2, -0.38);
          torchGroup.rotation.set(0.1, -0.3, 0.15);
          group.add(torchGroup);
        } else {
          // Mini 3D Block Cube
          const cubeGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
          const cubeMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(def.color || "#888888"),
          });
          const cube = new THREE.Mesh(cubeGeo, cubeMat);
          cube.position.set(0.29, -0.23, -0.42);
          cube.rotation.set(0.2, -0.5, 0.15);
          group.add(cube);
        }
      } else if (def?.food) {
        // 3D Food Item
        const foodGroup = new THREE.Group();
        if (held.item === "apple") {
          const apple = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.MeshLambertMaterial({ color: 0xd92626 }));
          foodGroup.add(apple);
          const stem = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), new THREE.MeshLambertMaterial({ color: 0x5a3d24 }));
          stem.position.set(0, 0.09, 0);
          foodGroup.add(stem);
        } else if (held.item === "bread") {
          const bread = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.13), new THREE.MeshLambertMaterial({ color: 0xba7c38 }));
          foodGroup.add(bread);
        } else {
          const meat = new THREE.Mesh(
            new THREE.BoxGeometry(0.19, 0.07, 0.14),
            new THREE.MeshLambertMaterial({ color: new THREE.Color(def.color || "#993333") })
          );
          foodGroup.add(meat);
        }
        foodGroup.position.set(0.28, -0.22, -0.38);
        foodGroup.rotation.set(0.2, -0.4, 0.2);
        group.add(foodGroup);
      } else {
        // Material Item (Coal, Diamond, Ingot)
        const itemGeo = new THREE.BoxGeometry(0.14, 0.14, 0.04);
        const itemMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(def?.color || 0xdddddd) });
        const mesh = new THREE.Mesh(itemGeo, itemMat);
        mesh.position.set(0.28, -0.22, -0.38);
        mesh.rotation.set(0.3, -0.4, 0.2);
        group.add(mesh);
      }
    }

    this.heldItemMesh = group;
    this.viewmodelGroup.add(this.heldItemMesh);
  }

  // --------------------------------------------------------------------------
  // RAYCASTING & BLOCK TARGETING
  // --------------------------------------------------------------------------
  private updateTargeting() {
    const eyeY = this.player.pos.y + 1.62;
    const rayOrigin = this.cameraMode === "first_person"
      ? this.camera.position.clone()
      : new THREE.Vector3(this.player.pos.x, eyeY, this.player.pos.z);

    const rayDir = this.cameraMode === "first_person"
      ? new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize()
      : new THREE.Vector3(
          -Math.sin(this.player.yaw) * Math.cos(this.player.pitch),
          Math.sin(this.player.pitch),
          -Math.cos(this.player.yaw) * Math.cos(this.player.pitch),
        ).normalize();

    const maxDist = 5.2;
    const step = 0.04;
    let dist = 0;
    const current = rayOrigin.clone();

    let hit: { x: number; y: number; z: number; block: BlockNum } | null = null;
    let prevBlockX = Math.floor(current.x);
    let prevBlockY = Math.floor(current.y);
    let prevBlockZ = Math.floor(current.z);

    while (dist < maxDist) {
      current.addScaledVector(rayDir, step);
      dist += step;

      const bx = Math.floor(current.x);
      const by = Math.floor(current.y);
      const bz = Math.floor(current.z);

      if (bx !== prevBlockX || by !== prevBlockY || bz !== prevBlockZ) {
        const b = this.world.getBlock(bx, by, bz);
        if (b !== BLOCK.AIR && b !== BLOCK.WATER) {
          hit = { x: bx, y: by, z: bz, block: b };
          // Calculate normal from difference
          this.targetNormal.set(prevBlockX - bx, prevBlockY - by, prevBlockZ - bz);
          break;
        }
        prevBlockX = bx;
        prevBlockY = by;
        prevBlockZ = bz;
      }
    }

    if (hit) {
      this.targetBlock = hit;
      this.highlightBox.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      this.highlightBox.visible = true;

      this.crackMesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    } else {
      this.targetBlock = null;
      this.highlightBox.visible = false;
      this.crackMesh.visible = false;
      this.mineProgress = 0;
    }
  }

  // --------------------------------------------------------------------------
  // MINING & BREAKING
  // --------------------------------------------------------------------------
  private updateMining(dt: number) {
    if (!this.isMining || !this.targetBlock) {
      this.mineProgress = 0;
      this.crackMesh.visible = false;
      return;
    }

    const { x, y, z, block } = this.targetBlock;
    const def = BLOCK_DEFS[block];
    if (!def || def.unbreakable) {
      this.mineProgress = 0;
      this.crackMesh.visible = false;
      return;
    }

    // Creative mode: instant break
    if (this.save.gameMode === "creative") {
      this.breakTargetBlock(x, y, z, block);
      this.isMining = false;
      return;
    }

    // Tool speed multiplier
    const held = this.getHeldItem();
    let speed = 1.0;
    if (held) {
      const itemDef = ITEMS[held.item];
      if (itemDef?.tool) {
        if (itemDef.tool.kind === def.preferredTool) {
          speed = itemDef.tool.speed;
        } else {
          speed = 1.2;
        }
      }
    }

    // In water penalty if not on ground
    if (this.player.headInWater && !this.player.onGround) {
      speed *= 0.5;
    }

    const breakTime = Math.max(0.12, def.hardness / speed);
    this.mineProgress += dt / breakTime;

    // Play hit sound periodically
    this.mineHitTimer += dt;
    if (this.mineHitTimer > 0.24) {
      this.mineHitTimer = 0;
      this.audio.hitBlock(def.sound);
      this.spawnBlockShards(x, y, z, def.shards, 3);
    }

    // Update crack stages (0, 1, 2)
    const stage = Math.min(2, Math.floor(this.mineProgress * 3));
    this.crackMesh.material = this.atlas.crackMaterials[stage];
    this.crackMesh.visible = true;

    // Swing arm
    this.swingAnim = Math.sin(this.mineProgress * Math.PI * 8) * 0.45;

    if (this.mineProgress >= 1.0) {
      this.breakTargetBlock(x, y, z, block);
      this.mineProgress = 0;
      this.crackMesh.visible = false;
    }
  }

  private breakTargetBlock(x: number, y: number, z: number, block: BlockNum) {
    const def = BLOCK_DEFS[block];
    this.audio.breakBlock(def.sound);
    this.spawnBlockShards(x, y, z, def.shards, 16);

    // Remove block
    this.world.setBlock(x, y, z, BLOCK.AIR);
    this.markBlockDirty(x, y, z);
    this.activeCrops.delete(`${x},${y},${z}`);

    // Give drop in survival mode
    if (this.save.gameMode === "survival") {
      if (block === BLOCK.WHEAT_3) {
        this.addItem("wheat", 1);
        this.addItem("seeds", 1 + Math.floor(Math.random() * 3));
        this.spawnXpOrbs(x + 0.5, y + 0.5, z + 0.5, 1);
      } else if (def.drop) {
        this.addItem(def.drop, 1);
      }
      if (block === BLOCK.COAL_ORE) this.spawnXpOrbs(x + 0.5, y + 0.5, z + 0.5, 1);
      else if (block === BLOCK.IRON_ORE) this.spawnXpOrbs(x + 0.5, y + 0.5, z + 0.5, 2);
      else if (block === BLOCK.GOLD_ORE) this.spawnXpOrbs(x + 0.5, y + 0.5, z + 0.5, 3);
      else if (block === BLOCK.DIAMOND_ORE) this.spawnXpOrbs(x + 0.5, y + 0.5, z + 0.5, 5);
      else if (block === BLOCK.REDSTONE_ORE) this.spawnXpOrbs(x + 0.5, y + 0.5, z + 0.5, 4);
    }

    // Recheck targeting
    this.updateTargeting();
  }

  // --------------------------------------------------------------------------
  // RIGHT CLICK / PLACEMENT / INTERACTION
  // --------------------------------------------------------------------------
  private handleRightClick() {
    const held = this.getHeldItem();
    const heldDef = held ? ITEMS[held.item] : null;

    // 1) Bow Shooting
    if (held?.item === "bow") {
      const hasArrow = this.save.gameMode === "creative" || this.hasItem("arrow");
      if (hasArrow) {
        if (this.save.gameMode === "survival") {
          this.consumeItem("arrow", 1);
        }
        const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        const origin = this.camera.position.clone().add(rayDir.clone().multiplyScalar(0.4));
        this.mobManager.shootArrow(origin, rayDir, "player");
        this.audio.bowShoot();
        this.swingAnim = 0.55;
        return;
      }
    }

    // 2) Food consumption
    if (heldDef?.food) {
      if (this.player.hunger < 20 || heldDef.food.alwaysEdible) {
        this.player.hunger = Math.min(20, this.player.hunger + heldDef.food.nutrition);
        this.player.saturation = Math.min(20, this.player.saturation + heldDef.food.saturation);
        this.audio.eatChomp();
        this.swingAnim = 0.55;
        if (this.save.gameMode === "survival") {
          this.consumeHeldItem(1);
        }
        return;
      }
    }

    // 2.5) Armor Equipping from hotbar
    if (heldDef?.armor) {
      if (this.equipArmor(heldDef.id)) {
        this.swingAnim = 0.45;
        return;
      }
    }

    if (!this.targetBlock) return;
    const { x, y, z, block } = this.targetBlock;

    // 3) Workstation check: Crafting Table opens crafting UI
    if (block === BLOCK.CRAFTING_TABLE) {
      if (this.isPointerLocked) document.exitPointerLock();
      this.callbacks.onOpenCrafting(true);
      return;
    }

    // 4) Chest check: opens Chest modal
    if (block === BLOCK.CHEST) {
      if (this.isPointerLocked) document.exitPointerLock();
      this.audio.chestToggle(true);
      this.callbacks.onOpenChest?.(`${x},${y},${z}`);
      return;
    }

    // 5) Furnace check: opens Furnace modal
    if (block === BLOCK.FURNACE) {
      if (this.isPointerLocked) document.exitPointerLock();
      this.callbacks.onOpenFurnace?.(`${x},${y},${z}`);
      return;
    }

    // 6) Bed check: sleep through the night
    if (block === BLOCK.BED) {
      const isNight = this.save.dayTime > 12500 && this.save.dayTime < 23500;
      if (isNight) {
        this.audio.sleepChime();
        this.save.dayTime = 0; // Morning sunrise!
        this.save.player.spawnPos = [x, y + 1, z];
        this.callbacks.onNotification?.("You slept through the night. Respawn point set!");
      } else {
        this.callbacks.onNotification?.("You can only sleep at night!");
      }
      return;
    }

    // 7) Door toggle
    if (block === BLOCK.WOOD_DOOR) {
      this.audio.doorToggle(true);
      this.swingAnim = 0.5;
      return;
    }

    // 7.5) Lever toggle
    if (block === BLOCK.LEVER) {
      this.toggleLever(x, y, z);
      return;
    }

    // 8) Hoe tilling on Grass or Dirt -> Farmland
    if (heldDef?.tool?.kind === "hoe" && (block === BLOCK.GRASS || block === BLOCK.DIRT)) {
      this.world.setBlock(x, y, z, BLOCK.FARMLAND);
      this.markBlockDirty(x, y, z);
      this.audio.place("grass");
      this.swingAnim = 0.55;
      return;
    }

    // 9) Seeds on Farmland
    if (held?.item === "seeds" && (block === BLOCK.FARMLAND || block === BLOCK.FARMLAND_MOIST)) {
      if (this.world.getBlock(x, y + 1, z) === BLOCK.AIR) {
        this.world.setBlock(x, y + 1, z, BLOCK.WHEAT_0);
        this.markBlockDirty(x, y + 1, z);
        this.activeCrops.add(`${x},${y + 1},${z}`);
        this.audio.place("grass");
        if (this.save.gameMode === "survival") {
          this.consumeHeldItem(1);
        }
        this.swingAnim = 0.5;
        return;
      }
    }

    // 9.5) Bone Meal on Crops
    if (
      held?.item === "bone_meal" &&
      (block === BLOCK.WHEAT_0 || block === BLOCK.WHEAT_1 || block === BLOCK.WHEAT_2)
    ) {
      const nextCrop = (block === BLOCK.WHEAT_2 ? BLOCK.WHEAT_3 : block + 1) as BlockNum;
      this.world.setBlock(x, y, z, nextCrop);
      this.markBlockDirty(x, y, z);
      this.audio.boneMealSparkle();
      this.spawnSparkleParticles(x + 0.5, y + 0.5, z + 0.5);
      if (this.save.gameMode === "survival") {
        this.consumeHeldItem(1);
      }
      this.swingAnim = 0.5;
      return;
    }

    // 10) TNT check: right click ignites TNT
    if (block === BLOCK.TNT) {
      this.detonateTNT(x, y, z);
      return;
    }

    // 11) Block Placement
    if (!held) return;

    const itemDef = ITEMS[held.item];
    if (itemDef?.blockId === undefined) return;

    const placeBlockId = itemDef.blockId;
    const nx = this.targetNormal.x;
    const ny = this.targetNormal.y;
    const nz = this.targetNormal.z;
    const px = x + nx;
    const py = y + ny;
    const pz = z + nz;

    if (py < 0 || py >= WORLD_HEIGHT) return;

    // Ensure placement doesn't intersect player AABB (unless torch/wire/lever)
    const isPassableFixture =
      placeBlockId === BLOCK.TORCH ||
      placeBlockId === BLOCK.REDSTONE_WIRE ||
      placeBlockId === BLOCK.LEVER ||
      placeBlockId === BLOCK.REDSTONE_TORCH;

    if (!isPassableFixture) {
      const pBox = new THREE.Box3(
        new THREE.Vector3(this.player.pos.x - 0.3, this.player.pos.y, this.player.pos.z - 0.3),
        new THREE.Vector3(this.player.pos.x + 0.3, this.player.pos.y + 1.8, this.player.pos.z + 0.3),
      );
      const bBox = new THREE.Box3(new THREE.Vector3(px, py, pz), new THREE.Vector3(px + 1, py + 1, pz + 1));
      if (pBox.intersectsBox(bBox)) return;
    }

    // Place block
    this.world.setBlock(px, py, pz, placeBlockId);
    this.markBlockDirty(px, py, pz);

    const placeDef = BLOCK_DEFS[placeBlockId];
    this.audio.place(placeDef.sound);

    // Decrement item in survival mode
    if (this.save.gameMode === "survival") {
      this.consumeHeldItem(1);
    }

    // Swing arm
    this.swingAnim = 0.55;

    // Update targeting
    this.updateTargeting();
  }

  private detonateTNT(x: number, y: number, z: number) {
    this.world.setBlock(x, y, z, BLOCK.AIR);
    this.markBlockDirty(x, y, z);

    // Explosion after short fuse
    setTimeout(() => {
      this.audio.explode();
      const radius = 2.8;
      const rx = Math.ceil(radius);

      for (let dx = -rx; dx <= rx; dx++) {
        for (let dy = -rx; dy <= rx; dy++) {
          for (let dz = -rx; dz <= rx; dz++) {
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist <= radius) {
              const bx = x + dx;
              const by = y + dy;
              const bz = z + dz;
              const b = this.world.getBlock(bx, by, bz);
              if (b !== BLOCK.AIR && b !== BLOCK.BEDROCK) {
                const bDef = BLOCK_DEFS[b];
                this.spawnBlockShards(bx, by, bz, bDef.shards, 4);
                this.world.setBlock(bx, by, bz, BLOCK.AIR);
                this.markBlockDirty(bx, by, bz);
              }
            }
          }
        }
      }

      // Check player damage from explosion
      const playerDist = this.player.pos.distanceTo(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
      if (playerDist < 6.0) {
        const damage = Math.round((1 - playerDist / 6.0) * 14);
        this.applyDamage(damage);
        // Knockback
        const dir = this.player.pos.clone().sub(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5)).normalize();
        this.player.vel.addScaledVector(dir, 8.5);
      }
    }, 1200);
  }

  private toggleLever(x: number, y: number, z: number) {
    this.audio.leverToggle(true);
    this.swingAnim = 0.45;

    const neighbors = [
      [x + 1, y, z], [x - 1, y, z],
      [x, y + 1, z], [x, y - 1, z],
      [x, y, z + 1], [x, y, z - 1],
    ];

    let poweredAny = false;
    for (const [nx, ny, nz] of neighbors) {
      const nb = this.world.getBlock(nx, ny, nz);
      if (nb === BLOCK.REDSTONE_LAMP) {
        this.world.setBlock(nx, ny, nz, BLOCK.REDSTONE_LAMP_LIT);
        this.markBlockDirty(nx, ny, nz);
        poweredAny = true;
      } else if (nb === BLOCK.REDSTONE_LAMP_LIT) {
        this.world.setBlock(nx, ny, nz, BLOCK.REDSTONE_LAMP);
        this.markBlockDirty(nx, ny, nz);
        poweredAny = true;
      } else if (nb === BLOCK.TNT) {
        this.detonateTNT(nx, ny, nz);
        poweredAny = true;
      } else if (nb === BLOCK.WOOD_DOOR) {
        this.audio.doorToggle(true);
        poweredAny = true;
      } else if (nb === BLOCK.REDSTONE_WIRE) {
        this.propagateRedstone(nx, ny, nz);
        poweredAny = true;
      }
    }

    if (!poweredAny) {
      this.callbacks.onNotification?.("Lever flipped! Connect Redstone Wire, Lamp, Door, or TNT.");
    }
  }

  private propagateRedstone(x: number, y: number, z: number) {
    const queue = [[x, y, z]];
    const visited = new Set<string>();
    visited.add(`${x},${y},${z}`);

    while (queue.length > 0 && visited.size < 20) {
      const [cx, cy, cz] = queue.shift()!;
      const neighbors = [
        [cx + 1, cy, cz], [cx - 1, cy, cz],
        [cx, cy, cz + 1], [cx, cy, cz - 1],
        [cx, cy + 1, cz], [cx, cy - 1, cz],
      ];
      for (const [nx, ny, nz] of neighbors) {
        const key = `${nx},${ny},${nz}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const blk = this.world.getBlock(nx, ny, nz);
        if (blk === BLOCK.REDSTONE_WIRE) {
          queue.push([nx, ny, nz]);
        } else if (blk === BLOCK.REDSTONE_LAMP) {
          this.world.setBlock(nx, ny, nz, BLOCK.REDSTONE_LAMP_LIT);
          this.markBlockDirty(nx, ny, nz);
        } else if (blk === BLOCK.REDSTONE_LAMP_LIT) {
          this.world.setBlock(nx, ny, nz, BLOCK.REDSTONE_LAMP);
          this.markBlockDirty(nx, ny, nz);
        } else if (blk === BLOCK.TNT) {
          this.detonateTNT(nx, ny, nz);
        } else if (blk === BLOCK.WOOD_DOOR) {
          this.audio.doorToggle(true);
        }
      }
    }
  }

  spawnSparkleParticles(x: number, y: number, z: number) {
    const greenSparkles = ["#88ff20", "#44ee11", "#aaff44", "#ffffff"];
    this.spawnBlockShards(x - 0.5, y - 0.5, z - 0.5, greenSparkles, 14);
  }

  private updateCrops(dt: number) {
    this.cropTimer += dt;
    if (this.cropTimer < 2.5) return;
    this.cropTimer = 0;

    const cropPositions = Array.from(this.activeCrops);
    for (const posKey of cropPositions) {
      const [x, y, z] = posKey.split(",").map(Number);
      const blk = this.world.getBlock(x, y, z);
      const def = BLOCK_DEFS[blk];

      if (!def?.isCrop) {
        this.activeCrops.delete(posKey);
        continue;
      }

      // Check block below
      const soil = this.world.getBlock(x, y - 1, z);
      if (soil !== BLOCK.FARMLAND && soil !== BLOCK.FARMLAND_MOIST) {
        this.breakTargetBlock(x, y, z, blk);
        this.activeCrops.delete(posKey);
        continue;
      }

      // Check hydration of soil: within 4 horizontal blocks of WATER
      let hasWater = false;
      for (let dx = -4; dx <= 4 && !hasWater; dx++) {
        for (let dz = -4; dz <= 4 && !hasWater; dz++) {
          if (this.world.getBlock(x + dx, y - 1, z + dz) === BLOCK.WATER) {
            hasWater = true;
          }
        }
      }

      if (hasWater && soil === BLOCK.FARMLAND) {
        this.world.setBlock(x, y - 1, z, BLOCK.FARMLAND_MOIST);
        this.markBlockDirty(x, y - 1, z);
      } else if (!hasWater && soil === BLOCK.FARMLAND_MOIST) {
        this.world.setBlock(x, y - 1, z, BLOCK.FARMLAND);
        this.markBlockDirty(x, y - 1, z);
      }

      // Growth chance: faster if soil is moist
      const growthChance = hasWater ? 0.45 : 0.18;
      if (Math.random() < growthChance && blk !== BLOCK.WHEAT_3) {
        const nextCrop = (blk === BLOCK.WHEAT_0 ? BLOCK.WHEAT_1 : blk === BLOCK.WHEAT_1 ? BLOCK.WHEAT_2 : BLOCK.WHEAT_3) as BlockNum;
        this.world.setBlock(x, y, z, nextCrop);
        this.markBlockDirty(x, y, z);
      }
    }
  }

  // --------------------------------------------------------------------------
  // INVENTORY & ITEM MANAGEMENT
  // --------------------------------------------------------------------------
  getHeldItem(): { item: ItemId; count: number } | null {
    return this.player.hotbar[this.player.selectedSlot] ?? null;
  }

  consumeHeldItem(count = 1) {
    const slot = this.player.selectedSlot;
    const current = this.player.hotbar[slot];
    if (!current) return;
    current.count -= count;
    if (current.count <= 0) {
      this.player.hotbar[slot] = null;
    }
    this.rebuildViewmodel();
  }

  addItem(item: ItemId, count = 1) {
    // 1) First check existing stack in hotbar
    for (let i = 0; i < 9; i++) {
      const slot = this.player.hotbar[i];
      if (slot && slot.item === item && slot.count < 64) {
        const space = 64 - slot.count;
        const add = Math.min(space, count);
        slot.count += add;
        count -= add;
        if (count <= 0) {
          this.rebuildViewmodel();
          return;
        }
      }
    }

    // 2) Check empty slot in hotbar
    for (let i = 0; i < 9; i++) {
      if (!this.player.hotbar[i]) {
        const add = Math.min(64, count);
        this.player.hotbar[i] = { item, count: add };
        count -= add;
        if (count <= 0) {
          this.rebuildViewmodel();
          return;
        }
      }
    }

    // 3) Add to general inventory map
    this.player.inventory[item] = (this.player.inventory[item] || 0) + count;
    this.rebuildViewmodel();
  }

  hasItem(item: ItemId, count = 1): boolean {
    let total = this.player.inventory[item] || 0;
    for (const slot of this.player.hotbar) {
      if (slot && slot.item === item) total += slot.count;
    }
    return total >= count;
  }

  consumeItem(item: ItemId, count = 1) {
    let remaining = count;
    if (this.player.inventory[item]) {
      const take = Math.min(this.player.inventory[item], remaining);
      this.player.inventory[item] -= take;
      remaining -= take;
      if (this.player.inventory[item] <= 0) {
        delete this.player.inventory[item];
      }
    }
    if (remaining > 0) {
      for (let i = 0; i < 9; i++) {
        const slot = this.player.hotbar[i];
        if (slot && slot.item === item) {
          const take = Math.min(slot.count, remaining);
          slot.count -= take;
          remaining -= take;
          if (slot.count <= 0) {
            this.player.hotbar[i] = null;
          }
          if (remaining <= 0) break;
        }
      }
    }
    this.rebuildViewmodel();
  }

  // --------------------------------------------------------------------------
  // PLAYER PHYSICS, COLLISION & SURVIVAL
  // --------------------------------------------------------------------------
  private updatePlayerPhysics(dt: number) {
    const p = this.player;

    // Movement Vectors based on Yaw
    const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw)).normalize();

    let moveX = 0;
    let moveZ = 0;
    if (this.keys["KeyW"]) moveZ += 1;
    if (this.keys["KeyS"]) moveZ -= 1;
    if (this.keys["KeyD"]) moveX += 1;
    if (this.keys["KeyA"]) moveX -= 1;

    const moveDir = new THREE.Vector3();
    if (moveZ !== 0 || moveX !== 0) {
      moveDir.addScaledVector(forward, moveZ).addScaledVector(right, moveX).normalize();
    }

    // Check Water Status
    const feetBlock = this.world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 0.1), Math.floor(p.pos.z));
    const headBlock = this.world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 1.62), Math.floor(p.pos.z));
    const wasInWater = p.inWater;
    p.inWater = feetBlock === BLOCK.WATER;
    p.headInWater = headBlock === BLOCK.WATER;

    if (!wasInWater && p.inWater) this.audio.splash();
    if (wasInWater && !p.inWater) this.audio.splash();

    // Creative Flight Mode
    if (p.flying) {
      const flySpeed = (p.sprinting ? 18 : 10) * dt;
      p.pos.addScaledVector(moveDir, flySpeed);
      if (this.keys["Space"]) p.pos.y += flySpeed;
      if (this.keys["ShiftLeft"] || this.keys["KeyC"]) p.pos.y -= flySpeed;
      p.vel.set(0, 0, 0);
      p.fallDistance = 0;
      return;
    }

    // Walking / Sprinting Speeds
    if (p.hunger <= 6) {
      p.sprinting = false;
    }
    let baseSpeed = p.inWater ? 2.8 : p.sprinting ? 6.8 : 4.4;
    const accel = p.onGround ? 28 : p.inWater ? 12 : 7;
    const targetVelX = moveDir.x * baseSpeed;
    const targetVelZ = moveDir.z * baseSpeed;

    p.vel.x += (targetVelX - p.vel.x) * THREE.MathUtils.clamp(accel * dt, 0, 1);
    p.vel.z += (targetVelZ - p.vel.z) * THREE.MathUtils.clamp(accel * dt, 0, 1);

    const hSpeed = Math.hypot(p.vel.x, p.vel.z);
    if (p.sprinting && hSpeed > 0.5) {
      p.hunger = Math.max(0, p.hunger - 0.08 * dt);
    }

    // Check Ladder
    const ladderBlock = this.world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 0.6), Math.floor(p.pos.z));
    const onLadder = ladderBlock === BLOCK.LADDER;

    // Gravity & Vertical Movement
    if (onLadder) {
      p.fallDistance = 0;
      if (this.keys["KeyW"] || this.keys["Space"]) {
        p.vel.y = 3.2;
      } else if (this.keys["KeyS"] || this.keys["ShiftLeft"]) {
        p.vel.y = -2.8;
      } else {
        p.vel.y = 0;
      }
    } else if (p.inWater) {
      // Water Buoyancy
      const waterGravity = -4.5;
      p.vel.y += waterGravity * dt;
      p.vel.y *= 0.88; // water drag
      if (this.keys["Space"]) {
        p.vel.y = 3.2; // swimming up
      }
      if (this.keys["ShiftLeft"]) {
        p.vel.y = -3.0; // diving down
      }
      p.fallDistance = 0;
    } else {
      // Normal Air Gravity
      const gravity = -24.0;
      p.vel.y += gravity * dt;

      // Jump
      if (this.keys["Space"] && p.onGround) {
        p.vel.y = 8.4;
        p.onGround = false;
        this.audio.jump();
      }

      // Fall Distance Tracking
      if (p.vel.y < 0) {
        p.fallDistance += -p.vel.y * dt;
      }
    }

    // Apply Velocity with AABB Voxel Collision
    this.moveWithCollision(dt);

    // Head bobbing & footsteps while moving on ground
    if (p.onGround && hSpeed > 0.6) {
      this.walkBob += dt * hSpeed * 2.2;
      if (Math.sin(this.walkBob) < -0.95) {
        this.audio.step(p.inWater);
      }
    }

    // Oxygen & Drowning Mechanics
    if (this.save.gameMode === "survival") {
      if (p.headInWater) {
        p.oxygen = Math.max(0, p.oxygen - dt * 2.0);
        if (p.oxygen <= 0) {
          this.drownTimer += dt;
          if (this.drownTimer >= 1.4) {
            this.drownTimer = 0;
            this.applyDamage(2); // Drowning damage
          }
        }
      } else {
        p.oxygen = Math.min(p.maxOxygen, p.oxygen + dt * 6.0);
        this.drownTimer = 0;
      }
    }
  }

  private moveWithCollision(dt: number) {
    const p = this.player;
    const radius = 0.3;
    const height = 1.78;

    // Separate axes resolution: Y, then X, then Z
    // 1) Y movement
    const dy = p.vel.y * dt;
    const targetY = p.pos.y + dy;

    if (dy < 0) {
      // Moving down: check ground
      const minX = Math.floor(p.pos.x - radius);
      const maxX = Math.floor(p.pos.x + radius);
      const minZ = Math.floor(p.pos.z - radius);
      const maxZ = Math.floor(p.pos.z + radius);
      const checkY = Math.floor(targetY);

      let landed = false;
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          const b = this.world.getBlock(x, checkY, z);
          if (b !== BLOCK.AIR && b !== BLOCK.WATER && BLOCK_DEFS[b]?.solid) {
            landed = true;
            break;
          }
        }
        if (landed) break;
      }

      if (landed) {
        // Fall damage calculation on landing
        if (this.save.gameMode === "survival" && p.fallDistance > 3.4) {
          const damage = Math.floor((p.fallDistance - 3.4) * 1.5);
          if (damage > 0) {
            this.applyDamage(damage);
          }
        }
        p.fallDistance = 0;
        p.pos.y = checkY + 1.0;
        p.vel.y = 0;
        p.onGround = true;
      } else {
        p.pos.y = targetY;
        p.onGround = false;
      }
    } else if (dy > 0) {
      // Moving up: check ceiling
      const minX = Math.floor(p.pos.x - radius);
      const maxX = Math.floor(p.pos.x + radius);
      const minZ = Math.floor(p.pos.z - radius);
      const maxZ = Math.floor(p.pos.z + radius);
      const checkY = Math.floor(targetY + height);

      let hitCeil = false;
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          const b = this.world.getBlock(x, checkY, z);
          if (b !== BLOCK.AIR && b !== BLOCK.WATER && BLOCK_DEFS[b]?.solid) {
            hitCeil = true;
            break;
          }
        }
        if (hitCeil) break;
      }

      if (hitCeil) {
        p.pos.y = checkY - height - 0.001;
        p.vel.y = 0;
      } else {
        p.pos.y = targetY;
      }
    }

    // 2) X movement with stepping
    const dx = p.vel.x * dt;
    if (dx !== 0) {
      const nextX = p.pos.x + dx;
      if (!this.checkPlayerCollisionAt(nextX, p.pos.y, p.pos.z, radius, height)) {
        p.pos.x = nextX;
      } else if (p.onGround && !this.checkPlayerCollisionAt(nextX, p.pos.y + 0.55, p.pos.z, radius, height)) {
        // Step up
        p.pos.x = nextX;
        p.pos.y += 0.55;
      } else {
        p.vel.x = 0;
      }
    }

    // 3) Z movement with stepping
    const dz = p.vel.z * dt;
    if (dz !== 0) {
      const nextZ = p.pos.z + dz;
      if (!this.checkPlayerCollisionAt(p.pos.x, p.pos.y, nextZ, radius, height)) {
        p.pos.z = nextZ;
      } else if (p.onGround && !this.checkPlayerCollisionAt(p.pos.x, p.pos.y + 0.55, nextZ, radius, height)) {
        // Step up
        p.pos.z = nextZ;
        p.pos.y += 0.55;
      } else {
        p.vel.z = 0;
      }
    }

    // Void fall check
    if (p.pos.y < -12) {
      if (this.save.gameMode === "survival") {
        this.applyDamage(20); // Fatal void damage
      } else {
        p.pos.set(0.5, 34, 0.5);
        p.vel.set(0, 0, 0);
      }
    }
  }

  private checkPlayerCollisionAt(px: number, py: number, pz: number, radius: number, height: number): boolean {
    const minX = Math.floor(px - radius);
    const maxX = Math.floor(px + radius);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + height);
    const minZ = Math.floor(pz - radius);
    const maxZ = Math.floor(pz + radius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const b = this.world.getBlock(x, y, z);
          if (b !== BLOCK.AIR && b !== BLOCK.WATER && BLOCK_DEFS[b]?.solid) {
            return true;
          }
        }
      }
    }
    return false;
  }

  applyDamage(amount: number) {
    if (this.save.gameMode === "creative" || this.isDead) return;

    // Apply Armor reduction (up to 80% reduction for 20 armor points)
    const armorPoints = this.getArmorPoints();
    const reduction = armorPoints * 0.04;
    const finalAmount = Math.max(1, Math.round(amount * (1 - reduction)));

    this.player.health = Math.max(0, this.player.health - finalAmount);
    this.audio.hurt();
    this.hurtFlash = true;
    this.lastHurtTime = performance.now();

    if (this.player.health <= 0) {
      this.isDead = true;
      if (this.isPointerLocked) document.exitPointerLock();
      this.callbacks.onDeath();
    }
  }

  respawn() {
    this.isDead = false;
    this.player.health = this.player.maxHealth;
    this.player.hunger = this.player.maxHunger;
    this.player.oxygen = this.player.maxOxygen;
    if (this.save.player?.spawnPos) {
      this.player.pos.set(this.save.player.spawnPos[0], this.save.player.spawnPos[1], this.save.player.spawnPos[2]);
    } else {
      const sp = this.world.findSpawn();
      this.player.pos.set(sp.x, sp.y, sp.z);
    }
    this.player.vel.set(0, 0, 0);
    this.player.fallDistance = 0;
    this.updateLoadedChunks(true);
    try {
      const p = this.container.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* ignore */
    }
  }

  // --------------------------------------------------------------------------
  // PARTICLE SYSTEM
  // --------------------------------------------------------------------------
  private spawnBlockShards(bx: number, by: number, bz: number, hexPalette: string[], count = 8) {
    if (!hexPalette || hexPalette.length === 0) return;
    for (let i = 0; i < count; i++) {
      const hex = hexPalette[Math.floor(Math.random() * hexPalette.length)];
      this.shards.push({
        pos: new THREE.Vector3(bx + 0.2 + Math.random() * 0.6, by + 0.2 + Math.random() * 0.6, bz + 0.2 + Math.random() * 0.6),
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4),
        color: new THREE.Color(hex),
        life: 0,
        maxLife: 0.55 + Math.random() * 0.35,
        size: 0.08 + Math.random() * 0.08,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const p = this.shards[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.shards.splice(i, 1);
        continue;
      }
      p.vel.y -= 16.0 * dt; // gravity
      p.pos.addScaledVector(p.vel, dt);
    }

    const count = this.shards.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const s = this.shards[i];
      positions[i * 3] = s.pos.x;
      positions[i * 3 + 1] = s.pos.y;
      positions[i * 3 + 2] = s.pos.z;
      colors[i * 3] = s.color.r;
      colors[i * 3 + 1] = s.color.g;
      colors[i * 3 + 2] = s.color.b;
    }

    this.shardGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.shardGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }

  // --------------------------------------------------------------------------
  // MAIN LOOP
  // --------------------------------------------------------------------------
  private loop(now: number) {
    if (this.isDisposed) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    // FPS calculation
    this.frameCount++;
    if (now - this.lastFpsCalc > 500) {
      this.fpsCounter = Math.round((this.frameCount * 1000) / (now - this.lastFpsCalc));
      this.frameCount = 0;
      this.lastFpsCalc = now;
    }

    if (!this.isPaused && !this.isDead) {
      // 1) Update Player Physics
      this.updatePlayerPhysics(dt);

      // 2) Update Camera Transform & 3D Character Model
      const eyeY = this.player.pos.y + 1.62 + (this.player.onGround ? Math.sin(this.walkBob) * 0.04 : 0);
      const eyePos = new THREE.Vector3(this.player.pos.x, eyeY, this.player.pos.z);

      if (this.cameraMode === "first_person") {
        this.camera.position.copy(eyePos);
        this.camera.rotation.set(0, 0, 0);
        this.camera.rotation.y = this.player.yaw;
        this.camera.rotation.x = this.player.pitch;
        this.viewmodelGroup.visible = true;
        this.playerModel.group.visible = false;
      } else {
        this.viewmodelGroup.visible = false;
        this.playerModel.group.visible = true;

        this.playerModel.group.position.copy(this.player.pos);
        this.playerModel.group.rotation.set(0, 0, 0);
        this.playerModel.group.rotation.y = this.player.yaw;

        this.playerModel.updateArmor(this.player.armor);
        const held = this.getHeldItem();
        this.playerModel.updateHeldItem(held?.item ?? null);

        const isMoving = Math.hypot(this.player.vel.x, this.player.vel.z) > 0.15 && this.player.onGround;
        this.playerModel.animate(isMoving, this.walkBob, this.swingAnim, this.player.pitch);

        const targetDist = 3.6;
        const forward = new THREE.Vector3(
          -Math.sin(this.player.yaw) * Math.cos(this.player.pitch),
          Math.sin(this.player.pitch),
          -Math.cos(this.player.yaw) * Math.cos(this.player.pitch),
        ).normalize();

        const camDir = this.cameraMode === "third_person_back" ? forward.clone().negate() : forward.clone();

        let safeDist = targetDist;
        for (let d = 0.4; d <= targetDist; d += 0.15) {
          const testP = eyePos.clone().add(camDir.clone().multiplyScalar(d));
          const bx = Math.floor(testP.x);
          const by = Math.floor(testP.y);
          const bz = Math.floor(testP.z);
          const blk = this.world.getBlock(bx, by, bz);
          if (blk !== BLOCK.AIR && blk !== BLOCK.WATER && BLOCK_DEFS[blk]?.solid) {
            safeDist = Math.max(0.4, d - 0.2);
            break;
          }
        }

        const camPos = eyePos.clone().add(camDir.multiplyScalar(safeDist));
        this.camera.position.copy(camPos);

        if (this.cameraMode === "third_person_back") {
          this.camera.rotation.set(0, 0, 0);
          this.camera.rotation.y = this.player.yaw;
          this.camera.rotation.x = this.player.pitch;
        } else {
          this.camera.lookAt(eyePos);
        }
      }

      // 3) Update Atmosphere & Lights
      this.updateDayNightCycle(dt);

      // 4) Update Target Block Raycasting
      this.updateTargeting();

      // 5) Update Mining Process
      this.updateMining(dt);

      // 6) Dynamic Chunk Loading
      this.updateLoadedChunks();

      // 7) Particles
      this.updateParticles(dt);

      // 8) Viewmodel Bob & Swing
      if (this.swingAnim > 0) {
        this.swingAnim = Math.max(0, this.swingAnim - dt * 3.5);
        this.viewmodelGroup.rotation.x = -Math.sin(this.swingAnim * Math.PI) * 0.45;
        this.viewmodelGroup.rotation.y = Math.sin(this.swingAnim * Math.PI) * 0.25;
      } else {
        this.viewmodelGroup.rotation.x = 0;
        this.viewmodelGroup.rotation.y = 0;
      }

      // Hurt vignette flash decay
      if (this.hurtFlash && now - this.lastHurtTime > 300) {
        this.hurtFlash = false;
      }

      // 9) Mobs & Entity AI
      const isDay = this.save.dayTime < 12000 || this.save.dayTime > 23000;
      this.mobManager.update(
        dt,
        this.player.pos,
        isDay,
        (dmg) => this.applyDamage(dmg),
        (drops, pos, xp) => {
          drops.forEach((d) => this.addItem(d.item, d.count));
          if (pos && xp) this.spawnXpOrbs(pos.x, pos.y, pos.z, xp);
        },
        (ex, ey, ez) => this.detonateTNT(ex, ey, ez),
      );

      // 10) Weather, XP Orbs, Furnace & Crop Simulation
      this.updateWeather(dt);
      this.updateXpOrbs(dt);
      this.updateFurnaces(dt);
      this.updateCrops(dt);

      // 11) Procedural Ambient Music Update
      this.audio.updateAmbient(dt);

      // 12) Hunger & Natural Regeneration
      if (this.save.gameMode === "survival") {
        this.hungerTimer += dt;
        if (this.hungerTimer >= 4.0) {
          this.hungerTimer = 0;
          if (this.player.hunger >= 18 && this.player.health < this.player.maxHealth) {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
            this.player.hunger = Math.max(0, this.player.hunger - 0.5);
          } else if (this.player.hunger <= 0) {
            this.applyDamage(1);
          }
        }
      }

      // Auto-save every 15 seconds
      this.autoSaveTimer += dt;
      if (this.autoSaveTimer > 15) {
        this.autoSaveTimer = 0;
        this.saveCurrentWorld();
      }
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);

    // Emit HUD state to React UI
    this.emitHudState();
  }

  private emitHudState() {
    const held = this.getHeldItem();
    const heldDef = held ? ITEMS[held.item] : null;
    const heldName = heldDef ? heldDef.name : "";

    const wx = Math.floor(this.player.pos.x);
    const wz = Math.floor(this.player.pos.z);
    const biome = this.world.getBiomeAt(wx, wz).name;

    // Compass facing
    let facing = "South";
    const deg = THREE.MathUtils.radToDeg(this.player.yaw) % 360;
    const normDeg = (deg + 360) % 360;
    if (normDeg >= 315 || normDeg < 45) facing = "South (+Z)";
    else if (normDeg >= 45 && normDeg < 135) facing = "West (-X)";
    else if (normDeg >= 135 && normDeg < 225) facing = "North (-Z)";
    else facing = "East (+X)";

    this.callbacks.onHud({
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      hunger: Math.round(this.player.hunger),
      maxHunger: 20,
      oxygen: this.player.oxygen,
      maxOxygen: this.player.maxOxygen,
      inWater: this.player.inWater,
      gameMode: this.save.gameMode,
      hotbar: this.player.hotbar,
      selectedSlot: this.player.selectedSlot,
      heldItem: held ? held.item : null,
      heldDef,
      heldName,
      inventory: this.player.inventory,
      armorPoints: this.getArmorPoints(),
      armor: this.player.armor,
      xp: Math.round(this.player.xp),
      level: this.player.level,
      weather: this.weather,
      underwater: this.player.headInWater,
      debug: {
        fps: this.fpsCounter,
        x: Math.round(this.player.pos.x * 10) / 10,
        y: Math.round(this.player.pos.y * 10) / 10,
        z: Math.round(this.player.pos.z * 10) / 10,
        chunkX: chunkCoord(wx),
        chunkZ: chunkCoord(wz),
        biome,
        facing,
        loadedChunks: this.chunkMeshes.size,
        dayTimeTicks: Math.round(this.save.dayTime),
        lightLevel: 15,
        seed: this.world.seed,
      },
      isF3Open: this.isF3Open,
      targetBlock: this.targetBlock
        ? {
            name: BLOCK_DEFS[this.targetBlock.block]?.name || "Block",
            x: this.targetBlock.x,
            y: this.targetBlock.y,
            z: this.targetBlock.z,
          }
        : null,
      crosshairActive: this.targetBlock !== null,
      hurtFlash: this.hurtFlash,
    });
  }

  saveCurrentWorld() {
    this.save.player = {
      pos: [this.player.pos.x, this.player.pos.y, this.player.pos.z],
      yaw: this.player.yaw,
      pitch: this.player.pitch,
      health: this.player.health,
      hunger: this.player.hunger,
      oxygen: this.player.oxygen,
      hotbar: this.player.hotbar,
      inventory: this.player.inventory,
      armor: this.player.armor,
      xp: this.player.xp,
      level: this.player.level,
      selectedSlot: this.player.selectedSlot,
      flying: this.player.flying,
      spawnPos: this.save.player?.spawnPos,
    };
    this.save.weather = this.weather;
    this.save.edits = this.world.exportEdits();
    saveWorldSave(this.save);
    if (this.callbacks.onWorldSaved) {
      this.callbacks.onWorldSaved();
    }
  }

  setGameMode(mode: GameModeId) {
    this.save.gameMode = mode;
    if (mode === "survival") {
      this.player.flying = false;
    }
    this.saveCurrentWorld();
  }

  setRenderDistance(distance: number) {
    this.settings.renderDistance = Math.max(2, Math.min(5, distance));
    this.updateLoadedChunks(true);
  }

  setShadows(enabled: boolean) {
    this.settings.shadows = enabled;
    this.renderer.shadowMap.enabled = enabled;
    this.sunLight.castShadow = enabled;
    for (const record of this.chunkMeshes.values()) {
      if (record.opaqueMesh) {
        record.opaqueMesh.castShadow = enabled;
        record.opaqueMesh.receiveShadow = enabled;
      }
    }
  }

  setMuted(muted: boolean) {
    this.settings.muted = muted;
    this.audio.setMuted(muted);
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused && this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  craftRecipe(recipeId: string): boolean {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;

    // Check if player has all inputs in inventory or hotbar
    const counts: Record<string, number> = { ...this.player.inventory };
    this.player.hotbar.forEach((slot) => {
      if (slot) {
        counts[slot.item] = (counts[slot.item] || 0) + slot.count;
      }
    });

    for (const input of recipe.inputs) {
      if ((counts[input.item] || 0) < input.count) return false;
    }

    // Deduct inputs
    for (const input of recipe.inputs) {
      let needed = input.count;

      // Deduct from general inventory first
      if (this.player.inventory[input.item]) {
        const take = Math.min(this.player.inventory[input.item], needed);
        this.player.inventory[input.item] -= take;
        needed -= take;
        if (this.player.inventory[input.item] <= 0) {
          delete this.player.inventory[input.item];
        }
      }

      // Deduct from hotbar
      if (needed > 0) {
        for (let i = 0; i < 9; i++) {
          const slot = this.player.hotbar[i];
          if (slot && slot.item === input.item) {
            const take = Math.min(slot.count, needed);
            slot.count -= take;
            needed -= take;
            if (slot.count <= 0) {
              this.player.hotbar[i] = null;
            }
            if (needed <= 0) break;
          }
        }
      }
    }

    // Add crafted output
    this.addItem(recipe.out, recipe.count);
    this.audio.craft();
    return true;
  }

  dispose() {
    this.isDisposed = true;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.disposeListeners();
    this.saveCurrentWorld();

    this.audio.dispose();
    this.atlas.dispose();
    this.mobManager.dispose();
    this.playerModel.dispose();

    if (this.precipPoints) {
      this.scene.remove(this.precipPoints);
      this.precipPoints.geometry.dispose();
      (this.precipPoints.material as THREE.Material).dispose();
      this.precipPoints = null;
    }

    this.xpOrbs.forEach((orb) => {
      this.scene.remove(orb.mesh);
      orb.mesh.geometry.dispose();
      (orb.mesh.material as THREE.Material).dispose();
    });
    this.xpOrbs = [];

    for (const record of this.chunkMeshes.values()) {
      if (record.opaqueMesh) {
        this.scene.remove(record.opaqueMesh);
        record.opaqueMesh.geometry.dispose();
      }
      if (record.waterMesh) {
        this.scene.remove(record.waterMesh);
        record.waterMesh.geometry.dispose();
      }
    }
    this.chunkMeshes.clear();

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
