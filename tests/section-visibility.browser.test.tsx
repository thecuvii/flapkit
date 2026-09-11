import { Activity, act, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import { useInView } from '../website/modules/docs/use-in-view'

it('starts effects only on intersection, stops on exit, and restarts on re-entry', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const frames = { first: 0, second: 0 }
  function Animation({ name }: { name: keyof typeof frames }) {
    useEffect(() => {
      let frame: number
      const tick = () => {
        frames[name]++
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(frame)
    }, [name])
    return <div>{name}</div>
  }
  function Section({ name }: { name: keyof typeof frames }) {
    const ref = useRef<HTMLElement>(null)
    const inView = useInView(ref)
    return (
      <section ref={ref} data-section={name} style={{ height: '110vh' }}>
        <Activity mode={inView ? 'visible' : 'hidden'}>
          <Animation name={name} />
        </Activity>
      </section>
    )
  }

  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    window.scrollTo(0, 0)
    await act(() =>
      root.render(
        <>
          <Section name="first" />
          <Section name="second" />
        </>,
      ),
    )
    await act(async () => {
      for (let index = 0; index < 4; index++) await new Promise(requestAnimationFrame)
    })
    await expect.poll(() => frames.first).toBeGreaterThan(0)
    expect(frames.second).toBe(0)

    await act(async () => {
      host.querySelector('[data-section="second"]')!.scrollIntoView({ behavior: 'instant' })
      for (let index = 0; index < 4; index++) await new Promise(requestAnimationFrame)
    })
    await expect.poll(() => frames.second).toBeGreaterThan(0)
    const firstStopped = frames.first
    for (let index = 0; index < 4; index++) await new Promise(requestAnimationFrame)
    expect(frames.first).toBe(firstStopped)

    await act(async () => {
      window.scrollTo({ top: 0, behavior: 'instant' })
      for (let index = 0; index < 4; index++) await new Promise(requestAnimationFrame)
    })
    await expect.poll(() => frames.first).toBeGreaterThan(firstStopped)
    const secondStopped = frames.second
    for (let index = 0; index < 4; index++) await new Promise(requestAnimationFrame)
    expect(frames.second).toBe(secondStopped)
  } finally {
    await act(() => root.unmount())
    host.remove()
    window.scrollTo(0, 0)
  }
})
