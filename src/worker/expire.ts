/** Which leads the daily cron expires: new after 30 days, shown after 60, not interested 30 days after the last contact. Sold and live never. */
export const EXPIRE_SQL = `SELECT id FROM leads WHERE status != 'expired' AND (
       (sales_status = 'new' AND created_at < ?1)
    OR (sales_status = 'shown' AND created_at < ?2)
    OR (sales_status = 'not_interested' AND COALESCE(last_contact, updated_at) < ?1))
  AND NOT (COALESCE(follow_up, '') >= ?3 AND created_at >= ?4) LIMIT 200`;
