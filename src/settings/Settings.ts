export enum SectionCountDisplayMode {
  disable = "disable",
  words = "words",
  characters = "characters",
}

export interface BetterWordCountSettings {
  showCursorPosition: boolean;
  sectionCountDisplayMode: SectionCountDisplayMode;
}

export const DEFAULT_SETTINGS: BetterWordCountSettings = {
  showCursorPosition: true,
  sectionCountDisplayMode: SectionCountDisplayMode.disable,
};
