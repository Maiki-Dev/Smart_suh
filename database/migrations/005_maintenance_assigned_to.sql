-- Assignee column for maintenance requests (replaces audit-log-only assignment)

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to
  ON maintenance_requests(assigned_to);

-- Backfill from latest assignment audit log
UPDATE maintenance_requests mr
   SET assigned_to = sub.assigned_to
  FROM (
    SELECT DISTINCT ON (al.entity_id)
           al.entity_id,
           (al.new_data->>'assigned_to')::uuid AS assigned_to
      FROM audit_logs al
     WHERE al.entity_type = 'maintenance_request'
       AND al.action = 'MAINTENANCE_ASSIGNED'
       AND al.new_data->>'assigned_to' IS NOT NULL
     ORDER BY al.entity_id, al.created_at DESC
  ) sub
 WHERE mr.id = sub.entity_id
   AND mr.assigned_to IS NULL;
