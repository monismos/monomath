import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluate } from 'mathjs';
import { parseGraph } from './parser';
import { evaluateAST } from './evaluate';
import { sampleGraph, validViewport } from './sample';
import { defaultViewport } from './types';
import type { GraphRequest, GraphResponse, GraphSpec } from './types';
import { GraphClient } from './client';
import { clipGraphLine } from './coordinates';
import {
  defaultGraphContext,
  getGraphContext,
  restoreGraphContext,
  useGraphWorkspace,
  validGraphContext,
} from './workspaceStore';

const sample = (source: string) => sampleGraph(parseGraph(source), {}, { ...defaultViewport });
describe('bounded real equation parser', () => {
  it.each([
    ['y=sin(x)', 'curve'],
    ['sin(x)=y', 'curve'],
    ['2x', 'curve'],
    ['x^2+y^2=4', 'relation'],
    ['y^2=x', 'relation'],
    ['x=2', 'relation'],
    ['x^2=4', 'relation'],
    ['z=x^2+y^2', 'surface'],
    ['x*y=z', 'surface'],
    ['x+y', 'surface'],
    ['y=2', 'curve'],
    ['z=2', 'surface'],
    ['2/3', 'constant'],
    ['2=2', 'constantRelation'],
    ['2==3', 'constantRelation'],
  ])('classifies %s as %s', (source, mode) => expect(parseGraph(source).mode).toBe(mode));
  it('collects parameters from symbols, never from function names', () => {
    expect(parseGraph('y=a*x^2+b*x+c+sin(x)').parameters).toEqual(['a', 'b', 'c']);
    expect(parseGraph('y=ln(x)').ast).toMatchObject({ t: 'call', fn: 'log' });
    expect(parseGraph('y=π×x−2').normalized).toBe('y=pi*x-2');
  });
  it.each([
    'a;b',
    'a=1;b=2',
    'f(x)=x^2',
    'x.foo',
    'sin.constructor(x)',
    '[1,2]',
    '{a:1}',
    'x>2',
    'x!',
    'random()',
    'foo(x)',
    'sqrt()',
    'sin(x,y)',
    '2 cm',
    'i*x',
    'x=y=2',
    'sin(x=2)',
    'x^2+y^2+z^2=1',
    'z=z+x',
    'constructor*x',
    'a+b+c+d+q+x',
  ])('rejects unsupported execution or forms: %s', (source) =>
    expect(() => parseGraph(source)).toThrow(),
  );
  it('guards lexical length, deep parentheses and AST size before sampling', () => {
    expect(() => parseGraph('x'.repeat(1025))).toThrow(/1,024/);
    expect(() => parseGraph('('.repeat(25) + 'x' + ')'.repeat(25))).toThrow(/deeply/);
    expect(() => parseGraph(Array(80).fill('x').join('+'))).toThrow(/128|24/);
    expect(() => parseGraph('y=x^2', 'relation')).not.toThrow();
    expect(() => parseGraph('x^2+y^2=1', 'surface')).toThrow(/implicit/);
  });
});
describe('numeric AST real-domain interpreter', () => {
  it.each([
    'y=sin(x)+cos(x)',
    'y=atan(x)',
    'y=sqrt(abs(x))',
    'y=exp(x/3)',
    'y=log(x+4)',
    'y=log(x+4,2)',
    'y=log10(x+4)',
    'y=min(x,2)+max(x,-1)',
    'y=x^3-2x+1',
    'y=asin(x/4)+acos(x/4)',
    'y=floor(x)+ceil(x)',
    'y=a*x^2+b',
  ])('agrees with independent mathjs arithmetic for %s', (source) => {
    const parsed = parseGraph(source),
      expression = source.slice(2);
    for (const x of [-2.25, -0.6, 0, 0.9, 2.1]) {
      const scope = { x, a: 1.3, b: -0.2 };
      const result = evaluateAST(parsed.ast, scope);
      expect(result.valid).toBe(true);
      expect(result.value).toBeCloseTo(Number(evaluate(expression, scope)), 10);
    }
  });
  it.each([
    'y=1/x',
    'y=sqrt(-1)',
    'y=log(0)',
    'y=log(2,1)',
    'y=asin(2)',
    'y=(-1)^.5',
    'y=0^0',
    'y=exp(10000)',
    'y=tan(pi/2)',
  ])('leaves nonreal, excluded or overflowing values invalid: %s', (source) =>
    expect(evaluateAST(parseGraph(source).ast, { x: 0 }).valid).toBe(false),
  );
  it('compares finite literal arithmetic exactly and transcendental agreement approximately', () => {
    expect(sample('0.1+0.2=0.3')).toMatchObject({ outcome: 'all', approximate: false });
    expect(sample('sin(pi)=0')).toMatchObject({ outcome: 'all', approximate: true });
    expect(sample('2=3').outcome).toBe('none');
    expect(sample('sqrt(-1)').outcome).toBe('outsideDomain');
    expect(sample('2/3').value).toBeCloseTo(2 / 3, 12);
  });
});
describe('sampled curves, contours and surfaces', () => {
  it('clips lines to the window without inventing offscreen boundary strokes', () => {
    expect(clipGraphLine(defaultViewport, { x: -5, y: 20 }, { x: 5, y: 20 })).toBeNull();
    expect(clipGraphLine(defaultViewport, { x: -10, y: -10 }, { x: 10, y: 10 })).toEqual([
      { x: -5, y: -5 },
      { x: 5, y: 5 },
    ]);
    expect(clipGraphLine(defaultViewport, { x: 0, y: 0 }, { x: 0, y: 10 })).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 5 },
    ]);
  });
  it.each([
    ['y=1/x', 0],
    ['y=(x^2-1)/(x-1)', 1],
    ['y=tan(x)', Math.PI / 2],
  ])('never connects across the known pole or hole in %s', (source, pole) => {
    const graph = sample(source);
    expect(graph.segments.length).toBeGreaterThan(1);
    expect(graph.segments.every((s) => !(s[0].x < pole && s.at(-1)!.x > pole))).toBe(true);
    expect(graph.segments.flat().every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(
      true,
    );
  });
  it('respects square root/log domains and does not slope across floor jumps', () => {
    expect(
      sample('y=sqrt(x)')
        .segments.flat()
        .every((p) => p.x >= 0),
    ).toBe(true);
    expect(
      sample('y=log(x)')
        .segments.flat()
        .every((p) => p.x > 0),
    ).toBe(true);
    expect(sample('y=floor(x)').segments.every((s) => new Set(s.map((p) => p.y)).size === 1)).toBe(
      true,
    );
  });
  it('samples circle, parabola, vertical lines and saddle axes', () => {
    const circle = sample('x^2+y^2=4');
    expect(circle.segments.length).toBeGreaterThan(50);
    expect(circle.segments.flat().every((p) => Math.abs(p.x * p.x + p.y * p.y - 4) < 0.04)).toBe(
      true,
    );
    const vertical = sample('x^2=4');
    expect(vertical.segments.some((s) => s.some((p) => p.x < 0))).toBe(true);
    expect(vertical.segments.some((s) => s.some((p) => p.x > 0))).toBe(true);
    expect(sample('y^2=x').segments.length).toBeGreaterThan(10);
    expect(
      sample('x*y=0')
        .segments.flat()
        .every((p) => Math.abs(p.x * p.y) < 1e-8),
    ).toBe(true);
  });
  it('keeps singular implicit cells masked and labels empty-window limitations', () => {
    const graph = sample('1/x-y=0');
    expect(graph.segments.length).toBeGreaterThan(10);
    expect(graph.segments.every((s) => !s.some((p) => Math.abs(p.x) < 1e-12))).toBe(true);
    expect(sample('x^2+y^2=-1')).toMatchObject({ outcome: 'none' });
    expect(sample('x^2+y^2=-1').diagnostics.join(' ')).toMatch(/sampling can miss/);
    expect(sample('(x^2+y^2-1)^2=0').segments.length).toBeGreaterThan(20);
  });
  it.each(['z=x^2+y^2', 'z=sin(x)*cos(y)', 'z=2', 'z=1/(x-y)'])(
    'creates finite bounded shared surface buffers for %s',
    (source) => {
      const graph = sampleGraph(parseGraph(source), {}, defaultViewport, 'fine'),
        mesh = graph.surface!;
      expect(mesh.vertices.length / 3).toBeLessThanOrEqual(9409);
      expect(mesh.indices.length / 3).toBeLessThanOrEqual(18432);
      expect(mesh.vertices.every(Number.isFinite)).toBe(true);
      expect(mesh.indices.every((n) => n >= 0 && n < mesh.vertices.length / 3)).toBe(true);
      expect(graph.stats.evaluations).toBeLessThanOrEqual(20000);
      expect(graph.stats.nodeVisits).toBeLessThanOrEqual(2000000);
      if (source === 'z=1/(x-y)')
        for (let i = 0; i < mesh.indices.length; i += 3) {
          const signs = mesh.indices
            .slice(i, i + 3)
            .map((id) => Math.sign(mesh.vertices[id * 3] - mesh.vertices[id * 3 + 1]));
          expect(new Set(signs).size).toBe(1);
          expect(signs[0]).not.toBe(0);
        }
    },
  );
  it('keeps stress expressions inside caps and makes resolution exhaustion visible', () => {
    const graph = sample('y=sin(1000*x)');
    expect(graph.stats.evaluations).toBeLessThanOrEqual(2048);
    expect(graph.stats.limited).toBe(true);
    expect(graph.diagnostics.join(' ')).toMatch(/limit/);
    expect(validViewport({ ...defaultViewport, xmin: 5, xmax: 5 })).toBe(false);
    expect(() => sampleGraph(parseGraph('x'), {}, { ...defaultViewport, xmax: Infinity })).toThrow(
      /finite/,
    );
  });
});
describe('worker generations and graph contexts', () => {
  afterEach(() => vi.useRealTimers());
  it('ignores an old result and samples only the latest pending generation', () => {
    const receive = vi.fn(),
      postMessage = vi.fn(),
      terminate = vi.fn();
    const worker = {
      postMessage,
      terminate,
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null,
    };
    const client = new GraphClient(receive, () => worker as unknown as Worker);
    const request = {
      source: 'y=x',
      interpretation: 'auto' as const,
      parameters: {},
      viewport: defaultViewport,
      detail: 'standard' as const,
    };
    const first = client.request(request);
    worker.onmessage!({ data: { ready: true } } as MessageEvent);
    expect(postMessage).toHaveBeenCalledTimes(1);
    const second = client.request({ ...request, source: 'y=x^2' });
    client.request({ ...request, source: 'y=x^3' });
    worker.onmessage!({
      data: { id: first, ok: false, error: 'old' },
    } as MessageEvent<GraphResponse>);
    expect(receive).not.toHaveBeenCalled();
    expect((postMessage.mock.lastCall![0] as GraphRequest).source).toBe('y=x^3');
    worker.onmessage!({
      data: { id: second + 1, ok: false, error: 'latest' },
    } as MessageEvent<GraphResponse>);
    expect(receive).toHaveBeenCalledExactlyOnceWith({ id: second + 1, ok: false, error: 'latest' });
    client.dispose();
    expect(terminate).toHaveBeenCalled();
  });
  it('terminates slow work with a bounded deadline', () => {
    vi.useFakeTimers();
    const receive = vi.fn(),
      worker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null,
      };
    const client = new GraphClient(receive, () => worker as unknown as Worker);
    client.request({
      source: 'y=x',
      interpretation: 'auto',
      parameters: {},
      viewport: defaultViewport,
      detail: 'standard',
    });
    worker.onmessage!({ data: { ready: true } } as MessageEvent);
    vi.advanceTimersByTime(1000);
    expect(worker.terminate).toHaveBeenCalled();
    expect(receive).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: expect.stringMatching(/deadline/) }),
    );
    client.dispose();
  });
  it('restores full scalar graph context while rejecting malformed or prototype fields', () => {
    const context = {
      ...defaultGraphContext('z=a*x*y'),
      parameters: { a: 2.5 },
      viewport: { ...defaultViewport, xmin: -2, xmax: 6 },
      traceX: 3,
      sliceY: -1,
    };
    restoreGraphContext(context);
    expect(getGraphContext()).toEqual(context);
    const exported = getGraphContext();
    exported.viewport.xmin = 999;
    expect(getGraphContext().viewport.xmin).toBe(-2);
    expect(validGraphContext({ ...context, parameters: JSON.parse('{"__proto__":1}') })).toBe(
      false,
    );
    expect(validGraphContext({ ...context, viewport: { ...defaultViewport, xmin: 5 } })).toBe(
      false,
    );
    useGraphWorkspace.getState().open('y=sin(x)');
    useGraphWorkspace.getState().open(context.source);
    expect(getGraphContext()).toEqual(context);
  });
  it('returns one finite horizontal line for a constant function', () => {
    const graph: GraphSpec = sample('y=2');
    expect(graph.segments).toEqual([
      [
        { x: -5, y: 2 },
        { x: 5, y: 2 },
      ],
    ]);
  });
});
