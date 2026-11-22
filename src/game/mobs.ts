import * as THREE from "three";
import { type InfiniteWorld } from "./world";
import { BLOCK, BLOCK_DEFS, type ItemId, type VillagerProfession, type VillagerTrade, getVillagerTrades } from "./blocks";
import { type GameAudio } from "./audio";

export type MobType = "zombie" | "skeleton" | "creeper" | "pig" | "cow" | "sheep" | "pigman" | "ghast" | "villager" | "enderman" | "iron_golem";

export interface MobEntity {
  id: string;
  type: MobType;
  profession?: VillagerProfession;
  trades?: VillagerTrade[];
  group: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  isHostile: boolean;
  onGround: boolean;
  hurtTimer: number; // >0 means flashing red
  burnTimer?: number;
  burnTickTimer?: number;
  dead: boolean;
  deathTimer: number;

  // AI & State
  state: "idle" | "wander" | "chase" | "flee" | "fuse";
  stateTimer: number;
  targetPos: THREE.Vector3 | null;
  attackCooldown: number;
  fuseTimer: number; // for creepers

  // Limb references for procedural walking animation
  limbs: {
    head: THREE.Object3D;
    body: THREE.Object3D;
    leftArm?: THREE.Object3D;
    rightArm?: THREE.Object3D;
    leftLeg?: THREE.Object3D;
    rightLeg?: THREE.Object3D;
    legFL?: THREE.Object3D;
    legFR?: THREE.Object3D;
    legBL?: THREE.Object3D;
    legBR?: THREE.Object3D;
    tentacles?: THREE.Object3D[];
  };
  originalColors: Map<THREE.Mesh, THREE.Color>;
}

export interface ArrowEntity {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  shooter: "player" | "skeleton";
  stuck: boolean;
  stuckTimer: number;
}

export interface EnderPearlEntity {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

export class MobManager {
  world: InfiniteWorld;
  audio: GameAudio;
  scene: THREE.Scene;

  mobs: MobEntity[] = [];
  arrows: ArrowEntity[] = [];
  pearls: EnderPearlEntity[] = [];
  spawnTimer = 0;

  // Shared Materials
  private matZombieSkin = new THREE.MeshLambertMaterial({ color: 0x55943f });
  private matZombieShirt = new THREE.MeshLambertMaterial({ color: 0x3b899c });
  private matZombiePants = new THREE.MeshLambertMaterial({ color: 0x2b3875 });

  private matBone = new THREE.MeshLambertMaterial({ color: 0xd9d7ce });
  private matBoneDark = new THREE.MeshLambertMaterial({ color: 0x282624 });

  private matCreeperGreen = new THREE.MeshLambertMaterial({ color: 0x489635 });
  private matCreeperFace = new THREE.MeshLambertMaterial({ color: 0x1f3619 });

  private matPigPink = new THREE.MeshLambertMaterial({ color: 0xf5a4a4 });
  private matPigSnout = new THREE.MeshLambertMaterial({ color: 0xdc7c7c });

  private matCowHide = new THREE.MeshLambertMaterial({ color: 0x423832 });
  private matCowWhite = new THREE.MeshLambertMaterial({ color: 0xe6e4df });
  private matCowHorns = new THREE.MeshLambertMaterial({ color: 0x8a847b });

  private matSheepWool = new THREE.MeshLambertMaterial({ color: 0xf0efe8 });
  private matSheepSkin = new THREE.MeshLambertMaterial({ color: 0xd4a390 });

  private matWoodBow = new THREE.MeshLambertMaterial({ color: 0x6e451f });

  private matPigmanSkin = new THREE.MeshLambertMaterial({ color: 0xdf8a8a });
  private matPigmanRot = new THREE.MeshLambertMaterial({ color: 0x4a7e37 });
  private matPigmanPants = new THREE.MeshLambertMaterial({ color: 0x47362b });
  private matGoldSword = new THREE.MeshLambertMaterial({ color: 0xffd43b });
  private matGhastWhite = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
  private matGhastEyes = new THREE.MeshLambertMaterial({ color: 0xcc2222 });

  private matVillagerSkin = new THREE.MeshLambertMaterial({ color: 0xbd8b72 });
  private matVillagerRobe = new THREE.MeshLambertMaterial({ color: 0x5a3d28 });
  private matVillagerApron = new THREE.MeshLambertMaterial({ color: 0x2e2b2a });
  private matVillagerSash = new THREE.MeshLambertMaterial({ color: 0x3d7034 });
  private matVillagerHat = new THREE.MeshLambertMaterial({ color: 0x8b2222 });
  private matVillagerStraw = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
  private matVillagerEye = new THREE.MeshLambertMaterial({ color: 0x224c28 });
  private matVillagerWhite = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
  private matVillagerBrow = new THREE.MeshLambertMaterial({ color: 0x3e2718 });

  private matEndermanSkin = new THREE.MeshLambertMaterial({ color: 0x121212 });
  private matEndermanEyes = new THREE.MeshLambertMaterial({ color: 0xd946ef, emissive: 0x86198f });
  private matGolemIron = new THREE.MeshLambertMaterial({ color: 0xd4d4d8 });
  private matGolemTorso = new THREE.MeshLambertMaterial({ color: 0xa1a1aa });
  private matGolemVines = new THREE.MeshLambertMaterial({ color: 0x4d7c0f });
  private matGolemEyes = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
  private matGolemNose = new THREE.MeshLambertMaterial({ color: 0x92400e });
  private matPearl = new THREE.MeshLambertMaterial({ color: 0x0f766e, emissive: 0x115e59 });

  constructor(world: InfiniteWorld, scene: THREE.Scene, audio: GameAudio) {
    this.world = world;
    this.scene = scene;
    this.audio = audio;
  }

  // --------------------------------------------------------------------------
  // SPAWNING
  // --------------------------------------------------------------------------
  spawnMob(type: MobType, x: number, y: number, z: number, profession?: VillagerProfession): MobEntity {
    const group = new THREE.Group();
    const originalColors = new Map<THREE.Mesh, THREE.Color>();
    let limbs: MobEntity["limbs"];
    let maxHealth = 20;
    let isHostile = true;
    let trades: VillagerTrade[] | undefined;

    switch (type) {
      case "zombie":
        limbs = this.buildZombieModel(group, originalColors);
        maxHealth = 20;
        break;
      case "skeleton":
        limbs = this.buildSkeletonModel(group, originalColors);
        maxHealth = 16;
        break;
      case "creeper":
        limbs = this.buildCreeperModel(group, originalColors);
        maxHealth = 16;
        break;
      case "pig":
        limbs = this.buildPigModel(group, originalColors);
        maxHealth = 10;
        isHostile = false;
        break;
      case "cow":
        limbs = this.buildCowModel(group, originalColors);
        maxHealth = 12;
        isHostile = false;
        break;
      case "sheep":
        limbs = this.buildSheepModel(group, originalColors);
        maxHealth = 8;
        isHostile = false;
        break;
      case "pigman":
        limbs = this.buildPigmanModel(group, originalColors);
        maxHealth = 20;
        isHostile = false; // Neutral until provoked
        break;
      case "ghast":
        limbs = this.buildGhastModel(group, originalColors);
        maxHealth = 12;
        isHostile = true;
        break;
      case "villager":
        profession = profession || (["farmer", "weaponsmith", "librarian", "cleric"][Math.floor(Math.random() * 4)] as VillagerProfession);
        trades = getVillagerTrades(profession);
        limbs = this.buildVillagerModel(group, originalColors, profession);
        maxHealth = 20;
        isHostile = false;
        break;
      case "enderman":
        limbs = this.buildEndermanModel(group, originalColors);
        maxHealth = 40;
        isHostile = false; // Neutral until stare/attacked
        break;
      case "iron_golem":
        limbs = this.buildIronGolemModel(group, originalColors);
        maxHealth = 100;
        isHostile = false; // Friendly to player, hostile to monsters
        break;
    }

    group.position.set(x, y, z);
    this.scene.add(group);

    const mob: MobEntity = {
      id: `mob_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      profession,
      trades,
      group,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(0, 0, 0),
      yaw: Math.random() * Math.PI * 2,
      pitch: 0,
      health: maxHealth,
      maxHealth,
      isHostile,
      onGround: true,
      hurtTimer: 0,
      dead: false,
      deathTimer: 0,
      state: "wander",
      stateTimer: Math.random() * 4,
      targetPos: null,
      attackCooldown: 0,
      fuseTimer: 0,
      limbs,
      originalColors,
    };

    this.mobs.push(mob);
    return mob;
  }

  // --------------------------------------------------------------------------
  // 3D VOXEL MODELS
  // --------------------------------------------------------------------------
  private registerMesh(mesh: THREE.Mesh, map: Map<THREE.Mesh, THREE.Color>) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (mesh.material instanceof THREE.MeshLambertMaterial) {
      map.set(mesh, mesh.material.color.clone());
    }
  }

  private buildZombieModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), this.matZombieSkin);
    head.position.set(0, 1.62, 0);
    this.registerMesh(head, colors);
    group.add(head);

    // Torso (Shirt)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.68, 0.24), this.matZombieShirt);
    body.position.set(0, 1.08, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Outstretched Arms (Zombie pose)
    const armGeo = new THREE.BoxGeometry(0.18, 0.64, 0.18);
    const leftArm = new THREE.Mesh(armGeo, this.matZombieSkin);
    leftArm.position.set(-0.32, 1.34, 0.32);
    leftArm.rotation.x = -Math.PI / 2; // outstretched forward!
    this.registerMesh(leftArm, colors);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, this.matZombieSkin);
    rightArm.position.set(0.32, 1.34, 0.32);
    rightArm.rotation.x = -Math.PI / 2;
    this.registerMesh(rightArm, colors);
    group.add(rightArm);

    // Legs (Blue pants)
    const legGeo = new THREE.BoxGeometry(0.2, 0.72, 0.2);
    const leftLeg = new THREE.Mesh(legGeo, this.matZombiePants);
    leftLeg.position.set(-0.12, 0.36, 0);
    this.registerMesh(leftLeg, colors);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, this.matZombiePants);
    rightLeg.position.set(0.12, 0.36, 0);
    this.registerMesh(rightLeg, colors);
    group.add(rightLeg);

    return { head, body, leftArm, rightArm, leftLeg, rightLeg };
  }

  private buildPigmanModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // Head: half pink, half rotten green
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), this.matPigmanSkin);
    head.position.set(0, 1.62, 0);
    this.registerMesh(head, colors);
    group.add(head);

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.1), this.matPigSnout);
    snout.position.set(0, 1.55, 0.25);
    this.registerMesh(snout, colors);
    group.add(snout);

    // Torso: leather vest / rotten flesh
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.68, 0.24), this.matPigmanRot);
    body.position.set(0, 1.08, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.18, 0.64, 0.18);
    const leftArm = new THREE.Mesh(armGeo, this.matPigmanSkin);
    leftArm.position.set(-0.32, 1.34, 0.32);
    leftArm.rotation.x = -Math.PI / 2;
    this.registerMesh(leftArm, colors);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, this.matPigmanRot);
    rightArm.position.set(0.32, 1.34, 0.32);
    rightArm.rotation.x = -Math.PI / 2;
    this.registerMesh(rightArm, colors);
    group.add(rightArm);

    // Golden Sword held in right hand!
    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), this.matGoldSword);
    swordBlade.position.set(0.32, 1.65, 0.45);
    swordBlade.rotation.x = -Math.PI / 3;
    this.registerMesh(swordBlade, colors);
    group.add(swordBlade);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.72, 0.2);
    const leftLeg = new THREE.Mesh(legGeo, this.matPigmanPants);
    leftLeg.position.set(-0.12, 0.36, 0);
    this.registerMesh(leftLeg, colors);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, this.matPigmanPants);
    rightLeg.position.set(0.12, 0.36, 0);
    this.registerMesh(rightLeg, colors);
    group.add(rightLeg);

    return { head, body, leftArm, rightArm, leftLeg, rightLeg };
  }

  private buildGhastModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // 1.5x1.5x1.5 White Floating Ghost
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), this.matGhastWhite);
    body.position.set(0, 1.6, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Red crying eyes
    const eyeGeo = new THREE.BoxGeometry(0.22, 0.22, 0.04);
    const leftEye = new THREE.Mesh(eyeGeo, this.matGhastEyes);
    leftEye.position.set(-0.35, 1.7, 0.78);
    this.registerMesh(leftEye, colors);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, this.matGhastEyes);
    rightEye.position.set(0.35, 1.7, 0.78);
    this.registerMesh(rightEye, colors);
    group.add(rightEye);

    // 9 Dangling Tentacles below body
    const tentacles: THREE.Object3D[] = [];
    const tentGeo = new THREE.BoxGeometry(0.14, 0.85, 0.14);
    for (let tx = -1; tx <= 1; tx++) {
      for (let tz = -1; tz <= 1; tz++) {
        const tent = new THREE.Mesh(tentGeo, this.matGhastWhite);
        tent.position.set(tx * 0.45, 0.45, tz * 0.45);
        this.registerMesh(tent, colors);
        group.add(tent);
        tentacles.push(tent);
      }
    }

    return { head: body, body, tentacles };
  }

  private buildSkeletonModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // Skull
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), this.matBone);
    head.position.set(0, 1.62, 0);
    this.registerMesh(head, colors);
    group.add(head);

    // Torso (Ribcage)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.68, 0.2), this.matBone);
    body.position.set(0, 1.08, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Bone limbs
    const armGeo = new THREE.BoxGeometry(0.12, 0.64, 0.12);
    const leftArm = new THREE.Mesh(armGeo, this.matBone);
    leftArm.position.set(-0.28, 1.34, 0.28);
    leftArm.rotation.x = -Math.PI / 3;
    this.registerMesh(leftArm, colors);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, this.matBone);
    rightArm.position.set(0.28, 1.34, 0.28);
    rightArm.rotation.x = -Math.PI / 3;
    this.registerMesh(rightArm, colors);
    group.add(rightArm);

    // Miniature Bow attached to right arm
    const bowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.04), this.matWoodBow);
    bowMesh.position.set(0.28, 1.2, 0.4);
    group.add(bowMesh);

    const legGeo = new THREE.BoxGeometry(0.12, 0.72, 0.12);
    const leftLeg = new THREE.Mesh(legGeo, this.matBone);
    leftLeg.position.set(-0.12, 0.36, 0);
    this.registerMesh(leftLeg, colors);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, this.matBone);
    rightLeg.position.set(0.12, 0.36, 0);
    this.registerMesh(rightLeg, colors);
    group.add(rightLeg);

    return { head, body, leftArm, rightArm, leftLeg, rightLeg };
  }

  private buildCreeperModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // Head with frowning face
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), this.matCreeperGreen);
    head.position.set(0, 1.52, 0);
    this.registerMesh(head, colors);
    group.add(head);

    // Iconic Creeper Face
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.02), this.matCreeperFace);
    face.position.set(0, 1.52, 0.24);
    group.add(face);

    // Torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.24), this.matCreeperGreen);
    body.position.set(0, 0.96, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // 4 Trotting Feet
    const footGeo = new THREE.BoxGeometry(0.18, 0.38, 0.22);
    const legFL = new THREE.Mesh(footGeo, this.matCreeperGreen);
    legFL.position.set(-0.14, 0.2, 0.16);
    this.registerMesh(legFL, colors);
    group.add(legFL);

    const legFR = new THREE.Mesh(footGeo, this.matCreeperGreen);
    legFR.position.set(0.14, 0.2, 0.16);
    this.registerMesh(legFR, colors);
    group.add(legFR);

    const legBL = new THREE.Mesh(footGeo, this.matCreeperGreen);
    legBL.position.set(-0.14, 0.2, -0.16);
    this.registerMesh(legBL, colors);
    group.add(legBL);

    const legBR = new THREE.Mesh(footGeo, this.matCreeperGreen);
    legBR.position.set(0.14, 0.2, -0.16);
    this.registerMesh(legBR, colors);
    group.add(legBR);

    return { head, body, legFL, legFR, legBL, legBR };
  }

  private buildPigModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // Body (Horizontal Box)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.46, 0.82), this.matPigPink);
    body.position.set(0, 0.6, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), this.matPigPink);
    head.position.set(0, 0.74, 0.48);
    this.registerMesh(head, colors);
    group.add(head);

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.1), this.matPigSnout);
    snout.position.set(0, 0.66, 0.72);
    this.registerMesh(snout, colors);
    group.add(snout);

    // 4 Stubby Legs
    const legGeo = new THREE.BoxGeometry(0.16, 0.38, 0.16);
    const legFL = new THREE.Mesh(legGeo, this.matPigPink);
    legFL.position.set(-0.18, 0.2, 0.28);
    this.registerMesh(legFL, colors);
    group.add(legFL);

    const legFR = new THREE.Mesh(legGeo, this.matPigPink);
    legFR.position.set(0.18, 0.2, 0.28);
    this.registerMesh(legFR, colors);
    group.add(legFR);

    const legBL = new THREE.Mesh(legGeo, this.matPigPink);
    legBL.position.set(-0.18, 0.2, -0.28);
    this.registerMesh(legBL, colors);
    group.add(legBL);

    const legBR = new THREE.Mesh(legGeo, this.matPigPink);
    legBR.position.set(0.18, 0.2, -0.28);
    this.registerMesh(legBR, colors);
    group.add(legBR);

    return { head, body, legFL, legFR, legBL, legBR };
  }

  private buildCowModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // Body (Spotted)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.62, 0.94), this.matCowHide);
    body.position.set(0, 0.8, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), this.matCowWhite);
    head.position.set(0, 1.0, 0.54);
    this.registerMesh(head, colors);
    group.add(head);

    // Horns
    const hornGeo = new THREE.BoxGeometry(0.08, 0.14, 0.08);
    const hornL = new THREE.Mesh(hornGeo, this.matCowHorns);
    hornL.position.set(-0.24, 1.24, 0.52);
    group.add(hornL);
    const hornR = new THREE.Mesh(hornGeo, this.matCowHorns);
    hornR.position.set(0.24, 1.24, 0.52);
    group.add(hornR);

    // 4 Legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.52, 0.18);
    const legFL = new THREE.Mesh(legGeo, this.matCowHide);
    legFL.position.set(-0.22, 0.26, 0.32);
    this.registerMesh(legFL, colors);
    group.add(legFL);

    const legFR = new THREE.Mesh(legGeo, this.matCowHide);
    legFR.position.set(0.22, 0.26, 0.32);
    this.registerMesh(legFR, colors);
    group.add(legFR);

    const legBL = new THREE.Mesh(legGeo, this.matCowHide);
    legBL.position.set(-0.22, 0.26, -0.32);
    this.registerMesh(legBL, colors);
    group.add(legBL);

    const legBR = new THREE.Mesh(legGeo, this.matCowHide);
    legBR.position.set(0.22, 0.26, -0.32);
    this.registerMesh(legBR, colors);
    group.add(legBR);

    return { head, body, legFL, legFR, legBL, legBR };
  }

  private buildSheepModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // Wool Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.94), this.matSheepWool);
    body.position.set(0, 0.74, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Head (Pink face + Wool top)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), this.matSheepSkin);
    head.position.set(0, 0.92, 0.52);
    this.registerMesh(head, colors);
    group.add(head);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.16, 0.46, 0.16);
    const legFL = new THREE.Mesh(legGeo, this.matSheepSkin);
    legFL.position.set(-0.2, 0.23, 0.3);
    this.registerMesh(legFL, colors);
    group.add(legFL);

    const legFR = new THREE.Mesh(legGeo, this.matSheepSkin);
    legFR.position.set(0.2, 0.23, 0.3);
    this.registerMesh(legFR, colors);
    group.add(legFR);

    const legBL = new THREE.Mesh(legGeo, this.matSheepSkin);
    legBL.position.set(-0.2, 0.23, -0.3);
    this.registerMesh(legBL, colors);
    group.add(legBL);

    const legBR = new THREE.Mesh(legGeo, this.matSheepSkin);
    legBR.position.set(0.2, 0.23, -0.3);
    this.registerMesh(legBR, colors);
    group.add(legBR);

    return { head, body, legFL, legFR, legBL, legBR };
  }

  private buildVillagerModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>, profession: VillagerProfession) {
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.54, 0.44), this.matVillagerSkin);
    head.position.set(0, 1.48, 0);
    this.registerMesh(head, colors);
    group.add(head);

    // Iconic Protruding 3D Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.14), this.matVillagerSkin);
    nose.position.set(0, 1.38, 0.28);
    this.registerMesh(nose, colors);
    group.add(nose);

    // Unibrow
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.02), this.matVillagerBrow);
    brow.position.set(0, 1.54, 0.225);
    group.add(brow);

    // Eyes
    const eyeWhiteL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), this.matVillagerWhite);
    eyeWhiteL.position.set(-0.11, 1.45, 0.225);
    group.add(eyeWhiteL);
    const pupilL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.022), this.matVillagerEye);
    pupilL.position.set(-0.09, 1.45, 0.225);
    group.add(pupilL);

    const eyeWhiteR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), this.matVillagerWhite);
    eyeWhiteR.position.set(0.11, 1.45, 0.225);
    group.add(eyeWhiteR);
    const pupilR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.022), this.matVillagerEye);
    pupilR.position.set(0.09, 1.45, 0.225);
    group.add(pupilR);

    // Robe Torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.32), this.matVillagerRobe);
    body.position.set(0, 0.9, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Folded Arms (Connected Sleeve across chest)
    const arms = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.26), this.matVillagerRobe);
    arms.position.set(0, 0.94, 0.14);
    this.registerMesh(arms, colors);
    group.add(arms);

    // Hands peeking under sleeve
    const hands = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.14), this.matVillagerSkin);
    hands.position.set(0, 0.86, 0.14);
    this.registerMesh(hands, colors);
    group.add(hands);

    // Walking Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.54, 0.22);
    const leftLeg = new THREE.Mesh(legGeo, this.matVillagerRobe);
    leftLeg.position.set(-0.12, 0.27, 0);
    this.registerMesh(leftLeg, colors);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, this.matVillagerRobe);
    rightLeg.position.set(0.12, 0.27, 0);
    this.registerMesh(rightLeg, colors);
    group.add(rightLeg);

    // Profession visual accessories
    if (profession === "farmer") {
      const strawBrim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.66), this.matVillagerStraw);
      strawBrim.position.set(0, 1.74, 0);
      group.add(strawBrim);
      const strawTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.46), this.matVillagerStraw);
      strawTop.position.set(0, 1.81, 0);
      group.add(strawTop);
      const sash = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.34), this.matVillagerSash);
      sash.position.set(0, 0.72, 0);
      group.add(sash);
    } else if (profession === "weaponsmith") {
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.54, 0.03), this.matVillagerApron);
      apron.position.set(0, 0.9, 0.17);
      group.add(apron);
    } else if (profession === "librarian") {
      const hat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.36), this.matVillagerHat);
      hat.position.set(0, 1.78, 0);
      group.add(hat);
    } else if (profession === "cleric") {
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.48), this.matVillagerHat);
      hood.position.set(0, 1.62, 0);
      group.add(hood);
    }

    return { head, body, leftArm: arms, rightArm: arms, leftLeg, rightLeg };
  }

  private buildEndermanModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // 2.9 blocks tall, slender silhouette
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), this.matEndermanSkin);
    head.position.set(0, 2.45, 0);
    this.registerMesh(head, colors);
    group.add(head);

    // Glowing purple slit eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.02), this.matEndermanEyes);
    eyeL.position.set(-0.08, 2.45, 0.175);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.02), this.matEndermanEyes);
    eyeR.position.set(0.08, 2.45, 0.175);
    group.add(eyeR);

    // Slender torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.16), this.matEndermanSkin);
    body.position.set(0, 1.95, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Long thin arms reaching almost to knees
    const armGeo = new THREE.BoxGeometry(0.09, 1.45, 0.09);
    const leftArm = new THREE.Mesh(armGeo, this.matEndermanSkin);
    leftArm.position.set(-0.21, 1.55, 0);
    this.registerMesh(leftArm, colors);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, this.matEndermanSkin);
    rightArm.position.set(0.21, 1.55, 0);
    this.registerMesh(rightArm, colors);
    group.add(rightArm);

    // Long thin legs
    const legGeo = new THREE.BoxGeometry(0.1, 1.62, 0.1);
    const leftLeg = new THREE.Mesh(legGeo, this.matEndermanSkin);
    leftLeg.position.set(-0.08, 0.81, 0);
    this.registerMesh(leftLeg, colors);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, this.matEndermanSkin);
    rightLeg.position.set(0.08, 0.81, 0);
    this.registerMesh(rightLeg, colors);
    group.add(rightLeg);

    return { head, body, leftArm, rightArm, leftLeg, rightLeg };
  }

  private buildIronGolemModel(group: THREE.Group, colors: Map<THREE.Mesh, THREE.Color>) {
    // 2.7 blocks tall, heavy and imposing
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.4), this.matGolemIron);
    head.position.set(0, 2.15, 0.08);
    this.registerMesh(head, colors);
    group.add(head);

    // 3D Villager-like nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), this.matGolemNose);
    nose.position.set(0, 2.05, 0.32);
    this.registerMesh(nose, colors);
    group.add(nose);

    // Red eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), this.matGolemEyes);
    eyeL.position.set(-0.11, 2.22, 0.29);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), this.matGolemEyes);
    eyeR.position.set(0.11, 2.22, 0.29);
    group.add(eyeR);

    // Massive broad chest
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.78, 0.52), this.matGolemIron);
    body.position.set(0, 1.52, 0);
    this.registerMesh(body, colors);
    group.add(body);

    // Moss vines on chest
    const vine = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.46, 0.03), this.matGolemVines);
    vine.position.set(0.18, 1.52, 0.27);
    this.registerMesh(vine, colors);
    group.add(vine);

    // Lower waist
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.3, 0.42), this.matGolemTorso);
    waist.position.set(0, 1.05, 0);
    this.registerMesh(waist, colors);
    group.add(waist);

    // Huge swinging arms reaching down
    const armGeo = new THREE.BoxGeometry(0.26, 1.35, 0.26);
    const leftArm = new THREE.Mesh(armGeo, this.matGolemIron);
    leftArm.position.set(-0.62, 1.25, 0);
    this.registerMesh(leftArm, colors);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, this.matGolemIron);
    rightArm.position.set(0.62, 1.25, 0);
    this.registerMesh(rightArm, colors);
    group.add(rightArm);

    // Thick columnar legs
    const legGeo = new THREE.BoxGeometry(0.32, 0.9, 0.32);
    const leftLeg = new THREE.Mesh(legGeo, this.matGolemIron);
    leftLeg.position.set(-0.22, 0.45, 0);
    this.registerMesh(leftLeg, colors);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, this.matGolemIron);
    rightLeg.position.set(0.22, 0.45, 0);
    this.registerMesh(rightLeg, colors);
    group.add(rightLeg);

    return { head, body, leftArm, rightArm, leftLeg, rightLeg };
  }

  teleportEnderman(mob: MobEntity, nearPos?: THREE.Vector3): boolean {
    const center = nearPos || mob.pos;
    for (let attempts = 0; attempts < 20; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = nearPos ? 3.0 + Math.random() * 4.0 : 8.0 + Math.random() * 12.0;
      const tx = Math.floor(center.x + Math.cos(angle) * dist);
      const tz = Math.floor(center.z + Math.sin(angle) * dist);

      for (let ty = Math.min(60, Math.floor(center.y) + 6); ty >= Math.max(4, Math.floor(center.y) - 8); ty--) {
        const floor = this.world.getBlock(tx, ty, tz);
        const air1 = this.world.getBlock(tx, ty + 1, tz);
        const air2 = this.world.getBlock(tx, ty + 2, tz);
        const air3 = this.world.getBlock(tx, ty + 3, tz);

        if (floor !== BLOCK.AIR && floor !== BLOCK.WATER && floor !== BLOCK.LAVA && air1 === BLOCK.AIR && air2 === BLOCK.AIR && air3 === BLOCK.AIR) {
          mob.pos.set(tx + 0.5, ty + 1.05, tz + 0.5);
          mob.vel.set(0, 0, 0);
          mob.group.position.copy(mob.pos);
          this.audio.endermanTeleport();
          return true;
        }
      }
    }
    return false;
  }

  shootEnderPearl(origin: THREE.Vector3, direction: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(0.14, 8, 8);
    const mesh = new THREE.Mesh(geo, this.matPearl);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.pearls.push({
      mesh,
      pos: origin.clone(),
      vel: direction.clone().normalize().multiplyScalar(24.0),
    });
  }

  private updatePearls(dt: number, onPlayerTeleport?: (pos: THREE.Vector3) => void) {
    for (let i = this.pearls.length - 1; i >= 0; i--) {
      const p = this.pearls[i];
      p.vel.y -= 18.0 * dt; // gravity arc
      const step = p.vel.clone().multiplyScalar(dt);
      const nextPos = p.pos.clone().add(step);

      const bx = Math.floor(nextPos.x);
      const by = Math.floor(nextPos.y);
      const bz = Math.floor(nextPos.z);
      const b = this.world.getBlock(bx, by, bz);

      if (b !== BLOCK.AIR && b !== BLOCK.WATER && BLOCK_DEFS[b]?.solid) {
        this.scene.remove(p.mesh);
        this.pearls.splice(i, 1);
        onPlayerTeleport?.(nextPos);
        continue;
      }

      let hitMob = false;
      for (const mob of this.mobs) {
        if (!mob.dead && nextPos.distanceTo(mob.pos.clone().add(new THREE.Vector3(0, 1.0, 0))) < 1.0) {
          this.scene.remove(p.mesh);
          this.pearls.splice(i, 1);
          onPlayerTeleport?.(nextPos);
          hitMob = true;
          break;
        }
      }
      if (hitMob) continue;

      p.pos.copy(nextPos);
      p.mesh.position.copy(p.pos);
    }
  }

  // --------------------------------------------------------------------------
  // ARROW SHOOTING & PROJECTILES
  // --------------------------------------------------------------------------
  shootArrow(origin: THREE.Vector3, direction: THREE.Vector3, shooter: "player" | "skeleton") {
    const arrowGroup = new THREE.Group();

    // Shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.65), this.matWoodBow);
    arrowGroup.add(shaft);

    // Tip
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), this.matBoneDark);
    tip.position.set(0, 0, -0.34);
    arrowGroup.add(tip);

    // Fletching (white feathers)
    const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), this.matSheepWool);
    fletch.position.set(0, 0, 0.3);
    arrowGroup.add(fletch);

    arrowGroup.position.copy(origin);
    arrowGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction.clone().normalize());

    this.scene.add(arrowGroup);

    const speed = shooter === "player" ? 28 : 18;
    this.arrows.push({
      mesh: arrowGroup,
      pos: origin.clone(),
      vel: direction.clone().normalize().multiplyScalar(speed),
      shooter,
      stuck: false,
      stuckTimer: 0,
    });
  }

  // --------------------------------------------------------------------------
  // UPDATE LOOP (AI, PHYSICS & COMBAT)
  // --------------------------------------------------------------------------
  update(
    dt: number,
    playerPos: THREE.Vector3,
    isDay: boolean,
    onPlayerDamage: (dmg: number) => void,
    onMobDefeated: (drops: Array<{ item: ItemId; count: number }>, pos: THREE.Vector3, xp: number) => void,
    onExplosion: (x: number, y: number, z: number) => void,
    playerLookDir?: THREE.Vector3,
    onPlayerTeleport?: (pos: THREE.Vector3) => void,
  ) {
    // 1) Natural Mob Spawning around player (up to 16 active mobs)
    this.spawnTimer += dt;
    if (this.spawnTimer > 4.5 && this.mobs.length < 16) {
      this.spawnTimer = 0;
      this.tryNaturalSpawn(playerPos, isDay);
    }

    // 2) Update Mobs
    const walkAnimTime = performance.now() * 0.007;

    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];

      // Death animation
      if (mob.dead) {
        mob.deathTimer += dt;
        mob.group.rotation.z = Math.min(Math.PI / 2, mob.deathTimer * 3.5);
        if (mob.deathTimer > 0.6) {
          this.scene.remove(mob.group);
          this.mobs.splice(i, 1);
        }
        continue;
      }

      // Hurt flash recovery
      if (mob.hurtTimer > 0) {
        mob.hurtTimer -= dt;
        if (mob.hurtTimer <= 0) {
          mob.originalColors.forEach((color, mesh) => {
            (mesh.material as THREE.MeshLambertMaterial).color.copy(color);
          });
        }
      }

      // Fire Aspect / Burn Tick
      if (mob.burnTimer && mob.burnTimer > 0) {
        mob.burnTimer -= dt;
        mob.burnTickTimer = (mob.burnTickTimer || 0) + dt;
        if (mob.burnTickTimer >= 0.6) {
          mob.burnTickTimer = 0;
          this.applyDamageToMob(mob, 1, onMobDefeated);
        }
      }

      // Distance to player
      const distToPlayer = mob.pos.distanceTo(playerPos);

      // Ghast Floating AI
      if (mob.type === "ghast") {
        mob.vel.y = Math.sin(performance.now() * 0.002 + mob.pos.x) * 0.8;
        if (distToPlayer < 24) {
          const dir = playerPos.clone().sub(mob.pos).normalize();
          mob.yaw = Math.atan2(dir.x, dir.z);
          mob.vel.x = dir.x * 1.5;
          mob.vel.z = dir.z * 1.5;
          if (distToPlayer < 2.0 && mob.attackCooldown <= 0) {
            mob.attackCooldown = 1.5;
            onPlayerDamage(4);
          }
        }
        mob.pos.addScaledVector(mob.vel, dt);
        mob.group.position.copy(mob.pos);
        mob.group.rotation.y = mob.yaw;
        if (mob.limbs.tentacles) {
          const tentTime = performance.now() * 0.005;
          mob.limbs.tentacles.forEach((tent, idx) => {
            tent.rotation.x = Math.sin(tentTime + idx * 0.7) * 0.25;
          });
        }
        continue;
      }

      // Daylight burning for surface zombies and skeletons
      if (isDay && (mob.type === "zombie" || mob.type === "skeleton")) {
        const topBlock = this.world.getBlock(Math.floor(mob.pos.x), Math.floor(mob.pos.y + 2), Math.floor(mob.pos.z));
        if (topBlock === BLOCK.AIR && mob.pos.y > 22) {
          // In direct open daylight: burns!
          this.applyDamageToMob(mob, dt * 3.5, onMobDefeated);
        }
      }

      // AI Decision Tree
      mob.stateTimer -= dt;
      mob.attackCooldown -= dt;

      if (mob.isHostile) {
        if (distToPlayer < 18) {
          mob.state = "chase";
          // Face player
          const dirToPlayer = playerPos.clone().sub(mob.pos);
          mob.yaw = Math.atan2(dirToPlayer.x, dirToPlayer.z);

          if (mob.type === "creeper" && distToPlayer < 3.2) {
            // Creeper fuse ignition
            mob.state = "fuse";
            mob.fuseTimer += dt;
            mob.vel.x = 0;
            mob.vel.z = 0;

            // Flash white/green
            const flash = Math.sin(mob.fuseTimer * Math.PI * 10) > 0;
            mob.group.scale.setScalar(1.0 + mob.fuseTimer * 0.22);
            mob.originalColors.forEach((_, mesh) => {
              (mesh.material as THREE.MeshLambertMaterial).color.setHex(flash ? 0xffffff : 0x489635);
            });

            if (mob.fuseTimer >= 1.5) {
              // DETONATE!
              this.scene.remove(mob.group);
              this.mobs.splice(i, 1);
              onExplosion(Math.floor(mob.pos.x), Math.floor(mob.pos.y), Math.floor(mob.pos.z));
              continue;
            }
          } else if (mob.type === "creeper") {
            mob.fuseTimer = Math.max(0, mob.fuseTimer - dt * 2);
            mob.group.scale.setScalar(1.0);
          }

          if (mob.type === "skeleton" && distToPlayer < 14 && distToPlayer > 4) {
            // Skeleton ranged bow attack
            mob.vel.x *= 0.5;
            mob.vel.z *= 0.5;
            if (mob.attackCooldown <= 0) {
              mob.attackCooldown = 2.4;
              const arrowOrigin = mob.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
              const arrowDir = playerPos.clone().add(new THREE.Vector3(0, 0.8, 0)).sub(arrowOrigin).normalize();
              this.shootArrow(arrowOrigin, arrowDir, "skeleton");
              this.audio.jump(); // bow shoot twang
            }
          } else if (mob.state === "chase") {
            // Chase player forward
            const speed = mob.type === "zombie" ? 2.8 : mob.type === "creeper" ? 3.4 : mob.type === "pigman" ? 3.6 : mob.type === "enderman" ? 4.8 : 3.0;
            mob.vel.x = Math.sin(mob.yaw) * speed;
            mob.vel.z = Math.cos(mob.yaw) * speed;

            // Melee contact attack on player
            if (distToPlayer < 1.4 && mob.attackCooldown <= 0 && mob.type !== "creeper") {
              mob.attackCooldown = 1.1;
              const dmg = mob.type === "enderman" ? 7 : mob.type === "pigman" ? 5 : mob.type === "zombie" ? 3 : 2;
              onPlayerDamage(dmg);
              if (mob.type === "enderman" && Math.random() < 0.45) {
                this.teleportEnderman(mob, playerPos);
              }
            }
          }
        } else {
          mob.state = "wander";
        }
      }

      // Enderman Neutral Stare Detection & Water Damage
      if (mob.type === "enderman") {
        const blockFeet = this.world.getBlock(Math.floor(mob.pos.x), Math.floor(mob.pos.y), Math.floor(mob.pos.z));
        if (blockFeet === BLOCK.WATER) {
          mob.health -= dt * 6;
          this.audio.splash();
          this.teleportEnderman(mob);
        }

        if (!mob.isHostile && playerLookDir) {
          const headPos = mob.pos.clone().add(new THREE.Vector3(0, 2.45, 0));
          const toHead = headPos.clone().sub(playerPos.clone().add(new THREE.Vector3(0, 1.6, 0)));
          const dist = toHead.length();
          if (dist < 28) {
            toHead.normalize();
            if (playerLookDir.dot(toHead) > 0.978) {
              mob.isHostile = true;
              mob.state = "chase";
              this.audio.endermanStare();
              this.teleportEnderman(mob, playerPos);
            }
          }
        }
      }

      // Iron Golem AI (Protector of Villagers)
      if (mob.type === "iron_golem") {
        let threat: MobEntity | null = null;
        let minDist = 16;
        for (const other of this.mobs) {
          if (!other.dead && (other.type === "zombie" || other.type === "skeleton" || other.type === "creeper")) {
            const d = other.pos.distanceTo(mob.pos);
            if (d < minDist) {
              minDist = d;
              threat = other;
            }
          }
        }

        if (threat) {
          mob.state = "chase";
          const dir = threat.pos.clone().sub(mob.pos);
          mob.yaw = Math.atan2(dir.x, dir.z);
          const speed = 3.2;
          mob.vel.x = Math.sin(mob.yaw) * speed;
          mob.vel.z = Math.cos(mob.yaw) * speed;

          if (minDist < 2.0 && mob.attackCooldown <= 0) {
            mob.attackCooldown = 1.0;
            // Uppercut fling!
            threat.vel.y = 8.5;
            threat.vel.x = Math.sin(mob.yaw) * 4.5;
            threat.vel.z = Math.cos(mob.yaw) * 4.5;
            this.applyDamageToMob(threat, 18, onMobDefeated);
            this.audio.ironGolemHit();
            if (mob.limbs.rightArm) mob.limbs.rightArm.rotation.x = -Math.PI * 0.7;
          }
        } else {
          // Wander peacefully around village
          if (mob.stateTimer <= 0) {
            mob.stateTimer = 4.0 + Math.random() * 5.0;
            mob.yaw = Math.random() * Math.PI * 2;
          }
          const speed = 0.9;
          mob.vel.x = Math.sin(mob.yaw) * speed;
          mob.vel.z = Math.cos(mob.yaw) * speed;
        }
      }

      // Passive mob or non-chasing wander
      if (mob.type === "villager") {
        let zombieThreat: MobEntity | null = null;
        for (const other of this.mobs) {
          if (!other.dead && other.type === "zombie" && other.pos.distanceTo(mob.pos) < 10) {
            zombieThreat = other;
            break;
          }
        }
        if (zombieThreat) {
          mob.state = "flee";
          const fleeDir = mob.pos.clone().sub(zombieThreat.pos);
          mob.yaw = Math.atan2(fleeDir.x, fleeDir.z);
          mob.vel.x = Math.sin(mob.yaw) * 3.2;
          mob.vel.z = Math.cos(mob.yaw) * 3.2;
        } else if (distToPlayer < 3.2) {
          const dirToPlayer = playerPos.clone().sub(mob.pos);
          mob.yaw = Math.atan2(dirToPlayer.x, dirToPlayer.z);
          mob.vel.x = 0;
          mob.vel.z = 0;
        } else {
          if (mob.stateTimer <= 0) {
            mob.stateTimer = 4.0 + Math.random() * 6.0;
            mob.yaw = Math.random() * Math.PI * 2;
          }
          const speed = 1.0;
          mob.vel.x = Math.sin(mob.yaw) * speed;
          mob.vel.z = Math.cos(mob.yaw) * speed;
        }
      } else if (mob.state === "wander") {
        if (mob.stateTimer <= 0) {
          mob.stateTimer = 3.0 + Math.random() * 5.0;
          mob.yaw = Math.random() * Math.PI * 2;
        }
        const speed = 1.2;
        mob.vel.x = Math.sin(mob.yaw) * speed;
        mob.vel.z = Math.cos(mob.yaw) * speed;
      }

      // Gravity & Terrain collision for mob
      mob.vel.y -= 22.0 * dt;
      this.moveMobWithCollision(mob, dt);

      // Update Group transform
      mob.group.position.copy(mob.pos);
      mob.group.rotation.y = mob.yaw;

      // Limb walking animation
      const hSpeed = Math.hypot(mob.vel.x, mob.vel.z);
      if (hSpeed > 0.2 && mob.onGround) {
        const swing = Math.sin(walkAnimTime * 8) * 0.45;
        if (mob.limbs.leftLeg) mob.limbs.leftLeg.rotation.x = swing;
        if (mob.limbs.rightLeg) mob.limbs.rightLeg.rotation.x = -swing;
        if (mob.limbs.legFL) mob.limbs.legFL.rotation.x = swing;
        if (mob.limbs.legFR) mob.limbs.legFR.rotation.x = -swing;
        if (mob.limbs.legBL) mob.limbs.legBL.rotation.x = -swing;
        if (mob.limbs.legBR) mob.limbs.legBR.rotation.x = swing;
      } else {
        if (mob.limbs.leftLeg) mob.limbs.leftLeg.rotation.x = 0;
        if (mob.limbs.rightLeg) mob.limbs.rightLeg.rotation.x = 0;
      }
    }

    // 3) Update Arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arr = this.arrows[i];
      if (arr.stuck) {
        arr.stuckTimer += dt;
        if (arr.stuckTimer > 15) {
          this.scene.remove(arr.mesh);
          this.arrows.splice(i, 1);
        }
        continue;
      }

      // Arrow Physics
      arr.vel.y -= 14.0 * dt; // gravity arc
      const step = arr.vel.clone().multiplyScalar(dt);
      const nextPos = arr.pos.clone().add(step);

      // Check collision against world voxels
      const bx = Math.floor(nextPos.x);
      const by = Math.floor(nextPos.y);
      const bz = Math.floor(nextPos.z);
      const block = this.world.getBlock(bx, by, bz);

      if (block !== BLOCK.AIR && block !== BLOCK.WATER && BLOCK_DEFS[block]?.solid) {
        // Arrow sticks into block
        arr.stuck = true;
        arr.pos.copy(nextPos);
        arr.mesh.position.copy(arr.pos);
        this.audio.hitBlock("wood");
        continue;
      }

      // Enderman dodges incoming arrows
      for (const mob of this.mobs) {
        if (!mob.dead && mob.type === "enderman" && nextPos.distanceTo(mob.pos.clone().add(new THREE.Vector3(0, 1.5, 0))) < 3.2) {
          this.teleportEnderman(mob);
        }
      }

      // Check collision against Player (if shot by Skeleton)
      if (arr.shooter === "skeleton") {
        if (nextPos.distanceTo(playerPos.clone().add(new THREE.Vector3(0, 0.9, 0))) < 0.75) {
          onPlayerDamage(4); // 2 hearts damage from arrow
          this.scene.remove(arr.mesh);
          this.arrows.splice(i, 1);
          continue;
        }
      }

      // Check collision against Mobs (if shot by Player)
      if (arr.shooter === "player") {
        let hitMob = false;
        for (const mob of this.mobs) {
          if (!mob.dead && nextPos.distanceTo(mob.pos.clone().add(new THREE.Vector3(0, 0.9, 0))) < 0.85) {
            this.applyDamageToMob(mob, 8, onMobDefeated);
            this.scene.remove(arr.mesh);
            this.arrows.splice(i, 1);
            hitMob = true;
            break;
          }
        }
        if (hitMob) continue;
      }

      // Move arrow
      arr.pos.copy(nextPos);
      arr.mesh.position.copy(arr.pos);
      arr.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), arr.vel.clone().normalize());
    }

    // 4) Update Ender Pearls
    this.updatePearls(dt, onPlayerTeleport);
  }

  // --------------------------------------------------------------------------
  // MOB HIT & DAMAGE
  // --------------------------------------------------------------------------
  applyDamageToMob(
    mob: MobEntity,
    damage: number,
    onMobDefeated: (drops: Array<{ item: ItemId; count: number }>, pos: THREE.Vector3, xp: number) => void,
  ) {
    if (mob.dead) return;

    mob.health -= damage;
    mob.hurtTimer = 0.28;
    this.audio.hurt();

    // Flash red
    mob.originalColors.forEach((_, mesh) => {
      (mesh.material as THREE.MeshLambertMaterial).color.setHex(0xff3333);
    });

    if (mob.type === "pigman") {
      mob.isHostile = true;
      mob.state = "chase";
    }

    if (mob.type === "enderman" && mob.health > 0) {
      mob.isHostile = true;
      mob.state = "chase";
      if (Math.random() < 0.7) {
        this.teleportEnderman(mob);
      }
    }

    if (mob.type === "iron_golem" && mob.health > 0) {
      mob.isHostile = true;
      mob.state = "chase";
    }

    if (mob.health <= 0) {
      mob.dead = true;
      mob.deathTimer = 0;

      // Determine drops
      const drops: Array<{ item: ItemId; count: number }> = [];
      switch (mob.type) {
        case "zombie":
          drops.push({ item: "rotten_flesh", count: 1 + Math.floor(Math.random() * 2) });
          break;
        case "skeleton":
          drops.push({ item: "bone", count: 1 + Math.floor(Math.random() * 2) });
          drops.push({ item: "arrow", count: 1 + Math.floor(Math.random() * 3) });
          break;
        case "creeper":
          drops.push({ item: "gunpowder", count: 1 + Math.floor(Math.random() * 2) });
          break;
        case "pig":
          drops.push({ item: "raw_porkchop", count: 1 + Math.floor(Math.random() * 3) });
          break;
        case "cow":
          drops.push({ item: "raw_beef", count: 1 + Math.floor(Math.random() * 3) });
          drops.push({ item: "leather", count: Math.random() > 0.4 ? 1 : 0 });
          break;
        case "sheep":
          drops.push({ item: "wool", count: 1 + Math.floor(Math.random() * 2) });
          break;
        case "pigman":
          drops.push({ item: "rotten_flesh", count: 1 + Math.floor(Math.random() * 2) });
          drops.push({ item: "gold_ingot", count: 1 });
          if (Math.random() < 0.25) drops.push({ item: "golden_sword", count: 1 });
          break;
        case "ghast":
          drops.push({ item: "gunpowder", count: 2 + Math.floor(Math.random() * 3) });
          break;
        case "villager":
          drops.push({ item: "item_emerald", count: 1 });
          if (Math.random() < 0.6) drops.push({ item: "bread", count: 1 + Math.floor(Math.random() * 2) });
          break;
        case "enderman":
          drops.push({ item: "ender_pearl", count: 1 + (Math.random() < 0.5 ? 1 : 0) });
          break;
        case "iron_golem":
          drops.push({ item: "iron_ingot", count: 3 + Math.floor(Math.random() * 3) });
          drops.push({ item: "poppy", count: 1 + Math.floor(Math.random() * 2) });
          break;
      }

      const isHostile =
        mob.type === "zombie" ||
        mob.type === "skeleton" ||
        mob.type === "creeper" ||
        mob.type === "pigman" ||
        mob.type === "ghast" ||
        mob.type === "enderman";
      const xp = isHostile ? 5 : 2;
      onMobDefeated(drops.filter((d) => d.count > 0), mob.pos.clone(), xp);
    }
  }

  // Raycast attack from player against mobs
  attackRaycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    damage: number,
    onMobDefeated: (drops: Array<{ item: ItemId; count: number }>, pos: THREE.Vector3, xp: number) => void,
    enchantments?: Record<string, number>,
  ): boolean {
    let closestMob: MobEntity | null = null;
    let closestDist = 4.2;

    for (const mob of this.mobs) {
      if (mob.dead) continue;
      const mobCenter = mob.pos.clone().add(new THREE.Vector3(0, 0.9, 0));
      const dist = origin.distanceTo(mobCenter);
      if (dist < closestDist) {
        // Line-sphere intersection
        const toMob = mobCenter.clone().sub(origin);
        const proj = toMob.dot(direction);
        if (proj > 0) {
          const perp = toMob.sub(direction.clone().multiplyScalar(proj)).length();
          if (perp < 0.75) {
            closestMob = mob;
            closestDist = dist;
          }
        }
      }
    }

    if (closestMob) {
      this.applyDamageToMob(closestMob, damage, onMobDefeated);
      // Knockback multiplier
      const kbMult = enchantments?.knockback ? 1.0 + enchantments.knockback * 0.75 : 1.0;
      closestMob.vel.addScaledVector(direction, 6.5 * kbMult);
      closestMob.vel.y = 4.2;
      // Fire aspect
      if (enchantments?.fire_aspect) {
        closestMob.burnTimer = enchantments.fire_aspect * 3.5;
        closestMob.burnTickTimer = 0;
      }
      return true;
    }
    return false;
  }

  // Raycast interaction (e.g. trading with Villagers)
  interactRaycast(origin: THREE.Vector3, direction: THREE.Vector3): MobEntity | null {
    let closestMob: MobEntity | null = null;
    let closestDist = 4.2;

    for (const mob of this.mobs) {
      if (mob.dead || mob.type !== "villager") continue;
      const mobCenter = mob.pos.clone().add(new THREE.Vector3(0, 0.9, 0));
      const dist = origin.distanceTo(mobCenter);
      if (dist < closestDist) {
        const toMob = mobCenter.clone().sub(origin);
        const proj = toMob.dot(direction);
        if (proj > 0) {
          const perp = toMob.sub(direction.clone().multiplyScalar(proj)).length();
          if (perp < 0.75) {
            closestMob = mob;
            closestDist = dist;
          }
        }
      }
    }
    return closestMob;
  }

  // --------------------------------------------------------------------------
  // TERRAIN COLLISION & SPAWN
  // --------------------------------------------------------------------------
  private moveMobWithCollision(mob: MobEntity, dt: number) {
    // Y resolution
    const targetY = mob.pos.y + mob.vel.y * dt;
    const checkY = Math.floor(targetY);
    const minX = Math.floor(mob.pos.x - 0.28);
    const maxX = Math.floor(mob.pos.x + 0.28);
    const minZ = Math.floor(mob.pos.z - 0.28);
    const maxZ = Math.floor(mob.pos.z + 0.28);

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

    if (landed && mob.vel.y <= 0) {
      mob.pos.y = checkY + 1.0;
      mob.vel.y = 0;
      mob.onGround = true;
    } else {
      mob.pos.y = targetY;
      mob.onGround = false;
    }

    // X and Z movement with step-up
    const nextX = mob.pos.x + mob.vel.x * dt;
    if (!this.checkMobCollisionAt(nextX, mob.pos.y, mob.pos.z)) {
      mob.pos.x = nextX;
    } else if (mob.onGround && !this.checkMobCollisionAt(nextX, mob.pos.y + 1.05, mob.pos.z)) {
      mob.pos.x = nextX;
      mob.pos.y += 1.05; // Step up voxel!
    } else {
      mob.vel.x = 0;
      mob.yaw += Math.PI / 2; // Turn around obstacle
    }

    const nextZ = mob.pos.z + mob.vel.z * dt;
    if (!this.checkMobCollisionAt(mob.pos.x, mob.pos.y, nextZ)) {
      mob.pos.z = nextZ;
    } else if (mob.onGround && !this.checkMobCollisionAt(mob.pos.x, mob.pos.y + 1.05, nextZ)) {
      mob.pos.z = nextZ;
      mob.pos.y += 1.05;
    } else {
      mob.vel.z = 0;
      mob.yaw += Math.PI / 2;
    }
  }

  private checkMobCollisionAt(x: number, y: number, z: number): boolean {
    const minX = Math.floor(x - 0.28);
    const maxX = Math.floor(x + 0.28);
    const minY = Math.floor(y + 0.2);
    const maxY = Math.floor(y + 1.5);
    const minZ = Math.floor(z - 0.28);
    const maxZ = Math.floor(z + 0.28);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          const b = this.world.getBlock(bx, by, bz);
          if (b !== BLOCK.AIR && b !== BLOCK.WATER && BLOCK_DEFS[b]?.solid) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private tryNaturalSpawn(playerPos: THREE.Vector3, isDay: boolean) {
    if (this.world.dimension === "nether") {
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 20;
      const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
      const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);
      for (let y = 50; y >= 14; y--) {
        const b = this.world.getBlock(sx, y, sz);
        const above1 = this.world.getBlock(sx, y + 1, sz);
        const above2 = this.world.getBlock(sx, y + 2, sz);
        if (b !== BLOCK.AIR && b !== BLOCK.LAVA && above1 === BLOCK.AIR && above2 === BLOCK.AIR) {
          const r = Math.random();
          if (r < 0.65) {
            this.spawnMob("pigman", sx + 0.5, y + 1.05, sz + 0.5);
          } else if (r < 0.85) {
            this.spawnMob("ghast", sx + 0.5, Math.min(45, y + 5), sz + 0.5);
          } else {
            this.spawnMob("enderman", sx + 0.5, y + 1.05, sz + 0.5);
          }
          break;
        }
      }
      return;
    }

    // Pick random location around player between 16 and 38 blocks away
    const angle = Math.random() * Math.PI * 2;
    const dist = 16 + Math.random() * 22;
    const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
    const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);

    // Find top solid ground
    for (let y = 56; y >= 4; y--) {
      const b = this.world.getBlock(sx, y, sz);
      const above1 = this.world.getBlock(sx, y + 1, sz);
      const above2 = this.world.getBlock(sx, y + 2, sz);

      if (b !== BLOCK.AIR && b !== BLOCK.WATER && above1 === BLOCK.AIR && above2 === BLOCK.AIR) {
        if (!isDay || y < 22) {
          // Nighttime surface or underground dark cave: spawn hostile mob!
          const r = Math.random();
          const type: MobType = r < 0.38 ? "zombie" : r < 0.65 ? "skeleton" : r < 0.86 ? "creeper" : "enderman";
          this.spawnMob(type, sx + 0.5, y + 1.05, sz + 0.5);
        } else if (b === BLOCK.GRASS) {
          // Daylight surface grass: spawn peaceful animal!
          const r = Math.random();
          const type: MobType = r < 0.38 ? "pig" : r < 0.72 ? "cow" : "sheep";
          this.spawnMob(type, sx + 0.5, y + 1.05, sz + 0.5);
        }
        break;
      }
    }
  }

  dispose() {
    for (const mob of this.mobs) {
      this.scene.remove(mob.group);
    }
    this.mobs = [];
    for (const arr of this.arrows) {
      this.scene.remove(arr.mesh);
    }
    this.arrows = [];
    for (const p of this.pearls) {
      this.scene.remove(p.mesh);
    }
    this.pearls = [];
  }
}
