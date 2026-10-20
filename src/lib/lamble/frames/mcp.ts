/**
 * Minimal MCP client over Streamable HTTP, enough to call Frames tools from a script without an agent session:
 * initialize, then tools/call, accepting either a JSON or an SSE response. Tool results are JSON text; they are
 * parsed as data and never interpreted.
 *
 * The Frames MCP endpoint and its authorization header come from the environment (FRAMES_MCP_URL,
 * FRAMES_MCP_AUTHORIZATION) and are never written to disk or logged. The exact Frames authentication scheme
 * has not been verified in this repository; the header is passed through as configured.
 */

const PROTOCOL_VERSION = "2025-06-18";

export class McpError extends Error {
  readonly code: number | null;
  constructor(message: string, code: number | null = null) {
    super(message);
    this.code = code;
  }
}

export interface McpTransportOptions {
  url: string;
  authorization?: string | null;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

function assertEndpoint(url: string): URL {
  const u = new URL(url);
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (u.protocol !== "https:" && !(local && u.protocol === "http:")) throw new McpError(`MCP endpoint must be https: ${u.origin}`);
  if (u.username || u.password) throw new McpError("Credentials do not belong in the MCP URL; use FRAMES_MCP_AUTHORIZATION");
  return u;
}

/** Extracts the JSON-RPC message with the given id from an SSE body. */
export function parseSse(text: string, id: number): JsonRpcResponse | null {
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data) continue;
    try {
      const msg = JSON.parse(data) as JsonRpcResponse;
      if (msg && msg.id === id) return msg;
    } catch {
      // Not JSON: keep scanning.
    }
  }
  return null;
}

export class McpClient {
  private readonly url: URL;
  private readonly authorization: string | null;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private session: string | null = null;
  private nextId = 1;
  private initialized = false;

  constructor(options: McpTransportOptions) {
    this.url = assertEndpoint(options.url);
    this.authorization = options.authorization ?? null;
    this.fetchImpl = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": PROTOCOL_VERSION };
    if (this.authorization) h.Authorization = this.authorization;
    if (this.session) h["Mcp-Session-Id"] = this.session;
    return h;
  }

  private async post(message: Record<string, unknown>): Promise<Response> {
    const res = await this.fetchImpl(this.url, { method: "POST", headers: this.headers(), body: JSON.stringify(message), signal: AbortSignal.timeout(this.timeoutMs), redirect: "error" });
    const sid = res.headers.get("mcp-session-id");
    if (sid) this.session = sid;
    return res;
  }

  private async request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    const res = await this.post({ jsonrpc: "2.0", id, method, params });
    if (!res.ok) throw new McpError(`MCP ${method}: HTTP ${res.status}`, res.status);
    const type = res.headers.get("content-type") ?? "";
    const text = await res.text();
    const msg = type.includes("text/event-stream") ? parseSse(text, id) : (JSON.parse(text) as JsonRpcResponse);
    if (!msg) throw new McpError(`MCP ${method}: no response for request ${id}`);
    if (msg.error) throw new McpError(`MCP ${method}: ${msg.error.message}`, msg.error.code);
    return msg.result;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.request("initialize", { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "lamble-collector", version: "1.0.0" } });
    const res = await this.post({ jsonrpc: "2.0", method: "notifications/initialized" });
    if (!res.ok && res.status !== 202) throw new McpError(`MCP initialized notification: HTTP ${res.status}`, res.status);
    this.initialized = true;
  }

  /** Calls a tool and parses its first text content as JSON. A tool-level error is thrown, not returned. */
  async callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    await this.initialize();
    const result = (await this.request("tools/call", { name, arguments: args })) as { content?: { type: string; text?: string }[]; isError?: boolean };
    const text = (result.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
    if (result.isError) throw new McpError(`${name} failed: ${text.slice(0, 500)}`);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new McpError(`${name} returned non-JSON text (${text.length} chars)`);
    }
  }
}
