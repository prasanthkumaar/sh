import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import { after, before, test } from "node:test";

import type { AuthInfo } from "@modelcontextprotocol/server";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { withMcpAuth } from "mcp-handler";
import { TigerError, type TradeClient } from "@tigeropenapi/tigeropen";

import {
  GET as getAuthorizationServerMetadata,
  OPTIONS as optionsAuthorizationServerMetadata,
} from "../app/.well-known/oauth-authorization-server/route";
import {
  GET as getProtectedResourceMetadata,
  OPTIONS as optionsProtectedResourceMetadata,
} from "../app/.well-known/oauth-protected-resource/mcp/route";
import { createMcpHandler } from "../src/mcp/server";
import { performTigerRead } from "../src/mcp/tiger/read-gate";

const host = "127.0.0.1";
const acceptedAccessToken = "accepted-clerk-oauth-token";
const clerkFrontendApi = "https://clerk.test";
const clerkAuthorizationServerMetadata = {
  issuer: clerkFrontendApi,
  authorization_endpoint: `${clerkFrontendApi}/oauth/authorize`,
  token_endpoint: `${clerkFrontendApi}/oauth/token`,
};
const protectedResourceMetadataPath =
  "/.well-known/oauth-protected-resource/mcp";
const authorizationServerMetadataPath =
  "/.well-known/oauth-authorization-server";
const clerkPublishableKey = `pk_test_${Buffer.from("clerk.test$").toString("base64url")}`;

type WebHandler = (request: Request) => Response | Promise<Response>;

type StartedApplication = {
  origin: string;
  stop: () => Promise<void>;
};

function verifyControlledClerkToken(
  _request: Request,
  bearerToken?: string,
): AuthInfo | undefined {
  if (bearerToken !== acceptedAccessToken) {
    return undefined;
  }

  return {
    token: bearerToken,
    clientId: "controlled-clerk-oauth-client",
    scopes: [],
    extra: { userId: "controlled-clerk-user" },
  };
}

function toWebHeaders(request: IncomingMessage) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry !== undefined) {
        headers.append(name, entry);
      }
    }
  }

  return headers;
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function sendWebResponse(
  webResponse: Response,
  response: ServerResponse,
) {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => response.setHeader(name, value));
  response.end(Buffer.from(await webResponse.arrayBuffer()));
}

async function startApplication(): Promise<StartedApplication> {
  const controlledTradeClient = Object.create(null) as TradeClient;
  Object.defineProperties(controlledTradeClient, {
    getPositions: {
      value: function (this: TradeClient, request?: unknown) {
        assert.equal(this, controlledTradeClient);
        return [{ responseShape: "positions", request }];
      },
    },
    getPrimeAssets: {
      value: () => undefined,
    },
    getAssets: {
      value: () => {
        throw new TigerError(5, "controlled safe Tiger message");
      },
    },
  });
  const mcpHandler = withMcpAuth(
    createMcpHandler({
      tigerReader: (request) => performTigerRead(controlledTradeClient, request),
    }),
    verifyControlledClerkToken,
    {
      required: true,
      resourceMetadataPath: protectedResourceMetadataPath,
    },
  );
  const routes = new Map<string, WebHandler>([
    ["POST /mcp", mcpHandler],
    [
      "GET /.well-known/oauth-protected-resource/mcp",
      getProtectedResourceMetadata,
    ],
    [
      "OPTIONS /.well-known/oauth-protected-resource/mcp",
      optionsProtectedResourceMetadata,
    ],
    [
      "GET /.well-known/oauth-authorization-server",
      () => getAuthorizationServerMetadata(),
    ],
    [
      "OPTIONS /.well-known/oauth-authorization-server",
      optionsAuthorizationServerMetadata,
    ],
  ]);
  const server = createServer(async (request, response) => {
    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("The local test server has no TCP address");
      }

      const origin = `http://${host}:${address.port}`;
      const requestUrl = new URL(request.url ?? "/", origin);
      const route = routes.get(`${request.method} ${requestUrl.pathname}`);

      if (!route) {
        response.writeHead(404).end();
        return;
      }

      const body = await readRequestBody(request);
      const webRequest = new Request(requestUrl, {
        method: request.method,
        headers: toWebHeaders(request),
        body: body.length > 0 ? new Uint8Array(body) : undefined,
      });
      await sendWebResponse(await route(webRequest), response);
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
  });
  server.listen(0, host);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not allocate a local test port");
  }

  return {
    origin: `http://${host}:${address.port}`,
    stop: async () => {
      server.close();
      await once(server, "close");
    },
  };
}

async function connectClient(origin: string, accessToken: string) {
  const client = new Client({
    name: "sh-integration-test",
    version: "1.0.0",
  });
  const transport = new StreamableHTTPClientTransport(new URL("/mcp", origin), {
    authProvider: { token: async () => accessToken },
  });
  await client.connect(transport);
  return client;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const originalFetch = globalThis.fetch;
let application: StartedApplication | undefined;
let client: Client | undefined;

before(async () => {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = clerkPublishableKey;
  process.env.CLERK_SECRET_KEY = "controlled-test-secret-key";
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.href === `${clerkFrontendApi}${authorizationServerMetadataPath}`) {
      return Response.json(clerkAuthorizationServerMetadata);
    }

    return originalFetch(input, init);
  };

  application = await startApplication();
  client = await connectClient(application.origin, acceptedAccessToken);
});

after(async () => {
  await client?.close();
  await application?.stop();
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  delete process.env.CLERK_SECRET_KEY;
});

test("an unauthenticated request is challenged before MCP execution", async () => {
  assert.ok(application);

  const response = await fetch(new URL("/mcp", application.origin), {
    method: "POST",
    body: "not-an-mcp-request",
  });

  assert.equal(response.status, 401);
  assert.match(
    response.headers.get("www-authenticate") ?? "",
    /resource_metadata=".*\/\.well-known\/oauth-protected-resource\/mcp"/,
  );
});

test("a rejected Clerk token cannot enter the MCP server", async () => {
  assert.ok(application);
  const { origin } = application;

  await assert.rejects(() =>
    connectClient(origin, "rejected-clerk-oauth-token"),
  );
});

test("accepted Clerk authentication discovers the bounded tool surface", async () => {
  assert.ok(client);

  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map(({ name }) => name),
    ["echo", "tiger_read"],
  );

  const tigerReadTool = tools.find(({ name }) => name === "tiger_read");
  assert.ok(tigerReadTool);
  assert.deepEqual(tigerReadTool.annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  });

  const result = await client.callTool({
    name: "echo",
    arguments: { message: "Hello from sh" },
  });
  assert.deepEqual(result.content, [
    { type: "text", text: "Tool echo: Hello from sh" },
  ]);
  assert.deepEqual(result.structuredContent, {
    message: "Hello from sh",
  });
});

test("tiger_read preserves safe results and converts undefined to JSON null", async () => {
  assert.ok(client);

  const positions = await client.callTool({
    name: "tiger_read",
    arguments: { method: "getPositions", args: [{ secType: "STK" }] },
  });
  assert.equal(positions.isError, undefined);
  assert.deepEqual(positions.structuredContent, {
    result: [
      {
        responseShape: "positions",
        request: { secType: "STK" },
      },
    ],
  });

  const primeAssets = await client.callTool({
    name: "tiger_read",
    arguments: { method: "getPrimeAssets" },
  });
  assert.deepEqual(primeAssets.structuredContent, { result: null });
});

test("tiger_read rejects invalid input and server-controlled fields", async () => {
  assert.ok(client);

  for (const invalidToolArguments of [
    { method: "placeOrder", args: [] },
    { method: "getPositions", args: "not-an-array" },
    { method: "getPositions", args: [], extra: true },
    {
      method: "getPositions",
      args: [{ filter: { account: "must-not-be-reflected" } }],
    },
  ]) {
    const result = await client.callTool({
      name: "tiger_read",
      arguments: invalidToolArguments,
    });
    assert.equal(result.isError, true);
    assert.doesNotMatch(JSON.stringify(result), /must-not-be-reflected/);
  }
});

test("tiger_read returns bounded Tiger errors without stack traces", async () => {
  assert.ok(client);

  const result = await client.callTool({
    name: "tiger_read",
    arguments: { method: "getAssets" },
  });
  assert.equal(result.isError, true);
  assert.match(JSON.stringify(result), /Tiger rate_limit error \(5\)/);
  assert.doesNotMatch(JSON.stringify(result), /controlled safe Tiger message/);
  assert.doesNotMatch(JSON.stringify(result), /\bat\s+.*\.ts:/);
});

test("the published schema rejects invalid echo input over HTTP", async () => {
  assert.ok(client);

  const { tools } = await client.listTools();
  const echoTool = tools.find(({ name }) => name === "echo");
  assert.ok(echoTool);
  assert.ok(isRecord(echoTool.inputSchema.properties));

  const messageSchema = echoTool.inputSchema.properties.message;
  assert.ok(isRecord(messageSchema));
  assert.equal(messageSchema.minLength, 1);
  assert.equal(messageSchema.maxLength, 100);

  for (const message of ["", "x".repeat(101)]) {
    const result = await client.callTool({
      name: "echo",
      arguments: { message },
    });
    assert.equal(result.isError, true);
  }
});

test("protected-resource metadata advertises Clerk and standard scopes", async () => {
  assert.ok(application);

  const response = await fetch(
    new URL(protectedResourceMetadataPath, application.origin),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    resource: application.origin,
    authorization_servers: [clerkFrontendApi],
    token_types_supported: ["urn:ietf:params:oauth:token-type:access_token"],
    token_introspection_endpoint: `${clerkFrontendApi}/oauth/token`,
    token_introspection_endpoint_auth_methods_supported: [
      "client_secret_post",
      "client_secret_basic",
    ],
    jwks_uri: `${clerkFrontendApi}/.well-known/jwks.json`,
    authorization_data_types_supported: ["oauth_scope"],
    authorization_data_locations_supported: ["header", "body"],
    key_challenges_supported: [
      {
        challenge_type: "urn:ietf:params:oauth:pkce:code_challenge",
        challenge_algs: ["S256"],
      },
    ],
    service_documentation: "https://clerk.com/docs",
    scopes_supported: ["openid", "profile", "email"],
  });
});

test("authorization-server compatibility metadata is public", async () => {
  assert.ok(application);

  const response = await fetch(
    new URL(authorizationServerMetadataPath, application.origin),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), clerkAuthorizationServerMetadata);
});

for (const metadataPath of [
  protectedResourceMetadataPath,
  authorizationServerMetadataPath,
]) {
  test(`metadata CORS is public at ${metadataPath}`, async () => {
    assert.ok(application);

    const response = await fetch(new URL(metadataPath, application.origin), {
      method: "OPTIONS",
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(
      response.headers.get("access-control-allow-methods"),
      "GET, OPTIONS",
    );
  });
}
