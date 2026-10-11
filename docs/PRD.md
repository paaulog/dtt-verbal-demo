# PRD: Demo de software DTT para operantes verbais

| Campo | Valor |
|---|---|
| Produto | Demo de ferramenta de ensino estruturado (DTT) e registro de dados para operantes verbais |
| Autor | Paulo |
| Versão | 0.1 (rascunho para a demo no GitHub) |
| Data | 11/10/2026 |
| Status | Aguardando respostas do questionário da psicóloga |
| Base | Relatório "Software DTT operantes verbais" (pesquisa de 11/10/2026) |

## 1. Contexto

A pesquisa mostrou que a versão defensável do produto coloca um adulto conduzindo cada sessão e confirmando cada resposta. O software apresenta estímulos, sequencia alvos, aplica dicas e esvanecimento, calcula domínio e gera gráficos por operante. Um app em que a criança aprende fala sozinha tem evidência fraca, depende de reconhecimento de fala pouco confiável em PT-BR infantil e esbarra nas recomendações de tempo de tela da SBP.

No Brasil já existem plataformas de registro ABA (ABAPlay, Neoaba, ABA Digital, Abraço, TABA). A diferenciação buscada é unir, num mesmo produto, tela de estímulos para a criança, estímulos nativos em PT-BR, registro por operante verbal e funcionamento offline.

## 2. Objetivo da demo

A demo existe para três coisas:

1. **Validar o fluxo com a psicóloga**: ela precisa ver uma sessão DTT rodando para responder o questionário com mais precisão e apontar o que está errado clinicamente.
2. **Provar a viabilidade técnica** do núcleo: motor de tentativas, dicas, esvanecimento, domínio e gráficos, offline, num tablet ou celular.
3. **Servir de portfólio** público no GitHub.

A demo **não** é um produto para uso clínico. Ela roda só com dados fictícios.

### Fora do objetivo da demo
- Uso com pacientes reais ou qualquer dado pessoal real.
- Contas, login, nuvem, sincronização entre aparelhos.
- Reconhecimento de fala.
- Conteúdo do VB-MAPP, ABLLS-R ou outros protocolos licenciados.

## 3. Usuários da demo

| Persona | Uso na demo |
|---|---|
| Psicóloga avaliadora (responsável técnica) | Configura programas, roda uma sessão de teste, analisa gráficos, critica parâmetros |
| Aplicador simulado | Conduz a sessão pela tela do adulto |
| Criança simulada | Vê a tela de estímulos (na demo, a própria avaliadora ou Paulo fazem esse papel) |
| Recrutador ou visitante do GitHub | Abre a demo publicada e navega com dados de exemplo |

## 4. Princípios de produto

1. **O profissional decide, o adulto executa, o software organiza e mede.** Nenhuma regra clínica muda sozinha. O software sugere, a responsável técnica aprova.
2. **Alvo é o par estímulo + operante.** "Bola" como tato e "bola" como mando são alvos distintos.
3. **Todo parâmetro clínico é configurável** e mostra de onde veio o valor-padrão.
4. **Assentimento e dose são recursos de produto**, não recomendação em texto.
5. **Nada de design de engajamento**: sem sequências diárias, recompensa por tempo de uso, caixas de recompensa ou reprodução automática.
6. **Offline primeiro**: tudo funciona sem internet depois do primeiro carregamento.

## 5. Escopo funcional

Convenção: **[P]** pendente de validação da psicóloga; os valores entre colchetes são padrões provisórios da demo.

### 5.1 Aprendiz fictício
- **RF-01**: A demo vem com 1 aprendiz fictício pré-carregado ("Aprendiz Demo"), com programas e histórico de 10 sessões simuladas para os gráficos terem conteúdo.
- **RF-02**: Botão "Restaurar dados de exemplo" apaga tudo e recarrega o estado inicial.
- **RF-03**: Banner fixo: "Demonstração. Não use com pacientes nem insira dados reais."

### 5.2 Biblioteca de programas e alvos
- **RF-04**: Operantes suportados na demo: **ouvinte**, **tato**, **ecoico**, **intraverbal** e **mando**.
- **RF-05**: Cada alvo tem: operante, SD (texto exibido e texto falado por síntese de voz PT-BR), 3 exemplares visuais [P: mínimo de exemplares], resposta esperada e variações aceitas, programa a que pertence, estado.
- **RF-06**: Estados do alvo: `linha_de_base → aquisicao → dominado → manutencao`. A demo não implementa `generalizado` automaticamente; a psicóloga marca manualmente após sonda fora da tela.
- **RF-07**: Campo "referência externa" de texto livre (ex.: "VB-MAPP Tato 5"), sem reproduzir conteúdo do protocolo.
- **RF-08**: Biblioteca inicial com cerca de 20 alvos em PT-BR em categorias do cotidiano (animais, comida, objetos, ações), usando ilustrações próprias ou de licença aberta.
- **RF-09**: Sem programas de contato visual, "mãos quietas" ou obediência na biblioteca.

### 5.3 Configuração do programa (tela da responsável técnica)
- **RF-10**: Hierarquia de dicas editável, até 8 níveis, ordenada do mais ao menos intrusivo. Padrões:
  - Vocais (tato, ecoico, intraverbal, mando): modelo ecoico total, ecoico parcial, dica por figura, independente.
  - Ouvinte: destaque visual, redução de campo, gestual, independente.
- **RF-11**: Escolha de quais níveis contam como acerto para domínio [padrão: só independente].
- **RF-12**: Estratégias de esvanecimento disponíveis:
  - Do mais para o menos intrusivo: desce um nível após N acertos consecutivos [N=2, P].
  - Do menos para o mais intrusivo: sobe um nível após erro ou sem resposta.
  - Atraso constante: 0 s nas primeiras K tentativas [K=4, P], depois X s [X=4, P].
  - Atraso progressivo: 0, 1, 2, 3, 4 s, avançando após acerto [P].
- **RF-13**: Parâmetros de tempo: latência máxima [5 s, P] e intervalo entre tentativas (ITI) [2 s, P].
- **RF-14**: Correção de erro, uma opção por programa [P]:
  - Reiniciar do SD com dica do nível acima.
  - Dar a dica e registrar como tentativa com dica.
  - Seguir para a próxima tentativa com menos ajuda.
  - Limite de repetições após erro [2].
- **RF-15**: Critério de domínio por programa: percentual [90%, P], sessões consecutivas [2, P], base de cálculo (todas as tentativas ou primeira tentativa da sessão) [primeira tentativa, P].
- **RF-16**: Agenda de manutenção após domínio: sondas em 1, 2 e 4 semanas [P]. Falha na sonda devolve o alvo à aquisição.
- **RF-17**: Toda tela de parâmetro mostra a etiqueta "padrão provisório da demo, pendente de validação clínica".

### 5.4 Sessão conduzida
- **RF-18**: Modo de tela única dividida em duas áreas: área da criança (estímulo grande, centralizada) e barra do adulto (fixa, embaixo ou na lateral, com controles discretos). Em tablet na horizontal, a barra fica à direita.
- **RF-19**: Fluxo de cada tentativa:
  1. O software sugere o próximo alvo pela regra de intercalação.
  2. O adulto confirma que a criança está disponível (botão "pronto").
  3. A área da criança mostra o estímulo e toca o SD por voz sintetizada.
  4. Se a regra pede dica, o software aplica a dica no tempo definido (áudio-modelo, destaque da figura, redução de campo) ou mostra ao adulto a instrução da dica física ou gestual.
  5. Resultado:
     - Ouvinte: a criança toca na figura e o software pontua.
     - Operantes vocais: o adulto toca em "correta", "incorreta" ou "sem resposta"; o nível de dica já vem preenchido.
  6. Consequência: animação curta de reforço (configurável, pode ser desligada) ou instrução "entregue o item".
  7. ITI e próxima tentativa.
- **RF-20**: No máximo 2 toques do adulto por tentativa de operante vocal.
- **RF-21**: Intercalação: alterna alvos em aquisição com alvos dominados na proporção [1 dominado a cada 3 em aquisição, P]. Evita dois alvos seguidos com o mesmo som inicial no mesmo bloco.
- **RF-22**: Ouvinte: 2 a 4 figuras de comparação [3, P], posições sorteadas a cada tentativa, distrator nunca idêntico ao alvo.
- **RF-23**: Mando: a tela não apresenta SD verbal. Mostra ao adulto a orientação para criar a oportunidade (ex.: "deixe o item à vista e fora do alcance") e, após o mando, a instrução "entregue [item] agora". O adulto registra se foi espontâneo ou com dica.
- **RF-24**: Tentativa de transferência (ecoico para tato): disponível como tipo de tentativa quando o alvo de tato tem o ecoico correspondente dominado [P].
- **RF-25**: Desfazer a última tentativa registrada.

### 5.5 Assentimento e dose
- **RF-26**: Botão "pausa" sempre visível na área da criança, grande, que interrompe a sessão na hora e registra o evento.
- **RF-27**: Botão "sinal de retirada de assentimento" na barra do adulto: pausa a sessão e registra o evento com o sinal observado (lista configurável).
- **RF-28**: Desengajamento detectado (3 tentativas seguidas sem resposta [P]) gera sugestão de pausa. Nunca aumenta dica ou repetição automaticamente.
- **RF-29**: Limite de tentativas por sessão [30, P] e de minutos por sessão [10, P]. Ao atingir, a sessão encerra com aviso.
- **RF-30**: Reforçadores digitais presos à resposta da tentativa. Proibido: sequência de dias, recompensa por abrir o app, recompensa aleatória, autoplay.

### 5.6 Reforçadores
- **RF-31**: Lista de reforçadores do aprendiz (digitais e físicos), com ranking manual.
- **RF-32**: Avaliação de preferência MSWO guiada: o software mostra a sequência, o adulto registra a escolha, o ranking é calculado. Para itens físicos, o software só registra.
- **RF-33**: Reforço diferencial opcional: resposta independente recebe o item do topo do ranking, resposta com dica recebe elogio [P].
- **RF-34**: Ajuste por aprendiz de som, intensidade de animação e duração do reforçador; modo de baixa estimulação.

### 5.7 Dados e gráficos
- **RF-35**: Registro de cada tentativa conforme o modelo da seção 7.
- **RF-36**: Gráfico por alvo: percentual de acerto independente por sessão, linha do critério e linhas de mudança de fase.
- **RF-37**: Gráfico por nível de dica: distribuição dos níveis por sessão (área empilhada).
- **RF-38**: Painel por operante: alvos dominados acumulados para cada operante.
- **RF-39**: Alerta de dependência de dica: alvo há mais de K sessões [K=4, P] no mesmo nível sugere revisão. Não altera nada sozinho.
- **RF-40**: Exportar todos os dados em CSV e um resumo da sessão em PDF ou página imprimível.

### 5.8 Acessibilidade e interface
- **RF-41**: Interface em PT-BR, linguagem literal.
- **RF-42**: Área da criança com um estímulo por tela, posições fixas de botões, paleta de baixa saturação, sem transições inesperadas.
- **RF-43**: WCAG 2.2 AA na interface do adulto (contraste, foco visível, alvos de toque de no mínimo 44 px, navegação por teclado).
- **RF-44**: Funciona em celular (retrato) e tablet (paisagem).

## 6. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | PWA instalável, funcionando offline após o primeiro acesso |
| RNF-02 | Todos os dados ficam no aparelho (IndexedDB). Nada é enviado a servidor |
| RNF-03 | Sem analytics, cookies de rastreamento ou bibliotecas de terceiros que coletem dados |
| RNF-04 | Motor clínico (dicas, esvanecimento, domínio, intercalação) em funções puras, sem dependência de interface, com testes automatizados |
| RNF-05 | Cobertura de testes do motor clínico de pelo menos 90% das linhas |
| RNF-06 | Resposta visual a um toque em menos de 100 ms em aparelho intermediário |
| RNF-07 | Deploy automático no GitHub Pages a cada push na branch principal |
| RNF-08 | Licença de código aberto para o código (MIT sugerida). Ilustrações com licença compatível e crédito no README |
| RNF-09 | Voz por síntese do próprio navegador (Web Speech API, voz pt-BR). Sem gravação de áudio |

## 7. Modelo de dados

```
Aprendiz
  id, apelido, criado_em

Programa
  id, aprendiz_id, nome, operante (ouvinte | tato | ecoico | intraverbal | mando)
  hierarquia_dicas: [NivelDica]          # ordem do mais ao menos intrusivo
  niveis_que_contam_como_acerto: [id]
  esvanecimento: { estrategia, parametros }
  latencia_max_s, iti_s
  correcao_erro: { estrategia, max_repeticoes }
  criterio_dominio: { percentual, sessoes_consecutivas, base }
  agenda_manutencao_dias: [7, 14, 28]
  limites: { tentativas_sessao, minutos_sessao }

NivelDica
  id, nome, tipo (audio_total | audio_parcial | figura | destaque | reducao_campo | gestual | fisica | independente)
  executado_por (software | adulto)

Alvo
  id, programa_id, rotulo, sd_texto, sd_fala
  exemplares: [url_imagem]
  respostas_aceitas: [texto]
  estado (linha_de_base | aquisicao | dominado | manutencao | generalizado)
  nivel_dica_atual, referencia_externa
  historico_estados: [{estado, data, motivo}]

Sessao
  id, aprendiz_id, inicio, fim, conduzida_por, contexto (tela | mesa)
  encerramento (normal | limite | pausa | retirada_assentimento)

Tentativa
  id, sessao_id, alvo_id, operante, tipo (ensino | sonda | transferencia | manutencao | intercalada)
  exemplar, posicoes, nivel_dica, atraso_dica_s, latencia_ms
  resultado (correta | incorreta | sem_resposta)
  independente (bool), correcao_aplicada, reforcador_id, timestamp

EventoAssentimento
  id, sessao_id, tipo (pausa_crianca | retirada_sinal | desengajamento), sinal, timestamp

Reforcador
  id, aprendiz_id, nome, tipo (digital | fisico), rank, ativo
```

## 8. Regras do motor clínico

Estas regras viram testes unitários antes do código de interface (spec-driven).

1. **Seleção do próximo alvo**: entre alvos em `aquisicao`, escolhe o menos apresentado na sessão; a cada 3 tentativas de aquisição insere 1 de alvo `dominado` ou `manutencao`; nunca repete o mesmo alvo mais de 2 vezes seguidas, salvo correção de erro; evita som inicial igual ao da tentativa anterior quando houver alternativa.
2. **Nível de dica da tentativa**: derivado da estratégia de esvanecimento e do histórico recente do alvo.
3. **Atraso de dica**: atraso constante e progressivo calculados a partir das tentativas anteriores do alvo.
4. **Correção de erro**: após resultado `incorreta` ou `sem_resposta`, gera a tentativa de correção conforme a estratégia, até `max_repeticoes`; depois segue o fluxo normal.
5. **Pontuação de domínio**: por sessão, calcula percentual sobre a base escolhida, contando como acerto só respostas corretas em níveis marcados como acerto. Domínio quando atinge o percentual em N sessões consecutivas com pelo menos 1 tentativa válida em cada.
6. **Transição de estado**: `linha_de_base → aquisicao` manual; `aquisicao → dominado` automática pela regra 5, com registro do motivo; `dominado → manutencao` automática; falha em sonda de manutenção volta para `aquisicao`.
7. **Desengajamento**: 3 resultados `sem_resposta` seguidos geram sugestão de pausa.
8. **Limites**: ao atingir tentativas ou minutos máximos, a sessão encerra.
9. **Alerta de dependência de dica**: mesmo nível por K sessões gera alerta.

## 9. Proposta técnica

Decisão final do Paulo. Recomendação abaixo.

| Opção | Prós | Contras |
|---|---|---|
| **A. React + TypeScript + Vite, PWA estática no GitHub Pages** (recomendada) | Roda offline num tablet sem servidor; deploy grátis; link público para a psicóloga abrir no celular; motor em TS puro fácil de testar com Vitest | Não é Python |
| B. Python (FastAPI) + HTMX | Linguagem principal do Paulo; código do motor reutilizável num backend futuro | Precisa de servidor para a demo funcionar; offline fica difícil; GitHub Pages não hospeda |
| C. Python no navegador (PyScript/Pyodide) | Python e hospedagem estática | Carregamento inicial pesado em celular; ecossistema de UI imaturo; pior experiência para a psicóloga |

Pilha sugerida para a opção A: Vite, React, TypeScript, Dexie (IndexedDB), vite-plugin-pwa, Recharts ou visx para gráficos, Vitest para testes, GitHub Actions para CI e deploy no Pages.

Estrutura de pastas sugerida:

```
/docs           PRD, decisões, respostas do questionário
/src/engine     motor clínico em funções puras + testes
/src/data       esquema Dexie, seed do aprendiz demo
/src/features   programas, sessão, gráficos, reforçadores
/src/ui         componentes de interface
/public/stimuli ilustrações dos alvos
```

## 10. Critérios de aceite da demo

1. A psicóloga abre o link no celular ou tablet, instala ou usa direto, e roda uma sessão de 10 tentativas de ouvinte e tato sem ajuda de Paulo.
2. Desligando a internet depois do primeiro acesso, uma sessão completa funciona e os dados persistem após fechar o navegador.
3. Mudar o critério de domínio de 90% para 80% numa tela de programa altera o estado dos alvos no histórico simulado, e o gráfico mostra a nova linha.
4. O botão de pausa interrompe a sessão em qualquer etapa da tentativa e o evento aparece no registro.
5. O CSV exportado tem uma linha por tentativa com todos os campos da seção 7.
6. Todos os testes do motor passam na CI e o deploy no GitHub Pages acontece a cada push na branch principal.
7. README explica o objetivo, o aviso de que não é ferramenta clínica, como rodar localmente e as licenças das ilustrações.

## 11. Riscos e mitigações

| Risco | Mitigação na demo |
|---|---|
| Psicóloga discordar de parâmetros-padrão | Tudo configurável e etiquetado como provisório; seção de decisões em `/docs` |
| Demo ser usada com criança real | Banner fixo, sem campos de dados pessoais, README explícito |
| Ilustrações com direitos autorais | Usar só ilustrações próprias ou de licença aberta com crédito |
| Voz sintetizada pt-BR indisponível no aparelho | Detectar e mostrar o SD em texto com aviso; testar em Android e iOS |
| Interpretação como "terapia digital" | Linguagem do README e da interface descrevendo ferramenta de ensino e registro para profissionais |
| Engano sobre reconhecimento de fala | Demo não tem ASR; o adulto sempre pontua operantes vocais |

## 12. Entregas em sequência

Cada etapa depende da anterior.

1. Repositório, CI, deploy vazio no Pages, README com aviso.
2. Motor clínico com testes (regras da seção 8).
3. Banco local, seed do aprendiz demo e biblioteca de alvos.
4. Tela de sessão conduzida (ouvinte e tato primeiro, depois ecoico, intraverbal e mando).
5. Pausa, assentimento e limites.
6. Configuração de programas.
7. Gráficos e exportação.
8. Reforçadores e MSWO.
9. PWA offline e revisão de acessibilidade.
10. Rodada com a psicóloga e registro das decisões em `/docs/decisoes.md`.

## 13. Questões em aberto

- Valores clínicos marcados [P], a serem definidos pelas respostas do questionário.
- Se o modo de prática supervisionada pela criança entra numa versão futura.
- Quais programas poderiam ser liberados para cuidadores numa versão real.
- Nome do produto.
- Consulta regulatória (ANVISA) e jurídica (VB-MAPP) antes de qualquer uso real.
