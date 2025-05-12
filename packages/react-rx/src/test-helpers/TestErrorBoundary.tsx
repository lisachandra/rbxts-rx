import { Error } from '@rbxts/luau-polyfill';
import { Component, ErrorInfo } from '@rbxts/react';

export class TestErrorBoundary extends Component<
  {
    children?: React.ReactNode | undefined;
    onError: (error: Error, errorInfo: ErrorInfo) => void;
  },
  {
    hasError: boolean;
  }
> {
  state = {
    hasError: false,
  };

  componentDidCatch(err: Error, errorInfo: ErrorInfo) {
    this.props.onError(err, errorInfo);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return 'error' as never;
    }

    return this.props.children;
  }
}
