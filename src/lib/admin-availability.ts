/**
 * Guards for the local/dev-only admin upload page (src/pages/admin/index.astro)
 * and its API route (src/pages/api/admin/upload.ts).
 *
 * Both routes write directly to the filesystem under src/content/blog/.
 * That works great with `astro dev` or a self-hosted Node server, but on
 * Vercel every request can land on a fresh, read-only, ephemeral
 * filesystem — a "successful" upload there would vanish without ever
 * publishing anything. Rather than let that fail silently, both routes
 * disable themselves whenever they detect they're running on Vercel.
 */

/** Vercel sets this on every build and at runtime, in every environment (production, preview, dev). */
export function isRunningOnVercel(): boolean {
  return process.env.VERCEL === '1';
}

export const ADMIN_DISABLED_MESSAGE =
  'The admin upload page only works when running locally (npm run dev) or on a self-hosted Node server with a persistent filesystem. It is disabled on this deployment because uploads would not be saved.';
