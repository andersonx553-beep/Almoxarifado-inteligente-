# ALMOX LAB — Entrada de estoque por Nota Fiscal

## Objetivo
Criar, dentro de Materiais, um leitor específico para dar entrada de produtos no estoque a partir de uma NF. Este fluxo é separado do leitor de cadastro de fornecedores.

## Dados necessários da leitura
- Fornecedor
- NF
- Produto
- Un/qtd
- Valor do produto

O leitor pode reconhecer unidades adicionais comuns (UN, UND, UNID, PC/PÇ, CX, FD, KG, G, LT/L, ML, M, M2, M3, PAR, PCT, DZ, RL, GAL/GL, BALDE, SACO/SC, FRASCO, KIT etc.).

## Regras
1. A leitura não cadastra fornecedor automaticamente.
2. Depois de identificar o fornecedor, o sistema compara o nome com a lista de fornecedores existente.
3. Somente quando o nome não estiver cadastrado é exibida a opção "Deseja cadastrá-lo?".
4. A opção de cadastro abre o fluxo existente de fornecedor; a entrada da NF não cria o fornecedor por conta própria.
5. A leitura não cria material automaticamente. Se um produto não puder ser associado com segurança a um material existente, a entrada não é confirmada.
6. O estoque só é alterado depois da conferência e da confirmação da entrada.
7. A NF é tratada como documento de entrada distinto dos demais documentos.
8. Após a confirmação, o banco registra um documento em `db.invoiceDocuments`, além de registrar a movimentação de entrada e o histórico da operação.
9. A referência da NF e do fornecedor acompanha os registros de entrada para rastreabilidade.
10. A mesma NF + fornecedor não pode ser lançada novamente pelo leitor.
11. Nenhuma informação ausente é inventada pelo sistema.

## Fluxo
`Materiais → Entrada por NF → PDF/imagem/câmera → leitura → identificação → associação dos produtos → conferência → confirmar entrada → movimentação → estoque atualizado → NF registrada no histórico/banco.`

## Implementação
- `scripts/nf-stock-entry-reader.js`: UI, PDF/OCR, interpretação, associação com materiais, conferência, entrada e registro documental.
- `sw.js`: injeta o módulo no sistema oficial e usa cache `almoxarifado-v16` para evitar versão antiga no celular.

## Limite da primeira implementação
A primeira versão usa PDF.js para texto/renderização e Tesseract.js para OCR. A interpretação é deliberadamente conservadora: quando os dados essenciais ou o vínculo do produto não forem confiáveis, a operação não altera o estoque.
