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

  it("bans send_agent_prompt for what it bypasses, not a stale cause (Human, D17)", () => {
    for (const role of ROLES) {
      const text = flat(roleInstructions(role, facts));
      expect(text, role).toContain(
        "Message members only with slp_send; do not use Paseo's send_agent_prompt or create_agent: " +
          "they bypass SLP's held messages, the ledger, the relay of the Lead's reply, and the SLP panel.",
      );
      expect(text, role).not.toContain("cancels a busy recipient's turn");
    }
  });

  it("has the Supervisor steer only when the Lead's work would be wasted, as a short note (Human, D6-D7)", () => {
    expect(flat(roleInstructions("supervisor", facts))).toContain(
      `Steer (slp_send with delivery "steer") only when the Lead's work would otherwise be wasted: ` +
        "Human's answer stops, narrows, or reverses what the Lead is doing now. " +
        "Then steer one short note: the decision id and what to stop or keep; send the rest after-turn, " +
        "and the Lead decides how to redirect. Otherwise send after-turn. When unsure, steer the one-line note.",
    );
  });

  it("lets the Supervisor hand off the Lead any time with the Lead's own note, and report after (Human D11-D12, D23-D24)", () => {
    const text = flat(roleInstructions("supervisor", facts));
    expect(text).toContain("You may also hand the Lead role to a fresh Lead at any time, and tell Human after");
    expect(text).toContain("First ask the Lead with slp_send for its handoff note: the Lead decides what to hand off.");
    expect(text).toContain("Then call slp_handoff with the note as the Lead wrote it.");
    expect(text).toContain("the old Lead is archived once its turn has ended.");
  });

  it("gives a Peer near its context window no next step, and has the Lead decide its handoff note (Human D12, D23-D24)", () => {
    const text = flat(roleInstructions("lead", facts));
    expect(text).toContain(
      "only when it is the next step of that Peer's own last scope and its context has room. " +
        "When its context use (Paseo's get_agent_status, lastUsage.contextWindowUsedTokens) nears its window, " +
        "the next step goes to a fresh Peer, with a brief that carries what the step needs.",
    );
    expect(text).toContain(
      "When the Supervisor asks you for a handoff note, you decide what the next Lead needs: current work, open items, " +
        "background work (what you started and how to restart it), and what matters for the next step.",
    );
  });

  it("has a Peer raise a choice it cannot settle with options, consequences, and a recommendation", () => {
    expect(flat(roleInstructions("peer", facts))).toContain(
      "raise it in a finding or your handback with the options, their consequences, and your recommendation, and the Lead sorts it.",
    );
  });
});
