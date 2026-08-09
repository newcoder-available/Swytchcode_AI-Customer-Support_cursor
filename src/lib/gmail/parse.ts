type Header = { name?: string; value?: string };

export function headerValue(headers: Header[] | undefined, name: string): string {
  if (!Array.isArray(headers)) return "";
  const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value?.trim() || "";
}

export function parseEmailAddress(raw: string): { email: string; name: string } {
  const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);
  if (match) {
    return {
      name: (match[1] || match[2].split("@")[0] || "Customer").trim(),
      email: match[2].trim().toLowerCase(),
    };
  }
  if (raw.includes("@")) {
    return { name: raw.split("@")[0], email: raw.trim().toLowerCase() };
  }
  return { name: raw || "Customer", email: raw || "unknown@example.com" };
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  try {
    return Buffer.from(normalized + pad, "base64").toString("utf8");
  } catch {
    return "";
  }
}

type Payload = {
  mimeType?: string;
  body?: { data?: string };
  parts?: Payload[];
  headers?: Header[];
};

export function extractBodyText(payload?: Payload): string {
  if (!payload) return "";
  if (payload.mimeType?.startsWith("text/plain") && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts?.length) {
    for (const part of payload.parts) {
      const text = extractBodyText(part);
      if (text.trim()) return text;
    }
  }
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  return "";
}

export function encodeRawRfc822(message: string): string {
  return Buffer.from(message, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function buildReplyRfc822(input: {
  to: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const subject = input.subject.toLowerCase().startsWith("re:")
    ? input.subject
    : `Re: ${input.subject}`;
  const lines = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (input.inReplyTo) lines.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references) lines.push(`References: ${input.references}`);
  lines.push("", input.body);
  return lines.join("\r\n");
}

/** New outbound message (creates a Gmail thread = support ticket). */
export function buildOutboundRfc822(input: {
  to: string;
  from: string;
  subject: string;
  body: string;
}): string {
  const lines = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    input.body,
  ];
  return lines.join("\r\n");
}
