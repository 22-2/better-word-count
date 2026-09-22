import { TFile, normalizePath } from "obsidian";
import type BetterWordCount from "src/main";
import {
  getCharacterCount,
  getCitationCount,
  getFootnoteCount,
  getSentenceCount,
  getWordCount,
} from "src/utils/StatUtils";

export default class BetterWordCountApi {
  constructor(private readonly plugin: BetterWordCount) {}

  public getWordCount(text: string): number {
    return getWordCount(text);
  }

  public getCharacterCount(text: string): number {
    return getCharacterCount(text);
  }

  public getFootnoteCount(text: string): number {
    return getFootnoteCount(text);
  }

  public getCitationCount(text: string): number {
    return getCitationCount(text);
  }

  public getSentenceCount(text: string): number {
    return getSentenceCount(text);
  }

  private async countPagePath(
    path: string,
    countFunc: (text: string) => number,
  ): Promise<number | null> {
    const normalizedPath = normalizePath(path);
    const file = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);

    if (file instanceof TFile) {
      const text = await this.plugin.app.vault.cachedRead(file);
      return countFunc(text);
    }

    return null;
  }

  public async getWordCountPagePath(path: string): Promise<number | null> {
    return this.countPagePath(path, getWordCount);
  }

  public getCharacterCountPagePath(path: string): Promise<number | null> {
    return this.countPagePath(path, getCharacterCount);
  }

  public getFootnoteCountPagePath(path: string): Promise<number | null> {
    return this.countPagePath(path, getFootnoteCount);
  }

  public getCitationCountPagePath(path: string): Promise<number | null> {
    return this.countPagePath(path, getCitationCount);
  }

  public getSentenceCountPagePath(path: string): Promise<number | null> {
    return this.countPagePath(path, getSentenceCount);
  }
}
