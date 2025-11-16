import { Modal, TAbstractFile } from "obsidian";
import type BetterWordCount from "src/main";
import FolderStatistics from "./FolderStatistics.svelte";
import { mount, unmount } from "svelte";

// Modal to wrap the svelte component passing the required props
export class FolderStatisticsModal extends Modal {
	file: TAbstractFile;
	plugin: BetterWordCount;
	folderStatistics: ReturnType<typeof FolderStatistics> | undefined;

	constructor(plugin: BetterWordCount, file: TAbstractFile) {
		super(plugin.app);
		this.plugin = plugin;
		this.file = file;
	}

	async onOpen(): Promise<void> {
		this.folderStatistics = mount(FolderStatistics, {
			target: this.contentEl,
			props: {
				plugin: this.plugin,
				file: this.file,
			},
		});
	}

	onClose(): void {
		if (this.folderStatistics) {
			unmount(this.folderStatistics);
		}
	}
}
