import type { Assignment, Finding, MemberView, Role } from "../shared/contracts";

// Plain words for the enums the ledger and the group carry. Ids stay in the
// text as a second reference, because the members cite them in their messages.

const ROLE: Record<Role, string> = { supervisor: "Supervisor", lead: "Lead", peer: "Peer" };

export function roleLabel(role: Role): string {
  return ROLE[role];
}

const ASSIGNMENT_STATUS: Record<Assignment["status"], string> = {
  assigned: "in progress",
  "handed-back": "handed back, waiting for the Lead",
  accepted: "accepted",
  dropped: "dropped",
};

export function assignmentStatusLabel(status: Assignment["status"]): string {
  return ASSIGNMENT_STATUS[status];
}

const FINDING_KIND: Record<Finding["kind"], string> = {
  reopen: "A premise looks wrong",
  dependency: "A dependency",
  blocker: "A blocker",
  other: "A finding",
};

export function findingKindLabel(kind: Finding["kind"]): string {
  return FINDING_KIND[kind];
}

/** The member's role and, when it has one, its title. */
export function memberName(member: Pick<MemberView, "role" | "title">): string {
  return member.title ? `${roleLabel(member.role)} · ${member.title}` : roleLabel(member.role);
}

/** What a member is doing, in words Human uses. */
export function memberState(member: MemberView): string | null {
  if (member.archived) return "archived";
  // A member the daemon has not loaded since a restart reports "closed".
  if (member.status === "closed") return "inactive";
  if (member.status === "running") return "working";
  if (member.status === "initializing") return "starting";
  return member.status;
}
