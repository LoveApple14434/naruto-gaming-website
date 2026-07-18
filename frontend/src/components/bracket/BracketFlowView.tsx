import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type DefaultEdgeOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MatchNode, { type MatchNodeType } from './MatchNode';
import ResultSlotNode, { type ResultSlotNodeType } from './ResultSlotNode';
import CanvasItemNode, { type CanvasItemNodeType } from './CanvasItemNode';
import type { Bracket } from '../../types';

const nodeTypes: NodeTypes = {
  matchNode: MatchNode as React.ComponentType,
  resultSlotNode: ResultSlotNode as React.ComponentType,
  canvasItemNode: CanvasItemNode as React.ComponentType,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'smoothstep',
  animated: false,
  style: { strokeWidth: 2 },
};

interface BracketFlowViewProps {
  bracket: Bracket;
  /** 是否可交互（编辑模式） */
  interactive?: boolean;
  /** 额外渲染内容（如竞猜列表） */
  children?: React.ReactNode;
}

export default function BracketFlowView({ bracket, interactive = false, children }: BracketFlowViewProps) {
  const { nodes, edges } = useMemo(() => {
    const n: Node[] = [];
    const e: Edge[] = [];

    // 比赛节点
    for (const node of bracket.nodes) {
      n.push({
        id: node.id,
        type: 'matchNode',
        position: { x: node.x, y: node.y },
        data: {
          label: node.label || '',
          player1: node.player1,
          player2: node.player2,
          winnerId: node.winnerId,
        },
        draggable: interactive,
        selectable: interactive,
      });

      // 连线
      for (const conn of node.outgoingConnections ?? []) {
        let targetId = conn.targetNodeId || conn.targetSlotId;
        if (targetId) {
          e.push({
            id: conn.id,
            source: node.id,
            target: targetId,
            sourceHandle: conn.outcome === 'WINNER' ? 'winner' : 'loser',
            style: {
              stroke: conn.outcome === 'WINNER' ? '#22c55e' : '#ef4444',
            },
            label: conn.outcome === 'WINNER' ? '胜者' : '败者',
            labelStyle: {
              fontSize: 10,
              fill: conn.outcome === 'WINNER' ? '#22c55e' : '#ef4444',
            },
          });
        }
      }
    }

    // 结果槽
    for (const slot of bracket.resultSlots) {
      n.push({
        id: slot.id,
        type: 'resultSlotNode',
        position: { x: slot.x, y: slot.y },
        data: {
          name: slot.name,
          capacity: slot.capacity,
          assignments: slot.assignments ?? [],
          incomingCount: (slot.incomingConnections ?? []).length,
        },
        draggable: interactive,
        selectable: interactive,
      });

      // 结果槽的出线（如果有）
      for (const conn of slot.incomingConnections ?? []) {
        if (conn.sourceNodeId && !e.find(edge => edge.id === conn.id)) {
          e.push({
            id: conn.id,
            source: conn.sourceNodeId,
            target: slot.id,
            sourceHandle: conn.outcome === 'WINNER' ? 'winner' : 'loser',
            style: {
              stroke: conn.outcome === 'WINNER' ? '#22c55e' : '#ef4444',
            },
          });
        }
      }
    }

    // 自定义框体
    for (const item of bracket.canvasItems) {
      n.push({
        id: item.id,
        type: 'canvasItemNode',
        position: { x: item.x, y: item.y },
        data: {
          content: item.content,
          width: item.width,
          height: item.height,
        },
        draggable: interactive,
        selectable: interactive,
      });
    }

    return { nodes: n, edges: e };
  }, [bracket, interactive]);

  return (
    <div className="rf-flow-wrapper">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={4}
        panOnDrag={true}
        selectNodesOnDrag={false}
        panOnScroll={true}
        nodesDraggable={interactive}
        nodesConnectable={false}
        elementsSelectable={interactive}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor="#f59e0b"
          nodeColor="#fff"
          maskColor="rgba(0,0,0,0.1)"
          style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
        />
      </ReactFlow>
      {children && <div className="rf-children">{children}</div>}
    </div>
  );
}
