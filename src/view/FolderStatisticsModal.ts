import { Modal, TAbstractFile } from "obsidian";
import { ArcElement, Chart, PieController, Tooltip } from "chart.js";
import type BetterWordCount from "src/main";
import {
    getAllFileContentInFolder,
    getAllFilesInFolder,
} from "src/utils/FileUtils";
import { getWordCount } from "src/utils/StatUtils";

Chart.register(ArcElement, PieController, Tooltip);

export class FolderStatisticsModal extends Modal {
    private chart: Chart | null = null;

    file: TAbstractFile;
    plugin: BetterWordCount;

    constructor(plugin: BetterWordCount, file: TAbstractFile) {
        super(plugin.app);
        this.plugin = plugin;
        this.file = file;
    }

    async onOpen(): Promise<void> {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h1", { text: this.file.name });

        const totalEl = contentEl.createEl("p", { text: "Counting" });
        const chartContainer = contentEl.createEl("canvas", { cls: "pieChart" });

        try {
            const allFiles = getAllFilesInFolder(this.plugin, this.file.path);
            const content = await getAllFileContentInFolder(allFiles);
            const wordCounts = content.map((value) => getWordCount(value));
            const total = wordCounts.reduce((sum, value) => sum + value, 0);

            this.chart = new Chart(chartContainer, {
                type: "pie",
                data: {
                    labels: allFiles.map((file) => file.name),
                    datasets: [{
                        label: "Word Count",
                        data: wordCounts,
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                        borderColor: "rgba(255, 99, 132, 1)",
                        borderWidth: 1,
                    }],
                },
                options: {
                    rotation: -0.7 * Math.PI,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: "All Files and their Word Count",
                        },
                    },
                },
            });
            totalEl.setText(`Total: ${total} words`);
        } catch (error) {
            totalEl.setText(error instanceof Error ? error.message : String(error));
            totalEl.style.color = "var(--text-error)";
        }
    }

    onClose(): void {
        this.chart?.destroy();
        this.chart = null;
        const { contentEl } = this;
        contentEl.empty();
    }
}
