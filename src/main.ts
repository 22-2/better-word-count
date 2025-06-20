// import { MarkdownView, Plugin, WorkspaceLeaf } from "obsidian";
import {
	debounce,
	Editor,
	MarkdownView,
	Plugin,
	TextFileView,
	TFile,
	type MarkdownFileInfo,
} from "obsidian";
// import BetterWordCountSettingsTab from "./settings/SettingsTab";
// import StatsManager from "./stats/StatsManager";
import { StatusBar } from "@/status-bar/status-bar";
import { stripFrontMatter } from "@/utils/strip";
import { WORD_COUNT_WORKER_SRC } from "./workers/counter";
// import type { EditorView } from "@codemirror/view";
// import {
// 	settingsChanged,
// 	pluginField,
// 	sectionWordCountEditorPlugin,
// 	statusBarEditorPlugin,
// } from "./editor/EditorPlugin";
// import {
// 	type BetterWordCountSettings,
// 	// DEFAULT_SETTINGS,
// } from "src/settings/Settings";
// import { settingsStore } from "./utils/SvelteStores";
// import BetterWordCountApi from "src/api/api";
// import { handleFileMenu } from "./utils/FileMenu";

export default class BetterWordCount extends Plugin {
	private worker: Worker | null = null;
	private statusBar: StatusBar;

	private wordCount: number = 0;
	private characterCount: number = 0;

	private requestWordCount = debounce(this.countWords.bind(this), 200);

	async onunload(): Promise<void> {
		this.worker?.terminate();
		this.worker = null;
		this.statusBar.unload();
	}

	async onload() {
		// Register Events
		this.registerEvent(
			this.app.workspace.on("file-open", this.onFileOpen, this),
		);
		this.registerEvent(
			this.app.workspace.on("quick-preview", this.onQuickPreview, this),
		);
		this.registerEvent(
			this.app.workspace.on(
				"editor-selection-change",
				this.onSelection,
				this,
			),
		);

		// Register web worker
		this.worker = new Worker(
			URL.createObjectURL(
				new Blob([WORD_COUNT_WORKER_SRC], {
					type: "text/javascript",
				}),
			),
		);
		this.worker.onmessage = this.onWorkerMessage.bind(this);

		// Add status bar
		const statusBarEl = this.addStatusBarItem();
		this.statusBar = new StatusBar(statusBarEl);
		this.statusBar.load();
	}

	// async saveSettings(): Promise<void> {
	// 	await this.saveData(this.settings);
	// }

	// onDisplaySectionCountsChange() {
	// 	this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
	// 		if (leaf?.view instanceof MarkdownView) {
	// 			const cm = (leaf.view.editor as any).cm as EditorView;
	// 			if (cm.dispatch) {
	// 				cm.dispatch({
	// 					effects: [settingsChanged.of()],
	// 				});
	// 			}
	// 		}
	// 	});
	// }
	//
	async onFileOpen() {
		let text = "";
		let shouldShowStats = false;

		const view = this.app.workspace.getActiveFileView();

		if (
			view &&
			view.file &&
			(view.file.extension === "md" ||
				(view instanceof TextFileView && view.isPlaintext))
		) {
			const isMarkdown = view.file.extension === "md";
			const raw = await this.app.vault.cachedRead(view.file);

			text = isMarkdown ? stripFrontMatter(raw) : raw;
			shouldShowStats = true;
		}

		// TODO: statusBar things
		// this.statusBarEl.toggle(shouldShowStats);

		this.updateCount(text);
	}

	onSelection(editor: Editor, _info: MarkdownView | MarkdownFileInfo) {
		const selection = editor.getSelection();
		if (selection) this.updateCount(selection);
		else this.onFileOpen();
	}

	onQuickPreview(file: TFile, previewText: string) {
		if (this.app.workspace.getActiveFile() === file) {
			this.updateCount(stripFrontMatter(previewText));
		}
	}

	/** Throttled entry-point */
	private countWords(text: string) {
		if (!text) {
			this.wordCount = 0;
			this.updateStatusBar();
			return;
		}

		this.worker?.postMessage(text);
	}

	/** web-worker → main thread */
	private onWorkerMessage(event: MessageEvent<number>) {
		this.wordCount = event.data;
		this.updateStatusBar();
	}

	/** Called for every change that should refresh stats */
	private updateCount(text: string) {
		this.characterCount = text.length;
		this.requestWordCount(text);
	}

	private updateStatusBar() {
		this.statusBar.update({
			words: this.wordCount,
			characters: this.characterCount,
		});
	}
}
