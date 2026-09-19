---
title: "Utilitários"
description: "Todos os utilitários do Brazilian Utils, agrupados por família (CPF, CNPJ, CEP, boleto, Pix e mais), com opções, exemplos e casos de borda."
keywords: ["CPF", "CNPJ", "CEP", "boleto", "Pix", "NF-e", "telefone", "placa", "RENAVAM", "PIS", "CNH", "IBAN", "feriados", "dias úteis", "CBO", "CNAE", "NCM", "CFOP", "validador", "formatador", "parser", "gerador"]
---

Todas as funções do pacote, agrupadas por família. Cada seção diz o que a função faz, quais são as opções, o que ela retorna com entrada inválida e mostra um exemplo.

## Convenções

Estas regras valem para todas as funções, a não ser que a seção diga o contrário.

- **Nada lança erro com entrada inválida** (`null`, `undefined`, tipo errado): `isValid*` retornam `false`, `format*` e `parse*` retornam `''`, `get*` de um item retornam `null`, `get*` de lista retornam `[]`. As únicas exceções são as assíncronas `getAddressInfoByCep` e `getCepInfoByAddress`, que rejeitam com erros tipados.
- **Validadores aceitam o valor com ou sem máscara**: os caracteres de máscara usuais (`.`, `-`, `/`) e espaços entre ou ao redor dos grupos são ignorados, então não é preciso limpar a formatação antes.
- **Formatadores aplicam a máscara até onde o valor vai**, então também servem como máscara de digitação. As funções `parse*` fazem o inverso e mantêm só os caracteres que importam.
- **Geradores usam `Math.random()`**, então servem para testes e dados de exemplo e nunca para nada relacionado a segurança.
- **Getters retornam um array ou objeto novo a cada chamada**, então alterar um resultado nunca afeta a chamada seguinte.
- **Todas as funções são síncronas**, exceto `getAddressInfoByCep`, `getCepInfoByAddress` e a descontinuada `getMunicipality`.


## CPF

### isValidCpf

Valida um CPF.

- Retorna `false` para um número reservado (todos os dígitos iguais, como `00000000000`) e para um dígito verificador errado.

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('155151475'); // false
isValidCpf('111 444 777 35'); // true (máscara com espaços)
```

### formatCpf

Formata um CPF.

- **Opções** (`FormatCpfOptions`): `pad` preenche o valor com zeros à esquerda até 11 dígitos antes de aplicar a máscara (padrão `false`); `obfuscate` esconde os 3 primeiros dígitos e os 2 dígitos verificadores.
- `obfuscate` é aplicada após o `pad`.

```javascript
import { formatCpf } from '@brazilian-utils/brazilian-utils';

formatCpf('74650688000'); // 746.506.880-00
formatCpf('746506880', { pad: true }); // 007.465.068-80
formatCpf('12345678909', { obfuscate: true }); // ***.456.789-**
```

### parseCpf

Remove a formatação do CPF, mantém apenas os dígitos e limita o resultado a 11 dígitos.

```javascript
import { parseCpf } from '@brazilian-utils/brazilian-utils';

parseCpf('746.506.880-00'); // 74650688000
```

### generateCpf

Gera um CPF válido aleatório.

- O argumento opcional `state` (`StateCode`, ex. `"SP"`) fixa o dígito da região fiscal (o 9º) no código desse estado.
- Sem `state`, ou com um código desconhecido, um dígito de região fiscal aleatório é sorteado.

```javascript
import { generateCpf } from '@brazilian-utils/brazilian-utils'

generateCpf();
generateCpf('SP'); // o 9º dígito é 8, o código da região fiscal de SP
generateCpf('MG'); // o 9º dígito é 6, o código da região fiscal de MG
```

### getCpfInfo

Lê os campos que um CPF codifica, como um `CpfInfo`: a `base` de 8 dígitos, o dígito `fiscalRegion` (o 9º dígito, a Região Fiscal da Receita Federal em que o CPF foi inscrito, `"1"` a `"9"` e `"0"` para a 10ª), os `states` dessa região (`StateCode[]`, ordenados pelo nome do estado) e os 2 `checkDigits`. Aceita a mesma entrada com ou sem máscara que o `isValidCpf` e retorna `null` para tudo que não for um CPF válido. A região é a do endereço informado na primeira inscrição: ela não diz onde o titular nasceu, onde mora hoje nem onde pediu o número, e uma região com mais de um estado não diz qual deles foi.

| `fiscalRegion` | `states` |
| --- | --- |
| `"1"` | DF, GO, MT, MS, TO |
| `"2"` | AC, AP, AM, PA, RO, RR |
| `"3"` | CE, MA, PI |
| `"4"` | AL, PB, PE, RN |
| `"5"` | BA, SE |
| `"6"` | MG |
| `"7"` | ES, RJ |
| `"8"` | SP |
| `"9"` | PR, SC |
| `"0"` | RS |

```javascript
import { getCpfInfo } from '@brazilian-utils/brazilian-utils';

getCpfInfo('123.456.789-09');
// {
//   base: '12345678',
//   fiscalRegion: '9',
//   states: ['PR', 'SC'],
//   checkDigits: '09',
// }

getCpfInfo('12345678900'); // null (dígitos verificadores inválidos)
```

Fonte: [Receita Federal, "Cadastros: CPF e CNPJ"](https://www.gov.br/receitafederal/pt-br/assuntos/educacao-fiscal/educacao_fiscal/folhetos-orientativos/cadastros-dig.pdf).

## CNPJ

### isValidCnpj

Valida um CNPJ.

- **Opções** (`IsValidCnpjOptions`): `version` escolhe o formato aceito: `1` (padrão) apenas numérico, `2` numérico e alfanumérico. Qualquer outro valor é lido como `1`.
- Um número reservado (todos os dígitos iguais) é rejeitado nas duas versões; a versão `2` não tem lista de reservados para letras.

```javascript
import { isValidCnpj } from '@brazilian-utils/brazilian-utils';

isValidCnpj('15515147234255'); // false
isValidCnpj('q0slfmbd7vx439', { version: 2 }); // true (alfanumérico minúsculo)
```

Fonte: [Receita Federal, Manual do DV do CNPJ](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf), [CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico).

### formatCnpj

Formata um CNPJ.

- **Opções** (`FormatCnpjOptions`): `pad` preenche o valor com zeros à esquerda até 14 caracteres antes de aplicar a máscara (padrão `false`); `version` escolhe o formato, `1` (padrão) apenas numérico, `2` alfanumérico; `obfuscate` esconde os 2 primeiros dígitos e os 2 dígitos verificadores.
- A versão `2` mantém letras (em maiúsculas) e dígitos; a versão `1` mantém apenas dígitos.
- `obfuscate` vale para as duas versões e é aplicada após o `pad`.

```javascript
import { formatCnpj } from '@brazilian-utils/brazilian-utils';

formatCnpj('24522200000174'); // 24.522.200/0001-74
formatCnpj('245222000174', { pad: true }); // 00.245.222/0001-74
formatCnpj('12OUT345000199', { version: 2 }); // 12.OUT.345/0001-99
formatCnpj('12345678000195', { obfuscate: true }); // **.345.678/0001-**
```

### parseCnpj

Remove a formatação do CNPJ, retorna um valor normalizado e limita o resultado a 14 caracteres.

- **Opções** (`ParseCnpjOptions`): `version` escolhe o formato: `1` (padrão) mantém apenas dígitos, `2` mantém letras e dígitos, em maiúsculas.

```javascript
import { parseCnpj } from '@brazilian-utils/brazilian-utils';

parseCnpj('24.522.200/0001-74'); // 24522200000174
parseCnpj('12.OUT.345/0001-99', { version: 2 }); // 12OUT345000199
```

### generateCnpj

Gera um CNPJ válido aleatório.

- O primeiro argumento é a versão, `1` (padrão) numérico ou `2` alfanumérico, ou um objeto `GenerateCnpjParams` com `version` mais `branch`.
- `branch` é o bloco do "número de ordem" (filial), um inteiro de 1 a 9999 (aleatório por padrão). Um `branch` inválido é ignorado. O bloco continua numérico nas duas versões.

```javascript
import { generateCnpj } from '@brazilian-utils/brazilian-utils'

generateCnpj();
generateCnpj(2); // CNPJ alfanumérico, ex. 'Q0SLFMBD7VX439'
generateCnpj({ branch: 3 }); // bloco de ordem '0003', ex. '12345678000372'
generateCnpj({ version: 2, branch: 1 }); // CNPJ alfanumérico cujo bloco de ordem é '0001'
```

## CEP e endereço

### isValidCep

Valida um CEP ([código de endereçamento postal](https://pt.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)).

- Aceita `string` ou `number`. Um CEP que começa com `0` precisa ser string, já que um número não preserva o zero à esquerda.
- Espaços, pontos e hífens são ignorados. Qualquer outro caractere invalida o valor.

```javascript
import { isValidCep } from '@brazilian-utils/brazilian-utils';

isValidCep('01310100'); // true
isValidCep('92500-000'); // true (hífen entre os grupos)
isValidCep('92.500-000'); // true (ponto e hífen)
isValidCep('013 10 100'); // true (espaços em qualquer posição entre os dígitos)
isValidCep(20040020); // true (entrada numérica)
isValidCep('9250000A'); // false (letras são rejeitadas)
isValidCep('12345'); // false (tamanho inválido)
```

### formatCep

Formata um CEP ([código de endereçamento postal](https://pt.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)).

- **Opções** (`FormatCepOptions`): `pad` preenche o valor com zeros à esquerda até 8 dígitos antes de aplicar a máscara (padrão `false`).
- Um CEP que começa com `0` passado como número perde esse zero: passe uma string ou use `pad`.

```javascript
import { formatCep } from '@brazilian-utils/brazilian-utils';

formatCep('92500000'); // 92500-000
formatCep('9250000', { pad: true }); // 09250-000
```

### parseCep

Remove a formatação do CEP, mantém apenas os dígitos e limita o resultado a 8 dígitos.

```javascript
import { parseCep } from '@brazilian-utils/brazilian-utils';

parseCep('92500-000'); // 92500000
```

### generateCep

Gera um CEP aleatório. Um CEP não tem dígito verificador, então toda string de 8 dígitos é estruturalmente válida.

```javascript
import { generateCep } from '@brazilian-utils/brazilian-utils';

generateCep(); // '92500000'
```

### getAddressInfoByCep

Busca o endereço de um CEP em vários provedores ao mesmo tempo e resolve com a primeira resposta bem-sucedida. O resultado é um `AddressInfo`: `cep`, `state`, `city`, `neighborhood` e `street`.

- **Opções** (`GetAddressInfoByCepOptions`): `providers` (`CepProvider[]`) lista os provedores a disputar (padrão `['viacep', 'brasilapi']`). `'widenet'` está descontinuado e fica fora da lista padrão.
- Aceita string ou número. Um número é preenchido com zeros à esquerda até 8 dígitos.
- Repete falhas transitórias de rede por provedor.
- Rejeita com `GetAddressInfoByCepValidationError` quando o CEP é inválido ou `providers` não nomeia nenhum provedor conhecido, com `GetAddressInfoByCepNotFoundError` quando todos os provedores falharam e pelo menos um informou que o CEP é desconhecido, e com `GetAddressInfoByCepServiceError` quando todos os provedores falharam por outro motivo.
- Os três estendem `GetAddressInfoByCepError`, então um único `catch` cobre todos.

```javascript
import { getAddressInfoByCep } from '@brazilian-utils/brazilian-utils';

// Usando os provedores padrão (['viacep', 'brasilapi'])
const address = await getAddressInfoByCep('01310100');
// { cep: '01310100', state: 'SP', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista' }

// Usando provedores específicos
const addressFromProviders = await getAddressInfoByCep('01310-100', {
  providers: ['viacep', 'brasilapi']
});

// Usando número como entrada (será preenchido automaticamente com zeros à esquerda)
const addressFromNumber = await getAddressInfoByCep(1310100);
```

### getCepInfoByAddress

Busca os CEPs de um endereço na ViaCEP. Resolve com um array de `CepAddressInfo`.

- O argumento (`GetCepInfoByAddressParams`) traz `federalUnit`, `city` e `street`. `federalUnit` pode estar em minúsculas; `city` e `street` têm os espaços nas pontas removidos e os acentos retirados antes da consulta.
- Rejeita com `GetCepInfoByAddressValidationError` quando a UF, a cidade ou a rua está ausente ou inválida, com `GetCepInfoByAddressNotFoundError` quando nenhum endereço corresponde à busca, e com `GetCepInfoByAddressError` quando a ViaCEP responde com um status de erro HTTP.
- Repete falhas transitórias de rede, como `getAddressInfoByCep`.
- Cada item traz a resposta da ViaCEP sem alterações, com os nomes de campo da própria ViaCEP.

```javascript
import { getCepInfoByAddress } from '@brazilian-utils/brazilian-utils';

const ceps = await getCepInfoByAddress({
  federalUnit: 'MG',
  city: 'Ouro Preto',
  street: 'Rua Direita'
});

// [
//   {
//     cep: '35411-152',
//     logradouro: 'Rua Direita',
//     complemento: '',
//     unidade: '',
//     bairro: 'Riacho (Amarantina)',
//     localidade: 'Ouro Preto',
//     uf: 'MG',
//     estado: 'Minas Gerais',
//     regiao: 'Sudeste',
//     ibge: '3146107',
//     gia: '',
//     ddd: '31',
//     siafi: '4921'
//   }
// ]
```

## Boleto

### isValidBoleto

Valida um boleto ([meio de pagamento brasileiro](https://pt.wikipedia.org/wiki/Boleto_banc%C3%A1rio)).

- Aceita a linha digitável de 47 dígitos da "cobrança bancária" e, do "boleto de arrecadação", seja a linha digitável de 48 dígitos, seja o código de barras de 44 dígitos.
- O código de moeda (posição 4 do código de barras da cobrança bancária) não é verificado.

```javascript
import { isValidBoleto } from '@brazilian-utils/brazilian-utils';

isValidBoleto('00190000090114971860168524522114675860000102656'); // true
isValidBoleto('846100000005246100291102005460339004695895061080'); // true (boleto de arrecadação)
```

Fonte: [Carta-Circular BCB nº 2.926/2000](https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf), [FEBRABAN, Layout Padrão de Arrecadação](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf).

### formatBoleto

Formata um número de boleto.

- **Opções** (`FormatBoletoOptions`): `pad` preenche o valor com zeros à esquerda até o tamanho do padrão antes de aplicar a máscara (padrão `false`).
- Uma linha digitável de 48 dígitos que começa com `8` recebe a máscara de arrecadação: quatro blocos de 11 dígitos, cada um seguido do seu dígito verificador. O código de barras de arrecadação de 44 dígitos mantém a máscara de "cobrança bancária".

```javascript
import { formatBoleto } from '@brazilian-utils/brazilian-utils';

formatBoleto('00190000090114971860168524522114675860000102656'); // 00190.00009 01149.718601 68524.522114 6 75860000102656
formatBoleto('1900000901149', { pad: true }); // 00000.00000 00000.000000 00000.000000 0 01900000901149
formatBoleto('846100000005246100291102005460339004695895061080'); // 84610000000-5 24610029110-2 00546033900-4 69589506108-0 (linha digitável de arrecadação, 48 dígitos)
formatBoleto('84610000000246100291100054603390069589506108'); // 84610.00000 02461.002911 00054.603390 0 69589506108 (código de barras de arrecadação de 44 dígitos mantém a máscara bancária)
```

Fonte: [FEBRABAN, Layout Padrão de Arrecadação](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf).

### parseBoleto

Remove a formatação do boleto, mantém apenas os dígitos e limita o resultado a 47 dígitos (48 para boleto de arrecadação).

```javascript
import { parseBoleto } from '@brazilian-utils/brazilian-utils';

parseBoleto('00190.00009 01149.718601 68524.522114 6 75860000102656'); // 00190000090114971860168524522114675860000102656
```

### generateBoleto

Gera um boleto válido aleatório.

- Informe `{ type: 'arrecadacao' }` (`GenerateBoletoParams`) para um boleto de arrecadação de 48 dígitos em vez do tipo padrão `'bancario'` (cobrança bancária, 47 dígitos).

```javascript
import { generateBoleto } from '@brazilian-utils/brazilian-utils';

generateBoleto(); // "00190000090114971860168524522114675860000102656"
generateBoleto({ type: 'arrecadacao' }); // "846100000005246100291102005460339004695895061080"
```

### getBoletoInfo

Extrai informações de um boleto (valor, data de vencimento, código do banco). Retorna `null` quando o valor não é um boleto válido.

- **Opções** (`GetBoletoInfoOptions`): `referenceDate` resolve o ciclo do "fator de vencimento" a partir dessa data em vez de agora.
- Retorna um `BoletoInfo`: `amount` em centavos, `expirationDate` e o `bankCode` de três dígitos. `expirationDate` é `null` quando o boleto não traz fator de vencimento (um fator abaixo de `1000`).
- O ciclo do fator de vencimento reiniciou em 22/02/2025, então um fator pode significar uma de duas datas separadas por 9000 dias. `referenceDate` escolhe entre elas; informe-a sempre que a resposta precisar ser estável.
- Um boleto de arrecadação tem `bankCode: ''` e `expirationDate: null`, mais `type: 'arrecadacao'`, `segment`, `value` (o valor em reais) e `hasEffectiveValue`.

```javascript
import { getBoletoInfo } from '@brazilian-utils/brazilian-utils';

getBoletoInfo('00190000090114971860168524522114675860000102656');
// { amount: 102656, expirationDate: Date, bankCode: '001' }

getBoletoInfo('00190000090114971860168524522114675860000102656', {
  referenceDate: new Date(2018, 6, 1)
});
// Resolve o ciclo do fator de vencimento a partir de 01/07/2018

getBoletoInfo('846100000005246100291102005460339004695895061080');
// { amount: 2461, expirationDate: null, bankCode: '', type: 'arrecadacao', segment: 4, value: 24.61, hasEffectiveValue: true }

getBoletoInfo('invalid'); // null
```

Fonte: [Carta-Circular BCB nº 2.926/2000](https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf), [FEBRABAN, Layout Padrão de Arrecadação](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf).

## Pix

### isValidPixKey

Valida uma chave Pix: um CPF, um CNPJ, um e-mail, um telefone celular brasileiro ou uma chave aleatória EVP, conforme os formatos de chave do DICT.

- **Opções** (`IsValidPixKeyOptions`): `accept` (`PixKeyType[]`, padrão todos) lista os tipos de chave aceitos; `[]` rejeita todos.
- Mesmas regras de reconhecimento de `getPixKeyInfo`.

```javascript
import { isValidPixKey } from '@brazilian-utils/brazilian-utils';

isValidPixKey('123.456.789-09'); // true
isValidPixKey('fulano@example.com'); // true
isValidPixKey('(11) 98765-4321'); // true
isValidPixKey('71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d'); // true
isValidPixKey('(11) 3000-0000'); // false (telefone fixo não é chave Pix)
isValidPixKey('123.456.789-09', { accept: ['email', 'evp'] }); // false
isValidPixKey('not a key'); // false
```

Fonte: [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [API do DICT](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html), [pix-api](https://github.com/bacen/pix-api).

### getPixKeyInfo

Identifica uma chave Pix e a normaliza para a forma canônica que o DICT espera dentro de um BR Code. Retorna `null` quando o valor não é uma chave Pix válida.

- Retorna um `PixKeyInfo` com o `type` (`PixKeyType`) e o `value`.
- O `value` canônico é só dígitos para CPF ou CNPJ (letras maiúsculas), e-mail minúsculo, celular em E.164 ou UUID minúsculo.
- Um valor de 11 dígitos válido como CPF e celular é lido como CPF, salvo se escrito como telefone (prefixo `+55` ou DDD entre parênteses).
- Um e-mail com mais de 77 caracteres é rejeitado.

```javascript
import { getPixKeyInfo } from '@brazilian-utils/brazilian-utils';

getPixKeyInfo('123.456.789-09'); // { type: 'cpf', value: '12345678909' }
getPixKeyInfo('Fulano@Example.COM '); // { type: 'email', value: 'fulano@example.com' }
getPixKeyInfo('(11) 98765-4321'); // { type: 'phone', value: '+5511987654321' }
getPixKeyInfo('71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D');
// { type: 'evp', value: '71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d' }
getPixKeyInfo('(11) 3000-0000'); // null (telefone fixo não é chave Pix)
getPixKeyInfo('51998259765'); // { type: 'cpf', value: '51998259765' } (também é um telefone válido)
getPixKeyInfo('+5551998259765'); // { type: 'phone', value: '+5551998259765' }
```

Fonte: [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [API do DICT](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html).

### isValidPixPayload

Valida um payload de BR Code Pix (a string por trás de um QR Code Pix e do "Pix copia e cola"). A chave em si não é conferida; use `isValidPixKey`.

- A estrutura TLV, o CRC-16 e os objetos obrigatórios (format indicator, category code, moeda, país, nome e cidade do recebedor) são verificados.
- Um template "Merchant Account Information" (IDs 26 a 51) precisa trazer o GUI `br.gov.bcb.pix` com uma chave (estático) ou a URL do PSP (dinâmico), nunca os dois.
- Os objetos `01` (Point of Initiation Method) e `62` (Additional Data Field) são opcionais; `01` precisa ser `11` ou `12` quando presente.
- Um valor (`54`) precisa ser maior que zero, exceto num BR Code de Pix Saque (`fss` de 8 dígitos no subobjeto 26-03).
- Os Unreserved Templates (IDs 80 a 99) são ignorados.

```javascript
import { isValidPixPayload } from '@brazilian-utils/brazilian-utils';

isValidPixPayload(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
); // true

isValidPixPayload('00020126580014br.gov.bcb.pix...'); // false (CRC quebrado)
```

Fonte: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

### getPixPayloadInfo

Interpreta um payload de BR Code Pix e retorna seus campos. Aceita o que `isValidPixPayload` aceita; para o resto retorna `null`, nunca um resultado parcial.

- Retorna um `PixPayloadInfo`: `merchantName`, `merchantCity`, `pointOfInitiation` e `key` (estático) ou `url` (dinâmico).
- `amount`, `txid`, `description` e `withdrawalFacilitator` (o `fss` do Pix Saque) só aparecem quando o payload os traz; `txid` fica ausente para o marcador `***`.
- `pointOfInitiation` (`PixPointOfInitiation`) é `"dynamic"` quando o payload traz uma localização de PSP ou o objeto `01` é `"12"`; senão, `"static"`.
- Com localização de PSP, `amount` e `txid` são ignorados, como manda o manual.

```javascript
import { getPixPayloadInfo } from '@brazilian-utils/brazilian-utils';

getPixPayloadInfo(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
);
// {
//   merchantName: 'Fulano de Tal',
//   merchantCity: 'BRASILIA',
//   pointOfInitiation: 'static',
//   key: '123e4567-e12b-12d1-a456-426655440000'
// }
```

Fonte: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

### generatePixPayload

Gera o payload de um BR Code Pix. Exatamente um entre `params.key` e `params.url` deve ser informado; `null` é retornado quando ambos ou nenhum são informados.

- **Parâmetros** (`GeneratePixPayloadParams`): `key` ou `url`, `merchantName`, `merchantCity` e os opcionais `amount`, `txid` e `description`.
- Com `key` o payload é estático e a chave é normalizada por `getPixKeyInfo`. Com `url` é dinâmico (objeto `01` definido como `12`) e não pode carregar `amount` nem `txid`.
- `url` é uma localização de PSP: host e caminho, sem esquema (`pix.example.com/qr/v2/1234`), com no máximo 77 caracteres.
- `amount` recebe duas casas decimais; `0.005`, `123.456` ou um valor que arredonda para `0.00` é rejeitado.
- `txid` tem de 1 a 25 caracteres de `[A-Za-z0-9]` (padrão `***`).
- `merchantName`, `merchantCity` e `description` perdem os acentos e são truncados a 25, 15 e o que sobra do template.

```javascript
import { generatePixPayload } from '@brazilian-utils/brazilian-utils';

generatePixPayload({
  key: '123.456.789-09',
  merchantName: 'Fulano de Tal',
  merchantCity: 'Brasília',
  amount: 123.45
});
// "00020126330014br.gov.bcb.pix0111123456789095204000053039865406123.455802BR5913Fulano de Tal6008Brasilia62070503***630479EE"

generatePixPayload({
  url: 'pix.example.com/qr/v2/1234',
  merchantName: 'Fulano de Tal',
  merchantCity: 'Brasília'
});
// "00020101021226480014br.gov.bcb.pix2526pix.example.com/qr/v2/12345204000053039865802BR5913Fulano de Tal6008Brasilia62070503***6304FC66"

generatePixPayload({ merchantName: 'Fulano', merchantCity: 'Brasília' }); // null (nem key nem url)
```

Fonte: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

## Chave de NF-e

### isValidNfeKey

Valida uma chave de acesso de DF-e. Cobre todo DF-e com chave de acesso de 44 dígitos; o CF-e-SAT (59) fica de fora.

- Modelos: NF-e (55), NFC-e (65), CT-e (57), MDF-e (58), CT-e OS (67), GTV-e (64), BP-e (63), NF3e (66) e NFCom (62).
- Os 44 dígitos podem ser agrupados de 4 em 4 por espaço, `.`, `-` ou `/`. Os prefixos `Id` do XML (`NFe`, `CTe`, `MDFe`, `BPe`, `NF3e`, `NFCom`) são removidos antes.
- `tpEmis` precisa ser um dos que o MOC do modelo atribui (tabela abaixo).
- Para NF-e e NFC-e o `cNF` precisa passar na regra B03-10 do MOC (sem valores repetidos ou sequenciais, diferente do número do documento).
- Um número de documento todo zerado é rejeitado. O dígito verificador é um módulo 11 sobre os 43 primeiros dígitos.

| Modelo | `tpEmis` aceitos |
| --- | --- |
| NF-e (55), NFC-e (65) | 1 a 7 e 9 |
| CT-e (57) | 1, 3, 4, 5, 7, 8 |
| CT-e OS (67) | 1, 5, 7, 8 |
| GTV-e (64) | 1, 2, 7, 8 |
| MDF-e (58) | 1, 2, 3 |
| BP-e (63), NF3e (66), NFCom (62) | 1, 2 |

```javascript
import { isValidNfeKey } from '@brazilian-utils/brazilian-utils';

isValidNfeKey('35170458716523000119550010000000121000123458'); // true (NF-e, SP)
isValidNfeKey('NFe35170458716523000119550010000000121000123458'); // true (prefixo Id do XML)
isValidNfeKey('CTe35170458716523000119570010000000128000123452'); // true (CT-e autorizado pela SVC-SP)
isValidNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'); // true (com máscara)
isValidNfeKey('3517.0458.7165.2300.0119.5500.1000.0000.1210.0012.3458'); // true (qualquer um dos caracteres de máscara)
isValidNfeKey('351 70458716523000119550010000000121000123458'); // false (separador dentro de um grupo de 4)
isValidNfeKey('99170458716523000119550010000000121000123458'); // false (cUF inválido)
isValidNfeKey('35170458716523000119010010000000121000123450'); // false (modelo inválido)
isValidNfeKey('35170458716523000119550010000000128000123455'); // false (o MOC da NF-e não atribui tpEmis 8)
isValidNfeKey('35170458716523000119550010000000121000000003'); // false (cNF 00000000, regra B03-10)
```

Fonte: [MOC da NF-e](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf), [schemas da NF-e](https://dfe-portal.svrs.rs.gov.br/NFE/Documentos) e os MOCs citados em `src/is-valid-nfe-key/is-valid-nfe-key.ts`.

### formatNfeKey

Formata uma chave de acesso de DF-e (Documento Fiscal eletrônico) em grupos de 4 dígitos separados por espaço. É a forma em que o DANFE, o DACTE, o DAMDFE, o DABPE, o DANF3E e o DANFE-COM a imprimem.

- **Opções** (`FormatNfeKeyOptions`): `pad` preenche o valor com zeros à esquerda até os 44 dígitos de uma chave de acesso completa (padrão `false`).
- Uma chave com máscara ou parcial é agrupada até onde os dígitos vão.
- Use `isValidNfeKey` para verificar uma chave.

```javascript
import { formatNfeKey } from '@brazilian-utils/brazilian-utils';

formatNfeKey('35170458716523000119550010000000121000123458');
// '3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'

formatNfeKey('12345'); // '1234 5'

formatNfeKey('12345', { pad: true });
// '0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345'
```

### parseNfeKey

Remove a formatação de uma chave de acesso de DF-e (chave de acesso), mantém apenas os dígitos e limita o resultado a 44 dígitos.

- Os prefixos `Id` do XML (`NFe`, `CTe`, `MDFe`, `BPe`, `NF3e`, `NFCom`) são removidos antes.

```javascript
import { parseNfeKey } from '@brazilian-utils/brazilian-utils';

parseNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458');
// '35170458716523000119550010000000121000123458'

parseNfeKey('NFe35170458716523000119550010000000121000123458');
// '35170458716523000119550010000000121000123458'
```

### getNfeKeyInfo

Interpreta uma chave de acesso de DF-e e retorna seus campos. Aceita as mesmas formas de entrada de `isValidNfeKey` e retorna `null` quando a chave não é válida.

- Retorna um `NfeKeyInfo`: `stateCode`, `year`, `month`, `taxId`, `model` (`NfeKeyModel`), `series`, `number`, `emissionType`, `code` e `checkDigit`.
- Para NFCom e NF3e (modelos `'62'` e `'66'`) o resultado também traz `authorizationSite` e o `code` tem 7 dígitos em vez de 8.

```javascript
import { getNfeKeyInfo } from '@brazilian-utils/brazilian-utils';

getNfeKeyInfo('35170458716523000119550010000000121000123458');
// { stateCode: 'SP', year: 2017, month: 4, taxId: '58716523000119', model: '55',
//   series: 1, number: 12, emissionType: 1, code: '00012345', checkDigit: 8 }

getNfeKeyInfo('35170458716523000119620010000000121000123450');
// { stateCode: 'SP', year: 2017, month: 4, taxId: '58716523000119', model: '62',
//   series: 1, number: 12, emissionType: 1, code: '0012345', checkDigit: 0, authorizationSite: 0 }

getNfeKeyInfo('invalid'); // null
```

## SUFRAMA

### isValidSuframa

Valida uma Inscrição SUFRAMA. É o número de registro que a Superintendência da Zona Franca de Manaus dá às empresas com incentivo fiscal, informado no campo `ISUF` do destinatário da NF-e.

- O número tem a forma `SS.NNNN.LLD`: setor de atividade, número sequencial, localidade da unidade da SUFRAMA e dígito verificador.
- Aceita 8 ou 9 dígitos: um valor de 8 dígitos é um número cujo código de setor perdeu o zero à esquerda.
- Retorna `false` para um código de setor `00` e para um dígito verificador módulo 11 errado.
- Os códigos de setor e de localidade não são conferidos com uma tabela, pois o manual os lista apenas como exemplos.
- Além dos caracteres de máscara usuais, `(`, `)`, `,` e `*` também são ignorados.

```javascript
import { isValidSuframa } from '@brazilian-utils/brazilian-utils';

isValidSuframa('123456789'); // true
isValidSuframa('12.3456.789'); // true
isValidSuframa('10001018'); // true (o mesmo que '010001018')
isValidSuframa('123456780'); // false
isValidSuframa('001234560'); // false (setor 00)
```

### formatSuframa

Formata uma Inscrição SUFRAMA.

- **Opções** (`FormatSuframaOptions`): `pad` completa o valor com zeros à esquerda até os 9 dígitos antes de aplicar a máscara (padrão `false`), o que devolve o zero à esquerda de um valor de 8 dígitos.

```javascript
import { formatSuframa } from '@brazilian-utils/brazilian-utils';

formatSuframa('123456789'); // 12.3456.789
formatSuframa('10001018', { pad: true }); // 01.0001.018
```

### parseSuframa

Remove a formatação da Inscrição SUFRAMA, mantém apenas os dígitos e limita o resultado a 9 dígitos.

```javascript
import { parseSuframa } from '@brazilian-utils/brazilian-utils';

parseSuframa('12.3456.789'); // 123456789
```

### generateSuframa

Gera uma Inscrição SUFRAMA aleatória válida de 9 dígitos.

- O dígito verificador é válido e o código de setor nunca é `00`. Os códigos de setor e de localidade são aleatórios.

```javascript
import { generateSuframa } from '@brazilian-utils/brazilian-utils';

generateSuframa(); // '205678106'
```

Fonte: [Manual de Orientação do Contribuinte da NF-e 6.0, Anexo XII.01](https://portal.fazenda.sp.gov.br/servicos/nfce/Downloads/Manual_de_Orientacao_Contribuinte_v_6.pdf).

## Telefone

### isValidPhone

Valida um número de telefone (celular ou fixo). Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é aceito e removido antes, como em `parsePhone`.

- **Opções** (`IsValidPhoneOptions`): `accept` (`PhoneType[]`, padrão `['mobile', 'landline']`) define quais tipos de número são aceitos; inclua `'service'` para os números que `isValidServicePhone` reconhece. `version` (`PhoneVersion`, padrão `1`) é repassado a `isValidMobilePhone`.

```javascript
import { isValidPhone } from '@brazilian-utils/brazilian-utils';

isValidPhone('11900000000'); // true
isValidPhone('11712345678', { version: 2 }); // true (7, 8 e 9 são todos SMP)
isValidPhone('11700123456', { version: 2 }); // false (a série 700 é de satélite)
isValidPhone('+55 11 98765-4321'); // true (código de país aceito)
isValidPhone('08001234567'); // false (números de serviço não são aceitos por padrão)
isValidPhone('08001234567', { accept: ['service'] }); // true
isValidPhone('11900000000', { accept: [] }); // false
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749).

### formatPhone

Formata um número de telefone de acordo com os padrões brasileiros. Se `value` incluir o DDD, informe `{ mask: 'auto' }` ou `'nanp'`: a máscara padrão `"sn"` assume que não há DDD e o trunca.

- **Opções** (`FormatPhoneOptions`): `mask` (`PhoneMask`, padrão `"sn"`) escolhe um dos padrões abaixo. Uma `mask` desconhecida recai para `"sn"`.
- `"sn"`: apenas o número assinante, 9 dígitos. `"nanp"`: DDD mais número assinante, 11 dígitos para celular e 10 para fixo; outros tamanhos mantêm o agrupamento de 11 dígitos.
- `"e164"` e `"international"` removem antes o código de país, como `parsePhone`, e recaem para `"service"` para um número de serviço.
- `"service"`: os Códigos Não Geográficos (`0800 123 4567`) e os números abreviados `300X`/`400X` (`4004-1234`).
- `"auto"`: `"service"` para um número de serviço, `"international"` quando `value` traz código de país, senão `"nanp"` para mais de 9 dígitos, ou `"sn"`.

```javascript
import { formatPhone } from '@brazilian-utils/brazilian-utils';

formatPhone('987654321'); // 98765-4321 (padrão "sn", sem DDD)
formatPhone('11900000000', { mask: 'nanp' }); // (11) 90000-0000
formatPhone('11900000000', { mask: 'auto' }); // (11) 90000-0000
formatPhone('1130000000', { mask: 'nanp' }); // (11) 3000-0000 (fixo de 10 dígitos)
formatPhone('1130000000', { mask: 'auto' }); // (11) 3000-0000 (fixo de 10 dígitos)
formatPhone('11987654321', { mask: 'e164' }); // +5511987654321
formatPhone('+5511987654321', { mask: 'international' }); // +55 11 98765-4321
formatPhone('08001234567', { mask: 'service' }); // 0800 123 4567
formatPhone('40041234', { mask: 'service' }); // 4004-1234
formatPhone('+5511987654321', { mask: 'auto' }); // +55 11 98765-4321 ("auto" detecta o prefixo +55 e escolhe "international")
formatPhone('5508001234567', { mask: 'auto' }); // 0800 123 4567 ("auto" lê o número 0800, não um +55 08)
formatPhone('11900000000'); // 11900-0000 (CUIDADO: a máscara padrão "sn" trunca um número com DDD)
```

Fonte: [ITU-T E.164](https://www.itu.int/rec/T-REC-E.164), [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749).

### parsePhone

Remove a formatação do telefone, mantém apenas os dígitos e limita o resultado a 11 dígitos.

- Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é removido antes, mas só quando sobram 10 ou 11 dígitos (DDD mais número assinante), então o DDD 55 não é confundido com ele.

```javascript
import { parsePhone } from '@brazilian-utils/brazilian-utils';

parsePhone('(11) 90000-0000'); // 11900000000
parsePhone('+55 (11) 98765-4321'); // 11987654321
parsePhone('5511987654321'); // 11987654321
parsePhone('55987654321'); // 55987654321 (DDD 55, não confundido com o código de país +55)
```

### generatePhone

Gera um telefone brasileiro aleatório. Aceita `'mobile'`, `'landline'` ou `'service'` (`GeneratePhoneType`); sem o tipo, gera um celular ou um fixo ao acaso, nunca um número de serviço.

- Um celular começa com 9 depois do DDD (válido nas duas versões de `isValidMobilePhone`); um fixo tem 8 dígitos depois do DDD, começando com 2 a 6; um número de serviço não tem DDD.

```javascript
import { generatePhone } from '@brazilian-utils/brazilian-utils';

generatePhone(); // '11912345678' ou '1131234567'
generatePhone('mobile'); // '11912345678'
generatePhone('landline'); // '1131234567'
generatePhone('service'); // '08001234567' ou '40041234'
```

### isValidMobilePhone

Valida um número de telefone celular. Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é aceito e removido antes, como em `parsePhone`.

- **Opções** (`IsValidMobilePhoneOptions`): `version` (`PhoneVersion`, padrão `1`) escolhe a regra de numeração: `1` aceita 6, 7, 8 ou 9 como primeiro dígito; `2` segue a Resolução Anatel 749/2022, aceita só 7, 8 ou 9 e rejeita a série `700`.

```javascript
import { isValidMobilePhone } from '@brazilian-utils/brazilian-utils';

isValidMobilePhone('11900000000'); // true
isValidMobilePhone('11712345678', { version: 1 }); // true (formato antigo)
isValidMobilePhone('11712345678', { version: 2 }); // true (7 também é SMP)
isValidMobilePhone('11612345678', { version: 2 }); // false (6 é Reserva Técnica)
isValidMobilePhone('11700123456', { version: 2 }); // false (a série 700 é de satélite)
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749).

### isValidLandlinePhone

Valida um número de telefone fixo. Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é aceito e removido antes, como em `parsePhone`.

```javascript
import { isValidLandlinePhone } from '@brazilian-utils/brazilian-utils';

isValidLandlinePhone('1130000000'); // true
isValidLandlinePhone('+55 11 3000-0000'); // true (código de país aceito)
```

### isValidServicePhone

Valida um número de serviço brasileiro, discado sem DDD. Apenas a estrutura é verificada: o número não precisa estar atribuído a ninguém.

- Os Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` e `0900` seguidos de 7 dígitos (11 no total).
- Os números abreviados `300X`/`400X`, com 8 dígitos. Outros prefixos de operadora, como `4020` e `4062`, são rejeitados.
- Os códigos de utilidade pública de 3 dígitos designados pela Anatel (ex.: `190`, `192`). O `112` e o `911` não estão entre eles e são rejeitados.

```javascript
import { isValidServicePhone } from '@brazilian-utils/brazilian-utils';

isValidServicePhone('0800 123 4567'); // true
isValidServicePhone('4004-1234'); // true
isValidServicePhone('190'); // true
isValidServicePhone('11987654321'); // false (número geográfico)
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Ato Anatel nº 43.151/2004](https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2004/1648-ato-43151), [Resolução nº 86/1998](https://informacoes.anatel.gov.br/legislacao/resolucoes/1998/336-resolucao-86).

### getAreaCodeInfo

Retorna o estado e a região a que um DDD brasileiro (código de área) pertence, dentre os 67 DDDs em uso no Plano Geral de Numeração da Anatel. Aceita string ou número inteiro não negativo.

- Retorna um `AreaCodeInfo`: `areaCode`, `stateCode`, `stateName`, `regionCode`, `regionName` e `stateCodes`. Retorna `null` quando o DDD não está em uso.
- `stateCode` é o estado sede do DDD. Para os quatro DDDs que cruzam uma divisa (61, 42, 47 e 49) `stateCodes` lista também o outro estado, a sede primeiro.

```javascript
import { getAreaCodeInfo } from '@brazilian-utils/brazilian-utils';

getAreaCodeInfo('11');
// { areaCode: 11, stateCode: 'SP', stateName: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', stateCodes: ['SP'] }

getAreaCodeInfo(21);
// { areaCode: 21, stateCode: 'RJ', stateName: 'Rio de Janeiro', regionCode: 'SE', regionName: 'Sudeste', stateCodes: ['RJ'] }

getAreaCodeInfo('61');
// { areaCode: 61, stateCode: 'DF', stateName: 'Distrito Federal', regionCode: 'CO', regionName: 'Centro-Oeste', stateCodes: ['DF', 'GO'] }

getAreaCodeInfo('00'); // null
getAreaCodeInfo(-11); // null
getAreaCodeInfo(1.1); // null
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Códigos Nacionais da Anatel](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais).

### getAreaCodesByState

Retorna todos os DDDs (códigos de área) que atendem um estado brasileiro, dentro do Plano Geral de Numeração da Anatel. A comparação não diferencia maiúsculas de minúsculas e o resultado vem em ordem crescente.

- Retorna `[]` quando `stateCode` não é um estado brasileiro.
- Um DDD de divisa (os mesmos quatro de `getAreaCodeInfo`) é listado em cada estado que atende.

```javascript
import { getAreaCodesByState } from '@brazilian-utils/brazilian-utils';

getAreaCodesByState('SP'); // [11, 12, 13, 14, 15, 16, 17, 18, 19]
getAreaCodesByState('ac'); // [68]
getAreaCodesByState('DF'); // [61]
getAreaCodesByState('GO'); // [61, 62, 64]
getAreaCodesByState('SC'); // [42, 47, 48, 49]
getAreaCodesByState('XX'); // []
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Códigos Nacionais da Anatel](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais).

## Placa de veículo

### isValidLicensePlate

Valida uma placa de veículo. Aceita o formato antigo brasileiro (`ABC-1234`) e o formato Mercosul (`ABC1D23`), com ou sem hífen ou espaço, em maiúsculas ou minúsculas.

```javascript
import { isValidLicensePlate } from '@brazilian-utils/brazilian-utils';

isValidLicensePlate('ABC1234'); // true (formato brasileiro)
isValidLicensePlate('ABC-1234'); // true (formato brasileiro com hífen)
isValidLicensePlate('ABC 1234'); // true (máscara com espaço)
isValidLicensePlate('ABC1D23'); // true (formato Mercosul)
isValidLicensePlate('ABC12D3'); // false (não é uma sequência Mercosul)
isValidLicensePlate('ABC1234EXTRA'); // false (caracteres em excesso)
```

Fonte: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf), [Anexos](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf).

### formatLicensePlate

Formata uma placa. Placas antigas brasileiras (`LLLNNNN`) recebem hífen; placas Mercosul (`LLLNLNN`) são retornadas sem separador.

- Retorna `''` quando o valor não pode iniciar uma placa válida.

```javascript
import { formatLicensePlate } from '@brazilian-utils/brazilian-utils';

formatLicensePlate('abc1234'); // 'ABC-1234'
formatLicensePlate('abc1d23'); // 'ABC1D23'
```

### parseLicensePlate

Remove separadores de uma placa, normaliza para letras maiúsculas e limita o resultado a 7 caracteres.

```javascript
import { parseLicensePlate } from '@brazilian-utils/brazilian-utils';

parseLicensePlate('abc-1234'); // 'ABC1234'
```

### generateLicensePlate

Gera uma placa válida aleatória no formato escolhido.

- `format` (`GenerateLicensePlateFormat`): `'LLLNLNN'` (Mercosul, o padrão) ou `'LLLNNNN'` (o formato antigo brasileiro). Qualquer outro valor cai no padrão.

```javascript
import { generateLicensePlate } from '@brazilian-utils/brazilian-utils';

generateLicensePlate(); // 'ABC1D23' (Mercosul, o padrão)
generateLicensePlate('LLLNNNN'); // 'ABC1234'
generateLicensePlate('LLLNNLN'); // 'ABC1D23' (um formato fora dos dois em circulação cai no padrão)
```

Fonte: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf).

### getFormatLicensePlate

Detecta o formato normalizado de uma placa: `'LLLNNNN'` para o formato antigo brasileiro, `'LLLNLNN'` para o Mercosul.

- Retorna `null` quando o valor, sem os separadores, não tem 7 letras e dígitos em um dos dois formatos.
- Exporta o tipo `LicensePlateFormat`, que `generateLicensePlate` reexporta como `GenerateLicensePlateFormat`.

```javascript
import { getFormatLicensePlate } from '@brazilian-utils/brazilian-utils';

getFormatLicensePlate('ABC-1234'); // 'LLLNNNN'
getFormatLicensePlate('ABC1D23'); // 'LLLNLNN'
getFormatLicensePlate('ABC12D3'); // null (não é uma sequência Mercosul)
getFormatLicensePlate('INVALID'); // null
getFormatLicensePlate('ABC1234EXTRA'); // null (caracteres em excesso)
```

### convertLicensePlateToMercosul

Converte uma placa brasileira no formato antigo (`LLLNNNN`) para o formato Mercosul (`LLLNLNN`). O 5º dígito vira uma letra, `0` a `9` mapeados para `A` a `J`.

- Retorna `""` quando o valor não é uma placa válida no formato antigo.

```javascript
import { convertLicensePlateToMercosul } from '@brazilian-utils/brazilian-utils';

convertLicensePlateToMercosul('ABC1234'); // 'ABC1C34'
convertLicensePlateToMercosul('abc-1234'); // 'ABC1C34'
convertLicensePlateToMercosul('ABC1D23'); // '' (já está no formato Mercosul)
```

Fonte: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf), [Anexo II](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf).

## RENAVAM

### isValidRenavam

Valida um RENAVAM (Registro Nacional de Veículos Automotores). Aceita o formato antigo (9 dígitos) e o formato novo (11 dígitos).

- Espaços, pontos e hífens são ignorados; qualquer outro caractere invalida o valor.

```javascript
import { isValidRenavam } from '@brazilian-utils/brazilian-utils';

isValidRenavam('639884962'); // true (9 dígitos, formato antigo)
isValidRenavam('00639884962'); // true (11 dígitos, formato novo)
isValidRenavam('0063988.4962'); // true (pontos e hífens são ignorados)
isValidRenavam('12345678901'); // false (checksum inválido)
isValidRenavam('00000000000'); // false (dígitos repetidos)
isValidRenavam('ab00639884962'); // false (letras são rejeitadas)
```

### generateRenavam

Gera um RENAVAM válido aleatório na forma de 11 dígitos: dez dígitos de base mais o dígito verificador.

```javascript
import { generateRenavam } from '@brazilian-utils/brazilian-utils';

generateRenavam(); // '12345678900'
```

## PIS

### isValidPis

Valida um PIS. Aceita o valor com ou sem máscara.

- Um valor com todos os dígitos iguais é rejeitado.

```javascript
import { isValidPis } from '@brazilian-utils/brazilian-utils';

isValidPis('12056412847'); // true
isValidPis('12056412547'); // false
```

### formatPis

Formata um PIS.

- **Opções** (`FormatPisOptions`): `pad` completa o valor com zeros à esquerda até 11 dígitos antes de aplicar a máscara (padrão `false`).

```javascript
import { formatPis } from '@brazilian-utils/brazilian-utils';

formatPis('12345678901'); // 123.45678.90-1
formatPis('123456789', { pad: true }); // 001.23456.78-9
```

### parsePis

Remove a formatação do PIS, mantém apenas os dígitos e limita o resultado a 11 dígitos.

```javascript
import { parsePis } from '@brazilian-utils/brazilian-utils';

parsePis('123.45678.90-1'); // 12345678901
```

### generatePis

Gera um PIS válido aleatório.

```javascript
import { generatePis } from '@brazilian-utils/brazilian-utils';

generatePis(); // '91077906857'
```

## Processo jurídico

### isValidProcessoJuridico

Valida um número de processo jurídico, conforme a Resolução CNJ nº 65/2008. Três coisas são verificadas: o layout `NNNNNNN-DD.AAAA.J.TR.OOOO`, os dígitos verificadores `DD` (ISO 7064 MOD 97-10) e o par `J`/`TR`.

- `J` e `TR` precisam nomear um órgão e um tribunal que existem.
- A unidade de origem (`OOOO`) é verificada apenas como quatro dígitos.

```javascript
import { isValidProcessoJuridico } from '@brazilian-utils/brazilian-utils';

isValidProcessoJuridico('00020802520125150049'); // true
isValidProcessoJuridico('0002080-25.2012.5.15.0049'); // true (máscara do CNJ)
isValidProcessoJuridico('0000100-68.2008.4.06.0000'); // true (TRF da 6ª Região)
isValidProcessoJuridico('0000100-23.2008.8.28.0000'); // false (não existe 28º Tribunal de Justiça)
isValidProcessoJuridico('ab00020802520125150049'); // false (letras são rejeitadas)
```

Fonte: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119).

### formatProcessoJuridico

Formata um número de processo jurídico na máscara do CNJ `NNNNNNN-DD.AAAA.J.TR.OOOO`.

- **Opções** (`FormatProcessoJuridicoOptions`): `pad` completa o valor com zeros à esquerda até 20 dígitos antes de aplicar a máscara (padrão `false`).

```javascript
import { formatProcessoJuridico } from '@brazilian-utils/brazilian-utils';

formatProcessoJuridico('00020802520125150049'); // 0002080-25.2012.5.15.0049
formatProcessoJuridico('20802520125150049', { pad: true }); // 0002080-25.2012.5.15.0049
```

Fonte: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119).

### parseProcessoJuridico

Remove a formatação do processo jurídico, mantém apenas os dígitos e limita o resultado a 20 dígitos.

```javascript
import { parseProcessoJuridico } from '@brazilian-utils/brazilian-utils';

parseProcessoJuridico('0002080-25.2012.5.15.0049'); // 00020802520125150049
```

### generateProcessoJuridico

Gera um número de processo jurídico válido aleatório no layout da Resolução CNJ nº 65/2008.

- **Opções** (`GenerateProcessoJuridicoParams`): `year` define o campo `AAAA`, um inteiro entre o ano atual e 9999 (padrão: o ano atual); `court` define o órgão `J`, de 1 a 9 (padrão: aleatório).
- `TR` é sorteado entre os tribunais do órgão escolhido, então o par sempre nomeia um tribunal que existe.
- Retorna `null` quando `year` ou `court` está fora do intervalo.

```javascript
import { generateProcessoJuridico } from '@brazilian-utils/brazilian-utils';

generateProcessoJuridico(); // '89478645020266070326'
generateProcessoJuridico({ year: 2026, court: 5 }); // '98412562120265087260' (Justiça do Trabalho, TRT da 8ª Região)
generateProcessoJuridico({ year: 10000 }); // null (ano fora do intervalo)
generateProcessoJuridico({ court: 10 }); // null (órgão inexistente)
```

Fonte: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119).

## Contas bancárias e bancos

### isValidBankAccount

Valida uma conta bancária brasileira. O `bankCode` precisa ser um participante do STR do Banco Central (a lista que `getBankByCode` usa).

- **Parâmetros** (`IsValidBankAccountParams`, todos strings): `bankCode` (3 dígitos), `agency` (1-5 dígitos), `account` (1-13 dígitos) e `digit` (1-2 caracteres, ou `X` para o Banco do Brasil e `P` para o Bradesco).
- Um banco da lista é validado de uma de três formas: pelo algoritmo de dígito verificador publicado, apenas pela estrutura ou por um fallback genérico mod10/mod11.

Bancos validados pelo algoritmo de dígito verificador publicado:

| Banco | Código | Agência | Conta | Observações |
| --- | --- | --- | --- | --- |
| Banco do Brasil | `001` | 4-5 dígitos | 8-10 dígitos | mod11 com pesos 2..9 ciclando da direita para a esquerda; `digit` pode ser `"X"` |
| Santander | `033` | 4 dígitos | 8 dígitos | pesos `9,7,3,1,0,0,9,7,1,3,1,9,7,3` sobre agência + `"00"` + conta, desprezando as dezenas |
| Banrisul | `041` | 4 dígitos | 9 dígitos | pesos `3,2,4,7,6,5,4,3,2`; resto 0 gera `0` e resto 1 gera `6`; `account` é tipo (2 dígitos) + conta (7 dígitos) |
| Caixa Econômica Federal | `104` | 4 dígitos | 11 dígitos | mod11 sobre agência + conta; `account` é operação (3 dígitos) + conta (8 dígitos) |
| Bradesco | `237` | 4 dígitos | 7 dígitos | mod11 com pesos 2..7 ciclando da direita para a esquerda; resto 0 gera `0` e resto 1 gera `"P"` |
| Nubank | `260` | 4 dígitos | 5-13 dígitos | dígito de Verhoeff sobre a conta, ignorando zeros à esquerda |
| Itaú Unibanco | `341` | 4 dígitos | 5 dígitos | mod10 sobre agência + conta |
| HSBC / Kirton Bank | `399` | 4 dígitos | 6 dígitos | pesos `8,9,2,3,4,5,6,7,8,9` sobre agência + conta; resto 10 gera `0` |
| Citibank | `745` | 4 dígitos | 10 dígitos | pesos `11..2` sobre a conta; resto 0 ou 1 gera `0` |

Bancos validados apenas pela estrutura (um único `digit` numérico basta):

| Banco | Código | | Banco | Código |
| --- | --- | --- | --- | --- |
| Inter | `077` | | Mercado Pago | `323` |
| Ailos | `085` | | C6 | `336` |
| XP | `102` | | PicPay | `380` |
| Unicred | `136` | | Cora | `403` |
| Stone | `197` | | Pan | `623` |
| BTG Pactual | `208` | | BV | `655` |
| Original | `212` | | Daycoval | `707` |
| PagBank | `290` | | Sicredi | `748` |
| BMG | `318` | | Sicoob | `756` |

- Todo outro banco da lista usa o fallback genérico: `digit` precisa bater com mod10 ou mod11 sobre a conta. Um `digit` de 2 caracteres encadeia mod10 e depois mod11.

```javascript
import { isValidBankAccount } from '@brazilian-utils/brazilian-utils';

isValidBankAccount({
  bankCode: '001',
  agency: '1584',
  account: '00210169',
  digit: '6'
}); // true (Banco do Brasil)

isValidBankAccount({
  bankCode: '341',
  agency: '2545',
  account: '02366',
  digit: '1'
}); // true (Itaú)

isValidBankAccount({
  bankCode: '104',
  agency: '0647',
  account: '00188888888',
  digit: '7'
}); // true (Caixa: operação "001" + conta "88888888")

isValidBankAccount({
  bankCode: '041',
  agency: '2664',
  account: '358507670',
  digit: '6'
}); // true (Banrisul: tipo "35" + conta "8507670")

isValidBankAccount({
  bankCode: '260',
  agency: '0001',
  account: '5216125',
  digit: '0'
}); // true (Nubank, Verhoeff)

isValidBankAccount({
  bankCode: '077',
  agency: '0001',
  account: '123456789',
  digit: '0'
}); // true (Banco Inter, apenas estrutura)

isValidBankAccount({
  bankCode: '077',
  agency: '0001',
  account: '123456789',
  digit: 'X'
}); // false (banco validado por estrutura ainda exige dígito numérico)

isValidBankAccount({
  bankCode: '999',
  agency: '1234',
  account: '123456',
  digit: '6'
}); // false (999 não é participante do Banco Central)

isValidBankAccount({
  bankCode: '246',
  agency: '1234',
  account: '123456',
  digit: '6'
}); // true (Banco ABC Brasil, fallback genérico mod10)
```

Fonte: [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv), [Regras de Validação de dígito verificador](https://github.com/eduardokum/laravel-boleto/blob/master/manuais/Regras%20Validacao%20Conta%20Corrente%20VI_EPS.pdf).

### getBanks

Obtém todos os bancos brasileiros com código de compensação (COMPE), a partir da lista de participantes do STR do Banco Central do Brasil.

- Cada banco (`Bank`) tem um `code` (COMPE, 3 dígitos), um `ispb` (8 dígitos) e um `name`.

```javascript
import { getBanks } from '@brazilian-utils/brazilian-utils';

getBanks();
// [
//   { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' },
//   { code: '003', ispb: '04902979', name: 'BANCO DA AMAZONIA S.A.' },
//   { code: '004', ispb: '07237373', name: 'Banco do Nordeste do Brasil S.A.' },
//   ... mais 460 itens
// ]
```

Fonte: [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv).

### getBankByCode

Busca um banco brasileiro pelo seu código de compensação (COMPE), a partir da lista de participantes do STR do Banco Central do Brasil. Aceita `string` ou `number`.

- Retorna o `Bank` correspondente, ou `null` quando nenhum banco tem esse código.

```javascript
import { getBankByCode } from '@brazilian-utils/brazilian-utils';

getBankByCode('001'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode(1); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode('999'); // null
```

Fonte: [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv).

### getBankByIspb

Busca um banco brasileiro pelo seu ISPB (Identificador do Sistema de Pagamentos Brasileiro), o código de 8 dígitos de todo participante do SPB. Aceita `string` ou `number`, com ou sem zeros à esquerda.

- Retorna o `Bank` correspondente, ou `null` quando nenhum banco tem esse ISPB. A base só traz as instituições que também têm código COMPE.

```javascript
import { getBankByIspb } from '@brazilian-utils/brazilian-utils';

getBankByIspb('00000000'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByIspb('60701190'); // { code: '341', ispb: '60701190', name: 'ITAÚ UNIBANCO S.A.' }
getBankByIspb('99999999'); // null
```

Fonte: [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv), [BrasilAPI](https://brasilapi.com.br/api/banks/v1).

## IBAN

### isValidIban

Valida um IBAN (International Bank Account Number) brasileiro. Somente IBANs brasileiros (código de país `BR`) são reconhecidos; qualquer outro país retorna `false`.

- Layout, 29 caracteres: `BR`, 2 dígitos verificadores (ISO 7064 MOD 97-10), ISPB de 8 dígitos, agência de 5, conta de 10, 1 letra de tipo de conta, 1 indicador de titularidade.
- Tipo de conta: qualquer letra, normalmente `C` ou `P`. Titularidade: `1` a `9`, depois `A` a `Z`.
- Aceita a forma compacta ou grupos de 4 separados por um espaço, `.`, `-` ou `/`, em maiúsculas ou minúsculas.

```javascript
import { isValidIban } from '@brazilian-utils/brazilian-utils';

isValidIban('BR1500000000000010932840814P2'); // true
isValidIban('BR15 0000 0000 0000 1093 2840 814P 2'); // true (espaços de agrupamento)
isValidIban('BR15-0000-0000-0000-1093-2840-814P-2'); // true (qualquer um dos caracteres de máscara)
isValidIban('BR1500000000000010932840814P3'); // false (dígitos verificadores inválidos)
isValidIban('BR15 000 00000 0000 1093 2840 814P 2'); // false (separador dentro de um grupo)
isValidIban('DE89370400440532013000'); // false (IBAN não brasileiro)
```

Fonte: [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf), [Circular BCB nº 3.625/2013](https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf), [ISO 13616-1:2020](https://www.iso.org/standard/81090.html).

### formatIban

Formata um IBAN no agrupamento impresso da ISO 13616: blocos de 4 caracteres, a apresentação usada em extratos e formulários bancários. Não valida; para isso, use `isValidIban`.

- Limita o resultado a 29 caracteres, o tamanho de um IBAN brasileiro.

```javascript
import { formatIban } from '@brazilian-utils/brazilian-utils';

formatIban('BR1500000000000010932840814P2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('br1500000000000010932840814p2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('BR15'); // 'BR15'
formatIban('BR15 0000-0000.0000/1093 2840 814P-2'); // 'BR15 0000 0000 0000 1093 2840 814P 2' (só letras e dígitos são lidos)
```

### parseIban

Remove a formatação do IBAN, mantém as letras e os dígitos, coloca o resultado em maiúsculas e o limita aos 29 caracteres de um IBAN brasileiro.

```javascript
import { parseIban } from '@brazilian-utils/brazilian-utils';

parseIban('BR15 0000 0000 0000 1093 2840 814P 2'); // 'BR1500000000000010932840814P2'
parseIban('br15-0000.0000/0000 1093 2840 814p-2'); // 'BR1500000000000010932840814P2'
```

### getIbanInfo

Interpreta um IBAN brasileiro em seus campos. Retorna um objeto `IbanInfo`, ou `null` sempre que `isValidIban` retornaria `false`.

- Campos, todos strings: `countryCode`, `checkDigits`, `bankIspb`, `branch`, `account`, `accountType` (normalmente `C` ou `P`) e `owner` (`1` a `9`, depois `A` a `Z`).
- Mesmas regras de entrada de `isValidIban`.

```javascript
import { getIbanInfo } from '@brazilian-utils/brazilian-utils';

getIbanInfo('BR1500000000000010932840814P2');
// {
//   countryCode: 'BR',
//   checkDigits: '15',
//   bankIspb: '00000000',
//   branch: '00001',
//   account: '0932840814',
//   accountType: 'P',
//   owner: '2'
// }

getIbanInfo('DE89370400440532013000'); // null (IBAN não brasileiro)
getIbanInfo('BR15 000 00000 0000 1093 2840 814P 2'); // null (separador dentro de um grupo)
```

Fonte: [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf), [Circular BCB nº 3.625/2013](https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf), [ISO 13616-1:2020](https://www.iso.org/standard/81090.html).

## Moeda, números e datas por extenso

### formatCurrency

Formata um número ou uma string numérica no padrão BRL (`1.234,56`). Um `number` é formatado como está, com sinal e decimais preservados.

- **Opções** (`FormatCurrencyOptions`): `symbol` (padrão `false`) prefixa o resultado com `R$`; `precision` (padrão 2) define as casas decimais, limitada de 0 a 20.
- Uma `string` é lida como `parseCurrency` a lê, com uma diferença: um valor sem nenhum separador permanece em unidades inteiras, então `'1234'` vira `1.234,00`.
- Retorna `''` para um valor não finito ou que não pode ser convertido em número.

```javascript
import { formatCurrency } from '@brazilian-utils/brazilian-utils';

formatCurrency(10); // 10,00
formatCurrency(10756.11); // 10.756,11
formatCurrency(10756.123, { precision: 3 }); // 10.756,123
formatCurrency(1234.56, { symbol: true }); // R$ 1.234,56
formatCurrency(-1050); // -1.050,00 (o sinal de um number é preservado)
formatCurrency('123456'); // 123.456,00 (dígitos simples são lidos como número inteiro)
formatCurrency('1.234,56'); // 1.234,56 (o último "," ou "." seguido de 1 a 2 dígitos é o separador decimal)
formatCurrency('-10.5'); // -10,50 (o "-" inicial é preservado)
formatCurrency(Number.NaN); // "" (números não finitos viram string vazia)
```

### parseCurrency

Converte uma string de moeda no padrão BRL em número.

- **Opções** (`ParseCurrencyOptions`): `precision` (padrão 2) é a quantidade de dígitos lidos como subunidades monetárias, limitada de 0 a 20.
- O último `,` ou `.` seguido de 1 a 2 dígitos (até `precision`, quando maior) é o separador decimal; todo outro `,` ou `.` é separador de milhar.
- Um valor sem nenhum separador é lido como centavos e dividido por `10 ** precision`.

```javascript
import { parseCurrency } from '@brazilian-utils/brazilian-utils';

parseCurrency('R$ 1.234,56'); // 1234.56
parseCurrency('1234,56'); // 1234.56
parseCurrency('R$ 0,50'); // 0.5
parseCurrency('R$ 1.234'); // 1234 ("." seguido de 3 dígitos é separador de milhar)
parseCurrency('1,5'); // 1.5
parseCurrency('1234'); // 12.34 (sem nenhum separador, vale a convenção de centavos)
parseCurrency('-R$ 1,00'); // -1 (o "-" inicial é preservado)
parseCurrency('R$ 1,001', { precision: 3 }); // 1.001
parseCurrency(''); // 0
```

### convertNumberToWords

Escreve um número inteiro por extenso em português do Brasil: `1235` vira `"mil duzentos e trinta e cinco"`.

- **Opções** (`ConvertNumberToWordsOptions`): `gender` (padrão `"masculine"`) concorda "um/dois" e a centena ("duzentos/duzentas") com o substantivo que o número qualifica.
- Aceita inteiros de `-999999999999999` a `999999999999999` (999 trilhões). Um valor não inteiro é truncado em direção a zero.
- Retorna `""` para um valor fora desse intervalo ou não finito.

```javascript
import { convertNumberToWords } from '@brazilian-utils/brazilian-utils';

convertNumberToWords(123); // "cento e vinte e três"
convertNumberToWords(1001); // "mil e um"
convertNumberToWords(2000000); // "dois milhões"
convertNumberToWords(-42); // "menos quarenta e dois"
convertNumberToWords(2, { gender: 'feminine' }); // "duas"
convertNumberToWords(12.9); // "doze" (truncado em direção a zero)
convertNumberToWords(NaN); // ""
```

### convertCurrencyToWords

Escreve um valor em reais por extenso, como em cheques e contratos: `1523.45` vira `"mil quinhentos e vinte e três reais e quarenta e cinco centavos"`. Não recebe opções.

- O `value` é truncado (não arredondado) para 2 casas decimais.
- Retorna `""` para uma entrada inválida ou um valor acima de 999 trilhões de reais.

```javascript
import { convertCurrencyToWords } from '@brazilian-utils/brazilian-utils';

convertCurrencyToWords(1523.45); // "mil quinhentos e vinte e três reais e quarenta e cinco centavos"
convertCurrencyToWords(1); // "um real"
convertCurrencyToWords(0.01); // "um centavo"
convertCurrencyToWords(1000000); // "um milhão de reais"
convertCurrencyToWords(0); // "zero reais"
convertCurrencyToWords(-5.5); // "menos cinco reais e cinquenta centavos"
convertCurrencyToWords(-0.001); // "zero reais" (trunca para nada)
```

### convertDateToWords

Escreve uma data por extenso em português do Brasil: `"01/01/2024"` vira `"primeiro de janeiro de dois mil e vinte e quatro"`. Aceita um `Date`, lido pela sua data de calendário local, ou uma string no formato `"dd/mm/yyyy"` ou ISO `"yyyy-mm-dd"`.

- **Opções** (`ConvertDateToWordsOptions`): `style` (padrão `"full"`) escreve dia, mês e ano por extenso; `"month"` escreve só o mês e deixa dia e ano em dígitos, o dia 1 como `"1º"`. `weekday` (padrão `false`) prefixa o nome do dia da semana em minúsculas e uma vírgula.
- Retorna `""` para um `Date` inválido, uma string malformada, um dia ou mês que não existe ou uma data anterior ao ano 1.

```javascript
import { convertDateToWords } from '@brazilian-utils/brazilian-utils';

convertDateToWords('01/01/2024'); // "primeiro de janeiro de dois mil e vinte e quatro"
convertDateToWords('2024-01-02'); // "dois de janeiro de dois mil e vinte e quatro"
convertDateToWords(new Date(2024, 0, 1)); // "primeiro de janeiro de dois mil e vinte e quatro"
convertDateToWords('02/03/2024', { style: 'month' }); // "2 de março de 2024"
convertDateToWords('01/01/2024', { style: 'month' }); // "1º de janeiro de 2024"
convertDateToWords('02/03/2024', { weekday: true }); // "sábado, dois de março de dois mil e vinte e quatro"
convertDateToWords('10/05/1999'); // "dez de maio de mil novecentos e noventa e nove"
convertDateToWords('31/04/2024'); // "" (abril tem 30 dias)
convertDateToWords('invalid'); // ""
convertDateToWords('29/02/1900'); // "" (1900 não é bissexto)
```

## Estados e municípios

### getStates

Retorna todos os estados brasileiros, cada um com sigla, nome, código da região, nome da região e código IBGE de 2 dígitos (`cUF`).

- Ordenados por nome no locale "pt-BR".
- Exporta os tipos `State`, `StateCode` e `StateName`. `State` é uma união discriminada: estreitá-lo pelo `code` também estreita os demais campos.

```javascript
import { getStates } from '@brazilian-utils/brazilian-utils';

getStates();
// [
//   { code: 'AC', name: 'Acre', regionCode: 'N', regionName: 'Norte', ibgeCode: 12 },
//   { code: 'AL', name: 'Alagoas', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 27 },
//   { code: 'AP', name: 'Amapá', regionCode: 'N', regionName: 'Norte', ibgeCode: 16 },
//   { code: 'AM', name: 'Amazonas', regionCode: 'N', regionName: 'Norte', ibgeCode: 13 },
//   { code: 'BA', name: 'Bahia', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 29 },
//   { code: 'CE', name: 'Ceará', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 23 },
//   { code: 'DF', name: 'Distrito Federal', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 53 },
//   { code: 'ES', name: 'Espírito Santo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 32 },
//   { code: 'GO', name: 'Goiás', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 52 },
//   { code: 'MA', name: 'Maranhão', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 21 },
//   { code: 'MT', name: 'Mato Grosso', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 51 },
//   { code: 'MS', name: 'Mato Grosso do Sul', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 50 },
//   { code: 'MG', name: 'Minas Gerais', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 31 },
//   { code: 'PA', name: 'Pará', regionCode: 'N', regionName: 'Norte', ibgeCode: 15 },
//   { code: 'PB', name: 'Paraíba', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 25 },
//   { code: 'PR', name: 'Paraná', regionCode: 'S', regionName: 'Sul', ibgeCode: 41 },
//   { code: 'PE', name: 'Pernambuco', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 26 },
//   { code: 'PI', name: 'Piauí', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 22 },
//   { code: 'RJ', name: 'Rio de Janeiro', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 33 },
//   { code: 'RN', name: 'Rio Grande do Norte', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 24 },
//   { code: 'RS', name: 'Rio Grande do Sul', regionCode: 'S', regionName: 'Sul', ibgeCode: 43 },
//   { code: 'RO', name: 'Rondônia', regionCode: 'N', regionName: 'Norte', ibgeCode: 11 },
//   { code: 'RR', name: 'Roraima', regionCode: 'N', regionName: 'Norte', ibgeCode: 14 },
//   { code: 'SC', name: 'Santa Catarina', regionCode: 'S', regionName: 'Sul', ibgeCode: 42 },
//   { code: 'SP', name: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 35 },
//   { code: 'SE', name: 'Sergipe', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 28 },
//   { code: 'TO', name: 'Tocantins', regionCode: 'N', regionName: 'Norte', ibgeCode: 17 },
// ]
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getStateByIbgeCode

Retorna o estado brasileiro cujo código IBGE de 2 dígitos (`cUF`, o Código da Unidade da Federação) corresponde ao valor informado.

- É o código de UF do primeiro campo de uma chave de acesso de DF-e, a que `isValidNfeKey` cobre.
- Aceita string ou número inteiro não negativo.
- Retorna `null` quando o código não corresponde a nenhum estado. Exporta o tipo `State`.

```javascript
import { getStateByIbgeCode } from '@brazilian-utils/brazilian-utils';

getStateByIbgeCode('35');
// { code: 'SP', name: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 35 }

getStateByIbgeCode(11);
// { code: 'RO', name: 'Rondônia', regionCode: 'N', regionName: 'Norte', ibgeCode: 11 }

getStateByIbgeCode('00'); // null
getStateByIbgeCode(-35); // null
getStateByIbgeCode(3.5); // null
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/v1/localidades/estados), [Manual de Orientação do Contribuinte](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf)

### getStateCodeByName

Retorna a sigla de um estado brasileiro a partir do nome completo.

- A comparação ignora acentos, não diferencia maiúsculas de minúsculas e remove os espaços nas pontas; espaços internos repetidos viram um só.
- Retorna `null` quando nenhum estado corresponde. Exporta o tipo `StateCode`.

```javascript
import { getStateCodeByName } from '@brazilian-utils/brazilian-utils';

getStateCodeByName('São Paulo'); // 'SP'
getStateCodeByName('sao paulo'); // 'SP'
getStateCodeByName('  Rio de Janeiro  '); // 'RJ'
getStateCodeByName('Neverland'); // null
```

### getStateNameByCode

Retorna o nome completo de um estado brasileiro a partir da sigla.

- A comparação não diferencia maiúsculas de minúsculas e remove os espaços nas pontas.
- Retorna `null` quando nenhum estado corresponde. Exporta o tipo `StateName`.

```javascript
import { getStateNameByCode } from '@brazilian-utils/brazilian-utils';

getStateNameByCode('SP'); // 'São Paulo'
getStateNameByCode('sp'); // 'São Paulo'
getStateNameByCode('  Rj  '); // 'Rio de Janeiro'
getStateNameByCode('ZZ'); // null
```

### getTimezoneByState

Retorna o nome do fuso horário IANA (zona do tzdata) de um estado brasileiro: o fuso da sua capital.

- A comparação não diferencia maiúsculas de minúsculas e remove os espaços nas pontas.
- Retorna `null` quando nenhum estado corresponde.

```javascript
import { getTimezoneByState } from '@brazilian-utils/brazilian-utils';

getTimezoneByState('SP'); // 'America/Sao_Paulo'
getTimezoneByState('am'); // 'America/Manaus'
getTimezoneByState('AC'); // 'America/Rio_Branco'
getTimezoneByState('PE'); // 'America/Recife'
getTimezoneByState('ZZ'); // null
```

Fonte: [IANA Time Zone Database](https://www.iana.org/time-zones)

### getMunicipalities

Retorna os municípios brasileiros publicados pelo IBGE: todos os municípios, ou só os de um estado quando `stateCode` é informado.

- Cada município (`Municipality`) é `{ code, name, stateCode }`, onde `code` é o código IBGE de 7 dígitos. Ordenados por nome no locale "pt-BR".
- Só um `stateCode` omitido (ou `undefined`) pede a lista completa: `null` e `''` retornam `[]`.
- `stateCode` diferencia maiúsculas de minúsculas: `'sp'`, como um código desconhecido, retorna `[]`.
- Embute todos os 5571 municípios. Veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle) para carregá-lo sob demanda via `@brazilian-utils/brazilian-utils/get-municipalities`.

```javascript
import { getMunicipalities } from '@brazilian-utils/brazilian-utils';

// Retorna todos os municípios brasileiros (ordenados por nome).
getMunicipalities();
// [
//   { code: '5200050', name: 'Abadia de Goiás', stateCode: 'GO' },
//   { code: '3100104', name: 'Abadia dos Dourados', stateCode: 'MG' },
//   { code: '5200100', name: 'Abadiânia', stateCode: 'GO' },
//   { code: '3100203', name: 'Abaeté', stateCode: 'MG' },
//   { code: '1500107', name: 'Abaetetuba', stateCode: 'PA' },
//   ... mais 5566 itens
// ]

// Retorna todos os municípios do estado de São Paulo.
getMunicipalities('SP');
// [
//   { code: '3500105', name: 'Adamantina', stateCode: 'SP' },
//   { code: '3500204', name: 'Adolfo', stateCode: 'SP' },
//   { code: '3500303', name: 'Aguaí', stateCode: 'SP' },
//   { code: '3500402', name: 'Águas da Prata', stateCode: 'SP' },
//   { code: '3500501', name: 'Águas de Lindóia', stateCode: 'SP' },
//   ... mais 640 itens
// ]

getMunicipalities('ZZ'); // []
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getMunicipalityByCode

Busca um município brasileiro pelo código IBGE de 7 dígitos.

- Aceita o código como string ou número inteiro não negativo.
- Retorna `{ code, name, stateCode }` (`Municipality`), ou `null` quando o código não tem 7 dígitos ou não corresponde a nenhum município.

```javascript
import { getMunicipalityByCode } from '@brazilian-utils/brazilian-utils';

getMunicipalityByCode('3550308');
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode(3550308);
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode('0000000'); // null (código desconhecido)
getMunicipalityByCode('123'); // null (não tem 7 dígitos)
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getCities

Retorna os nomes das cidades brasileiras: todas as cidades, ou só as de um estado. **Descontinuada:** use `getMunicipalities` no lugar.

- Ordenadas no locale "pt-BR".
- Qualquer `state` falsy pede a lista completa, enquanto `getMunicipalities` retorna `[]`.
- `state` diferencia maiúsculas de minúsculas: `'sp'`, como um código desconhecido, retorna `[]`.
- Embute os 5571 nomes (~154,2 KB minificado, ~49,8 KB com gzip). Veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle) para carregá-la sob demanda via `@brazilian-utils/brazilian-utils/get-cities`.

```javascript
import { getCities } from '@brazilian-utils/brazilian-utils';

// Retorna todas as cidades brasileiras (ordenadas alfabeticamente).
getCities();
// [
//   'Abadia de Goiás',
//   'Abadia dos Dourados',
//   'Abadiânia',
//   'Abaeté',
//   'Abaetetuba',
//   'Abaiara',
//   'Abaíra',
//   'Abaré',
//   'Abatiá',
//   'Abdon Batista',
//   ... mais 5561 itens
// ]

// Retorna todas as cidades brasileiras do estado de São Paulo (ordenadas alfabeticamente).
getCities('SP');
// [
//   "Adamantina",
//   "Adolfo",
//   "Aguaí",
//   "Águas da Prata",
//   "Águas de Lindóia",
//   "Águas de Santa Bárbara",
//   "Águas de São Pedro",
//   "Agudos",
//   "Alambari",
//   "Alfredo Marcondes",
//   ... mais 635 itens
// ]
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getMunicipality

Busca informações de município por código IBGE, ou um código IBGE a partir do nome do município e UF. **Descontinuada:** use `getMunicipalityByCode` no lugar, que é síncrona e offline; casar um município pelo nome fica a cargo da aplicação, sobre `getMunicipalities`.

- Uma única função cobre as duas direções, dependendo se `options` tem `code` ou `municipalityName`/`uf`. A busca é offline: nenhuma requisição de rede é feita.
- A comparação do nome ignora acentos, não diferencia maiúsculas de minúsculas e reduz espaços repetidos a um só.
- Resolve para `null` para um município desconhecido, uma UF desconhecida ou uma entrada inválida.
- `GetMunicipalityOptions`, `GetMunicipalityByCodeOptions` e `GetMunicipalityByNameOptions` são aliases descontinuados dos tipos abaixo.

```javascript
import { getMunicipality } from '@brazilian-utils/brazilian-utils';

await getMunicipality({ code: '3550308' });
// ['São Paulo', 'SP']

await getMunicipality({ code: 3550308 });
// ['São Paulo', 'SP']

await getMunicipality({ municipalityName: 'sao paulo', uf: 'sp' });
// '3550308'

await getMunicipality({ code: '0000000' });
// null (código desconhecido)

await getMunicipality({ code: '123' });
// null (não tem 7 dígitos)
```

```typescript
import {
  getMunicipality,
  type GetMunicipalityByCodeParams,
  type GetMunicipalityByNameParams,
  type GetMunicipalityParams,
} from '@brazilian-utils/brazilian-utils';

const byCode: GetMunicipalityByCodeParams = { code: '3550308' };
const byName: GetMunicipalityByNameParams = { municipalityName: 'sao paulo', uf: 'sp' };

await getMunicipality(byCode);
// Promise<[string, string] | null>

await getMunicipality(byName);
// Promise<string | null>

const lookUp = (options: GetMunicipalityParams) => getMunicipality(options);
// (options: GetMunicipalityParams) => Promise<[string, string] | string | null>
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

## Feriados e dias úteis

### getHolidays

Retorna os feriados brasileiros de um ano: os nacionais e, com um `stateCode`, também os daquele estado. Aceita um ano ou `{ year, stateCode }` (`GetHolidaysParams`).

- Cada feriado é um `Holiday` cujo `type` (`HolidayType`) é `"national"`, `"state"`, `"optional"` ou `"religious"`. Os feriados vêm ordenados por data.
- O "Dia da Consciência Negra", 20/11, é nacional a partir de 2024.
- As regras por estado (o deslocamento para domingo em SC, o Corpus Christi no DF, datas que deixaram de ser feriado) seguem a lei de cada estado; veja a fonte para a lista.
- Um `stateCode` desconhecido ou que não é string é ignorado e só os feriados nacionais são retornados.
- Retorna `[]` quando o ano não é um inteiro de 1900 a 2099, ou quando o argumento não é nem número nem objeto.

```javascript
import { getHolidays } from '@brazilian-utils/brazilian-utils';

// Obtém todos os feriados nacionais de 2024
getHolidays(2024);
// [
//   { name: 'Ano novo', date: Date('2024-01-01'), type: 'national' },
//   { name: 'Carnaval (terça-feira)', date: Date('2024-02-13'), type: 'optional' },
//   { name: 'Sexta-feira Santa', date: Date('2024-03-29'), type: 'national' },
//   { name: 'Páscoa', date: Date('2024-03-31'), type: 'religious' },
//   { name: 'Dia da Consciência Negra', date: Date('2024-11-20'), type: 'national' },
//   // ... mais feriados
// ]

// Obtém feriados para um estado específico
getHolidays({ year: 2024, stateCode: 'SP' });
// Inclui feriados nacionais mais feriados estaduais (ex: "Revolução Constitucionalista")
```

Fonte: `src/get-holidays/constants.ts`, [Lei nº 662/1949](https://www.planalto.gov.br/ccivil_03/leis/l0662.htm), [Lei nº 9.093/1995](https://www.planalto.gov.br/ccivil_03/leis/l9093.htm).

### isHoliday

Verifica se uma data é feriado brasileiro. Aceita `{ targetDate, stateCode? }` (`IsHolidayParams`).

- A verificação usa a data de calendário local de `targetDate`, não o seu instante UTC.
- `stateCode` também considera os feriados daquele estado. Um código desconhecido é ignorado, como em `getHolidays`.
- Retorna `false` quando `targetDate` está ausente ou não é um `Date` válido, ou quando `stateCode` está presente e não é string.

```javascript
import { isHoliday } from '@brazilian-utils/brazilian-utils';

isHoliday({ targetDate: new Date(2024, 0, 1) }); // true
isHoliday({ targetDate: new Date(2024, 6, 9), stateCode: 'SP' }); // true
isHoliday(); // false
```

### isBusinessDay

Verifica se uma data é dia útil no Brasil: não é sábado, domingo nem um feriado que `getHolidays` lista para o seu dia de calendário local.

- **Opções** (`BusinessDayOptions`, as mesmas de todos os utilitários de dias úteis): `includeOptional` (padrão `true`) também conta os feriados `"optional"`, Carnaval e Corpus Christi, como dias não úteis; `stateCode` também conta os feriados daquele estado.
- Retorna `false` quando `value` não é um `Date` válido ou o seu ano está fora de 1900 a 2099, ou quando `stateCode` está presente e não é string.

```javascript
import { isBusinessDay } from '@brazilian-utils/brazilian-utils';

isBusinessDay(new Date(2024, 0, 2)); // true (terça-feira, não é feriado)
isBusinessDay(new Date(2024, 0, 1)); // false (Ano novo)
isBusinessDay(new Date(2024, 0, 6)); // false (sábado)
isBusinessDay(new Date(2024, 1, 13)); // false (Carnaval, feriado facultativo, conta por padrão)
isBusinessDay(new Date(2024, 1, 13), { includeOptional: false }); // true
isBusinessDay(new Date(2024, 6, 9), { stateCode: 'SP' }); // false (Revolução Constitucionalista)
isBusinessDay(new Date(2024, 6, 9)); // true (feriado estadual ignorado sem stateCode)
isBusinessDay(new Date('not a date')); // false
```

### addBusinessDays

Soma dias úteis a uma data, pulando sábados, domingos e os feriados que `isBusinessDay` considera. Assinatura: `addBusinessDays(date, amount, options?)`, a mesma do date-fns.

- **Opções** (`BusinessDayOptions`, as mesmas de `isBusinessDay`): `includeOptional` (padrão `true`) também pula Carnaval e Corpus Christi; `stateCode` também pula os feriados daquele estado.
- Retorna um novo `Date`, com o horário preservado; `date` não é alterado.
- `amount` igual a `0` retorna a mesma data, mesmo em fim de semana ou feriado. Um `amount` negativo anda para trás.
- Retorna `null` quando `date` é inválido, `amount` não é um inteiro finito, `stateCode` não é string ou o resultado sai dos anos de 1900 a 2099.

```javascript
import { addBusinessDays } from '@brazilian-utils/brazilian-utils';

addBusinessDays(new Date(2024, 0, 2, 12), 1); // Date, 2024-01-03 12:00 (o dia seguinte já é útil)
addBusinessDays(new Date(2024, 11, 31, 12), 1); // Date, 2025-01-02 12:00 (2025-01-01 é Ano novo, pulado)
addBusinessDays(new Date(2024, 0, 5, 12), -1); // Date, 2024-01-04 12:00 (anda para trás)
addBusinessDays(new Date(2024, 0, 6, 12), 0); // Date, 2024-01-06 12:00 (sem alteração, mesmo o sábado não sendo dia útil)
addBusinessDays(new Date(2024, 6, 8, 12), 1, { stateCode: 'SP' }); // Date, 2024-07-10 12:00 (2024-07-09 é a Revolução Constitucionalista em SP, pulado)
addBusinessDays(new Date('not a date'), 1); // null
addBusinessDays(new Date(2024, 0, 2), 1.5); // null (não é um número inteiro)
```

### subBusinessDays

Subtrai dias úteis de uma data. `subBusinessDays(date, amount, options?)` é `addBusinessDays(date, -amount, options)`.

- As mesmas regras de `addBusinessDays`, `BusinessDayOptions` incluídas. Um `amount` negativo anda para frente.

```javascript
import { subBusinessDays } from '@brazilian-utils/brazilian-utils';

subBusinessDays(new Date(2024, 0, 5, 12), 1); // Date, 2024-01-04 12:00 (o dia anterior já é útil)
subBusinessDays(new Date(2024, 0, 8, 12), 1); // Date, 2024-01-05 12:00 (anda para trás passando pelo fim de semana)
subBusinessDays(new Date(2025, 0, 2, 12), 1); // Date, 2024-12-31 12:00 (2025-01-01 é Ano novo, pulado)
subBusinessDays(new Date(2024, 0, 5, 12), -1); // Date, 2024-01-08 12:00 (anda para frente)
subBusinessDays(new Date(2024, 0, 6, 12), 0); // Date, 2024-01-06 12:00 (sem alteração, mesmo o sábado não sendo dia útil)
subBusinessDays(new Date(2024, 6, 10, 12), 1, { stateCode: 'SP' }); // Date, 2024-07-08 12:00 (2024-07-09 é a Revolução Constitucionalista em SP, pulado)
subBusinessDays(new Date('not a date'), 1); // null
subBusinessDays(new Date(2024, 0, 2), 1.5); // null (não é um número inteiro)
```

### differenceInBusinessDays

Conta os dias úteis entre duas datas. Assinatura: `differenceInBusinessDays(laterDate, earlierDate, options?)`, a mesma do date-fns.

- **Opções** (`BusinessDayOptions`, as mesmas de `isBusinessDay`): `includeOptional` (padrão `true`) também pula Carnaval e Corpus Christi; `stateCode` também pula os feriados daquele estado.
- Conta `earlierDate` quando é dia útil e cada dia útil estritamente entre as duas datas; `laterDate` nunca é contado. O horário é ignorado.
- O resultado é negativo quando `laterDate` é anterior a `earlierDate`, e `0` no mesmo dia de calendário.
- Retorna `null` quando uma das datas não é um `Date` válido ou está fora dos anos de 1900 a 2099, ou quando `stateCode` não é string.

```javascript
import { differenceInBusinessDays } from '@brazilian-utils/brazilian-utils';

differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 1)); // 0 (01/01 é Ano novo, não contado)
differenceInBusinessDays(new Date(2024, 0, 3), new Date(2024, 0, 2)); // 1 (02/01 contado, uma terça-feira; 03/01 não)
differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 3)); // -1 (a data posterior vem primeiro, então a contagem é negativa)
differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 2)); // 0 (mesmo dia)
differenceInBusinessDays(new Date(2024, 6, 10), new Date(2024, 6, 8), { stateCode: 'SP' }); // 1 (09/07/2024 é feriado estadual em SP)
differenceInBusinessDays(new Date(), new Date('not a date')); // null
```

## Passaporte

### isValidPassport

Valida um número de passaporte brasileiro: 2 letras seguidas de 6 dígitos.

- Não há dígito verificador, então um número bem formado não é necessariamente um passaporte real.

```javascript
import { isValidPassport } from '@brazilian-utils/brazilian-utils';

isValidPassport('AB123456'); // true
isValidPassport('ab123456'); // true (não diferencia maiúsculas de minúsculas)
isValidPassport('AB-123.456'); // true (símbolos são ignorados)
isValidPassport('12345678'); // false
```

Fonte: [Polícia Federal](https://www.gov.br/pf/pt-br/assuntos/passaporte) e seu [FAQ](https://www.gov.br/pf/pt-br/assuntos/passaporte/ajuda/duvidas_/caderneta/caderneta-numero-onde-fica-e).

### formatPassport

Formata um número de passaporte brasileiro: maiúsculas, sem símbolos, limitado a 8 caracteres. É a mesma operação de `parsePassport`, da qual é um alias.

```javascript
import { formatPassport } from '@brazilian-utils/brazilian-utils';

formatPassport('ab123456'); // 'AB123456'
formatPassport('AB-123.456'); // 'AB123456'
```

### parsePassport

Remove todos os caracteres não alfanuméricos de um número de passaporte, converte para maiúsculas e limita o resultado a 8 caracteres.

```javascript
import { parsePassport } from '@brazilian-utils/brazilian-utils';

parsePassport('AB-123.456'); // 'AB123456'
parsePassport(' AB 123 456 '); // 'AB123456'
```

### generatePassport

Gera um número de passaporte brasileiro válido aleatório.

```javascript
import { generatePassport } from '@brazilian-utils/brazilian-utils';

generatePassport(); // 'RY393097'
```

## CNH

### isValidCnh

Valida uma CNH. Espaços, pontos e hífens são ignorados; qualquer outro caractere invalida o valor.

- Um valor cujos 11 dígitos são todos iguais é rejeitado, então `'11111111111'` é inválido.
- O primeiro dígito verificador mantém o resto 1 como `1`, como nos números reais de registro. A Resolução CONTRAN nº 886/2021 diz `0`.

```javascript
import { isValidCnh } from '@brazilian-utils/brazilian-utils';

isValidCnh('00000000119'); // true
isValidCnh('000000001-19'); // true (hífen antes dos dígitos verificadores)
isValidCnh('ab00000000119'); // false (letras são rejeitadas)
```

Fonte: [Resolução CONTRAN nº 886/2021, art. 4º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf); pesos conforme o [siga0984](https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-cnh/).

### formatCnh

Formata uma CNH.

- **Opções** (`FormatCnhOptions`): `pad` completa o valor com zeros à esquerda até os 11 dígitos antes de aplicar a máscara (padrão `false`).

```javascript
import { formatCnh } from '@brazilian-utils/brazilian-utils';

formatCnh('02650306461'); // 026503064-61
formatCnh('2650306461', { pad: true }); // 026503064-61
```

### parseCnh

Remove a formatação da CNH, mantém apenas os dígitos e limita o resultado a 11 dígitos.

```javascript
import { parseCnh } from '@brazilian-utils/brazilian-utils';

parseCnh('026503064-61'); // '02650306461'
```

### generateCnh

Gera uma CNH válida aleatória.

```javascript
import { generateCnh } from '@brazilian-utils/brazilian-utils';

generateCnh(); // '02650306461'
```

## Natureza jurídica

### isValidLegalNature

Valida se um código de natureza jurídica existe na lista oficial, a tabela "Natureza Jurídica 2021" do IBGE/CONCLA. Somente hífens, pontos e espaços são tolerados ao redor dos 4 dígitos.

- Os 92 códigos em vigor são aceitos, mais os 8 que uma revisão anterior extinguiu. `getLegalNature` distingue os dois (`legacy: true`).

```javascript
import { isValidLegalNature } from '@brazilian-utils/brazilian-utils';

isValidLegalNature('2062'); // true
isValidLegalNature('2208'); // true (extinto por uma revisão anterior, ainda aceito)
isValidLegalNature('9999'); // false
```

Fonte: [CONCLA, Natureza Jurídica 2021](https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021) e seu [PDF de estrutura detalhada](https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf).

### formatLegalNature

Formata um código de natureza jurídica. Use `isValidLegalNature` para verificar um código.

- **Opções** (`FormatLegalNatureOptions`): `pad` primeiro completa o valor com zeros à esquerda até os 4 dígitos de um código completo (padrão `false`).

```javascript
import { formatLegalNature } from '@brazilian-utils/brazilian-utils';

formatLegalNature('2062'); // 206-2
formatLegalNature(2062); // 206-2
formatLegalNature('206'); // 206 (máscara aplicada até onde o valor vai)
formatLegalNature('62', { pad: true }); // 006-2 (completado até 4 dígitos antes)
```

### parseLegalNature

Remove a formatação da natureza jurídica, mantém apenas os dígitos e limita o resultado a 4 dígitos.

```javascript
import { parseLegalNature } from '@brazilian-utils/brazilian-utils';

parseLegalNature('206-2'); // '2062'
```

### generateLegalNature

Gera um código de natureza jurídica válido aleatório. Apenas os 92 códigos em vigor são sorteados, nunca um extinto.

```javascript
import { generateLegalNature } from '@brazilian-utils/brazilian-utils';

generateLegalNature(); // '2062'
```

### getLegalNature

Busca um código de natureza jurídica na tabela oficial do IBGE/CONCLA. Retorna `null` para um código desconhecido.

- A entrada (`LegalNature`) também traz a categoria do CONCLA do código, dada pelo seu primeiro dígito.
- Um código que uma revisão anterior extinguiu retorna com `legacy: true` e o `currentCode` a que corresponde hoje, ou `currentCode: null` quando não há sucessor. Os códigos em vigor têm `legacy: false` e nenhum `currentCode`.

| Código extinto | Descrição | Corresponde a |
| --- | --- | --- |
| `2076` | Sociedade Empresária em Nome Coletivo | `2070`, o código para o qual a revisão 2003.1 o renumerou, mesma denominação |
| `2100` | Sociedade Mercantil de Capital e Indústria | nenhum, marcado como "categoria extinta" na correspondência 2003.1 x 2009 |
| `2208` | Entidade Binacional Itaipu | `2275` Empresa Binacional |
| `3042` | Organização Social | `3069` Fundação Privada; a revisão de 2014 criou depois o `3301` Organização Social (OS), onde uma entidade assim qualificada é classificada hoje |
| `3050` | Organização da Sociedade Civil de Interesse Público (Oscip) | nenhum, uma Oscip é classificada pela forma que assume (`3999` ou `3069`) |
| `3093` | Unidade Executora (Programa Dinheiro Direto na Escola) | `3999` Associação Privada |
| `3123` | Partido Político | nenhum, a revisão de 2014 o desdobrou em `3255`, `3263` e `3271` |
| `5002` | Organização Internacional e Outras Instituições Extraterritoriais | `5010` Organização Internacional, o código em que foi aberto junto com `5029` e `5037` |

```javascript
import { getLegalNature } from '@brazilian-utils/brazilian-utils';

getLegalNature('2062');
// {
//   code: '2062',
//   description: 'Sociedade Empresária Limitada',
//   category: { code: '2', description: 'Entidades Empresariais' },
//   legacy: false,
// }
getLegalNature('2208');
// {
//   code: '2208',
//   description: 'Entidade Binacional Itaipu',
//   category: { code: '2', description: 'Entidades Empresariais' },
//   legacy: true,
//   currentCode: '2275',
// }
getLegalNature('3123')?.currentCode; // null (extinto sem sucessor)
getLegalNature('206-2')?.code; // '2062'
getLegalNature(206.2)?.category.description; // 'Entidades Empresariais'
getLegalNature('0000'); // null
```

Fonte: [CONCLA, Natureza Jurídica 2021](https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021).

### getLegalNatures

Retorna o mapa de naturezas jurídicas indexado pelo código. Por padrão apenas os 92 códigos em vigor são listados.

- **Opções** (`GetLegalNaturesParams`): `includeLegacy` (padrão `false`) soma os 8 códigos extintos.

```javascript
import { getLegalNatures } from '@brazilian-utils/brazilian-utils';

const legalNatures = getLegalNatures();

legalNatures['2062']; // 'Sociedade Empresária Limitada'
Object.keys(legalNatures).length; // 92
legalNatures['2208']; // undefined (extinto por uma revisão anterior)
getLegalNatures({ includeLegacy: true })['2208']; // 'Entidade Binacional Itaipu'
```

### getLegalNaturesByCategory

Retorna todas as naturezas jurídicas de uma categoria do CONCLA, o grupo dado pelo primeiro dígito do código. A categoria é aceita como string ou como número.

- Categorias: `1` Administração Pública, `2` Entidades Empresariais, `3` Entidades sem Fins Lucrativos, `4` Pessoas Físicas e `5` Organizações Internacionais e Outras Instituições Extraterritoriais.
- **Opções** (`GetLegalNaturesByCategoryOptions`): `includeLegacy` (padrão `false`) soma os códigos extintos da categoria.
- As entradas retornam ordenadas por código. Uma categoria desconhecida retorna `[]`.

```javascript
import { getLegalNaturesByCategory } from '@brazilian-utils/brazilian-utils';

getLegalNaturesByCategory('4')[0];
// {
//   code: '4014',
//   description: 'Empresa Individual Imobiliária',
//   category: { code: '4', description: 'Pessoas Físicas' },
//   legacy: false,
// }
getLegalNaturesByCategory(4).length; // 6
getLegalNaturesByCategory('2').length; // 30
getLegalNaturesByCategory('2', { includeLegacy: true }).length; // 33
getLegalNaturesByCategory('9'); // []
```

## Título de eleitor

### isValidVoterId

Valida um título de eleitor. Aceita o título padrão de 12 dígitos e o título de 13 dígitos expedido por São Paulo (UF `01`) e Minas Gerais (UF `02`).

- Um título é um número sequencial de 8 dígitos, um código de unidade federativa de 2 dígitos (`01` a `28`) e 2 dígitos verificadores.
- Espaços e pontos são aceitos ao redor e entre os grupos. Qualquer outro caractere, inclusive um hífen, invalida o valor.

```javascript
import { generateVoterId, isValidVoterId } from '@brazilian-utils/brazilian-utils';

const voterId = generateVoterId('SP');

isValidVoterId(voterId); // true
isValidVoterId('102385010671'); // true (12 dígitos)
isValidVoterId('1234567880191'); // true (13 dígitos, São Paulo)
isValidVoterId('123456780124'); // false (dígitos verificadores inválidos)
```

Fonte: [Resolução TSE nº 23.659/2021, art. 36](https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021), [brutils](https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py) e [siga0984](https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-titulo-de-eleitor/).

### formatVoterId

Formata um título de eleitor com o agrupamento de 12 dígitos `0000 0000 00 00`.

- O agrupamento de 13 dígitos `0000 0000 0 00 00` só é usado quando o valor tem mais de 12 dígitos e o código da UF (o 10º e o 11º dígitos) é `01` ou `02`.
- Os dígitos além da última posição do padrão são descartados.

```javascript
import { formatVoterId } from '@brazilian-utils/brazilian-utils';

formatVoterId('123456780175'); // '1234 5678 01 75'
formatVoterId('1234567880191'); // '1234 5678 8 01 91' (título de 13 dígitos SP/MG)
```

### parseVoterId

Remove a formatação do título de eleitor, mantém apenas os dígitos e limita o resultado a 12 dígitos (13 quando os dígitos da UF identificam São Paulo ou Minas Gerais).

```javascript
import { parseVoterId } from '@brazilian-utils/brazilian-utils';

parseVoterId('1234 5678 01 75'); // '123456780175'
parseVoterId('1234 5678 8 01 91'); // '1234567880191' (título de 13 dígitos SP/MG)
```

### generateVoterId

Gera um título de eleitor válido aleatório. O argumento opcional `state` (`StateCode`, ou `"ZZ"` para um título expedido no exterior) define o código de unidade federativa.

- Uma UF desconhecida, ou um valor que não seja string, usa `"ZZ"` (UF `28`).
- O resultado sempre tem 12 dígitos, nunca a forma de 13 dígitos de São Paulo ou Minas Gerais.

```javascript
import { generateVoterId } from '@brazilian-utils/brazilian-utils';

generateVoterId(); // título de eleitor aleatório válido (exterior, "ZZ")
generateVoterId('SP'); // título de eleitor aleatório válido de São Paulo
generateVoterId('XX'); // usa "ZZ" em vez de lançar erro
```

## CNS

### isValidCns

Valida um número de CNS (Cartão Nacional de Saúde), o identificador do SUS (Sistema Único de Saúde) de um usuário, profissional ou estabelecimento de saúde. O valor precisa ser os 15 dígitos, opcionalmente separados nos grupos impressos de 3-4-4-4 por espaço, `.`, `-` ou `/`.

- Cartões definitivos começam com 1 ou 2, provisórios com 7, 8 ou 9; cada um tem sua própria regra de módulo 11.
- Um número iniciado em 5 é rejeitado, seguindo a ANVISA.

```javascript
import { isValidCns } from '@brazilian-utils/brazilian-utils';

isValidCns('123456789010000'); // true (definitivo)
isValidCns('100000000060018'); // true (definitivo, dígito bruto 10, sufixo 001)
isValidCns('700000000000005'); // true (provisório)
isValidCns('123.4567-8901/0000'); // true (qualquer um dos caracteres de máscara)
isValidCns('123456789010001'); // false (dígito verificador inválido)
isValidCns('12345678901'); // false (tamanho inválido)
isValidCns('abc123456789010000'); // false (não escrito como um CNS)
```

Fonte: [página de validação de CNS da ANVISA](https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/) e a [página do e-SUS APS](https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html).

### formatCns

Formata um número de CNS (Cartão Nacional de Saúde) nos grupos de exibição usuais de 3-4-4-4 dígitos separados por espaço.

- **Opções** (`FormatCnsOptions`): `pad` completa o valor com zeros à esquerda até as 15 posições do padrão antes de aplicar a máscara (padrão `false`).

```javascript
import { formatCns } from '@brazilian-utils/brazilian-utils';

formatCns('123456789010000'); // '123 4567 8901 0000'
formatCns(123456789010000); // '123 4567 8901 0000'
formatCns('89010001', { pad: true }); // '000 0000 8901 0001'
```

### parseCns

Remove a formatação do CNS (Cartão Nacional de Saúde), mantém apenas os dígitos e limita o resultado a 15 dígitos.

```javascript
import { parseCns } from '@brazilian-utils/brazilian-utils';

parseCns('123 4567 8901 0000'); // '123456789010000'
```

## Certidão

### isValidCertidao

Valida a matrícula de uma certidão de registro civil (nascimento, casamento, óbito e os demais atos de um registro civil das pessoas naturais). Só uma string é aceita: os 32 dígitos de uma matrícula são mais do que um número JavaScript comporta.

A matrícula tem 32 dígitos, impressos como `000000 00 00 0000 0 00000 000 0000000 00`:

| Dígitos | Campo |
| --- | --- |
| 6 | CNS da serventia |
| 2 | acervo |
| 2 | serviço, sempre `55` |
| 4 | ano |
| 1 | tipo do livro |
| 5 | livro |
| 3 | folha |
| 7 | termo |
| 2 | dígitos verificadores |

- **Opções** (`IsValidCertidaoOptions`): `accept` restringe os tipos de livro válidos (`CertidaoType`) aos listados (padrão: todos os tipos).
- O serviço precisa ser `55`, e o dígito do tipo de livro precisa ser um dos nove livros (`0` é rejeitado).
- Aceita o valor com ou sem máscara, com espaços entre e ao redor dos grupos.

```javascript
import { isValidCertidao } from '@brazilian-utils/brazilian-utils';

isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21'); // true
isValidCertidao('09430001552010100020112000012087'); // true
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 22'); // false (dígitos verificadores inválidos)
isValidCertidao('09400301542011100110002005191744'); // false (serviço diferente de 55)
isValidCertidao('123456'); // false (tamanho inválido)
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21', { accept: ['birth'] }); // true
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21', { accept: ['death'] }); // false
```

Fonte: [art. 473 do Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243); dígitos verificadores conforme o [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e o [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts).

### formatCertidao

Formata a matrícula de uma certidão de registro civil na máscara impressa do art. 473. Os 32 dígitos são agrupados em 6 2 2 4 1 5 3 7 2 e separados por espaços.

- **Opções** (`FormatCertidaoOptions`): `pad` completa o valor com zeros à esquerda até 32 dígitos (padrão `false`).
- Um número é aceito, mas uma matrícula completa de 32 dígitos precisa ser uma string.

```javascript
import { formatCertidao } from '@brazilian-utils/brazilian-utils';

formatCertidao('10453901552013100012021000012321'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('104539.01.55.2013.1.00012.021.0000123-21'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('1552010100020112000012087', { pad: true }); // 000000 01 55 2010 1 00020 112 0000120 87
formatCertidao(104539015520); // 104539 01 55 20 (um número é lido como a string dos seus dígitos)
```

Fonte: [art. 473 do Código Nacional de Normas](https://atos.cnj.jus.br/atos/detalhar/5243).

### parseCertidao

Remove a formatação da matrícula de uma certidão de registro civil, mantém apenas os dígitos e limita o resultado a 32 dígitos.

```javascript
import { parseCertidao } from '@brazilian-utils/brazilian-utils';

parseCertidao('104539 01 55 2013 1 00012 021 0000123 21');
// '10453901552013100012021000012321'
```

### getCertidaoInfo

Extrai os campos da matrícula de uma certidão de registro civil. Aceita as mesmas formas de entrada de `isValidCertidao` e retorna `null` quando a matrícula é inválida.

- Retorna `null` também para um serviço diferente de `55` e para um código de livro fora de 1 a 9.
- O art. 473, V lista apenas os códigos de livro de 1 a 7. Os códigos 8 (emancipação) e 9 (interdição) também são aceitos.

O resultado `CertidaoInfo` traz:

| Chave | Descrição |
| --- | --- |
| `registryCns` | O CNS (Código Nacional de Serventia) de 6 dígitos da serventia que lavrou o ato. |
| `acervo` | Acervo a que o livro pertence: `"01"` acervo próprio, `"02"` em diante um por acervo incorporado. O art. 473, §§ 3º a 5º separa os incorporados pela data em que a serventia de origem foi extinta ou desativada. Até 31/12/2009: o CNS da unidade incorporadora e um código de acervo a partir de `"02"`, um por incorporação. A partir de 01/01/2010: o CNS da própria unidade incorporada e o código `"01"`, considerado acervo próprio dessa unidade. Um acervo fracionado entre duas ou mais serventias sucessoras leva o CNS próprio de cada sucessora com o código `"02"`. |
| `service` | Serviço prestado pela serventia, sempre `"55"`, o registro civil das pessoas naturais. |
| `year` | Ano do registro, com 4 dígitos. |
| `type` | Livro a que o ato pertence: `"birth"`, `"marriage"`, `"religious-marriage"`, `"death"`, `"stillbirth"`, `"banns"`, `"other"`, `"emancipation"` ou `"interdiction"`. |
| `typeCode` | Código bruto do livro, de 1 a 9, como impresso na décima quinta posição da matrícula. |
| `book` | Número do livro, com 5 dígitos e zeros à esquerda. |
| `page` | Número da folha, com 3 dígitos e zeros à esquerda. |
| `term` | Número do termo, com 7 dígitos e zeros à esquerda. |
| `checkDigits` | Os 2 dígitos verificadores módulo 11 da matrícula. |

```javascript
import { getCertidaoInfo } from '@brazilian-utils/brazilian-utils';

getCertidaoInfo('104539 01 55 2013 1 00012 021 0000123 21');
// {
//   registryCns: '104539',
//   acervo: '01',
//   service: '55',
//   year: 2013,
//   type: 'birth',
//   typeCode: 1,
//   book: '00012',
//   page: '021',
//   term: '0000123',
//   checkDigits: '21'
// }

getCertidaoInfo('invalid'); // null
```

Fonte: [art. 473 do Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243); códigos de livro 8 e 9 conforme o [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e o [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts).

## CEI, CNO e CAEPF

### isValidCei

Valida um número de CEI (Cadastro Específico do INSS). O CEI identifica o empregador sem CNPJ, como uma obra ou um produtor rural.

- Layout: 12 dígitos impressos como `00.000.00000/00`, 11 dígitos de base e um dígito verificador.

```javascript
import { isValidCei } from '@brazilian-utils/brazilian-utils';

isValidCei('11.583.00249/85'); // true
isValidCei('277297118187'); // true
isValidCei(249859674386); // true
isValidCei('24.985.96743/68'); // false (dígito verificador inválido)
isValidCei('000000000000'); // false (dígitos repetidos)
```

Fonte: [yii2-br-validator](https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php), [Bigai.Documentos.Brasil](https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs) e a [base de dados aberta do CNO](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno).

### formatCei

Formata um número de CEI (Cadastro Específico do INSS) na máscara usual `00.000.00000/00`.

- **Opções** (`FormatCeiOptions`): `pad` completa o valor com zeros à esquerda até 12 dígitos (padrão `false`).

```javascript
import { formatCei } from '@brazilian-utils/brazilian-utils';

formatCei('277297118187'); // 27.729.71181/87
formatCei(249859674386); // 24.985.96743/86
formatCei('249', { pad: true }); // 00.000.00002/49
```

### parseCei

Remove a formatação do CEI (Cadastro Específico do INSS), mantém apenas os dígitos e limita o resultado a 12 dígitos.

```javascript
import { parseCei } from '@brazilian-utils/brazilian-utils';

parseCei('27.729.71181/87'); // '277297118187'
```

### isValidCno

Valida um número de CNO (Cadastro Nacional de Obras). O CNO substituiu o CEI para obras e manteve a mesma numeração.

- Mesmas regras de `isValidCei`.

```javascript
import { isValidCno } from '@brazilian-utils/brazilian-utils';

isValidCno('11.084.01680/62'); // true
isValidCno('111130137368'); // true
isValidCno(401800097960); // true
isValidCno('110840168063'); // false (dígito verificador inválido)
isValidCno('000000000000'); // false (dígitos repetidos)
```

Fonte: [página do CNO da Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno) e a [base de dados aberta do CNO](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno).

### formatCno

Formata um número de CNO (Cadastro Nacional de Obras).

- Mesmas regras de `formatCei`: a máscara `00.000.00000/00`, com `pad` em `FormatCnoOptions`.

```javascript
import { formatCno } from '@brazilian-utils/brazilian-utils';

formatCno('111130137368'); // 11.113.01373/68
formatCno(401800097960); // 40.180.00979/60
formatCno('979', { pad: true }); // 00.000.00009/79
```

### parseCno

Remove a formatação do CNO (Cadastro Nacional de Obras), mantém apenas os dígitos e limita o resultado a 12 dígitos, a numeração que o CNO herdou do CEI.

```javascript
import { parseCno } from '@brazilian-utils/brazilian-utils';

parseCno('11.113.01373/68'); // '111130137368'
```

### isValidCaepf

Valida um número de CAEPF (Cadastro de Atividade Econômica da Pessoa Física). O CAEPF substituiu o CEI para a pessoa física que contrata empregados, como o produtor rural.

- Layout: 14 dígitos impressos como `000.000.000/000-00`: a base de 9 dígitos do CPF do titular, um número de ordem de 3 dígitos e 2 dígitos verificadores.
- Os dois dígitos verificadores seguem o módulo 11 do CNPJ; o par é então somado a 12, com retorno a zero acima de 99.

```javascript
import { isValidCaepf } from '@brazilian-utils/brazilian-utils';

isValidCaepf('293.118.610/001-84'); // true
isValidCaepf('41142260000101'); // true
isValidCaepf(29311861000184); // true
isValidCaepf('29311861000185'); // false (dígitos verificadores inválidos)
isValidCaepf('00000000000000'); // false (dígitos da base repetidos)
isValidCaepf('00000000000012'); // false (dígitos da base repetidos)
```

Fonte: [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e [brazilian-values](https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts).

### formatCaepf

Formata um número de CAEPF (Cadastro de Atividade Econômica da Pessoa Física) na máscara usual `000.000.000/000-00`.

- Mesmas regras de `formatCei`, com `pad` (`FormatCaepfOptions`) completando até 14 dígitos (padrão `false`).

```javascript
import { formatCaepf } from '@brazilian-utils/brazilian-utils';

formatCaepf('29311861000184'); // 293.118.610/001-84
formatCaepf(41142260000101); // 411.422.600/001-01
formatCaepf('184', { pad: true }); // 000.000.000/001-84
```

### parseCaepf

Remove a formatação do CAEPF (Cadastro de Atividade Econômica da Pessoa Física), mantém apenas os dígitos e limita o resultado a 14 dígitos.

```javascript
import { parseCaepf } from '@brazilian-utils/brazilian-utils';

parseCaepf('293.118.610/001-84'); // '29311861000184'
```

## Códigos de classificação (CBO, CNAE, NCM, CFOP, CST, CSOSN)

### isValidCbo

Valida um código CBO (Classificação Brasileira de Ocupações) contra a tabela oficial da CBO 2002.

- Aceita uma string com os 6 dígitos ou com a máscara `NNNN-NN`, ou um número.
- Uma string mascarada precisa de um único separador (espaço, `.`, `-` ou `/`) entre os grupos. Qualquer outra string é rejeitada, em vez de ter seus dígitos extraídos.
- Dígitos sem máscara são completados com zeros à esquerda até 6, como string ou como número. Um valor mascarado é lido como foi escrito.

```javascript
import { isValidCbo } from '@brazilian-utils/brazilian-utils';

isValidCbo('2124-05'); // true
isValidCbo('212405'); // true
isValidCbo(212405); // true
isValidCbo(10205); // true (completado para 6 dígitos, ou seja, '010205')
isValidCbo('10205'); // true (completado do mesmo jeito que um número)
isValidCbo('000000'); // false
isValidCbo('2124abc05'); // false (não é uma forma documentada)
isValidCbo(-212405); // false (não é um inteiro seguro não negativo)
```

Fonte: [tabela de ocupações da CBO 2002 publicada pelo MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv).

### parseCbo

Remove a formatação do CBO (Classificação Brasileira de Ocupações), mantém apenas os dígitos e limita o resultado a 6 dígitos.

- Nada é completado com zeros à esquerda: o zero inicial de um código como `010205` precisa ser escrito. Use `getCbo` ou `isValidCbo` para consultar uma ocupação.

```javascript
import { parseCbo } from '@brazilian-utils/brazilian-utils';

parseCbo('2124-05'); // '212405'
```

### getCbo

Consulta um código CBO (Classificação Brasileira de Ocupações) e retorna o título oficial da ocupação. O resultado é um registro `Cbo`: `{ code, description }`.

- Mesmas regras de `isValidCbo`. Retorna `null` quando o código é desconhecido ou o valor não está em uma forma documentada.

```javascript
import { getCbo } from '@brazilian-utils/brazilian-utils';

getCbo('2124-05'); // { code: '212405', description: 'Analista de desenvolvimento de sistemas' }
getCbo(10205); // { code: '010205', description: 'Oficial da aeronáutica' } (completado para 6 dígitos)
getCbo('10205'); // { code: '010205', description: 'Oficial da aeronáutica' } (completado do mesmo jeito)
getCbo('000000'); // null
getCbo('2124abc05'); // null (não é uma forma documentada)
```

Fonte: [tabela de ocupações da CBO 2002 publicada pelo MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv).

### isValidCnae

Valida um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas) contra a tabela CNAE-Subclasses 2.3, a revisão de subclasses atual da CNAE 2.0.

- Mesmas regras de `isValidCbo`, com 7 dígitos e a máscara `NNNN-N/NN`.

```javascript
import { isValidCnae } from '@brazilian-utils/brazilian-utils';

isValidCnae('6201-5/01'); // true
isValidCnae('6201501'); // true
isValidCnae(111301); // true (completado para 7 dígitos, ou seja, '0111301')
isValidCnae('111301'); // true (completado do mesmo jeito que um número)
isValidCnae('0000000'); // false
isValidCnae('0111abc301'); // false (não é uma forma documentada)
isValidCnae(-111301); // false (não é um inteiro seguro não negativo)
```

Fonte: [CNAE-Subclasses 2.3 na CONCLA/IBGE](https://concla.ibge.gov.br/busca-online-cnae.html) e a [API de subclasses do IBGE](https://servicodados.ibge.gov.br/api/v2/cnae/subclasses).

### formatCnae

Formata um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas). Só a estrutura muda; use `isValidCnae` para conferir um código com a tabela.

- **Opções** (`FormatCnaeOptions`): `pad` (padrão `false`) completa antes o valor com zeros à esquerda até os 7 dígitos de um código completo. Sem ele a máscara é aplicada até onde o valor vai.
- Caracteres fora da máscara são descartados, e um número é lido como a string dos seus dígitos. Retorna `''` quando não há dígito algum.

```javascript
import { formatCnae } from '@brazilian-utils/brazilian-utils';

formatCnae('6201501'); // 6201-5/01
formatCnae('62'); // 62 (máscara aplicada até onde o valor vai)
formatCnae('62015'); // 6201-5
formatCnae('62', { pad: true }); // 0000-0/62 (completado até 7 dígitos antes)
formatCnae(111301, { pad: true }); // 0111-3/01
formatCnae('abc6201501'); // 6201-5/01 (só os dígitos são lidos)
formatCnae(-6201501); // 6201-5/01
```

### parseCnae

Remove a formatação do CNAE (Classificação Nacional de Atividades Econômicas), mantém apenas os dígitos e limita o resultado aos 7 dígitos de um código de subclasse completo.

- Mesmas regras de `parseCbo`: nada é completado com zeros à esquerda aqui.

```javascript
import { parseCnae } from '@brazilian-utils/brazilian-utils';

parseCnae('6201-5/01'); // '6201501'
parseCnae('62'); // '62' (um código parcial é mantido como está)
```

### getCnae

Consulta um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas) e retorna seu código e a descrição oficial. O resultado é um registro `Cnae`: `{ code, description }`.

- Mesmas regras de `getCbo`, com 7 dígitos e a máscara `NNNN-N/NN`.
- `code` retorna com os 7 dígitos sem máscara; passe-o para `formatCnae` para obter a forma `NNNN-N/NN`.

```javascript
import { formatCnae, getCnae } from '@brazilian-utils/brazilian-utils';

getCnae('6201-5/01'); // { code: '6201501', description: 'DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA' }
getCnae(111301); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (completado para 7 dígitos)
getCnae('111301'); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (completado do mesmo jeito)
getCnae('0000000'); // null
getCnae('0111abc301'); // null (não é uma forma documentada)
formatCnae(getCnae('6201501')?.code); // 6201-5/01 (aplicar a máscara é trabalho do formatador)
```

Fonte: [CNAE-Subclasses 2.3 na CONCLA/IBGE](https://concla.ibge.gov.br/busca-online-cnae.html) e a [API de subclasses do IBGE](https://servicodados.ibge.gov.br/api/v2/cnae/subclasses).

### isValidNcm

Valida um código NCM (Nomenclatura Comum do Mercosul) contra a tabela vigente publicada pelo Siscomex/MDIC.

- Mesmas regras de `isValidCbo`, com 8 dígitos e a máscara `NNNN.NN.NN`.

```javascript
import { isValidNcm } from '@brazilian-utils/brazilian-utils';

isValidNcm('8471.30.12'); // true
isValidNcm('84713012'); // true
isValidNcm(1012100); // true (completado para 8 dígitos, ou seja, '01012100')
isValidNcm('1012100'); // true (completado do mesmo jeito que um número)
isValidNcm('00000000'); // false
isValidNcm('abc01012100'); // false (não é uma forma documentada)
isValidNcm(-84713012); // false (não é um inteiro seguro não negativo)
```

Fonte: [nomenclatura NCM publicada pelo Portal Único Siscomex](https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json).

### formatNcm

Formata um código NCM (Nomenclatura Comum do Mercosul). Só a estrutura muda; use `isValidNcm` para conferir um código com a tabela.

- **Opções** (`FormatNcmOptions`): `pad` (padrão `false`) completa antes o valor com zeros à esquerda até os 8 dígitos de um código completo.
- Mesmas regras de `formatCnae`, com a máscara `NNNN.NN.NN`.

```javascript
import { formatNcm } from '@brazilian-utils/brazilian-utils';

formatNcm('84713012'); // 8471.30.12
formatNcm('8471'); // 8471 (máscara aplicada até onde o valor vai)
formatNcm('847130'); // 8471.30
formatNcm('8471', { pad: true }); // 0000.84.71 (completado até 8 dígitos antes)
formatNcm('abc8471'); // 8471 (só os dígitos são lidos)
formatNcm(-84713012); // 8471.30.12
```

### parseNcm

Remove a formatação do NCM (Nomenclatura Comum do Mercosul), mantém apenas os dígitos e limita o resultado aos 8 dígitos de um código completo.

- Mesmas regras de `parseCbo`: nada é completado com zeros à esquerda aqui.

```javascript
import { parseNcm } from '@brazilian-utils/brazilian-utils';

parseNcm('8471.30.12'); // '84713012'
parseNcm('8471'); // '8471' (um código parcial é mantido como está)
```

### isValidCfop

Valida um código CFOP (Código Fiscal de Operações e Prestações) contra a tabela oficial, o Anexo II consolidado do Convênio SINIEF s/nº 1970 em vigor.

- Só os códigos operáveis contam: os títulos de grupo e subgrupo, os códigos terminados em `00` e `50`, são rejeitados.
- Aceita uma string com os 4 dígitos ou com a forma `N.NNN`, com um único separador (espaço, `.`, `-` ou `/`), ou um número. Qualquer outra string é rejeitada.
- Nenhum código CFOP começa com zero, então nada é completado.

```javascript
import { isValidCfop } from '@brazilian-utils/brazilian-utils';

isValidCfop('5102'); // true
isValidCfop('1.101'); // true
isValidCfop('7504'); // true (incluído na reescrita de 2022 do anexo)
isValidCfop('0000'); // false
isValidCfop('1150'); // false (título de subgrupo, não é um código operável)
isValidCfop('abc5102'); // false (não é uma forma documentada)
isValidCfop(-5102); // false (não é um inteiro seguro não negativo)
```

Fonte: [Anexo II consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), última alteração pelo [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25).

### parseCfop

Remove a formatação do CFOP (Código Fiscal de Operações e Prestações), mantém apenas os dígitos e limita o resultado a 4 dígitos.

- Nenhum código CFOP começa com zero, então nada é completado aqui.

```javascript
import { parseCfop } from '@brazilian-utils/brazilian-utils';

parseCfop('5.102'); // '5102'
```

### getCfop

Consulta um código CFOP (Código Fiscal de Operações e Prestações) e retorna seu código e a descrição oficial. O resultado é um registro `Cfop`: `{ code, description }`.

- Mesmas regras de `isValidCfop`. Retorna `null` para um título, um código desconhecido ou um valor fora das formas documentadas.

```javascript
import { getCfop } from '@brazilian-utils/brazilian-utils';

getCfop('1101'); // { code: '1101', description: 'Compra para industrialização ou produção rural' }
getCfop('7504'); // { code: '7504', description: 'Exportação de mercadoria que foi objeto de formação de lote de exportação' }
getCfop('0000'); // null
getCfop('5350'); // null (título de subgrupo, não é um código operável)
getCfop('abc5102'); // null (não é uma forma documentada)
```

Fonte: [Anexo II consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), última alteração pelo [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25).

### isValidCst

Valida um código de CST (Código de Situação Tributária) para um tributo. Informe o tributo em `options.tax`:

| Tributo | Formato | Códigos aceitos |
| --- | --- | --- |
| `icms` | 3 dígitos (origem + CST) | origem `0`-`8` + um de `00`, `02`, `10`, `15`, `20`, `30`, `40`, `41`, `50`, `51`, `53`, `60`, `61`, `70`, `90` |
| `ipi` | 2 dígitos | `00`, `01`, `02`, `03`, `04`, `05`, `49`, `50`, `51`, `52`, `53`, `54`, `55`, `99` |
| `pis` | 2 dígitos | `01`-`09`, `49`, `50`-`56`, `60`-`67`, `70`-`75`, `98`, `99` |
| `cofins` | 2 dígitos | mesma tabela do `pis` |

- **Opções** (`IsValidCstOptions`): `tax` escolhe a tabela. Omitido, ou fora desses quatro valores, todas as tabelas são aceitas.
- Aceita uma string com os 2 dígitos de um código da Tabela B ou os 3 dígitos da forma do ICMS, ou um número. A forma do ICMS pode ter um único separador (espaço, `.`, `-` ou `/`) depois do dígito de origem.
- Um único dígito é completado até a forma de 3 dígitos do ICMS; uma string de 2 dígitos é um código da Tabela B, enquanto o número `7` é o código ICMS `007`.

```javascript
import { isValidCst } from '@brazilian-utils/brazilian-utils';

isValidCst('000', { tax: 'icms' }); // true
isValidCst(0, { tax: 'icms' }); // true (um único dígito é completado até a forma de 3 dígitos, '000')
isValidCst('0', { tax: 'icms' }); // true (completado do mesmo jeito que um número)
isValidCst('110', { tax: 'icms' }); // true
isValidCst('002', { tax: 'icms' }); // true (monofasia de combustíveis)
isValidCst('06', { tax: 'pis' }); // true
isValidCst('99', { tax: 'ipi' }); // true
isValidCst('110'); // true (encontrado na tabela icms, tax omitido)
isValidCst('000', { tax: 'nope' }); // true (um tax desconhecido cai em todas as tabelas)
isValidCst('999'); // false (não existe em nenhuma tabela)
isValidCst('abc110'); // false (não é uma forma documentada)
isValidCst(-110); // false (não é um inteiro seguro não negativo)
```

Fonte: Tabela B do ICMS do [Anexo I do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70) alterado pelo [Ajuste SINIEF 20/24](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2024/AJ020_24); IPI, PIS e COFINS da [IN RFB nº 1.009/2010](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15974).

### isValidCsosn

Valida um código de CSOSN (Código de Situação da Operação no Simples Nacional) como um dos 10 códigos da tabela oficial: `101`, `102`, `103`, `201`, `202`, `203`, `300`, `400`, `500` ou `900`.

- Aceita uma string com os 3 dígitos puros, ou um número. Um CSOSN não tem agrupamento impresso, então `'1-01'` é rejeitado.

```javascript
import { isValidCsosn } from '@brazilian-utils/brazilian-utils';

isValidCsosn('101'); // true
isValidCsosn(900); // true
isValidCsosn('999'); // false
isValidCsosn('abc101'); // false (não é uma forma documentada)
isValidCsosn(-101); // false (não é um inteiro seguro não negativo)
```

Fonte: [Anexo III-A consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70) e [Ajuste SINIEF 03/2010](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2010/aj_003_10).

## Texto

### capitalize

Transforma em maiúscula a primeira letra de cada palavra, do jeito que se escreve um nome, uma razão social ou um endereço brasileiro, sem precisar de opções.

- **Opções** (`CapitalizeOptions`): `lowerCaseWords`, palavras mantidas em minúsculas entre duas palavras, por padrão preposições e artigos como `de`, `da`, `do`, `e`; `upperCaseWords`, palavras sempre em maiúsculas, por padrão designações societárias e abreviações como `LTDA`, `S.A.`, `ME`, `CNPJ` e algarismos romanos. Uma lista substitui a padrão.
- Palavras se separam em espaços, `-`, `/`, apóstrofos e pontuação colada; espaços repetidos viram um só.
- Palavra minúscula que é a primeira, a última ou precede pontuação é designativo e mantém a maiúscula.
- `ME` só vira maiúsculas como designação (última palavra ou antes de outra); `SA` sem pontos fica como está (o sobrenome Sá). Sigla de estado após `/` vira maiúsculas mesmo com `upperCaseWords` informado.

```javascript
import { capitalize } from '@brazilian-utils/brazilian-utils';

capitalize('jose da silva'); // Jose da Silva
capitalize('JOSÉ DA SILVA'); // José da Silva
capitalize('empresa ltda'); // Empresa LTDA
capitalize('banco do brasil s.a.'); // Banco do Brasil S.A.
capitalize('casa de carnes s/a'); // Casa de Carnes S/A ("S/A" é reconhecido com a barra no meio)
capitalize('mogi-guaçu'); // Mogi-Guaçu ("-" inicia uma nova palavra)
capitalize("santa bárbara d'oeste"); // Santa Bárbara d'Oeste ("'" inicia uma nova palavra, "d" fica minúsculo)
capitalize("bob's"); // Bob's (uma letra sozinha depois do apóstrofo é o possessivo do inglês)
capitalize('rua a, 100'); // Rua A, 100 (uma preposição antes de pontuação é um designativo)
capitalize('fulano comércio me'); // Fulano Comércio ME ("ME" como última palavra é a designação)
capitalize('não-me-toque'); // Não-Me-Toque (em qualquer outro lugar "me" é palavra comum)
capitalize('(empresa) ltda'); // (Empresa) LTDA
capitalize('luiz von schmidt'); // Luiz von Schmidt
capitalize('santana/rs'); // Santana/RS ("RS" é sigla de estado logo depois de uma "/")
capitalize('porto alegre/rs'); // Porto Alegre/RS
capitalize('santana rs'); // Santana Rs (sem "/", "rs" é só uma palavra)
capitalize('rua xv de novembro'); // Rua XV de Novembro (algarismo romano, "de" fica em minúsculas)
capitalize('joão paulo ii'); // João Paulo II
capitalize('de'); // De (uma preposição mantém a maiúscula quando é a primeira palavra)
capitalize('empresa ltda', { upperCaseWords: [] }); // Empresa Ltda (a lista informada substitui a padrão)
capitalize('josé Ama MARIA', { lowerCaseWords: ['ama'] }); // José ama Maria
capitalize('doc inválido', { upperCaseWords: ['DOC'] }); // DOC Inválido (comparação sem diferenciar maiúsculas de minúsculas)
capitalize('  josé   maria  '); // José Maria (toda sequência de espaço em branco, tabs e quebras de linha inclusive, vira um único espaço)
```

Fonte: [Manual de Redação da Presidência da República](https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf).

### removeAccents

Remove marcas diacríticas (acentos, tils, cedilhas) de uma string.

- Toda marca de combinação (categoria geral M do Unicode) é descartada, então acentos de qualquer escrita são removidos.

```javascript
import { removeAccents } from '@brazilian-utils/brazilian-utils';

removeAccents('São Paulo'); // 'Sao Paulo'
removeAccents('Piauí'); // 'Piaui'
removeAccents('Ceará'); // 'Ceara'
removeAccents('Açaí'); // 'Acai'
removeAccents(''); // ''
```

## Inscrição estadual (IE)

### isValidIe

Valida uma inscrição estadual para um estado. **Descontinuada:** a forma posicional `isValidIe(stateCode, ie)` continua funcionando, mas está descontinuada; use a forma com objeto `isValidIe({ value, stateCode })`.

- Recebe um único objeto (`IsValidIeParams`): `value` é a inscrição e `stateCode` o estado ao qual ela pertence (um `StateCode`, sem diferenciar maiúsculas de minúsculas).
- GO, PA, MS, SP, TO, DF, PE, AL e RJ têm casos especiais (prefixos ou formatos extras, ou um desvio da página do SINTEGRA); veja o JSDoc em `src/is-valid-ie` para os detalhes.
- Uma inscrição só de zeros é aceita em todo estado cuja fórmula publicada produz dígito verificador 0 para ela: AM, CE, ES, MG, MT, PB, PE, PI, PR, RJ, RS, SC, SE e SP, mais BA com 8 ou 9 dígitos e TO com 9 dígitos.

```javascript
import { isValidIe } from '@brazilian-utils/brazilian-utils';

isValidIe({ value: '110042490114', stateCode: 'SP' }); // true
isValidIe({ value: 'P011004243002', stateCode: 'SP' }); // true (produtor rural)
isValidIe({ value: '0187634580933', stateCode: 'AC' }); // false
isValidIe({ value: '109161793', stateCode: 'go' }); // true (não diferencia maiúsculas de minúsculas)
```

Fonte: [páginas dos estados no SINTEGRA](http://www.sintegra.gov.br/insc_est.html) e o [roteiro de crítica da SEFAZ-GO](https://goias.gov.br/economia/roteiro-de-critica-da-inscricao-estadual-de-goias/).

## E-mail

### isValidEmail

Valida um endereço de e-mail. Um subconjunto prático da definição do HTML da WHATWG.

- Parte local: letras, dígitos e `_'+-.`, sem ponto no início ou no fim e sem dois pontos seguidos.
- Domínio: pelo menos um ponto, rótulos de até 63 caracteres, rótulo final de 2 a 63 letras; partes locais entre aspas e literais de endereço são rejeitados.

```javascript
import { isValidEmail } from '@brazilian-utils/brazilian-utils';

isValidEmail('john.doe@hotmail.com'); // true
isValidEmail('invalid.email'); // false
```

Fonte: [HTML da WHATWG, valid e-mail address](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address) e [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322).

## Cartão de crédito

### isValidCreditCard

Valida um número de cartão de pagamento (crédito ou débito) com o algoritmo de Luhn. Só a quantidade de dígitos (12 a 19) e o dígito verificador de Luhn são conferidos. Não há detecção de bandeira (Visa, Mastercard, Amex...), consulta de faixa de emissor nem validação de validade/CVV.

- Aceita uma string ou um número, com os caracteres de máscara (espaço em branco, `.`, `-` e `/`) em qualquer posição entre os dígitos.

```javascript
import { isValidCreditCard } from '@brazilian-utils/brazilian-utils';

isValidCreditCard('4111111111111111'); // true (número de teste Visa)
isValidCreditCard('5555555555554444'); // true (número de teste Mastercard)
isValidCreditCard('378282246310005'); // true (número de teste American Express)
isValidCreditCard('4111 1111 1111 1111'); // true (máscara com espaços)
isValidCreditCard('4111 - 1111 - 1111 - 1111'); // true (uma sequência de separadores entre os dígitos)
isValidCreditCard('4111.1111/1111-1111'); // true (qualquer um dos caracteres de máscara)
isValidCreditCard('4111111111111112'); // false (dígito verificador inválido)
isValidCreditCard('0000000000000000'); // false (todos os dígitos iguais, ainda que o Luhn feche)
isValidCreditCard('4111a1111b1111c1111'); // false (letras entre os dígitos)
isValidCreditCard(4111111111111111111); // false (acima de 2^53 - 1, passe como string)
```

Fonte: [ISO/IEC 7812-1](https://www.iso.org/standard/70484.html).

## Registro profissional

### isValidRegistroProfissional

Verifica a estrutura de um número de registro em conselho profissional (registro/inscrição profissional). Só a quantidade de dígitos e a UF são conferidas, nunca o dígito verificador, nem no CRC.

- Recebe um objeto (`IsValidRegistroProfissionalParams`): `value`, `council` (`RegistroProfissionalCouncil`: `"OAB"`, `"CRM"`, `"CRO"`, `"CRP"` ou `"CRC"`) e `stateCode` opcional (UF esperada).
- `"OAB"` e `"CRM"`: 4 a 6 dígitos mais a UF (`123456/SP`, `123456-SP`); `"CRO"`: 3 a 6 dígitos (`12345/SP`).
- `"CRP"`: código regional de 2 dígitos (`01` a `24`) mais 4 a 6 dígitos (`06/12345`); `stateCode` é ignorado.
- `"CRC"`: UF, 6 dígitos, tipo de registro (`O` ou `P`) e dígito verificador (`SP-123456/O-3`); transferência acrescenta `T` ou `S` e a UF destino (`SP-123456/O-3 T-MG`). `stateCode` confere a UF de origem.
- Formatos de OAB, CRM, CRO e CRP são convencionais (nenhum é publicado); CREA não é coberto.

```javascript
import { isValidRegistroProfissional } from '@brazilian-utils/brazilian-utils';

isValidRegistroProfissional({ value: '123456/SP', council: 'OAB' }); // true
isValidRegistroProfissional({ value: '123456-RJ', council: 'OAB', stateCode: 'SP' }); // false (UF divergente)
isValidRegistroProfissional({ value: '123456', council: 'OAB' }); // false (sem UF)
isValidRegistroProfissional({ value: '06/12345', council: 'CRP' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3', council: 'CRC' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3 T-MG', council: 'CRC' }); // true (registro transferido)
isValidRegistroProfissional({ value: 'SP-123456/T-3', council: 'CRC' }); // false ("T" não é tipo de registro)
```

Fonte: [Manual de Registro do Sistema CFC/CRCs](https://cfc.org.br/wp-content/uploads/2018/04/1_manual_registro.pdf), [Resolução CFC nº 1.707/2023](https://www1.cfc.org.br/sisweb/SRE/docs/Res_1707.pdf), [regionais do CFP](https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/).

## VIN

### isValidVin

Valida um VIN (Vehicle Identification Number / chassi). É uma verificação estrutural no padrão norte-americano, não um validador universal de VINs brasileiros.

- Confere o tamanho de 17 caracteres, as letras excluídas `I`, `O` e `Q` e o dígito verificador na 9ª posição.
- As normas brasileiras não exigem o dígito verificador, então muitos VINs fabricados no Brasil não passam nele.

```javascript
import { isValidVin } from '@brazilian-utils/brazilian-utils';

isValidVin('1HGCM82633A004352'); // true
isValidVin('1m8gdm9axkp042788'); // true (dígito verificador X, minúsculo)
isValidVin('1HGCM82633A004353'); // false (dígito verificador inválido)
isValidVin('00000000000000000'); // false (todos os caracteres iguais, ainda que o dígito feche)
isValidVin('1HGCM8263IA004352'); // false (contém a letra excluída I)
isValidVin('1HGCM82633A00435'); // false (16 caracteres)
```

Fonte: [ISO 3779:2009](https://www.iso.org/standard/52200.html), [49 CFR 565.15](https://www.ecfr.gov/current/title-49/section-565.15) e [Resolução CONTRAN nº 968/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf).

## Standard Schema

### toStandardSchema

Embrulha um utilitário `isValid*` em um [Standard Schema](https://standardschema.dev), o formato de validador que bibliotecas de formulário, roteadores e frameworks de API aceitam: TanStack Form, react-hook-form, tRPC, Hono e outros.

- `config.options` é repassado ao validador a cada chamada, e `config.message` é a mensagem da issue (padrão `'Invalid value'`). Os dois fazem parte de `ToStandardSchemaOptions`.
- Valida de forma síncrona e não transforma: um valor válido volta como foi passado, um inválido gera uma única issue.
- Validadores que recebem um objeto (`isValidBankAccount`, `isValidRegistroProfissional`, `isValidIe`) funcionam do mesmo jeito. Embrulhe o `isValidIe`, que tem sobrecarga, em uma arrow function: `toStandardSchema((params) => isValidIe(params))`.
- Os tipos da especificação (`StandardSchemaV1`, `StandardSchemaV1Result`, `StandardSchemaV1Issue` e os demais) também são exportados, então nada mais é instalado.

```javascript
import { isValidCnpj, isValidCpf, toStandardSchema } from '@brazilian-utils/brazilian-utils';

const cpf = toStandardSchema(isValidCpf, { message: 'CPF inválido' });

cpf['~standard'].validate('123.456.789-09'); // { value: '123.456.789-09' }
cpf['~standard'].validate('123'); // { issues: [{ message: 'CPF inválido' }] }

const cnpj = toStandardSchema(isValidCnpj, { options: { version: 2 } }); // CNPJ alfanumérico

// Tudo que recebe um Standard Schema aceita o resultado como está, um campo do TanStack Form por exemplo
<form.Field name="cpf" validators={{ onChange: cpf }} />;
```

Dentro de um schema do Zod ou do Valibot os validadores entram direto, sem wrapper, e o resultado já é um Standard Schema:

```javascript
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { isValidCep, isValidCpf } from '@brazilian-utils/brazilian-utils';
import { useForm } from 'react-hook-form';
import * as v from 'valibot';
import { z } from 'zod';

const zodSchema = z.object({
  cpf: z.string().refine(isValidCpf, 'CPF inválido'),
  cep: z.string().refine(isValidCep, 'CEP inválido'),
});

const valibotSchema = v.object({
  cpf: v.pipe(v.string(), v.check(isValidCpf, 'CPF inválido')),
  cep: v.pipe(v.string(), v.check(isValidCep, 'CEP inválido')),
});

const form = useForm({ resolver: standardSchemaResolver(zodSchema) }); // ou valibotSchema
```

Fonte: [especificação do Standard Schema](https://standardschema.dev).
