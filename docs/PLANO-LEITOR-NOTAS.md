# ALMOX LAB — PLANO DE ENGENHARIA DO LEITOR DE NOTAS

Este documento registra o escopo aprovado para a entrada inteligente de estoque.

## Objetivo

Receber documentos reais e separar somente as informações necessárias para entrada de estoque: fornecedor, NF/série, produtos, quantidades, unidades e valor unitário quando disponível.

A nota de teste não define um layout fixo.

## Princípio

O leitor de notas é o organizador da entrada. O leitor de materiais e o leitor de fornecedor possuem responsabilidades próprias. O leitor de notas deve reutilizar capacidades existentes quando isso for tecnicamente adequado, sem criar motores concorrentes.

## Regras de negócio

- O nome cadastrado no estoque é soberano.
- A descrição da nota serve para identificar o material, mas não substitui o nome do estoque.
- Não criar material automaticamente.
- Não alterar material automaticamente.
- Não alterar estoque durante a leitura.
- Só registrar a entrada após confirmação.
- Quantidade e unidade devem ser extraídas da nota.
- Itens repetidos só podem ser somados quando a correspondência for segura.
- Fornecedor deve ser separado dos produtos e relacionado ao cadastro existente.
- Fornecedor ausente deve gerar opção de cadastro, sem criação automática.
- NF já registrada não deve gerar entrada duplicada.
- Material sem contagem inicial não deve ser tratado como estoque zero.

## Entrada suportada

PDF, XML, JPG, JPEG, PNG e câmera, conforme suporte técnico disponível no projeto.

## Fluxo

DOCUMENTO → LEITURA → SEPARAÇÃO → FORNECEDOR/NF → PRODUTOS → QUANTIDADES/UNIDADES → CORRESPONDÊNCIA COM ESTOQUE → CONFERÊNCIA → CONFIRMAÇÃO → ENTRADA → HISTÓRICO

## Engenharia

Antes de implementar, auditar leitor de materiais, leitor de fornecedor, leitor de notas, index.html, db, movimentações, histórico e Service Worker.

É permitido corrigir, reorganizar, consolidar, substituir, remover, modernizar ou criar código quando a análise justificar. Código ruim não deve ser preservado por existir.

Não acumular arquivos de correção para mascarar conflitos. Ao final deve existir uma arquitetura clara, com uma responsabilidade definida para cada função.

## Desenvolvimento

1. Auditoria.
2. Definição da arquitetura.
3. Leitura.
4. Separação de fornecedor e produtos.
5. Correspondência com estoque.
6. Quantidade/unidade.
7. Conferência.
8. Entrada.
9. NF/histórico/duplicidade.
10. Testes e limpeza.

## Problema atual do PC

O botão Ler nota deve abrir o seletor de arquivos no computador e permitir nova leitura, inclusive do mesmo arquivo, sem travar a interface.
