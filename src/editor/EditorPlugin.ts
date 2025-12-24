import { EditorState, Line, RangeSetBuilder, StateEffect, StateField, Transaction } from "@codemirror/state";
import {
  ViewUpdate,
  PluginValue,
  EditorView,
  ViewPlugin,
  DecorationSet,
  Decoration,
  WidgetType,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type BetterWordCount from "src/main";
import { getWordCount, getCharacterCount } from "src/utils/StatUtils";
import { MATCH_COMMENT, MATCH_HTML_COMMENT } from "src/constants";
import { SectionCountDisplayMode } from "src/settings/Settings";

export const pluginField = StateField.define<BetterWordCount>({
  create() {
    return null;
  },
  update(state) {
    return state;
  },
});

class StatusBarEditorPlugin implements PluginValue {
  view: EditorView;

  constructor(view: EditorView) {
    this.view = view;
  }

  update(update: ViewUpdate): void {
    const tr = update.transactions[0];

    if (!tr) {
      return;
    }

    const plugin = update.view.state.field(pluginField);

    // When selecting text with Shift+Home the userEventType is undefined.
    // This is probably a bug in codemirror, for the time being doing an explict check
    // for the type allows us to update the stats for the selection.
    const userEventTypeUndefined = tr.annotation(Transaction.userEvent) === undefined;

    if (
      (tr.isUserEvent("select") || userEventTypeUndefined) &&
      tr.newSelection.ranges[0].from !== tr.newSelection.ranges[0].to
    ) {
      let text = "";
      const selection = tr.newSelection.main;
      const textIter = tr.newDoc.iterRange(selection.from, selection.to);
      while (!textIter.done) {
        text = text + textIter.next().value;
      }
      plugin.statusBar.debounceStatusBarUpdate(text);
    } else if (
      tr.isUserEvent("input") ||
      tr.isUserEvent("delete") ||
      tr.isUserEvent("move") ||
      tr.isUserEvent("undo") ||
      tr.isUserEvent("redo") ||
      tr.isUserEvent("select")
    ) {
      const textIter = tr.newDoc.iter();
      let text = "";
      while (!textIter.done) {
        text = text + textIter.next().value;
      }
      if (tr.docChanged && plugin.statsManager) {
        plugin.statsManager.debounceChange(text);
      }
      plugin.statusBar.debounceStatusBarUpdate(text);
    }
  }

  destroy() {}
}

export const statusBarEditorPlugin = ViewPlugin.fromClass(StatusBarEditorPlugin);

interface SectionCountData {
  line: number;
  level: number;
  self: number;
  total: number;
  selfChars: number;
  totalChars: number;
  pos: number;
}

class SectionWidget extends WidgetType {
  data: SectionCountData;
  displayMode: SectionCountDisplayMode;

  constructor(data: SectionCountData, displayMode: SectionCountDisplayMode) {
    super();
    this.data = data;
    this.displayMode = displayMode;
  }

  eq(widget: this): boolean {
    const { pos, self, total, selfChars, totalChars } = this.data;
    return pos === widget.data.pos && 
           self === widget.data.self && 
           total === widget.data.total && 
           selfChars === widget.data.selfChars && 
           totalChars === widget.data.totalChars &&
           this.displayMode === widget.displayMode;
  }

  getDisplayText() {
    const { self, total, selfChars, totalChars } = this.data;
    
    if (this.displayMode === SectionCountDisplayMode.words) {
      // Display word counts
      const count = (self && self !== total) ? `${self} / ${total}` : total.toString();
      return `${count} words`;
    } else if (this.displayMode === SectionCountDisplayMode.characters) {
      // Display character counts
      const count = (selfChars && selfChars !== totalChars) ? 
        `${selfChars} / ${totalChars}` : 
        `${totalChars}`;
      return `${count} chars`;
    }
    
    // This shouldn't happen, but return empty string as fallback
    return '';
  }

  toDOM() {
    return createSpan({ cls: "bwc-section-count", text: this.getDisplayText() });
  }
}

class SectionWordCountEditorPlugin implements PluginValue {
  decorations: DecorationSet;
  lineCounts: { words: number; chars: number }[] = [];

  constructor(view: EditorView) {
    const plugin = view.state.field(pluginField);
    if (plugin.settings.sectionCountDisplayMode === SectionCountDisplayMode.disable) {
      this.decorations = Decoration.none;
      return;
    }

    this.calculateLineCounts(view.state, plugin);
    this.decorations = this.mkDeco(view);
  }

  calculateLineCounts(state: EditorState, plugin: BetterWordCount) {
    const stripComments = plugin.settings.countComments;
    let docStr = state.doc.toString();

    if (stripComments) {
      // Strip out comments, but preserve new lines for accurate positioning data
      const preserveNl = (match: string, offset: number, str: string) => {
        let output = '';
        for (let i = offset, len = offset + match.length; i < len; i++) {
          if (/[\r\n]/.test(str[i])) {
            output += str[i];
          }
        }
        return output;
      }
  
      docStr = docStr.replace(MATCH_COMMENT, preserveNl).replace(MATCH_HTML_COMMENT, preserveNl);
    }

    const lines = docStr.split(state.facet(EditorState.lineSeparator) || /\r\n?|\n/)

    for (let i = 0, len = lines.length; i < len; i++) {
      let line = lines[i];
      this.lineCounts.push({
        words: getWordCount(line),
        chars: getCharacterCount(line)
      });
    }
  }

  update(update: ViewUpdate) {
    const plugin = update.view.state.field(pluginField);
    const { sectionCountDisplayMode, countComments: stripComments } = plugin.settings;
    let didSettingsChange = false;

    const isDisabled = sectionCountDisplayMode === SectionCountDisplayMode.disable;
    if (this.lineCounts.length && isDisabled) {
      this.lineCounts = [];
      this.decorations = Decoration.none;
      return;
    } else if (!this.lineCounts.length && !isDisabled) {
      didSettingsChange = true;
      this.calculateLineCounts(update.startState, plugin);
    }

    if (update.docChanged) {
      const startDoc = update.startState.doc;

      let tempDoc = startDoc;
      let editStartLine = Infinity;
      let editEndLine = -Infinity;

      update.changes.iterChanges((fromA, toA, fromB, toB, text) => {
        const from = fromB;
        const to = fromB + (toA - fromA);
        const nextTo = from + text.length;
        
        const fromLine = tempDoc.lineAt(from);
        const toLine = tempDoc.lineAt(to);

        tempDoc = tempDoc.replace(fromB, fromB + (toA - fromA), text);

        const nextFromLine = tempDoc.lineAt(from);
        const nextToLine = tempDoc.lineAt(nextTo);
        const lines: { words: number; chars: number }[] = [];

        for (let i = nextFromLine.number; i <= nextToLine.number; i++) {
          const lineText = tempDoc.line(i).text;
          lines.push({
            words: getWordCount(lineText),
            chars: getCharacterCount(lineText)
          });
        }

        const spliceStart = fromLine.number - 1;
        const spliceLen = toLine.number - fromLine.number + 1;

        editStartLine = Math.min(editStartLine, spliceStart);
        editEndLine = Math.max(editEndLine, spliceStart + (nextToLine.number - nextFromLine.number + 1));

        this.lineCounts.splice(spliceStart, spliceLen, ...lines);
      });

      // Filter out any counts associated with comments in the lines that were edited
      if (stripComments) {
        const tree = syntaxTree(update.state);
        for (let i = editStartLine; i < editEndLine; i++) {
          const line = update.state.doc.line(i + 1);
          let newLine = '';
          let pos = 0;
          let foundComment = false;
  
          tree.iterate({
            enter(node) { 
              if (node.name && /comment/.test(node.name)) {
                foundComment = true;
                newLine += line.text.substring(pos, node.from - line.from);
                pos = node.to - line.from;
              }
            },
            from: line.from,
            to: line.to,
          });
  
          if (foundComment) {
            newLine += line.text.substring(pos);
            this.lineCounts[i] = {
              words: getWordCount(newLine),
              chars: getCharacterCount(newLine)
            };
          }
        }
      }
    }

    if (update.docChanged || update.viewportChanged || didSettingsChange) {
      this.decorations = this.mkDeco(update.view);
    }
  }

  mkDeco(view: EditorView) {
    const plugin = view.state.field(pluginField);
    const b = new RangeSetBuilder<Decoration>();
    if (plugin.settings.sectionCountDisplayMode === SectionCountDisplayMode.disable) return b.finish();

    const tree = syntaxTree(view.state);
    const getHeaderLevel = (line: Line) => {
      const token = tree.resolve(line.from, 1);
      if (/code-?block|math/.test(token?.type?.name)) return null;
      
      const match = line.text.match(/^(#+)[ \t]/);
      return match ? match[1].length : null;
    };

    if (!view.visibleRanges.length) return b.finish();

    // Start processing from the beginning of the first visible range
    const { from } = view.visibleRanges[0];
    const doc = view.state.doc;
    const lineStart = doc.lineAt(from);
    const lineCount = doc.lines;
    const sectionCounts: SectionCountData[] = [];
    const nested: SectionCountData[] = [];

    const shouldRenderTopLevelListChars =
      plugin.settings.sectionCountDisplayMode === SectionCountDisplayMode.characters &&
      plugin.settings.displayTopLevelListCharacterCounts;

    type TopLevelListAccumulator = {
      line: number;
      pos: number;
      totalChars: number;
      hasChild: boolean;
    };

    let topLevelList: TopLevelListAccumulator = null;

    const getListIndent = (ws: string): number => {
      // Treat tab as 4 spaces (good-enough heuristic for indentation)
      return ws.replace(/\t/g, "    ").length;
    };

    const isListItem = (line: Line): { indent: number } | null => {
      const token = tree.resolve(line.from, 1);
      if (/code-?block|math/.test(token?.type?.name)) return null;

      const match = line.text.match(/^(\s*)(?:[-+*]|\d+[.)])\s+/);
      if (!match) return null;
      return { indent: getListIndent(match[1] || "") };
    };

    for (let i = lineStart.number; i <= lineCount; i++) {
      let line: Line;
      if (i === lineStart.number) line = lineStart;
      else line = doc.line(i);

      // --- Top-level list parent character counts (optional) ---
      if (shouldRenderTopLevelListChars) {
        const listInfo = isListItem(line);
        const lineChars = this.lineCounts[i - 1]?.chars ?? getCharacterCount(line.text);
        const isIndented = /^\s+/.test(line.text);

        if (listInfo) {
          if (listInfo.indent === 0) {
            // Starting a new top-level list item: finalize previous one (if it had children)
            if (topLevelList && topLevelList.hasChild) {
              sectionCounts.push({
                line: topLevelList.line,
                level: 0,
                self: 0,
                total: 0,
                selfChars: 0,
                totalChars: topLevelList.totalChars,
                pos: topLevelList.pos,
              });
            }
            topLevelList = {
              line: i,
              pos: line.to,
              totalChars: lineChars,
              hasChild: false,
            };
          } else if (topLevelList) {
            // Nested list item: counts toward the current top-level item
            topLevelList.hasChild = true;
            topLevelList.totalChars += lineChars;
          }
        } else if (topLevelList) {
          // Non-list line: treat indented lines as part of the list item; unindented lines end the list block
          if (line.text.trim() === "") {
            // ignore blank lines
          } else if (isIndented) {
            topLevelList.totalChars += lineChars;
          } else {
            if (topLevelList.hasChild) {
              sectionCounts.push({
                line: topLevelList.line,
                level: 0,
                self: 0,
                total: 0,
                selfChars: 0,
                totalChars: topLevelList.totalChars,
                pos: topLevelList.pos,
              });
            }
            topLevelList = null;
          }
        }
      }

      const level = getHeaderLevel(line);
      const prevHeading = nested.last();
      if (level) {
        if (!prevHeading || level > prevHeading.level) {
          // The first heading or moving to a higher level eg. ## -> ###
          nested.push({
            line: i,
            level,
            self: 0,
            total: 0,
            selfChars: 0,
            totalChars: 0,
            pos: line.to,
          });
        } else if (prevHeading.level === level) {
          // Same level as the previous heading
          const nestedHeading = nested.pop();
          sectionCounts.push(nestedHeading);
          nested.push({
            line: i,
            level,
            self: 0,
            total: 0,
            selfChars: 0,
            totalChars: 0,
            pos: line.to,
          });
        } else if (prevHeading.level > level) {
          // Traversing to lower level heading (eg. ### -> ##)
          for (let j = nested.length - 1; j >= 0; j--) {
            const nestedHeading = nested[j];

            if (level < nestedHeading.level) {
              // Continue traversing to lower level heading
              const nestedHeading = nested.pop();
              sectionCounts.push(nestedHeading);
              if (j === 0) {
                nested.push({
                  line: i,
                  level,
                  self: 0,
                  total: 0,
                  selfChars: 0,
                  totalChars: 0,
                  pos: line.to,
                });
              }
              continue;
            }

            if (level === nestedHeading.level) {
              // Stop because we found an equal level heading
              const nestedHeading = nested.pop();
              sectionCounts.push(nestedHeading);
              nested.push({
                line: i,
                level,
                self: 0,
                total: 0,
                selfChars: 0,
                totalChars: 0,
                pos: line.to,
              });
              break;
            }

            if (level > nestedHeading.level) {
              // Stop because we found an higher level heading
              nested.push({
                line: i,
                level,
                self: 0,
                total: 0,
                selfChars: 0,
                totalChars: 0,
                pos: line.to,
              });
              break;
            }
          }
        }
      } else if (nested.length) {
        // Not in a heading, so add the word count of the line to the headings containing this line
        const count = this.lineCounts[i - 1];
        for (const heading of nested) {
          if (heading === prevHeading) {
            heading.self += count.words;
            heading.selfChars += count.chars;
          }
          heading.total += count.words;
          heading.totalChars += count.chars;
        }
      }
    }

    // If we ended while still in a top-level list item, finalize it.
    if (shouldRenderTopLevelListChars && topLevelList && topLevelList.hasChild) {
      sectionCounts.push({
        line: topLevelList.line,
        level: 0,
        self: 0,
        total: 0,
        selfChars: 0,
        totalChars: topLevelList.totalChars,
        pos: topLevelList.pos,
      });
      topLevelList = null;
    }

    if (nested.length) sectionCounts.push(...nested);

    sectionCounts.sort((a, b) => a.line - b.line);

    const displayMode = plugin.settings.sectionCountDisplayMode;
    for (const data of sectionCounts) {
      b.add(
        data.pos,
        data.pos,
        Decoration.widget({
          side: 1,
          widget: new SectionWidget(data, displayMode),
        })
      );
    }

    return b.finish();
  }
}

export const settingsChanged = StateEffect.define<void>();
export const sectionWordCountEditorPlugin = ViewPlugin.fromClass(SectionWordCountEditorPlugin, {
  decorations: (v) => v.decorations,
});
