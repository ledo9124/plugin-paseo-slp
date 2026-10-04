import type { PluginButton, PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import type { Mode } from "../shared/contracts";

interface ModeState {
  mode: Mode;
  locked: boolean;
}

// One header button per workspace, showing its SLP mode (decision 0005) and
// opening the SLP panel.
export class HeaderButtons {
  private readonly registrations = new Map<string, PluginButtonRegistration>();
  private readonly modes = new Map<string, ModeState>();

  constructor(
    private readonly client: PluginClientContext,
    private readonly panelId: string,
  ) {}

  ensure(workspaceId: string): void {
    if (this.registrations.has(workspaceId)) return;
    this.registrations.set(
      workspaceId,
      this.client.addHeaderButton({ id: "slp-mode", workspaceId, button: this.button(workspaceId) }),
    );
  }

  setMode(workspaceId: string, state: ModeState): void {
    this.modes.set(workspaceId, state);
    this.registrations.get(workspaceId)?.update(this.button(workspaceId));
  }

  remove(workspaceId: string): void {
    this.registrations.get(workspaceId)?.remove();
    this.registrations.delete(workspaceId);
  }

  removeAll(): void {
    for (const workspaceId of [...this.registrations.keys()]) this.remove(workspaceId);
  }

  private button(workspaceId: string): PluginButton {
    const state = this.modes.get(workspaceId) ?? { mode: "off", locked: false };
    const lock = state.locked ? " (locked)" : "";
    return {
      title: `SLP ${state.mode}${lock}: open the SLP panel`,
      // Compact headers show no label, so the icon carries the mode: two people
      // while off, a group network while on.
      icon: state.mode === "on" ? "Network" : "Users",
      label: state.mode === "on" ? "SLP on" : "SLP off",
      behavior: { kind: "action", onPress: () => this.client.openPanel(this.panelId, { workspaceId }) },
    };
  }
}

/** Lets the panel push a changed mode to its workspace's header button. */
export const headerModeSink: { current: ((workspaceId: string, state: ModeState) => void) | null } = {
  current: null,
};
