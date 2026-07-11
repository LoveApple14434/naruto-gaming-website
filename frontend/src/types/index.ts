export interface User {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
  coins: number;
  createdAt?: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string | null;
  nickname: string | null;
  createdAt: string;
}

export interface Bracket {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'FINISHED';
  createdAt: string;
  nodes: BracketNode[];
  resultSlots: ResultSlot[];
  canvasItems: CanvasItem[];
  _count?: { nodes: number };
}

export interface BracketNode {
  id: string;
  bracketId: string;
  x: number;
  y: number;
  label: string | null;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  loserId: string | null;
  player1?: Player | null;
  player2?: Player | null;
  incomingConnections?: Connection[];
  outgoingConnections?: Connection[];
}

export interface ResultSlot {
  id: string;
  bracketId: string;
  name: string;
  capacity: number;
  order: number;
  x: number;
  y: number;
  winnerId: string | null;
  loserId: string | null;
  winner?: Player | null;
  loser?: Player | null;
  incomingConnections?: Connection[];
}

export interface Connection {
  id: string;
  sourceNodeId: string | null;
  sourceSlotId: string | null;
  targetNodeId: string | null;
  targetSlotId: string | null;
  outcome: 'WINNER' | 'LOSER';
}

export interface CanvasItem {
  id: string;
  bracketId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: Record<string, unknown>;
}

export interface Bet {
  id: string;
  bracketId: string;
  nodeId: string;
  title: string;
  status: 'OPEN' | 'CLOSED' | 'SETTLED';
  oddsPlayer1: number | null;
  oddsPlayer2: number | null;
  totalBetsP1: number;
  totalBetsP2: number;
  result: 'WINNER_PLAYER_1' | 'WINNER_PLAYER_2' | 'DRAW' | null;
  node?: BracketNode & { player1?: Player; player2?: Player };
  userBets?: UserBet[];
  _count?: { userBets: number };
}

export interface UserBet {
  id: string;
  userId: string;
  betId: string;
  pick: 'WINNER_PLAYER_1' | 'WINNER_PLAYER_2';
  amount: number;
  settled: boolean;
  payout: number | null;
  user?: User;
  bet?: Bet;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  stock: number;
  active: boolean;
  createdAt: string;
}

export interface Redemption {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  totalCost: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user?: User;
  product?: Product;
}

export interface HallOfFameEntry {
  id: string;
  playerId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  season: string | null;
  order: number;
  active: boolean;
  player?: Player;
}
