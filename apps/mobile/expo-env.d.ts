/// <reference types="expo/types" />

<<<<<<< HEAD
// NOTE: This file should not be edited and should be in your git ignore
=======
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
>>>>>>> gifted-blackburn
