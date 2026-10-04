import { Component } from 'react';
import type { ReactNode } from 'react';
export class LabBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section role="alert">
        <h2>This workspace paused.</h2>
        <p>
          Your saved notes and lessons are still on this device. Reload to retry, or return to the
          workshop.
        </p>
        <button onClick={() => location.reload()}>Reload workspace</button>
        <button
          onClick={() => {
            location.hash = 'workshop';
          }}
        >
          Return to workshop
        </button>
      </section>
    ) : (
      this.props.children
    );
  }
}
