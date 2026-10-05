'use client'

import { usarPreferencias } from './Preferencias'

const botao =
  'grid size-10 place-items-center rounded-full text-white transition-colors hover:bg-white/15'

export function AcoesTopo() {
  const { oculto, alternarOculto, tema, alternarTema } = usarPreferencias()

  return (
    <div className="flex items-center gap-6">
      <button
        type="button"
        onClick={alternarOculto}
        className={botao}
        aria-pressed={oculto}
        title={oculto ? 'Mostrar valores' : 'Ocultar valores'}
      >
        <span className="sr-only">{oculto ? 'Mostrar valores' : 'Ocultar valores'}</span>
        {oculto ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a11 11 0 01-2.4 3.3M6.2 6.8C3.9 8.3 3 10.4 3 12c0 2.5 4 7 9 7 1.3 0 2.4-.3 3.5-.7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={alternarTema}
        className={botao}
        title={tema === 'claro' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      >
        <span className="sr-only">
          {tema === 'claro' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        </span>
        {tema === 'claro' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
