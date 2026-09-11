# /Codecriar — ALMOX LAB

## Objetivo

`/Codecriar` é o protocolo de execução do ALMOX LAB. A partir deste comando, o trabalho deve avançar em blocos completos, sem exigir que o usuário dite cada microetapa.

## Regra principal

Não perguntar "e agora?" entre etapas que já façam parte do objetivo atual. O processo deve analisar → planejar → construir → validar → gerar prévia → registrar resultado e então apresentar um checkpoint claro.

## Ciclo automático por bloco

1. **Ler o estado atual**
   - branch, arquivos, histórico recente e funcionalidades existentes.
   - identificar dependências e riscos antes de alterar código.

2. **Definir o bloco**
   - escolher o menor conjunto vertical que produza uma funcionalidade demonstrável.
   - preservar regras de negócio, dados e comportamentos úteis do sistema oficial.

3. **Construir o esqueleto**
   - criar a estrutura necessária sem reescrever o sistema inteiro.
   - separar apresentação, domínio, estado, persistência e integrações quando a arquitetura exigir.

4. **Implementar a fatia funcional**
   - não criar telas falsas ou botões sem comportamento.
   - toda ação demonstrada deve produzir um resultado verificável.

5. **Validar automaticamente**
   - verificar sintaxe/build quando aplicável.
   - executar testes disponíveis.
   - validar regras críticas: estoque, entrada, saída, contagem, divergência, reposição, persistência e importação/exportação conforme o bloco.

6. **Gerar prévia**
   - produzir uma versão navegável do bloco.
   - priorizar mobile-first e fluxo operacional real.

7. **Checkpoint**
   - informar o que foi construído.
   - informar o que foi validado.
   - apontar limitações reais, sem fingir que algo foi testado quando não foi.
   - indicar o próximo bloco automaticamente escolhido pelo plano.

## Ordem macro do ALMOX LAB 2.0

### BLOCO 0 — Fundação e contrato
- preservar `main` intacta.
- trabalhar em branch de modernização.
- registrar arquitetura e regras que não podem ser perdidas.
- criar base de validação.

### BLOCO 1 — Shell profissional
- navegação responsiva.
- layout mobile-first.
- dashboard real com dados de estado.
- componentes de feedback e estados vazios/carregando/erro.

### BLOCO 2 — Domínio de estoque
- materiais.
- áreas → subgrupos → materiais.
- estoque atual, mínimo, ideal e quantidade a comprar.
- estados crítico/reposição/OK/pendente de contagem.

### BLOCO 3 — Operações
- entrada.
- saída.
- ajuste.
- histórico transacional.
- proteção contra inconsistências de estoque.

### BLOCO 4 — Contagem
- seleção por área/subgrupo.
- quantidade do sistema.
- quantidade física.
- divergência.
- fechamento da contagem.

### BLOCO 5 — Reposição e decisão
- fila de reposição.
- prioridade.
- justificativa da recomendação.
- preparação para camada de inteligência baseada em dados reais.

### BLOCO 6 — Fornecedores e documentos
- fornecedores.
- importação.
- notas/documentos.
- prévia → validação → confirmação → persistência.

### BLOCO 7 — Importação/exportação
- pipeline de validação.
- duplicidade.
- prévia antes de gravar.
- exportação de dados e relatórios.

### BLOCO 8 — PWA/local-first
- manifest.
- service worker moderno.
- offline.
- persistência local robusta.
- atualização segura da aplicação.

### BLOCO 9 — Inteligência operacional
- consumo.
- anomalias.
- materiais críticos.
- recomendações explicáveis.
- painel de decisão.

### BLOCO 10 — Hardening
- testes de regressão.
- acessibilidade.
- desempenho.
- segurança.
- auditoria final e preparação para merge.

## Regras de segurança do projeto

- Nunca alterar `main` durante experimentação.
- Nunca apagar uma funcionalidade legada sem primeiro mapear seu comportamento.
- Nunca inventar dados como se fossem reais.
- Nunca criar sincronização falsa.
- Nunca criar autenticação falsa só para parecer profissional.
- Nunca copiar identidade ou código de projetos open source; usar apenas padrões e referências.
- Não adicionar biblioteca sem necessidade técnica clara.
- Se uma mudança ameaçar dados ou regras existentes, parar o bloco e registrar o risco em vez de mascará-lo.

## Critério de pronto do bloco

Um bloco só é considerado pronto quando houver:

- estrutura criada;
- funcionalidade demonstrável;
- validação executada;
- prévia disponível;
- resultado registrado;
- nenhum impacto não intencional em `main`.

O objetivo do `/Codecriar` não é produzir muito código de uma vez. É produzir **incrementos profissionais, verificáveis e acumulativos** sem exigir microgerenciamento do usuário.
