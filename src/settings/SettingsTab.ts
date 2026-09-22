import {
  App,
  PluginSettingTab,
  type SettingDefinitionItem,
} from "obsidian";
import type BetterWordCount from "src/main";
import { SectionCountDisplayMode } from "./Settings";

export default class BetterWordCountSettingsTab extends PluginSettingTab {
  constructor(app: App, plugin: BetterWordCount) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "General Settings",
        items: [
          {
            name: "Show Cursor Position",
            desc: "Display the active cursor position and selection statistics in the status bar.",
            control: { type: "toggle", key: "showCursorPosition" },
          },
          {
            name: "Display Section Counts",
            desc: "Choose what to display next to headings: disable, word counts, or character counts.",
            control: {
              type: "dropdown",
              key: "sectionCountDisplayMode",
              options: {
                [SectionCountDisplayMode.disable]: "Disable",
                [SectionCountDisplayMode.words]: "Word Count",
                [SectionCountDisplayMode.characters]: "Character Count",
              },
            },
          },
        ],
      },
    ];
  }
}
