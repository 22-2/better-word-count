import type BetterWordCount from "../main";
import { getCharacterCount, getWordCount } from "src/utils/StatUtils";
import { debounce } from "obsidian";

/**
 * Displays the fixed status bar counters. Custom status-bar configuration and
 * vault statistics were removed because they are not used by this plugin.
 */
export default class StatusBar {
  private statusBarEl: HTMLElement;
  private plugin: BetterWordCount;
  public debounceStatusBarUpdate;

  constructor(statusBarEl: HTMLElement, plugin: BetterWordCount) {
    this.statusBarEl = statusBarEl;
    this.plugin = plugin;
    this.debounceStatusBarUpdate = debounce(
      (text: string) => this.updateStatusBar(text),
      20,
      false,
    );

    this.statusBarEl.classList.add("mod-clickable");
    this.statusBarEl.setAttribute("aria-label", "Word and character count");
    this.statusBarEl.setAttribute("aria-label-position", "top");
  }

  displayText(text: string): void {
    this.statusBarEl.setText(text);
  }

  updateStatusBar(text: string): void {
    // Comments remain part of the count because the removed setting defaulted
    // to counting them, so the fixed display preserves the previous default.
    this.displayText(`${getWordCount(text)} words ${getCharacterCount(text)} characters`);
  }

  updateAltBar(): void {
    this.displayText(`${this.plugin.app.vault.getMarkdownFiles().length} files`);
  }
}
