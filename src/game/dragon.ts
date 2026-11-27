import * as THREE from "three";
import { type InfiniteWorld } from "./world";
import { BLOCK } from "./blocks";
import { type GameAudio } from "./audio";

export interface EnderCrystalEntity {
  id: string;
  pos: THREE.Vector3;
  group: THREE.Group;
  baseMesh: THREE.Mesh;
  glassMesh: THREE.Mesh;
  coreMesh: THREE.Mesh;
  alive: boolean;
}

export class EnderDragonBoss {
  world: InfiniteWorld;
  scene: THREE.Scene;
  audio: GameAudio;

  group: THREE.Group;
  head: THREE.Object3D;
  body: THREE.Object3D;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  tailSegments: THREE.Object3D[] = [];

  pos: THREE.Vector3 = new THREE.Vector3(0, 42, 0);
  vel: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  yaw = 0;
  pitch = 0;
  roll = 0;

  health = 200;
  maxHealth = 200;
  alive = true;
  hurtTimer = 0;

  state: "circling" | "dive" | "perch" | "dying" = "circling";
  stateTimer = 0;
  circleAngle = 0;
  circleRadius = 32;
  altitude = 42;
  flapTimer = 0;
  deathTimer = 0;

  crystals: EnderCrystalEntity[] = [];
  healingCrystal: EnderCrystalEntity | null = null;
  tetherLine: THREE.Line | null = null;

  breathParticles: Array<{
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    life: number;
    maxLife: number;
  }> = [];

  // Materials
  private matDragonBody = new THREE.MeshLambertMaterial({ color: 0x18181b });
  private matDragonBelly = new THREE.MeshLambertMaterial({ color: 0x27272a });
  private matDragonEyes = new THREE.MeshLambertMaterial({ color: 0xd946ef, emissive: 0x9333ea });
  private matDragonHorns = new THREE.MeshLambertMaterial({ color: 0x3f3f46 });
  private matDragonWingBone = new THREE.MeshLambertMaterial({ color: 0x1e1b4b });
  private matDragonWingMembrane = new THREE.MeshLambertMaterial({
    color: 0x4c1d95,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });

  private matCrystalBase = new THREE.MeshLambertMaterial({ color: 0x111827 });
  private matCrystalGlass = new THREE.MeshLambertMaterial({
    color: 0xe0e7ff,
    transparent: true,
    opacity: 0.55,
  });
  private matCrystalCore = new THREE.MeshLambertMaterial({
    color: 0xd946ef,
    emissive: 0xc084fc,
  });
  private matBreath = new THREE.MeshLambertMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    transparent: true,
    opacity: 0.75,
  });

  private onVictoryCallback?: () => void;

  constructor(world: InfiniteWorld, scene: THREE.Scene, audio: GameAudio, onVictory?: () => void) {
    this.world = world;
    this.scene = scene;
    this.audio = audio;
    this.onVictoryCallback = onVictory;

    this.group = new THREE.Group();
    const limbs = this.buildDragonModel();
    this.head = limbs.head;
    this.body = limbs.body;
    this.leftWing = limbs.leftWing;
    this.rightWing = limbs.rightWing;
    this.tailSegments = limbs.tail;

    this.group.position.copy(this.pos);
    this.scene.add(this.group);

    // Tether Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xd946ef, linewidth: 2 });
    this.tetherLine = new THREE.Line(lineGeo, lineMat);
    this.tetherLine.visible = false;
    this.scene.add(this.tetherLine);

    this.spawnCrystalsOnPillars();
  }

  // --------------------------------------------------------------------------
  // MODEL GENERATION
  // --------------------------------------------------------------------------
  private buildDragonModel() {
    // Torso / Body: 2.2 x 1.5 x 3.6
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 3.6), this.matDragonBody);
    body.position.set(0, 0, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    // Underbelly plate
    const belly = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 3.2), this.matDragonBelly);
    belly.position.set(0, -0.7, 0);
    this.group.add(belly);

    // Neck segments (3 segments extending forward)
    let neckAttach = body;
    let prevZ = 1.8;
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(1.2 - i * 0.1, 1.1 - i * 0.1, 1.0), this.matDragonBody);
      seg.position.set(0, 0.2 + i * 0.2, prevZ + 0.5);
      this.group.add(seg);
      prevZ += 0.9;
    }

    // Head
    const head = new THREE.Group();
    head.position.set(0, 0.9, prevZ + 0.6);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.4), this.matDragonBody);
    skull.position.set(0, 0, 0);
    head.add(skull);

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 1.1), this.matDragonBody);
    snout.position.set(0, -0.15, 1.1);
    head.add(snout);

    // Horns
    const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), this.matDragonHorns);
    hornL.position.set(-0.45, 0.6, -0.4);
    hornL.rotation.x = -0.4;
    head.add(hornL);

    const hornR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), this.matDragonHorns);
    hornR.position.set(0.45, 0.6, -0.4);
    hornR.rotation.x = -0.4;
    head.add(hornR);

    // Glowing purple eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), this.matDragonEyes);
    eyeL.position.set(-0.52, 0.15, 0.71);
    head.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), this.matDragonEyes);
    eyeR.position.set(0.52, 0.15, 0.71);
    head.add(eyeR);

    this.group.add(head);

    // Wings
    // Left Wing
    const leftWing = new THREE.Group();
    leftWing.position.set(-1.1, 0.4, 0.2);

    const boneL = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 0.22), this.matDragonWingBone);
    boneL.position.set(-1.8, 0, 0);
    leftWing.add(boneL);

    const membraneL = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), this.matDragonWingMembrane);
    membraneL.position.set(-1.8, 0, -1.0);
    membraneL.rotation.x = Math.PI / 2;
    leftWing.add(membraneL);

    this.group.add(leftWing);

    // Right Wing
    const rightWing = new THREE.Group();
    rightWing.position.set(1.1, 0.4, 0.2);

    const boneR = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 0.22), this.matDragonWingBone);
    boneR.position.set(1.8, 0, 0);
    rightWing.add(boneR);

    const membraneR = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), this.matDragonWingMembrane);
    membraneR.position.set(1.8, 0, -1.0);
    membraneR.rotation.x = Math.PI / 2;
    rightWing.add(membraneR);

    this.group.add(rightWing);

    // Tail (4 segments tapering rearward)
    const tail: THREE.Object3D[] = [];
    let tailZ = -1.8;
    for (let i = 0; i < 4; i++) {
      const segW = 1.0 - i * 0.18;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, segW, 1.1), this.matDragonBody);
      seg.position.set(0, -0.1 * i, tailZ - 0.55);
      this.group.add(seg);
      tail.push(seg);
      tailZ -= 1.0;
    }

    return { head, body, leftWing, rightWing, tail };
  }

  // --------------------------------------------------------------------------
  // CRYSTAL SETUP
  // --------------------------------------------------------------------------
  private spawnCrystalsOnPillars() {
    // 8 Obsidian Pillar positions around End Island
    const radius = 28;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const px = Math.round(Math.cos(ang) * radius);
      const pz = Math.round(Math.sin(ang) * radius);
      // Top height of pillar
      const py = 48 + (i % 3) * 6;

      const group = new THREE.Group();
      group.position.set(px, py + 1, pz);

      // Bedrock pedestal
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.25, 0.85), this.matCrystalBase);
      baseMesh.position.set(0, 0.125, 0);
      group.add(baseMesh);

      // Outer glass cage
      const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), this.matCrystalGlass);
      glassMesh.position.set(0, 1.1, 0);
      group.add(glassMesh);

      // Inner glowing energy core
      const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), this.matCrystalCore);
      coreMesh.position.set(0, 1.1, 0);
      group.add(coreMesh);

      this.scene.add(group);

      this.crystals.push({
        id: `crystal_${i}`,
        pos: new THREE.Vector3(px, py + 1.1, pz),
        group,
        baseMesh,
        glassMesh,
        coreMesh,
        alive: true,
      });
    }
  }

  // --------------------------------------------------------------------------
  // UPDATE LOOP
  // --------------------------------------------------------------------------
  update(dt: number, playerPos: THREE.Vector3, onPlayerDamage: (dmg: number) => void) {
    // 1) Update Crystals
    this.crystals.forEach((c) => {
      if (!c.alive) return;
      c.coreMesh.rotation.y += dt * 2.5;
      c.coreMesh.rotation.x += dt * 1.8;
      c.glassMesh.rotation.y -= dt * 1.2;
      c.glassMesh.rotation.z += dt * 0.9;
      c.coreMesh.position.y = 1.1 + Math.sin(performance.now() * 0.005 + c.pos.x) * 0.15;
    });

    // 2) Update Dragon state machine
    if (this.health <= 0 && this.alive) {
      this.state = "dying";
      this.alive = false;
      this.deathTimer = 0;
      this.audio.dragonRoar();
    }

    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      this.matDragonBody.color.setHex(this.hurtTimer > 0 ? 0xef4444 : 0x18181b);
    }

    if (this.state === "dying") {
      this.updateDying(dt);
      return;
    }

    this.stateTimer += dt;
    this.flapTimer += dt;

    // Wing flap animation
    const flapCycle = Math.sin(this.flapTimer * 7.5);
    this.leftWing.rotation.z = flapCycle * 0.48;
    this.rightWing.rotation.z = -flapCycle * 0.48;

    if (flapCycle > 0.95 && Math.random() < 0.18) {
      this.audio.dragonFlap();
    }

    // Check healing tether from crystals
    this.updateCrystalTether(dt);

    switch (this.state) {
      case "circling": {
        this.circleAngle += dt * 0.35;
        const targetX = Math.cos(this.circleAngle) * this.circleRadius;
        const targetZ = Math.sin(this.circleAngle) * this.circleRadius;
        const targetY = this.altitude + Math.sin(this.circleAngle * 2) * 4;

        const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
        const toTarget = targetPos.clone().sub(this.pos);
        this.vel.lerp(toTarget.normalize().multiplyScalar(14.0), dt * 1.2);
        this.pos.addScaledVector(this.vel, dt);

        this.yaw = Math.atan2(this.vel.x, this.vel.z);
        this.pitch = -this.vel.y * 0.04;
        this.roll = -flapCycle * 0.15;

        // Transition to dive strafe or perch
        if (this.stateTimer > 18) {
          this.stateTimer = 0;
          if (Math.random() < 0.65) {
            this.state = "dive";
            this.audio.dragonRoar();
          } else {
            this.state = "perch";
          }
        }
        break;
      }

      case "dive": {
        // Swoop down at player
        const target = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
        const toPlayer = target.sub(this.pos);
        const dist = toPlayer.length();

        this.vel.lerp(toPlayer.normalize().multiplyScalar(19.0), dt * 2.2);
        this.pos.addScaledVector(this.vel, dt);

        this.yaw = Math.atan2(this.vel.x, this.vel.z);
        this.pitch = -this.vel.y * 0.05;

        // Emit dragon breath particles
        if (dist < 18) {
          this.spawnBreathParticle();
        }

        // Hit player on collision
        if (dist < 3.2) {
          onPlayerDamage(8);
          this.audio.hit();
          this.state = "circling";
          this.stateTimer = 0;
        } else if (dist < 5 || this.stateTimer > 7 || this.pos.y < 30) {
          this.state = "circling";
          this.stateTimer = 0;
        }
        break;
      }

      case "perch": {
        // Perch atop central bedrock fountain at (0, 34, 0)
        const perchPos = new THREE.Vector3(0, 34.5, 0);
        const toPerch = perchPos.clone().sub(this.pos);
        const dist = toPerch.length();

        if (dist > 2.0) {
          this.vel.lerp(toPerch.normalize().multiplyScalar(10.0), dt * 2.0);
          this.pos.addScaledVector(this.vel, dt);
          this.yaw = Math.atan2(this.vel.x, this.vel.z);
        } else {
          // Landed on perch: face player and breathe fire
          this.pos.copy(perchPos);
          this.vel.set(0, 0, 0);
          const dirToPlayer = playerPos.clone().sub(this.pos);
          this.yaw = THREE.MathUtils.lerp(this.yaw, Math.atan2(dirToPlayer.x, dirToPlayer.z), dt * 2.5);

          if (Math.random() < 0.35) {
            this.spawnBreathParticle();
          }

          if (this.stateTimer > 10) {
            this.state = "circling";
            this.stateTimer = 0;
            this.audio.dragonRoar();
          }
        }
        break;
      }
    }

    // Apply transform to group
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = this.pitch;
    this.group.rotation.z = this.roll;

    // Tail wavy animation
    this.tailSegments.forEach((seg, idx) => {
      seg.rotation.y = Math.sin(this.flapTimer * 5 + idx * 0.6) * 0.22;
    });

    // 3) Update Dragon Breath Particles
    this.updateBreath(dt, playerPos, onPlayerDamage);
  }

  // --------------------------------------------------------------------------
  // HEALING TETHER
  // --------------------------------------------------------------------------
  private updateCrystalTether(dt: number) {
    // Find closest alive crystal
    let nearest: EnderCrystalEntity | null = null;
    let nearestDist = Infinity;

    for (const c of this.crystals) {
      if (!c.alive) continue;
      const d = c.pos.distanceTo(this.pos);
      if (d < nearestDist && d < 48) {
        nearestDist = d;
        nearest = c;
      }
    }

    this.healingCrystal = nearest;

    if (nearest && this.tetherLine) {
      // Regenerate Dragon HP
      this.health = Math.min(this.maxHealth, this.health + dt * 2.5);
      this.tetherLine.visible = true;

      const positions = this.tetherLine.geometry.attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, nearest.pos.x, nearest.pos.y, nearest.pos.z);
      positions.setXYZ(1, this.pos.x, this.pos.y, this.pos.z);
      positions.needsUpdate = true;
    } else if (this.tetherLine) {
      this.tetherLine.visible = false;
    }
  }

  // --------------------------------------------------------------------------
  // BREATH ATTACK PARTICLES
  // --------------------------------------------------------------------------
  private spawnBreathParticle() {
    const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), this.matBreath);
    const snoutPos = this.pos.clone().add(new THREE.Vector3(Math.sin(this.yaw) * 3.5, 0.4, Math.cos(this.yaw) * 3.5));
    pMesh.position.copy(snoutPos);
    this.scene.add(pMesh);

    const spread = new THREE.Vector3((Math.random() - 0.5) * 6, -Math.random() * 4, (Math.random() - 0.5) * 6);
    const forward = new THREE.Vector3(Math.sin(this.yaw), -0.2, Math.cos(this.yaw)).multiplyScalar(12);
    const vel = forward.add(spread);

    this.breathParticles.push({
      mesh: pMesh,
      pos: snoutPos,
      vel,
      life: 0,
      maxLife: 3.5,
    });
  }

  private updateBreath(dt: number, playerPos: THREE.Vector3, onPlayerDamage: (dmg: number) => void) {
    for (let i = this.breathParticles.length - 1; i >= 0; i--) {
      const p = this.breathParticles[i];
      p.life += dt;
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 3.0 * dt; // slight gravity

      // Check ground collision
      if (p.pos.y <= 33) {
        p.pos.y = 33.1;
        p.vel.set(0, 0, 0); // pool on ground
      }

      p.mesh.position.copy(p.pos);
      p.mesh.scale.setScalar(1.0 + (p.life / p.maxLife) * 1.5);

      // Damage player if walking in breath
      if (p.pos.distanceTo(playerPos) < 1.6 && Math.random() < 0.25) {
        onPlayerDamage(3);
        this.audio.hit();
      }

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.breathParticles.splice(i, 1);
      }
    }
  }

  // --------------------------------------------------------------------------
  // COMBAT & RAYCASTING
  // --------------------------------------------------------------------------
  checkRaycast(origin: THREE.Vector3, dir: THREE.Vector3, damage: number): boolean {
    const ray = new THREE.Ray(origin, dir);

    // 1) Check Crystals first
    for (const c of this.crystals) {
      if (!c.alive) continue;
      const sphere = new THREE.Sphere(c.pos, 1.4);
      if (ray.intersectsSphere(sphere)) {
        // Destroy Crystal
        c.alive = false;
        c.group.visible = false;
        this.audio.crystalExplode();

        // If tethered, dragon takes big recoil damage
        if (this.healingCrystal === c) {
          this.applyDamage(25);
          this.audio.dragonRoar();
        }
        return true;
      }
    }

    // 2) Check Dragon Body & Head
    if (!this.alive) return false;

    const bodySphere = new THREE.Sphere(this.pos, 3.2);
    if (ray.intersectsSphere(bodySphere)) {
      this.applyDamage(damage);
      this.audio.hit();
      return true;
    }

    return false;
  }

  applyDamage(amount: number) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    this.hurtTimer = 0.25;
  }

  // --------------------------------------------------------------------------
  // DEATH & VICTORY SEQUENCE
  // --------------------------------------------------------------------------
  private updateDying(dt: number) {
    this.deathTimer += dt;

    // Ascend slowly and spin into beam of light
    this.pos.y += 2.5 * dt;
    this.yaw += 1.8 * dt;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;

    // White/Purple flash
    const flashCol = Math.sin(this.deathTimer * 15) > 0 ? 0xffffff : 0xd946ef;
    this.matDragonBody.color.setHex(flashCol);

    if (this.deathTimer >= 5.0) {
      // Completed death!
      this.scene.remove(this.group);
      if (this.tetherLine) this.scene.remove(this.tetherLine);

      // Play Victory Fanfare
      this.audio.victoryFanfare();

      // Place Dragon Egg and Exit Portal at center
      this.createExitPortal();

      // Trigger Victory Screen
      this.onVictoryCallback?.();
    }
  }

  private createExitPortal() {
    // Fill center bedrock exit fountain with End Portal blocks and place Egg
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.world.setBlock(dx, 33, dz, BLOCK.END_PORTAL);
      }
    }
    // Dragon egg atop bedrock pillar
    this.world.setBlock(0, 36, 0, BLOCK.DRAGON_EGG);
  }

  dispose() {
    this.scene.remove(this.group);
    if (this.tetherLine) this.scene.remove(this.tetherLine);
    this.crystals.forEach((c) => this.scene.remove(c.group));
    this.crystals = [];
    this.breathParticles.forEach((p) => this.scene.remove(p.mesh));
    this.breathParticles = [];
  }
}
