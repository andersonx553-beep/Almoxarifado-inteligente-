# ALMOX LAB 2.0 — Esqueleto inicial

## Estado atual

- `main` permanece intacta.
- Modernização isolada na branch `almox-lab-2.0`.
- O legado atual foi preservado como referência e não foi reescrito neste bloco.
- O primeiro protótipo navegável está em `prototype/index.html`.

## Bloco 1 — Shell profissional + operação mínima

### Navegação
- Início
- Estoque
- Contagem
- Movimentos
- Reposição

### Contratos demonstrados

**Estoque**
- material com código, área, subgrupo, unidade, atual, mínimo e ideal;
- estado `Pendente` quando ainda não houve contagem;
- `Pendente` não é convertido em estoque zero;
- quantidade a comprar = ideal − atual quando aplicável.

**Movimentação**
- entrada aumenta estoque;
- saída reduz estoque;
- saída que produziria estoque negativo é bloqueada;
- cada operação cria histórico com antes/depois.

**Contagem**
- quantidade física é informada separadamente;
- divergência é calculada contra o estoque existente;
- fechamento marca o material como contado.

**Reposição**
- materiais abaixo do ideal entram na fila;
- prioridade alta quando o estoque está no mínimo ou abaixo;
- recomendação mostra quantidade e motivo.

**Persistência**
- protótipo usa armazenamento local isolado com chave própria;
- isso é uma etapa de laboratório, não a arquitetura final de persistência.

## Próximo bloco automático

**Bloco 2 — Domínio de estoque real**

O próximo incremento deve transformar o protótipo em uma base de domínio organizada, preparando a migração para componentes/estado tipados sem perder os contratos acima. A arquitetura final poderá usar React + TypeScript + Vite, IndexedDB/Dexie e uma camada de componentes reutilizáveis quando isso for confirmado pela auditoria do legado.

## Critério de aprovação deste bloco

O bloco não deve ser considerado concluído apenas porque a tela existe. A funcionalidade mínima precisa responder a operações reais e ter validação automatizada de contratos críticos.
