import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
  type DefaultEdgeOptions,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { bracketApi, playerApi } from '../../api/client';
import MatchNode, { type MatchNodeType } from '../../components/bracket/MatchNode';
import ResultSlotNode, { type ResultSlotNodeType } from '../../components/bracket/ResultSlotNode';
import CanvasItemNode, { type CanvasItemNodeType } from '../../components/bracket/CanvasItemNode';
import type { Bracket, Player, BracketNode, ResultSlot, CanvasItem } from '../../types';

const nodeTypes: NodeTypes = {
  matchNode: MatchNode as React.ComponentType,
  resultSlotNode: ResultSlotNode as React.ComponentType,
  canvasItemNode: CanvasItemNode as React.ComponentType,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'smoothstep',
  style: { strokeWidth: 2 },
};

export default function BracketEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  const [selectedNode, setSelectedNode] = useState<BracketNode | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ResultSlot | null>(null);
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<CanvasItem | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [b, p] = await Promise.all([
        bracketApi.get(id),
        playerApi.list(),
      ]);
      setBracket(b);
      setPlayers(p);
      setLoading(false);
    } catch (e: any) {
      setError(e.message || '加载失败');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ─── 将 bracket 数据转为 React Flow nodes/edges ───

  const buildNodesAndEdges = useCallback((): { nodes: Node[]; edges: Edge[] } => {
    if (!bracket) return { nodes: [], edges: [] };
    const ns: Node[] = [];
    const es: Edge[] = [];

    for (const node of bracket.nodes) {
      ns.push({
        id: node.id,
        type: 'matchNode',
        position: { x: node.x, y: node.y },
        data: {
          label: node.label || '',
          player1: node.player1,
          player2: node.player2,
          winnerId: node.winnerId,
          onDelete: () => handleDeleteNode(node.id),
        },
        draggable: true,
        selectable: true,
      });

      for (const conn of node.outgoingConnections ?? []) {
        const targetId = conn.targetNodeId || conn.targetSlotId;
        if (targetId) {
          es.push({
            id: conn.id,
            source: node.id,
            target: targetId,
            sourceHandle: conn.outcome === 'WINNER' ? 'winner' : 'loser',
            style: { stroke: conn.outcome === 'WINNER' ? '#22c55e' : '#ef4444' },
            label: conn.outcome === 'WINNER' ? '胜者' : '败者',
            labelStyle: { fontSize: 10, fill: conn.outcome === 'WINNER' ? '#22c55e' : '#ef4444' },
          });
        }
      }
    }

    for (const slot of bracket.resultSlots) {
      ns.push({
        id: slot.id,
        type: 'resultSlotNode',
        position: { x: slot.x, y: slot.y },
        data: {
          name: slot.name,
          capacity: slot.capacity,
          assignments: slot.assignments ?? [],
          incomingCount: (slot.incomingConnections ?? []).length,
          onDelete: () => handleDeleteSlot(slot.id),
          onPlayerRemove: (playerId: string) => handleRemoveFromSlot(slot.id, playerId),
        },
        draggable: true,
        selectable: true,
      });

      for (const conn of slot.incomingConnections ?? []) {
        if (conn.sourceNodeId && !es.find(e => e.id === conn.id)) {
          es.push({
            id: conn.id,
            source: conn.sourceNodeId,
            target: slot.id,
            sourceHandle: conn.outcome === 'WINNER' ? 'winner' : 'loser',
            style: { stroke: conn.outcome === 'WINNER' ? '#22c55e' : '#ef4444' },
          });
        }
      }
    }

    for (const item of bracket.canvasItems) {
      ns.push({
        id: item.id,
        type: 'canvasItemNode',
        position: { x: item.x, y: item.y },
        data: {
          content: item.content,
          width: item.width,
          height: item.height,
          onDelete: () => handleDeleteCanvasItem(item.id),
        },
        draggable: true,
        selectable: true,
      });
    }

    return { nodes: ns, edges: es };
  }, [bracket]);

  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  useEffect(() => {
    const { nodes: ns, edges: es } = buildNodesAndEdges();
    setNodes(ns);
    setEdges(es);
  }, [buildNodesAndEdges, setNodes, setEdges]);

  // ─── 节点/边变更持久化 ───

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(changes);
    // 拖拽结束后持久化位置
    for (const change of changes) {
      if (change.type === 'position' && change.dragging === false && change.position) {
        const nodeId = change.id;
        const { x, y } = change.position;
        // 查找类型并调用对应 API
        const matchNode = bracket?.nodes.find(n => n.id === nodeId);
        if (matchNode) {
          bracketApi.updateNode(nodeId, { x, y }).catch(console.error);
        } else {
          const slotNode = bracket?.resultSlots.find(s => s.id === nodeId);
          if (slotNode) {
            bracketApi.updateSlot(nodeId, { x, y }).catch(console.error);
          } else {
            const canvasItem = bracket?.canvasItems.find(c => c.id === nodeId);
            if (canvasItem) {
              bracketApi.updateCanvasItem(nodeId, { x, y }).catch(console.error);
            }
          }
        }
      }
    }
  }, [setNodes, bracket]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges(changes);
    for (const change of changes) {
      if (change.type === 'remove') {
        bracketApi.deleteConnection(change.id).catch(console.error);
      }
    }
  }, [setEdges]);

  // ─── 连线创建（从手柄拖拽连线） ───

  const handleConnect = useCallback(async (connection: Connection) => {
    const sourceNodeId = connection.source;
    if (!sourceNodeId) return;
    // 从 sourceHandle 推算 outcome
    const outcome = connection.sourceHandle === 'winner' ? 'WINNER' : 'LOSER';
    // 检查该方向是否已有连线
    const sourceNode = bracket?.nodes.find(n => n.id === sourceNodeId);
    if (sourceNode?.outgoingConnections?.some(c => c.outcome === outcome)) {
      setError('该方向已有连线，请先删除再重新连接');
      return;
    }
    try {
      const data: Record<string, string | undefined> = {
        sourceNodeId,
        outcome,
      };
      if (connection.target) {
        const isSlot = bracket?.resultSlots.some(s => s.id === connection.target);
        if (isSlot) data.targetSlotId = connection.target;
        else data.targetNodeId = connection.target;
      }
      await bracketApi.createConnection(data as any);
      load();
    } catch (e: any) {
      setError(e.message || '创建连线失败');
    }
  }, [bracket, load]);

  // ─── 节点操作 ───

  const handleAddNode = async () => {
    if (!id) return;
    try {
      await bracketApi.createNode(id, { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 });
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

  const handleAddSlot = async () => {
    if (!id) return;
    const name = window.prompt('结果槽名称：') || '结果槽';
    const cap = parseInt(window.prompt('容纳人数：') || '1', 10) || 1;
    try {
      await bracketApi.createSlot(id, {
        name,
        x: 400 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        capacity: cap,
      });
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

  const handleAddCanvasItem = async () => {
    if (!id) return;
    const content = window.prompt('框体文字：') || '文字';
    try {
      await bracketApi.createCanvasItem(id, {
        x: 300 + Math.random() * 200,
        y: 300 + Math.random() * 200,
        width: 200,
        height: 80,
        content,
      });
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

  // ─── 选手分配 ───

  const handleAssignPlayer = async (nodeId: string, slot: 1 | 2, playerId: string) => {
    const update: Record<string, string | null> = {};
    if (slot === 1) update.player1Id = playerId;
    else update.player2Id = playerId;
    try {
      await bracketApi.updateNode(nodeId, update);
      load();
    } catch (e: any) { setError(e.message || '分配选手失败'); }
  };

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

  // ─── 拖放选手到 Canvas ───

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const dataStr = event.dataTransfer.getData('text/plain');
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      if (!data.id) return;
      // 尝试找到最近的比赛节点或结果槽
      const targetEl = document.elementFromPoint(event.clientX, event.clientY);
      if (targetEl) {
        const rfNode = targetEl.closest('[data-id]');
        if (rfNode) {
          const nodeId = rfNode.getAttribute('data-id');
          if (nodeId) {
            const isMatch = bracket?.nodes.find(n => n.id === nodeId);
            const isSlot = bracket?.resultSlots.find(s => s.id === nodeId);
            if (isMatch) {
              const rect = rfNode.getBoundingClientRect();
              const slot = (event.clientY - rect.top) < rect.height / 2 ? 1 : 2;
              handleAssignPlayer(nodeId, slot, data.id);
            } else if (isSlot) {
              handleAssignToSlot(nodeId, data.id);
            }
          }
        }
      }
    } catch { /* ignore */ }
  }, [bracket]);

  // ─── 从节点选择更新属性面板 ───

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const matchNode = bracket?.nodes.find(n => n.id === node.id);
    if (matchNode) {
      setSelectedNode(matchNode);
      setSelectedSlot(null);
      setSelectedCanvasItem(null);
      return;
    }
    const slotNode = bracket?.resultSlots.find(s => s.id === node.id);
    if (slotNode) {
      setSelectedSlot(slotNode);
      setSelectedNode(null);
      setSelectedCanvasItem(null);
      return;
    }
    const canvasItem = bracket?.canvasItems.find(c => c.id === node.id);
    if (canvasItem) {
      setSelectedCanvasItem(canvasItem);
      setSelectedNode(null);
      setSelectedSlot(null);
    }
  }, [bracket]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedSlot(null);
    setSelectedCanvasItem(null);
  }, []);

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
          <button onClick={handleAddNode} className="btn-sm">➕ 添加比赛</button>
          <button onClick={handleAddSlot} className="btn-sm">🏁 添加结果槽</button>
          <button onClick={handleAddCanvasItem} className="btn-sm">📝 添加文字框</button>
          <button onClick={() => setShowPlayerMenu(!showPlayerMenu)} className="btn-sm">👤 选手列表</button>
        </div>
      </div>

      <div className="editor-body">
        {/* 选手侧栏 */}
        {showPlayerMenu && (
          <div className="player-sidebar">
            <h4>👤 已有选手</h4>
            {players.map(p => (
              <div key={p.id} className="player-chip" draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({ id: p.id, name: p.name, avatar: p.avatar, source: 'player' }))}>
                <span className="player-chip-avatar">
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name} />
                  ) : (
                    <span className="player-chip-avatar-fallback">{p.name.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span>{p.name}</span>
              </div>
            ))}
            {players.length === 0 && <p className="hint">暂无选手</p>}

            {/* 来自比赛结果的可用选手 */}
            {(() => {
              const derived: { id: string; name: string; label: string; avatar?: string | null }[] = [];
              for (const n of bracket?.nodes ?? []) {
                if (n.winnerId && n.player1 && n.player2) {
                  const winner = n.winnerId === n.player1Id ? n.player1 : n.player2;
                  const loser = n.winnerId === n.player1Id ? n.player2 : n.player1;
                  if (!derived.some(d => d.id === winner.id)) {
                    derived.push({ id: winner.id, name: winner.name, avatar: winner.avatar, label: `🏆 ${n.label || '比赛'} 胜者` });
                  }
                  if (!derived.some(d => d.id === loser.id)) {
                    derived.push({ id: loser.id, name: loser.name, avatar: loser.avatar, label: `💀 ${n.label || '比赛'} 败者` });
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
                        <span className="player-chip-avatar">
                          {d.avatar ? (
                            <img src={d.avatar} alt={d.name} />
                          ) : (
                            <span className="player-chip-avatar-fallback">{d.name.charAt(0).toUpperCase()}</span>
                          )}
                        </span>
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

        {/* React Flow 画布 */}
        <div className="rf-editor-wrapper" onDragOver={handleDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={4}
            panOnDrag={true}
            selectNodesOnDrag={false}
            panOnScroll={true}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#cbd5e1" gap={20} />
            <Controls />
            <MiniMap
              nodeStrokeColor="#f59e0b"
              nodeColor="#fff"
              maskColor="rgba(0,0,0,0.1)"
              style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
            />
          </ReactFlow>
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
              <div className="prop-hint">将选手从侧栏拖入节点可快速分配</div>
              <div className="prop-hint">点击节点上 W/L 按钮开始连线，然后点击目标节点</div>
              <button onClick={() => handleDeleteNode(selectedNode.id)} className="btn-danger btn-block mt-8">删除节点</button>
            </div>
          )}
          {selectedSlot && (
            <div className="prop-section">
              <h4>结果槽属性</h4>
              <label>名称</label>
              <input value={selectedSlot.name} onChange={async e => {
                try { await bracketApi.updateSlot(selectedSlot.id, { name: e.target.value }); load(); }
                catch (err: any) { setError(err.message);
                }
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
              <p>👆 点击节点/槽/框体查看属性</p>
              <p>🔄 拖拽空白区域平移画布</p>
              <p>📦 拖拽移动节点位置</p>
              <p>🔗 点击节点 W/L 按钮开始连线，再点击目标完成</p>
              <p>👤 将选手从侧栏拖入节点或结果槽</p>
              <p>🗑️ 选中后按 Delete/Backspace 删除连线</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
