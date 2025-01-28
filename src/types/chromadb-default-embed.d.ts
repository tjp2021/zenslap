declare module 'chromadb-default-embed' {
  export class DefaultEmbeddingFunction {
    constructor();
    generate(texts: string[]): Promise<number[][]>;
  }
} 