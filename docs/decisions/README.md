# Decisions

Decision records preserve lasting product, architecture, data ownership,
security, compatibility, and validation choices that future work must inherit.

Use `docs/templates/decision.md`. Task-local implementation choices remain in
the active execution plan and do not require a separate decision.

An installed consumer begins with no fabricated decisions. Add local decision
documents here as real choices are accepted, then index them in this file.

## Index

- [0001 SLP As A Paseo Plugin](0001-slp-as-a-paseo-plugin.md): **Proposed**,
  awaiting Human acceptance. A pure plugin on the Paseo plugin API instead of
  the `paseo-slp` fork. Rests on per-agent `paseoTools` narrowing and
  plugin-hosted HTTP MCP; revisit if slice 1 of the v0.1 plan disproves
  either.
