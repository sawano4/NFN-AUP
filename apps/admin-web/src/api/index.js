import { adminApi, authApi } from './client'

// Auth
export const login = (email, password) =>
  authApi.post('/login', { email, password }).then(r => r.data)

// Dashboard
export const getDashboard = () => adminApi.get('/dashboard/summary').then(r => r.data)

// Users
export const getUsers    = () => adminApi.get('/users').then(r => r.data)
export const createUser  = d  => adminApi.post('/users', d).then(r => r.data)
export const updateUser  = (id, d) => adminApi.put(`/users/${id}`, d).then(r => r.data)
export const deleteUser  = id => adminApi.delete(`/users/${id}`)

// Sources
export const getSources        = () => adminApi.get('/sources').then(r => r.data)
export const getPendingSources = () => adminApi.get('/sources/pending').then(r => r.data)
export const createSource      = d  => adminApi.post('/sources', d).then(r => r.data)
export const updateSource      = (id, d) => adminApi.put(`/sources/${id}`, d).then(r => r.data)
export const deleteSource      = id => adminApi.delete(`/sources/${id}`)
export const approveSource     = (id, comment) => adminApi.post(`/sources/${id}/approve`, { comment }).then(r => r.data)
export const rejectSource      = (id, reason)  => adminApi.post(`/sources/${id}/reject`, { reason }).then(r => r.data)

// Lots
export const getLots            = () => adminApi.get('/lots').then(r => r.data)
export const createLot          = d  => adminApi.post('/lots', d).then(r => r.data)
export const updateLot          = (id, d) => adminApi.put(`/lots/${id}`, d).then(r => r.data)
export const deleteLot          = id => adminApi.delete(`/lots/${id}`)
export const getLotTraceability = id => adminApi.get(`/lots/${id}/traceability`).then(r => r.data)

// Lot Chain
export const getLotChain                  = id => adminApi.get(`/lots/${id}/chain`).then(r => r.data)
export const chainDepotArrival            = (id, d) => adminApi.post(`/lots/${id}/chain/depot-arrival`, d).then(r => r.data)
export const chainDepotDeparture          = (id, d) => adminApi.post(`/lots/${id}/chain/depot-departure`, d).then(r => r.data)
export const chainLaverieArrival          = (id, d) => adminApi.post(`/lots/${id}/chain/laverie-arrival`, d).then(r => r.data)
export const chainLaverieDone             = (id, d) => adminApi.post(`/lots/${id}/chain/laverie-done`, d).then(r => r.data)
export const chainTransformateurArrival   = (id, d) => adminApi.post(`/lots/${id}/chain/transformateur-arrival`, d).then(r => r.data)
export const chainTransformateurDone      = (id, d) => adminApi.post(`/lots/${id}/chain/transformateur-done`, d).then(r => r.data)

// Alerts
export const getAlerts    = () => adminApi.get('/alerts').then(r => r.data)
export const createAlert  = d  => adminApi.post('/alerts', d).then(r => r.data)
export const updateAlert  = (id, d) => adminApi.put(`/alerts/${id}`, d).then(r => r.data)
export const deleteAlert  = id => adminApi.delete(`/alerts/${id}`)
export const resolveAlert = (id, comment) => adminApi.post(`/alerts/${id}/resolve`, { comment }).then(r => r.data)

// Receipts
export const getReceipts    = () => adminApi.get('/receipts').then(r => r.data)
export const updateReceipt  = (id, d) => adminApi.put(`/receipts/${id}`, d).then(r => r.data)
export const deleteReceipt  = id => adminApi.delete(`/receipts/${id}`)

// Classifications
export const getClassifications   = () => adminApi.get('/classifications').then(r => r.data)
export const updateClassification = (id, d) => adminApi.put(`/classifications/${id}`, d).then(r => r.data)
export const deleteClassification = id => adminApi.delete(`/classifications/${id}`)

// Shipments
export const getShipments   = () => adminApi.get('/shipments').then(r => r.data)
export const deleteShipment = id => adminApi.delete(`/shipments/${id}`)

// Documents
export const getDocuments    = () => adminApi.get('/documents').then(r => r.data)
export const createDocument  = d  => adminApi.post('/documents', d).then(r => r.data)
export const updateDocument  = (id, d) => adminApi.put(`/documents/${id}`, d).then(r => r.data)
export const deleteDocument  = id => adminApi.delete(`/documents/${id}`)

// Exceptions
export const getExceptions    = () => adminApi.get('/exceptions').then(r => r.data)
export const updateException  = (id, d) => adminApi.put(`/exceptions/${id}`, d).then(r => r.data)
export const deleteException  = id => adminApi.delete(`/exceptions/${id}`)

// Thresholds
export const getThresholds    = () => adminApi.get('/thresholds').then(r => r.data)
export const updateThresholds = d  => adminApi.put('/thresholds', d).then(r => r.data)

// Notifications
export const getNotifications = () => adminApi.get('/notifications').then(r => r.data)

// Depots
export const getDepots    = () => adminApi.get('/depots').then(r => r.data)
export const createDepot  = d  => adminApi.post('/depots', d).then(r => r.data)
export const updateDepot  = (id, d) => adminApi.put(`/depots/${id}`, d).then(r => r.data)
export const deleteDepot  = id => adminApi.delete(`/depots/${id}`)

// Laveries
export const getLaveries    = () => adminApi.get('/laveries').then(r => r.data)
export const createLaverie  = d  => adminApi.post('/laveries', d).then(r => r.data)
export const updateLaverie  = (id, d) => adminApi.put(`/laveries/${id}`, d).then(r => r.data)
export const deleteLaverie  = id => adminApi.delete(`/laveries/${id}`)

// Transformateurs
export const getTransformateurs    = () => adminApi.get('/transformateurs').then(r => r.data)
export const createTransformateur  = d  => adminApi.post('/transformateurs', d).then(r => r.data)
export const updateTransformateur  = (id, d) => adminApi.put(`/transformateurs/${id}`, d).then(r => r.data)
export const deleteTransformateur  = id => adminApi.delete(`/transformateurs/${id}`)

// Chat / KPI assistant
export const sendChat = (message, history = []) =>
  adminApi.post('/chat', { message, history }).then(r => r.data)

// Dev / Demo utilities
export const resetDemoData = () => adminApi.post('/reset-demo').then(r => r.data)
