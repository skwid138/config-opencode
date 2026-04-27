/**
 * Vision Tool Plugin
 *
 * Bypasses Claude's 8000px image limit by sending files directly to a Gemini agent.
 *
 * Usage: vision(file_path="/path/to/large-image.png", goal="Describe what you see")
 */

import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { tool, type Plugin } from "@opencode-ai/plugin";

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

const SUPPORTED_EXTENSIONS = Object.keys(MIME_TYPES).sort().join(", ");
const SUPPORTED_MIME_TYPES = new Set(Object.values(MIME_TYPES));

function inferMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

function parseMimeFromDataUrl(data: string): string | null {
  const match = data.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
}

function inferMimeTypeFromBase64(data: string): string {
  const dataUrlMime = parseMimeFromDataUrl(data);
  if (dataUrlMime) return dataUrlMime;

  const prefix = data.slice(0, 20);
  if (prefix.startsWith("iVBORw0KGgo")) return "image/png";
  if (prefix.startsWith("/9j/")) return "image/jpeg";
  if (prefix.startsWith("R0lGOD")) return "image/gif";
  if (prefix.startsWith("UklGR")) return "image/webp";
  if (prefix.startsWith("JVBERi")) return "application/pdf";
  return "image/png";
}

function extractBase64Data(data: string): string {
  const match = data.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : data;
}

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

  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n");
}

const VisionToolPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      vision: tool({
        description: `Analyze media files (PDFs, images, diagrams) that require visual interpretation.
Use when you need to:
- Extract specific information from documents or images
- Describe visual content (charts, diagrams, screenshots)
- Analyze PDFs that are image-based or have complex layouts

This tool handles large images (>8000px) that would otherwise fail with Claude's API.

IMPORTANT: Use this tool INSTEAD of Read for image/PDF files. Do NOT attempt Read first - go directly to vision for any .png, .jpg, .jpeg, .gif, .webp, .pdf, .heic, .heif, .bmp, or video/audio files.`,
        args: {
          file_path: tool.schema
            .string()
            .optional()
            .describe("Absolute path to the file to analyze"),
          image_data: tool.schema
            .string()
            .optional()
            .describe(
              "Base64 encoded image data (for clipboard/pasted images)",
            ),
          goal: tool.schema
            .string()
            .describe("What specific information to extract or analyze"),
        },
        async execute(args, toolContext) {
          const { file_path, image_data, goal } = args;

          if (!file_path && !image_data) {
            return "Error: Must provide either 'file_path' or 'image_data'";
          }
          if (file_path && image_data) {
            return "Error: Provide only one of 'file_path' or 'image_data', not both";
          }
          if (!goal) {
            return "Error: Must provide 'goal' describing what to analyze";
          }

          if (file_path) {
            const ext = file_path.toLowerCase().match(/\.[^.]+$/)?.[0];
            if (!ext) {
              return "Error: File path must include an extension such as .png, .pdf, or .jpg";
            }
            const mimeType = MIME_TYPES[ext];
            if (!mimeType) {
              return `Error: Unsupported file extension. Supported types are: ${SUPPORTED_EXTENSIONS}`;
            }
            if (!existsSync(file_path)) {
              return "Error: File not found at the specified path";
            }
          }

          let filePart: {
            type: "file";
            mime: string;
            url: string;
            filename: string;
          };
          let sourceDescription: string;

          if (image_data) {
            const mimeType = inferMimeTypeFromBase64(image_data);
            if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
              return `Error: Unsupported image format. Detected MIME type '${mimeType}'. Supported types are: ${[...SUPPORTED_MIME_TYPES].sort().join(", ")}`;
            }
            const base64Data = extractBase64Data(image_data);
            filePart = {
              type: "file",
              mime: mimeType,
              url: `data:${mimeType};base64,${base64Data}`,
              filename: `clipboard-image.${mimeType.split("/")[1] || "png"}`,
            };
            sourceDescription = "clipboard/pasted image";
          } else if (file_path) {
            const mimeType = inferMimeType(file_path);
            filePart = {
              type: "file",
              mime: mimeType,
              url: pathToFileURL(file_path).href,
              filename: basename(file_path),
            };
            sourceDescription = file_path;
          } else {
            return "Error: Must provide either 'file_path' or 'image_data'";
          }

          const prompt = `Analyze this file and extract the requested information.

Goal: ${goal}

Provide ONLY the extracted information that matches the goal.
Be thorough on what was requested, concise on everything else.
If the requested information is not found, clearly state what is missing.`;

          try {
            const parentSession = await ctx.client.session
              .get({
                path: { id: toolContext.sessionID },
              })
              .catch(() => null);
            const parentDirectory =
              parentSession?.data?.directory ?? ctx.directory;

            const createResult = await ctx.client.session.create({
              body: {
                parentID: toolContext.sessionID,
                title: `vision: ${goal.substring(0, 50)}`,
                permission: [
                  { permission: "question", action: "deny", pattern: "*" },
                ],
              },
              query: { directory: parentDirectory },
            });

            if (createResult.error) {
              const errorStr = String(createResult.error);
              if (errorStr.toLowerCase().includes("unauthorized")) {
                return `Error: Failed to create session (Unauthorized). This may be due to OAuth token restrictions. Try using a different provider or API key authentication.`;
              }
              return `Error: Failed to create session: ${createResult.error}`;
            }

            const sessionID = createResult.data.id;

            await ctx.client.session.prompt({
              path: { id: sessionID },
              body: {
                agent: "general",
                model: {
                  providerID: "github-copilot",
                  modelID: "gemini-3-flash-preview",
                },
                tools: {
                  read: false,
                  write: false,
                  edit: false,
                  bash: false,
                  glob: false,
                  grep: false,
                  task: false,
                  vision: false,
                },
                parts: [{ type: "text", text: prompt }, filePart],
              },
            } as Parameters<typeof ctx.client.session.prompt>[0]);

            const messagesResult = await ctx.client.session.messages({
              path: { id: sessionID },
            });

            if (messagesResult.error) {
              return `Error: Failed to get messages: ${messagesResult.error}`;
            }

            const responseText = extractLatestAssistantText(
              messagesResult.data,
            );
            if (!responseText) {
              return `Error: No response from vision agent`;
            }

            return responseText;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return `Error analyzing ${sourceDescription}: ${errorMessage}`;
          }
        },
      }),
    },
  };
};

export default VisionToolPlugin;
