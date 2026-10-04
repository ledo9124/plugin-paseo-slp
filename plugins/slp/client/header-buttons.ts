import type { PluginButton, PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import type { Mode } from "../shared/contracts";

interface ModeState {
  mode: Mode;
  locked: boolean;
  /** Items waiting for Human in the running group. */
  waiting: number;
}

export interface HeaderButtons {
  ensure(workspaceId: string): void;
  setMode(workspaceId: string, state: ModeState): void;
  remove(workspaceId: string): void;
  removeAll(): void;
}

// One header button per workspace, showing its SLP mode (decision 0005) and
// opening the SLP panel. A factory, not a class: the Paseo mobile app's Hermes
// evaluates plugin bundles with experimental class support, which left a class
// in this bundle undefined and stopped the plugin on the phone (v0.3.5).
export function createHeaderButtons(client: PluginClientContext, panelId: string): HeaderButtons {
  const registrations = new Map<string, PluginButtonRegistration>();
  const modes = new Map<string, ModeState>();

  const button = (workspaceId: string): PluginButton => {
    const state = modes.get(workspaceId) ?? { mode: "off", locked: false, waiting: 0 };
    const lock = state.locked ? " (locked)" : "";
    const waiting = state.waiting > 0 ? ` · ${state.waiting}` : "";
    const waitingTitle = state.waiting > 0 ? `, ${state.waiting} waiting for you` : "";
    return {
      title: `SLP ${state.mode}${lock}${waitingTitle}: open the SLP panel`,
      // Compact headers show no label, so the icon carries the mode: two people
      // while off, a group network while on.
      icon: state.mode === "on" ? "Network" : "Users",
      label: `${state.mode === "on" ? "SLP on" : "SLP off"}${waiting}`,
      behavior: { kind: "action", onPress: () => client.openPanel(panelId, { workspaceId }) },
    };
  };

  const remove = (workspaceId: string): void => {
    registrations.get(workspaceId)?.remove();
    registrations.delete(workspaceId);
  };

  return {
    ensure(workspaceId) {
      if (registrations.has(workspaceId)) return;
      registrations.set(
        workspaceId,
        client.addHeaderButton({ id: "slp-mode", workspaceId, button: button(workspaceId) }),
      );
    },
    setMode(workspaceId, state) {
      const known = modes.get(workspaceId);
      if (known && known.mode === state.mode && known.locked === state.locked && known.waiting === state.waiting) return;
      modes.set(workspaceId, state);
      registrations.get(workspaceId)?.update(button(workspaceId));
    },
    remove,
    removeAll() {
      for (const workspaceId of [...registrations.keys()]) remove(workspaceId);
    },
  };
}

/** Lets the panel push a changed mode to its workspace's header button. */
export const headerModeSink: { current: ((workspaceId: string, state: ModeState) => void) | null } = {
  current: null,
};
