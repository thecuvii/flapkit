import { createFileRoute } from '@tanstack/react-router'
import { PerformancePage } from '../performance-page'

export const Route = createFileRoute('/performance')({
  component: PerformancePage,
})
