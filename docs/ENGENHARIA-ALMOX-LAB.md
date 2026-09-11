# Engenharia ALMOX LAB — Regra de Arquitetura e Evolução

## Regra principal

O ALMOX LAB não deve evoluir por uma sequência de arquivos de correção sobre arquivos de correção.

**Uma funcionalidade deve ter um único módulo principal responsável por ela.**

Quando houver um erro, a primeira opção é corrigir o módulo responsável pela funcionalidade existente. Não criar automaticamente `fix.js`, `final-fix.js`, `correction.js`, `patch.js` ou equivalentes para sobrescrever outro código.

## Princípios obrigatórios

### 1. Uma responsabilidade, um responsável

Cada funcionalidade deve possuir uma implementação principal claramente identificável.

Exemplo preferencial:

```text
scripts/
├── supplier-reader.js
├── nf-entry.js
├── materials.js
├── suppliers.js
└── movements.js
```

Evitar arquitetura baseada em camadas de remendos:

```text
feature.js
feature-fix.js
feature-final.js
feature-final-correction.js
```

Arquivos auxiliares só devem existir quando tiverem **responsabilidade técnica real e independente**, não apenas para sobrescrever ou corrigir outro arquivo.

### 2. Corrigir no lugar certo

Ao encontrar um problema:

```text
LER O CÓDIGO ATUAL
        ↓
ENTENDER A RESPONSABILIDADE
        ↓
LOCALIZAR A IMPLEMENTAÇÃO PRINCIPAL
        ↓
CORRIGIR O MÓDULO RESPONSÁVEL
        ↓
TESTAR
        ↓
MANTER UMA IMPLEMENTAÇÃO ÚNICA
```

Não adotar como padrão:

```text
erro → criar patch → novo erro → criar outro patch → sobrescrever o patch
```

### 3. Antes de remover ou substituir

Nunca apagar código funcional apenas por parecer antigo.

Antes de remover ou substituir uma implementação:

1. identificar o que ela faz;
2. identificar dependências e chamadas;
3. identificar regras de negócio preservadas;
4. identificar dados utilizados ou produzidos;
5. reproduzir o comportamento necessário;
6. incorporar o comportamento válido ao módulo definitivo;
7. testar;
8. só então remover o código redundante.

### 4. Service Worker não é sistema de patches

O Service Worker deve ter responsabilidades de aplicação como:

- cache;
- atualização;
- funcionamento offline;
- controle de versão dos recursos.

Evitar utilizar o Service Worker como mecanismo permanente para injetar uma coleção de scripts de correção na aplicação.

A preferência arquitetural é que os módulos necessários sejam declarados e carregados de forma explícita pela aplicação.

Se uma injeção temporária for necessária por compatibilidade durante uma migração, ela deve ser tratada como **dívida técnica com destino de remoção**, e não como arquitetura definitiva.

### 5. Não duplicar funcionalidades

Antes de criar uma nova função, botão, módulo ou leitor, verificar:

- se a funcionalidade já existe;
- onde ela está implementada;
- se existe outra implementação concorrente;
- se o problema é realmente ausência de função ou apenas erro na implementação atual.

Se já existir uma implementação adequada, **evoluí-la em vez de criar uma segunda**.

### 6. Preservar negócio, modernizar tecnologia

O projeto pode e deve modernizar sua arquitetura quando houver ganho real de:

- manutenção;
- confiabilidade;
- desempenho;
- segurança;
- clareza;
- testabilidade;
- experiência do usuário.

Modernizar não significa descartar automaticamente o que existe.

Devem ser preservados, quando ainda válidos:

- regras de negócio;
- dados;
- fluxos úteis;
- funcionalidades existentes;
- compatibilidade necessária.

### 7. Mudança controlada

Toda alteração relevante deve seguir:

```text
AUDITAR
  ↓
PLANEJAR A MUDANÇA
  ↓
IMPLEMENTAR NO MÓDULO RESPONSÁVEL
  ↓
VALIDAR SINTAXE E INTEGRAÇÃO
  ↓
TESTAR O FLUXO
  ↓
VERIFICAR DUPLICIDADES
  ↓
CHECKPOINT/COMMIT
```

### 8. Limpeza contínua

Depois de consolidar uma funcionalidade, procurar:

- arquivos órfãos;
- funções duplicadas;
- listeners duplicados;
- IDs duplicados;
- botões duplicados;
- carregamentos repetidos;
- scripts concorrentes;
- código morto;
- referências a arquivos removidos;
- caches e versões antigas desnecessárias.

A meta é reduzir a complexidade, não acumular código para fazer o sistema funcionar.

## Padrão de decisão para novas alterações

Antes de criar qualquer arquivo novo, classificar a necessidade:

**PRESERVAR** — já funciona e não precisa de alteração.

**CORRIGIR** — existe a funcionalidade, mas há um erro. Corrigir no módulo responsável.

**MODERNIZAR** — a função existe, mas a implementação pode ser tecnicamente melhorada sem perder o comportamento necessário.

**CONSOLIDAR** — existem várias implementações da mesma responsabilidade. Escolher uma implementação principal, incorporar o que for válido e eliminar duplicidades após teste.

**SUBSTITUIR** — a implementação atual não atende mais ao objetivo. Reproduzir as regras e dados necessários, validar a nova implementação e só então retirar a antiga.

**CRIAR** — somente quando a responsabilidade realmente não existir no sistema.

## Regra contra o "remendo em cima do remendo"

> **Não criar um novo arquivo apenas porque é mais rápido do que entender e corrigir o arquivo existente.**

Se o arquivo existente estiver excessivamente complexo, o caminho correto é refatorar/consolidar sua responsabilidade, com testes e checkpoints, em vez de adicionar outra camada de sobrescrita.

## Objetivo da engenharia ALMOX LAB

Construir um sistema que possa crescer sem ficar embolado em cima dos próprios códigos.

O código deve permitir que, no futuro, a equipe consiga responder rapidamente:

- onde essa função está;
- quem é responsável por ela;
- quais dados ela altera;
- quem chama essa função;
- quais dependências ela possui;
- como testar sua alteração.

**Princípio final:**

> **Código novo deve reduzir ou controlar a complexidade do ALMOX LAB — não apenas fazê-lo funcionar por cima do código anterior.**
