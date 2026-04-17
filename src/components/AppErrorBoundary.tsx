import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('应用渲染异常:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
          <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 shadow-xl">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              !
            </div>
            <h1 className="text-2xl font-bold text-gray-900">页面遇到异常</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              应用刚刚发生了一次未处理错误。你可以刷新页面继续使用，如果问题持续出现，再检查刚才的操作路径。
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 rounded-xl bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
