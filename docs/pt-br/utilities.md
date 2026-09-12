# Utilitários

Aqui você encontrará todos os utilitários disponíveis para uso.

> **Tratamento de entrada:** nenhuma função pública síncrona lança exceção com `null`/`undefined` ou um valor de tipo incorreto; as duas funções de rede, `getAddressInfoByCep` e `getCepInfoByAddress`, rejeitam com seus erros tipados (veja as seções delas). Os validadores (`isValid*`) retornam `false`; `isHoliday` retorna `false`; `getHolidays` retorna `[]`; `generateProcessoJuridico` retorna `null`; `getMunicipality` retorna `null` para uma busca malformada/sem correspondência. Todas as demais funções `format*`/`parse*` (incluindo `capitalize`) retornam um valor vazio do seu tipo de retorno: `""` para strings, `0` para `parseCurrency`. `formatCurrency` retorna `""` para um número não finito.

## isValidCpf

Valida se o CPF é válido. Aceita os caracteres de máscara usuais e espaços em branco entre/ao redor dos grupos.

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('155151475'); // false
isValidCpf('111 444 777 35'); // true (máscara com espaços)
```

## formatCpf

Formata o CPF. `options.obfuscate` (parte de `FormatCpfOptions`) esconde os 3 primeiros dígitos e os 2 dígitos verificadores (`***.456.789-**`), a convenção de exibição do gov.br / Receita Federal, aplicada após o `pad`.

```javascript
import { formatCpf } from '@brazilian-utils/brazilian-utils';

formatCpf('74650688000'); // 746.506.880-00
formatCpf('746506880', { pad: true }); // 007.465.068-80
formatCpf('12345678909', { obfuscate: true }); // ***.456.789-**
```

## parseCpf

Remove a formatação do CPF, mantém apenas os dígitos e limita o resultado a 11 dígitos.

```javascript
import { parseCpf } from '@brazilian-utils/brazilian-utils';

parseCpf('746.506.880-00'); // 74650688000
```

## generateCpf

Gera um CPF válido aleatório.

```javascript
import { generateCpf } from '@brazilian-utils/brazilian-utils'

generateCpf();
```

## isValidCnpj

Valida se o CNPJ é válido. Suporta tanto o formato numérico (`version: 1`, padrão) quanto o formato alfanumérico (`version: 2`), e aceita os caracteres de máscara usuais e espaços em branco. As opções são tipadas como `IsValidCnpjOptions`.

```javascript
import { isValidCnpj } from '@brazilian-utils/brazilian-utils';

isValidCnpj('15515147234255'); // false
isValidCnpj('q0slfmbd7vx439', { version: 2 }); // true (alfanumérico minúsculo)
```

## formatCnpj

Formata o CNPJ. `options.obfuscate` (parte de `FormatCnpjOptions`) esconde os 2 primeiros dígitos e os 2 dígitos verificadores (`**.345.678/0001-**`), a convenção de exibição do gov.br / Receita Federal. Vale para as duas versões e é aplicada após o `pad`.

```javascript
import { formatCnpj } from '@brazilian-utils/brazilian-utils';

formatCnpj('24522200000174'); // 24.522.200/0001-74
formatCnpj('245222000174', { pad: true }); // 00.245.222/0001-74
formatCnpj('12OUT345000199', { version: 2 }); // 12.OUT.345/0001-99
formatCnpj('12345678000195', { obfuscate: true }); // **.345.678/0001-**
```

## parseCnpj

Remove a formatação do CNPJ, retorna um valor normalizado e limita o resultado a 14 caracteres. As opções são tipadas como `ParseCnpjOptions`.

```javascript
import { parseCnpj } from '@brazilian-utils/brazilian-utils';

parseCnpj('24.522.200/0001-74'); // 24522200000174
parseCnpj('12.OUT.345/0001-99', { version: 2 }); // 12OUT345000199
```

## isValidCep

Valida se o CEP é válido. Aceita entrada como `string` ou `number`; espaços, pontos e hífens ao redor/entre os 8 dígitos são ignorados, mas qualquer outro caractere, uma letra em especial, invalida o valor.

```javascript
import { isValidCep } from '@brazilian-utils/brazilian-utils';

isValidCep('01310100'); // true
isValidCep('92500-000'); // true (hífen entre os grupos)
isValidCep('92.500-000'); // true (ponto e hífen)
isValidCep('013 10 100'); // true (espaços entre os dígitos)
isValidCep(20040020); // true (entrada numérica)
isValidCep('9250000A'); // false (letras são rejeitadas)
isValidCep('12345'); // false (tamanho inválido)
```

## generateCnpj

Gera um CNPJ válido aleatório.

```javascript
import { generateCnpj } from '@brazilian-utils/brazilian-utils'

generateCnpj();
```

## isValidBoleto

Valida se o boleto é válido. Suporta tanto o boleto de "cobrança bancária" de 47 dígitos quanto o "boleto de arrecadação" (convênio/tributos): seja a linha digitável de 48 dígitos, seja o código de barras de 44 dígitos, ambos iniciados com `8`.

```javascript
import { isValidBoleto } from '@brazilian-utils/brazilian-utils';

isValidBoleto('00190000090114971860168524522114675860000102656'); // true
isValidBoleto('846100000005246100291102005460339004695895061080'); // true (boleto de arrecadação)
```

## formatBoleto

Formata um número de boleto. A máscara de arrecadação (convênio/tributos) só se aplica à linha digitável de 48 dígitos que começa com `8`; o código de barras de arrecadação de 44 dígitos não tem agrupamento de exibição definido pela FEBRABAN e mantém a máscara de "cobrança bancária".

```javascript
import { formatBoleto } from '@brazilian-utils/brazilian-utils';

formatBoleto('00190000090114971860168524522114675860000102656'); // 00190.00009 01149.718601 68524.522114 6 75860000102656
formatBoleto('1900000901149', { pad: true }); // 00000.00000 00000.000000 00000.000000 0 01900000901149
formatBoleto('846100000005246100291102005460339004695895061080'); // 84610000000-5 24610029110-2 00546033900-4 69589506108-0 (linha digitável de arrecadação, 48 dígitos)
formatBoleto('84610000000246100291100054603390069589506108'); // 84610.00000 02461.002911 00054.603390 0 69589506108 (código de barras de arrecadação de 44 dígitos mantém a máscara bancária)
```

## parseBoleto

Remove a formatação do boleto, mantém apenas os dígitos e limita o resultado a 47 dígitos (48 para boleto de arrecadação).

```javascript
import { parseBoleto } from '@brazilian-utils/brazilian-utils';

parseBoleto('00190.00009 01149.718601 68524.522114 6 75860000102656'); // 00190000090114971860168524522114675860000102656
```

## generateBoleto

Gera um boleto válido aleatório. Informe `{ type: "arrecadacao" }` (tipado como `GenerateBoletoOptions`) para gerar um boleto de arrecadação em vez do tipo padrão "bancario" (cobrança bancária).

```javascript
import { generateBoleto } from '@brazilian-utils/brazilian-utils';

generateBoleto(); // "00190000090114971860168524522114675860000102656"
generateBoleto({ type: 'arrecadacao' }); // "846100000005246100291102005460339004695895061080"
```

## getBoletoInfo

Extrai informações de um boleto (valor, data de vencimento, código do banco). Aceita opcionalmente `{ referenceDate }` (tipado como `GetBoletoInfoOptions`) para resolver o ciclo do "fator de vencimento" a partir de uma data específica em vez de agora (o ciclo do fator reiniciou em 22/02/2025, segundo a FEBRABAN). Para um boleto de arrecadação, o resultado, tipado como `BoletoInfo`, não tem `bankCode`/`expirationDate` e traz em vez disso `type: "arrecadacao"`, `segment`, `value` e `hasEffectiveValue`.

```javascript
import { getBoletoInfo } from '@brazilian-utils/brazilian-utils';

getBoletoInfo('00190000090114971860168524522114675860000102656');
// { amount: 102656, expirationDate: Date, bankCode: '001' }

getBoletoInfo('00190000090114971860168524522114675860000102656', {
  referenceDate: new Date(2018, 6, 1)
});
// Resolve o ciclo do fator de vencimento a partir de 2018-07-01

getBoletoInfo('846100000005246100291102005460339004695895061080');
// { amount: 2461, expirationDate: null, bankCode: '', type: 'arrecadacao', segment: 4, value: 24.61, hasEffectiveValue: true }
```

## isValidPixKey

Valida se uma chave Pix é válida: um CPF, um CNPJ, um e-mail, um telefone brasileiro ou uma chave aleatória (EVP), conforme os formatos de chave do DICT. `options.accept` (tipado como `IsValidPixKeyOptions`) restringe quais tipos de chave são aceitos; o padrão é aceitar todos, e `[]` rejeita todos. Exporta o tipo `PixKeyType`.

```javascript
import { isValidPixKey } from '@brazilian-utils/brazilian-utils';

isValidPixKey('123.456.789-09'); // true
isValidPixKey('fulano@example.com'); // true
isValidPixKey('(11) 98765-4321'); // true
isValidPixKey('71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d'); // true
isValidPixKey('123.456.789-09', { accept: ['email', 'evp'] }); // false
isValidPixKey('not a key'); // false
```

## parsePixKey

Identifica uma chave Pix e a normaliza para a forma canônica que o DICT espera dentro do BR Code: CPF com 11 dígitos, CNPJ com 14 caracteres, e-mail em minúsculas, telefone em E.164 ou UUID em minúsculas (EVP). Um valor de 11 dígitos válido tanto como CPF quanto como celular é lido como CPF, a menos que tenha sido escrito como telefone (prefixo `+55`/`0055` ou DDD entre parênteses). Retorna `null` quando o valor não é uma chave Pix válida. O resultado é tipado como `PixKey`.

```javascript
import { parsePixKey } from '@brazilian-utils/brazilian-utils';

parsePixKey('123.456.789-09'); // { type: 'cpf', value: '12345678909' }
parsePixKey('Fulano@Example.COM '); // { type: 'email', value: 'fulano@example.com' }
parsePixKey('(11) 98765-4321'); // { type: 'phone', value: '+5511987654321' }
parsePixKey('71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D');
// { type: 'evp', value: '71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d' }
parsePixKey('51998259765'); // { type: 'cpf', value: '51998259765' } (também é um telefone válido)
parsePixKey('+5551998259765'); // { type: 'phone', value: '+5551998259765' }
```

## isValidPixPayload

Valida se um payload de BR Code Pix (a string por trás de um QR Code Pix e do "Pix copia e cola") é válido: estrutura TLV bem formada, objetos obrigatórios presentes, um dos templates "Merchant Account Information" carregando o GUI `br.gov.bcb.pix` junto com uma chave ou uma URL, e um CRC-16 que confere. A chave em si não é validada contra os formatos do DICT, use `isValidPixKey` para isso.

```javascript
import { isValidPixPayload } from '@brazilian-utils/brazilian-utils';

isValidPixPayload(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
); // true

isValidPixPayload('00020126580014br.gov.bcb.pix...'); // false (CRC quebrado)
```

## parsePixPayload

Interpreta um payload de BR Code Pix e retorna seus campos. O payload é validado pelo `isValidPixPayload` primeiro, então uma estrutura malformada, um CRC quebrado ou um objeto obrigatório ausente retornam `null` em vez de um resultado parcial. Um payload estático vem com `key`, um dinâmico com `url`. O resultado é tipado como `PixPayload`; `pointOfInitiation` é tipado como `PixPointOfInitiation` (`"static"` ou `"dynamic"`). As informações da conta do recebedor devem trazer exatamente uma chave ou uma `url` (verificada com a mesma regra de localização de PSP do `generatePixPayload`), e em um payload dinâmico o valor e o `txid` são ignorados, como o manual determina.

```javascript
import { parsePixPayload } from '@brazilian-utils/brazilian-utils';

parsePixPayload(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
);
// {
//   key: '123e4567-e12b-12d1-a456-426655440000',
//   merchantName: 'Fulano de Tal',
//   merchantCity: 'BRASILIA'
// }
```

## generatePixPayload

Gera o payload de um BR Code Pix. Exatamente um entre `params.key` e `params.url` deve ser informado (parte de `GeneratePixPayloadParams`); `null` é retornado quando ambos ou nenhum são informados. `url` deve ser uma localização de PSP como o manual do Bacen define: um host com caminho, sem esquema (`pix.example.com/qr/v2/1234`); um payload dinâmico não pode carregar `amount` nem `txid`, que pertencem à localização do PSP, e um `amount` que arredonda para `0.00` é rejeitado.

Quando `params.key` é informado, ela é normalizada para a forma canônica do DICT pelo `parsePixKey` e o payload é estático. Quando `params.url` é informado no lugar (a localização do PSP, sem o esquema da URL, ex.: `"pix.example.com/qr/v2/1234"`), o payload é dinâmico conforme o Manual de Padrões para Iniciação do Pix: a URL ocupa o lugar da chave no template "Merchant Account Information" e o objeto "Point of Initiation Method" é definido como dinâmico (`12`); `params.url` pode ter no máximo 77 caracteres. `merchantName`, `merchantCity` e `description` são convertidos para ASCII imprimível (acentos removidos) e truncados ao que o BR Code permite. O `parsePixPayload` já interpreta os dois formatos, então `parsePixPayload(generatePixPayload({ url, ... }))` forma um round-trip.

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

## isValidNfeKey

Valida se uma chave de acesso de DF-e (Documento Fiscal eletrônico) é válida. Cobre todos os documentos que compartilham o mesmo layout de 44 dígitos: NF-e (modelo 55), NFC-e (modelo 65), CT-e (modelo 57) e MDF-e (modelo 58). Aceita espaços entre os grupos de dígitos (a máscara de exibição usual) e o prefixo `NFe` encontrado no atributo `Id` do XML do documento.

```javascript
import { isValidNfeKey } from '@brazilian-utils/brazilian-utils';

isValidNfeKey('35170458716523000119550010000000121000123458'); // true (NF-e, SP)
isValidNfeKey('NFe35170458716523000119550010000000121000123458'); // true (prefixo Id do XML)
isValidNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'); // true (com máscara)
isValidNfeKey('99170458716523000119550010000000121000123458'); // false (cUF inválido)
```

## formatNfeKey

Formata uma chave de acesso de DF-e (NF-e, NFC-e, CT-e ou MDF-e) em grupos de 4 dígitos separados por espaço, a forma de exibição usual impressa na DANFE.

```javascript
import { formatNfeKey } from '@brazilian-utils/brazilian-utils';

formatNfeKey('35170458716523000119550010000000121000123458');
// '3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'
```

## parseNfeKey

Interpreta uma chave de acesso de DF-e e retorna seus campos (state, year, month, taxId, model, series, number, emissionType, code, checkDigit). Aceita as mesmas formas de entrada do `isValidNfeKey` e retorna `null` quando a chave não é válida. O resultado é tipado como `NfeKey`.

```javascript
import { parseNfeKey } from '@brazilian-utils/brazilian-utils';

parseNfeKey('35170458716523000119550010000000121000123458');
// { state: 'SP', year: 2017, month: 4, taxId: '58716523000119', model: '55',
//   series: 1, number: 12, emissionType: 1, code: '00012345', checkDigit: 8 }

parseNfeKey('invalid'); // null
```

## isValidEmail

Valida se email é válido.

```javascript
import { isValidEmail } from '@brazilian-utils/brazilian-utils';

isValidEmail('john.doe@hotmail.com'); // true
```

## isValidPhone

Valida se o número de telefone (celular ou residencial) é válido. Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é aceito e removido antes da validação, seguindo a regra documentada em `parsePhone`. `options.accept` (tipado como `PhoneType[]`, parte de `IsValidPhoneOptions`) define quais tipos de número são aceitos e tem como padrão `['mobile', 'landline']`; adicione `'service'` para também aceitar os números não geográficos reconhecidos por `isValidServicePhone`, ou informe `[]` para não aceitar nenhum.

```javascript
import { isValidPhone } from '@brazilian-utils/brazilian-utils';

isValidPhone('11900000000'); // true
isValidPhone('+55 11 98765-4321'); // true (código de país aceito)
isValidPhone('08001234567'); // false (números de serviço não são aceitos por padrão)
isValidPhone('08001234567', { accept: ['service'] }); // true
isValidPhone('11900000000', { accept: [] }); // false
```

## formatPhone

Formata número de telefone de acordo com padrões brasileiros. `options.mask` (tipado como `PhoneMask`) aceita `"sn"` (padrão, apenas o número assinante, 9 dígitos, sem DDD), `"nanp"` (DDD + número assinante, 11 dígitos), `"e164"` (`"+5511987654321"`), `"international"` (`"+55 11 98765-4321"`, a forma como um número brasileiro é exibido para quem liga do exterior), `"service"` (`"0800 123 4567"` ou `"4004-1234"`, os agrupamentos convencionais para números de serviço) ou `"auto"`. O `"auto"` usa `"international"` quando `value` traz um código de país brasileiro (`+55`, `0055` ou um `55` seguido de 10 ou 11 dígitos), `"service"` quando `value` é um número de serviço e, nos demais casos, decide pela quantidade de dígitos: `"nanp"` quando `value` tem mais dígitos que um número assinante isolado, `"sn"` quando não tem. `"e164"` e `"international"` removem antes o código de país (regra documentada em `parsePhone`) e recaem para a apresentação `"service"` no caso de um número de serviço, já que esses não têm forma E.164. Se `value` incluir o DDD, informe `{ mask: 'auto' }` (ou `'nanp'`) explicitamente, já que a máscara padrão `"sn"` assume que não há DDD e trunca silenciosamente um DDD presente.

```javascript
import { formatPhone } from '@brazilian-utils/brazilian-utils';

formatPhone('987654321'); // 98765-4321 (padrão "sn", sem DDD)
formatPhone('11900000000', { mask: 'nanp' }); // (11) 90000-0000
formatPhone('11900000000', { mask: 'auto' }); // (11) 90000-0000
formatPhone('11987654321', { mask: 'e164' }); // +5511987654321
formatPhone('+5511987654321', { mask: 'international' }); // +55 11 98765-4321
formatPhone('08001234567', { mask: 'service' }); // 0800 123 4567
formatPhone('40041234', { mask: 'service' }); // 4004-1234
formatPhone('+5511987654321', { mask: 'auto' }); // +55 11 98765-4321 ("auto" detecta o prefixo +55 e escolhe "international")
formatPhone('11900000000'); // 11900-0000 (CUIDADO: a máscara padrão "sn" trunca um número com DDD)
```

## parsePhone

Remove a formatação do telefone, mantém apenas os dígitos e limita o resultado a 11 dígitos. Um código de país brasileiro é removido antes, mas somente quando os dígitos restantes tiverem exatamente 10 ou 11 dígitos, ou seja, um número nacional plausível. A regra é baseada no tamanho, não no sinal, então um número da área 55 não é confundido com o código de país.

```javascript
import { parsePhone } from '@brazilian-utils/brazilian-utils';

parsePhone('(11) 90000-0000'); // 11900000000
parsePhone('+55 (11) 98765-4321'); // 11987654321
parsePhone('5511987654321'); // 11987654321
parsePhone('55987654321'); // 55987654321 (DDD 55, não confundido com o código de país +55)
```

## isValidMobilePhone

Valida se o número de telefone celular é válido. `options.version` (tipado como `PhoneVersion`) controla qual regra de numeração celular é aplicada: `1` (padrão) aceita o formato antigo, cujo primeiro dígito do número (após o DDD) pode ser 6, 7, 8 ou 9; `2` exige o formato atual, que requer 9.

```javascript
import { isValidMobilePhone } from '@brazilian-utils/brazilian-utils';

isValidMobilePhone('11900000000'); // true
isValidMobilePhone('11712345678', { version: 1 }); // true (formato antigo)
isValidMobilePhone('11712345678', { version: 2 }); // false (v2 exige 9 como primeiro dígito)
```

## isValidLandlinePhone

Valida se o número de telefone residencial é válido.

```javascript
import { isValidLandlinePhone } from '@brazilian-utils/brazilian-utils';

isValidLandlinePhone('1130000000'); // true
```

## isValidServicePhone

Valida se um número de telefone é um número de serviço brasileiro válido, discado sem DDD: os Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` e `0900` (11 dígitos no total), os números abreviados `300X`/`400X` (8 dígitos), e os códigos de 3 dígitos dos Códigos de Acesso a Serviços de Utilidade Pública designados pela Anatel (ex.: `190`, `192`). Apenas a estrutura é verificada, o número não precisa estar atribuído a ninguém.

```javascript
import { isValidServicePhone } from '@brazilian-utils/brazilian-utils';

isValidServicePhone('0800 123 4567'); // true
isValidServicePhone('4004-1234'); // true
isValidServicePhone('190'); // true
isValidServicePhone('11987654321'); // false (número geográfico)
```

## getAreaCodeInfo

Retorna o estado (e a região) a que um DDD brasileiro pertence, dentre os 67 DDDs em uso no Plano Geral de Numeração da Anatel. Aceita string ou número, removendo caracteres não numéricos antes de comparar. Exporta o tipo `AreaCodeInfo`.

```javascript
import { getAreaCodeInfo } from '@brazilian-utils/brazilian-utils';

getAreaCodeInfo('11');
// { areaCode: 11, stateCode: 'SP', stateName: 'São Paulo', region: 'Sudeste' }

getAreaCodeInfo(21);
// { areaCode: 21, stateCode: 'RJ', stateName: 'Rio de Janeiro', region: 'Sudeste' }

getAreaCodeInfo('68');
// { areaCode: 68, stateCode: 'AC', stateName: 'Acre', region: 'Norte' }

getAreaCodeInfo('00'); // null
```

## getAreaCodesByState

Retorna todos os DDDs (códigos de área) que pertencem a um determinado estado brasileiro, dentro do Plano Geral de Numeração da Anatel. A comparação não diferencia maiúsculas de minúsculas e o resultado vem ordenado de forma crescente.

```javascript
import { getAreaCodesByState } from '@brazilian-utils/brazilian-utils';

getAreaCodesByState('SP'); // [11, 12, 13, 14, 15, 16, 17, 18, 19]
getAreaCodesByState('ac'); // [68]
getAreaCodesByState('XX'); // []
```

## isValidLicensePlate

Valida se a placa de carro ou moto é válida. Suporta o formato antigo brasileiro (ABC-1234) e o formato Mercosul (ABC1D23), a sequência única que a Resolução CONTRAN nº 969/2022 define para todo veículo, motos incluídas.

```javascript
import { isValidLicensePlate } from '@brazilian-utils/brazilian-utils';

isValidLicensePlate('ABC1234'); // true (formato brasileiro)
isValidLicensePlate('ABC-1234'); // true (formato brasileiro com hífen)
isValidLicensePlate('ABC 1234'); // true (máscara com espaço)
isValidLicensePlate('ABC1D23'); // true (formato Mercosul)
isValidLicensePlate('ABC12D3'); // false (não é uma sequência Mercosul)
isValidLicensePlate('ABC1234EXTRA'); // false (caracteres em excesso)
```

## isValidRenavam

Valida se o RENAVAM (Registro Nacional de Veículos Automotores) é válido. Suporta tanto o formato antigo (9 dígitos) quanto o novo formato (11 dígitos).

```javascript
import { isValidRenavam } from '@brazilian-utils/brazilian-utils';

isValidRenavam('639884962'); // true (9 dígitos, formato antigo)
isValidRenavam('00639884962'); // true (11 dígitos, formato novo)
isValidRenavam('12345678901'); // false (checksum inválido)
```

## isValidPis

Valida se o PIS é válido. Aceita os caracteres de máscara usuais e espaços em branco.

```javascript
import { isValidPis } from '@brazilian-utils/brazilian-utils';

isValidPis('12056412547'); // false
```

## formatPis

Formata número de PIS.

```javascript
import { formatPis } from '@brazilian-utils/brazilian-utils';

formatPis('12345678901'); // 123.45678.90-1
formatPis('123456789', { pad: true }); // 001.23456.78-9
```

## parsePis

Remove a formatação do PIS, mantém apenas os dígitos e limita o resultado a 11 dígitos.

```javascript
import { parsePis } from '@brazilian-utils/brazilian-utils';

parsePis('123.45678.90-1'); // 12345678901
```

## formatCep

Formata o CEP.

```javascript
import { formatCep } from '@brazilian-utils/brazilian-utils';

formatCep('92500000'); // 92500-000
```

## parseCep

Remove a formatação do CEP, mantém apenas os dígitos e limita o resultado a 8 dígitos.

```javascript
import { parseCep } from '@brazilian-utils/brazilian-utils';

parseCep('92500-000'); // 92500000
```

## getAddressInfoByCep

Busca informações de endereço para um CEP usando múltiplos provedores. O padrão é `['viacep', 'brasilapi']`. O provedor `'widenet'` está descontinuado (seu endpoint não responde mais) e foi excluído da lista padrão, mas ainda pode ser solicitado explicitamente via `options.providers` (tipado como `CepProvider[]`). O endereço retornado é tipado como `AddressInfo`.

```javascript
import { getAddressInfoByCep } from '@brazilian-utils/brazilian-utils';

// Usando os provedores padrão (['viacep', 'brasilapi'])
const address = await getAddressInfoByCep('01310100');
// { cep: '01310100', state: 'SP', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista' }

// Usando provedores específicos
const address = await getAddressInfoByCep('01310-100', {
  providers: ['viacep', 'brasilapi']
});

// Usando número como entrada (será preenchido automaticamente com zeros à esquerda)
const address = await getAddressInfoByCep(1310100);
```

## isValidProcessoJuridico

Valida o número do processo jurídico de acordo com definição do [CNJ](https://atos.cnj.jus.br/atos/detalhar/119).

```javascript
import { isValidProcessoJuridico } from '@brazilian-utils/brazilian-utils';

isValidProcessoJuridico('00020802520125150049'); // true
```

## formatProcessoJuridico

Formata um número no formato definido pelo [CNJ](https://atos.cnj.jus.br/atos/detalhar/119) (máscara `NNNNNNN-DD.AAAA.J.TR.OOOO`).

```javascript
import { formatProcessoJuridico } from '@brazilian-utils/brazilian-utils';

formatProcessoJuridico('00020802520125150049'); // 0002080-25.2012.5.15.0049
```

## parseProcessoJuridico

Remove a formatação do processo jurídico, mantém apenas os dígitos e limita o resultado a 20 dígitos. Tanto a máscara atual do CNJ (`NNNNNNN-DD.AAAA.J.TR.OOOO`) quanto a máscara antiga são aceitas, já que apenas os dígitos são mantidos.

```javascript
import { parseProcessoJuridico } from '@brazilian-utils/brazilian-utils';

parseProcessoJuridico('0002080-25.2012.5.15.0049'); // 00020802520125150049
```

## isValidIe

Valida se a inscrição estadual de um estado é válida. A UF é case-insensitive. Regras notáveis por estado: GO aceita os prefixos `10`, `11` e `15`; PA aceita `15` e `75`-`79`; MS aceita `28` e `50`; SP tem o padrão de produtor rural `P0MMMSSSSD000`; TO usa códigos de tipo de 11 dígitos (`01`, `02`, `03`, `99`).

```javascript
import { isValidIe } from '@brazilian-utils/brazilian-utils';

isValidIe('AC', '0187634580933'); // false
isValidIe('go', '109161793'); // true (case-insensitive)
```

## isValidBankAccount

Verifica se uma conta bancária brasileira é válida. O `bankCode` precisa estar na lista de participantes do STR publicada pelo Banco Central do Brasil (o mesmo dataset usado por `getBankByCode`), então um código não atribuído como `'999'` é sempre inválido. A partir daí o banco é validado de três formas: pelo algoritmo de dígito verificador publicado, apenas pela estrutura (o banco existe e a agência/conta respeitam a quantidade de dígitos documentada, para bancos que não publicam regra de dígito) ou pela verificação genérica mod10/mod11, que continua sendo o fallback para os demais bancos da lista.

Bancos validados pelo algoritmo de dígito verificador publicado:

| Banco | Código | Agência | Conta | Observações |
| --- | --- | --- | --- | --- |
| Banco do Brasil | `001` | 4-5 dígitos | 8-10 dígitos | mod11 com pesos 9..2; `digit` pode ser `"X"` |
| Santander | `033` | 4 dígitos | 8 dígitos | pesos `9,7,3,1,0,0,9,7,1,3,1,9,7,3` sobre agência + `"00"` + conta, desprezando as dezenas |
| Banrisul | `041` | 4 dígitos | 9 dígitos | pesos `3,2,4,7,6,5,4,3,2`; resto 0 gera `0` e resto 1 gera `6`; `account` é tipo (2 dígitos) + conta (7 dígitos) |
| Caixa Econômica Federal | `104` | 4 dígitos | 11 dígitos | mod11 sobre agência + conta; `account` é operação (3 dígitos) + conta (8 dígitos) |
| Bradesco | `237` | 4 dígitos | 7 dígitos | mod11 com pesos 2..7; `digit` pode ser `"P"` (geralmente exibido como `"0"`) |
| Nubank | `260` | 4 dígitos | 5-13 dígitos | dígito de Verhoeff sobre a conta, ignorando zeros à esquerda |
| Itaú Unibanco | `341` | 4 dígitos | 5 dígitos | mod10 sobre agência + conta |
| HSBC / Kirton Bank | `399` | 4 dígitos | 6 dígitos | pesos `8,9,2,3,4,5,6,7,8,9` sobre agência + conta; resto 10 gera `0` |
| Citibank | `745` | 4 dígitos | 10 dígitos | pesos `11..2` sobre a conta; resto 0 ou 1 gera `0` |

Bancos validados apenas pela estrutura, por não publicarem regra de dígito verificador. A agência (1-5 dígitos), a conta (1-13 dígitos) e um único `digit` numérico já tornam a conta válida:

| Banco | Código | | Banco | Código |
| --- | --- | --- | --- | --- |
| Inter | `077` | | PicPay | `380` |
| Ailos | `085` | | Cora | `403` |
| XP | `102` | | Pan | `623` |
| Unicred | `136` | | BV | `655` |
| Stone | `197` | | Daycoval | `707` |
| BTG Pactual | `208` | | Modal | `746` |
| Original | `212` | | Sicredi | `748` |
| PagBank | `290` | | Sicoob | `756` |
| BMG | `318` | | | |
| Mercado Pago | `323` | | | |
| C6 | `336` | | | |

Quando `digit` tem 2 caracteres, o fallback genérico encadeia mod10 seguido de mod11 sobre a conta, do mesmo jeito que os dígitos de CPF/CNPJ são encadeados.

Fontes: o compêndio "Regras de Validação de dígito verificador de agência e conta corrente", conferido contra `banktools-br` (Ruby), `luizalabs/heimdall` (Python) e `Xerpa/bran_checker` (Elixir). Cada algoritmo publicado aqui tem pelo menos duas fontes independentes concordantes.

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

## getBanks

Obtém todos os bancos brasileiros com código de compensação (COMPE), publicados pelo Banco Central do Brasil na [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv). Cada banco (tipado como `Bank`) tem um `code` (COMPE, 3 dígitos), um `ispb` (Identificador do Sistema de Pagamentos Brasileiro, 8 dígitos) e um `name`. Cada chamada retorna um novo array com novos objetos, então alterar o resultado nunca afeta chamadas seguintes.

```javascript
import { getBanks } from '@brazilian-utils/brazilian-utils';

getBanks();
// [
//   { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' },
//   { code: '003', ispb: '04902979', name: 'BANCO DA AMAZONIA S.A.' },
//   { code: '004', ispb: '07237373', name: 'Banco do Nordeste do Brasil S.A.' },
//   ... mais 345 itens
// ]
```

## getBankByCode

Busca um banco brasileiro pelo seu código de compensação (COMPE), publicado pelo Banco Central do Brasil na [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv). Aceita tanto `string` quanto `number`, com ou sem zeros à esquerda. Retorna uma nova cópia (tipada como `Bank`) do banco correspondente, ou `null` quando nenhum banco tem esse código.

```javascript
import { getBankByCode } from '@brazilian-utils/brazilian-utils';

getBankByCode('001'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode(1); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode('999'); // null
```

## getBankByIspb

Busca um banco brasileiro pelo seu ISPB (Identificador do Sistema de Pagamentos Brasileiro), o código de 8 dígitos publicado pelo Banco Central do Brasil na [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv). Todo participante do SPB tem um ISPB, mas este conjunto de dados só traz as instituições que também têm código COMPE, então um ISPB cuja instituição não tem código COMPE próprio retorna `null`. Aceita tanto `string` quanto `number`, com ou sem zeros à esquerda. Retorna uma nova cópia (tipada como `Bank`) do banco correspondente, ou `null` quando nenhum banco tem esse ISPB.

```javascript
import { getBankByIspb } from '@brazilian-utils/brazilian-utils';

getBankByIspb('00000000'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByIspb('60701190'); // { code: '341', ispb: '60701190', name: 'ITAÚ UNIBANCO S.A.' }
getBankByIspb('99999999'); // null
```

## isValidIban

Valida se um IBAN (International Bank Account Number) brasileiro é válido, conforme as [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Circular&numero=3625) do Bacen (Circular BCB nº 3.625/2013): `BR` + 2 dígitos verificadores ISO 7064 MOD 97-10 + 8 dígitos de ISPB + 5 dígitos de agência + 10 dígitos de conta + 1 letra de tipo de conta (`C`/`P`) + 1 caractere alfanumérico de titularidade, totalizando 29 caracteres. Somente IBANs brasileiros (código de país `BR`) são reconhecidos; qualquer outro país retorna `false`, já que este pacote não conhece o layout de campos dos outros mais de 90 países da ISO 13616. Aceita os espaços de agrupamento usuais e não diferencia maiúsculas de minúsculas.

```javascript
import { isValidIban } from '@brazilian-utils/brazilian-utils';

isValidIban('BR1500000000000010932840814P2'); // true
isValidIban('BR15 0000 0000 0000 1093 2840 814P 2'); // true (espaços de agrupamento)
isValidIban('BR1500000000000010932840814P3'); // false (dígitos verificadores inválidos)
isValidIban('DE89370400440532013000'); // false (IBAN não brasileiro)
```

## formatIban

Formata um IBAN brasileiro agrupando-o em blocos de 4 caracteres, a apresentação "impressa" da ISO 13616 usada em extratos e formulários bancários. Não valida os dígitos verificadores nem o layout dos campos; formata o que for passado, até o limite de 29 caracteres de um IBAN brasileiro, até onde for possível, então a função também pode ser usada como máscara de digitação. Use `isValidIban` para verificar a validade.

```javascript
import { formatIban } from '@brazilian-utils/brazilian-utils';

formatIban('BR1500000000000010932840814P2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('br1500000000000010932840814p2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('BR15'); // 'BR15'
```

## parseIban

Interpreta um IBAN brasileiro em seus campos: 2 (código do país, sempre `BR`) + 2 (dígitos verificadores ISO 7064 MOD 97-10) + 8 (ISPB) + 5 (agência) + 10 (conta) + 1 (tipo de conta, `C` ou `P`) + 1 (indicador do titular). Aceita as mesmas formas de entrada que `isValidIban` (espaços de agrupamento, minúsculas) e retorna `null` sempre que `isValidIban` retornaria `false`. O resultado é tipado como `Iban`.

```javascript
import { parseIban } from '@brazilian-utils/brazilian-utils';

parseIban('BR1500000000000010932840814P2');
// {
//   countryCode: 'BR',
//   checkDigits: '15',
//   bankIspb: '00000000',
//   branch: '00001',
//   account: '0932840814',
//   accountType: 'P',
//   owner: '2'
// }

parseIban('DE89370400440532013000'); // null (IBAN não brasileiro)
```

## isValidCreditCard

Valida se um número de cartão de pagamento é válido usando o algoritmo de Luhn ([ISO/IEC 7812-1](https://www.iso.org/standard/70484.html)). Aceita os caracteres de máscara usuais (espaços, hifens) entre os dígitos. Não faz detecção de bandeira (Visa, Mastercard, Amex...), consulta de faixa de emissor nem validação de validade/CVV, verifica apenas a quantidade de dígitos (12 a 19) e o dígito verificador de Luhn.

```javascript
import { isValidCreditCard } from '@brazilian-utils/brazilian-utils';

isValidCreditCard('4111111111111111'); // true (número de teste Visa)
isValidCreditCard('5555555555554444'); // true (número de teste Mastercard)
isValidCreditCard('378282246310005'); // true (número de teste American Express)
isValidCreditCard('4111 1111 1111 1111'); // true (máscara com espaços)
isValidCreditCard('4111111111111112'); // false (dígito verificador inválido)
```

## capitalize

Transforma primeira letra de cada palavra em maiúscula ignorando preposições. As palavras são separadas por espaço em branco, por `-` e por `/`, então `'MOGI-GUAÇU'` vira `'Mogi-Guaçu'` e `'SANTANA/RS'` vira `'Santana/Rs'`. Toda sequência de espaços em branco (tabs, quebras de linha, espaços repetidos) vira um único espaço, e o espaço no início e no fim é descartado. `options.upperCaseWords` tem como padrão `[]`, ou seja, nenhuma sigla é colocada em maiúsculas a menos que você a liste, e a comparação com `upperCaseWords` e `lowerCaseWords` é case-insensitive (locale pt-BR). As opções são tipadas como `CapitalizeOptions`.

```javascript
import { capitalize } from '@brazilian-utils/brazilian-utils';

capitalize('josé e maria'); // José e Maria
capitalize('josé Ama MARIA', { lowerCaseWords: ['ama'] }); // José ama Maria
capitalize('doc inválido', { upperCaseWords: ['DOC'] }); // DOC Inválido
capitalize('MOGI-GUAÇU'); // Mogi-Guaçu ("-" inicia uma nova palavra)
capitalize('SANTANA/RS', { upperCaseWords: ['RS'] }); // Santana/RS ("/" inicia uma nova palavra, então "RS" corresponde)
capitalize('empresa ltda'); // Empresa Ltda (sem siglas padrão)
capitalize('empresa ltda', { upperCaseWords: ['LTDA'] }); // Empresa LTDA (comparação case-insensitive)
capitalize('  josé   maria  '); // José Maria (toda sequência de espaço em branco, tabs e quebras de linha inclusive, vira um único espaço)
```

## formatCurrency

Formata um número inteiro ou float para uma string no padrão BRL. Um `number` é formatado como está (sinal e decimais preservados). Uma entrada em `string` é lida pela mesma regra do `parseCurrency`, com a diferença de que um valor escrito sem nenhum separador permanece em unidades inteiras: o último `,` ou `.` seguido de 1 ou 2 dígitos é o separador decimal, todo outro `,` ou `.` é separador de milhar, e um `-` escrito antes do primeiro dígito é preservado. Assim `'1.234,56'` vira `1.234,56`, `'-10.5'` vira `-10,50` e `'1234'` vira `1.234,00`. `precision` é limitado ao intervalo `0..20` (o aceito pelo `Intl.NumberFormat`) e o padrão é 2. Um valor que não seja um número finito (`NaN`, `Infinity`, `-Infinity`) vira string vazia. As opções são tipadas como `FormatCurrencyOptions`.

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

## parseCurrency

Transforma uma string para o formato de inteiro ou float. O último `,` ou `.` seguido de 1 ou 2 dígitos (ou de até `precision` dígitos, quando esse valor for maior) é o separador decimal; todo outro `,` ou `.` é separador de milhar. Assim `'R$ 1.234,56'` vira `1234.56`, `'R$ 1.234'` vira `1234`, `'1,5'` vira `1.5` e `'12.34'` vira `12.34`. Um valor escrito sem nenhum separador mantém a convenção de centavos e é dividido por `10 ** precision`, então `'1234'` vira `12.34`. Um `-` escrito antes do primeiro dígito é preservado, então `'-R$ 1,00'` vira `-1`. `precision` (padrão 2, limitado a `0..20`) controla quantos dígitos são tratados como centavos. As opções são tipadas como `ParseCurrencyOptions`.

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

## convertNumberToWords

Formata um número inteiro por extenso em português do Brasil, ex.: `1235` vira `"mil, duzentos e trinta e cinco"`. Só são suportados inteiros de `-999999999999999` a `999999999999999` (999 trilhões em valor absoluto); fora desse intervalo, `NaN` ou um valor não finito retornam `""`. Um `value` não inteiro é truncado em direção a zero antes da conversão. `options.gender` (parte de `ConvertNumberToWordsOptions`) concorda "um/dois" e a centena ("duzentos/duzentas" etc.) com o substantivo que o número qualifica, com padrão `"masculine"`. `options.case` define a caixa do resultado: `"lower"` (padrão, sem alteração), `"sentence"` (só a primeira letra em maiúscula) ou `"upper"` (tudo em maiúscula pelo locale "pt-BR", preservando os acentos, ex.: "três" -> "TRÊS"). Um valor inválido de `gender`/`case` é ignorado e o padrão é usado.

```javascript
import { convertNumberToWords } from '@brazilian-utils/brazilian-utils';

convertNumberToWords(123); // "cento e vinte e três"
convertNumberToWords(1001); // "mil e um"
convertNumberToWords(2000000); // "dois milhões"
convertNumberToWords(-42); // "menos quarenta e dois"
convertNumberToWords(2, { gender: 'feminine' }); // "duas"
convertNumberToWords(3, { case: 'upper' }); // "TRÊS"
convertNumberToWords(NaN); // ""
```

## convertCurrencyToWords

Formata um valor monetário em Reais por extenso, no estilo usado para escrever o valor à mão em cheques e contratos, ex.: `1523.45` vira `"mil, quinhentos e vinte e três reais e quarenta e cinco centavos"`. O `value` é truncado (não arredondado) para 2 casas decimais. O substantivo no singular é usado para exatamente 1 ("um real", "um centavo") e "de" é inserido antes de "reais" quando o valor é um milhão, bilhão ou trilhão de reais redondo. Um valor que trunca para nada vira `"zero reais"`, sem o prefixo "menos"; qualquer outro valor negativo recebe o prefixo "menos", e uma entrada inválida retorna `""`. Acima de `Number.MAX_SAFE_INTEGER / 100` reais (cerca de 90 trilhões) um double não consegue carregar centavos, então o valor é lido como um número inteiro de reais. `options.case` (parte de `ConvertCurrencyToWordsOptions`) define a caixa do resultado: `"lower"` (padrão), `"sentence"` (só a primeira letra em maiúscula) ou `"upper"` (tudo em maiúscula, preservando os acentos). Um valor inválido de `case` é ignorado e `"lower"` é usado.

```javascript
import { convertCurrencyToWords } from '@brazilian-utils/brazilian-utils';

convertCurrencyToWords(1523.45); // "mil, quinhentos e vinte e três reais e quarenta e cinco centavos"
convertCurrencyToWords(1); // "um real"
convertCurrencyToWords(0.01); // "um centavo"
convertCurrencyToWords(1000000); // "um milhão de reais"
convertCurrencyToWords(0); // "zero reais"
convertCurrencyToWords(-5.5); // "menos cinco reais e cinquenta centavos"
convertCurrencyToWords(-0.001); // "zero reais" (trunca para nada)
convertCurrencyToWords(1000, { case: 'upper' }); // "MIL REAIS"
```

## getStates

Retorna todos os estados brasileiros, cada um com sigla, nome, código da região, nome da região e código IBGE de 2 dígitos da Unidade da Federação (`cUF`). A lista é ordenada por nome com `localeCompare` no locale "pt-BR", então nomes acentuados caem onde um leitor brasileiro espera: Pará, Paraíba, Paraná e Rio de Janeiro, Rio Grande do Norte, Rio Grande do Sul. Cada chamada retorna um array novo com objetos novos, então alterar o resultado nunca afeta chamadas seguintes. Exporta os tipos `State`, `StateCode` e `StateName`.

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

## getStateByIbgeCode

Retorna o estado brasileiro cujo código IBGE de 2 dígitos ("cUF", Código da Unidade da Federação) corresponde ao valor informado. É o mesmo código de UF de 2 dígitos presente no primeiro campo de toda chave de acesso de DF-e (NF-e, NFC-e, CT-e e MDF-e). Aceita string ou número, removendo caracteres não numéricos antes de comparar. Exporta o tipo `State`.

```javascript
import { getStateByIbgeCode } from '@brazilian-utils/brazilian-utils';

getStateByIbgeCode('35');
// { code: 'SP', name: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 35 }

getStateByIbgeCode(11);
// { code: 'RO', name: 'Rondônia', regionCode: 'N', regionName: 'Norte', ibgeCode: 11 }

getStateByIbgeCode('00'); // null
```

## getStateCodeByName

Retorna a sigla de um estado brasileiro a partir do nome completo. A comparação ignora acentos, maiúsculas/minúsculas e espaços nas pontas, então `'sao paulo'`, `'SÃO PAULO'` e `'  São Paulo  '` resolvem para `'SP'`. Exporta o tipo `StateCode`.

```javascript
import { getStateCodeByName } from '@brazilian-utils/brazilian-utils';

getStateCodeByName('São Paulo'); // 'SP'
getStateCodeByName('sao paulo'); // 'SP'
getStateCodeByName('  Rio de Janeiro  '); // 'RJ'
getStateCodeByName('Neverland'); // null
```

## getStateNameByCode

Retorna o nome completo de um estado brasileiro a partir da sigla. A comparação ignora maiúsculas/minúsculas e espaços nas pontas, então `'sp'`, `'SP'` e `'  Sp  '` resolvem para `'São Paulo'`. Exporta o tipo `StateName`.

```javascript
import { getStateNameByCode } from '@brazilian-utils/brazilian-utils';

getStateNameByCode('SP'); // 'São Paulo'
getStateNameByCode('sp'); // 'São Paulo'
getStateNameByCode('  Rj  '); // 'Rio de Janeiro'
getStateNameByCode('ZZ'); // null
```

## getTimezoneByState

Retorna o nome do fuso horário do banco de dados IANA (tzdata) para um estado brasileiro, escolhido como o fuso da capital do estado. A comparação ignora maiúsculas/minúsculas e espaços nas pontas. Alguns fusos do tzdata cobrem mais de um estado: `America/Sao_Paulo` também cobre DF, GO, MG, ES, RJ, PR, SC e RS além de SP, e `America/Fortaleza` também cobre MA, PI, RN e PB além do CE. Pernambuco resolve para `America/Recife`, não `America/Noronha`: Fernando de Noronha é um distrito arquipélago de PE, não um estado próprio.

```javascript
import { getTimezoneByState } from '@brazilian-utils/brazilian-utils';

getTimezoneByState('SP'); // 'America/Sao_Paulo'
getTimezoneByState('am'); // 'America/Manaus'
getTimezoneByState('AC'); // 'America/Rio_Branco'
getTimezoneByState('PE'); // 'America/Recife'
getTimezoneByState('ZZ'); // null
```

## getCities

Retorna as cidades brasileiras. Retorna todas as cidades se nenhum estado for fornecido, ou cidades de um estado específico. Cada chamada retorna um array novo, então alterar o resultado nunca afeta chamadas seguintes. Um código de estado desconhecido (ou um valor que não seja `StateCode`) retorna um array vazio em vez de lançar erro.

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
//   ... 5561 more items
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
//   ... 635 more items
// ]
```

`getCities` embute os nomes dos 5571 municípios do IBGE (~153 KB minificado, ~49 KB com gzip) e é uma das poucas exceções pesadas neste pacote, que é tree-shakeable no restante. Veja [Tamanho do bundle](getting-started.md#tamanho-do-bundle) para saber como carregá-lo sob demanda via `@brazilian-utils/brazilian-utils/get-cities` em vez do import da raiz.

## getHolidays

Retorna feriados brasileiros para um determinado ano. Retorna feriados nacionais e opcionalmente feriados estaduais. Cada feriado (tipado como `Holiday`) tem um campo `type` (`HolidayType`: `"national"`, `"state"`, `"optional"` ou `"religious"`). O "Dia da Consciência Negra" (20 de novembro) é feriado nacional a partir de 2024 (Lei nº 14.759/2023). Antes disso, MT e RJ ainda trazem seu próprio feriado estadual chamado `"Consciência Negra"` na mesma data. Os resultados são memoizados por `year`/`stateCode`, mas cada chamada ainda retorna uma cópia nova. Um `stateCode` desconhecido/inválido é ignorado, retornando apenas os feriados nacionais.

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

## isValidPassport

Verifica se um número de passaporte brasileiro é válido (2 letras seguidas de 6 dígitos). A entrada é case-insensitive e caracteres não alfanuméricos (espaços, pontos, hífens) são ignorados.

```javascript
import { isValidPassport } from '@brazilian-utils/brazilian-utils';

isValidPassport('AB123456'); // true
isValidPassport('ab123456'); // true (case-insensitive)
isValidPassport('AB-123.456'); // true (símbolos são ignorados)
isValidPassport('12345678'); // false
```

## formatPassport

Formata um número de passaporte brasileiro (maiúsculas, sem símbolos, limitado a 8 caracteres).

```javascript
import { formatPassport } from '@brazilian-utils/brazilian-utils';

formatPassport('ab123456'); // 'AB123456'
formatPassport('AB-123.456'); // 'AB123456'
```

## generatePassport

Gera um número de passaporte brasileiro válido aleatoriamente.

```javascript
import { generatePassport } from '@brazilian-utils/brazilian-utils';

generatePassport(); // 'RY393097'
```

## parsePassport

Remove todos os caracteres não alfanuméricos de um número de passaporte, converte para maiúsculas e limita o resultado a 8 caracteres.

```javascript
import { parsePassport } from '@brazilian-utils/brazilian-utils';

parsePassport('AB-123.456'); // 'AB123456'
parsePassport(' AB 123 456 '); // 'AB123456'
```

## generateCep

Gera um CEP aleatório.

```javascript
import { generateCep } from '@brazilian-utils/brazilian-utils';

generateCep(); // '92500000'
```

## formatCnh

Formata a CNH.

```javascript
import { formatCnh } from '@brazilian-utils/brazilian-utils';

formatCnh('02650306461'); // 026503064-61
formatCnh('2650306461', { pad: true }); // 026503064-61
```

## isValidCnh

Valida se a CNH é válida.

```javascript
import { isValidCnh } from '@brazilian-utils/brazilian-utils';

isValidCnh('00000000119'); // true
```

## generateCnh

Gera uma CNH válida aleatória.

```javascript
import { generateCnh } from '@brazilian-utils/brazilian-utils';

generateCnh(); // '02650306461'
```

## parseCnh

Remove a formatação da CNH, mantém apenas os dígitos e limita o resultado a 11 dígitos.

```javascript
import { parseCnh } from '@brazilian-utils/brazilian-utils';

parseCnh('026503064-61'); // '02650306461'
```

## getCepInfoByAddress

Busca CEPs a partir de um endereço usando a ViaCEP. Lança `GetCepInfoByAddressValidationError` quando a UF, a cidade ou a rua estão ausentes/inválidas, `GetCepInfoByAddressNotFoundError` quando nenhum endereço corresponde à busca, e `GetCepInfoByAddressError` quando a própria ViaCEP responde com um status de erro HTTP. Uma requisição que não pode ser realizada (falha de transporte) rejeita com o erro original do `fetch`.

```javascript
import { getCepInfoByAddress } from '@brazilian-utils/brazilian-utils';

const ceps = await getCepInfoByAddress({
  federalUnit: 'SP',
  city: 'Sao Paulo',
  street: 'Avenida Paulista'
});

// [
//   {
//     cep: '01310100',
//     logradouro: 'Avenida Paulista',
//     complemento: 'lado par',
//     bairro: 'Bela Vista',
//     localidade: 'São Paulo',
//     uf: 'SP'
//   }
// ]
```

## generateProcessoJuridico

Gera um número de processo jurídico válido de acordo com a definição do [CNJ](https://atos.cnj.jus.br/atos/detalhar/119). `year` deve estar entre o ano atual e 9999, `court` entre 1 e 9; valores fora do intervalo retornam `null`. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generateProcessoJuridico } from '@brazilian-utils/brazilian-utils';

generateProcessoJuridico(); // '89478643020269670326'
generateProcessoJuridico({ year: 2026, court: 5 }); // string | null
generateProcessoJuridico({ year: 10000 }); // null (ano fora do intervalo)
```

## formatLegalNature

Formata um código de natureza jurídica.

```javascript
import { formatLegalNature } from '@brazilian-utils/brazilian-utils';

formatLegalNature('2062'); // 206-2
```

## isValidLegalNature

Valida se um código de natureza jurídica existe na lista oficial. A tabela segue a "Natureza Jurídica 2021" do IBGE/CONCLA: 92 códigos oficiais mais 8 códigos legados mantidos por compatibilidade. Somente os caracteres de máscara usuais (hífens, pontos, espaços) são tolerados ao redor dos 4 dígitos, então `'2062a'` é rejeitado em vez de ser lido como `'2062'`.

```javascript
import { isValidLegalNature } from '@brazilian-utils/brazilian-utils';

isValidLegalNature('2062'); // true
isValidLegalNature('9999'); // false
```

## generateLegalNature

Gera um código de natureza jurídica válido aleatório.

```javascript
import { generateLegalNature } from '@brazilian-utils/brazilian-utils';

generateLegalNature(); // '2062'
```

## parseLegalNature

Remove a formatação da natureza jurídica, mantém apenas os dígitos e limita o resultado a 4 dígitos.

```javascript
import { parseLegalNature } from '@brazilian-utils/brazilian-utils';

parseLegalNature('206-2'); // '2062'
```

## getLegalNatures

Retorna o mapa de naturezas jurídicas indexado pelo código.

```javascript
import { getLegalNatures } from '@brazilian-utils/brazilian-utils';

const legalNatures = getLegalNatures();

legalNatures['2062']; // 'Sociedade Empresária Limitada'
```

## getLegalNature

Busca um código de natureza jurídica na tabela oficial do IBGE/CONCLA.

```javascript
import { getLegalNature } from '@brazilian-utils/brazilian-utils';

getLegalNature('2062'); // { code: '2062', description: 'Sociedade Empresária Limitada' }
getLegalNature('0000'); // null
```

## generatePhone

Gera um telefone brasileiro aleatório. Aceita `'mobile'`, `'landline'` ou `'service'` (tipado como `GeneratePhoneType`); um número de serviço não tem DDD. Se omitido, gera aleatoriamente um celular ou um fixo, nunca um número de serviço.

```javascript
import { generatePhone } from '@brazilian-utils/brazilian-utils';

generatePhone(); // '11912345678' ou '1131234567'
generatePhone('mobile'); // '11912345678'
generatePhone('landline'); // '1131234567'
generatePhone('service'); // '08001234567' ou '40041234'
```

## formatLicensePlate

Formata uma placa. Placas antigas brasileiras (`LLLNNNN`) são retornadas com hífen e placas Mercosul (`LLLNLNN`) permanecem normalizadas.

```javascript
import { formatLicensePlate } from '@brazilian-utils/brazilian-utils';

formatLicensePlate('abc1234'); // 'ABC-1234'
formatLicensePlate('abc1d23'); // 'ABC1D23'
```

## generateLicensePlate

Gera uma placa aleatória no formato escolhido.

```javascript
import { generateLicensePlate } from '@brazilian-utils/brazilian-utils';

generateLicensePlate(); // 'ABC1D23' (Mercosul, o padrão)
generateLicensePlate('LLLNNNN'); // 'ABC1234'
```

## getFormatLicensePlate

Detecta o formato normalizado de uma placa.

```javascript
import { getFormatLicensePlate } from '@brazilian-utils/brazilian-utils';

getFormatLicensePlate('ABC-1234'); // 'LLLNNNN'
getFormatLicensePlate('ABC1D23'); // 'LLLNLNN'
getFormatLicensePlate('ABC12D3'); // null (não é uma sequência Mercosul)
getFormatLicensePlate('INVALID'); // null
getFormatLicensePlate('ABC1234EXTRA'); // null (caracteres em excesso)
```

`getFormatLicensePlate` exporta o tipo `LicensePlateFormat` (`"LLLNNNN" | "LLLNLNN"`); `generateLicensePlate` reexporta como `GenerateLicensePlateFormat`.

## parseLicensePlate

Remove separadores de uma placa, normaliza para letras maiúsculas e limita o resultado a 7 caracteres.

```javascript
import { parseLicensePlate } from '@brazilian-utils/brazilian-utils';

parseLicensePlate('abc-1234'); // 'ABC1234'
```

## convertLicensePlateToMercosul

Converte uma placa brasileira no formato antigo (`LLLNNNN`) para o formato Mercosul (`LLLNLNN`), seguindo a tabela oficial de conversão: o dígito na 5ª posição vira uma letra (`0` a `9` mapeados para `A` a `J`). Retorna `""` quando o valor não é uma placa válida no formato antigo.

```javascript
import { convertLicensePlateToMercosul } from '@brazilian-utils/brazilian-utils';

convertLicensePlateToMercosul('ABC1234'); // 'ABC1C34'
convertLicensePlateToMercosul('abc-1234'); // 'ABC1C34'
convertLicensePlateToMercosul('ABC1D23'); // '' (já está no formato Mercosul)
```

## generatePis

Gera um PIS válido aleatório.

```javascript
import { generatePis } from '@brazilian-utils/brazilian-utils';

generatePis(); // '91077906857'
```

## getMunicipality

Busca informações de município por código IBGE, ou obtém o código IBGE a partir do nome do município e UF. Uma única função cobre as duas direções, dependendo se `options` tem `code` ou `municipalityName`/`uf`. `code` deve ter exatamente 7 dígitos, caso contrário a função resolve para `null`. A resolução é totalmente offline, a partir de um dataset do IBGE embutido na biblioteca: nenhuma requisição de rede é feita. A comparação do nome do município ignora acentos e diferenças entre maiúsculas/minúsculas. Um município desconhecido, uma UF desconhecida ou uma entrada inválida resolvem para `null`.

```javascript
import { getMunicipality } from '@brazilian-utils/brazilian-utils';

await getMunicipality({ code: '3550308' });
// ['São Paulo', 'SP']

await getMunicipality({ municipalityName: 'sao paulo', uf: 'sp' });
// '3550308'

await getMunicipality({ code: '0000000' });
// null (código desconhecido)

await getMunicipality({ code: '123' });
// null (não tem 7 dígitos)
```

## getMunicipalities

Retorna os municípios brasileiros publicados pelo IBGE. Retorna todos os municípios se nenhum estado for fornecido, ou os municípios de um estado específico. Cada município é retornado como `{ code, name, stateCode }`, onde `code` é o código IBGE de 7 dígitos do município. Os resultados são ordenados por nome com `localeCompare` no locale "pt-BR". Cada chamada retorna um array novo com objetos novos, então alterar o resultado nunca afeta chamadas seguintes. Um código de estado desconhecido retorna um array vazio em vez de lançar erro.

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

`getMunicipalities` embute todos os 5571 municípios do IBGE e seus códigos, então carrega o mesmo custo de tamanho de pacote que `getCities`. Veja [Tamanho do bundle](getting-started.md#tamanho-do-bundle) para saber como carregá-lo sob demanda via `@brazilian-utils/brazilian-utils/get-municipalities` em vez do import da raiz.

## getMunicipalityByCode

Busca um município brasileiro pelo código IBGE de 7 dígitos. Aceita o código como string ou número, removendo qualquer caractere não numérico antes de comparar. Retorna `{ code, name, stateCode }`, um objeto novo, ou `null` quando o código não tem 7 dígitos ou não corresponde a nenhum município conhecido.

```javascript
import { getMunicipalityByCode } from '@brazilian-utils/brazilian-utils';

getMunicipalityByCode('3550308');
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode(3550308);
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode('0000000'); // null (código desconhecido)
getMunicipalityByCode('123'); // null (não tem 7 dígitos)
```

## isHoliday

Verifica se uma data específica é feriado brasileiro. A verificação compara a data local do `targetDate` (ano/mês/dia lidos localmente), não seu instante UTC subjacente. Retorna `false` quando `targetDate` está ausente ou não é um `Date` válido.

```javascript
import { isHoliday } from '@brazilian-utils/brazilian-utils';

isHoliday({ targetDate: new Date(2024, 0, 1) }); // true
isHoliday({ targetDate: new Date(2024, 6, 9), stateCode: 'SP' }); // true
isHoliday(); // false
```

## isBusinessDay

Verifica se uma data é um dia útil no Brasil. Retorna `false` para sábados, domingos e feriados brasileiros retornados por `getHolidays` para a data local de `value` (ano/mês/dia lidos localmente), a mesma convenção usada por `isHoliday`. `options.includeOptional` (parte de `IsBusinessDayOptions`) tem valor padrão `true`, então feriados do tipo opcional (`Holiday.type === "optional"`, ou seja, Carnaval e Corpus Christi) também contam como dias não úteis, seguindo o calendário bancário brasileiro (FEBRABAN/CMN); passe `false` para considerar apenas os feriados estatutários. `options.stateCode` também considera os feriados daquele estado; um `stateCode` desconhecido/inválido é ignorado, retornando apenas os feriados nacionais. Um `value` que não é um `Date` válido retorna `false`. Só os anos de 1900 a 2099 são suportados, o intervalo que `getHolidays` calcula; uma data fora dele retorna `false`.

```javascript
import { isBusinessDay } from '@brazilian-utils/brazilian-utils';

isBusinessDay(new Date(2024, 0, 2)); // true (terça-feira, não é feriado)
isBusinessDay(new Date(2024, 0, 1)); // false (Ano novo)
isBusinessDay(new Date(2024, 0, 6)); // false (sábado)
isBusinessDay(new Date(2024, 1, 13)); // false (Carnaval, feriado opcional, conta por padrão)
isBusinessDay(new Date(2024, 1, 13), { includeOptional: false }); // true
isBusinessDay(new Date(2024, 6, 9), { stateCode: 'SP' }); // false (Revolução Constitucionalista)
isBusinessDay(new Date(2024, 6, 9)); // true (feriado estadual ignorado sem stateCode)
isBusinessDay(new Date('not a date')); // false
```

## addBusinessDays

Adiciona um número de dias úteis brasileiros a uma data, pulando sábados, domingos e feriados brasileiros exatamente como `isBusinessDay` os define (mesmas opções `stateCode`/`includeOptional`). Retorna um novo `Date`; a `date` de entrada (parte de `AddBusinessDaysParams`) nunca é alterada, e seu horário é preservado no resultado. `days: 0` retorna um novo `Date` igual a `date`, sem alterações, mesmo quando `date` cai em um fim de semana ou feriado, isso reflete o comportamento verificado de [`addBusinessDays(date, 0)` do date-fns](https://date-fns.org/docs/addBusinessDays), que também não avança a entrada para o próximo dia útil. Um `days` negativo anda para trás, um dia útil por vez, também como no date-fns. Retorna `null` em caso de entrada inválida: uma `date` que não é um `Date` válido, um `days` que não é um número inteiro finito, ou um `stateCode` que não é uma string. Só os anos de 1900 a 2099 são suportados, o intervalo que `getHolidays` calcula; uma data fora dele (ou, no `addBusinessDays`, um percurso que sai dele) retorna `null`.

```javascript
import { addBusinessDays } from '@brazilian-utils/brazilian-utils';

addBusinessDays({ date: new Date(2024, 0, 2, 12), days: 1 }); // Date, 2024-01-03 12:00 (o dia seguinte já é útil)
addBusinessDays({ date: new Date(2024, 11, 31, 12), days: 1 }); // Date, 2025-01-02 12:00 (2025-01-01 é Ano novo, pulado)
addBusinessDays({ date: new Date(2024, 0, 5, 12), days: -1 }); // Date, 2024-01-04 12:00 (anda para trás)
addBusinessDays({ date: new Date(2024, 0, 6, 12), days: 0 }); // Date, 2024-01-06 12:00 (sem alteração, mesmo sendo sábado)
addBusinessDays({ date: new Date(2024, 6, 8, 12), days: 1, stateCode: 'SP' }); // Date, 2024-07-10 12:00 (2024-07-09 é a Revolução Constitucionalista em SP, pulado)
addBusinessDays({ date: new Date('not a date'), days: 1 }); // null
addBusinessDays({ date: new Date(2024, 0, 2), days: 1.5 }); // null (não é um número inteiro)
```

## differenceInBusinessDays

Conta o número de dias úteis brasileiros entre duas datas, refletindo a semântica de [`differenceInBusinessDays` do date-fns](https://date-fns.org/docs/differenceInBusinessDays) (verificada em seu código-fonte): `params.from` é contado quando ele próprio é um dia útil, `params.to` nunca é contado, e cada dia útil estritamente entre os dois é contado uma vez. Só a data de calendário de cada `Date` importa, o horário é ignorado. Os dias úteis são determinados exatamente como em `isBusinessDay` (mesmas opções `stateCode`/`includeOptional`). `from`/`to` no mesmo dia de calendário retornam `0`; um `to` anterior a `from` retorna um número negativo. Retorna `null` em caso de entrada inválida: um `from`/`to` que não é um `Date` válido, ou um `stateCode` que não é uma string. Os parâmetros são tipados como `DifferenceInBusinessDaysParams`. Só os anos de 1900 a 2099 são suportados, o intervalo que `getHolidays` calcula; uma data fora dele (ou, no `addBusinessDays`, um percurso que sai dele) retorna `null`.

```javascript
import { differenceInBusinessDays } from '@brazilian-utils/brazilian-utils';

differenceInBusinessDays({ from: new Date(2024, 0, 1), to: new Date(2024, 0, 2) }); // 0 (01/01 é Ano novo)
differenceInBusinessDays({ from: new Date(2024, 0, 2), to: new Date(2024, 0, 3) }); // 1 (02/01 contado, uma terça-feira)
differenceInBusinessDays({ from: new Date(2024, 0, 3), to: new Date(2024, 0, 2) }); // -1 (to anterior a from)
differenceInBusinessDays({ from: new Date(2024, 0, 2), to: new Date(2024, 0, 2) }); // 0 (mesmo dia)
differenceInBusinessDays({ from: new Date(2024, 6, 8), to: new Date(2024, 6, 10), stateCode: 'SP' }); // 1 (09/07/2024 é feriado estadual em SP)
differenceInBusinessDays({ from: new Date('not a date'), to: new Date() }); // null
```

## convertDateToWords

Formata uma data por extenso em português do Brasil, ex.: `"01/01/2024"` vira `"primeiro de janeiro de dois mil e vinte e quatro"`. Aceita um `Date` (lido pela sua data de calendário local, a mesma convenção usada por `isHoliday`) ou uma string no formato `"dd/mm/yyyy"` ou ISO `"yyyy-mm-dd"`. Com o `options.style` padrão `"full"`, o dia 1 é escrito como "primeiro" e os demais dias usam o número cardinal; com `"month"`, só o nome do mês é escrito por extenso e o dia/ano ficam em dígitos (o dia 1 como `"1º"`, ex.: `"2 de março de 2024"`, `"1º de janeiro de 2024"`). Os nomes dos meses ficam em minúsculo. No estilo `"full"` o ano é escrito por extenso sem a vírgula de milhar que `convertNumberToWords`/`convertCurrencyToWords` usam (`1999` vira `"mil novecentos e noventa e nove"`, não `"mil, novecentos e noventa e nove"`), do jeito que uma data é lida em voz alta. `options.weekday` (padrão `false`) prefixa o nome do dia da semana em pt-BR minúsculo seguido de vírgula (`"sábado, dois de março de dois mil e vinte e quatro"`), calculado a partir da data de calendário resolvida. `options.case` define a caixa de todo o resultado: `"lower"` (padrão), `"sentence"` (só a primeira letra em maiúscula) ou `"upper"` (tudo em maiúscula, preservando os acentos). Valores inválidos de `case`/`style` são ignorados e o padrão é usado. O dia 29 de fevereiro é aceito nos anos bissextos do calendário gregoriano proléptico (divisíveis por 4, exceto séculos não divisíveis por 400). Retorna `""` para um `Date` inválido, uma string malformada, um dia/mês que não existe ou uma data anterior ao ano 1.

```javascript
import { convertDateToWords } from '@brazilian-utils/brazilian-utils';

convertDateToWords('01/01/2024'); // "primeiro de janeiro de dois mil e vinte e quatro"
convertDateToWords('2024-01-02'); // "dois de janeiro de dois mil e vinte e quatro"
convertDateToWords(new Date(2024, 0, 1)); // "primeiro de janeiro de dois mil e vinte e quatro"
convertDateToWords('01/01/2024', { case: 'sentence' }); // "Primeiro de janeiro de dois mil e vinte e quatro"
convertDateToWords('02/03/2024', { style: 'month' }); // "2 de março de 2024"
convertDateToWords('01/01/2024', { style: 'month' }); // "1º de janeiro de 2024"
convertDateToWords('02/03/2024', { weekday: true }); // "sábado, dois de março de dois mil e vinte e quatro"
convertDateToWords('10/05/1999'); // "dez de maio de mil novecentos e noventa e nove"
convertDateToWords('31/04/2024'); // "" (abril tem 30 dias)
convertDateToWords('invalid'); // ""
convertDateToWords('29/02/1900'); // "" (1900 não é bissexto)
```

## formatVoterId

Formata um título de eleitor. Usa por padrão o agrupamento de 12 dígitos `0000 0000 00 00`; o agrupamento de 13 dígitos `0000 0000 0 00 00` só é usado quando o valor sanitizado tem mais de 12 dígitos **e** o código de unidade federativa (o 10º e o 11º dígitos) é `01` (São Paulo) ou `02` (Minas Gerais), os dois estados cujos títulos podem ter um número sequencial de 9 dígitos.

```javascript
import { formatVoterId } from '@brazilian-utils/brazilian-utils';

formatVoterId('123456780175'); // '1234 5678 01 75'
formatVoterId('1234567880191'); // '1234 5678 8 01 91' (título de 13 dígitos SP/MG)
```

## isValidVoterId

Valida se um título de eleitor é válido. Aceita tanto o título padrão de 12 dígitos quanto o título de 13 dígitos emitido por São Paulo (UF `01`) e Minas Gerais (UF `02`).

```javascript
import { generateVoterId, isValidVoterId } from '@brazilian-utils/brazilian-utils';

const voterId = generateVoterId('SP');

isValidVoterId(voterId); // true
```

## generateVoterId

Gera um título de eleitor válido aleatório. Você pode opcionalmente informar a UF; uma UF desconhecida usa `"ZZ"` (título emitido no exterior) em vez de lançar erro. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generateVoterId } from '@brazilian-utils/brazilian-utils';

generateVoterId(); // título de eleitor aleatório válido (exterior, "ZZ")
generateVoterId('SP'); // título de eleitor aleatório válido de São Paulo
generateVoterId('XX'); // usa "ZZ" em vez de lançar erro
```

## parseVoterId

Remove a formatação do título de eleitor, mantém apenas os dígitos e limita o resultado a 12 dígitos (13 quando os dígitos da UF identificam São Paulo ou Minas Gerais).

```javascript
import { parseVoterId } from '@brazilian-utils/brazilian-utils';

parseVoterId('1234 5678 01 75'); // '123456780175'
parseVoterId('1234 5678 8 01 91'); // '1234567880191' (título de 13 dígitos SP/MG)
```

## isValidCns

Verifica se um número de CNS (Cartão Nacional de Saúde) é válido, o identificador único do usuário do SUS (Sistema Único de Saúde). Cartões definitivos (iniciados em 1 ou 2) são validados com a mesma ponderação módulo 11 usada no PIS sobre uma base de 11 dígitos embutida, ajustando a base em +2 quando o dígito verificador bruto resulta em 10. Cartões provisórios (iniciados em 7, 8 ou 9) são validados por uma soma ponderada única (pesos de 15 a 1) que deve ser múltipla de 11.

```javascript
import { isValidCns } from '@brazilian-utils/brazilian-utils';

isValidCns('123456789010000'); // true (definitivo)
isValidCns('700000000000005'); // true (provisório)
isValidCns('12345678901'); // false (tamanho inválido)
```

## formatCns

Formata um número de CNS (Cartão Nacional de Saúde) nos grupos de exibição usuais de 3-4-4-4 dígitos separados por espaço. As opções são tipadas como `FormatCnsOptions`.

```javascript
import { formatCns } from '@brazilian-utils/brazilian-utils';

formatCns('123456789010001'); // '123 4567 8901 0001'
formatCns(123456789010001); // '123 4567 8901 0001'
formatCns('89010001', { pad: true }); // '000 0000 8901 0001'
```

## isValidCertidao

Verifica se a matrícula de uma certidão de registro civil (nascimento, casamento, óbito e os demais atos mantidos por uma serventia de registro civil das pessoas naturais) é válida. A matrícula tem 32 dígitos distribuídos em 6 (CNS da serventia) + 2 (acervo) + 2 (serviço) + 4 (ano) + 1 (tipo do livro) + 5 (livro) + 3 (folha) + 7 (termo) + 2 (dígitos verificadores), e os dois dígitos verificadores usam módulo 11 com pesos ciclando de 2 a 10 e voltando por 0. Aceita os caracteres de máscara usuais e espaços entre e ao redor dos grupos. O layout e os dois dígitos verificadores seguem o [Provimento CNJ nº 3/2009](https://atos.cnj.jus.br/atos/detalhar/1310), cujo CNS da serventia vem do [Provimento CNJ nº 2/2009](https://atos.cnj.jus.br/atos/detalhar/1311), detalhado em [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e implementado pelo [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts) e pelo [validator-docs](https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php).

`options.accept` (parte de `IsValidCertidaoOptions`) restringe quais tipos de livro (o mesmo `CertidaoType` retornado por `parseCertidao`) contam como válidos; quando informado, o dígito do tipo de livro precisa corresponder a um dos tipos listados. O padrão é aceitar todos os tipos.

```javascript
import { isValidCertidao } from '@brazilian-utils/brazilian-utils';

isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21'); // true
isValidCertidao('09430001552010100020112000012087'); // true
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 22'); // false (dígitos verificadores inválidos)
isValidCertidao('123456'); // false (tamanho inválido)
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21', { accept: ['birth'] }); // true
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21', { accept: ['death'] }); // false
```

## parseCertidao

Extrai os campos da matrícula de uma certidão de registro civil, retornando `null` quando a matrícula é inválida ou quando o código do livro não é um dos nove livros definidos pelo Provimento. Os nove livros e seus códigos são os definidos pelo [Provimento CNJ nº 3/2009](https://atos.cnj.jus.br/atos/detalhar/1310), conforme listados em [ghiorzi.org](http://ghiorzi.org/DVnew.htm).

```javascript
import { parseCertidao } from '@brazilian-utils/brazilian-utils';

parseCertidao('104539 01 55 2013 1 00012 021 0000123 21');
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

parseCertidao('invalid'); // null
```

O resultado `Certidao` traz:

| Chave | Descrição |
| --- | --- |
| `registryCns` | O CNS (Código Nacional de Serventia) de 6 dígitos da serventia que lavrou o ato. |
| `acervo` | Acervo a que o livro pertence: `"01"` acervo próprio, `"02"` acervo incorporado. |
| `service` | Serviço prestado pela serventia, `"55"` para registro civil das pessoas naturais. |
| `year` | Ano do registro, com 4 dígitos. |
| `type` | Livro a que o ato pertence: `"birth"`, `"marriage"`, `"religious-marriage"`, `"death"`, `"stillbirth"`, `"banns"`, `"other"`, `"emancipation"` ou `"interdiction"`. |
| `typeCode` | Código bruto do livro, de 1 a 9, como impresso na décima quinta posição da matrícula. |
| `book` | Número do livro, com 5 dígitos e zeros à esquerda. |
| `page` | Número da folha, com 3 dígitos e zeros à esquerda. |
| `term` | Número do termo, com 7 dígitos e zeros à esquerda. |
| `checkDigits` | Os 2 dígitos verificadores módulo 11 da matrícula. |

## formatCertidao

Formata a matrícula de uma certidão de registro civil na máscara impressa do Provimento, os 32 dígitos agrupados em 6 2 2 4 1 5 3 7 2 e separados por espaços. `options.pad` (parte de `FormatCertidaoOptions`) preenche o valor com zeros à esquerda até 32 dígitos. A máscara é a impressa no [Provimento CNJ nº 3/2009](https://atos.cnj.jus.br/atos/detalhar/1310).

```javascript
import { formatCertidao } from '@brazilian-utils/brazilian-utils';

formatCertidao('10453901552013100012021000012321'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('104539.01.55.2013.1.00012.021.0000123-21'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('1552010100020112000012087', { pad: true }); // 000000 01 55 2010 1 00020 112 0000120 87
```

## isValidCei

Verifica se um número de CEI (Cadastro Específico do INSS) é válido. O CEI identifica o empregador sem CNPJ, como uma obra ou um produtor rural: 12 dígitos impressos como `00.000.00000/00`, sendo o último um dígito verificador calculado sobre os 11 dígitos da base com os pesos 7, 4, 1, 8, 5, 2, 1, 6, 3, 7 e 4. Aceita os caracteres de máscara usuais e espaços entre e ao redor dos grupos. A regra do dígito verificador é a implementada pelo [yii2-br-validator](https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php) e pelo [Bigai.Documentos.Brasil](https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs), conferida contra os dados abertos do Cadastro Nacional de Obras (CNO) da Receita Federal.

```javascript
import { isValidCei } from '@brazilian-utils/brazilian-utils';

isValidCei('11.583.00249/85'); // true
isValidCei('277297118187'); // true
isValidCei(249859674386); // true
isValidCei('24.985.96743/68'); // false (dígito verificador inválido)
isValidCei('000000000000'); // false (dígitos repetidos)
```

## formatCei

Formata um número de CEI (Cadastro Específico do INSS) na máscara oficial `00.000.00000/00`. Formata progressivamente, até onde os dígitos informados alcançarem, então também pode ser usada como máscara de digitação. `options.pad` (parte de `FormatCeiOptions`) preenche a esquerda com zeros até 12 dígitos.

```javascript
import { formatCei } from '@brazilian-utils/brazilian-utils';

formatCei('277297118187'); // 27.729.71181/87
formatCei(249859674386); // 24.985.96743/86
formatCei('249', { pad: true }); // 00.000.00002/49
```

## isValidCno

Verifica se um número de CNO (Cadastro Nacional de Obras) é válido. O CNO substituiu o CEI para obras e manteve a mesma numeração, então uma obra registrada sob um CEI antigo conserva o número e os dois cadastros são validados do mesmo jeito: 12 dígitos impressos como `00.000.00000/00`, com o dígito verificador calculado sobre os 11 dígitos da base. A regra foi confirmada contra os dados abertos do Cadastro Nacional de Obras (CNO) da Receita Federal: todas as 38432 obras registradas em Minas Gerais passam nesta verificação.

```javascript
import { isValidCno } from '@brazilian-utils/brazilian-utils';

isValidCno('11.084.01680/62'); // true
isValidCno('111130137368'); // true
isValidCno(401800097960); // true
isValidCno('110840168063'); // false (dígito verificador inválido)
isValidCno('000000000000'); // false (dígitos repetidos)
```

## formatCno

Formata um número de CNO (Cadastro Nacional de Obras). O CNO manteve a numeração do CEI, então os dois compartilham a mesma máscara de 12 dígitos, `00.000.00000/00`. Formata progressivamente, até onde os dígitos informados alcançarem, então também pode ser usada como máscara de digitação. `options.pad` (parte de `FormatCnoOptions`) preenche a esquerda com zeros até 12 dígitos.

```javascript
import { formatCno } from '@brazilian-utils/brazilian-utils';

formatCno('111130137368'); // 11.113.01373/68
formatCno(401800097960); // 40.180.00979/60
formatCno('979', { pad: true }); // 00.000.00009/79
```

## isValidCaepf

Verifica se um número de CAEPF (Cadastro de Atividade Econômica da Pessoa Física) é válido. O CAEPF substituiu o CEI para a pessoa física que contrata empregados: 14 dígitos impressos como `000.000.000/000-00`, formados pela base de 9 dígitos do CPF do titular, um número de ordem de 3 dígitos para os vários cadastros do mesmo titular e 2 dígitos verificadores. Os dois dígitos usam o módulo 11 do CNPJ e o par resultante é somado a 12, com retorno a zero acima de 99. O layout e a soma de 12 estão descritos em [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e são implementados do mesmo jeito pelo [brazilian-values](https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts).

```javascript
import { isValidCaepf } from '@brazilian-utils/brazilian-utils';

isValidCaepf('293.118.610/001-84'); // true
isValidCaepf('41142260000101'); // true
isValidCaepf(29311861000184); // true
isValidCaepf('29311861000185'); // false (dígitos verificadores inválidos)
isValidCaepf('00000000000000'); // false (dígitos repetidos)
```

## formatCaepf

Formata um número de CAEPF (Cadastro de Atividade Econômica da Pessoa Física) na máscara oficial `000.000.000/000-00`. Formata progressivamente, até onde os dígitos informados alcançarem, então também pode ser usada como máscara de digitação. `options.pad` (parte de `FormatCaepfOptions`) preenche a esquerda com zeros até 14 dígitos.

```javascript
import { formatCaepf } from '@brazilian-utils/brazilian-utils';

formatCaepf('29311861000184'); // 293.118.610/001-84
formatCaepf(41142260000101); // 411.422.600/001-01
formatCaepf('184', { pad: true }); // 000.000.000/001-84
```

## isValidRegistroProfissional

Verifica a estrutura de um número de registro/inscrição profissional. As opções são tipadas como `IsValidRegistroProfissionalOptions`: `options.council` escolhe o conselho emissor (`"OAB"`, `"CRM"`, `"CRO"`, `"CRP"` ou `"CRC"`) e o `options.stateCode` opcional verifica a UF embutida (ignorado para `"CRP"`, cujo prefixo de 2 dígitos é um código regional, não uma UF literal). É apenas uma verificação estrutural: a quantidade de dígitos e a UF são validadas, mas nenhum dígito verificador é calculado, mesmo para o CRC, cujo formato inclui um. O CREA não é suportado: seu formato de registro não pôde ser confirmado em uma fonte oficial e publicamente documentada após a unificação nacional de 2016 (RNP).

```javascript
import { isValidRegistroProfissional } from '@brazilian-utils/brazilian-utils';

isValidRegistroProfissional('123456/SP', { council: 'OAB' }); // true
isValidRegistroProfissional('123456-RJ', { council: 'OAB', stateCode: 'SP' }); // false (UF divergente)
isValidRegistroProfissional('06/12345', { council: 'CRP' }); // true
isValidRegistroProfissional('SP-123456/O-3', { council: 'CRC' }); // true
```

## isValidVin

Valida se um VIN (Vehicle Identification Number / chassi) é válido conforme a [ISO 3779](https://www.iso.org/standard/52200.html). Verifica o tamanho (17 caracteres), as letras excluídas (`I`, `O`, `Q` nunca são válidas) e o dígito verificador na 9ª posição, calculado com a tabela de transliteração da ISO 3779 e uma soma ponderada em módulo 11, obrigatório para veículos fabricados ou importados no Brasil conforme a Resolução CONTRAN nº 27/1998. Não diferencia maiúsculas de minúsculas e remove espaços nas extremidades.

```javascript
import { isValidVin } from '@brazilian-utils/brazilian-utils';

isValidVin('1HGCM82633A004352'); // true
isValidVin('1m8gdm9axkp042788'); // true (dígito verificador X, minúsculo)
isValidVin('1HGCM82633A004353'); // false (dígito verificador inválido)
isValidVin('1HGCM8263IA004352'); // false (contém a letra excluída I)
```

## isValidCbo

Valida se um código CBO (Classificação Brasileira de Ocupações) existe na tabela de ocupações do MTE. Aceita o código com ou sem a máscara de hífen, ou como número.

```javascript
import { isValidCbo } from '@brazilian-utils/brazilian-utils';

isValidCbo('2124-05'); // true
isValidCbo('212405'); // true
isValidCbo(212405); // true
isValidCbo('000000'); // false
```

Os títulos das ocupações vêm das [tabelas oficiais da CBO 2002 publicadas pelo MTE](http://www.mtecbo.gov.br/cbosite/pages/downloads.jsf).

## getCbo

Consulta um código CBO (Classificação Brasileira de Ocupações) e retorna o título oficial da ocupação. Um `number` mantém os zeros à esquerda implícitos: `getCbo(10205)` é lido como `010205`.

```javascript
import { getCbo } from '@brazilian-utils/brazilian-utils';

getCbo('2124-05'); // { code: '212405', title: 'Analista de desenvolvimento de sistemas' }
getCbo('000000'); // null
```

Os títulos das ocupações vêm das [tabelas oficiais da CBO 2002 publicadas pelo MTE](http://www.mtecbo.gov.br/cbosite/pages/downloads.jsf).

## isValidCnae

Valida se um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas) existe na tabela CNAE 2.3 publicada pelo IBGE. Aceita o código com ou sem a máscara `NNNN-N/NN`, ou como número.

```javascript
import { isValidCnae } from '@brazilian-utils/brazilian-utils';

isValidCnae('6201-5/01'); // true
isValidCnae('6201501'); // true
isValidCnae('0000000'); // false
```

## formatCnae

Formata um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas).

```javascript
import { formatCnae } from '@brazilian-utils/brazilian-utils';

formatCnae('6201501'); // 6201-5/01
```

## getCnae

Busca um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas) e retorna seu código formatado e a descrição oficial. Um `number` mantém os zeros à esquerda implícitos: `getCnae(111301)` é lido como `0111301`.

```javascript
import { getCnae } from '@brazilian-utils/brazilian-utils';

getCnae('6201501'); // { code: '6201-5/01', description: 'DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA' }
getCnae('0000000'); // null
```

## isValidNcm

Valida se um código NCM (Nomenclatura Comum do Mercosul) existe na tabela vigente publicada pelo Siscomex/MDIC. Aceita o código com ou sem a máscara de pontos, ou como número.

```javascript
import { isValidNcm } from '@brazilian-utils/brazilian-utils';

isValidNcm('8471.30.12'); // true
isValidNcm('84713012'); // true
isValidNcm('00000000'); // false
```

## formatNcm

Formata um código NCM (Nomenclatura Comum do Mercosul).

```javascript
import { formatNcm } from '@brazilian-utils/brazilian-utils';

formatNcm('84713012'); // 8471.30.12
```

## isValidCfop

Valida se um código CFOP (Código Fiscal de Operações e Prestações) existe na tabela oficial (Ajuste SINIEF 07/2001 e atualizações).

```javascript
import { isValidCfop } from '@brazilian-utils/brazilian-utils';

isValidCfop('5102'); // true
isValidCfop('0000'); // false
```

## getCfop

Busca um código CFOP (Código Fiscal de Operações e Prestações) e retorna seu código e a descrição oficial.

```javascript
import { getCfop } from '@brazilian-utils/brazilian-utils';

getCfop('5102'); // { code: '5102', description: 'Venda de mercadoria adquirida ou recebida de terceiros' }
getCfop('0000'); // null
```

## isValidCst

Valida um código de CST (Código de Situação Tributária) para um tributo. Informe o tributo em `options.tax`:

| Tributo | Formato | Códigos aceitos |
| --- | --- | --- |
| `icms` | 3 dígitos (origem + CST) | origem `0`-`8` + um de `00`, `10`, `20`, `30`, `40`, `41`, `50`, `51`, `60`, `70`, `90` |
| `ipi` | 2 dígitos | `00`, `01`, `02`, `03`, `04`, `05`, `49`, `50`, `51`, `52`, `53`, `54`, `55`, `99` |
| `pis` | 2 dígitos | `01`-`09`, `49`, `50`-`56`, `60`-`67`, `70`-`75`, `98`, `99` |
| `cofins` | 2 dígitos | mesma tabela do `pis` |

`options.tax` (parte de `IsValidCstOptions`) é opcional: omita-o para aceitar um código que exista em qualquer uma das quatro tabelas acima.

```javascript
import { isValidCst } from '@brazilian-utils/brazilian-utils';

isValidCst('000', { tax: 'icms' }); // true
isValidCst('110', { tax: 'icms' }); // true
isValidCst('06', { tax: 'pis' }); // true
isValidCst('99', { tax: 'ipi' }); // true
isValidCst('110'); // true (encontrado na tabela icms, tax omitido)
isValidCst('999'); // false (não existe em nenhuma tabela)
```

## isValidCsosn

Valida se um código de CSOSN (Código de Situação da Operação no Simples Nacional) é um dos 10 códigos definidos pelo Ajuste SINIEF 03/2010: `101`, `102`, `103`, `201`, `202`, `203`, `300`, `400`, `500` ou `900`.

```javascript
import { isValidCsosn } from '@brazilian-utils/brazilian-utils';

isValidCsosn('101'); // true
isValidCsosn('999'); // false
```

## removeAccents

Remove marcas diacríticas (acentos, tils, cedilhas) de uma string, decompondo cada caractere acentuado em sua letra base mais as marcas de combinação (Unicode NFD) e descartando essas marcas.

```javascript
import { removeAccents } from '@brazilian-utils/brazilian-utils';

removeAccents('São Paulo'); // 'Sao Paulo'
removeAccents('Piauí'); // 'Piaui'
removeAccents('Ceará'); // 'Ceara'
removeAccents('Açaí'); // 'Acai'
removeAccents(''); // ''
```
