export interface AuditEventInput {
  action: string;
  userId?: number;
  reason?: string;
}

export interface AuditEventRecord extends AuditEventInput {
  id: number;
  createdAt: Date;
}

export interface AuditRepository {
  record(event: AuditEventInput): Promise<void>;
  /** Newest first. Meant for investigations and tests, not for a request path. */
  findRecent(filter: { action?: string; userId?: number }, limit: number): Promise<AuditEventRecord[]>;
}
