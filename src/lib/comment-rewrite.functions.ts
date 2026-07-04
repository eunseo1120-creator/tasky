import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const rewriteManagerComment = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({
      content: z.string().trim().min(1).max(1500),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { rewriteManagerCommentWithOpenAI } = await import("@/lib/openai.server");
    const rewritten = await rewriteManagerCommentWithOpenAI(data.content);
    return { rewritten };
  });
