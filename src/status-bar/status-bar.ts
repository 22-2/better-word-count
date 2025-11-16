import StatusBarView from "@/status-bar/status-bar.svelte";
import { mount, unmount } from "svelte";
import { statusbarState } from "@/stores/statusbar.svelte";

export class StatusBar {
	private statusbarEl: HTMLElement;
	private statusbarView: ReturnType<typeof StatusBarView>;

	constructor(statusbarEl: HTMLElement) {
		this.statusbarEl = statusbarEl;
	}

	load() {
		console.debug("StatusBar: Loading status bar...");
		this.statusbarView = mount(StatusBarView, {
			target: this.statusbarEl,
			props: {},
		});
	}

	unload() {
		if (this.statusbarView) {
			unmount(this.statusbarView);
		}
	}

	// TODO: Any possible methods needed for the status bar

	update({ words, characters }: { words: number; characters: number }) {
		statusbarState.words = words;
		statusbarState.characters = characters;
	}
}
