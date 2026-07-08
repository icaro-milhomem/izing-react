import { api } from './client'

export const getDashTicketsQueues = (params?: Record<string, unknown>) =>
  api.get('/dash-tickets-queues', { params })

export const getContactsReport = (params?: Record<string, unknown>) =>
  api.get('/contacts-report', { params })

export const getStatisticsPerUsers = (params?: Record<string, unknown>) =>
  api.get('/statistics-per-users', { params })

export const getStatisticsTicketsTimes = (params?: Record<string, unknown>) =>
  api.get('/statistics-tickets-times', { params })

export const getStatisticsTicketsChannels = (params?: Record<string, unknown>) =>
  api.get('/statistics-tickets-channels', { params })

export const getStatisticsTicketsQueue = (params?: Record<string, unknown>) =>
  api.get('/statistics-tickets-queue', { params })

export const getStatisticsTicketsPerUsersDetail = (params?: Record<string, unknown>) =>
  api.get('/statistics-tickets-per-users-detail', { params })

export const getStatisticsTicketsEvolutionByPeriod = (params?: Record<string, unknown>) =>
  api.get('/statistics-tickets-evolution-by-period', { params })

export const getStatisticsTicketsEvolutionChannels = (params?: Record<string, unknown>) =>
  api.get('/statistics-tickets-evolution-channels', { params })
