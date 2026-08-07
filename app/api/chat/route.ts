import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";

import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/agents/assistant";
import {
  AGENT_MAX_TOKENS,
  ASSISTANT_MAX_TOKENS,
  OPENAI_MODEL,
  isOpenAIConfigured,
  openaiApiKey,
} from "@/lib/agents/config";
import { buildWorldBriefing } from "@/lib/agents/context";
import { AGENTS, isAgentId } from "@/lib/agents/personas";
import { getOperator } from "@/lib/auth/session";
import type { WorldState } from "@/types/world";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Health check. Answers "does this running server have a key?" in one request,
 * which is otherwise only observable by trying to send a message and reading a
 * failure. Returns no part of the key itself.
 */
export async function GET() {
  const operator = await getOperator();
  if (!operator) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.json({
    configured: isOpenAIConfigured,
    model: isOpenAIConfigured ? OPENAI_MODEL : null,
  });
}

interface ChatRequestBody {
  /** `assistant` or one of the three colleague ids. */
  target: string;
  messages: { role: "operator" | "agent"; content: string }[];
  world: WorldState | null;
}

const MAX_HISTORY = 16;
const MAX_MESSAGE_CHARS = 2000;

export async function POST(request: NextRequest) {
  // The floor state is the operator's own session data; never serve it to
  // anyone who is not signed in.
  const operator = await getOperator();
  if (!operator) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!isOpenAIConfigured) {
    return NextResponse.json(
      {
        error:
          "Chat is not configured. Add OPENAI_API_KEY to .env.local and restart the server.",
        code: "not_configured",
      },
      { status: 503 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { target, messages, world } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No message to answer." }, { status: 400 });
  }

  const isAssistant = target === "assistant";
  if (!isAssistant && !isAgentId(target)) {
    return NextResponse.json({ error: "Unknown recipient." }, { status: 400 });
  }

  const systemPrompt = isAssistant
    ? ASSISTANT_SYSTEM_PROMPT
    : AGENTS[target as keyof typeof AGENTS].systemPrompt;

  const briefing = world
    ? buildWorldBriefing(world)
    : "The shift has not started. There is no floor data yet.";

  const history = messages.slice(-MAX_HISTORY).map((message) => ({
    role: message.role === "operator" ? ("user" as const) : ("assistant" as const),
    content: message.content.slice(0, MAX_MESSAGE_CHARS),
  }));

  const client = new OpenAI({ apiKey: openaiApiKey });

  try {
    const stream = await client.chat.completions.create({
      model: OPENAI_MODEL,
      stream: true,
      temperature: isAssistant ? 0.3 : 0.85,
      max_tokens: isAssistant ? ASSISTANT_MAX_TOKENS : AGENT_MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "system",
          content: `Current floor state. Do not invent anything beyond it.\n\n${briefing}`,
        },
        ...history,
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `\n\n_(connection dropped: ${
                error instanceof Error ? error.message : "unknown error"
              })_`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    // A missing key and a rejected key are completely different problems, and
    // telling them apart is the difference between a two-second fix and an hour.
    const status =
      error instanceof OpenAI.APIError ? (error.status ?? 502) : 502;

    if (status === 401) {
      return NextResponse.json(
        {
          error:
            "The model rejected this API key. Check OPENAI_API_KEY in .env.local, then restart the server.",
          code: "invalid_key",
        },
        { status: 502 },
      );
    }

    if (status === 429) {
      return NextResponse.json(
        {
          error:
            "This API key is out of quota or rate limited. Check billing on the OpenAI dashboard.",
          code: "quota",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "The model did not respond.",
        code: "upstream",
      },
      { status: 502 },
    );
  }
}
