import { MarkdownView, Plugin, WorkspaceLeaf, type FileManager } from "obsidian";
import BetterWordCountSettingsTab from "./settings/SettingsTab";
import StatusBar from "./status/StatusBar";
import CursorPositionStatusBar from "./status/CursorPositionStatusBar";
import type { EditorView } from "@codemirror/view";
import {
  settingsChanged,
  pluginField,
  sectionWordCountEditorPlugin,
  statusBarEditorPlugin,
} from "./editor/EditorPlugin";
import {
  BetterWordCountSettings,
  DEFAULT_SETTINGS,
} from "src/settings/Settings";
import BetterWordCountApi from "src/api/api";
import { handleFileMenu } from "./utils/FileMenu";

export default class BetterWordCount extends Plugin {
  declare public settings: BetterWordCountSettings;
  public statusBar: StatusBar;
  public cursorPositionStatusBar: CursorPositionStatusBar;
  public api: BetterWordCountApi = new BetterWordCountApi(this);

  async onunload(): Promise<void> {
    this.statusBar = null;
    this.cursorPositionStatusBar = null;
  }

  async onload() {
    // Load only active settings so obsolete status-bar, statistics, and page
    // count keys are discarded the next time the remaining settings are saved.
    const savedSettings = (await this.loadData()) as Partial<BetterWordCountSettings> | null;
    this.settings = {
      showCursorPosition:
        savedSettings?.showCursorPosition ?? DEFAULT_SETTINGS.showCursorPosition,
      sectionCountDisplayMode:
        savedSettings?.sectionCountDisplayMode ?? DEFAULT_SETTINGS.sectionCountDisplayMode,
    };
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

    // Handle Status Bar
    let statusBarEl = this.addStatusBarItem();
    this.statusBar = new StatusBar(statusBarEl, this);
    // Keep cursor statistics in a separate item from the fixed document counts.
    this.cursorPositionStatusBar = new CursorPositionStatusBar(this);
    this.cursorPositionStatusBar.setup();

    // Handle the Editor Plugins
    this.registerEditorExtension([pluginField.init(() => this), statusBarEditorPlugin, sectionWordCountEditorPlugin]);

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
        if (leaf.view.getViewType() !== "markdown") {
          this.statusBar.updateAltBar();
        }

      }),
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
    this.cursorPositionStatusBar?.updateVisibility();
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
