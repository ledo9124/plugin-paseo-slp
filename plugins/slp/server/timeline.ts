/**
 * The agent's last reply in a timeline. Providers stream a message in
 * consecutive chunks, so the last run of assistant messages is joined. After a
 * reload the timeline also holds earlier turns.
 */
export function lastAssistantText(timeline: readonly { type: string; text?: string }[]): string | null {
  const chunks: string[] = [];
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const item = timeline[index];
    if (item.type !== "assistant_message" || typeof item.text !== "string") {
      if (chunks.length > 0) break;
      continue;
    }
    chunks.push(item.text);
  }
  return chunks.length > 0 ? chunks.reverse().join("") : null;
}

/**
 * The reply of one turn in a fetched timeline page (Paseo 0.13+ sends
 * `agent.turn_ended` with an empty timeline, so the plugin fetches the tail).
 * When entries name their turn, only the ended turn's are read, so a turn
 * that said nothing does not return the previous turn's message.
 */
export function replyOfTurn(
  entries: readonly { item: { type: string; text?: string }; turnId?: string }[],
  turnId: string | null,
): string | null {
  const ofTurn = turnId ? entries.filter((entry) => entry.turnId === turnId) : [];
  return lastAssistantText((ofTurn.length > 0 ? ofTurn : entries).map((entry) => entry.item));
}
