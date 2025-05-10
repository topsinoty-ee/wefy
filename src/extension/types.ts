import { HttpMethod, WefyRequestConfig } from "@/types";
import { Draft, Immutable } from "immer";

export type SharedStateValue = string | number | boolean | object | null;
export type StateModifier<ExtensionState> = (
  state: Draft<ExtensionState>
) => void;

export interface ExtensionError extends Error {
  extensionName?: string;
  code?: string;
}

export interface WefyExtensionHooks<
  ExtensionState extends Record<string, unknown> = Record<string, unknown>
> {
  init?: (
    config: Draft<Record<string, unknown>>,
    context: WefyExtensionContext<ExtensionState>
  ) => Promise<void> | void;

  beforeRequest?: (
    request: {
      method: HttpMethod;
      endpoint: string;
      config: WefyRequestConfig<undefined>;
    },
    context: WefyExtensionContext<ExtensionState>
  ) => Promise<void> | void;

  onRequest?: (
    request: {
      url: string;
      method: HttpMethod;
      headers: Record<string, string>;
      body: unknown;
    },
    context: WefyExtensionContext<ExtensionState>
  ) => Promise<void> | void;

  beforeResponse?: (
    response: {
      response: Response;
      duration: number;
    },
    context: WefyExtensionContext<ExtensionState>
  ) => Promise<void> | void;

  onResponse?: (
    response: {
      response: Response;
      data: unknown;
    },
    context: WefyExtensionContext<ExtensionState>
  ) => Promise<void> | void;

  afterSuccess?: (
    response: {
      data: unknown;
      response: Response;
      duration: number;
    },
    context: WefyExtensionContext<ExtensionState>
  ) => Promise<void> | void;

  onError?: (
    error: Error,
    context: WefyExtensionContext<ExtensionState>,
    meta?: {
      method?: HttpMethod;
      endpoint?: string;
      config?: WefyRequestConfig<undefined>;
    }
  ) => Promise<void> | void;

  afterRequest?: (
    meta: {
      method: HttpMethod;
      endpoint: string;
      config?: WefyRequestConfig<undefined>;
      duration: number;
      success: boolean;
    },
    context: WefyExtensionContext<ExtensionState>
  ) => Promise<void> | void;

  onStateChange?: (
    mutation: {
      previousState: Immutable<ExtensionState>;
      newState: Immutable<ExtensionState>;
    },
    context: WefyExtensionContext<ExtensionState>
  ) => Promise<void> | void;
}

export interface WefyExtension<
  ExtensionState extends Record<string, unknown> = Record<string, unknown>
> {
  name: string;
  critical?: boolean;
  priority?: number;
  initialState?: ExtensionState;
  hooks: Partial<WefyExtensionHooks<ExtensionState>>;
}

export interface WefyExtensionContext<
  ExtensionState extends Record<string, unknown> = Record<string, unknown>
> {
  readonly extensionState: Immutable<ExtensionState>;
  readonly sharedState: ReadonlyMap<string, SharedStateValue>;
  setState: (modifier: StateModifier<ExtensionState>) => void;
  getSharedState: (key: string) => SharedStateValue | undefined;
  setSharedState: (key: string, value: SharedStateValue) => void;
}
