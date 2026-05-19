"use client";

import { Component, type ReactNode } from "react";
import { captureException } from "@/lib/error-reporting";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorReportingBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    captureException(error, {
      extra: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.error) {
      throw this.state.error;
    }
    return this.props.children;
  }
}
