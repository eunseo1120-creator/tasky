import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let envFileCache: Record<string, string> | null = null;

function loadEnvFile(): Record<string, string> {
  if (envFileCache) return envFileCache;

  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    envFileCache = {};
    return envFileCache;
  }

  const parsed: Record<string, string> = {};
  const text = readFileSync(envPath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const idx = line.indexOf("=");
    if (idx < 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  envFileCache = parsed;
  return parsed;
}

function readServerEnv(name: string): string | undefined {
  return process.env[name] || loadEnvFile()[name];
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const record = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const text = record.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => (content.type === "output_text" || content.type === "text" ? content.text : ""))
    .find((value) => typeof value === "string" && value.trim());

  return typeof text === "string" ? text.trim() : "";
}

export async function rewriteManagerCommentWithOpenAI(content: string) {
  const apiKey = readServerEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it to your local .env file to enable AI rewriting.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.45,
      max_output_tokens: 220,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "너는 한국 직장 협업 문장을 다듬는 비서다.",
                "입력 문장의 의도는 유지하되, 팀장에게 보고하거나 업무 댓글로 남겨도 자연스러운 문장으로 새로 작성한다.",
                "단순 치환하지 말고 맥락을 파악해 재작성한다.",
                "무조건 '확인 부탁드립니다'로 끝내지 않는다.",
                "공격적이거나 감정적인 표현은 완화하되, 핵심 요청과 문제의식은 남긴다.",
                "과장된 사과, 지나치게 딱딱한 문체, 번역투는 피한다.",
                "출력은 한국어 한 문단만 반환한다.",
              ].join("\n"),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `다음 업무 댓글 초안을 팀장 보고용으로 자연스럽고 전문적으로 다시 작성해줘:\n\n${content}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI rewrite failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as unknown;
  const rewritten = extractOutputText(payload);

  if (!rewritten) {
    throw new Error("OpenAI returned an empty rewrite.");
  }

  return rewritten;
}
