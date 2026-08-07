/** The store, as it exists at any instant of the shift. */

export type HubStatus = "open" | "strained" | "critical" | "throttled" | "closed";

export type WeatherCondition = "clear" | "cloudy" | "rain" | "storm";

export interface Weather {
  condition: WeatherCondition;
  /** One line an operator would actually read on a screen. */
  note: string;
  /** Multiplier on rider travel time. 1 = normal. */
  travelPenalty: number;
  /** Multiplier on incoming order rate. */
  demandMultiplier: number;
}

export type OrderStatus =
  | "queued"
  | "picking"
  | "packed"
  | "dispatched"
  | "delivered"
  | "breached"
  | "cancelled";

export interface OrderLine {
  sku: string;
  name: string;
  qty: number;
}

export interface Order {
  id: string;
  code: string;
  /** Elapsed mission seconds when the order landed. */
  placedAt: number;
  /** Seconds from `placedAt` that we promised the customer. */
  promisedIn: number;
  lines: OrderLine[];
  status: OrderStatus;
  assignedPickerId: string | null;
  assignedRiderId: string | null;
  /** Seconds of picking work remaining. */
  pickRemaining: number;
  /** Seconds of travel remaining once dispatched. */
  travelRemaining: number;
  /** Operator-raised priority jumps the queue. */
  expedited: boolean;
  customerName: string;
  value: number;
}

export type WorkerStatus = "active" | "absent" | "break" | "offline";
export type WorkerRole = "picker" | "packer";

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  status: WorkerStatus;
  /** Picking seconds completed per simulation second. Degrades with fatigue. */
  throughput: number;
  /** 0–1. Above 0.8 the worker will ask for a break. */
  fatigue: number;
  /** Set when the operator grants a break; counts down in seconds. */
  breakRemaining: number;
  shiftNote: string | null;
}

export type RiderStatus = "idle" | "delivering" | "returning" | "offline";

export interface Rider {
  id: string;
  name: string;
  status: RiderStatus;
  currentOrderId: string | null;
  deliveriesCompleted: number;
  /** Seconds until this rider is available again. */
  returnRemaining: number;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  /** What the system believes is on the shelf. */
  systemQty: number;
  /** What is actually there. Hidden until a cycle count is run. */
  actualQty: number;
  /** Units committed to open orders. */
  reserved: number;
  /** True once a count has revealed the truth to the operator. */
  counted: boolean;
  /** Operator has blocked this SKU from being picked. */
  blocked: boolean;
  replenishmentEta: number | null;
}

export type ComplaintSeverity = "low" | "medium" | "high";

export interface Complaint {
  id: string;
  customerName: string;
  orderCode: string;
  reason: string;
  severity: ComplaintSeverity;
  /** Elapsed mission seconds. */
  raisedAt: number;
  resolution: "apologised" | "refunded" | "escalated" | null;
}

export interface WorldMetrics {
  /** On Time In Full, as a share of orders that have reached a terminal state. */
  otif: number;
  ordersDelivered: number;
  ordersBreached: number;
  ordersCancelled: number;
  revenue: number;
  refunded: number;
}

export interface WorldState {
  /** Whole seconds since the shift started. */
  elapsed: number;
  /** Derived from backlog pressure unless the operator has taken hold of it. */
  hubStatus: HubStatus;
  /** Operator-imposed hold. Wins over the derived status until cleared. */
  statusOverride: "throttled" | "closed" | null;
  /** 0–5, one decimal. The number the operator inherits and can lose. */
  rating: number;
  weather: Weather;
  orders: Order[];
  workers: Worker[];
  riders: Rider[];
  inventory: InventoryItem[];
  complaints: Complaint[];
  metrics: WorldMetrics;
  /** Equipment and other soft failures currently in force. */
  impairments: Impairment[];
  /** Deterministic RNG cursor so a run replays identically. */
  seed: number;
}

export interface Impairment {
  id: string;
  label: string;
  /** Multiplier applied to total pick throughput. */
  pickPenalty: number;
  /** Set when the operator clears it. */
  resolved: boolean;
}
