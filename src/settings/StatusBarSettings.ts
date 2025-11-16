import StatusBarSettings from "./StatusBarSettings.svelte";
import type BetterWordCount from "../main";
import { mount } from "svelte";

// TODO: Improve this implementation, possibly by unmounting
export function addStatusBarSettings(
	plugin: BetterWordCount,
	containerEl: HTMLElement,
) {
	const statusItemsEl = containerEl.createEl("div");

	mount(StatusBarSettings, {
		target: statusItemsEl,
		props: { plugin },
	});
}
