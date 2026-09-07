export const looksPlaygroundReactVersion = '19.2.8'

function packageName(specifier: string) {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier
  }
  return specifier.split('/')[0] ?? specifier
}

/** esm.sh puts the version before any subpath: `react@19.2.8/jsx-runtime`. */
export function esmShPackageUrl(specifier: string, version: string, query = '') {
  const name = packageName(specifier)
  return `https://esm.sh/${name}@${version}${specifier.slice(name.length)}${query}`
}

export function looksPlaygroundCdnUrl(specifier: string) {
  if (specifier === 'react' || specifier.startsWith('react/')) {
    return esmShPackageUrl(specifier, looksPlaygroundReactVersion)
  }
  if (specifier === 'react-dom' || specifier.startsWith('react-dom/')) {
    return esmShPackageUrl(specifier, looksPlaygroundReactVersion, `?deps=react@${looksPlaygroundReactVersion}`)
  }
  if (specifier === 'react-refresh' || specifier.startsWith('react-refresh/')) {
    return esmShPackageUrl(specifier, '0.17.0')
  }
  return `https://esm.sh/${specifier}`
}
