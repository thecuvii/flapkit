import { createFileRoute } from '@tanstack/react-router'
import { ExperimentsPage } from '../experiments-page'

export const Route = createFileRoute('/experiments')({
  component: ExperimentsPage,
})
