// axios 实例（备用，目前主要用 SSE）
import axios from 'axios'

export const http = axios.create({
  baseURL: '/api',
  timeout: 10000
})

http.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error('[http]', err?.message || err)
    return Promise.reject(err)
  }
)