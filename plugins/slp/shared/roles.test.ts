import { describe, expect, it } from "vitest";
import type { Role } from "./contracts";
import { roleInstructions } from "./roles";

const ROLES: Role[] = ["supervisor", "lead", "peer"];
const facts = { provider: "claude", maxActivePeers: 3, tools: ["slp_ledger"] };
const flat = (text: string) => text.replace(/\s+/g, " ");

describe("role instructions", () => {
  it("give every role the shared conduct paragraph (Human, 2026-10-07)", () => {
    for (const role of ROLES) {
      const text = flat(roleInstructions(role, facts));
      expect(text, role).toContain(
        "Whatever your role, whether you coordinate others, execute a scope, advise, or review, use your full intelligence in it. " +
          "Question what deserves questioning, decide what is yours to decide, and bring a recommendation when another authority must act. " +
          "Keep Human focused on the decisions that require Human's direction.",
      );
    }
  });

  it("gives every role the first-person paragraph (Human, D11)", () => {
    for (const role of ROLES) {
      expect(flat(roleInstructions(role, facts)), role).toContain(
        'When you write to another member, speak in the first person as the owner of your role: say as "I" what you did, decided, need, or recommend. ' +
          "Keep who said or inferred what: name Human, a record, or another member as the source of what is theirs. " +
          "Claim no action, result, experience, or authority you do not have; a claim of work names its evidence.",
      );
    }
  });

  it("carries the conduct paragraph once per role", () => {
    for (const role of ROLES) {
      expect(flat(roleInstructions(role, facts)).split("use your full intelligence").length - 1, role).toBe(1);
    }
  });

  it("has the Supervisor quote Human, keep its own reading apart, and ask a how-far level Human did not name (Human, D9)", () => {
    const text = flat(roleInstructions("supervisor", facts));
    expect(text).toContain(
      'A level Human did not name (for example merge, when Human named commit and push) is still open: ask it; do not read it from the others.',
    );
    expect(text).toContain(
      'status "settled"): Human\'s own words, quoted, and only what they settle. ' +
        'Your reading of them is not Human\'s: record it as a separate decision with source "agent" that names you, or ask Human.',
    );
  });

  it("has the Lead cite Human only for words a decision quotes from Human (Human, D9)", () => {
    expect(flat(roleInstructions("lead", facts))).toContain(
      "Cite Human only for the words a decision quotes from Human; anything else in that decision names whoever wrote it. " +
        "Never tell a member that Human confirmed or decided something unless a decision quotes Human saying it.",
    );
  });

  it("has a Peer raise a choice it cannot settle with options, consequences, and a recommendation", () => {
    expect(flat(roleInstructions("peer", facts))).toContain(
      "raise it in a finding or your handback with the options, their consequences, and your recommendation, and the Lead sorts it.",
    );
  });
});
