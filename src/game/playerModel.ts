import * as THREE from "three";
import { ITEMS, type ItemId } from "./blocks";

export interface PlayerArmorState {
  head: ItemId | null;
  chest: ItemId | null;
  legs: ItemId | null;
  feet: ItemId | null;
}

export class PlayerCharacterModel {
  group: THREE.Group;
  headGroup: THREE.Group;
  torsoGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;

  // Armor meshes
  helmetMesh: THREE.Mesh;
  chestplateMesh: THREE.Mesh;
  leftShoulderMesh: THREE.Mesh;
  rightShoulderMesh: THREE.Mesh;
  leftLeggingMesh: THREE.Mesh;
  rightLeggingMesh: THREE.Mesh;
  leftBootMesh: THREE.Mesh;
  rightBootMesh: THREE.Mesh;

  // Held item mount
  handItemMount: THREE.Group;
  currentHeldMesh: THREE.Object3D | null = null;
  lastHeldItem: ItemId | null = null;

  // Materials
  private matSteveSkin: THREE.MeshLambertMaterial;
  private matSteveShirt: THREE.MeshLambertMaterial;
  private matStevePants: THREE.MeshLambertMaterial;
  private matSteveShoes: THREE.MeshLambertMaterial;
  private matHead: THREE.MeshLambertMaterial;

  constructor() {
    this.group = new THREE.Group();

    // 1) Procedural Steve Face & Hair Canvas Texture
    const headCanvas = document.createElement("canvas");
    headCanvas.width = 64;
    headCanvas.height = 64;
    const hctx = headCanvas.getContext("2d")!;
    hctx.imageSmoothingEnabled = false;

    // Hair top & sides
    hctx.fillStyle = "#4a2c11";
    hctx.fillRect(0, 0, 64, 64);

    // Front face skin
    hctx.fillStyle = "#c8926b";
    hctx.fillRect(12, 16, 40, 44);

    // Hair bangs on forehead
    hctx.fillStyle = "#4a2c11";
    hctx.fillRect(16, 16, 32, 8);
    hctx.fillRect(20, 24, 24, 4);

    // Eyes: white sclera + blue pupils
    hctx.fillStyle = "#ffffff";
    hctx.fillRect(16, 30, 10, 6);
    hctx.fillRect(38, 30, 10, 6);
    hctx.fillStyle = "#2b4bc6";
    hctx.fillRect(20, 30, 6, 6);
    hctx.fillRect(38, 30, 6, 6);

    // Nose
    hctx.fillStyle = "#b47c55";
    hctx.fillRect(28, 38, 8, 5);

    // Mouth
    hctx.fillStyle = "#6d3830";
    hctx.fillRect(24, 46, 16, 4);
    hctx.fillStyle = "#8a4f44";
    hctx.fillRect(26, 50, 12, 3);

    const headTex = new THREE.CanvasTexture(headCanvas);
    headTex.magFilter = THREE.NearestFilter;
    headTex.minFilter = THREE.NearestFilter;
    headTex.colorSpace = THREE.SRGBColorSpace;

    this.matHead = new THREE.MeshLambertMaterial({ map: headTex });
    this.matSteveSkin = new THREE.MeshLambertMaterial({ color: 0xc8926b });
    this.matSteveShirt = new THREE.MeshLambertMaterial({ color: 0x009ea0 });
    this.matStevePants = new THREE.MeshLambertMaterial({ color: 0x2b3d8b });
    this.matSteveShoes = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });

    // 2) Head Group (pivots at neck y = 1.35)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.35, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), this.matHead);
    headMesh.position.set(0, 0.24, 0);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Helmet Armor Overlay
    const helmetGeo = new THREE.BoxGeometry(0.53, 0.53, 0.53);
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0xe6e6e6, transparent: true, opacity: 0.95 });
    this.helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
    this.helmetMesh.position.set(0, 0.25, 0);
    this.helmetMesh.visible = false;
    this.headGroup.add(this.helmetMesh);

    this.group.add(this.headGroup);

    // 3) Torso Group (center around y = 1.0)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 1.0, 0);
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.68, 0.24), this.matSteveShirt);
    bodyMesh.castShadow = true;
    this.torsoGroup.add(bodyMesh);

    // Chestplate Armor Overlay
    const chestGeo = new THREE.BoxGeometry(0.52, 0.72, 0.29);
    const chestMat = new THREE.MeshLambertMaterial({ color: 0xe6e6e6 });
    this.chestplateMesh = new THREE.Mesh(chestGeo, chestMat);
    this.chestplateMesh.visible = false;
    this.torsoGroup.add(this.chestplateMesh);

    this.group.add(this.torsoGroup);

    // 4) Left Arm Group (pivots at shoulder: x = 0.35, y = 1.28)
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(0.35, 1.28, 0);
    const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.22), this.matSteveSkin);
    lArmMesh.position.set(0, -0.28, 0);
    lArmMesh.castShadow = true;
    this.leftArmGroup.add(lArmMesh);

    // Left Sleeve
    const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), this.matSteveShirt);
    lSleeve.position.set(0, -0.06, 0);
    this.leftArmGroup.add(lSleeve);

    // Left Shoulder Pauldron (Armor)
    this.leftShoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), chestMat);
    this.leftShoulderMesh.position.set(0, -0.06, 0);
    this.leftShoulderMesh.visible = false;
    this.leftArmGroup.add(this.leftShoulderMesh);

    this.group.add(this.leftArmGroup);

    // 5) Right Arm Group (pivots at shoulder: x = -0.35, y = 1.28)
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(-0.35, 1.28, 0);
    const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.22), this.matSteveSkin);
    rArmMesh.position.set(0, -0.28, 0);
    rArmMesh.castShadow = true;
    this.rightArmGroup.add(rArmMesh);

    // Right Sleeve
    const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), this.matSteveShirt);
    rSleeve.position.set(0, -0.06, 0);
    this.rightArmGroup.add(rSleeve);

    // Right Shoulder Pauldron (Armor)
    this.rightShoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), chestMat);
    this.rightShoulderMesh.position.set(0, -0.06, 0);
    this.rightShoulderMesh.visible = false;
    this.rightArmGroup.add(this.rightShoulderMesh);

    // Hand Mount for held weapons/tools/blocks
    this.handItemMount = new THREE.Group();
    this.handItemMount.position.set(0, -0.56, -0.12);
    this.handItemMount.rotation.x = Math.PI / 2;
    this.rightArmGroup.add(this.handItemMount);

    this.group.add(this.rightArmGroup);

    // 6) Left Leg Group (pivots at hip: x = 0.13, y = 0.66)
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(0.13, 0.66, 0);
    const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), this.matStevePants);
    lLegMesh.position.set(0, -0.33, 0);
    lLegMesh.castShadow = true;
    this.leftLegGroup.add(lLegMesh);

    // Left Shoe
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.16, 0.23), this.matSteveShoes);
    lShoe.position.set(0, -0.58, 0.005);
    this.leftLegGroup.add(lShoe);

    // Left Legging Armor
    const legMat = new THREE.MeshLambertMaterial({ color: 0xe6e6e6 });
    this.leftLeggingMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.44, 0.25), legMat);
    this.leftLeggingMesh.position.set(0, -0.22, 0);
    this.leftLeggingMesh.visible = false;
    this.leftLegGroup.add(this.leftLeggingMesh);

    // Left Boot Armor
    const bootMat = new THREE.MeshLambertMaterial({ color: 0xe6e6e6 });
    this.leftBootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.26, 0.25), bootMat);
    this.leftBootMesh.position.set(0, -0.53, 0);
    this.leftBootMesh.visible = false;
    this.leftLegGroup.add(this.leftBootMesh);

    this.group.add(this.leftLegGroup);

    // 7) Right Leg Group (pivots at hip: x = -0.13, y = 0.66)
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(-0.13, 0.66, 0);
    const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), this.matStevePants);
    rLegMesh.position.set(0, -0.33, 0);
    rLegMesh.castShadow = true;
    this.rightLegGroup.add(rLegMesh);

    // Right Shoe
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.16, 0.23), this.matSteveShoes);
    rShoe.position.set(0, -0.58, 0.005);
    this.rightLegGroup.add(rShoe);

    // Right Legging Armor
    this.rightLeggingMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.44, 0.25), legMat);
    this.rightLeggingMesh.position.set(0, -0.22, 0);
    this.rightLeggingMesh.visible = false;
    this.rightLegGroup.add(this.rightLeggingMesh);

    // Right Boot Armor
    this.rightBootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.26, 0.25), bootMat);
    this.rightBootMesh.position.set(0, -0.53, 0);
    this.rightBootMesh.visible = false;
    this.rightLegGroup.add(this.rightBootMesh);

    this.group.add(this.rightLegGroup);
  }

  updateArmor(armor: PlayerArmorState) {
    const getArmorColor = (item: ItemId | null): number => {
      if (!item) return 0xffffff;
      if (item.includes("diamond")) return 0x4eedf0;
      if (item.includes("iron")) return 0xe6e6e6;
      if (item.includes("leather")) return 0x8a5229;
      return 0xe6e6e6;
    };

    // Head
    if (armor.head) {
      this.helmetMesh.visible = true;
      (this.helmetMesh.material as THREE.MeshLambertMaterial).color.setHex(getArmorColor(armor.head));
    } else {
      this.helmetMesh.visible = false;
    }

    // Chest
    if (armor.chest) {
      const c = getArmorColor(armor.chest);
      this.chestplateMesh.visible = true;
      this.leftShoulderMesh.visible = true;
      this.rightShoulderMesh.visible = true;
      (this.chestplateMesh.material as THREE.MeshLambertMaterial).color.setHex(c);
      (this.leftShoulderMesh.material as THREE.MeshLambertMaterial).color.setHex(c);
      (this.rightShoulderMesh.material as THREE.MeshLambertMaterial).color.setHex(c);
    } else {
      this.chestplateMesh.visible = false;
      this.leftShoulderMesh.visible = false;
      this.rightShoulderMesh.visible = false;
    }

    // Legs
    if (armor.legs) {
      const c = getArmorColor(armor.legs);
      this.leftLeggingMesh.visible = true;
      this.rightLeggingMesh.visible = true;
      (this.leftLeggingMesh.material as THREE.MeshLambertMaterial).color.setHex(c);
      (this.rightLeggingMesh.material as THREE.MeshLambertMaterial).color.setHex(c);
    } else {
      this.leftLeggingMesh.visible = false;
      this.rightLeggingMesh.visible = false;
    }

    // Feet
    if (armor.feet) {
      const c = getArmorColor(armor.feet);
      this.leftBootMesh.visible = true;
      this.rightBootMesh.visible = true;
      (this.leftBootMesh.material as THREE.MeshLambertMaterial).color.setHex(c);
      (this.rightBootMesh.material as THREE.MeshLambertMaterial).color.setHex(c);
    } else {
      this.leftBootMesh.visible = false;
      this.rightBootMesh.visible = false;
    }
  }

  updateHeldItem(heldItem: ItemId | null) {
    if (this.lastHeldItem === heldItem) return;
    this.lastHeldItem = heldItem;

    if (this.currentHeldMesh) {
      this.handItemMount.remove(this.currentHeldMesh);
      this.currentHeldMesh = null;
    }

    if (!heldItem) return;

    const def = ITEMS[heldItem];
    if (!def) return;

    const group = new THREE.Group();

    if (def.category === "tool" && def.tool) {
      // Handle
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.44, 0.04),
        new THREE.MeshLambertMaterial({ color: 0x825329 })
      );
      handle.position.set(0, 0.16, 0);
      group.add(handle);

      // Head
      if (def.tool.kind === "sword") {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.42, 0.03),
          new THREE.MeshLambertMaterial({ color: def.tool.headColor })
        );
        blade.position.set(0, 0.42, 0);
        group.add(blade);
      } else {
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.08, 0.06),
          new THREE.MeshLambertMaterial({ color: def.tool.headColor })
        );
        head.position.set(0, 0.36, 0);
        group.add(head);
      }
    } else if (def.category === "block") {
      // Miniature block in hand
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshLambertMaterial({ color: def.color })
      );
      cube.position.set(0, 0.16, 0);
      group.add(cube);
    } else {
      // Material item
      const itemMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        new THREE.MeshLambertMaterial({ color: def.color })
      );
      itemMesh.position.set(0, 0.14, 0);
      group.add(itemMesh);
    }

    this.currentHeldMesh = group;
    this.handItemMount.add(group);
  }

  animate(isMoving: boolean, walkBob: number, swingAnim: number, pitch: number) {
    // Head pitch
    this.headGroup.rotation.x = Math.max(-1.1, Math.min(1.1, pitch));

    // Walking animation for limbs
    if (isMoving) {
      const swing = Math.sin(walkBob * 1.6) * 0.55;
      this.leftLegGroup.rotation.x = swing;
      this.rightLegGroup.rotation.x = -swing;
      this.leftArmGroup.rotation.x = -swing * 0.7;
      this.rightArmGroup.rotation.x = swing * 0.7;
    } else {
      this.leftLegGroup.rotation.x = 0;
      this.rightLegGroup.rotation.x = 0;
      this.leftArmGroup.rotation.x = 0;
      this.rightArmGroup.rotation.x = 0;
    }

    // Right Arm swing when mining / placing / attacking
    if (swingAnim > 0) {
      const swingAngle = Math.sin(swingAnim * Math.PI) * 1.4;
      this.rightArmGroup.rotation.x = -swingAngle - 0.2;
      this.rightArmGroup.rotation.y = -Math.sin(swingAnim * Math.PI) * 0.45;
    } else {
      this.rightArmGroup.rotation.y = 0;
    }
  }

  dispose() {
    this.matHead.dispose();
    this.matSteveSkin.dispose();
    this.matSteveShirt.dispose();
    this.matStevePants.dispose();
    this.matSteveShoes.dispose();
  }
}
