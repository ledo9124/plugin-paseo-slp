import type { PluginClientContext } from "@getpaseo/plugin/client";
import { listWorkspaceModes } from "./shared/contracts";
import { HeaderButtons, headerModeSink } from "./client/header-buttons";
import { SlpSettingsScreen } from "./client/settings-screen";
import { SlpPanel } from "./client/slp-panel";

const PANEL_ID = "slp";

export default function contribute(client: PluginClientContext) {
  const buttons = new HeaderButtons(client, PANEL_ID);
  headerModeSink.current = (workspaceId, state) => buttons.setMode(workspaceId, state);

  const disposers = [
    client.addWorkspacePanel({ id: PANEL_ID, title: "SLP", icon: "Users", context: "workspace", Component: SlpPanel }),
    client.addSettingsScreen({ id: "slp", title: "SLP", icon: "Users", Component: SlpSettingsScreen }),
    // Works in an empty workspace too: it needs a workspace route, not a tab.
    client.addCommandCenterItem({
      id: "slp-open",
      title: "SLP: open the SLP panel (turn SLP on)",
      icon: "Users",
      keywords: ["slp", "supervisor", "lead", "peer", "mode", "on"],
      context: "workspace",
      onSelect: ({ openPanel }) => openPanel(PANEL_ID),
    }),
    client.paseo.workspaces.subscribe((update) => {
      if (update.kind === "upsert") buttons.ensure(update.workspace.id);
      else buttons.remove(update.id);
    }),
  ];

  // workspaces.subscribe only delivers updates after a list({ subscribe }) call
  // on the same API; without it a workspace created after load never gets a
  // header button.
  let released = false;
  let listSubscription: { release(): Promise<void> } | null = null;
  const releaseListSubscription = () => {
    const subscription = listSubscription;
    listSubscription = null;
    void subscription?.release().catch((error) => console.error("[slp] workspace subscription cleanup failed", error));
  };

  void (async () => {
    try {
      const { entries, subscription } = await client.paseo.workspaces.list({ subscribe: {} });
      listSubscription = subscription;
      if (released) {
        releaseListSubscription();
        return;
      }
      for (const workspace of entries) buttons.ensure(workspace.id);
    } catch (error) {
      console.error("[slp] could not load workspaces for header buttons", error);
      return;
    }
    // Best effort: a failed mode call leaves the buttons showing "SLP off" until the panel opens.
    try {
      const { workspaces } = await client.rpc(listWorkspaceModes, {});
      if (released) return;
      for (const { workspaceId, mode, locked } of workspaces) buttons.setMode(workspaceId, { mode, locked });
    } catch (error) {
      console.error("[slp] could not load SLP modes for header buttons", error);
    }
  })();

  return () => {
    released = true;
    releaseListSubscription();
    for (const dispose of disposers) dispose();
    buttons.removeAll();
    headerModeSink.current = null;
  };
}
