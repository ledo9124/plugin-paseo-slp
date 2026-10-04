import type { PluginClientContext } from "@getpaseo/plugin/client";
import { GROUP_LABEL, listWorkspaceModes } from "./shared/contracts";
import { HeaderButtons, headerModeSink } from "./client/header-buttons";
import { announceSlpActivity, onSlpActivity, stopSlpActivity } from "./client/live-updates";
import { createNewWorkspaceSurface } from "./client/new-workspace-surface";
import { SlpSettingsScreen } from "./client/settings-screen";
import { SlpPanel } from "./client/slp-panel";

const PANEL_ID = "slp";
const NEW_WORKSPACE_SURFACE_ID = "new-workspace";
// Slow fallback for header counts; agent and workspace updates refresh them sooner.
const MODES_REFRESH_MS = 30_000;

export default function contribute(client: PluginClientContext) {
  const buttons = new HeaderButtons(client, PANEL_ID);
  headerModeSink.current = (workspaceId, state) => buttons.setMode(workspaceId, state);

  // Best effort: a failed call leaves the buttons as they are.
  let released = false;
  const refreshModes = async () => {
    try {
      const { workspaces } = await client.rpc(listWorkspaceModes, {});
      if (released) return;
      for (const { workspaceId, mode, locked, waiting } of workspaces) buttons.setMode(workspaceId, { mode, locked, waiting });
    } catch (error) {
      console.error("[slp] could not load SLP modes for header buttons", error);
    }
  };

  const disposers = [
    // "workspace" first: it stays where the header button and openPanel put the panel by default;
    // "explorer" only lets Human place it in the Explorer sidebar.
    client.addWorkspacePanel({
      id: PANEL_ID,
      title: "SLP",
      icon: "Users",
      context: "workspace",
      locations: ["workspace", "explorer"],
      Component: SlpPanel,
    }),
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
    // One step from anywhere, with no workspace open: the screen creates a
    // workspace, turns SLP on, and opens the panel there.
    client.addSurface(NEW_WORKSPACE_SURFACE_ID, createNewWorkspaceSurface(client, PANEL_ID)),
    client.addSidebarItem({
      id: "slp-new-workspace",
      title: "New SLP workspace",
      icon: "Users",
      surface: NEW_WORKSPACE_SURFACE_ID,
    }),
    client.addCommandCenterItem({
      id: "slp-new-workspace",
      title: "SLP: new SLP workspace",
      icon: "Users",
      keywords: ["slp", "new", "workspace", "create", "supervisor", "lead", "peer"],
      context: "global",
      onSelect: ({ openSurface }) => openSurface(NEW_WORKSPACE_SURFACE_ID),
    }),
    client.paseo.workspaces.subscribe((update) => {
      // Only the button set follows workspaces. A new SLP workspace gets its mode and count from the
      // updates of its members (they carry the group label), or from the fallback poll.
      if (update.kind === "upsert") buttons.ensure(update.workspace.id);
      else buttons.remove(update.id);
    }),
    client.paseo.agents.subscribe((update) => {
      if (update.kind === "remove") announceSlpActivity(null);
      else if (update.agent.labels[GROUP_LABEL]) announceSlpActivity(update.agent.workspaceId ?? null);
    }),
    onSlpActivity(() => void refreshModes()),
  ];
  const modesTimer = setInterval(() => void refreshModes(), MODES_REFRESH_MS);

  // workspaces.subscribe and agents.subscribe only deliver updates after a
  // list({ subscribe }) call on the same API; without it a workspace created
  // after load never gets a header button and agent updates never arrive.
  const listSubscriptions = new Set<{ release(): Promise<void> }>();
  const releaseListSubscriptions = () => {
    for (const subscription of listSubscriptions) {
      void subscription.release().catch((error) => console.error("[slp] subscription cleanup failed", error));
    }
    listSubscriptions.clear();
  };
  const keepSubscription = (subscription: { release(): Promise<void> }) => {
    listSubscriptions.add(subscription);
    if (released) releaseListSubscriptions();
  };

  // The agent list is only the way to open the stream; one entry keeps it small.
  void client.paseo.agents
    .list({ subscribe: {}, page: { limit: 1 } })
    .then(({ subscription }) => keepSubscription(subscription))
    .catch((error) => console.error("[slp] could not subscribe to agent updates; header counts poll instead", error));

  void (async () => {
    try {
      const { entries, subscription } = await client.paseo.workspaces.list({ subscribe: {} });
      keepSubscription(subscription);
      if (released) return;
      for (const workspace of entries) buttons.ensure(workspace.id);
    } catch (error) {
      console.error("[slp] could not load workspaces for header buttons", error);
      return;
    }
    // A failed mode call leaves the buttons showing "SLP off" until the panel opens or a refresh succeeds.
    await refreshModes();
  })();

  return () => {
    released = true;
    clearInterval(modesTimer);
    stopSlpActivity();
    releaseListSubscriptions();
    for (const dispose of disposers) dispose();
    buttons.removeAll();
    headerModeSink.current = null;
  };
}
