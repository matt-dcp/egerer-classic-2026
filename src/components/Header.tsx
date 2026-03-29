export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <header className="bg-forest text-white px-4 pt-4 pb-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {title || 'Egerer Classic'}
      </h1>
      {subtitle && <p className="text-cream/70 text-sm mt-0.5">{subtitle}</p>}
    </header>
  )
}
