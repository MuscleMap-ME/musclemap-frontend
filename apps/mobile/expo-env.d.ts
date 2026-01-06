/// <reference types="expo/types" />

declare module '*.otf' {
  const content: number;
  export default content;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL?: string;
    }
  }
}
