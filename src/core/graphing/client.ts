import type { GraphRequest, GraphResponse } from './types';
/** A superseded generation can never publish over a newer expression. */
export class GraphClient {
  private worker: Worker | null = null;
  private generation = 0;
  private ready = false;
  private busy = false;
  private pending: GraphRequest | null = null;
  private deadline = 0;
  private warmup = 0;
  constructor(
    private receive: (response: GraphResponse) => void,
    private makeWorker = () =>
      new Worker(new URL('./graph.worker.ts', import.meta.url), { type: 'module' }),
  ) {}
  request(request: Omit<GraphRequest, 'id'>): number {
    const id = ++this.generation;
    this.pending = { ...request, id };
    if (!this.worker) this.create();
    if (this.ready && !this.busy) this.send();
    return id;
  }
  private create() {
    try {
      this.worker = this.makeWorker();
    } catch {
      this.fail(
        'This browser could not create the local graph worker. Reload or try a browser with Web Worker support.',
      );
      return;
    }
    this.ready = false;
    this.worker.onmessage = (event: MessageEvent<GraphResponse | { ready: true }>) => {
      if ('ready' in event.data) {
        clearTimeout(this.warmup);
        this.ready = true;
        this.send();
        return;
      }
      clearTimeout(this.deadline);
      this.busy = false;
      if (event.data.id !== this.generation) {
        this.send();
        return;
      }
      this.pending = null;
      this.receive(event.data);
    };
    this.worker.onerror = () =>
      this.fail('The local graph worker could not start. Reload and try again.');
    this.warmup = window.setTimeout(
      () => this.fail('The local graph worker took too long to start. Try again.'),
      10000,
    );
  }
  private send() {
    if (!this.pending || !this.worker) return;
    this.busy = true;
    clearTimeout(this.deadline);
    this.worker.postMessage(this.pending);
    this.deadline = window.setTimeout(
      () =>
        this.fail(
          'This expression reached the sampling deadline. Try a smaller window or a simpler expression.',
        ),
      1000,
    );
  }
  private fail(error: string) {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.busy = false;
    clearTimeout(this.deadline);
    clearTimeout(this.warmup);
    const id = this.generation;
    this.pending = null;
    this.receive({ id, ok: false, error });
  }
  dispose() {
    ++this.generation;
    clearTimeout(this.deadline);
    clearTimeout(this.warmup);
    this.worker?.terminate();
    this.worker = null;
    this.pending = null;
  }
}
