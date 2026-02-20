import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { hello } from '../server/hello'

export const Route = createFileRoute('/test')({
  component: TestPage,
})

function TestPage() {
  const [result, setResult] = React.useState('')
  const [timestamp, setTimestamp] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [name, setName] = React.useState('')

  const handleClick = React.useCallback(async () => {
    setIsLoading(true)
    setError('')
    setResult('')
    setTimestamp('')

    try {
      const data = await hello({ data: { name } })
      setResult(data.message)
      setTimestamp(data.timestamp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }, [name])

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center pt-24">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Test Endpoint
        </h1>
        <p className="text-gray-600 mb-6">
          Click the button to call the backend endpoint.
        </p>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter your name"
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleClick}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300"
          disabled={isLoading}
        >
          {isLoading ? 'Calling…' : 'Call Backend'}
        </button>
        <div className="mt-4 min-h-[64px]">
          {result !== '' ? (
            <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm">{result}</div>
              {timestamp !== '' ? (
                <div className="text-xs text-green-600 mt-1">{timestamp}</div>
              ) : null}
            </div>
          ) : null}
        </div>
        {error !== '' ? (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  )
}
