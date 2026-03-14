declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    // add other env vars here if needed
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};

export {};
