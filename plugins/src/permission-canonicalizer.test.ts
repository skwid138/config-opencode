import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import PermissionCanonicalizerPlugin, {
  AUDIT_LOG_PATH,
  canonicalize,
  canonicalizeAndAudit,
  splitCommandNodes,
} from "./permission-canonicalizer";

const HOME = "/Users/hunter";

describe("permission command canonicalization", () => {
  it("expands only argv0 home forms at command-node starts", () => {
    expect(
      canonicalize(
        "~/code/scripts/agent/foo.sh --path ~/kept && $HOME/code/scripts/agent/bar.sh | echo $HOME/arg",
        { homedir: HOME },
      ),
    ).toBe(
      "/Users/hunter/code/scripts/agent/foo.sh --path ~/kept && /Users/hunter/code/scripts/agent/bar.sh | echo $HOME/arg",
    );
  });

  it("does not expand brace HOME unless explicitly opted in", () => {
    expect(canonicalize("${HOME}/code/scripts/agent/foo.sh", { homedir: HOME })).toBe(
      "${HOME}/code/scripts/agent/foo.sh",
    );
    expect(
      canonicalize("${HOME}/code/scripts/agent/foo.sh", {
        homedir: HOME,
        expandBraceHome: true,
      }),
    ).toBe("/Users/hunter/code/scripts/agent/foo.sh");
  });

  it("bails byte-for-byte on uncertain or unsafe shell shapes", () => {
    const commands = [
      "FOO=bar ~/code/scripts/agent/foo.sh",
      "HOME=/tmp ~/code/scripts/agent/foo.sh",
      "(~/code/scripts/agent/foo.sh)",
      "{ ~/code/scripts/agent/foo.sh; }",
      "echo $(~/code/scripts/agent/foo.sh)",
      "cat <<EOF\nbody\nEOF",
      '""~/code/scripts/agent/foo.sh',
      'echo "unterminated',
    ];

    for (const command of commands) {
      expect(canonicalize(command, { homedir: HOME })).toBe(command);
    }
  });

  it("limits configured roots on path-segment boundaries and rejects dot-dot argv0s", () => {
    expect(
      canonicalize("~/code/scripts/agent/foo.sh", {
        homedir: HOME,
        roots: ["~/code"],
      }),
    ).toBe("/Users/hunter/code/scripts/agent/foo.sh");
    expect(
      canonicalize("~/code2/scripts/agent/foo.sh", {
        homedir: HOME,
        roots: ["~/code"],
      }),
    ).toBe("~/code2/scripts/agent/foo.sh");
    expect(
      canonicalize("~/code/../secret.sh", {
        homedir: HOME,
        roots: ["~/code"],
      }),
    ).toBe("~/code/../secret.sh");
  });

  it("splits command nodes using shell separators without treating groups as starts", () => {
    expect(splitCommandNodes("~/a && ~/b |& ~/c; ~/d & ~/e\n~/f")).toEqual([
      "~/a",
      "~/b",
      "~/c",
      "~/d",
      "~/e",
      "~/f",
    ]);
    expect(splitCommandNodes("(~/a) && ~/b")).toEqual(["(~/a)", "~/b"]);
  });
});

describe("permission canonicalizer audit side effects", () => {
  it("does not let audit append failure affect the canonical command", async () => {
    const appendRecord = vi.fn(async () => {
      throw new Error("disk full");
    });

    const result = await canonicalizeAndAudit(
      "~/code/scripts/agent/foo.sh && pwd",
      { homedir: HOME },
      {
        sessionID: "ses_test",
        agent: "aragorn",
        callID: "call_test",
        appendRecord,
        debug: vi.fn(async () => undefined),
      },
    );

    expect(result).toBe("/Users/hunter/code/scripts/agent/foo.sh && pwd");
    expect(appendRecord).toHaveBeenCalledTimes(2);
  });

  it("audits global-bail heredoc commands as one record without splitting body lines", async () => {
    const appendRecord = vi.fn(async () => undefined);
    const command = "cat <<EOF\n~/code/scripts/agent/fake-body-command.sh\nEOF";

    const result = await canonicalizeAndAudit(command, { homedir: HOME }, {
      sessionID: "ses_test",
      agent: "aragorn",
      callID: "call_test",
      appendRecord,
      debug: vi.fn(async () => undefined),
    });

    expect(result).toBe(command);
    expect(appendRecord).toHaveBeenCalledTimes(1);
    expect(appendRecord).toHaveBeenCalledWith(expect.objectContaining({ command_node_text: command }));
  });

  it("plugin hook mutates bash commands and writes one audit record per command node", async () => {
    const dir = await mkdtemp(join(tmpdir(), "permission-canon-"));
    const auditPath = join(dir, "audit.log");
    const debugPath = join(dir, "debug.log");
    const plugin = await PermissionCanonicalizerPlugin(
      {} as never,
      { homedir: HOME, auditLogPath: auditPath, debugLogPath: debugPath },
    );
    const hooks = plugin as {
      "chat.params": (input: { sessionID: string; agent: string }) => Promise<void>;
      "tool.execute.before": (
        input: { tool: string; sessionID: string; callID: string },
        output: { args: { command: string } },
      ) => Promise<void>;
    };
    await hooks["chat.params"]({ sessionID: "ses_test", agent: "aragorn" });
    const output = { args: { command: "~/code/scripts/agent/foo.sh && pwd" } };

    await hooks["tool.execute.before"](
      { tool: "bash", sessionID: "ses_test", callID: "call_test" },
      output,
    );

    expect(output.args.command).toBe("/Users/hunter/code/scripts/agent/foo.sh && pwd");
    const records = (await readFile(auditPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(records).toMatchObject([
      {
        sessionID: "ses_test",
        agent: "aragorn",
        callID: "call_test",
        command_node_text: "/Users/hunter/code/scripts/agent/foo.sh",
      },
      {
        sessionID: "ses_test",
        agent: "aragorn",
        callID: "call_test",
        command_node_text: "pwd",
      },
    ]);
  });

  it("exports the fixed production audit log path", () => {
    expect(AUDIT_LOG_PATH).toBe(
      "/Users/hunter/.local/share/opencode/permission-audit-plugin/audit.log",
    );
  });
});
