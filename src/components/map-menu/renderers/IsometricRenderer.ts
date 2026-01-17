/**
 * IsometricRenderer - Isometric Room View
 *
 * An isometric room-based visualization using Three.js.
 * Features building-style rooms grouped by category with hover effects.
 */

import type { MapRenderer, MapData, MapNode, QualityLevel, MapCategory } from '../types';
import { perfLogger, getOptimalPixelRatio } from '../utils/performance';

// Type declarations for lazy-loaded Three.js
type THREE = typeof import('three');

interface RoomGroup {
  group: InstanceType<THREE['Group']>;
  category: MapCategory;
  nodes: MapNode[];
  rooms: InstanceType<THREE['Mesh']>[];
}

export class IsometricRenderer implements MapRenderer {
  private THREE: THREE | null = null;
  private container: HTMLElement | null = null;
  private scene: InstanceType<THREE['Scene']> | null = null;
  private camera: InstanceType<THREE['OrthographicCamera']> | null = null;
  private renderer: InstanceType<THREE['WebGLRenderer']> | null = null;
  private data: MapData | null = null;

  private roomGroups: Map<string, RoomGroup> = new Map();
  private roomMeshes: Map<string, InstanceType<THREE['Mesh']>> = new Map();
  private labelSprites: Map<string, InstanceType<THREE['Sprite']>> = new Map();

  private animationId: number | null = null;
  private fps = 60;
  private frameCount = 0;
  private lastFrameTime = 0;
  private time = 0;

  private raycaster: InstanceType<THREE['Raycaster']> | null = null;
  private mouse: InstanceType<THREE['Vector2']> | null = null;

  private onClickCallback: ((node: MapNode) => void) | null = null;
  private onHoverCallback: ((node: MapNode | null) => void) | null = null;

  private hoveredMesh: InstanceType<THREE['Mesh']> | null = null;
  private activeNodeId: string | null = null;

  private width = 0;
  private height = 0;
  private cameraTarget = { x: 0, y: 0 };

  async initialize(container: HTMLElement, data: MapData): Promise<void> {
    const endTiming = perfLogger.start('isometricRenderer.init');

    this.THREE = await import(/* webpackChunkName: "three" */ 'three');

    this.container = container;
    this.data = data;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    // Create scene
    this.scene = new this.THREE.Scene();
    this.scene.background = new this.THREE.Color(0x0a0a15);

    // Create isometric camera
    const aspect = this.width / this.height;
    const viewSize = 8;
    this.camera = new this.THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      1000
    );

    // Isometric angle
    this.camera.position.set(20, 15, 20);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new this.THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(getOptimalPixelRatio('high'));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Setup raycaster
    this.raycaster = new this.THREE.Raycaster();
    this.mouse = new this.THREE.Vector2();

    // Build the scene
    this.createFloor();
    this.createRoomGroups();
    this.setupLighting();

    // Event listeners
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('click', this.handleClick);
    this.renderer.domElement.addEventListener('wheel', this.handleWheel, { passive: true });

    this.startRenderLoop();
    endTiming();
  }

  private createFloor(): void {
    if (!this.THREE || !this.scene) return;

    // Create grid floor
    const gridHelper = new this.THREE.GridHelper(30, 30, 0x1a1a2e, 0x1a1a2e);
    gridHelper.position.y = -0.01;
    this.scene.add(gridHelper);

    // Base floor plane
    const floorGeom = new this.THREE.PlaneGeometry(30, 30);
    const floorMat = new this.THREE.MeshStandardMaterial({
      color: 0x0f0f1a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new this.THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private createRoomGroups(): void {
    if (!this.THREE || !this.scene || !this.data) return;

    // Group nodes by category
    const nodesByCategory = new Map<string, MapNode[]>();
    this.data.nodes.forEach((node) => {
      if (!nodesByCategory.has(node.category)) {
        nodesByCategory.set(node.category, []);
      }
      nodesByCategory.get(node.category)!.push(node);
    });

    // Position categories in a circle
    const categoryCount = this.data.categories.length;
    const radius = 8;

    this.data.categories.forEach((category, categoryIndex) => {
      const angle = (categoryIndex / categoryCount) * Math.PI * 2 - Math.PI / 2;
      const groupX = Math.cos(angle) * radius;
      const groupZ = Math.sin(angle) * radius;

      const group = new this.THREE!.Group();
      group.position.set(groupX, 0, groupZ);
      this.scene!.add(group);

      const nodes = nodesByCategory.get(category.id) || [];
      const rooms: InstanceType<THREE['Mesh']>[] = [];

      // Create base platform for category
      this.createCategoryPlatform(group, category, nodes.length);

      // Create rooms for each node
      nodes.forEach((node, nodeIndex) => {
        const room = this.createRoom(node, category, nodeIndex, nodes.length);
        group.add(room);
        rooms.push(room);
        this.roomMeshes.set(node.id, room);

        // Create label
        const label = this.createLabel(node);
        label.position.copy(room.position);
        label.position.y += 1.8;
        group.add(label);
        this.labelSprites.set(node.id, label);
      });

      // Create category label
      const categoryLabel = this.createCategoryLabel(category);
      categoryLabel.position.set(0, -0.5, 0);
      group.add(categoryLabel);

      this.roomGroups.set(category.id, { group, category, nodes, rooms });
    });
  }

  private createCategoryPlatform(
    group: InstanceType<THREE['Group']>,
    category: MapCategory,
    nodeCount: number
  ): void {
    if (!this.THREE) return;

    const platformSize = Math.max(3, nodeCount * 0.8);
    const platformGeom = new this.THREE.BoxGeometry(platformSize, 0.2, platformSize);
    const platformMat = new this.THREE.MeshStandardMaterial({
      color: new this.THREE.Color(category.color).multiplyScalar(0.3),
      roughness: 0.6,
      metalness: 0.4,
    });
    const platform = new this.THREE.Mesh(platformGeom, platformMat);
    platform.position.y = 0.1;
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);

    // Glowing edge
    const edgeGeom = new this.THREE.BoxGeometry(platformSize + 0.1, 0.05, platformSize + 0.1);
    const edgeMat = new this.THREE.MeshBasicMaterial({
      color: category.color,
      transparent: true,
      opacity: 0.5,
    });
    const edge = new this.THREE.Mesh(edgeGeom, edgeMat);
    edge.position.y = 0.2;
    group.add(edge);
  }

  private createRoom(
    node: MapNode,
    category: MapCategory,
    index: number,
    total: number
  ): InstanceType<THREE['Mesh']> {
    if (!this.THREE) throw new Error('THREE not loaded');

    // Arrange rooms in a circular pattern on the platform
    const angle = (index / total) * Math.PI * 2;
    const localRadius = Math.min(1.5, total * 0.3);
    const x = Math.cos(angle) * localRadius;
    const z = Math.sin(angle) * localRadius;

    // Room dimensions
    const roomWidth = 0.8;
    const roomHeight = 0.6 + Math.random() * 0.3;
    const roomDepth = 0.8;

    const roomGeom = new this.THREE.BoxGeometry(roomWidth, roomHeight, roomDepth);
    const roomMat = new this.THREE.MeshStandardMaterial({
      color: new this.THREE.Color(node.metadata?.color || category.color),
      roughness: 0.5,
      metalness: 0.3,
      transparent: true,
      opacity: 0.9,
    });

    const room = new this.THREE.Mesh(roomGeom, roomMat);
    room.position.set(x, 0.2 + roomHeight / 2, z);
    room.castShadow = true;
    room.receiveShadow = true;
    room.userData = { node };

    // Add roof
    const roofGeom = new this.THREE.ConeGeometry(roomWidth * 0.7, 0.4, 4);
    const roofMat = new this.THREE.MeshStandardMaterial({
      color: new this.THREE.Color(category.color).multiplyScalar(0.7),
      roughness: 0.6,
      metalness: 0.3,
    });
    const roof = new this.THREE.Mesh(roofGeom, roofMat);
    roof.position.y = roomHeight / 2 + 0.2;
    roof.rotation.y = Math.PI / 4;
    room.add(roof);

    // Add window
    const windowGeom = new this.THREE.PlaneGeometry(0.2, 0.2);
    const windowMat = new this.THREE.MeshBasicMaterial({
      color: 0xffffcc,
      transparent: true,
      opacity: 0.8,
    });
    const window1 = new this.THREE.Mesh(windowGeom, windowMat);
    window1.position.set(0, 0.1, roomDepth / 2 + 0.01);
    room.add(window1);

    return room;
  }

  private createLabel(node: MapNode): InstanceType<THREE['Sprite']> {
    if (!this.THREE) throw new Error('THREE not loaded');

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Draw icon
    ctx.font = '32px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(node.metadata?.icon || '📍', 128, 40);

    const texture = new this.THREE.CanvasTexture(canvas);
    const material = new this.THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    const sprite = new this.THREE.Sprite(material);
    sprite.scale.set(0.8, 0.2, 1);
    sprite.userData = { node };

    return sprite;
  }

  private createCategoryLabel(category: MapCategory): InstanceType<THREE['Sprite']> {
    if (!this.THREE) throw new Error('THREE not loaded');

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Draw category label
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${category.icon} ${category.label}`, 128, 45);

    const texture = new this.THREE.CanvasTexture(canvas);
    const material = new this.THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    const sprite = new this.THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);

    return sprite;
  }

  private setupLighting(): void {
    if (!this.THREE || !this.scene) return;

    // Ambient light
    const ambient = new this.THREE.AmbientLight(0x404050, 0.5);
    this.scene.add(ambient);

    // Main directional light (sun)
    const sun = new this.THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    this.scene.add(sun);

    // Fill light
    const fill = new this.THREE.DirectionalLight(0x4466ff, 0.3);
    fill.position.set(-10, 10, -10);
    this.scene.add(fill);
  }

  private startRenderLoop = (): void => {
    const render = (timestamp: number): void => {
      this.frameCount++;
      if (timestamp - this.lastFrameTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFrameTime = timestamp;
      }

      this.time = timestamp * 0.001;
      this.updateAnimations();

      this.renderer?.render(this.scene!, this.camera!);
      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  };

  private updateAnimations(): void {
    // Hover animation for rooms
    this.roomMeshes.forEach((mesh, id) => {
      const isHovered = mesh === this.hoveredMesh;
      const isActive = id === this.activeNodeId;

      const targetY = isActive ? 0.5 : isHovered ? 0.3 : 0;
      const currentY = mesh.position.y - (0.2 + (mesh.geometry as InstanceType<THREE['BoxGeometry']>).parameters.height / 2);
      const newY = currentY + (targetY - currentY) * 0.1;
      const baseHeight = (mesh.geometry as InstanceType<THREE['BoxGeometry']>).parameters.height;
      mesh.position.y = 0.2 + baseHeight / 2 + newY;

      // Window glow animation
      mesh.children.forEach((child) => {
        if ((child as InstanceType<THREE['Mesh']>).material instanceof this.THREE!.MeshBasicMaterial) {
          const mat = (child as InstanceType<THREE['Mesh']>).material as InstanceType<THREE['MeshBasicMaterial']>;
          mat.opacity = 0.5 + Math.sin(this.time * 2 + id.charCodeAt(0)) * 0.3;
        }
      });

      // Update label position
      const label = this.labelSprites.get(id);
      if (label) {
        label.position.y = mesh.position.y + baseHeight / 2 + 0.5;
      }
    });

    // Subtle breathing animation for room groups
    this.roomGroups.forEach((roomGroup, i) => {
      const breathe = Math.sin(this.time * 0.5 + i) * 0.02;
      roomGroup.group.position.y = breathe;
    });
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.renderer || !this.THREE) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse!.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse!.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster!.setFromCamera(this.mouse!, this.camera!);
    const meshArray = Array.from(this.roomMeshes.values());
    const intersects = this.raycaster!.intersectObjects(meshArray, true);

    // Find the actual room mesh (not children like roof/window)
    let foundMesh: InstanceType<THREE['Mesh']> | null = null;
    for (const intersect of intersects) {
      let obj = intersect.object as InstanceType<THREE['Mesh']>;
      while (obj.parent && !obj.userData.node) {
        obj = obj.parent as InstanceType<THREE['Mesh']>;
      }
      if (obj.userData.node) {
        foundMesh = obj;
        break;
      }
    }

    if (foundMesh !== this.hoveredMesh) {
      this.hoveredMesh = foundMesh;
      this.renderer.domElement.style.cursor = foundMesh ? 'pointer' : 'default';
      this.onHoverCallback?.(foundMesh?.userData.node || null);
    }
  };

  private handleClick = (): void => {
    if (this.hoveredMesh) {
      this.onClickCallback?.(this.hoveredMesh.userData.node);
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    if (!this.camera) return;

    const delta = e.deltaY > 0 ? 0.5 : -0.5;
    const viewSize = Math.max(5, Math.min(15, -this.camera.top + delta));
    const aspect = this.width / this.height;

    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();
  };

  setActiveNode(nodeId: string | null): void {
    this.activeNodeId = nodeId;
  }

  setHighlightedCategory(categoryId: string | null): void {
    this.roomGroups.forEach((roomGroup, id) => {
      const isMatch = !categoryId || id === categoryId;
      roomGroup.group.traverse((child) => {
        if ((child as InstanceType<THREE['Mesh']>).material) {
          const mat = (child as InstanceType<THREE['Mesh']>).material as InstanceType<THREE['MeshStandardMaterial']>;
          if (mat.opacity !== undefined) {
            mat.opacity = isMatch ? 0.9 : 0.3;
          }
        }
      });
    });
  }

  setSearchFilter(query: string): void {
    const q = query.toLowerCase();
    this.roomMeshes.forEach((mesh) => {
      const node = mesh.userData.node as MapNode;
      const searchText = `${node.label} ${node.shortLabel || ''} ${node.metadata?.description || ''}`.toLowerCase();
      const isMatch = !q || searchText.includes(q);
      (mesh.material as InstanceType<THREE['MeshStandardMaterial']>).opacity = isMatch ? 0.9 : 0.3;
    });
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    if (this.camera && this.renderer) {
      const aspect = width / height;
      const viewSize = -this.camera.top;
      this.camera.left = -viewSize * aspect;
      this.camera.right = viewSize * aspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  setQualityLevel(level: QualityLevel): void {
    if (this.renderer && this.THREE) {
      this.renderer.setPixelRatio(getOptimalPixelRatio(level));
      this.renderer.shadowMap.enabled = level !== 'lite';
    }
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.renderer) {
      this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
      this.renderer.domElement.removeEventListener('click', this.handleClick);
      this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
      this.renderer.dispose();
      this.container?.removeChild(this.renderer.domElement);
    }

    this.roomGroups.clear();
    this.roomMeshes.clear();
    this.labelSprites.clear();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }

  onNodeClick(callback: (node: MapNode) => void): void {
    this.onClickCallback = callback;
  }

  onNodeHover(callback: (node: MapNode | null) => void): void {
    this.onHoverCallback = callback;
  }

  getFPS(): number {
    return this.fps;
  }
}
