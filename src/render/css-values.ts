/** CSS variables used when values must be composed into inline geometry or gradients. */
export const cssValue = new Proxy({} as Record<string, string>, {
  get: (_target, property: string) =>
    `var(--flapkit-${property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)})`,
})
