import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExistsSync = vi.hoisted(() => vi.fn());

vi.mock("node:fs", () => ({
  existsSync: mockExistsSync,
}));

vi.mock("@opencode-ai/plugin", () => {
  const stringSchema = {
    optional: () => stringSchema,
    describe: () => stringSchema,
  };
  const toolFn = (definition: unknown) => definition;
  Object.assign(toolFn, {
    schema: {
      string: () => stringSchema,
    },
  });
  return { tool: toolFn };
});

import VisionToolPlugin, {
  MIME_TYPES,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  extractBase64Data,
  extractLatestAssistantText,
  inferMimeType,
  inferMimeTypeFromBase64,
  parseMimeFromDataUrl,
} from "./vision-tool";

type SessionMocks = ReturnType<typeof createSessionMocks>;

function createSessionMocks() {
  return {
    get: vi.fn(
      async () => ({ data: { directory: "/parent-directory" } }) as Record<string, unknown>,
    ),
    create: vi.fn(
      async () => ({ data: { id: "vision-session" } }) as Record<string, unknown>,
    ),
    prompt: vi.fn(async () => ({}) as Record<string, unknown>),
    messages: vi.fn(
      async () => ({ data: assistantMessages("vision response") }) as Record<
        string,
        unknown
      >,
    ),
  };
}

function createContext(session: SessionMocks, directory = "/fallback-directory") {
  return {
    client: { session },
    directory,
  };
}

async function createExecute(session: SessionMocks, directory?: string) {
  const hooks = (await VisionToolPlugin(
    createContext(session, directory) as never,
  )) as unknown as {
    tool: {
      vision: {
        execute: (
          args: { file_path?: string; image_data?: string; goal?: string },
          toolContext: { sessionID: string },
        ) => Promise<string>;
      };
    };
  };
  return hooks.tool.vision.execute as (
    args: { file_path?: string; image_data?: string; goal?: string },
    toolContext: { sessionID: string },
  ) => Promise<string>;
}

function assistantMessages(text: string, created = 1) {
  return [
    {
      info: { role: "assistant", time: { created } },
      parts: [{ type: "text", text }],
    },
  ];
}

describe("vision pure helpers", () => {
  describe("inferMimeType", () => {
    it("infers known extensions", () => {
      expect(inferMimeType("/tmp/photo.jpg")).toBe("image/jpeg");
      expect(inferMimeType("/tmp/document.pdf")).toBe("application/pdf");
      expect(inferMimeType("/tmp/audio.mp3")).toBe("audio/mpeg");
    });

    it("returns application/octet-stream for unknown extensions", () => {
      expect(inferMimeType("/tmp/archive.zip")).toBe(
        "application/octet-stream",
      );
    });

    it("is case insensitive", () => {
      expect(inferMimeType("/tmp/SCREENSHOT.PNG")).toBe("image/png");
      expect(inferMimeType("/tmp/CLIP.MOV")).toBe("video/quicktime");
    });
  });

  describe("parseMimeFromDataUrl", () => {
    it("parses a valid data URL MIME type", () => {
      expect(parseMimeFromDataUrl("data:image/png;base64,abc123")).toBe(
        "image/png",
      );
    });

    it("returns null for invalid strings", () => {
      expect(parseMimeFromDataUrl("not-a-data-url")).toBeNull();
    });
  });

  describe("inferMimeTypeFromBase64", () => {
    it("uses the MIME type from data URL input", () => {
      expect(
        inferMimeTypeFromBase64("data:image/webp;base64,UklGRabc"),
      ).toBe("image/webp");
    });

    it("detects magic byte prefixes", () => {
      expect(inferMimeTypeFromBase64("iVBORw0KGgoAAA")).toBe("image/png");
      expect(inferMimeTypeFromBase64("/9j/4AAQSkZJRgABAQAAAQ")).toBe(
        "image/jpeg",
      );
      expect(inferMimeTypeFromBase64("R0lGODlhAQABAIAAAA")).toBe(
        "image/gif",
      );
      expect(inferMimeTypeFromBase64("UklGRiIAAABXRUJQVlA4")).toBe(
        "image/webp",
      );
      expect(inferMimeTypeFromBase64("JVBERi0xLjQKJcfs")).toBe(
        "application/pdf",
      );
    });

    it("defaults unknown raw base64 to image/png", () => {
      expect(inferMimeTypeFromBase64("AAAAunknown")).toBe("image/png");
    });
  });

  describe("extractBase64Data", () => {
    it("strips a data URL prefix", () => {
      expect(extractBase64Data("data:image/png;base64,abc123")).toBe(
        "abc123",
      );
    });

    it("passes through raw base64", () => {
      expect(extractBase64Data("iVBORw0KGgoAAA")).toBe("iVBORw0KGgoAAA");
    });
  });

  describe("malformed base64 edge cases", () => {
    it("handles empty string input", () => {
      expect(inferMimeTypeFromBase64("")).toBe("image/png");
      expect(extractBase64Data("")).toBe("");
      expect(parseMimeFromDataUrl("")).toBeNull();
    });

    it("handles strings with special characters", () => {
      expect(inferMimeTypeFromBase64("!!!invalid!!!")).toBe("image/png");
      expect(extractBase64Data("data:;base64,")).toBe("data:;base64,");
    });
  });

  describe("extractLatestAssistantText", () => {
    it("returns null for an empty array", () => {
      expect(extractLatestAssistantText([])).toBeNull();
    });

    it("returns null when there are no assistant messages", () => {
      expect(
        extractLatestAssistantText([
          {
            info: { role: "user", time: { created: 1 } },
            parts: [{ type: "text", text: "hello" }],
          },
        ]),
      ).toBeNull();
    });

    it("extracts text from a single assistant message", () => {
      expect(extractLatestAssistantText(assistantMessages("hello"))).toBe(
        "hello",
      );
    });

    it("picks the latest assistant message by created time", () => {
      expect(
        extractLatestAssistantText([
          ...assistantMessages("older", 10),
          ...assistantMessages("newer", 20),
        ]),
      ).toBe("newer");
    });

    it("joins text parts and ignores mixed non-text parts", () => {
      expect(
        extractLatestAssistantText([
          {
            info: { role: "assistant", time: { created: 1 } },
            parts: [
              { type: "image", text: "ignored" },
              { type: "text", text: "first" },
              { type: "text", text: "second" },
              { type: "text", text: 123 },
            ],
          },
        ]),
      ).toBe("first\nsecond");
    });
  });

  it("exports supported MIME metadata", () => {
    expect(MIME_TYPES[".png"]).toBe("image/png");
    expect(SUPPORTED_EXTENSIONS).toContain(".png");
    expect(SUPPORTED_MIME_TYPES.has("image/png")).toBe(true);
  });
});

describe("vision execute validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  it("returns an error when neither file_path nor image_data is provided", async () => {
    const execute = await createExecute(createSessionMocks());

    await expect(execute({ goal: "describe" }, { sessionID: "parent" })).resolves.toBe(
      "Error: Must provide either 'file_path' or 'image_data'",
    );
  });

  it("returns an error when both file_path and image_data are provided", async () => {
    const execute = await createExecute(createSessionMocks());

    await expect(
      execute(
        { file_path: "/tmp/image.png", image_data: "iVBORw0KGgo", goal: "describe" },
        { sessionID: "parent" },
      ),
    ).resolves.toBe(
      "Error: Provide only one of 'file_path' or 'image_data', not both",
    );
  });

  it("returns an error when goal is missing or empty", async () => {
    const execute = await createExecute(createSessionMocks());

    await expect(
      execute({ file_path: "/tmp/image.png" }, { sessionID: "parent" }),
    ).resolves.toBe("Error: Must provide 'goal' describing what to analyze");
    await expect(
      execute({ file_path: "/tmp/image.png", goal: "" }, { sessionID: "parent" }),
    ).resolves.toBe("Error: Must provide 'goal' describing what to analyze");
  });

  it("returns an error for a file with no extension", async () => {
    const execute = await createExecute(createSessionMocks());

    await expect(
      execute({ file_path: "/tmp/image", goal: "describe" }, { sessionID: "parent" }),
    ).resolves.toBe(
      "Error: File path must include an extension such as .png, .pdf, or .jpg",
    );
  });

  it("returns an error for an unsupported extension", async () => {
    const execute = await createExecute(createSessionMocks());

    const result = await execute(
      { file_path: "/tmp/archive.zip", goal: "describe" },
      { sessionID: "parent" },
    );

    expect(result).toContain("Error: Unsupported file extension");
    expect(result).toContain(".png");
  });

  it("returns an error when the file is not found", async () => {
    mockExistsSync.mockReturnValue(false);
    const execute = await createExecute(createSessionMocks());

    await expect(
      execute({ file_path: "/tmp/image.png", goal: "describe" }, { sessionID: "parent" }),
    ).resolves.toBe("Error: File not found at the specified path");
    expect(mockExistsSync).toHaveBeenCalledWith("/tmp/image.png");
  });

  it("returns an error for unsupported MIME from base64 data", async () => {
    const execute = await createExecute(createSessionMocks());

    const result = await execute(
      { image_data: "data:text/plain;base64,SGVsbG8=", goal: "describe" },
      { sessionID: "parent" },
    );

    expect(result).toContain("Error: Unsupported image format");
    expect(result).toContain("Detected MIME type 'text/plain'");
  });
});

describe("vision execute integration", () => {
  // Intentionally no session.abort test: vision-tool.ts does not call session.abort.
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  it("creates a session, prompts with a file URL, and returns the response", async () => {
    const session = createSessionMocks();
    session.messages.mockResolvedValueOnce({ data: assistantMessages("file response") });
    const execute = await createExecute(session);

    const result = await execute(
      { file_path: "/tmp/Test Image.PNG", goal: "describe it" },
      { sessionID: "parent-session" },
    );

    expect(result).toBe("file response");
    expect(session.create).toHaveBeenCalledWith({
      body: expect.objectContaining({
        parentID: "parent-session",
        title: "vision: describe it",
      }),
      query: { directory: "/parent-directory" },
    });
    expect(session.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { id: "vision-session" },
        body: expect.objectContaining({
          agent: "general",
          parts: [
            expect.objectContaining({ type: "text" }),
            {
              type: "file",
              mime: "image/png",
              url: "file:///tmp/Test%20Image.PNG",
              filename: "Test Image.PNG",
            },
          ],
        }),
      }),
    );
  });

  it("falls back to ctx.directory when parent session lookup fails", async () => {
    const session = createSessionMocks();
    session.get.mockRejectedValueOnce(new Error("not found"));
    session.messages.mockResolvedValueOnce({ data: assistantMessages("ok") });
    const execute = await createExecute(session, "/my-fallback-dir");

    await execute(
      { file_path: "/tmp/image.png", goal: "describe" },
      { sessionID: "parent" },
    );

    expect(session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { directory: "/my-fallback-dir" },
      }),
    );
  });

  it("falls back to ctx.directory when parent session has no directory", async () => {
    const session = createSessionMocks();
    session.get.mockResolvedValueOnce({ data: null });
    session.messages.mockResolvedValueOnce({ data: assistantMessages("ok") });
    const execute = await createExecute(session, "/ctx-dir");

    await execute(
      { file_path: "/tmp/image.png", goal: "describe" },
      { sessionID: "parent" },
    );

    expect(session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { directory: "/ctx-dir" },
      }),
    );
  });

  it("creates a session, prompts with a data URL, and returns the response", async () => {
    const session = createSessionMocks();
    session.messages.mockResolvedValueOnce({ data: assistantMessages("image data response") });
    const execute = await createExecute(session);

    const result = await execute(
      { image_data: "data:image/jpeg;base64,/9j/abc", goal: "describe it" },
      { sessionID: "parent-session" },
    );

    expect(result).toBe("image data response");
    expect(session.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { id: "vision-session" },
        body: expect.objectContaining({
          parts: [
            expect.objectContaining({ type: "text" }),
            {
              type: "file",
              mime: "image/jpeg",
              url: "data:image/jpeg;base64,/9j/abc",
              filename: "clipboard-image.jpeg",
            },
          ],
        }),
      }),
    );
  });

  it("returns a session creation error", async () => {
    const session = createSessionMocks();
    session.create.mockResolvedValueOnce({ error: "create failed" });
    const execute = await createExecute(session);

    await expect(
      execute({ file_path: "/tmp/image.png", goal: "describe" }, { sessionID: "parent" }),
    ).resolves.toBe("Error: Failed to create session: create failed");
  });

  it("returns a special message for unauthorized session creation", async () => {
    const session = createSessionMocks();
    session.create.mockResolvedValueOnce({ error: "Unauthorized" });
    const execute = await createExecute(session);

    const result = await execute(
      { file_path: "/tmp/image.png", goal: "describe" },
      { sessionID: "parent" },
    );

    expect(result).toContain("Error: Failed to create session (Unauthorized)");
    expect(result).toContain("OAuth token restrictions");
  });

  it("returns an error when session creation returns no session id", async () => {
    const session = createSessionMocks();
    session.create.mockResolvedValueOnce({ data: {} });
    const execute = await createExecute(session);

    await expect(
      execute({ file_path: "/tmp/image.png", goal: "describe" }, { sessionID: "parent" }),
    ).resolves.toBe("Error: Failed to create session: missing session id");
  });

  it("returns an error when prompt rejects", async () => {
    const session = createSessionMocks();
    session.prompt.mockRejectedValueOnce(new Error("prompt failed"));
    const execute = await createExecute(session);

    await expect(
      execute({ file_path: "/tmp/image.png", goal: "describe" }, { sessionID: "parent" }),
    ).resolves.toBe("Error analyzing /tmp/image.png: prompt failed");
  });

  it("returns an error when prompt resolves with an error object", async () => {
    const session = createSessionMocks();
    session.prompt.mockResolvedValueOnce({ error: "model overloaded" });
    const execute = await createExecute(session);

    const result = await execute(
      { file_path: "/tmp/image.png", goal: "describe" },
      { sessionID: "parent" },
    );

    expect(result).toContain("Error: Vision prompt failed: model overloaded");
  });

  it("returns an error when messages returns an error", async () => {
    const session = createSessionMocks();
    session.messages.mockResolvedValueOnce({ error: "messages failed" });
    const execute = await createExecute(session);

    await expect(
      execute({ file_path: "/tmp/image.png", goal: "describe" }, { sessionID: "parent" }),
    ).resolves.toBe("Error: Failed to get messages: messages failed");
  });

  it("returns an error when there is no response text", async () => {
    const session = createSessionMocks();
    session.messages.mockResolvedValueOnce({ data: [] });
    const execute = await createExecute(session);

    await expect(
      execute({ file_path: "/tmp/image.png", goal: "describe" }, { sessionID: "parent" }),
    ).resolves.toBe("Error: No response from vision agent");
  });

  it("returns a generic catch error", async () => {
    const session = createSessionMocks();
    session.create.mockRejectedValueOnce(new Error("network exploded"));
    const execute = await createExecute(session);

    await expect(
      execute({ image_data: "iVBORw0KGgoAAA", goal: "describe" }, { sessionID: "parent" }),
    ).resolves.toBe(
      "Error analyzing clipboard/pasted image: network exploded",
    );
  });
});
