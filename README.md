# DTT Verbal Demo

Demonstração de uma ferramenta de ensino por tentativas discretas (DTT, *discrete trial training*) para operantes verbais, baseada na Análise do Comportamento Aplicada (ABA).

> **Aviso.** Este projeto é uma demonstração técnica e de portfólio. Não é uma ferramenta clínica, não foi validado clinicamente e não deve ser usado com pacientes nem receber dados pessoais reais. Todos os dados são fictícios e ficam apenas no seu aparelho.

## O que a demo faz

Um adulto conduz cada sessão e confirma as respostas. O software:

- apresenta os estímulos na tela da criança (ouvinte, tato, ecoico, intraverbal e mando);
- aplica a hierarquia de dicas e a estratégia de esvanecimento configuradas;
- calcula o critério de domínio e agenda sondas de manutenção;
- registra cada tentativa e gera gráficos por alvo e por operante;
- oferece botão de pausa sempre visível, registro de retirada de assentimento e limites de tentativas e minutos.

Não há reconhecimento de fala: o adulto pontua as respostas vocais. Não há conteúdo de protocolos licenciados (VB-MAPP, ABLLS-R etc.).

O escopo completo está em [`docs/PRD.md`](docs/PRD.md).

## Rodar localmente

Requer Node.js 22.

```bash
npm install
npm run dev     # servidor de desenvolvimento
npm test        # testes do motor clínico
npm run build   # build de produção
```

## Publicação

Cada push na branch `main` roda os testes e publica no GitHub Pages pelo workflow em `.github/workflows/deploy.yml`.

## Licença

Código sob licença MIT. Créditos e licenças das ilustrações serão listados aqui quando forem adicionadas.
