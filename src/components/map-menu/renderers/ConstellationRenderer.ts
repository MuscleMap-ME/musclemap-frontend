/**
 * ConstellationRenderer - Star Map Visualization
 *
 * A constellation/star-map style visualization using Three.js.
 * Features twinkling stars, constellation lines, and nebula effects.
 */

import type { MapRenderer, MapData, MapNode, QualityLevel } from '../types';
import { perfLogger, getOptimalPixelRatio } from '../utils/performance';

// Type declarations for lazy-loaded Three.js
type THREE = typeof import('three');

export class ConstellationRenderer implements MapRenderer {
  private THREE: THREE | null = null;
  private container: HTMLElement | null = null;
  private scene: InstanceType<THREE['Scene']> | null = null;
  private camera: InstanceType<THREE['OrthographicCamera']> | null = null;
  private renderer: InstanceType<THREE['WebGLRenderer']> | null = null;
  private data: MapData | null = null;

  private nodeSprites: Map<string, InstanceType<THREE['Sprite']>> = new Map();
  private connectionLines: InstanceType<THREE['Line']>[] = [];
  private starParticles: InstanceType<THREE['Points']> | null = null;
  private nebulaSprites: InstanceType<THREE['Sprite']>[] = [];

  private animationId: number | null = null;
  private fps = 60;
  private frameCount = 0;
  private lastFrameTime = 0;
  private time = 0;

  private raycaster: InstanceType<THREE['Raycaster']> | null = null;
  private mouse: InstanceType<THREE['Vector2']> | null = null;

  private onClickCallback: ((node: MapNode) => void) | null = null;
  private onHoverCallback: ((node: MapNode | null) => void) | null = null;

  private hoveredSprite: InstanceType<THREE['Sprite']> | null = null;
  private activeNodeId: string | null = null;

  private width = 0;
  private height = 0;

  async initialize(container: HTMLElement, data: MapData): Promise<void> {
    const endTiming = perfLogger.start('constellationRenderer.init');

    this.THREE = await import(/* webpackChunkName: "three" */ 'three');

    this.container = container;
    this.data = data;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    // Create scene
    this.scene = new this.THREE.Scene();
    this.scene.background = new this.THREE.Color(0x050510);

    // Create orthographic camera for flat star field
    const aspect = this.width / this.height;
    const viewSize = 2;
    this.camera = new this.THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      100
    );
    this.camera.position.z = 10;

    // Create renderer
    this.renderer = new this.THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(getOptimalPixelRatio('high'));
    container.appendChild(this.renderer.domElement);

    // Setup raycaster
    this.raycaster = new this.THREE.Raycaster();
    this.raycaster.params.Sprite = { threshold: 0.2 };
    this.mouse = new this.THREE.Vector2();

    // Build the scene
    this.createStarField();
    this.createNebulae();
    this.createConstellationLines();
    this.createNodeStars();

    // Event listeners
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('click', this.handleClick);

    this.startRenderLoop();
    endTiming();
  }

  private createStarField(): void {
    if (!this.THREE || !this.scene) return;

    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = -1 - Math.random() * 2;

      // Slightly colored stars
      const brightness = 0.3 + Math.random() * 0.7;
      const tint = Math.random();
      if (tint < 0.1) {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness * 0.8;
        colors[i * 3 + 2] = brightness * 0.6;
      } else if (tint < 0.2) {
        colors[i * 3] = brightness * 0.8;
        colors[i * 3 + 1] = brightness * 0.9;
        colors[i * 3 + 2] = brightness;
      } else {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness;
      }

      sizes[i] = Math.random() * 3 + 1;
    }

    const geometry = new this.THREE.BufferGeometry();
    geometry.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));

    const material = new this.THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: this.THREE.AdditiveBlending,
    });

    this.starParticles = new this.THREE.Points(geometry, material);
    this.scene.add(this.starParticles);
  }

  private createNebulae(): void {
    if (!this.THREE || !this.scene) return;

    // Create soft nebula sprites in the background
    const nebulaColors = [
      new this.THREE.Color(0x0066ff), // Blue
      new this.THREE.Color(0xff3366), // Magenta
      new this.THREE.Color(0x9b59b6), // Purple
    ];

    for (let i = 0; i < 5; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Create radial gradient
      const color = nebulaColors[i % nebulaColors.length];
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.15)`);
      gradient.addColorStop(0.5, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.05)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);

      const texture = new this.THREE.CanvasTexture(canvas);
      const material = new this.THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: this.THREE.AdditiveBlending,
      });

      const sprite = new this.THREE.Sprite(material);
      sprite.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
        -3
      );
      sprite.scale.set(3 + Math.random() * 2, 3 + Math.random() * 2, 1);

      this.scene.add(sprite);
      this.nebulaSprites.push(sprite);
    }
  }

  private createConstellationLines(): void {
    if (!this.THREE || !this.scene || !this.data) return;

    const lineMaterial = new this.THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      blending: this.THREE.AdditiveBlending,
    });

    this.data.nodes.forEach((node) => {
      if (!node.connections) return;

      node.connections.forEach((connId) => {
        const target = this.data!.nodes.find((n) => n.id === connId);
        if (!target) return;

        // Only draw once per connection pair
        if (node.id > connId) return;

        const startX = (node.position.x - 0.5) * 4;
        const startY = (node.position.y - 0.5) * 3;
        const endX = (target.position.x - 0.5) * 4;
        const endY = (target.position.y - 0.5) * 3;

        const points = [
          new this.THREE!.Vector3(startX, startY, 0),
          new this.THREE!.Vector3(endX, endY, 0),
        ];

        const geometry = new this.THREE!.BufferGeometry().setFromPoints(points);
        const line = new this.THREE!.Line(geometry, lineMaterial.clone());
        this.scene!.add(line);
        this.connectionLines.push(line);
      });
    });
  }

  private createNodeStars(): void {
    if (!this.THREE || !this.scene || !this.data) return;

    this.data.nodes.forEach((node) => {
      // Create star sprite
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      const color = node.metadata?.color || '#ffffff';

      // Draw star with glow
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.2, color);
      gradient.addColorStop(0.5, this.adjustColorAlpha(color, 0.5));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);

      // Draw 4-point star shape
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const cx = 32, cy = 32;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * 12;
        const y = cy + Math.sin(angle) * 12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        const midAngle = angle + Math.PI / 4;
        const midX = cx + Math.cos(midAngle) * 4;
        const midY = cy + Math.sin(midAngle) * 4;
        ctx.lineTo(midX, midY);
      }
      ctx.closePath();
      ctx.fill();

      const texture = new this.THREE!.CanvasTexture(canvas);
      const material = new this.THREE!.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: this.THREE!.AdditiveBlending,
      });

      const sprite = new this.THREE!.Sprite(material);
      const x = (node.position.x - 0.5) * 4;
      const y = (node.position.y - 0.5) * 3;
      sprite.position.set(x, y, 0);
      sprite.scale.set(0.3, 0.3, 1);
      sprite.userData = { node };

      this.scene!.add(sprite);
      this.nodeSprites.set(node.id, sprite);
    });
  }

  private adjustColorAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    // Twinkle star particles
    if (this.starParticles) {
      const sizes = this.starParticles.geometry.getAttribute('size') as InstanceType<THREE['BufferAttribute']>;
      for (let i = 0; i < sizes.count; i++) {
        const baseSize = 1 + (i % 3);
        sizes.setX(i, baseSize * (0.7 + 0.3 * Math.sin(this.time * 2 + i * 0.5)));
      }
      sizes.needsUpdate = true;
    }

    // Pulse nebulae
    this.nebulaSprites.forEach((sprite, i) => {
      const scale = 3 + Math.sin(this.time * 0.5 + i) * 0.2;
      sprite.scale.set(scale, scale, 1);
      (sprite.material as InstanceType<THREE['SpriteMaterial']>).opacity = 0.1 + Math.sin(this.time * 0.3 + i * 2) * 0.05;
    });

    // Pulse node stars
    this.nodeSprites.forEach((sprite, id) => {
      const isHovered = sprite === this.hoveredSprite;
      const isActive = id === this.activeNodeId;

      let targetScale = 0.3;
      if (isActive) targetScale = 0.5;
      else if (isHovered) targetScale = 0.4;

      // Add twinkle
      const twinkle = 1 + Math.sin(this.time * 3 + id.charCodeAt(0)) * 0.1;
      const currentScale = sprite.scale.x;
      const newScale = currentScale + (targetScale * twinkle - currentScale) * 0.1;
      sprite.scale.set(newScale, newScale, 1);
    });

    // Pulse connection lines
    this.connectionLines.forEach((line, i) => {
      const opacity = 0.1 + Math.sin(this.time + i * 0.5) * 0.05;
      (line.material as InstanceType<THREE['LineBasicMaterial']>).opacity = opacity;
    });
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.renderer || !this.THREE) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse!.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse!.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster!.setFromCamera(this.mouse!, this.camera!);
    const intersects = this.raycaster!.intersectObjects(Array.from(this.nodeSprites.values()));

    if (intersects.length > 0) {
      const sprite = intersects[0].object as InstanceType<THREE['Sprite']>;
      if (sprite !== this.hoveredSprite) {
        this.hoveredSprite = sprite;
        this.renderer.domElement.style.cursor = 'pointer';
        this.onHoverCallback?.(sprite.userData.node);
      }
    } else {
      if (this.hoveredSprite) {
        this.hoveredSprite = null;
        this.renderer.domElement.style.cursor = 'default';
        this.onHoverCallback?.(null);
      }
    }
  };

  private handleClick = (): void => {
    if (this.hoveredSprite) {
      this.onClickCallback?.(this.hoveredSprite.userData.node);
    }
  };

  setActiveNode(nodeId: string | null): void {
    this.activeNodeId = nodeId;
  }

  setHighlightedCategory(categoryId: string | null): void {
    this.nodeSprites.forEach((sprite) => {
      const node = sprite.userData.node as MapNode;
      const isMatch = !categoryId || node.category === categoryId;
      (sprite.material as InstanceType<THREE['SpriteMaterial']>).opacity = isMatch ? 1 : 0.2;
    });
  }

  setSearchFilter(query: string): void {
    const q = query.toLowerCase();
    this.nodeSprites.forEach((sprite) => {
      const node = sprite.userData.node as MapNode;
      const searchText = `${node.label} ${node.shortLabel || ''} ${node.metadata?.description || ''}`.toLowerCase();
      const isMatch = !q || searchText.includes(q);
      (sprite.material as InstanceType<THREE['SpriteMaterial']>).opacity = isMatch ? 1 : 0.2;
    });
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    if (this.camera && this.renderer) {
      const aspect = width / height;
      const viewSize = 2;
      this.camera.left = -viewSize * aspect;
      this.camera.right = viewSize * aspect;
      this.camera.top = viewSize;
      this.camera.bottom = -viewSize;
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
      this.renderer.dispose();
      this.container?.removeChild(this.renderer.domElement);
    }

    this.nodeSprites.clear();
    this.connectionLines = [];
    this.nebulaSprites = [];
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
