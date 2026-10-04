import { useEffect, useRef, useState } from "react";
import type { PluginClientContext, PluginSurfaceProps } from "@getpaseo/plugin/client";
import { usePaseo, useRpc } from "@getpaseo/plugin/client";
import { ScrollView, useToast } from "@getpaseo/plugin/client/react-native";
import { SettingsAction, SettingsRow, SettingsSection, SettingsSelect } from "@getpaseo/plugin/client/ui";
import { setWorkspaceMode } from "../shared/contracts";
import { Card } from "./card";
import {
  canUseWorktree,
  createSlpWorkspace,
  flowNotice,
  effectiveIsolation,
  buildCreateRequest,
  messageOf,
  newIdempotencyKey,
  preselectProject,
  type Isolation,
  type ProjectChoice,
} from "./new-workspace";

const STEP_HINT = {
  creating: "Creating the workspace...",
  "turning-on": "Turning SLP on...",
  opening: "Opening the SLP panel...",
} as const;

const ISOLATION_HINT: Record<Isolation, string> = {
  local: "Works in the project's own folder, like Paseo's New workspace.",
  worktree: "A separate git worktree on a new branch; Paseo names both.",
};

/** The screen behind "New SLP workspace"; it closes over `client` because only that can open a panel. */
export function createNewWorkspaceSurface(client: PluginClientContext, panelId: string) {
  return function NewSlpWorkspaceSurface({ navigation }: PluginSurfaceProps) {
    const paseo = usePaseo();
    const turnOn = useRpc(setWorkspaceMode);
    const toast = useToast();
    const [projects, setProjects] = useState<ProjectChoice[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [projectId, setProjectId] = useState("");
    const [isolation, setIsolation] = useState<Isolation>("local");
    const [step, setStep] = useState<keyof typeof STEP_HINT | null>(null);
    const [error, setError] = useState<string | null>(null);
    // A second press while the first still runs would create a second workspace.
    const running = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);

    useEffect(() => {
      let live = true;
      Promise.all([
        paseo.projects.list(),
        // The newest 200 is plenty to find the project in use right now.
        paseo.workspaces.list({ sort: [{ key: "activity_at", direction: "desc" }], page: { limit: 200 } }),
      ])
        .then(([{ projects: listed }, { entries }]) => {
          if (!live) return;
          setProjects(listed);
          setProjectId((current) => current || (preselectProject(listed, entries) ?? ""));
          setLoadError(null);
        })
        .catch((cause) => {
          if (live) setLoadError(messageOf(cause));
        });
      return () => {
        live = false;
      };
    }, [paseo]);

    const project = projects?.find((item) => item.projectId === projectId);
    const worktreeAllowed = canUseWorktree(project);
    const chosen = effectiveIsolation(project, isolation);
    const busy = step !== null;

    const create = async () => {
      if (!project || running.current) return;
      running.current = true;
      setError(null);
      try {
        const result = await createSlpWorkspace(buildCreateRequest(project, chosen, newIdempotencyKey()), {
          create: (request) => paseo.workspaces.create(request),
          turnOn: (workspaceId) => turnOn({ workspaceId, mode: "on" }),
          openPanel: (workspaceId) => client.openPanel(panelId, { workspaceId }),
          openWorkspace: navigation ? (workspaceId) => navigation.openWorkspace({ workspaceId }) : undefined,
          sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
          onStep: (next) => {
            if (mounted.current) setStep(next);
          },
        });
        // When the panel opens, this screen is gone: the toast is what Human sees.
        const notice = flowNotice(result);
        if (notice) {
          toast.show(notice, { variant: "error" });
          if (mounted.current) setError(notice);
        }
      } catch (cause) {
        if (mounted.current) setError(`Could not create the workspace: ${messageOf(cause)}`);
      } finally {
        running.current = false;
        if (mounted.current) setStep(null);
      }
    };

    return (
      <ScrollView>
        <SettingsSection title="New SLP workspace">
          <Card>
            {loadError ? <SettingsRow label="Projects unavailable" error={loadError} /> : null}
            {!loadError && !projects ? <SettingsRow label="Loading projects..." /> : null}
            {projects?.length === 0 ? (
              <SettingsRow label="No projects" hint="Add a project in Paseo first; this screen uses the ones Paseo knows." />
            ) : null}
            {projects?.length ? (
              <SettingsSelect
                label="Project"
                hint={project?.projectRootPath ?? "Pick the project to work in."}
                value={projectId}
                disabled={busy}
                options={[
                  ...(project ? [] : [{ label: "Choose a project", value: "" }]),
                  ...projects.map((item) => ({ label: item.projectDisplayName, value: item.projectId })),
                ]}
                onValueChange={(next) => setProjectId(next)}
              />
            ) : null}
            {projects?.length ? (
              <SettingsSelect
                label="Isolation"
                hint={worktreeAllowed || !project ? ISOLATION_HINT[chosen] : `${ISOLATION_HINT.local} Worktrees need a git project.`}
                value={chosen}
                disabled={busy || !worktreeAllowed}
                options={[
                  { label: "Local", value: "local" },
                  ...(worktreeAllowed ? [{ label: "Worktree", value: "worktree" }] : []),
                ]}
                onValueChange={(next) => setIsolation(next === "worktree" ? "worktree" : "local")}
              />
            ) : null}
            <SettingsRow
              label="Create"
              hint={step ? STEP_HINT[step] : "Creates the workspace, turns SLP on, and opens the SLP panel there."}
              error={error}
            >
              <SettingsAction
                label="Create"
                actionLabel="Create SLP workspace"
                disabled={busy || !project}
                onPress={() => void create()}
              />
            </SettingsRow>
          </Card>
        </SettingsSection>
      </ScrollView>
    );
  };
}
