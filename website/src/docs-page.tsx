import * as stylex from '@stylexjs/stylex'
import { createSplitFlapDeck, SplitFlapGrid, type SplitFlapSource } from '@thecuvii/flapkit'
import { SplitFlapCascade } from '@thecuvii/flapkit/cascade'
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'
import { industrialWallLook } from '@thecuvii/flapkit/looks/industrial'
import { SplitFlapRiffle } from '@thecuvii/flapkit/riffle'
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

const previewSource: SplitFlapSource = {
  columns: [{ id: 'status', label: 'STATUS', cells: 8 }],
  rows: [
    { id: 'package', values: { status: 'FLAPKIT' } },
    { id: 'state', values: { status: 'READY' } },
  ],
}

const unicodePreviewSource: SplitFlapSource = {
  columns: [
    {
      id: 'local',
      label: 'LOCAL',
      cells: 4,
      flapDeck: createSplitFlapDeck(' 東京大阪成田羽田出発到着搭乗'),
    },
  ],
  rows: [
    { id: 'primary', values: { local: '東京出発' } },
    { id: 'secondary', values: { local: '大阪搭乗' } },
  ],
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
  const lookProps = stylex.props(airportBoardLook)

  return (
    <div className="component-preview">
      <div
        {...lookProps}
        className={[lookProps.className, 'preview-board'].filter(Boolean).join(' ')}
      >
        <SplitFlapRiffle source={previewSource}>
          <SplitFlapGrid aria-label="Flapkit ready status" />
        </SplitFlapRiffle>
      </div>
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
  const airportProps = stylex.props(airportBoardLook)
  const industrialProps = stylex.props(industrialWallLook)
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

  const preview =
    activeTab === 'cascade' ? (
      <div
        {...industrialProps}
        className={[industrialProps.className, 'preview-board'].filter(Boolean).join(' ')}
      >
        <SplitFlapCascade source={previewSource}>
          <SplitFlapGrid aria-label="Cascade package status" />
        </SplitFlapCascade>
      </div>
    ) : (
      <div
        {...airportProps}
        className={[airportProps.className, 'preview-board'].filter(Boolean).join(' ')}
      >
        <SplitFlapRiffle source={activeTab === 'unicode' ? unicodePreviewSource : previewSource}>
          <SplitFlapGrid
            aria-label={activeTab === 'unicode' ? 'Unicode local service' : 'Riffle package status'}
          />
        </SplitFlapRiffle>
      </div>
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
          <p>Install Flapkit with StyleX. React 19 and StyleX 0.19 are peer dependencies.</p>
          <CodeBlock html={highlightedCode.installation} />
          <p>
            Flapkit ships ESM and keeps StyleX authoring calls intact. Configure the StyleX plugin
            to compile <code>@thecuvii/flapkit</code> with your application.
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
            Source data, motion, board composition, and visual treatment are separate. Combine only
            the parts your interface needs.
          </p>
          <CodeBlock html={highlightedCode.composition} />
        </section>

        <section id="anatomy" className="doc-section">
          <h2>Anatomy</h2>
          <p>
            Flapkit is composed from small layers. The look supplies visual variables, the effect
            owns motion state, and the rendered parts remain interchangeable.
          </p>
          <ul className="anatomy" aria-label="Flapkit component anatomy">
            <li>
              <code>Look</code>
              <span>Theme variables on an ancestor</span>
            </li>
            <li className="anatomy-depth-1">
              <code>Motion effect</code>
              <span>Source resolution and cassette runtime</span>
            </li>
            <li className="anatomy-depth-2">
              <code>Board</code>
              <span>Frame, header, labels, and grid</span>
            </li>
            <li className="anatomy-depth-3">
              <code>Grid</code>
              <span>Rows and physical cassettes</span>
            </li>
            <li className="anatomy-depth-2">
              <code>Sound</code>
              <span>Optional mechanical event listener</span>
            </li>
          </ul>
        </section>

        <section id="motion" className="doc-section">
          <h2>Motion</h2>
          <p>Both engines share the same source and presentation components.</p>
          <div className="option-list">
            <div>
              <code>@thecuvii/flapkit/riffle</code>
              <span>Lightweight randomized flipping, suitable for dense boards.</span>
            </div>
            <div>
              <code>@thecuvii/flapkit/cascade</code>
              <span>CSS 3D leaf motion that cascades across rows.</span>
            </div>
          </div>
        </section>

        <section id="customization" className="doc-section">
          <h2>Customization</h2>
          <p>
            Import a tree-shakeable built-in look or create a StyleX theme from the public variable
            contract.
          </p>
          <CodeBlock html={highlightedCode.customization} />
        </section>

        <section id="sound" className="doc-section">
          <h2>Sound</h2>
          <p>
            Sound is optional and ships without audio assets. Supply your own click and settle
            samples.
          </p>
          <CodeBlock html={highlightedCode.sound} />
        </section>

        <section id="performance" className="doc-section">
          <h2>Performance</h2>
          <p>
            Stable row and column IDs preserve cassette state. Updates animate only cells whose
            resolved deck position changed.
          </p>
          <ul>
            <li>Tree-shakeable motion engines and looks</li>
            <li>No runtime style injection</li>
            <li>Controlled cassette concurrency</li>
            <li>Canvas-assisted riffle rendering for dense boards</li>
          </ul>
        </section>

        <section id="api" className="doc-section">
          <h2>API</h2>
          <div className="api-list">
            <code>@thecuvii/flapkit</code>
            <code>@thecuvii/flapkit/riffle</code>
            <code>@thecuvii/flapkit/cascade</code>
            <code>@thecuvii/flapkit/look</code>
            <code>@thecuvii/flapkit/sound</code>
          </div>
          <a className="readme-link" href="https://github.com/thecuvii/flapkit#readme">
            Full API reference on GitHub <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
    </div>
  )
}
