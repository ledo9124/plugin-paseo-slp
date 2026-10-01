/** The agent's last reply in a turn timeline. After a reload the timeline also holds earlier turns. */
export function lastAssistantText(timeline: readonly { type: string; text?: string }[]): string | null {
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const item = timeline[index];
    if (item.type === "assistant_message" && typeof item.text === "string") return item.text;
  }
  return null;
}
