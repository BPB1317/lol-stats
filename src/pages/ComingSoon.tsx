// Écran provisoire des sections livrées aux étapes suivantes
export function ComingSoon({ what, step }: { what: string; step: string }) {
  return (
    <main className="px-4 py-10 md:px-6">
      <div className="panel max-w-xl p-5">
        <div className="text-sm font-semibold">{what}</div>
        <p className="mt-1 text-sm text-muted">Cet écran arrive à l'étape {step} de la refonte.</p>
      </div>
    </main>
  )
}
