interface SparkUserInfo {
  id: string;
  login?: string;
  avatarUrl?: string;
  email?: string;
  isOwner?: boolean;
}

interface SparkGlobal {
  user: () => Promise<SparkUserInfo>;
  llm: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>;
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string;
  kv: {
    keys: () => Promise<string[]>;
    get: <T>(key: string) => Promise<T | undefined>;
    set: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    spark?: SparkGlobal;
  }
}

export {};