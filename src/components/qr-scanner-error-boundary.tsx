"use client";

import { Component, type ReactNode } from "react";

type QrScannerErrorBoundaryProps = {
  children: ReactNode;
  onError?: (message: string) => void;
};

type QrScannerErrorBoundaryState = {
  hasError: boolean;
};

export class QrScannerErrorBoundary extends Component<
  QrScannerErrorBoundaryProps,
  QrScannerErrorBoundaryState
> {
  state: QrScannerErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): QrScannerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error.message || "No se pudo usar la cámara.");
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
