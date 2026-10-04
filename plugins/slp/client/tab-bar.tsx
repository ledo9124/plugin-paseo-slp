import { Pressable, Text, View } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";

export type Tab<Key extends string> = { key: Key; title: string; marked?: boolean };

// The UI kit has no tabs, so this is a row of pressable chips in theme colors.
// A marked tab carries a dot (unsaved changes on it).
export function TabBar<Key extends string>({
  tabs,
  active,
  onSelect,
  theme,
}: {
  tabs: readonly Tab<Key>[];
  active: Key;
  onSelect(key: Key): void;
  theme: PluginSurfaceProps["theme"];
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingVertical: 8,
        backgroundColor: theme.colors.surface0,
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.key)}
            testID={`slp-settings-tab-${tab.key}`}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: selected ? theme.colors.accent : theme.colors.border,
              backgroundColor: selected ? theme.colors.accent : theme.colors.surface1,
            }}
          >
            <Text
              style={{
                fontWeight: selected ? "600" : "400",
                color: selected ? theme.colors.accentForeground : theme.colors.foreground,
              }}
            >
              {tab.marked ? `${tab.title} •` : tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
