type Props = {
  titulo?: string
  acessorio?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * Card no padrão do arquivo mobile: fundo cinza claro sobre branco, raio 12px,
 * sem sombra. A separação vem do contraste de superfície, não de elevação.
 */
export function Cartao({ titulo, acessorio, children, className = '' }: Props) {
  return (
    <section className={`rounded-card bg-superficie p-5 ${className}`}>
      {(titulo || acessorio) && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {titulo && <h2 className="text-lg font-bold text-texto">{titulo}</h2>}
          {acessorio && (
            <span className="text-xs font-medium text-texto-suave">{acessorio}</span>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
