import { readFileSync } from "node:fs";

async function main() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }

  const { gmailExec, unwrapData } = await import("../src/lib/gmail/client");
  const { buildOutboundRfc822, encodeRawRfc822 } = await import(
    "../src/lib/gmail/parse"
  );

  const rfc = buildOutboundRfc822({
    to: "arya.buildsai@gmail.com",
    from: "arya.buildsai@gmail.com",
    subject: `ResolveAI probe ${Date.now()}`,
    body: "probe body",
  });

  const send = await gmailExec("gmail.messages.send", {
    params: { userId: "me" },
    body: { raw: encodeRawRfc822(rfc) },
  });

  const u = unwrapData(send as { ok: boolean; data?: unknown });
  console.log(
    JSON.stringify(
      {
        ok: send.ok,
        mode: (send as { mode?: string }).mode,
        channel: (send as { channel?: string }).channel,
        error: (send as { error?: string }).error,
        category: (send as { category?: string }).category,
        unwrapKeys:
          u && typeof u === "object" ? Object.keys(u as object) : u,
        unwrap: u,
        rawData: (send as { data?: unknown }).data,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
