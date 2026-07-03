// QA findings store. Module-level, in-memory + localStorage, with dedup and a
// subscribe API — same pattern as `onBotActionsChange` in bots.ts. No DB table
// (avoids the migration/RLS drift flagged in AUDIT_COMPLET.md): the report lives
// in the demo operator's browser, which is enough for the end-of-game report.
//
// The store is GLOBAL (one localStorage key), NOT per-game: findings accumulate
// across resets and new games and are only wiped by the explicit "Vider" button
// (clearFindings). Dedup by dedupeKey means a recurring issue bumps its count
// instead of piling up duplicate rows.

import type { FindingInput, QAFinding, Severity } from "./types";

const STORE_KEY = "mp_qa_findings"; // single global key — persists across games
const LEGACY_PREFIX = "mp_qa_findings_"; // old per-game keys, migrated then removed

// Survie au HMR (dev) : sans ça, éditer du code recharge ce module → la map ET
// les listeners en mémoire sont réinitialisés alors que l'état React survit, ce
// qui fige/désynchronise le rapport (le bouton « Vider » semble alors inopérant).
// On conserve donc map + listeners + flag dans import.meta.hot.data, par référence.
const _hot = (import.meta as unknown as { hot?: { data: Record<string, unknown> } }).hot;

const findings: Map<string, QAFinding> =
  (_hot?.data.findings as Map<string, QAFinding>) ?? new Map<string, QAFinding>();
const listeners: Set<(f: QAFinding[]) => void> =
  (_hot?.data.listeners as Set<(f: QAFinding[]) => void>) ?? new Set();
if (_hot) {
  _hot.data.findings = findings;
  _hot.data.listeners = listeners;
}
const isLoaded = () => (_hot ? _hot.data.loaded === true : _localLoaded);
const setLoaded = () => { if (_hot) _hot.data.loaded = true; else _localLoaded = true; };
let _localLoaded = false;

let _seq = 0;
function nextId(): string {
  _seq += 1;
  return `qa_${_seq}_${Date.now().toString(36)}`;
}

function snapshot(): QAFinding[] {
  return Array.from(findings.values());
}

function emit() {
  const snap = snapshot();
  listeners.forEach((cb) => cb(snap));
}

function persist() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(snapshot()));
  } catch {
    // quota / serialization issues are non-fatal for a debug report
  }
}

function mergeArray(arr: unknown) {
  if (!Array.isArray(arr)) return;
  for (const f of arr as QAFinding[]) {
    if (!f?.dedupeKey) continue;
    const existing = findings.get(f.dedupeKey);
    if (!existing) findings.set(f.dedupeKey, f);
    else existing.count += f.count ?? 1; // merge legacy duplicates
  }
}

/** Load the global store once + migrate any legacy per-game keys. Never wipes. */
export function initReport(_gameId?: string) {
  if (isLoaded()) return;
  setLoaded();
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) mergeArray(JSON.parse(raw));
      // One-time migration: fold any old per-game stores into the global one.
      const legacy: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k !== STORE_KEY && k.startsWith(LEGACY_PREFIX)) legacy.push(k);
      }
      for (const k of legacy) {
        try { mergeArray(JSON.parse(localStorage.getItem(k) ?? "[]")); } catch { /* skip */ }
        localStorage.removeItem(k);
      }
      if (legacy.length) persist();
    } catch {
      // ignore corrupt cache
    }
  }
  emit();
}

/**
 * Tamponne des findings avec leur partie d'origine : ajoute `gameCode`/`gameId`
 * et PRÉFIXE la `dedupeKey` par l'id de partie. Ainsi un même problème vu dans
 * deux parties donne DEUX entrées (une par partie) au lieu d'être fusionné — le
 * rapport devient un vrai journal par partie, sans perdre l'historique.
 */
export function withGame(inputs: FindingInput[], gameId: string, gameCode: string): FindingInput[] {
  return inputs.map((f) => ({ ...f, gameId, gameCode, dedupeKey: `${gameId}:${f.dedupeKey}` }));
}

/** Record one finding. Dedupes by `dedupeKey`: re-seeing an issue bumps its count. */
export function addFinding(input: FindingInput): boolean {
  const now = Date.now();
  const existing = findings.get(input.dedupeKey);
  if (existing) {
    existing.count += 1;
    existing.lastSeenAt = now;
    // keep the freshest tour/phase/evidence for context
    existing.tour = input.tour;
    existing.phase = input.phase;
    if (input.evidence) existing.evidence = input.evidence;
    persist();
    emit();
    return false;
  }
  const finding: QAFinding = { ...input, id: nextId(), firstSeenAt: now, lastSeenAt: now, count: 1 };
  findings.set(input.dedupeKey, finding);
  persist();
  emit();
  return true;
}

/** Record many findings at once (single emit). Returns how many were new. */
export function addFindings(inputs: FindingInput[]): number {
  if (inputs.length === 0) return 0;
  const now = Date.now();
  let added = 0;
  for (const input of inputs) {
    const existing = findings.get(input.dedupeKey);
    if (existing) {
      existing.count += 1;
      existing.lastSeenAt = now;
      existing.tour = input.tour;
      existing.phase = input.phase;
      if (input.evidence) existing.evidence = input.evidence;
    } else {
      findings.set(input.dedupeKey, { ...input, id: nextId(), firstSeenAt: now, lastSeenAt: now, count: 1 });
      added += 1;
    }
  }
  persist();
  emit();
  return added;
}

export function getFindings(): QAFinding[] {
  return snapshot();
}

export function clearFindings() {
  findings.clear();
  persist();
  emit();
}

export function countBySeverity(): Record<Severity, number> {
  const out: Record<Severity, number> = { critical: 0, high: 0, medium: 0, info: 0 };
  for (const f of findings.values()) out[f.severity] += 1;
  return out;
}

export function onFindingsChange(cb: (f: QAFinding[]) => void): () => void {
  listeners.add(cb);
  cb(snapshot());
  return () => listeners.delete(cb);
}
