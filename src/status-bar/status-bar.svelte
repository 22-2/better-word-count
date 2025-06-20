<script lang="ts">
	import { statusbarState } from "src/stores/statusbar.svelte";
</script>

<span class="status-bar-item-segment">{statusbarState.words} words</span>
<span class="status-bar-item-segment">
	{statusbarState.characters} characters
</span>
