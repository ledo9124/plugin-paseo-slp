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

  it("carries the conduct paragraph once per role", () => {
    for (const role of ROLES) {
      expect(flat(roleInstructions(role, facts)).split("use your full intelligence").length - 1, role).toBe(1);
    }
  });

  it("has a Peer raise a choice it cannot settle with options, consequences, and a recommendation", () => {
    expect(flat(roleInstructions("peer", facts))).toContain(
      "raise it in a finding or your handback with the options, their consequences, and your recommendation, and the Lead sorts it.",
    );
  });
});
