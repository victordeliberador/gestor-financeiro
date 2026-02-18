import type { Settings } from "../domain/types";
import { CURRENT_SCHEMA_VERSION } from "../domain/constants";

export function migrateSettings(settings: Settings): Settings {
  const s = { ...settings };
  if (s.schemaVersion < 2) { s.aiMode = s.aiMode || "local"; }
  if (s.schemaVersion < 3) { s.categorizationRules = s.categorizationRules || []; }
  s.schemaVersion = CURRENT_SCHEMA_VERSION;
  s.updatedAt = Date.now();
  return s;
}
