import { Fragment, type ReactElement } from 'react'

export const flapkitKind = Symbol.for('@cuvii/flapkit/kind')

export type FlapkitKind = 'board' | 'grid' | 'header' | 'row' | 'group' | 'cell' | 'wide-cell'

export function markFlapkit<T extends object>(component: T, kind: FlapkitKind): T {
  Object.defineProperty(component, flapkitKind, { value: kind })
  return component
}

export function kindOf(element: ReactElement): FlapkitKind | undefined {
  const type = element.type
  if (typeof type === 'string' || type === Fragment) return undefined
  return (type as { [flapkitKind]?: FlapkitKind })[flapkitKind]
}
