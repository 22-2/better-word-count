declare module "@codemirror/language" {
  interface SyntaxNode {
    name?: string;
    type: { name?: string };
    from: number;
    to: number;
  }

  interface SyntaxTree {
    resolve(pos: number, side?: number): SyntaxNode;
    iterate(spec: {
      enter(node: SyntaxNode): void;
      from?: number;
      to?: number;
    }): void;
  }

  // The repository uses a GitHub-hosted CodeMirror package whose generated
  // declaration files are not present until its package build runs.
  export function syntaxTree(state: unknown): SyntaxTree;
}
