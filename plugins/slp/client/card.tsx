import { Children, Fragment, cloneElement, isValidElement, type ReactNode } from "react";
import { SettingsCard } from "@getpaseo/plugin/client/ui";

// SettingsCard draws a divider between its direct children, and
// Children.toArray counts a fragment as one child. Spread fragments first so
// rows grouped in a fragment still get dividers; nulls and false are dropped.
function flatten(children: ReactNode, prefix = ""): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [child];
    if (child.type === Fragment) return flatten(child.props.children, `${prefix}${String(child.key)}/`);
    return [cloneElement(child, { key: `${prefix}${String(child.key)}` })];
  });
}

/** A card of settings rows with dividers. Rows from components must come as separate children. */
export function Card({ children, testID }: { children: ReactNode; testID?: string }) {
  return <SettingsCard testID={testID}>{flatten(children)}</SettingsCard>;
}
