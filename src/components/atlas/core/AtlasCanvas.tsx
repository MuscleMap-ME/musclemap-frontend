/**
 * AtlasCanvas - Base React Flow canvas with glass styling
 *
 * Wraps React Flow with MuscleMap's liquid glass design system.
 */

import React, { useCallback, ReactNode } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeTypes,
  EdgeTypes,
  FitViewOptions,
  ProOptions,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface AtlasCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  onConnect?: OnConnect;
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  height?: string | number;
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  fitViewOptions?: FitViewOptions;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
  panOnDrag?: boolean;
  zoomOnScroll?: boolean;
  zoomOnPinch?: boolean;
  preventScrolling?: boolean;
}

const defaultFitViewOptions: FitViewOptions = {
  padding: 0.2,
  duration: 300,
};

const proOptions: ProOptions = {
  hideAttribution: true,
};

export function AtlasCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  edgeTypes,
  children,
  className = '',
  style,
  height = 500,
  showMiniMap = false,
  showControls = false,
  showBackground = true,
  fitViewOptions = defaultFitViewOptions,
  minZoom = 0.2,
  maxZoom = 2,
  defaultZoom = 1,
  panOnDrag = true,
  zoomOnScroll = true,
  zoomOnPinch = true,
  preventScrolling = true,
}: AtlasCanvasProps) {
  // Custom minimap node color
  const minimapNodeColor = useCallback((node: Node) => {
    const data = node.data;
    if (data?.category?.color) {
      return data.category.color;
    }
    return 'rgba(255, 255, 255, 0.3)';
  }, []);

  return (
    <div
      className={`atlas-canvas ${className}`}
      style={{
        height,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={minZoom}
        maxZoom={maxZoom}
        defaultViewport={{ x: 0, y: 0, zoom: defaultZoom }}
        panOnDrag={panOnDrag}
        zoomOnScroll={zoomOnScroll}
        zoomOnPinch={zoomOnPinch}
        preventScrolling={preventScrolling}
        proOptions={proOptions}
        style={{ background: 'transparent' }}
      >
        {showBackground && (
          <Background
            variant={BackgroundVariant.Dots}
            color="rgba(255, 255, 255, 0.05)"
            gap={20}
            size={1}
          />
        )}

        {showControls && (
          <Controls
            showZoom
            showFitView
            showInteractive={false}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
            }}
          />
        )}

        {showMiniMap && (
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor="rgba(0, 0, 0, 0.8)"
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
            }}
          />
        )}

        {children}
      </ReactFlow>
    </div>
  );
}
