import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import type { Editor, EditorPosition, EditorSelection } from "obsidian";
import type BetterWordCount from "../main";

type EditorLike = Pick<
  Editor,
  "getCursor" | "getRange" | "getValue" | "listSelections"
>;

function comparePositions(a: EditorPosition, b: EditorPosition): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.ch - b.ch;
}

function getSelectionBounds(selection: EditorSelection): {
  from: EditorPosition;
  to: EditorPosition;
} {
  return comparePositions(selection.anchor, selection.head) <= 0
    ? { from: selection.anchor, to: selection.head }
    : { from: selection.head, to: selection.anchor };
}

/**
 * エディターの選択範囲を集計する。
 * 空の範囲はマルチカーソル数には含めるが、選択行・文字数には含めない。
 */
export function getSelectionStats(editor: EditorLike): {
  selections: number;
  lines: number;
  characters: number;
} {
  const selections = editor.listSelections();
  let lines = 0;
  let characters = 0;

  for (const selection of selections) {
    const { from, to } = getSelectionBounds(selection);
    if (comparePositions(from, to) === 0) continue;

    lines += to.line - from.line + 1;
    characters += editor.getRange(from, to).length;
  }

  return { selections: selections.length, lines, characters };
}

/**
 * カーソルのheadを1始まりの行・文字位置へ変換し、選択情報を付加する。
 * headを使うことで、逆方向の選択でもユーザーが操作している先頭位置を表示する。
 */
export function formatCursorPosition(editor: EditorLike): string {
  const cursor = editor.getCursor("head");
  const position = `Ln ${cursor.line + 1}, Ch ${cursor.ch + 1}`;
  const stats = getSelectionStats(editor);
  const hasSelectedText = stats.lines > 0 || stats.characters > 0;

  if (!hasSelectedText) {
    // Show the whole note's raw character count only when it is not redundant
    // with the selection count already shown below.
    const characterCount = editor.getValue().length;
    const characterSummary = `${characterCount} characters`;

    if (stats.selections === 1) return `${position} ${characterSummary}`;

    const details = [`${stats.selections} selections`, "0 lines", "0 characters"];
    return `${position} ${characterSummary} (${details.join(", ")})`;
  }

  const details: string[] = [];
  if (stats.selections > 1) {
    details.push(`${stats.selections} selections`);
  }
  details.push(`${stats.lines} lines`, `${stats.characters} characters`);

  // 位置と括弧の間には、ステータスバー上で読みやすくするため空白を入れる。
  return `${position} (${details.join(", ")})`;
}

/** 現在のエディターのカーソル位置と選択情報を表示するステータスバー項目。 */
export default class CursorPositionStatusBar {
  private statusBarItem: HTMLElement | null = null;
  private isSetup = false;

  private readonly editorUpdateExtension = ViewPlugin.define(() => ({
    update: (update: ViewUpdate) => {
      if (update.selectionSet || update.docChanged) {
        this.updateText();
      }
    },
  }));

  constructor(private readonly plugin: BetterWordCount) {}

  setup(): void {
    if (this.isSetup) {
      this.updateVisibility();
      return;
    }

    this.isSetup = true;
    this.plugin.registerEditorExtension(this.editorUpdateExtension);
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        this.updateText();
      }),
    );
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("file-open", () => {
        this.updateText();
      }),
    );

    this.updateVisibility();
  }

  updateVisibility(): void {
    if (!this.isSetup) return;

    if (this.plugin.settings.showCursorPosition && !this.statusBarItem) {
      this.statusBarItem = this.plugin.addStatusBarItem();
      this.statusBarItem.addClass("bwc-cursor-position");
      this.statusBarItem.setAttribute("aria-label", "Cursor position");
      this.statusBarItem.setAttribute("title", "Cursor position");
    } else if (!this.plugin.settings.showCursorPosition && this.statusBarItem) {
      this.statusBarItem.remove();
      this.statusBarItem = null;
    }

    this.updateText();
  }

  private updateText(): void {
    if (!this.statusBarItem) return;

    const editor = this.plugin.app.workspace.activeEditor?.editor;
    this.statusBarItem.setText(editor ? formatCursorPosition(editor) : "");
  }
}
