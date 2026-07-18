import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Player } from '../../types';

export type MatchNodeData = {
  label: string;
  player1?: Player | null;
  player2?: Player | null;
  winnerId?: string | null;
  /** 编辑模式专属 */
  onDelete?: () => void;
};

function MatchNode({ data, selected }: NodeProps<MatchNodeData>) {
  const { label, player1, player2, winnerId } = data;
  const p1Win = winnerId != null && player1 != null && winnerId === player1.id;
  const p2Win = winnerId != null && player2 != null && winnerId === player2.id;

  return (
    <div className={`rf-node rf-match-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="rf-match-header">
        <span className="rf-match-label">{label || ''}</span>
      </div>
      <div className="rf-match-players">
        <div className={`rf-player ${p1Win ? 'winner' : ''}`}>
          {player1 ? (
            <>
              <span className="rf-player-avatar">
                {player1.avatar ? (
                  <img src={player1.avatar} alt={player1.name} />
                ) : (
                  <span className="rf-player-avatar-fallback">
                    {player1.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="rf-player-name">{player1.name}</span>
              {p1Win && <span className="rf-crown">👑</span>}
            </>
          ) : (
            <span className="rf-player-empty">—</span>
          )}
        </div>
        <div className="rf-vs">VS</div>
        <div className={`rf-player ${p2Win ? 'winner' : ''}`}>
          {player2 ? (
            <>
              <span className="rf-player-avatar">
                {player2.avatar ? (
                  <img src={player2.avatar} alt={player2.name} />
                ) : (
                  <span className="rf-player-avatar-fallback">
                    {player2.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="rf-player-name">{player2.name}</span>
              {p2Win && <span className="rf-crown">👑</span>}
            </>
          ) : (
            <span className="rf-player-empty">—</span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="winner" style={{ left: '35%', background: '#22c55e' }} title="胜者" />
      <Handle type="source" position={Position.Bottom} id="loser" style={{ left: '65%', background: '#ef4444' }} title="败者" />
    </div>
  );
}

export default memo(MatchNode);
