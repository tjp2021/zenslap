import { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { Button } from './button'
import { RefreshCw } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <Alert variant="destructive" className="my-4">
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription className="mt-2">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </AlertDescription>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={this.handleRetry}
                        className="mt-4"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try again
                    </Button>
                </Alert>
            )
        }

        return this.props.children
    }
} 