/**
 * World3DRenderer - Three.js Globe Renderer
 *
 * A 3D globe visualization for the MapMenu using Three.js.
 * Lazy-loaded to avoid including Three.js in the initial bundle.
 */

import type { MapRenderer, MapData, MapNode, QualityLevel } from '../types';
import { perfLogger, getOptimalPixelRatio } from '../utils/performance';

// Type declarations for lazy-loaded Three.js
type THREE = typeof import('three');

export class World3DRenderer implements MapRenderer {
  private THREE: THREE | null = null;
  private container: HTMLElement | null = null;
  private scene: InstanceType<THREE['Scene']> | null = null;
  private camera: InstanceType<THREE['PerspectiveCamera']> | null = null;
  private renderer: InstanceType<THREE['WebGLRenderer']> | null = null;
  private data: MapData | null = null;
  private nodeMeshes: Map<string, InstanceType<THREE['Mesh']>> = new Map();
  private globeMesh: InstanceType<THREE['Mesh']> | null = null;

  private animationId: number | null = null;
  private fps = 60;
  private frameCount = 0;
  private lastFrameTime = 0;

  private raycaster: InstanceType<THREE['Raycaster']> | null = null;
  private mouse: InstanceType<THREE['Vector2']> | null = null;

  private onClickCallback: ((node: MapNode) => void) | null = null;
  private onHoverCallback: ((node: MapNode | null) => void) | null = null;

  private hoveredMesh: InstanceType<THREE['Mesh']> | null = null;
  private activeNodeId: string | null = null;

  private rotationSpeed = 0.001;
  private isUserInteracting = false;
  private mouseDownTime = 0;

  async initialize(container: HTMLElement, data: MapData): Promise<void> {
    const endTiming = perfLogger.start('world3dRenderer.init');

    // Lazy load Three.js
    this.THREE = await import(/* webpackChunkName: "three" */ 'three');

    this.container = container;
    this.data = data;

    // Create scene
    this.scene = new this.THREE.Scene();
    this.scene.background = new this.THREE.Color(0x0a0a0f);

    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new this.THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 4);

    // Create renderer
    this.renderer = new this.THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(getOptimalPixelRatio('high'));
    container.appendChild(this.renderer.domElement);

    // Setup raycaster for interaction
    this.raycaster = new this.THREE.Raycaster();
    this.mouse = new this.THREE.Vector2();

    // Create globe
    this.createGlobe();

    // Create node markers
    this.createNodeMarkers();

    // Add lighting
    this.setupLighting();

    // Event listeners
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('click', this.handleClick);
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.addEventListener('wheel', this.handleWheel, { passive: true });

    // Start render loop
    this.startRenderLoop();

    endTiming();
  }

  private createGlobe(): void {
    if (!this.THREE || !this.scene) return;

    // Main globe wireframe
    const globeGeom = new this.THREE.SphereGeometry(1.8, 48, 48);
    const globeMat = new this.THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    this.globeMesh = new this.THREE.Mesh(globeGeom, globeMat);
    this.scene.add(this.globeMesh);

    // Inner glow sphere
    const glowGeom = new this.THREE.SphereGeometry(1.7, 32, 32);
    const glowMat = new this.THREE.MeshBasicMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.05,
    });
    const glowMesh = new this.THREE.Mesh(glowGeom, glowMat);
    this.scene.add(glowMesh);

    // Latitude/longitude lines
    this.createGridLines();
  }

  private createGridLines(): void {
    if (!this.THREE || !this.scene) return;

    const lineMaterial = new this.THREE.LineBasicMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.1,
    });

    // Latitude lines
    for (let i = -60; i <= 60; i += 30) {
      const theta = (i * Math.PI) / 180;
      const radius = 1.85 * Math.cos(theta);
      const y = 1.85 * Math.sin(theta);

      const points: InstanceType<THREE['Vector3']>[] = [];
      for (let j = 0; j <= 64; j++) {
        const phi = (j / 64) * Math.PI * 2;
        points.push(new this.THREE.Vector3(
          radius * Math.cos(phi),
          y,
          radius * Math.sin(phi)
        ));
      }

      const geometry = new this.THREE.BufferGeometry().setFromPoints(points);
      const line = new this.THREE.Line(geometry, lineMaterial);
      this.scene.add(line);
    }

    // Longitude lines
    for (let i = 0; i < 12; i++) {
      const phi = (i / 12) * Math.PI * 2;
      const points: InstanceType<THREE['Vector3']>[] = [];

      for (let j = 0; j <= 64; j++) {
        const theta = ((j / 64) - 0.5) * Math.PI;
        points.push(new this.THREE.Vector3(
          1.85 * Math.cos(theta) * Math.cos(phi),
          1.85 * Math.sin(theta),
          1.85 * Math.cos(theta) * Math.sin(phi)
        ));
      }

      const geometry = new this.THREE.BufferGeometry().setFromPoints(points);
      const line = new this.THREE.Line(geometry, lineMaterial);
      this.scene.add(line);
    }
  }

  private createNodeMarkers(): void {
    if (!this.THREE || !this.scene || !this.data) return;

    const nodeGeom = new this.THREE.SphereGeometry(0.08, 16, 16);

    this.data.nodes.forEach((node, index) => {
      // Convert 2D position to spherical coordinates
      const phi = node.position.y * Math.PI; // latitude (0 to π)
      const theta = node.position.x * Math.PI * 2; // longitude (0 to 2π)
      const radius = 1.9;

      // Spherical to Cartesian
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      const color = new this.THREE!.Color(node.metadata?.color || '#ffffff');
      const material = new this.THREE!.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
      });

      const mesh = new this.THREE!.Mesh(nodeGeom, material);
      mesh.position.set(x, y, z);
      mesh.userData = { node };

      this.scene!.add(mesh);
      this.nodeMeshes.set(node.id, mesh);

      // Create glow sprite for each node
      this.createNodeGlow(mesh, color);
    });
  }

  private createNodeGlow(mesh: InstanceType<THREE['Mesh']>, color: InstanceType<THREE['Color']>): void {
    if (!this.THREE || !this.scene) return;

    // Create a simple glow using a slightly larger transparent sphere
    const glowGeom = new this.THREE.SphereGeometry(0.12, 8, 8);
    const glowMat = new this.THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new this.THREE.Mesh(glowGeom, glowMat);
    glow.position.copy(mesh.position);
    this.scene.add(glow);
  }

  private setupLighting(): void {
    if (!this.THREE || !this.scene) return;

    // Ambient light
    const ambient = new this.THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    // Directional light
    const directional = new this.THREE.DirectionalLight(0xffffff, 0.5);
    directional.position.set(5, 5, 5);
    this.scene.add(directional);
  }

  private startRenderLoop = (): void => {
    const render = (timestamp: number): void => {
      // FPS calculation
      this.frameCount++;
      if (timestamp - this.lastFrameTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFrameTime = timestamp;
      }

      // Auto-rotate globe when not interacting
      if (this.globeMesh && !this.isUserInteracting) {
        this.globeMesh.rotation.y += this.rotationSpeed;

        // Rotate all node meshes with globe
        this.nodeMeshes.forEach((mesh) => {
          mesh.position.applyAxisAngle(new this.THREE!.Vector3(0, 1, 0), this.rotationSpeed);
        });
      }

      // Update hovered mesh scale
      this.nodeMeshes.forEach((mesh) => {
        const isHovered = mesh === this.hoveredMesh;
        const isActive = mesh.userData.node?.id === this.activeNodeId;
        const targetScale = isActive ? 1.5 : isHovered ? 1.3 : 1;
        mesh.scale.lerp(new this.THREE!.Vector3(targetScale, targetScale, targetScale), 0.1);
      });

      this.renderer?.render(this.scene!, this.camera!);
      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.renderer || !this.THREE) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse!.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse!.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster!.setFromCamera(this.mouse!, this.camera!);
    const intersects = this.raycaster!.intersectObjects(Array.from(this.nodeMeshes.values()));

    if (intersects.length > 0) {
      const mesh = intersects[0].object as InstanceType<THREE['Mesh']>;
      if (mesh !== this.hoveredMesh) {
        this.hoveredMesh = mesh;
        this.renderer.domElement.style.cursor = 'pointer';
        this.onHoverCallback?.(mesh.userData.node);
      }
    } else {
      if (this.hoveredMesh) {
        this.hoveredMesh = null;
        this.renderer.domElement.style.cursor = 'grab';
        this.onHoverCallback?.(null);
      }
    }

    // Drag to rotate globe
    if (this.isUserInteracting && e.buttons === 1) {
      const deltaX = e.movementX * 0.005;
      const deltaY = e.movementY * 0.005;

      if (this.globeMesh) {
        this.globeMesh.rotation.y += deltaX;
        this.globeMesh.rotation.x += deltaY;
        this.globeMesh.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.globeMesh.rotation.x));
      }

      // Rotate all node meshes
      this.nodeMeshes.forEach((mesh) => {
        mesh.position.applyAxisAngle(new this.THREE!.Vector3(0, 1, 0), deltaX);
        mesh.position.applyAxisAngle(new this.THREE!.Vector3(1, 0, 0), deltaY);
      });
    }
  };

  private handleMouseDown = (): void => {
    this.isUserInteracting = true;
    this.mouseDownTime = performance.now();
    if (this.renderer) {
      this.renderer.domElement.style.cursor = 'grabbing';
    }
  };

  private handleMouseUp = (): void => {
    this.isUserInteracting = false;
    if (this.renderer) {
      this.renderer.domElement.style.cursor = this.hoveredMesh ? 'pointer' : 'grab';
    }
  };

  private handleClick = (): void => {
    // Only trigger click if it wasn't a drag
    const clickDuration = performance.now() - this.mouseDownTime;
    if (clickDuration < 200 && this.hoveredMesh) {
      this.onClickCallback?.(this.hoveredMesh.userData.node);
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    if (!this.camera) return;

    const delta = e.deltaY > 0 ? 0.2 : -0.2;
    const newZ = Math.max(2.5, Math.min(6, this.camera.position.z + delta));
    this.camera.position.z = newZ;
  };

  setActiveNode(nodeId: string | null): void {
    this.activeNodeId = nodeId;
  }

  setHighlightedCategory(categoryId: string | null): void {
    this.nodeMeshes.forEach((mesh) => {
      const node = mesh.userData.node as MapNode;
      const isMatch = !categoryId || node.category === categoryId;
      (mesh.material as InstanceType<THREE['MeshBasicMaterial']>).opacity = isMatch ? 0.9 : 0.2;
    });
  }

  setSearchFilter(query: string): void {
    const q = query.toLowerCase();
    this.nodeMeshes.forEach((mesh) => {
      const node = mesh.userData.node as MapNode;
      const searchText = `${node.label} ${node.shortLabel || ''} ${node.metadata?.description || ''}`.toLowerCase();
      const isMatch = !q || searchText.includes(q);
      (mesh.material as InstanceType<THREE['MeshBasicMaterial']>).opacity = isMatch ? 0.9 : 0.2;
    });
  }

  resize(width: number, height: number): void {
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  setQualityLevel(level: QualityLevel): void {
    if (this.renderer) {
      this.renderer.setPixelRatio(getOptimalPixelRatio(level));
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
      this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
      this.renderer.domElement.removeEventListener('mouseup', this.handleMouseUp);
      this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
      this.renderer.dispose();
      this.container?.removeChild(this.renderer.domElement);
    }

    this.nodeMeshes.clear();
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
