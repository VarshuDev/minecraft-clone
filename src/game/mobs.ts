import * as THREE from "three";
import { type InfiniteWorld } from "./world";
import { BLOCK, BLOCK_DEFS, type ItemId } from "./blocks";
import { type GameAudio } from "./audio";

export type MobType = "zombie" | "skeleton" | "creeper" | "pig" | "cow" | "sheep" | "pigman" | "ghast";

export interface MobEntity {
  id: string;
  type: MobType;
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

export class MobManager {
  world: InfiniteWorld;
  audio: GameAudio;
  scene: THREE.Scene;

  mobs: MobEntity[] = [];
  arrows: ArrowEntity[] = [];
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

  constructor(world: InfiniteWorld, scene: THREE.Scene, audio: GameAudio) {
    this.world = world;
    this.scene = scene;
    this.audio = audio;
  }

  // --------------------------------------------------------------------------
  // SPAWNING
  // --------------------------------------------------------------------------
  spawnMob(type: MobType, x: number, y: number, z: number): MobEntity {
    const group = new THREE.Group();
    const originalColors = new Map<THREE.Mesh, THREE.Color>();
    let limbs: MobEntity["limbs"];
    let maxHealth = 20;
    let isHostile = true;

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
    }

    group.position.set(x, y, z);
    this.scene.add(group);

    const mob: MobEntity = {
      id: `mob_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
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
            const speed = mob.type === "zombie" ? 2.8 : mob.type === "creeper" ? 3.4 : mob.type === "pigman" ? 3.6 : 3.0;
            mob.vel.x = Math.sin(mob.yaw) * speed;
            mob.vel.z = Math.cos(mob.yaw) * speed;

            // Melee contact attack on player
            if (distToPlayer < 1.35 && mob.attackCooldown <= 0 && mob.type !== "creeper") {
              mob.attackCooldown = 1.2;
              onPlayerDamage(mob.type === "pigman" ? 5 : mob.type === "zombie" ? 3 : 2);
            }
          }
        } else {
          mob.state = "wander";
        }
      }

      // Passive mob or non-chasing wander
      if (mob.state === "wander") {
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
      }

      const isHostile =
        mob.type === "zombie" ||
        mob.type === "skeleton" ||
        mob.type === "creeper" ||
        mob.type === "pigman" ||
        mob.type === "ghast";
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
      // Knockback
      closestMob.vel.addScaledVector(direction, 6.5);
      closestMob.vel.y = 4.2;
      return true;
    }
    return false;
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
          if (r < 0.72) {
            this.spawnMob("pigman", sx + 0.5, y + 1.05, sz + 0.5);
          } else {
            this.spawnMob("ghast", sx + 0.5, Math.min(45, y + 5), sz + 0.5);
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
          const type: MobType = r < 0.45 ? "zombie" : r < 0.75 ? "skeleton" : "creeper";
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
  }
}
