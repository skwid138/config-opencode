/**
 * Council Review Tool Plugin
 *
 * Exposes council_review(prompt), which runs the same review prompt through a
 * configured set of Saruman councillors in parallel, then asks Elrond to
 * structurally aggregate the results.
 */

import { tool, type Plugin, type PluginOptions } from "@opencode-ai/plugin";

const COUNCILLOR_TIMEOUT_MS = 180_000;
const COUNCILLOR_RETRY_TIMEOUT_MS = 90_000;
const ELROND_TIMEOUT_MS = 60_000;
const HARD_CAP_MS = 360_000;

type ModelConfig = {
  providerID: string;
  modelID: string;
};

type CouncilConfig = {
  reviewer: string;
  aggregator: string;
  models: ModelConfig[];
  aggregator_model: ModelConfig | null;
};

type CouncillorSuccess = {
  model: ModelConfig;
  response: string;
  attempts: number;
};

type CouncillorFailure = {
  model: ModelConfig;
  error: string;
};

const DEFAULT_COUNCIL_CONFIG: CouncilConfig = {
  reviewer: "saruman",
  aggregator: "elrond",
  models: [
    { providerID: "github-copilot", modelID: "claude-opus-4.6" },
    { providerID: "openai", modelID: "gpt-5.5" },
    { providerID: "github-copilot", modelID: "gemini-3.1-pro-preview" },
    { providerID: "github-copilot", modelID: "gpt-5.3-codex" },
  ],
  aggregator_model: null,
};

const ELROND_TOOLS = {
  "chrome-devtools": false,
  context7: false,
  exa: false,
  figma: false,
  read: false,
  write: false,
  edit: false,
  bash: false,
  glob: false,
  grep: false,
  list: false,
  task: false,
  question: false,
  todowrite: false,
  webfetch: false,
  websearch: false,
  skill: false,
  compress: false,
  vision: false,
  council_review: false,
};

function extractLatestAssistantText(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const assistantMessages = messages
    .filter(
      (msg): msg is Record<string, unknown> =>
        typeof msg === "object" && msg !== null,
    )
    .filter((msg) => {
      const info = msg.info as Record<string, unknown> | undefined;
      return info?.role === "assistant";
    })
    .sort((a, b) => {
      const aTime = (a.info as Record<string, unknown>)?.time as
        | Record<string, number>
        | undefined;
      const bTime = (b.info as Record<string, unknown>)?.time as
        | Record<string, number>
        | undefined;
      return (bTime?.created ?? 0) - (aTime?.created ?? 0);
    });

  const lastMessage = assistantMessages[0];
  if (!lastMessage) return null;

  const parts = lastMessage.parts as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n")
    .trim();

  return text.length > 0 ? text : null;
}

function isModelConfig(value: unknown): value is ModelConfig {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.providerID === "string" &&
    candidate.providerID.trim().length > 0 &&
    typeof candidate.modelID === "string" &&
    candidate.modelID.trim().length > 0
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCouncilConfig(
  raw: unknown,
  fallback: CouncilConfig = DEFAULT_COUNCIL_CONFIG,
): CouncilConfig {
  const source = isPlainObject(raw)
    ? isPlainObject(raw.council)
      ? raw.council
      : raw
    : {};

  const models = Array.isArray(source.models)
    ? source.models.filter(isModelConfig)
    : fallback.models;

  const aggregatorModel =
    source.aggregator_model === null
      ? null
      : isModelConfig(source.aggregator_model)
        ? source.aggregator_model
        : fallback.aggregator_model;

  return {
    reviewer:
      typeof source.reviewer === "string" && source.reviewer.trim().length > 0
        ? source.reviewer
        : fallback.reviewer,
    aggregator:
      typeof source.aggregator === "string" &&
      source.aggregator.trim().length > 0
        ? source.aggregator
        : fallback.aggregator,
    models: models.length > 0 ? models : fallback.models,
    aggregator_model: aggregatorModel,
  };
}

function modelLabel(model: ModelConfig): string {
  return `${model.providerID}/${model.modelID}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatSeconds(ms: number): string {
  return `${Math.round(ms / 1000)}s`;
}

async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(
        new Error(`${label} timed out after ${formatSeconds(timeoutMs)}`),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function buildElrondPrompt(input: {
  originalPrompt: string;
  successes: CouncillorSuccess[];
  failures: CouncillorFailure[];
}): string {
  const successfulResponses = input.successes
    .map(
      (success, index) => `## Reviewer ${index + 1}: ${modelLabel(success.model)}

Attempts: ${success.attempts}

${success.response}`,
    )
    .join("\n\n---\n\n");

  const failures =
    input.failures.length > 0
      ? input.failures
          .map(
            (failure) =>
              `- ${modelLabel(failure.model)}: ${failure.error || "failed"}`,
          )
          .join("\n")
      : "- none";

  return `You are aggregating multiple reviewer responses to one review prompt.

Do structural aggregation only. Do not issue your own verdict.

# Original review prompt

${input.originalPrompt}

# Participation summary supplied by council_review

Responded:
${input.successes.map((success) => `- ${modelLabel(success.model)} (${success.attempts} attempt${success.attempts === 1 ? "" : "s"})`).join("\n")}

Failed or timed out:
${failures}

# Reviewer responses

${successfulResponses}`;
}

function formatFailureSummary(failures: CouncillorFailure[]): string {
  if (failures.length === 0) return "none";
  return failures
    .map((failure) => `- ${modelLabel(failure.model)}: ${failure.error}`)
    .join("\n");
}

const CouncilToolPlugin: Plugin = async (ctx, options?: PluginOptions) => {
  const councilConfig = normalizeCouncilConfig(options);

  async function parentDirectory(sessionID: string): Promise<string> {
    const parentSession = await ctx.client.session
      .get({ path: { id: sessionID } })
      .catch(() => null);
    return parentSession?.data?.directory ?? ctx.directory;
  }

  async function createChildSession(
    parentSessionID: string,
    title: string,
  ): Promise<string> {
    const createResult = await ctx.client.session.create({
      body: {
        parentID: parentSessionID,
        title,
        permission: [{ permission: "question", action: "deny", pattern: "*" }],
      },
      query: { directory: await parentDirectory(parentSessionID) },
    } as Parameters<typeof ctx.client.session.create>[0]);

    if (createResult.error) {
      throw new Error(`failed to create child session: ${createResult.error}`);
    }

    const sessionID = createResult.data?.id;
    if (!sessionID) {
      throw new Error("failed to create child session: missing session id");
    }

    return sessionID;
  }

  async function promptAndExtract(input: {
    sessionID: string;
    agent: string;
    prompt: string;
    model?: ModelConfig;
    tools?: Record<string, boolean>;
  }): Promise<string> {
    const body: Record<string, unknown> = {
      agent: input.agent,
      parts: [{ type: "text", text: input.prompt }],
    };

    if (input.model) body.model = input.model;
    if (input.tools) body.tools = input.tools;

    const promptResult = await ctx.client.session.prompt({
      path: { id: input.sessionID },
      body,
    } as Parameters<typeof ctx.client.session.prompt>[0]);

    if (promptResult.error) {
      throw new Error(`prompt failed: ${promptResult.error}`);
    }

    const messagesResult = await ctx.client.session.messages({
      path: { id: input.sessionID },
    });

    if (messagesResult.error) {
      throw new Error(`failed to get messages: ${messagesResult.error}`);
    }

    const responseText = extractLatestAssistantText(messagesResult.data);
    if (!responseText) {
      throw new Error("empty response");
    }

    return responseText;
  }

  async function runCouncillorAttempt(input: {
    parentSessionID: string;
    prompt: string;
    model: ModelConfig;
    timeoutMs: number;
    attempt: number;
  }): Promise<string> {
    const label = modelLabel(input.model);
    return await raceWithTimeout(
      (async () => {
        const sessionID = await createChildSession(
          input.parentSessionID,
          `council: ${label} attempt ${input.attempt}`,
        );

        return await promptAndExtract({
          sessionID,
          agent: councilConfig.reviewer,
          model: input.model,
          prompt: input.prompt,
        });
      })(),
      input.timeoutMs,
      `${label} attempt ${input.attempt}`,
    );
  }

  async function runCouncillor(input: {
    parentSessionID: string;
    prompt: string;
    model: ModelConfig;
  }): Promise<CouncillorSuccess> {
    try {
      const response = await runCouncillorAttempt({
        ...input,
        timeoutMs: COUNCILLOR_TIMEOUT_MS,
        attempt: 1,
      });
      return { model: input.model, response, attempts: 1 };
    } catch (firstError) {
      try {
        const response = await runCouncillorAttempt({
          ...input,
          timeoutMs: COUNCILLOR_RETRY_TIMEOUT_MS,
          attempt: 2,
        });
        return { model: input.model, response, attempts: 2 };
      } catch (retryError) {
        throw new Error(
          `first attempt failed: ${errorMessage(firstError)}; retry failed: ${errorMessage(retryError)}`,
        );
      }
    }
  }

  async function synthesizeWithElrond(input: {
    parentSessionID: string;
    originalPrompt: string;
    successes: CouncillorSuccess[];
    failures: CouncillorFailure[];
  }): Promise<string> {
    return await raceWithTimeout(
      (async () => {
        const sessionID = await createChildSession(
          input.parentSessionID,
          "council: Elrond aggregation",
        );

        return await promptAndExtract({
          sessionID,
          agent: councilConfig.aggregator,
          model: councilConfig.aggregator_model ?? undefined,
          tools: ELROND_TOOLS,
          prompt: buildElrondPrompt(input),
        });
      })(),
      ELROND_TIMEOUT_MS,
      "Elrond aggregation",
    );
  }

  async function runCouncilReview(
    prompt: string,
    parentSessionID: string,
  ): Promise<string> {
    const councillorPromises = councilConfig.models.map((model) =>
      runCouncillor({ parentSessionID, prompt, model }),
    );

    const settledResults = await Promise.allSettled(councillorPromises);
    const successes: CouncillorSuccess[] = [];
    const failures: CouncillorFailure[] = [];

    settledResults.forEach((result, index) => {
      const model = councilConfig.models[index];
      if (result.status === "fulfilled") {
        successes.push(result.value);
      } else {
        failures.push({ model, error: errorMessage(result.reason) });
      }
    });

    if (successes.length < 2) {
      return `Error: council_review received fewer than 2 successful councillor responses (${successes.length}/${councilConfig.models.length}). Gandalf should fall back to solo Saruman.

Successful councillors:
${successes.length === 0 ? "none" : successes.map((success) => `- ${modelLabel(success.model)} (${success.attempts} attempt${success.attempts === 1 ? "" : "s"})`).join("\n")}

Failed councillors:
${formatFailureSummary(failures)}`;
    }

    return await synthesizeWithElrond({
      parentSessionID,
      originalPrompt: prompt,
      successes,
      failures,
    });
  }

  return {
    tool: {
      council_review: tool({
        description: `Fan out a review prompt to the configured council of Saruman reviewers in parallel, then ask Elrond to structurally aggregate the responses.

Use when you need adversarial review from multiple models. The tool returns Elrond's aggregation when at least two councillors respond. If fewer than two respond, it returns an error string so the caller can fall back to solo Saruman.`,
        args: {
          prompt: tool.schema
            .string()
            .describe("The complete review prompt to send to each councillor"),
        },
        async execute(args, toolContext) {
          const prompt = args.prompt.trim();
          if (!prompt) return "Error: Must provide a non-empty prompt";

          try {
            return await raceWithTimeout(
              runCouncilReview(prompt, toolContext.sessionID),
              HARD_CAP_MS,
              "council_review",
            );
          } catch (error) {
            return `Error: council_review failed: ${errorMessage(error)}`;
          }
        },
      }),
    },
  };
};

export default CouncilToolPlugin;
