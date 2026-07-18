import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';

export type CanvasItemNodeData = {
  content: string;
  width: number;
  height: number;
  /** 编辑模式专属 */
  onDelete?: () => void;
};

export type CanvasItemNodeType = Node<CanvasItemNodeData, 'canvasItemNode'>;

function CanvasItemNode({ data, selected }: NodeProps<CanvasItemNodeType>) {
  return (
    <div
      className={`rf-node rf-canvas-item ${selected ? 'selected' : ''}`}
      style={{ width: data.width, height: data.height }}
    >
      <div className="rf-canvas-content">{data.content}</div>
    </div>
  );
}

export default memo(CanvasItemNode);
