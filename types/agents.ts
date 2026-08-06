export type AgentId = "hub-manager" | "inventory-lead" | "customer";

export interface AgentPersona {
  id: AgentId;
  name: string;
  role: string;
  /** Two-letter monogram for the avatar. */
  monogram: string;
  accent: "ion" | "flux" | "ember";
  /** Shown under the name in the thread list. */
  blurb: string;
  /** Drives tone, priorities and what this character refuses to do. */
  systemPrompt: string;
  /** Seeded into an empty thread. */
  openers: readonly string[];
  suggestions: readonly string[];
  /** Rough seconds this character takes before replying, for the typing beat. */
  responsiveness: number;
}

export type ChatRole = "operator" | "agent";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Elapsed mission seconds. */
  at: number;
  /** Agent messages only: true once the operator has the thread open. */
  seen?: boolean;
  pending?: boolean;
  error?: string;
}

export interface Conversation {
  agentId: AgentId;
  messages: ChatMessage[];
  /** Elapsed seconds of the last message the operator actually read. */
  lastReadAt: number;
}

/** Assistant is a tool, not a colleague — it gets its own thread shape. */
export interface AssistantMessage extends ChatMessage {
  role: ChatRole;
}
