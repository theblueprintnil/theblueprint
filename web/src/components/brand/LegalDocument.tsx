type LegalSection = {
  heading: string
  paragraphs: string[]
}

type LegalDocumentProps = {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

export function LegalDocument({ title, updated, intro, sections }: LegalDocumentProps) {
  return (
    <div className="hero-gradient">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand">
          The Blueprint
        </span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Last updated: {updated}
        </p>
        <p className="mt-6 leading-relaxed text-muted-foreground">{intro}</p>
        <div className="mt-10 space-y-10">
          {sections.map((section, index) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-bold text-ink">
                {index + 1}. {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="mt-3 leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
