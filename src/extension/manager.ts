// import { Immutable, produce } from "immer";
// import {
//   SharedStateValue,
//   StateModifier,
//   WefyExtension,
//   WefyExtensionContext,
//   WefyExtensionHooks,
// } from "@/types";
// import { createExtensionError } from "./utils";
//
// /**
//  * Extension Manager to handle the lifecycle and execution of extensions
//  */
// export class WefyExtensionManager {
//   private readonly extensions: Map<string, WefyExtension>;
//   private readonly contexts: Map<string, WefyExtensionContext<any>>;
//   private readonly sharedState: Map<string, SharedStateValue>;
//   private initialized: boolean = false;
//
//   /**
//    * Creates a new extension manager
//    * @param extensions Array of extensions to register
//    */
//   constructor(extensions: ReadonlyArray<WefyExtension> = []) {
//     this.extensions = new Map();
//     this.contexts = new Map();
//     this.sharedState = new Map();
//
//     if (extensions.length > 0) {
//       this.registerExtensions(extensions);
//     }
//   }
//
//   /**
//    * Validates and registers extensions
//    * @param extensions Array of extensions to register
//    */
//   private registerExtensions(extensions: ReadonlyArray<WefyExtension>): void {
//     // Validate for duplicate names
//     const names = new Set<string>();
//     for (const ext of extensions) {
//       if (!ext.name || typeof ext.name !== "string" || ext.name.trim() === "") {
//         throw createExtensionError("Extension must have a non-empty name");
//       }
//
//       if (names.has(ext.name)) {
//         throw createExtensionError(
//           `Duplicate extension name: ${ext.name}`,
//           ext.name
//         );
//       }
//       names.add(ext.name);
//     }
//
//     // Register all extensions
//     for (const ext of extensions) {
//       try {
//         this.extensions.set(ext.name, ext);
//
//         // Create context for the extension
//         const initialState = ext.initialState || {};
//         const context = this.createExtensionContext(ext.name, initialState);
//         this.contexts.set(ext.name, context);
//       } catch (error) {
//         throw createExtensionError(
//           `Failed to register extension '${ext.name}': ${
//             error instanceof Error ? error.message : String(error)
//           }`,
//           ext.name
//         );
//       }
//     }
//   }
//
//   /**
//    * Creates a context for an extension
//    * @param extensionName Name of the extension
//    * @param initialState Initial state for the extension
//    * @returns Extension context
//    */
//   private createExtensionContext<
//     ExtensionState extends Record<string, unknown>
//   >(
//     extensionName: string,
//     initialState: ExtensionState
//   ): WefyExtensionContext<ExtensionState> {
//     let state: ExtensionState = Object.freeze(produce(initialState, () => {}));
//
//     // Create a setState function for this context
//     const setState = (modifier: StateModifier<ExtensionState>): void => {
//       if (typeof modifier !== "function") {
//         throw createExtensionError(
//           "State modifier must be a function",
//           extensionName
//         );
//       }
//
//       try {
//         const previousState = state;
//         state = produce(state, modifier);
//
//         // Trigger onStateChange hook if it exists
//         const extension = this.extensions.get(extensionName);
//         if (extension?.hooks?.onStateChange) {
//           const context = this.contexts.get(extensionName);
//           if (context) {
//             extension.hooks.onStateChange(
//               { previousState, newState: state },
//               context
//             );
//           }
//         }
//       } catch (error) {
//         throw createExtensionError(
//           `Failed to update state: ${
//             error instanceof Error ? error.message : String(error)
//           }`,
//           extensionName
//         );
//       }
//     };
//
//     return {
//       get extensionState(): Immutable<ExtensionState> {
//         return state as Immutable<ExtensionState>;
//       },
//       get sharedState(): ReadonlyMap<string, SharedStateValue> {
//         return new Map(this.sharedState) as ReadonlyMap<
//           string,
//           SharedStateValue
//         >;
//       },
//       setState,
//       getSharedState: (key: string): SharedStateValue | undefined => {
//         return this.sharedState.get(key);
//       },
//       setSharedState: (key: string, value: SharedStateValue): void => {
//         this.sharedState.set(key, value);
//       },
//     };
//   }
//
//   /**
//    * Initialize all registered extensions
//    * @param config Configuration to pass to extensions
//    */
//   async initialize(config: Record<string, unknown> = {}): Promise<void> {
//     if (this.initialized) {
//       throw createExtensionError(
//         "ExtensionManager has already been initialized"
//       );
//     }
//
//     try {
//       const immutableConfig = produce(config, () => {});
//
//       // Call init hook on all extensions in priority order
//       await this.executeHook("init", immutableConfig);
//       this.initialized = true;
//     } catch (error) {
//       throw createExtensionError(
//         `Failed to initialize extensions: ${
//           error instanceof Error ? error.message : String(error)
//         }`
//       );
//     }
//   }
//
//   /**
//    * Check if the extension manager has been initialized
//    */
//   isInitialized(): boolean {
//     return this.initialized;
//   }
//
//   /**
//    * Get an extension context by name
//    * @param name Name of the extension
//    * @returns Extension context or undefined if not found
//    */
//   getExtensionContext<
//     ExtensionState extends Record<string, unknown> = Record<string, unknown>
//   >(name: string): WefyExtensionContext<ExtensionState> | undefined {
//     if (!name || typeof name !== "string") {
//       throw createExtensionError("Extension name must be a non-empty string");
//     }
//
//     return this.contexts.get(name) as
//       | WefyExtensionContext<ExtensionState>
//       | undefined;
//   }
//
//   /**
//    * Check if an extension exists
//    * @param name Name of the extension
//    * @returns True if extension exists
//    */
//   hasExtension(name: string): boolean {
//     return this.extensions.has(name);
//   }
//
//   /**
//    * Execute a hook on all extensions in priority order
//    * @param hookName Name of the hook to execute
//    * @param args Arguments to pass to the hook
//    */
//   async executeHook(
//     hookName: keyof WefyExtensionHooks,
//     ...args: unknown[]
//   ): Promise<void> {
//     if (!this.initialized && hookName !== "init") {
//       throw createExtensionError(
//         "ExtensionManager must be initialized before executing hooks"
//       );
//     }
//
//     const errors: Array<{ name: string; error: unknown }> = [];
//     const abortController = new AbortController();
//
//     // Sort extensions by priority (if available)
//     const sortedExtensions = Array.from(this.extensions.entries()).sort(
//       ([, extA], [, extB]) => (extB.priority || 0) - (extA.priority || 0)
//     );
//
//     for (const [name, ext] of sortedExtensions) {
//       if (abortController.signal.aborted) break;
//
//       const hook = ext.hooks?.[hookName];
//       if (hook && typeof hook === "function") {
//         const ctx = this.contexts.get(name);
//         if (!ctx) continue;
//
//         try {
//           // Pass context as the last argument to all hooks except init
//           // For init, we keep backward compatibility and pass config as first arg
//           if (hookName === "init") {
//             await Promise.race([
//               (hook as Function)(args[0], ctx),
//               new Promise(
//                 (_, reject) =>
//                   (abortController.signal.onabort = () =>
//                     reject(new Error("Hook execution aborted")))
//               ),
//             ]);
//           } else {
//             await Promise.race([
//               (hook as Function)(...args, ctx),
//               new Promise(
//                 (_, reject) =>
//                   (abortController.signal.onabort = () =>
//                     reject(new Error("Hook execution aborted")))
//               ),
//             ]);
//           }
//         } catch (error) {
//           errors.push({ name, error });
//
//           // Handle error with extension's onError hook if available
//           if (ext.hooks?.onError) {
//             try {
//               await ext.hooks.onError(
//                 error instanceof Error ? error : new Error(String(error)),
//                 ctx,
//                 {} // Meta information could be added here
//               );
//             } catch (errorHandlingError) {
//               console.error(
//                 `Error in onError handler for ${name}:`,
//                 errorHandlingError
//               );
//             }
//           }
//
//           // Abort if this is a critical extension
//           if (ext.critical) {
//             abortController.abort();
//           }
//         }
//       }
//     }
//
//     // If there were any errors, throw an extension error
//     if (errors.length > 0) {
//       throw createExtensionError(
//         `Hook ${String(hookName)} errors: ${errors
//           .map(
//             (e) =>
//               `${e.name}: ${
//                 e.error instanceof Error ? e.error.message : String(e.error)
//               }`
//           )
//           .join(", ")}`
//       );
//     }
//   }
//
//   /**
//    * Create a new extension manager that includes all current extensions plus additional ones
//    * @param additionalExtensions Additional extensions to include
//    * @returns New extension manager
//    */
//   extend(
//     additionalExtensions: ReadonlyArray<WefyExtension>
//   ): WefyExtensionManager {
//     // Create a new manager with all current extensions
//     const allExtensions = [
//       ...Array.from(this.extensions.values()),
//       ...additionalExtensions,
//     ];
//
//     return new WefyExtensionManager(allExtensions);
//   }
//
//   /**
//    * Get all registered extensions
//    * @returns Array of all extensions
//    */
//   getAllExtensions(): WefyExtension[] {
//     return Array.from(this.extensions.values());
//   }
//
//   /**
//    * Set a value in the shared state
//    * @param key Key to set
//    * @param value Value to set
//    */
//   setSharedState(key: string, value: SharedStateValue): void {
//     if (!key || typeof key !== "string") {
//       throw createExtensionError("Shared state key must be a non-empty string");
//     }
//
//     this.sharedState.set(key, value);
//   }
//
//   /**
//    * Get a value from the shared state
//    * @param key Key to get
//    * @returns Value or undefined if not found
//    */
//   getSharedState(key: string): SharedStateValue | undefined {
//     if (!key || typeof key !== "string") {
//       throw createExtensionError("Shared state key must be a non-empty string");
//     }
//
//     return this.sharedState.get(key);
//   }
//
//   /**
//    * Clear all shared state
//    */
//   clearSharedState(): void {
//     this.sharedState.clear();
//   }
// }
