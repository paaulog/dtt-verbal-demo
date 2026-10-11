# DTT Verbal Demo

Demonstração de uma ferramenta de ensino por tentativas discretas (DTT, *discrete trial training*) para operantes verbais, baseada na Análise do Comportamento Aplicada (ABA).

**Demo publicada:** https://paaulog.github.io/dtt-verbal-demo/

> **Aviso.** Este projeto é uma demonstração técnica e de portfólio. Não é uma ferramenta clínica, não foi validado clinicamente e não deve ser usado com pacientes nem receber dados pessoais reais. Todos os dados são fictícios e ficam apenas no seu aparelho.

## Princípio

O profissional decide, o adulto executa, o software organiza e mede. Um adulto conduz cada sessão e confirma cada resposta vocal. Não há reconhecimento de fala nem modo em que a criança aprende sozinha.

## O que a demo faz

- **Sessão conduzida** com área da criança (estímulo) e barra do adulto (instrução, dica planejada, pontuação). Funciona em tablet na horizontal e em celular na vertical.
- **Cinco operantes:** ouvinte (a criança toca na figura), tato, ecoico, intraverbal e mando (o app orienta a criar a oportunidade e indica o item a entregar).
- **Hierarquia de dicas editável** (até 8 níveis) e quatro estratégias de esvanecimento: do mais para o menos intrusivo, do menos para o mais intrusivo, atraso constante e atraso progressivo.
- **Correção de erro** configurável, com limite de repetições.
- **Critério de domínio** configurável (percentual, sessões consecutivas, base de cálculo) e sondas de manutenção agendadas. Os estados dos alvos são recalculados a partir do histórico, então mudar o critério mostra na hora o efeito.
- **Intercalação** de alvos dominados, rotação de exemplares e posições, e regra para evitar alvos seguidos com o mesmo som inicial.
- **Assentimento e dose:** botão de pausa sempre visível para a criança, registro de sinais de retirada de assentimento, sugestão de pausa após 3 tentativas sem resposta e limites de tentativas e minutos por sessão.
- **Reforçadores** com ranking, reforço diferencial e avaliação de preferência MSWO guiada. Sem sequências diárias, recompensas aleatórias ou reprodução automática.
- **Gráficos** por alvo (acerto por sessão com linha de critério e mudanças de fase; níveis de dica por sessão), visão em tabela, alertas de dependência de dica e sondas vencidas.
- **Exportação** em CSV (uma linha por tentativa) e resumo de sessão para impressão ou PDF.
- **Offline:** PWA instalável; os dados ficam no IndexedDB do navegador.
- **Dados de exemplo:** 10 sessões simuladas pelo próprio motor clínico, restauráveis na aba Dados.

Todos os parâmetros clínicos são **padrões provisórios** e estão pendentes de validação por profissional habilitado. O escopo completo e as questões em aberto estão em [`docs/PRD.md`](docs/PRD.md).

## Fora desta demo

- Reconhecimento de fala.
- Tentativas de transferência entre operantes (por exemplo, ecoico para tato), previstas no PRD como pendentes de validação.
- Contas, nuvem e sincronização entre aparelhos.
- Conteúdo de protocolos licenciados (VB-MAPP, ABLLS-R etc.). Há só um campo de referência externa digitado pelo profissional.

## Arquitetura

```
src/engine     motor clínico em funções puras, sem dependência de interface, com testes
src/data       banco local (Dexie), biblioteca de alvos e simulação do histórico
src/features   telas: início, sessão, programas, gráficos, reforçadores, dados
docs/PRD.md    requisitos da demo
```

## Rodar localmente

Requer Node.js 22.

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm test           # testes do motor clínico e do banco local
npm run coverage   # cobertura do motor
npm run build      # build de produção
```

## Publicação

Cada push na branch `main` roda os testes, faz o build e publica no GitHub Pages pelo workflow em `.github/workflows/deploy.yml`. Em **Settings → Pages**, a origem precisa estar em **GitHub Actions**.

## Licença e créditos

Código sob licença MIT. Os estímulos visuais são emoji renderizados pela fonte do próprio sistema operacional; o projeto não distribui arquivos de imagem de terceiros. A voz é a síntese de fala do navegador.
