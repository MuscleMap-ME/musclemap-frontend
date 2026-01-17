/**
 * LiteRenderer - 2D Canvas Renderer
 *
 * A lightweight canvas-based renderer for the MapMenu.
 * No Three.js dependency - works on all devices.
 * Used as the default renderer for low-end devices or reduced motion preference.
 */

import type { MapRenderer, MapData, MapNode, QualityLevel } from '../types';
import { perfLogger, getOptimalPixelRatio, throttle } from '../utils/performance';

interface RenderNode {
  node: MapNode;
  x: number;
  y: number;
  radius: number;
  hovered: boolean;
  active: boolean;
  filtered: boolean;
  opacity: number;
}

export class LiteRenderer implements MapRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private data: MapData | null = null;
  private renderNodes: RenderNode[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 60;

  // State
  private activeNodeId: string | null = null;
  private highlightedCategory: string | null = null;
  private searchQuery = '';
  private hoveredNode: RenderNode | null = null;

  // Callbacks
  private onClickCallback: ((node: MapNode) => void) | null = null;
  private onHoverCallback: ((node: MapNode | null) => void) | null = null;

  // Animation state
  private animationProgress = 0;
  private isInitializing = true;

  async initialize(container: HTMLElement, data: MapData): Promise<void> {
    const endTiming = perfLogger.start('liteRenderer.init');

    this.data = data;
    this.dpr = getOptimalPixelRatio('lite');

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Interactive navigation map');
    container.appendChild(this.canvas);

    // Get 2D context with optimizations
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });

    if (!this.ctx) {
      throw new Error('Failed to get 2D canvas context');
    }

    // Set up event listeners
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('touchstart', this.handleTouch, { passive: true });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: true });

    // Initial resize
    this.resize(container.clientWidth, container.clientHeight);
    this.buildRenderNodes();

    // Start animation
    this.isInitializing = true;
    this.animationProgress = 0;
    this.startRenderLoop();

    endTiming();
  }

  private buildRenderNodes(): void {
    if (!this.data) return;

    this.renderNodes = this.data.nodes.map((node, index) => {
      const pos = node.position;
      return {
        node,
        x: pos.x * this.width,
        y: pos.y * this.height,
        radius: this.calculateNodeRadius(node),
        hovered: false,
        active: node.id === this.activeNodeId,
        filtered: true,
        opacity: 0, // Start invisible for animation
      };
    });

    this.applyFilters();
  }

  private calculateNodeRadius(node: MapNode): number {
    // Larger radius for category nodes (compact mode)
    if (node.metadata?.nodeCount) {
      return 30;
    }
    return 18;
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

      // Update animation
      if (this.isInitializing && this.animationProgress < 1) {
        this.animationProgress = Math.min(1, this.animationProgress + 0.05);
        this.renderNodes.forEach((rn, i) => {
          const delay = i * 0.03;
          const progress = Math.max(0, (this.animationProgress - delay) / (1 - delay));
          rn.opacity = this.easeOutCubic(Math.min(1, progress));
        });

        if (this.animationProgress >= 1) {
          this.isInitializing = false;
        }
      }

      this.draw();
      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  };

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;

    // Clear canvas with background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background grid
    this.drawGrid(ctx);

    // Draw connections between nodes
    this.drawConnections(ctx);

    // Draw nodes
    this.drawNodes(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const gridSize = 40 * this.dpr;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < this.canvas!.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas!.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < this.canvas!.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas!.width, y);
      ctx.stroke();
    }
  }

  private drawConnections(ctx: CanvasRenderingContext2D): void {
    this.renderNodes.forEach((rn) => {
      if (!rn.filtered || !rn.node.connections) return;

      rn.node.connections.forEach((connId) => {
        const target = this.renderNodes.find((n) => n.node.id === connId);
        if (!target || !target.filtered) return;

        // Only draw each connection once (from lower index)
        const rnIndex = this.renderNodes.indexOf(rn);
        const targetIndex = this.renderNodes.indexOf(target);
        if (rnIndex > targetIndex) return;

        const x1 = rn.x * this.dpr;
        const y1 = rn.y * this.dpr;
        const x2 = target.x * this.dpr;
        const y2 = target.y * this.dpr;

        // Create gradient for connection
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        const alpha = Math.min(rn.opacity, target.opacity) * 0.3;
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.5})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5 * this.dpr;
        ctx.setLineDash([5 * this.dpr, 5 * this.dpr]);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    });
  }

  private drawNodes(ctx: CanvasRenderingContext2D): void {
    // Sort nodes so hovered/active are drawn on top
    const sortedNodes = [...this.renderNodes].sort((a, b) => {
      if (a.active) return 1;
      if (b.active) return -1;
      if (a.hovered) return 1;
      if (b.hovered) return -1;
      return 0;
    });

    sortedNodes.forEach((rn) => {
      if (!rn.filtered || rn.opacity <= 0) return;

      const x = rn.x * this.dpr;
      const y = rn.y * this.dpr;
      const r = rn.radius * this.dpr * (rn.hovered ? 1.15 : 1) * (rn.active ? 1.2 : 1);

      const baseColor = rn.node.metadata?.color || '#ffffff';
      const [red, green, blue] = this.hexToRgb(baseColor);

      // Draw glow effect
      if (rn.active || rn.hovered) {
        const glowRadius = r * (rn.active ? 2 : 1.5);
        const glowGradient = ctx.createRadialGradient(x, y, r, x, y, glowRadius);
        glowGradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${rn.opacity * 0.4})`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw node circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);

      // Node gradient fill
      const nodeGradient = ctx.createRadialGradient(
        x - r * 0.3,
        y - r * 0.3,
        0,
        x,
        y,
        r
      );
      nodeGradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${rn.opacity})`);
      nodeGradient.addColorStop(1, `rgba(${Math.floor(red * 0.7)}, ${Math.floor(green * 0.7)}, ${Math.floor(blue * 0.7)}, ${rn.opacity})`);

      ctx.fillStyle = nodeGradient;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = `rgba(255, 255, 255, ${rn.opacity * (rn.active ? 0.8 : rn.hovered ? 0.5 : 0.2)})`;
      ctx.lineWidth = (rn.active ? 2 : 1) * this.dpr;
      ctx.stroke();

      // Draw icon (emoji)
      if (rn.node.metadata?.icon) {
        ctx.font = `${r * 0.9}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255, 255, 255, ${rn.opacity})`;
        ctx.fillText(rn.node.metadata.icon, x, y);
      }

      // Draw label on hover or active
      if (rn.hovered || rn.active) {
        const label = rn.node.shortLabel || rn.node.label;
        ctx.font = `bold ${14 * this.dpr}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Background for label
        const textMetrics = ctx.measureText(label);
        const padding = 8 * this.dpr;
        const textX = x;
        const textY = y + r + 12 * this.dpr;

        ctx.fillStyle = `rgba(0, 0, 0, ${rn.opacity * 0.8})`;
        ctx.beginPath();
        ctx.roundRect(
          textX - textMetrics.width / 2 - padding,
          textY - 2 * this.dpr,
          textMetrics.width + padding * 2,
          20 * this.dpr,
          4 * this.dpr
        );
        ctx.fill();

        // Label text
        ctx.fillStyle = `rgba(255, 255, 255, ${rn.opacity})`;
        ctx.fillText(label, textX, textY);
      }
    });
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ];
    }
    return [255, 255, 255];
  }

  // Event handlers
  private handleMouseMove = throttle((e: MouseEvent): void => {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;

    this.updateHover(x, y);
  }, 16);

  private handleClick = (): void => {
    if (this.hoveredNode) {
      this.onClickCallback?.(this.hoveredNode.node);
    }
  };

  private touchPosition: { x: number; y: number } | null = null;

  private handleTouch = (e: TouchEvent): void => {
    if (!this.canvas || e.touches.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.touches[0].clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
    const y = (e.touches[0].clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;

    this.touchPosition = { x, y };
    this.updateHover(x, y);
  };

  private handleTouchEnd = (): void => {
    if (this.touchPosition && this.hoveredNode) {
      this.onClickCallback?.(this.hoveredNode.node);
    }
    this.touchPosition = null;

    // Clear hover state on touch end
    this.renderNodes.forEach((rn) => {
      rn.hovered = false;
    });
    this.hoveredNode = null;
    this.onHoverCallback?.(null);
    if (this.canvas) {
      this.canvas.style.cursor = 'default';
    }
  };

  private updateHover(x: number, y: number): void {
    let found: RenderNode | null = null;

    for (const rn of this.renderNodes) {
      if (!rn.filtered) continue;

      const dx = x - rn.x;
      const dy = y - rn.y;
      const hitRadius = rn.radius * 1.2; // Slightly larger hit area

      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        found = rn;
        break;
      }
    }

    // Update hover state
    this.renderNodes.forEach((rn) => {
      rn.hovered = rn === found;
    });

    if (found !== this.hoveredNode) {
      this.hoveredNode = found;
      this.canvas!.style.cursor = found ? 'pointer' : 'default';
      this.onHoverCallback?.(found?.node || null);
    }
  }

  // Public API
  setActiveNode(nodeId: string | null): void {
    this.activeNodeId = nodeId;
    this.renderNodes.forEach((rn) => {
      rn.active = rn.node.id === nodeId;
    });
  }

  setHighlightedCategory(categoryId: string | null): void {
    this.highlightedCategory = categoryId;
    this.applyFilters();
  }

  setSearchFilter(query: string): void {
    this.searchQuery = query.toLowerCase();
    this.applyFilters();
  }

  private applyFilters(): void {
    this.renderNodes.forEach((rn) => {
      let visible = true;

      // Category filter
      if (this.highlightedCategory && rn.node.category !== this.highlightedCategory) {
        visible = false;
      }

      // Search filter
      if (this.searchQuery) {
        const searchText = `${rn.node.label} ${rn.node.shortLabel || ''} ${rn.node.metadata?.description || ''}`.toLowerCase();
        if (!searchText.includes(this.searchQuery)) {
          visible = false;
        }
      }

      rn.filtered = visible;

      // Update opacity for smooth transition
      if (!visible) {
        rn.opacity = Math.max(0, rn.opacity - 0.1);
      } else if (rn.opacity < 1) {
        rn.opacity = Math.min(1, rn.opacity + 0.1);
      }
    });
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    if (this.canvas) {
      this.canvas.width = width * this.dpr;
      this.canvas.height = height * this.dpr;
    }

    // Rebuild node positions
    this.buildRenderNodes();

    // Re-apply animation state
    if (!this.isInitializing) {
      this.renderNodes.forEach((rn) => {
        rn.opacity = rn.filtered ? 1 : 0;
      });
    }
  }

  setQualityLevel(level: QualityLevel): void {
    this.dpr = getOptimalPixelRatio(level);

    if (this.canvas) {
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
    }
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('click', this.handleClick);
      this.canvas.removeEventListener('touchstart', this.handleTouch);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
      this.canvas.parentElement?.removeChild(this.canvas);
    }

    this.canvas = null;
    this.ctx = null;
    this.renderNodes = [];
    this.onClickCallback = null;
    this.onHoverCallback = null;
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
