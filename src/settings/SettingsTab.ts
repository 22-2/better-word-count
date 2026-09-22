import {
  App,
  PluginSettingTab,
  type SettingDefinitionItem,
  type SettingDefinitionList,
  type SettingGroupItem,
} from "obsidian";
import type BetterWordCount from "src/main";
import {
  BLANK_SB_ITEM,
  MetricCounter,
  MetricType,
  SectionCountDisplayMode,
  type StatusBarItem,
} from "./Settings";

const METRIC_COUNTER_OPTIONS: Record<string, string> = {
  [MetricCounter.words]: "Words",
  [MetricCounter.characters]: "Characters",
  [MetricCounter.sentences]: "Sentences",
  [MetricCounter.footnotes]: "Footnotes",
  [MetricCounter.citations]: "Citations",
  [MetricCounter.pages]: "Pages",
  [MetricCounter.files]: "Files",
};

const METRIC_TYPE_OPTIONS: Record<string, string> = {
  [MetricType.file]: "Current Note",
  [MetricType.daily]: "Daily Metric",
  [MetricType.total]: "Total in Vault",
};

const SECTION_COUNT_OPTIONS: Record<string, string> = {
  [SectionCountDisplayMode.disable]: "Disable",
  [SectionCountDisplayMode.words]: "Word Count",
  [SectionCountDisplayMode.characters]: "Character Count",
};

type StatusBarCollection = "statusBar" | "altBar";

export default class BetterWordCountSettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: BetterWordCount) {
    super(app, plugin);
  }

  getControlValue(key: string): unknown {
    return this.readPath(key);
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    // Declarative controls use string values for dropdowns, while the existing
    // status-bar model stores its enum values as numbers.
    if (key.endsWith(".metric.counter") || key.endsWith(".metric.type")) {
      value = Number(value);
    }

    this.writePath(key, value);

    if (key === "sectionCountDisplayMode") {
      this.plugin.onDisplaySectionCountsChange();
    }
    await this.plugin.saveSettings();
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "General Settings",
        items: [
          {
            name: "Collect Statistics",
            desc: "Reload required for change to take effect. Turn on to start collecting daily statistics of your writing. Stored in the path specified below. This is required for counts of the day as well as total counts.",
            control: { type: "toggle", key: "collectStats" },
          },
          {
            name: "Don't Count Comments",
            desc: "Turn on if you don't want markdown comments to be counted.",
            control: { type: "toggle", key: "countComments" },
          },
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
              options: SECTION_COUNT_OPTIONS,
            },
          },
          {
            name: "Page Word Count",
            desc: 'Set how many words count as one "page".',
            control: {
              type: "number",
              key: "pageWords",
              defaultValue: 300,
              min: 1,
              validate: (value) =>
                Number.isInteger(value) && value > 0
                  ? undefined
                  : "Enter a positive whole number.",
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Advanced Settings",
        items: [
          {
            name: "Vault Stats File Path",
            desc: "Reload required for change to take effect. The location of the vault statistics file, relative to the vault root.",
            control: {
              type: "text",
              key: "statsPath",
              placeholder: ".obsidian/vault-stats.json",
              defaultValue: ".obsidian/vault-stats.json",
              validate: (value) =>
                value.trim() ? undefined : "Enter a path relative to the vault root.",
            },
          },
        ],
      },
      this.createStatusBarList("statusBar", "Markdown Status Bar", "when editing a markdown note"),
      this.createStatusBarList("altBar", "Alternative Status Bar", "when not editing a markdown file"),
    ];
  }

  private createStatusBarList(
    collection: StatusBarCollection,
    heading: string,
    context: string,
  ): SettingDefinitionList {
    const items = this.plugin.settings[collection];

    return {
      type: "list",
      heading,
      emptyState: `No status bar items configured ${context}.`,
      addItem: {
        name: "Add status bar item",
        action: () => {
          items.push(this.createBlankItem());
          void this.plugin.saveSettings();
          this.update();
        },
      },
      onReorder: (oldIndex, newIndex) => {
        const [item] = items.splice(oldIndex, 1);
        if (item) items.splice(newIndex, 0, item);
        void this.plugin.saveSettings();
      },
      onDelete: (index) => {
        items.splice(index, 1);
        void this.plugin.saveSettings();
        this.update();
      },
      items: items.map((item, index) => this.createStatusBarItemPage(collection, item, index)),
    };
  }

  private createStatusBarItemPage(
    collection: StatusBarCollection,
    item: StatusBarItem,
    index: number,
  ): SettingGroupItem {
    const prefix = `${collection}.${index}`;

    return {
      type: "page",
      name: `Status Bar Item ${index + 1}`,
      desc: "Configure the metric, prefix, and suffix.",
      items: [
        {
          type: "group",
          heading: "Metric",
          items: [
            {
              name: "Metric Counter",
              desc: "Select the counter to display, e.g. words or characters.",
              control: {
                type: "dropdown",
                key: `${prefix}.metric.counter`,
                options: METRIC_COUNTER_OPTIONS,
              },
            },
            {
              name: "Metric Type",
              desc: "Select the type of metric that you want displayed.",
              control: {
                type: "dropdown",
                key: `${prefix}.metric.type`,
                options: METRIC_TYPE_OPTIONS,
              },
            },
          ],
        },
        {
          type: "group",
          heading: "Text",
          items: [
            {
              name: "Prefix Text",
              desc: "This text is placed before the count.",
              control: { type: "text", key: `${prefix}.prefix` },
            },
            {
              name: "Suffix Text",
              desc: "This text is placed after the count.",
              control: { type: "text", key: `${prefix}.suffix` },
            },
          ],
        },
        {
          name: "Remove this item",
          desc: "Remove this status bar item from the list.",
          action: () => {
            const currentIndex = this.plugin.settings[collection].indexOf(item);
            if (currentIndex === -1) return;
            this.plugin.settings[collection].splice(currentIndex, 1);
            void this.plugin.saveSettings();
            this.update();
          },
        },
      ],
    };
  }

  private createBlankItem(): StatusBarItem {
    return {
      ...BLANK_SB_ITEM,
      metric: { ...BLANK_SB_ITEM.metric },
    };
  }

  private readPath(path: string): unknown {
    return path.split(".").reduce<unknown>((value, segment) => {
      if (value === null || value === undefined) return undefined;
      return (value as Record<string, unknown>)[segment];
    }, this.plugin.settings);
  }

  private writePath(path: string, value: unknown): void {
    const segments = path.split(".");
    const lastSegment = segments.pop();
    if (!lastSegment) return;

    let target: Record<string, unknown> = this.plugin.settings as unknown as Record<string, unknown>;
    for (const segment of segments) {
      const next = target[segment];
      if (next === null || next === undefined || typeof next !== "object") return;
      target = next as Record<string, unknown>;
    }
    target[lastSegment] = value;
  }
}
