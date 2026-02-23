import React, { useMemo, useState } from 'react';
import { AgentProfile } from '../types';

type AgentDraft = {
  id: string;
  name: string;
  kind: 'general' | 'special';
  description: string;
  routingHintsRaw: string;
  allowedToolsRaw: string;
  enabled: boolean;
  soul: string;
};

type Props = {
  agents: AgentProfile[];
  toolCatalog: string[];
  loading: boolean;
  error: string;
  onReload: () => Promise<void>;
  onCreate: (payload: Omit<AgentProfile, 'updated_at'>) => Promise<void>;
  onUpdate: (id: string, payload: Omit<AgentProfile, 'updated_at' | 'id'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const EMPTY_DRAFT: AgentDraft = {
  id: '',
  name: '',
  kind: 'general',
  description: '',
  routingHintsRaw: '',
  allowedToolsRaw: '',
  enabled: true,
  soul: '# Agent Soul\n\nOpisz zachowanie agenta.',
};

function toDraft(profile: AgentProfile): AgentDraft {
  return {
    id: profile.id,
    name: profile.name,
    kind: profile.kind,
    description: profile.description,
    routingHintsRaw: profile.routingHints.join(', '),
    allowedToolsRaw: profile.allowedTools.join(', '),
    enabled: profile.enabled,
    soul: profile.soul,
  };
}

function normalizeList(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AgentsAdminView({ agents, toolCatalog, loading, error, onReload, onCreate, onUpdate, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<AgentDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const selected = useMemo(() => agents.find((agent) => agent.id === selectedId) || null, [agents, selectedId]);

  const handleSelect = (agentId: string) => {
    setSelectedId(agentId);
    const profile = agents.find((agent) => agent.id === agentId);
    if (profile) {
      setDraft(toDraft(profile));
      setLocalError('');
    }
  };

  const resetDraft = () => {
    setSelectedId('');
    setDraft(EMPTY_DRAFT);
    setLocalError('');
  };

  const save = async () => {
    const id = draft.id.trim().toLowerCase();
    const name = draft.name.trim();
    const soul = draft.soul.trim();
    if (!id || !name || !soul) {
      setLocalError('ID, nazwa i soul sa wymagane.');
      return;
    }

    setBusy(true);
    setLocalError('');
    try {
      const payload = {
        id,
        name,
        kind: draft.kind,
        description: draft.description.trim(),
        routingHints: normalizeList(draft.routingHintsRaw),
        allowedTools: normalizeList(draft.allowedToolsRaw),
        enabled: draft.enabled,
        soul,
      };

      if (selected && selected.id === id) {
        await onUpdate(id, {
          name: payload.name,
          kind: payload.kind,
          description: payload.description,
          routingHints: payload.routingHints,
          allowedTools: payload.allowedTools,
          enabled: payload.enabled,
          soul: payload.soul,
        });
      } else {
        await onCreate(payload);
      }
      await onReload();
      setSelectedId(id);
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : 'Nie udalo sie zapisac agenta.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    setBusy(true);
    setLocalError('');
    try {
      await onDelete(selected.id);
      await onReload();
      resetDraft();
    } catch (deleteError) {
      setLocalError(deleteError instanceof Error ? deleteError.message : 'Nie udalo sie usunac agenta.');
    } finally {
      setBusy(false);
    }
  };

  const hasTool = (name: string): boolean => normalizeList(draft.allowedToolsRaw).includes(name);
  const toggleTool = (name: string) => {
    const current = normalizeList(draft.allowedToolsRaw);
    const next = current.includes(name)
      ? current.filter((item) => item !== name)
      : [...current, name];
    setDraft((prev) => ({ ...prev, allowedToolsRaw: next.join(', ') }));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 lg:col-span-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Predefiniowani agenci</h2>
          <button onClick={() => onReload()} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">Odswiez</button>
        </div>
        <div className="space-y-2">
          {loading ? <div className="text-sm text-zinc-400">Ladowanie...</div> : null}
          {error ? <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300">{error}</div> : null}
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleSelect(agent.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left ${selectedId === agent.id ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-950/70 hover:bg-zinc-900'}`}
            >
              <div className="text-sm font-medium text-zinc-100">{agent.name}</div>
              <div className="mt-1 text-xs text-zinc-400">{agent.kind} | {agent.enabled ? 'enabled' : 'disabled'}</div>
            </button>
          ))}
          <button onClick={resetDraft} className="w-full rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
            + Nowy agent
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 lg:col-span-8">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Edytor agenta</h2>
        {localError ? <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{localError}</div> : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={draft.id}
            onChange={(event) => setDraft((prev) => ({ ...prev, id: event.target.value }))}
            placeholder="agent-id"
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          />
          <input
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Nazwa agenta"
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          />
          <select
            value={draft.kind}
            onChange={(event) => setDraft((prev) => ({ ...prev, kind: event.target.value as 'general' | 'special' }))}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="general">general</option>
            <option value="special">special</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => setDraft((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            Enabled
          </label>
        </div>

        <textarea
          value={draft.description}
          onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Opis i zastosowanie"
          className="mt-3 h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        />

        <textarea
          value={draft.routingHintsRaw}
          onChange={(event) => setDraft((prev) => ({ ...prev, routingHintsRaw: event.target.value }))}
          placeholder="Routing hints (comma-separated)"
          className="mt-3 h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        />

        <textarea
          value={draft.allowedToolsRaw}
          onChange={(event) => setDraft((prev) => ({ ...prev, allowedToolsRaw: event.target.value }))}
          placeholder="Allowed tools (comma-separated)"
          className="mt-3 h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          {toolCatalog.map((toolName) => (
            <button
              key={toolName}
              type="button"
              onClick={() => toggleTool(toolName)}
              className={`rounded-full border px-2 py-1 text-[11px] ${hasTool(toolName) ? 'border-emerald-500/50 text-emerald-300' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
            >
              {toolName}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDraft((prev) => ({ ...prev, allowedToolsRaw: '*' }))}
            className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
          >
            Ustaw *
          </button>
        </div>

        <textarea
          value={draft.soul}
          onChange={(event) => setDraft((prev) => ({ ...prev, soul: event.target.value }))}
          placeholder="soul.md"
          className="mt-3 h-80 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {busy ? 'Zapisywanie...' : 'Zapisz agenta'}
          </button>
          <button
            onClick={remove}
            disabled={busy || !selected}
            className="rounded-xl border border-rose-500/50 px-4 py-2 text-sm text-rose-300 disabled:opacity-50"
          >
            Usun agenta
          </button>
          <button onClick={resetDraft} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
            Reset formularza
          </button>
        </div>
      </section>
    </div>
  );
}
