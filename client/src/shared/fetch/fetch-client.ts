import { FetchError } from './fetch-error'
import { RequestOptions, TypeSearchParams } from './fetch-types'

export class FetchClient {
  private baseUrl: string
  headers?: Record<string, string>
  params?: TypeSearchParams
  options?: RequestOptions

  constructor(init: {
    baseUrl: string
    headers?: Record<string, string>
    params?: TypeSearchParams
    options?: RequestOptions
  }) {
    this.baseUrl = init.baseUrl
    this.headers = init.headers
    this.params = init.params
    this.options = init.options
  }

  private createSearchParams(params: TypeSearchParams) {
    const searchParams = new URLSearchParams()

    for (const key in { ...this.params, ...params }) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const value = params[key]

        if (Array.isArray(value)) {
          value.forEach(currentValue => {
            if (currentValue) {
              searchParams.append(key, currentValue.toString())
            }
          })
        } else if (value) {
          searchParams.set(key, value.toString())
        }
      }
    }

    return `?${searchParams.toString()}`
  }

  private async request<T>(endpoint: string, method: RequestInit['method'], options: RequestOptions = {}) {
    let url = `${this.baseUrl}/${endpoint}`

    if (options.params) {
      url += this.createSearchParams(options.params)
    }

    const config: RequestInit = {
      ...options,
      ...(!!this.options && { ...this.options }),
      method,
      headers: {
        ...(!!options?.headers && options.headers),
        ...this.headers
      }
    }

    const response: Response = await fetch(url, config)

    if (!response.ok) {
      const error = (await response.json()) as { message: string } | undefined

      throw new FetchError(response.status, error?.message || response.statusText)
    }

    if (response.headers.get('Content-Type')?.includes('application/json')) {
      return (await response.json()) as unknown as T
    } else {
      return (await response.text()) as unknown as T
    }
  }

  get<T>(endpoint: string, options: Omit<RequestOptions, 'body'> = {}) {
    return this.request<T>(endpoint, 'GET', options)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post<T>(endpoint: string, body?: Record<string, any>, options: RequestOptions = {}) {
    const isFormData = body instanceof FormData

    return this.request<T>(endpoint, 'POST', {
      ...options,
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...(options.headers || {})
      },
      body: isFormData ? body : JSON.stringify(body)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put<T>(endpoint: string, body?: Record<string, any>, options: RequestOptions = {}) {
    const isFormData = body instanceof FormData

    return this.request<T>(endpoint, 'PUT', {
      ...options,
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...(options.headers || {})
      },
      body: isFormData ? body : JSON.stringify(body)
    })
  }

  delete<T>(endpoint: string, options: Omit<RequestOptions, 'body'> = {}) {
    return this.request<T>(endpoint, 'DELETE', options)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch<T>(endpoint: string, body?: Record<string, any>, options: RequestOptions = {}) {
    const isFormData = body instanceof FormData

    return this.request<T>(endpoint, 'PATCH', {
      ...options,
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...(options.headers || {})
      },
      body: isFormData ? body : JSON.stringify(body)
    })
  }
}
