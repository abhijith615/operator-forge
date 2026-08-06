export const openaiApiKey = process.env.OPENAI_API_KEY?.trim() ?? "";

/** Chat is the one Phase 2 surface that genuinely cannot run without a key. */
export const isOpenAIConfigured = Boolean(openaiApiKey);

export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

/** Colleagues are terse; the copilot is allowed to lay out a table. */
export const AGENT_MAX_TOKENS = 320;
export const ASSISTANT_MAX_TOKENS = 900;
