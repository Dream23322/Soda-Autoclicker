import { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center space-y-3">
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                className="text-sm text-primary underline"
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
              >
                Reload
              </button>
              <span className="text-muted-foreground text-[10px]">|</span>
              <button
                className="text-sm text-primary underline"
                onClick={() => window.open('https://discord.gg/4ZqBfDFMG4', '_blank')}
              >
                Report Bug
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
