import { useEffect, useState, type RefObject } from 'react'

export function useInView(ref: RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0),
      { threshold: 0.001 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])

  return inView
}
