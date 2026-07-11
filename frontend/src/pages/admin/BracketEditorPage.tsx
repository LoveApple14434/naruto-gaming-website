import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bracketApi, playerApi } from '../../api/client';
import type { Bracket, Player, BracketNode, ResultSlot, CanvasItem } from '../../types';

interface DragState {
  type: 'node' | 'slot' | 'canvas-item' | 'player' | 'new-node' | 'new-slot' | 'new-text';
  id?: string;
  offsetX: number;
  offsetY: number;
}

export default function BracketEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [connecting, setConnecting] = useState<{ sourceId: string; outcome: 'WINNER' | 'LOSER'; type: 'node' } | null>(null);
  const [selectedNode, setSelectedNode] = useState<BracketNode | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ResultSlot | null>(null);
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<CanvasItem | null>(null);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [editingLabel, setEditingLabel] = useState<{ type: 'node' | 'slot' | 'canvas-item'; id: string; value: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [b, p] = await Promise.all([
      bracketApi.get(id),
      playerApi.list(),
    ]);
    setBracket(b);
    setPlayers(p);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ─── Canvas 拖放 ───

  const canvasToContent = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.target !== canvasRef.current) return;
    const { x, y } = canvasToContent(e.clientX, e.clientY);

    // Show context menu
    const action = window.prompt('添加节点 (node/slot/text)');
    if (action === 'node') handleAddNode(x, y);
    else if (action === 'slot') {
      const name = window.prompt('结果槽名称：') || '结果槽';
      const cap = parseInt(window.prompt('容纳人数：') || '1', 10) || 1;
      handleAddSlot(x, y, name, cap);
    } else if (action === 'text') {
      const content = window.prompt('框体文字：') || '文字';
      handleAddCanvasItem(x, y, content);
    }
  };

  // ─── 内联编辑 ───

  const handleStartEdit = (type: 'node' | 'slot' | 'canvas-item', id: string, currentValue: string) => {
    setEditingLabel({ type, id, value: currentValue });
  };

  const handleSaveEdit = async () => {
    if (!editingLabel) return;
    try {
      if (editingLabel.type === 'node') {
        await bracketApi.updateNode(editingLabel.id, { label: editingLabel.value });
      } else if (editingLabel.type === 'slot') {
        await bracketApi.updateSlot(editingLabel.id, { name: editingLabel.value });
      } else if (editingLabel.type === 'canvas-item') {
        await bracketApi.updateCanvasItem(editingLabel.id, { content: editingLabel.value });
      }
      setEditingLabel(null);
      load();
    } catch (e: any) { setError(e.message || '保存失败'); setEditingLabel(null); }
  };

  // ─── 节点操作 ───

  const handleAddNode = async (x: number, y: number) => {
    if (!id) return;
    try {
      await bracketApi.createNode(id, { x, y });
      load();
    } catch (e: any) { setError(e.message || '创建比赛失败'); }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('确定删除此比赛节点？')) return;
    try {
      await bracketApi.deleteNode(nodeId);
      setSelectedNode(null);
      load();
    } catch (e: any) { setError(e.message || '删除比赛失败'); }
  };

  const handleAddSlot = async (x: number, y: number, name: string, capacity: number = 1) => {
    if (!id) return;
    try {
      await bracketApi.createSlot(id, { name, x, y, capacity });
      load();
    } catch (e: any) { setError(e.message || '创建结果槽失败'); }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('确定删除此结果槽？')) return;
    try {
      await bracketApi.deleteSlot(slotId);
      setSelectedSlot(null);
      load();
    } catch (e: any) { setError(e.message || '删除结果槽失败'); }
  };

  const handleAddCanvasItem = async (x: number, y: number, content: string) => {
    if (!id) return;
    try {
      await bracketApi.createCanvasItem(id, { x, y, width: 200, height: 80, content });
      load();
    } catch (e: any) { setError(e.message || '创建框体失败'); }
  };

  const handleDeleteCanvasItem = async (itemId: string) => {
    if (!confirm('确定删除此框体？')) return;
    try {
      await bracketApi.deleteCanvasItem(itemId);
      setSelectedCanvasItem(null);
      load();
    } catch (e: any) { setError(e.message || '删除框体失败'); }
  };

  // ─── 拖拽移动 ───

  const handleDragStart = (
    e: React.MouseEvent,
    type: DragState['type'],
    id?: string,
  ) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const targetRect = target.getBoundingClientRect();
    setDragState({
      type,
      id,
      offsetX: e.clientX - targetRect.left,
      offsetY: e.clientY - targetRect.top,
    });
  };

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, (e.clientX - rect.left - dragState.offsetX) / zoom);
    const y = Math.max(0, (e.clientY - rect.top - dragState.offsetY) / zoom);

    // Optimistic local update
    if (dragState.type === 'node' && dragState.id && bracket) {
      setBracket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map(n =>
            n.id === dragState.id ? { ...n, x, y } : n
          ),
        };
      });
    } else if (dragState.type === 'slot' && dragState.id && bracket) {
      setBracket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          resultSlots: prev.resultSlots.map(s =>
            s.id === dragState.id ? { ...s, x, y } : s
          ),
        };
      });
    } else if (dragState.type === 'canvas-item' && dragState.id && bracket) {
      setBracket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          canvasItems: prev.canvasItems.map(c =>
            c.id === dragState.id ? { ...c, x, y } : c
          ),
        };
      });
    }
  }, [dragState, bracket]);

  const handleDragEnd = useCallback(async (_e: MouseEvent) => {
    if (!dragState || !bracket) { setDragState(null); return; }
    // Persist position changes
    try {
      if (dragState.type === 'node' && dragState.id) {
        const node = bracket.nodes.find(n => n.id === dragState.id);
        if (node) await bracketApi.updateNode(dragState.id, { x: node.x, y: node.y });
      } else if (dragState.type === 'slot' && dragState.id) {
        const slot = bracket.resultSlots.find(s => s.id === dragState.id);
        if (slot) await bracketApi.updateSlot(dragState.id, { x: slot.x, y: slot.y });
      } else if (dragState.type === 'canvas-item' && dragState.id) {
        const item = bracket.canvasItems.find(c => c.id === dragState.id);
        if (item) await bracketApi.updateCanvasItem(dragState.id, { x: item.x, y: item.y });
      }
    } catch (err) {
      console.error('Failed to save position:', err);
      load();
    }
    setDragState(null);
  }, [dragState, bracket, load]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragState, handleDragMove, handleDragEnd]);

  // ─── 连线操作 ───

  const handleStartConnection = (nodeId: string, outcome: 'WINNER' | 'LOSER') => {
    // 检查该出线方向是否已有连线
    const node = bracket?.nodes.find(n => n.id === nodeId);
    if (node?.outgoingConnections?.some(c => c.outcome === outcome)) {
      setError(`该方向已有连线，请先删除再重新连接`);
      return;
    }
    setConnecting({ sourceId: nodeId, outcome, type: 'node' });
  };

  const handleFinishConnection = async (targetType: 'node' | 'slot', targetId: string) => {
    if (!connecting) return;
    try {
      const data: Record<string, string | undefined> = {
        sourceNodeId: connecting.sourceId,
        outcome: connecting.outcome,
      };
      if (targetType === 'node') data.targetNodeId = targetId;
      else data.targetSlotId = targetId;
      await bracketApi.createConnection(data as any);
      load();
    } catch (e: any) { setError(e.message || '创建连线失败'); }
    setConnecting(null);
  };

  const handleDeleteConnection = async (connId: string) => {
    try {
      await bracketApi.deleteConnection(connId);
      load();
    } catch (e: any) { setError(e.message || '删除连线失败'); }
  };

  // ─── 选手分配 ───

  const handleAssignPlayer = async (nodeId: string, slot: 1 | 2, playerId: string) => {
    const node = bracket?.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const update: Record<string, string | null> = {};
    if (slot === 1) update.player1Id = playerId;
    else update.player2Id = playerId;
    try {
      await bracketApi.updateNode(nodeId, update);
      load();
    } catch (e: any) { setError(e.message || '分配选手失败'); }
  };

  const handleRemovePlayer = async (nodeId: string, slot: 1 | 2) => {
    const update: Record<string, null> = {};
    if (slot === 1) update.player1Id = null;
    else update.player2Id = null;
    try {
      await bracketApi.updateNode(nodeId, update);
      load();
    } catch (e: any) { setError(e.message || '移除选手失败'); }
  };

  // ─── 结果槽选手分配 ───

  const handleAssignToSlot = async (slotId: string, playerId: string) => {
    if (!id) return;
    try {
      const updated = await bracketApi.assignToSlot(id, slotId, playerId);
      setBracket(updated);
    } catch (e: any) { setError(e.message || '分配选手到结果槽失败'); }
  };

  const handleRemoveFromSlot = async (slotId: string, playerId: string) => {
    if (!id) return;
    try {
      const updated = await bracketApi.removeFromSlot(id, slotId, playerId);
      setBracket(updated);
    } catch (e: any) { setError(e.message || '从结果槽移除选手失败'); }
  };

  // ─── 连线渲染辅助 ───

  const getNodeCenter = (nodeId: string): { x: number; y: number } | null => {
    const node = bracket?.nodes.find(n => n.id === nodeId);
    if (!node) return null;
    return { x: node.x + 120, y: node.y + 40 };
  };

  const getSlotCenter = (slotId: string): { x: number; y: number } | null => {
    const slot = bracket?.resultSlots.find(s => s.id === slotId);
    if (!slot) return null;
    return { x: slot.x + 100, y: slot.y + 30 };
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (!bracket) return <div className="empty-state">赛程不存在</div>;

  return (
    <div className="bracket-editor-page">
      <div className="editor-toolbar">
        <button onClick={() => navigate('/admin/brackets')} className="btn-text">← 返回</button>
        <h2>编辑：{bracket.title}</h2>
        <span className={`status-badge status-${bracket.status.toLowerCase()}`}>
          {bracket.status === 'DRAFT' ? '草稿' : bracket.status === 'PUBLISHED' ? '已发布' : '已结束'}
        </span>
        {error && <div className="editor-toast" onClick={() => setError('')}>{error} ✕</div>}
        <div className="toolbar-actions">
          <button onClick={() => handleAddNode(100, 100)} className="btn-sm">➕ 添加比赛</button>
          <button onClick={() => {
            const name = window.prompt('结果槽名称：') || '结果槽';
            const cap = parseInt(window.prompt('容纳人数：') || '1', 10) || 1;
            handleAddSlot(400, 100, name, cap);
          }} className="btn-sm">🏁 添加结果槽</button>
          <button onClick={() => {
            const content = window.prompt('框体文字：') || '文字';
            handleAddCanvasItem(300, 300, content);
          }} className="btn-sm">📝 添加文字框</button>
          <button onClick={() => setShowPlayerMenu(!showPlayerMenu)} className="btn-sm">👤 选手列表</button>
          <span className="zoom-controls">
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} className="btn-sm" title="缩小">−</button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="btn-sm" title="放大">+</button>
            <button onClick={() => setZoom(1)} className="btn-sm" title="重置">⊡</button>
          </span>
        </div>
      </div>

      <div className="editor-body">
        {/* 选手侧栏 */}
        {showPlayerMenu && (
          <div className="player-sidebar">
            <h4>👤 已有选手</h4>
            {players.map(p => (
              <div key={p.id} className="player-chip" draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({ id: p.id, name: p.name, source: 'player' }))}>
                {p.name}
              </div>
            ))}
            {players.length === 0 && <p className="hint">暂无选手</p>}

            {/* 来自比赛结果的可用选手 */}
            {(() => {
              const derived: { id: string; name: string; label: string }[] = [];
              for (const n of bracket?.nodes ?? []) {
                if (n.winnerId && n.player1 && n.player2) {
                  const winner = n.winnerId === n.player1Id ? n.player1 : n.player2;
                  const loser = n.winnerId === n.player1Id ? n.player2 : n.player1;
                  if (!derived.some(d => d.id === winner.id)) {
                    derived.push({ id: winner.id, name: winner.name, label: `🏆 ${n.label || '比赛'} 胜者` });
                  }
                  if (!derived.some(d => d.id === loser.id)) {
                    derived.push({ id: loser.id, name: loser.name, label: `💀 ${n.label || '比赛'} 败者` });
                  }
                }
              }
              if (derived.length > 0) {
                return (
                  <>
                    <h4 style={{ marginTop: 16 }}>⚡ 比赛结果来源</h4>
                    {derived.map(d => (
                      <div key={d.id} className="player-chip derived" draggable
                        title={d.label}
                        onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({ id: d.id, name: d.name, source: 'result' }))}>
                        {d.name} <small>{d.label}</small>
                      </div>
                    ))}
                  </>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* 连线画布 */}
        <div className="canvas-container" ref={canvasRef} onMouseDown={handleCanvasMouseDown}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%`, height: `${100 / zoom}%` }}>
          {/* SVG 连线层 */}
          <svg className="connections-layer">
            {bracket.nodes.flatMap(n =>
              (n.outgoingConnections ?? []).map(conn => {
                const source = getNodeCenter(n.id);
                let target: { x: number; y: number } | null = null;
                if (conn.targetNodeId) target = getNodeCenter(conn.targetNodeId);
                else if (conn.targetSlotId) target = getSlotCenter(conn.targetSlotId);
                if (!source || !target) return null;
                const color = conn.outcome === 'WINNER' ? '#22c55e' : '#ef4444';
                return (
                  <line
                    key={conn.id}
                    x1={source.x} y1={source.y}
                    x2={target.x} y2={target.y}
                    stroke={color} strokeWidth={2}
                    markerEnd={`url(#arrow-${conn.outcome.toLowerCase()})`}
                    onClick={() => handleDeleteConnection(conn.id)}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })
            )}
            {/* 临时连线 */}
            {connecting && bracket.nodes.find(n => n.id === connecting.sourceId) && (
              <line
                x1={getNodeCenter(connecting.sourceId)!.x}
                y1={getNodeCenter(connecting.sourceId)!.y}
                x2={getNodeCenter(connecting.sourceId)!.x + 50}
                y2={getNodeCenter(connecting.sourceId)!.y + 50}
                stroke="#f59e0b" strokeWidth={2} strokeDasharray="5,5"
              />
            )}
            <defs>
              <marker id="arrow-winner" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
              </marker>
              <marker id="arrow-loser" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
              </marker>
            </defs>
          </svg>

          {/* 比赛节点 */}
          {bracket.nodes.map(node => (
            <div
              key={node.id}
              className={`editor-node ${selectedNode?.id === node.id ? 'selected' : ''} ${connecting ? 'connection-mode' : ''}`}
              style={{ left: node.x, top: node.y }}
              onMouseDown={e => handleDragStart(e, 'node', node.id)}
              onClick={e => { e.stopPropagation(); setSelectedNode(node); setSelectedSlot(null); setSelectedCanvasItem(null); }}
              onDoubleClick={e => {
                if (connecting) { e.stopPropagation(); handleFinishConnection('node', node.id); }
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                try {
                  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relY = e.clientY - rect.top;
                  const slot = relY < rect.height / 2 ? 1 : 2;
                  handleAssignPlayer(node.id, slot, data.id);
                } catch { /* ignore */ }
              }}
            >
              <div className="node-header">
                {editingLabel?.type === 'node' && editingLabel?.id === node.id ? (
                  <input className="inline-edit"
                    value={editingLabel.value}
                    onChange={e => setEditingLabel({ ...editingLabel, value: e.target.value })}
                    onBlur={handleSaveEdit}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingLabel(null); }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="node-label" onDoubleClick={e => { e.stopPropagation(); handleStartEdit('node', node.id, node.label || ''); }}>
                    {node.label || ''}
                  </span>
                )}
                <button className="btn-xs" onClick={e => { e.stopPropagation(); handleDeleteNode(node.id); }} title="删除比赛">×</button>
                <div className="node-outcomes">
                  <button className={`outcome-btn winner ${(node.outgoingConnections ?? []).some(c => c.outcome === 'WINNER') ? 'used' : ''}`}
                    title="胜者连线"
                    disabled={(node.outgoingConnections ?? []).some(c => c.outcome === 'WINNER')}
                    onClick={e => { e.stopPropagation(); handleStartConnection(node.id, 'WINNER'); }}>
                    W
                  </button>
                  <button className={`outcome-btn loser ${(node.outgoingConnections ?? []).some(c => c.outcome === 'LOSER') ? 'used' : ''}`}
                    title="败者连线"
                    disabled={(node.outgoingConnections ?? []).some(c => c.outcome === 'LOSER')}
                    onClick={e => { e.stopPropagation(); handleStartConnection(node.id, 'LOSER'); }}>
                    L
                  </button>
                </div>
              </div>
              <div className="node-players">
                <div className="player-slot">
                  <span>{node.player1?.name || '空'}</span>
                  {node.player1Id && <button className="btn-xs" onClick={e => { e.stopPropagation(); handleRemovePlayer(node.id, 1); }}>×</button>}
                </div>
                <div className="vs-text">VS</div>
                <div className="player-slot">
                  <span>{node.player2?.name || '空'}</span>
                  {node.player2Id && <button className="btn-xs" onClick={e => { e.stopPropagation(); handleRemovePlayer(node.id, 2); }}>×</button>}
                </div>
              </div>
            </div>
          ))}

          {/* 结果槽 */}
          {bracket.resultSlots.map(slot => (
            <div
              key={slot.id}
              className={`editor-slot ${selectedSlot?.id === slot.id ? 'selected' : ''} ${connecting ? 'connection-target' : ''}`}
              style={{ left: slot.x, top: slot.y }}
              onMouseDown={e => handleDragStart(e, 'slot', slot.id)}
              onClick={e => { e.stopPropagation(); setSelectedSlot(slot); setSelectedNode(null); setSelectedCanvasItem(null); }}
              onDoubleClick={e => {
                if (connecting) {
                  e.stopPropagation();
                  handleFinishConnection('slot', slot.id);
                }
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                try {
                  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                  handleAssignToSlot(slot.id, data.id);
                } catch { /* ignore */ }
              }}
            >
              <div className="slot-header">
                {editingLabel?.type === 'slot' && editingLabel?.id === slot.id ? (
                  <input className="inline-edit"
                    value={editingLabel.value}
                    onChange={e => setEditingLabel({ ...editingLabel, value: e.target.value })}
                    onBlur={handleSaveEdit}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingLabel(null); }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span onDoubleClick={e => { e.stopPropagation(); handleStartEdit('slot', slot.id, slot.name); }}>
                    {slot.name}
                  </span>
                )}
                <button className="btn-xs" onClick={e => { e.stopPropagation(); handleDeleteSlot(slot.id); }}>×</button>
              </div>
              <div className="slot-players">
                <div className="slot-assignments">
                  {(() => {
                    const aList = slot.assignments ?? [];
                    const iConns = slot.incomingConnections ?? [];
                    const pending = iConns.length - aList.length;
                    return (
                      <>
                        {aList.map(a => (
                          <span key={a.id} className="slot-player-tag"
                            title="点击移除"
                            onClick={e => { e.stopPropagation(); handleRemoveFromSlot(slot.id, a.playerId); }}>
                            {a.player?.name} ✕
                          </span>
                        ))}
                        {pending > 0 && Array.from({ length: pending }).map((_, i) => (
                          <span key={`p-${i}`} className="slot-player-tag pending">待定</span>
                        ))}
                        {aList.length === 0 && iConns.length === 0 && (
                          <span className="slot-empty">空 (拖入选手)</span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="slot-capacity">
                  {(() => {
                    const aList = slot.assignments ?? [];
                    const iConns = slot.incomingConnections ?? [];
                    return `${aList.length}/${slot.capacity}${iConns.length > 0 ? ` +${iConns.length - aList.length}待分配` : ''}`;
                  })()}
                </div>
              </div>
              {connecting && <div className="connect-hint">双击连接</div>}
            </div>
          ))}

          {/* 自定义框体 */}
          {bracket.canvasItems.map(item => (
            <div
              key={item.id}
              className={`editor-canvas-item ${selectedCanvasItem?.id === item.id ? 'selected' : ''}`}
              style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
              onMouseDown={e => handleDragStart(e, 'canvas-item', item.id)}
              onClick={e => { e.stopPropagation(); setSelectedCanvasItem(item); setSelectedNode(null); setSelectedSlot(null); }}
            >
              {editingLabel?.type === 'canvas-item' && editingLabel?.id === item.id ? (
                <input className="inline-edit"
                  value={editingLabel.value}
                  onChange={e => setEditingLabel({ ...editingLabel, value: e.target.value })}
                  onBlur={handleSaveEdit}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingLabel(null); }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <div className="canvas-item-content" onDoubleClick={e => { e.stopPropagation(); handleStartEdit('canvas-item', item.id, item.content); }}>
                  {item.content}
                </div>
              )}
              <button className="btn-xs" onClick={e => { e.stopPropagation(); handleDeleteCanvasItem(item.id); }}>×</button>
            </div>
          ))}

          {/* Double-click targets for connection */}
          {connecting && (
            <div className="connecting-hint">
              双击目标 <strong>比赛节点</strong> 或 <strong>结果槽</strong> 完成连线
            </div>
          )}
        </div>

        {/* 属性面板 */}
        <div className="properties-panel">
          {selectedNode && (
            <div className="prop-section">
              <h4>比赛属性</h4>
              <label>标签</label>
              <input value={selectedNode.label || ''} onChange={async e => {
                try { await bracketApi.updateNode(selectedNode.id, { label: e.target.value }); load(); }
                catch (err: any) { setError(err.message); }
              }} />
              <label>选手1</label>
              <select value={selectedNode.player1Id || ''} onChange={e => handleAssignPlayer(selectedNode.id, 1, e.target.value)}>
                <option value="">—</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label>选手2</label>
              <select value={selectedNode.player2Id || ''} onChange={e => handleAssignPlayer(selectedNode.id, 2, e.target.value)}>
                <option value="">—</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="prop-hint">将选手拖入结果槽即可分配</div>
              <button onClick={() => handleDeleteNode(selectedNode.id)} className="btn-danger btn-block mt-8">删除节点</button>
            </div>
          )}
          {selectedSlot && (
            <div className="prop-section">
              <h4>结果槽属性</h4>
              <label>名称</label>
              <input value={selectedSlot.name} onChange={async e => {
                try { await bracketApi.updateSlot(selectedSlot.id, { name: e.target.value }); load(); }
                catch (err: any) { setError(err.message); }
              }} />
              <label>容纳人数</label>
              <input type="number" value={selectedSlot.capacity} onChange={async e => {
                try { await bracketApi.updateSlot(selectedSlot.id, { capacity: Number(e.target.value) }); load(); }
                catch (err: any) { setError(err.message); }
              }} />
              <button onClick={() => handleDeleteSlot(selectedSlot.id)} className="btn-danger btn-block mt-8">删除槽位</button>
            </div>
          )}
          {selectedCanvasItem && (
            <div className="prop-section">
              <h4>框体属性</h4>
              <label>内容</label>
              <textarea value={selectedCanvasItem.content} onChange={async e => {
                try { await bracketApi.updateCanvasItem(selectedCanvasItem.id, { content: e.target.value }); load(); }
                catch (err: any) { setError(err.message); }
              }} />
              <button onClick={() => handleDeleteCanvasItem(selectedCanvasItem.id)} className="btn-danger btn-block mt-8">删除框体</button>
            </div>
          )}
          {!selectedNode && !selectedSlot && !selectedCanvasItem && (
            <div className="prop-section hint">
              <p>点击节点/槽/框体查看属性</p>
              <p>拖拽移动位置</p>
              <p>点击节点上的 W/L 开始连线</p>
              <p>双击目标完成连线</p>
              <p>将选手从侧栏拖入节点参赛</p>
              <p>将选手从侧栏拖入结果槽分配名次</p>
              <p>点击结果槽中的选手名可移除</p>
              <p>点击连线可删除</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
