/** Whipsr — Storage Cleanup Cron Trigger
 * Runs daily at 02:00 UTC.
 * Flags media not accessed in 90 days, deletes after 14-day grace period.
 * Messages are NEVER auto-deleted.
 */

interface Env {
  DB: D1Database;
  R2: R2Bucket;
}

/**
 * Cron handler — called by Cloudflare at configured schedule.
 * Scans storage_objects for flagged items past grace period and deletes them.
 */
export async function handleStorageCleanup(env: Env): Promise<void> {
  const now = Date.now();
  const flagThresholdMs = 90 * 24 * 60 * 60 * 1000; // 90 days
  const graceThresholdMs = (90 + 14) * 24 * 60 * 60 * 1000; // 90 + 14 days

  // Step 1: Flag objects not accessed in 90 days
  const flagCutoff = now - flagThresholdMs;
  await env.DB.prepare(
    `UPDATE storage_objects SET flagged_for_cleanup = 1 
     WHERE object_type = 'media' 
     AND flagged_for_cleanup = 0 
     AND last_accessed < ?`
  ).bind(flagCutoff).run();

  // Step 2: Delete objects flagged AND past 14-day grace period
  const deleteCutoff = now - graceThresholdMs;
  const toDelete = await env.DB.prepare(
    `SELECT id, user_id, r2_key, size_bytes FROM storage_objects 
     WHERE flagged_for_cleanup = 1 
     AND object_type = 'media'
     AND last_accessed < ?
     LIMIT 100`
  ).bind(deleteCutoff).all();

  if (!toDelete.results || toDelete.results.length === 0) return;

  for (const obj of toDelete.results) {
    const item = obj as { id: string; user_id: string; r2_key: string; size_bytes: number };

    try {
      // Delete from R2
      if (item.r2_key) {
        await env.R2.delete(item.r2_key);
      }

      // Remove from storage_objects
      await env.DB.prepare('DELETE FROM storage_objects WHERE id = ?').bind(item.id).run();

      // Update user's storage usage
      await env.DB.prepare(
        'UPDATE storage_usage SET r2_bytes = MAX(0, r2_bytes - ?), last_updated = ? WHERE user_id = ?'
      ).bind(item.size_bytes, now, item.user_id).run();
    } catch (err) {
      // Log but continue processing other objects
      console.error(`Cleanup failed for object ${item.id}:`, err);
    }
  }
}
