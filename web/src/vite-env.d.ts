/// <reference types="vite/client" />

declare module "@adobe/alloy" {
  export type AlloyCommand = (
    command: string,
    options?: Record<string, unknown>
  ) => Promise<unknown>;

  export function createInstance(options?: {
    name?: string;
  }): AlloyCommand;
}
