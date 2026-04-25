import axios from 'axios'

const ADMIN = 'http://localhost:8104'
const AUTH  = 'http://localhost:8101'

function makeClient(baseURL) {
  const c = axios.create({ baseURL })
  c.interceptors.request.use(cfg => {
    const token = localStorage.getItem('nfn_token')
    if (token) cfg.headers.Authorization = `Bearer ${token}`
    return cfg
  })
  c.interceptors.response.use(r => r, err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('nfn_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  })
  return c
}

export const adminApi = makeClient(ADMIN)
export const authApi  = makeClient(AUTH)
