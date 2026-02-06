declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_API_BASE?: string;
    // add other env vars here if needed
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};

export {};
