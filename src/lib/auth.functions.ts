import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Bootstrap a confirmed user. The client supplies a random email/password
 * for its persistent local credential. We create the user with admin
 * privileges and email_confirm=true so the client can sign in immediately.
 *
 * Idempotent: if the user already exists, no-op success.
 */
export const bootstrapUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(16),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return { ok: true, existed: true };
      }
      throw error;
    }
    return { ok: true, existed: false };
  });
