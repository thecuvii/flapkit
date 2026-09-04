import { createFileRoute } from '@tanstack/react-router'
import { LabPage } from '../lab-page'

export const Route = createFileRoute('/lab')({
  component: LabPage,
})
