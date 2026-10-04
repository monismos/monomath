import { parseGraph } from './parser';
import { sampleGraph } from './sample';
import type { GraphRequest, GraphResponse } from './types';
const worker = self as unknown as {
  postMessage: (message: GraphResponse | { ready: true }) => void;
  onmessage: ((event: MessageEvent<GraphRequest>) => void) | null;
};
worker.onmessage = (event) => {
  const request = event.data;
  try {
    const parsed = parseGraph(request.source, request.interpretation),
      graph = sampleGraph(parsed, request.parameters, request.viewport, request.detail);
    worker.postMessage({ id: request.id, ok: true, parsed, graph });
  } catch (error) {
    worker.postMessage({
      id: request.id,
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'This graph could not be sampled. Try a simpler real-valued expression.',
    });
  }
};
worker.postMessage({ ready: true });
