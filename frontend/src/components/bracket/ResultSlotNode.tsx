import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Player } from '../../types';

export type ResultSlotNodeData = {
  name: string;
  capacity: number;
  assignments: { id: string; playerId: string; player?: Player | null }[];
  incomingCount: number;
  /** 编辑模式专属 */
  onDelete?: () => void;
  onPlayerRemove?: (playerId: string) => void;
};

function ResultSlotNode({ data, selected }: NodeProps<ResultSlotNodeData>) {
  const { name, capacity, assignments, incomingCount } = data;
  const pendingCount = incomingCount - assignments.length;

  return (
    <div className={`rf-node rf-slot-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="rf-slot-header">
        <span>{name}</span>
        <span className="rf-slot-capacity">{assignments.length}/{capacity}</span>
      </div>
      <div className="rf-slot-players">
        {assignments.map(a => (
          <span key={a.id} className="rf-slot-player" title={a.player?.name}>
            {a.player ? (
              <>
                <span className="rf-player-avatar rf-avatar-sm">
                  {a.player.avatar ? (
                    <img src={a.player.avatar} alt={a.player.name} />
                  ) : (
                    <span className="rf-player-avatar-fallback">
                      {a.player.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span>{a.player.name}</span>
              </>
            ) : (
              <span>—</span>
            )}
          </span>
        ))}
        {pendingCount > 0 && Array.from({ length: pendingCount }).map((_, i) => (
          <span key={`p-${i}`} className="rf-slot-player pending">待定</span>
        ))}
        {assignments.length === 0 && incomingCount === 0 && (
          <span className="rf-slot-empty">—</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} id="out" style={{ background: '#f59e0b' }} />
    </div>
  );
}

export default memo(ResultSlotNode);
