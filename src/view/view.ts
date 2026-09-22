import { ItemView, WorkspaceLeaf } from "obsidian";
import { STATS_ICON_NAME, VIEW_TYPE_STATS } from "src/constants";

export default class StatsView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_STATS;
  }

  getDisplayText(): string {
    return "Statistics";
  }

  getIcon(): string {
    return STATS_ICON_NAME;
  }

  async onOpen(): Promise<void> {
    // This view only contained a static placeholder, so native DOM is enough
    // and avoids shipping a reactive UI runtime for it.
    this.contentEl.empty();
    this.contentEl.createEl("h1", { text: "Coming Soon!" });
  }
}
