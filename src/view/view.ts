import { ItemView, WorkspaceLeaf } from "obsidian";
import { STATS_ICON_NAME, VIEW_TYPE_STATS } from "src/constants";
import type BetterWordCount from "src/main";
import Statistics from "./Statistics.svelte";
import { mount, unmount } from "svelte";

export default class StatsView extends ItemView {
	private plugin: BetterWordCount;
	private statistics: ReturnType<typeof Statistics> | undefined;

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
		this.statistics = mount(Statistics, {
			target: this.contentEl,
		});
	}

	async onClose(): Promise<void> {
		if (this.statistics) {
			unmount(this.statistics);
		}
	}
}
