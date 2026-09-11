# ALTERAÇÃO 04 — Leitor Inteligente de Documentos

Objetivo: evoluir a leitura de documentos existente para aceitar PDF, JPG, JPEG, PNG e captura por câmera, identificando fornecedor, extraindo campos cadastrais, normalizando/validando e integrando ao cadastro existente.

Implementação inicial: camada independente em `scripts/supplier-document-reader.js`, sem IA externa obrigatória.

Entradas: PDF textual, PDF escaneado via renderização/OCR, imagens e câmera.

Campos: razão social, CNPJ, IE, telefone, endereço, número, bairro, cidade, UF e CEP.

Regra: nunca inventar dados; validar CNPJ/CEP/UF; detectar duplicidade por CNPJ antes do cadastro.

O DANFE `nota_cadastro_fornecedor(3).pdf` é o caso de aceitação funcional.
