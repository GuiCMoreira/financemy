/**
 * Mostrada quando `SENHA_ACESSO` não está definida.
 *
 * Existe para que a falta de configuração seja um erro claro e acionável, e
 * não uma aplicação que sobe aberta para a internet sem ninguém perceber.
 */
export default function ConfiguracaoPendente() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-md rounded-bloco bg-superficie p-6">
        <p className="text-lg font-bold text-texto">Falta configurar o acesso</p>

        <p className="mt-3 text-sm text-texto-suave">
          A variável <code className="font-mono text-texto">SENHA_ACESSO</code> não está
          definida. Enquanto isso, o Caixa não libera nenhuma tela — seus dados
          financeiros ficariam abertos a quem descobrisse o endereço.
        </p>

        <p className="mt-4 text-sm text-texto-suave">Defina a senha no seu <code className="font-mono text-texto">.env</code>:</p>

        <pre className="mt-2 overflow-x-auto rounded-card bg-fundo p-3 text-xs text-texto">
          <code>SENHA_ACESSO=&quot;uma senha longa e única&quot;</code>
        </pre>

        <p className="mt-4 text-xs text-texto-suave">
          Em produção, configure-a nas variáveis de ambiente da plataforma e reinicie a
          aplicação. Trocar a senha encerra todas as sessões ativas.
        </p>
      </div>
    </main>
  )
}
