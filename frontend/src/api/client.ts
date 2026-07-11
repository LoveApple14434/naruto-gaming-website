const API_BASE = import.meta.env.VITE_API_URL || '/naruto/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const authApi = {
  register: (data: { username: string; password: string }) =>
    request<{ token: string; user: import('../types').User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { username: string; password: string }) =>
    request<{ token: string; user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<import('../types').User>('/auth/me'),
};

// Players
export const playerApi = {
  list: () => request<import('../types').Player[]>('/players'),
  get: (id: string) => request<import('../types').Player>(`/players/${id}`),
  create: (data: Partial<import('../types').Player>) =>
    request<import('../types').Player>('/players', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<import('../types').Player>) =>
    request<import('../types').Player>(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/players/${id}`, { method: 'DELETE' }),
};

// Brackets
export const bracketApi = {
  list: (query?: string) => request<import('../types').Bracket[]>(`/brackets${query ?? ''}`),
  get: (id: string) => request<import('../types').Bracket>(`/brackets/${id}`),
  create: (title?: string) =>
    request<import('../types').Bracket>('/brackets', { method: 'POST', body: JSON.stringify({ title }) }),
  update: (id: string, data: { title?: string }) =>
    request<import('../types').Bracket>(`/brackets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/brackets/${id}`, { method: 'DELETE' }),
  publish: (id: string) =>
    request<import('../types').Bracket>(`/brackets/${id}/publish`, { method: 'POST' }),
  finish: (id: string) =>
    request<import('../types').Bracket>(`/brackets/${id}/finish`, { method: 'POST' }),
  // Nodes
  createNode: (bracketId: string, data: { x: number; y: number; label?: string; player1Id?: string; player2Id?: string }) =>
    request<import('../types').BracketNode>(`/brackets/${bracketId}/nodes`, { method: 'POST', body: JSON.stringify(data) }),
  updateNode: (nodeId: string, data: Record<string, unknown>) =>
    request<import('../types').BracketNode>(`/brackets/nodes/${nodeId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNode: (nodeId: string) =>
    request<{ success: boolean }>(`/brackets/nodes/${nodeId}`, { method: 'DELETE' }),
  // Result slots
  createSlot: (bracketId: string, data: { name: string; capacity?: number; order?: number; x: number; y: number }) =>
    request<import('../types').ResultSlot>(`/brackets/${bracketId}/result-slots`, { method: 'POST', body: JSON.stringify(data) }),
  updateSlot: (slotId: string, data: Record<string, unknown>) =>
    request<import('../types').ResultSlot>(`/brackets/result-slots/${slotId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSlot: (slotId: string) =>
    request<{ success: boolean }>(`/brackets/result-slots/${slotId}`, { method: 'DELETE' }),
  assignToSlot: (bracketId: string, slotId: string, playerId: string) =>
    request<import('../types').Bracket>(`/brackets/${bracketId}/result-slots/${slotId}/assign`, { method: 'POST', body: JSON.stringify({ playerId }) }),
  removeFromSlot: (bracketId: string, slotId: string, playerId: string) =>
    request<import('../types').Bracket>(`/brackets/${bracketId}/result-slots/${slotId}/assign/${playerId}`, { method: 'DELETE' }),
  // Connections
  createConnection: (data: { sourceNodeId?: string; sourceSlotId?: string; targetNodeId?: string; targetSlotId?: string; outcome: string }) =>
    request<import('../types').Connection>('/brackets/connections', { method: 'POST', body: JSON.stringify(data) }),
  deleteConnection: (connId: string) =>
    request<{ success: boolean }>(`/brackets/connections/${connId}`, { method: 'DELETE' }),
  // Canvas items
  createCanvasItem: (bracketId: string, data: { x: number; y: number; width: number; height: number; content: string }) =>
    request<import('../types').CanvasItem>(`/brackets/${bracketId}/canvas-items`, { method: 'POST', body: JSON.stringify(data) }),
  updateCanvasItem: (itemId: string, data: Record<string, unknown>) =>
    request<import('../types').CanvasItem>(`/brackets/canvas-items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCanvasItem: (itemId: string) =>
    request<{ success: boolean }>(`/brackets/canvas-items/${itemId}`, { method: 'DELETE' }),
};

// Bets
export const betApi = {
  listByBracket: (bracketId: string) =>
    request<import('../types').Bet[]>(`/bets/bracket/${bracketId}`),
  get: (id: string) => request<import('../types').Bet>(`/bets/${id}`),
  create: (bracketId: string, data: { nodeId: string; title: string; oddsPlayer1?: number; oddsPlayer2?: number }) =>
    request<import('../types').Bet>(`/bets/bracket/${bracketId}`, { method: 'POST', body: JSON.stringify(data) }),
  close: (id: string) =>
    request<import('../types').Bet>(`/bets/${id}/close`, { method: 'PUT' }),
  settle: (id: string, data: { result: string }) =>
    request<{ success: boolean }>(`/bets/${id}/settle`, { method: 'PUT', body: JSON.stringify(data) }),
  place: (id: string, data: { pick: string; amount: number }) =>
    request<{ success: boolean }>(`/bets/${id}/place`, { method: 'POST', body: JSON.stringify(data) }),
  myBets: () => request<import('../types').UserBet[]>('/bets/user/my'),
};

// Products
export const productApi = {
  list: () => request<import('../types').Product[]>('/products'),
  listAll: () => request<import('../types').Product[]>('/products/all'),
  get: (id: string) => request<import('../types').Product>(`/products/${id}`),
  create: (data: Partial<import('../types').Product>) =>
    request<import('../types').Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<import('../types').Product>) =>
    request<import('../types').Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE' }),
};

// Redemptions
export const redemptionApi = {
  create: (data: { productId: string; quantity?: number }) =>
    request<import('../types').Redemption>('/redemptions', { method: 'POST', body: JSON.stringify(data) }),
  my: () => request<import('../types').Redemption[]>('/redemptions/my'),
  all: () => request<import('../types').Redemption[]>('/redemptions/all'),
  updateStatus: (id: string, status: string) =>
    request<import('../types').Redemption>(`/redemptions/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

// Hall of Fame
export const hallOfFameApi = {
  list: () => request<import('../types').HallOfFameEntry[]>('/hall-of-fame'),
  listAll: () => request<import('../types').HallOfFameEntry[]>('/hall-of-fame/all'),
  create: (data: Partial<import('../types').HallOfFameEntry>) =>
    request<import('../types').HallOfFameEntry>('/hall-of-fame', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<import('../types').HallOfFameEntry>) =>
    request<import('../types').HallOfFameEntry>(`/hall-of-fame/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/hall-of-fame/${id}`, { method: 'DELETE' }),
};

// Upload
export const uploadApi = {
  image: async (file: File): Promise<{ url: string }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '上传失败' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
};
