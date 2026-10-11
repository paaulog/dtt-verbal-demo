import { DEMO_NOTICE } from './engine/notice'

export default function App() {
  return (
    <>
      <div className="demo-banner" role="alert">
        {DEMO_NOTICE}
      </div>
      <main className="shell">
        <h1>DTT Verbal Demo</h1>
        <p>
          Demonstração de uma ferramenta de ensino por tentativas discretas (DTT) para operantes
          verbais: ouvinte, tato, ecoico, intraverbal e mando.
        </p>
        <p>
          Um adulto conduz cada sessão e confirma as respostas. O software apresenta os estímulos,
          aplica dicas e esvanecimento, calcula o critério de domínio e gera gráficos.
        </p>
        <p className="status">Etapa 1 de 10: estrutura, CI e publicação.</p>
      </main>
    </>
  )
}
