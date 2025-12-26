import { MarkdownView, Plugin, WorkspaceLeaf, type FileManager } from "obsidian";
import BetterWordCountSettingsTab from "./settings/SettingsTab";
import StatsManager from "./stats/StatsManager";
import StatusBar from "./status/StatusBar";
import type { EditorView } from "@codemirror/view";
import {
  settingsChanged,
  pluginField,
  sectionWordCountEditorPlugin,
  statusBarEditorPlugin,
} from "./editor/EditorPlugin";
import { BetterWordCountSettings, DEFAULT_SETTINGS } from "src/settings/Settings";
import { settingsStore } from "./utils/SvelteStores";
import BetterWordCountApi from "src/api/api";
import { handleFileMenu } from "./utils/FileMenu";

export default class BetterWordCount extends Plugin {
  public settings: BetterWordCountSettings;
  public statusBar: StatusBar;
  public statsManager: StatsManager;
  public api: BetterWordCountApi = new BetterWordCountApi(this);

  async onunload(): Promise<void> {
    this.statsManager = null;
    this.statusBar = null;
  }

  async onload() {
    // Settings Store
    // this.register(
    //   settingsStore.subscribe((value) => {
    //     this.settings = value;
    //   })
    // );
    // Handle Settings
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new BetterWordCountSettingsTab(this.app, this));

    this.addCommand({
      id: "bwc-toggle-title-character-counts",
      name: "Toggle Title Character Counts (frontmatter)",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (checking) return true;
        (async () => {
          const key = "enable-title-character-counts";
          const fm = (this.app as any).fileManager as FileManager;
            await fm.processFrontMatter(file, (frontmatter: any) => {
              const cur = frontmatter?.[key];
              const enabled = cur === true || cur === 1 || (typeof cur === "string" && cur.toLowerCase() === "true");
              if (enabled) {
                delete frontmatter[key];
              } else {
                frontmatter[key] = true;
              }
            });
          // Refresh decorations
          this.onDisplaySectionCountsChange();
        })();

        return true;
      },
    });

    // Handle Statistics
    if (this.settings.collectStats) {
      this.statsManager = new StatsManager(this.app.vault, this.app.workspace, this);
    }

    // Handle Status Bar
    let statusBarEl = this.addStatusBarItem();
    this.statusBar = new StatusBar(statusBarEl, this);

    // Handle the Editor Plugins
    this.registerEditorExtension([pluginField.init(() => this), statusBarEditorPlugin, sectionWordCountEditorPlugin]);

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async (leaf: WorkspaceLeaf) => {
        if (leaf.view.getViewType() !== "markdown") {
          this.statusBar.updateAltBar();
        }

        if (!this.settings.collectStats) return;
        await this.statsManager.recalcTotals();
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", async () => {
        if (!this.settings.collectStats) return;
        await this.statsManager.recalcTotals();
      })
    );

    // Register a new action for right clicking on folders
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file, source) => {
        handleFileMenu(menu, file, source, this);
      })
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onDisplaySectionCountsChange() {
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
      if (leaf?.view instanceof MarkdownView) {
        const cm = (leaf.view.editor as any).cm as EditorView;
        if (cm.dispatch) {
          cm.dispatch({
            effects: [settingsChanged.of()],
          });
        }
      }
    });
  }
}
