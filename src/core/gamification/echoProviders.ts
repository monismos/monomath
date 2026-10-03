import { useSyncExternalStore } from 'react';
export interface EchoChallenge {
  prompt: string;
  choices?: string[];
  check: (answer: string) => boolean;
  hints: [string, string, string];
  explanation: string;
}
export type EchoProvider = (seed: number) => EchoChallenge;
const providers = new Map<string, EchoProvider>();
const listeners = new Set<() => void>();
let revision = 0;
export function registerEchoProvider(skillId: string, provider: EchoProvider) {
  providers.set(skillId, provider);
  revision++;
  listeners.forEach((fn) => fn());
  return () => {
    if (providers.get(skillId) !== provider) return;
    providers.delete(skillId);
    revision++;
    listeners.forEach((fn) => fn());
  };
}
export function getEchoProvider(skillId: string) {
  return providers.get(skillId);
}
export function useEchoProviders() {
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => revision,
    () => 0,
  );
  return getEchoProvider;
}
