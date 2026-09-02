import * as Flapkit from '@thecuvii/flapkit'
import { useState, type KeyboardEvent } from 'react'
import type { HighlightedDocsCode } from './docs-code'

const navigation = [
  ['Introduction', 'introduction'],
  ['Installation', 'installation'],
  ['Usage', 'usage'],
  ['Composition', 'composition'],
  ['Anatomy', 'anatomy'],
  ['Motion', 'motion'],
  ['Customization', 'customization'],
  ['Sound', 'sound'],
  ['Performance', 'performance'],
  ['API', 'api'],
] as const

const localDeck = Flapkit.createDeck(' 東京大阪成田羽田出発到着搭乗')

function cells(text: string, count: number, deck?: Flapkit.Deck) {
  return Array.from({ length: count }, (_, index) => (
    <Flapkit.Cell key={index} deck={deck}>
      {Array.from(text)[index] ?? ' '}
    </Flapkit.Cell>
  ))
}

function PreviewGrid({ unicode = false }: { unicode?: boolean }) {
  return (
    <Flapkit.Grid
      aria-label={unicode ? 'Unicode local service' : 'Flapkit ready status'}
      className="flapkit-airport preview-board"
    >
      {unicode ? (
        <>
          <Flapkit.Row label="LOCAL">{cells('東京出発', 4, localDeck)}</Flapkit.Row>
          <Flapkit.Row label="LOCAL">{cells('大阪搭乗', 4, localDeck)}</Flapkit.Row>
        </>
      ) : (
        <>
          <Flapkit.Row label="STATUS">{cells('FLAPKIT', 8)}</Flapkit.Row>
          <Flapkit.Row label="STATUS">{cells('READY', 8)}</Flapkit.Row>
        </>
      )}
    </Flapkit.Grid>
  )
}

const usageTabs = [
  { id: 'riffle', label: 'Riffle', description: 'Lightweight canvas motion' },
  { id: 'cascade', label: 'Cascade', description: 'Row-staggered 3D leaves' },
  { id: 'unicode', label: 'Unicode', description: 'One grapheme per character cell' },
] as const

type UsageTab = (typeof usageTabs)[number]['id']

const usageCodeKeys = {
  riffle: 'usageRiffle',
  cascade: 'usageCascade',
  unicode: 'usageUnicode',
} as const satisfies Record<UsageTab, keyof HighlightedDocsCode>

function Logo() {
  return (
    <a className="logo" href="#introduction" aria-label="Flapkit documentation home">
      <span aria-hidden="true">F</span>
      <strong>Flapkit</strong>
    </a>
  )
}

function CodeBlock({ html }: { html: string }) {
  return (
    <div
      className="code-block"
      role="region"
      aria-label="Code example"
      // Shiki escapes source code before producing this trusted HTML.
      dangerouslySetInnerHTML={{ __html: html }}
      tabIndex={0}
    />
  )
}

function ComponentPreview() {
  return (
    <div className="component-preview">
      <Flapkit.Root motion={Flapkit.riffle()}>{PreviewGrid({})}</Flapkit.Root>
    </div>
  )
}

function UsagePreview({
  activeTab,
  onTabChange,
}: {
  activeTab: UsageTab
  onTabChange: (tab: UsageTab) => void
}) {
  const moveTabFocus = (tab: UsageTab) => {
    onTabChange(tab)
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(`#usage-tab-${tab}`)?.focus(),
    )
  }
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = usageTabs.length - 1
    const nextIndex =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? (index + 1) % usageTabs.length
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? (index + lastIndex) % usageTabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? lastIndex
              : undefined
    if (nextIndex === undefined) return
    event.preventDefault()
    moveTabFocus(usageTabs[nextIndex]!.id)
  }

  const preview = (
    <Flapkit.Root motion={activeTab === 'cascade' ? Flapkit.cascade() : Flapkit.riffle()}>
      {activeTab === 'cascade' ? (
        <Flapkit.Grid
          aria-label="Cascade package status"
          className="flapkit-industrial preview-board"
        >
          <Flapkit.Row label="STATUS">{cells('FLAPKIT', 8)}</Flapkit.Row>
          <Flapkit.Row label="STATUS">{cells('READY', 8)}</Flapkit.Row>
        </Flapkit.Grid>
      ) : (
        PreviewGrid({ unicode: activeTab === 'unicode' })
      )}
    </Flapkit.Root>
  )

  return (
    <div className="usage-demo">
      <div
        id="usage-preview"
        className="usage-preview"
        role="tabpanel"
        aria-labelledby={`usage-tab-${activeTab}`}
      >
        {preview}
      </div>
      <div className="usage-tabs" role="tablist" aria-label="Usage examples">
        {usageTabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`usage-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-controls="usage-preview"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'is-active' : undefined}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <strong>{tab.label}</strong>
            <span>{tab.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function DocsPage({ highlightedCode }: { highlightedCode: HighlightedDocsCode }) {
  const [usageTab, setUsageTab] = useState<UsageTab>('riffle')

  return (
    <div className="docs-layout">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <Logo />
          <nav aria-label="Documentation sections">
            {navigation.map(([label, id]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
            <a href="/experiments">Experiments</a>
            <a href="/performance">Performance bench</a>
          </nav>
          <a className="github-link" href="https://github.com/thecuvii/flapkit">
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </aside>

      <main className="docs-content">
        <section id="introduction" className="doc-section introduction">
          <h1>Introduction</h1>
          <p className="lead">
            Composable split-flap displays with physical motion, custom looks, Unicode decks, and
            optional mechanical sound.
          </p>
          <ComponentPreview />
        </section>

        <section id="installation" className="doc-section">
          <h2>Installation</h2>
          <p>Install Flapkit. React 19 is a peer dependency.</p>
          <CodeBlock html={highlightedCode.installation} />
          <p>
            Import <code>@thecuvii/flapkit/flapkit.css</code> and one look stylesheet, such as{' '}
            <code>@thecuvii/flapkit/airport.css</code>, from your application.
          </p>
        </section>

        <section id="usage" className="doc-section">
          <h2>Usage</h2>
          <p>Switch between the core rendering modes and keep the implementation in sync.</p>
          <UsagePreview activeTab={usageTab} onTabChange={setUsageTab} />
          <CodeBlock html={highlightedCode[usageCodeKeys[usageTab]]} />
        </section>

        <section id="composition" className="doc-section">
          <h2>Composition</h2>
          <p>
            Root connects a motion adapter to a declarative board. A flat Row is one region; add
            Group only when adjacent regions need different labels, variants, or decks.
          </p>
          <CodeBlock html={highlightedCode.composition} />
        </section>

        <section id="anatomy" className="doc-section">
          <h2>Anatomy</h2>
          <p>
            The compound components describe the physical board. Root compiles that structure and
            delegates animation to the selected adapter.
          </p>
          <ul className="anatomy" aria-label="Flapkit component anatomy">
            <li>
              <code>Root</code>
              <span>Motion and optional sound</span>
            </li>
            <li className="anatomy-depth-1">
              <code>Board</code>
              <span>Frame, spacing, labels, and grid</span>
            </li>
            <li className="anatomy-depth-2">
              <code>Header</code>
              <span>Optional board title</span>
            </li>
            <li className="anatomy-depth-2">
              <code>Row</code>
              <span>One horizontal record</span>
            </li>
            <li className="anatomy-depth-3">
              <code>Group</code>
              <span>Optional adjacent region with shared settings</span>
            </li>
            <li className="anatomy-depth-3">
              <code>Cell / WideCell</code>
              <span>One independently driven cassette</span>
            </li>
          </ul>
        </section>

        <section id="motion" className="doc-section">
          <h2>Motion</h2>
          <p>Both adapters drive the same component structure and preserve the same visuals.</p>
          <div className="option-list">
            <div>
              <code>riffle()</code>
              <span>Lightweight randomized flipping, suitable for dense boards.</span>
            </div>
            <div>
              <code>cascade()</code>
              <span>CSS 3D leaf motion that cascades across rows.</span>
            </div>
          </div>
        </section>

        <section id="customization" className="doc-section">
          <h2>Customization</h2>
          <p>
            Board, Row, Group, and Cell accept ordinary className values. Font family, weight, and
            style inherit into glyphs; set responsive size directly on Cell. CSS classes and
            Tailwind utilities work directly. Use stable anatomy selectors only for non-inheritable
            surfaces such as faces.
          </p>
          <CodeBlock html={highlightedCode.customization} />
        </section>

        <section id="sound" className="doc-section">
          <h2>Sound</h2>
          <p>
            Sound is optional and ships without audio assets. Supply your own click and settle
            samples, then pass <code>mechanicalSound(...)</code> to Root.
          </p>
          <CodeBlock html={highlightedCode.sound} />
        </section>

        <section id="performance" className="doc-section">
          <h2>Performance</h2>
          <p>
            Stable optional row and group IDs preserve cassette state. Updates animate only cells
            whose resolved deck position changed.
          </p>
          <ul>
            <li>Tree-shakeable motion engines and independently imported looks</li>
            <li>No runtime style injection</li>
            <li>Controlled cassette concurrency</li>
            <li>Canvas-assisted riffle rendering for dense boards</li>
          </ul>
        </section>

        <section id="api" className="doc-section">
          <h2>API</h2>
          <div className="api-list">
            <code>@thecuvii/flapkit</code>
            <code>@thecuvii/flapkit/sound</code>
            <code>@thecuvii/flapkit/flapkit.css</code>
            <code>@thecuvii/flapkit/airport.css</code>
            <code>@thecuvii/flapkit/industrial.css</code>
          </div>
          <a className="readme-link" href="https://github.com/thecuvii/flapkit#readme">
            Full API reference on GitHub <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
    </div>
  )
}
