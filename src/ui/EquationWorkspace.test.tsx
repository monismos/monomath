import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EquationWorkspace from './EquationWorkspace';
import { parseGraph } from '../core/graphing/parser';
import { sampleGraph } from '../core/graphing/sample';
import type { GraphRequest, GraphResponse } from '../core/graphing/types';
import {
  defaultGraphContext,
  getGraphContext,
  getRenderedGraphContext,
  restoreGraphContext,
} from '../core/graphing/workspaceStore';
import { useLesson } from '../core/scene/store';
import { useSettings } from '../core/storage/settings';
const mocked = vi.hoisted(() => ({
  requests: [] as unknown[],
  receive: undefined as ((response: unknown) => void) | undefined,
  disposed: false,
}));
vi.mock('../core/graphing/client', () => ({
  GraphClient: class {
    constructor(receive: (response: unknown) => void) {
      mocked.receive = receive;
    }
    request(request: unknown) {
      mocked.requests.push(request);
      return mocked.requests.length;
    }
    dispose() {
      mocked.disposed = true;
    }
  },
}));
vi.mock('../core/perf/quality', () => ({ detectQuality: () => 'medium' }));
vi.mock('./GraphThree', () => ({ default: () => <div>Three graph table</div> }));
vi.mock('./Mascot', () => ({ Mascot: () => null }));
vi.mock('./MathText', () => ({ default: ({ tex }: { tex: string }) => <span>{tex}</span> }));
vi.mock('../core/graphing/GraphSvg', () => ({
  GraphSvg: ({ graph }: { graph: { source: string } }) => (
    <svg role="img" aria-label={`Graph of ${graph.source}`} />
  ),
}));
function reply() {
  const request = mocked.requests.at(-1) as GraphRequest;
  const parsed = parseGraph(request.source, request.interpretation);
  const graph = sampleGraph(parsed, request.parameters, request.viewport, request.detail);
  act(() =>
    mocked.receive?.({
      id: mocked.requests.length,
      ok: true,
      parsed,
      graph,
    } satisfies GraphResponse),
  );
}
describe('equation workspace learner controls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocked.requests = [];
    mocked.disposed = false;
    restoreGraphContext(defaultGraphContext());
    useLesson.getState().set({ labId: 'demo', problem: '3/4' });
    useSettings.getState().set({ dimension: '2d', mascot: 'off' });
  });
  afterEach(async () => {
    await act(async () => {});
    vi.useRealTimers();
  });
  it('debounces input and retains the last valid graph on an actionable error', () => {
    const view = render(<EquationWorkspace />);
    act(() => vi.advanceTimersByTime(221));
    reply();
    expect(screen.getByRole('img', { name: 'Graph of y=sin(x)' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Equation or expression'), {
      target: { value: 'foo(x)' },
    });
    act(() => vi.advanceTimersByTime(100));
    expect(mocked.requests).toHaveLength(1);
    act(() => vi.advanceTimersByTime(121));
    expect(mocked.requests).toHaveLength(2);
    act(() => mocked.receive?.({ id: 2, ok: false, error: 'foo is unsupported. Try sin(x).' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/last valid graph/);
    expect(screen.getByRole('img', { name: 'Graph of y=sin(x)' })).toBeInTheDocument();
    expect(getGraphContext().source).toBe('foo(x)');
    expect(getRenderedGraphContext()).toMatchObject({
      source: 'y=sin(x)',
      interpretation: 'auto',
      parameters: {},
      viewport: { xmin: -5, xmax: 5 },
    });
    view.unmount();
    expect(mocked.disposed).toBe(true);
  });
  it('changes parameters, pan and inspection without losing source or renderer setting', () => {
    render(<EquationWorkspace />);
    act(() => vi.advanceTimersByTime(221));
    reply();
    fireEvent.click(screen.getByRole('button', { name: 'y=a*x^2+b*x+c' }));
    act(() => vi.advanceTimersByTime(221));
    reply();
    fireEvent.change(screen.getByLabelText('Parameter a'), { target: { value: '2.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pan view right' }));
    fireEvent.change(screen.getByLabelText('Trace x coordinate'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: '3D' }));
    expect(getGraphContext()).toMatchObject({
      source: 'y=a*x^2+b*x+c',
      parameters: { a: 2.5 },
      viewport: { xmin: -3, xmax: 7 },
      traceX: 1.5,
    });
    expect(useSettings.getState().dimension).toBe('3d');
    act(() => vi.advanceTimersByTime(221));
    reply();
    expect(screen.getByLabelText('Numeric parameter a')).toHaveValue(2.5);
    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('shows a useful surface slice, numeric values and truthful unsupported grammar', () => {
    render(<EquationWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'z=sin(x)*cos(y)' }));
    act(() => vi.advanceTimersByTime(221));
    reply();
    expect(screen.getByLabelText('Slice y coordinate')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Slice y coordinate'), { target: { value: '1' } });
    expect(getGraphContext().sliceY).toBe(1);
    expect(screen.getByRole('heading', { name: 'Slice through y=1' })).toBeInTheDocument();
    expect(screen.getByText(/Custom functions, inequalities, integrals/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(getGraphContext()).toMatchObject({
      traceX: 0,
      sliceY: 0,
      viewport: { xmin: -5, xmax: 5 },
    });
  });
  it('restores an incoming note context while the workspace is already mounted', () => {
    render(<EquationWorkspace />);
    act(() => vi.advanceTimersByTime(221));
    reply();
    act(() => {
      restoreGraphContext({ ...defaultGraphContext('y=a*x'), parameters: { a: 3 }, traceX: 2 });
      useLesson.getState().set({ labId: 'equations', problem: 'y=a*x', step: 0 });
    });
    expect(screen.getByLabelText('Equation or expression')).toHaveValue('y=a*x');
    expect(getGraphContext()).toMatchObject({ parameters: { a: 3 }, traceX: 2 });
  });
});
