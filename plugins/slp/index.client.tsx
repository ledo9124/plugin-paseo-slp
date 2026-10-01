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
    client.paseo.workspaces.subscribe((update) => {
      if (update.kind === "upsert") buttons.ensure(update.workspace.id);
      else buttons.remove(update.id);
    }),
  ];

  void (async () => {
    try {
      const [{ entries }, { workspaces }] = await Promise.all([
        client.paseo.workspaces.list(),
        client.rpc(listWorkspaceModes, {}),
      ]);
      for (const workspace of entries) buttons.ensure(workspace.id);
      for (const { workspaceId, mode, locked } of workspaces) buttons.setMode(workspaceId, { mode, locked });
    } catch (error) {
      console.error("[slp] could not load workspaces for header buttons", error);
    }
  })();

  return () => {
    for (const dispose of disposers) dispose();
    buttons.removeAll();
    headerModeSink.current = null;
  };
}
