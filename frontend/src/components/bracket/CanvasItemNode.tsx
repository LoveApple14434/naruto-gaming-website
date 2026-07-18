import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';

export type CanvasItemNodeData = {
  content: string;
  width: number;
  height: number;
  /** 编辑模式专属 */
  onDelete?: () => void;
};

function CanvasItemNode({ data, selected }: NodeProps<CanvasItemNodeData>) {
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
