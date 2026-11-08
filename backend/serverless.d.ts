import type { IncomingMessage, ServerResponse } from "node:http";

export function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void>;
