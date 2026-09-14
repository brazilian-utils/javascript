# Utilitários

Aqui você encontrará todos os utilitários disponíveis para uso.

> **Tratamento de entrada:** nenhuma função pública síncrona lança exceção com `null`/`undefined` ou um valor de tipo incorreto; as duas funções de rede, `getAddressInfoByCep` e `getCepInfoByAddress`, rejeitam com seus erros tipados (veja as seções delas). Os validadores (`isValid*`) retornam `false`; `isHoliday` retorna `false`; `getHolidays` retorna `[]`; `getBoletoInfo` retorna `null` para um boleto inválido; `generateProcessoJuridico` retorna `null`; `getMunicipality` retorna `null` para uma busca malformada/sem correspondência. Todas as demais funções `format*`/`parse*` retornam um valor vazio do seu tipo de retorno: toda função `format*`, `capitalize`, e as funções `parse*` que retornam string (`parseBoleto`, `parseCep`, `parseCnh`, `parseCnpj`, `parseCpf`, `parseLegalNature`, `parseLicensePlate`, `parsePassport`, `parsePhone`, `parsePis`, `parseProcessoJuridico`, `parseVoterId`) retornam `""`; `parseCurrency` retorna `0`; os parsers que retornam objeto/tupla — `parseCertidao`, `parseIban`, `parseNfeKey`, `parsePixKey`, `parsePixPayload` — retornam `null`. `formatCurrency` retorna `""` para um número não finito e para um valor que não pode ser convertido em número (um symbol, um objeto simples, um objeto sem protótipo); `null`, arrays e booleanos passam por `Number()` como no 2.3.0. A única exceção à promessa acima: um objeto criado com `Object.create(null)` não tem `toString`, então as funções `format*`/`parse*` que leem a entrada como texto ainda lançam um `TypeError` para ele, exatamente como na 2.3.0.

## isValidCpf

Valida se o CPF é válido. Aceita os caracteres de máscara usuais e espaços em branco entre/ao redor dos grupos.

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('155151475'); // false
isValidCpf('111 444 777 35'); // true (máscara com espaços)
```

## formatCpf

Formata o CPF. `options.pad` (parte de `FormatCpfOptions`) preenche o valor com zeros à esquerda até as 11 posições do padrão antes de aplicar a máscara (padrão `false`). `options.obfuscate` (do mesmo tipo) esconde os 3 primeiros dígitos e os 2 dígitos verificadores (`***.456.789-**`), a convenção de exibição do gov.br / Receita Federal, aplicada após o `pad`. É lida por veracidade (truthiness), do mesmo jeito que o `pad`, então qualquer valor verdadeiro esconde os dígitos.

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

Gera um CPF válido aleatório. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generateCpf } from '@brazilian-utils/brazilian-utils'

generateCpf();
generateCpf('SP'); // o 9º dígito é 8, o código da região fiscal de SP
```

## isValidCnpj

Valida se o CNPJ é válido. `options.version` (parte de `IsValidCnpjOptions`) escolhe qual formato é aceito: `1` (padrão) apenas o formato numérico, `2` tanto o numérico quanto o alfanumérico; qualquer outro valor é lido como `1`, do mesmo jeito que `formatCnpj` e `parseCnpj` o leem. Os caracteres de máscara usuais e espaços em branco são aceitos nas duas versões. A versão `2` não tem lista de valores reservados, porque o manual da Receita Federal não define nenhuma para o formato alfanumérico: uma base alfanumérica de caracteres repetidos (todos `A`, por exemplo) que passe no dígito verificador é aceita, enquanto os números reservados numéricos são rejeitados na versão `1`.

```javascript
import { isValidCnpj } from '@brazilian-utils/brazilian-utils';

isValidCnpj('15515147234255'); // false
isValidCnpj('q0slfmbd7vx439', { version: 2 }); // true (alfanumérico minúsculo)
```

## formatCnpj

Formata o CNPJ. `options.pad` (parte de `FormatCnpjOptions`) preenche o valor com zeros à esquerda até as 14 posições do padrão antes de aplicar a máscara (padrão `false`). `options.version` (do mesmo tipo) escolhe qual formato de CNPJ é lido: `1` (padrão) apenas numérico, `2` alfanumérico. `options.obfuscate` esconde os 2 primeiros dígitos e os 2 dígitos verificadores (`**.345.678/0001-**`), a convenção de exibição do gov.br / Receita Federal. Vale para as duas versões, é aplicada após o `pad` e é lida por veracidade (truthiness), do mesmo jeito que o `pad`, então qualquer valor verdadeiro esconde os dígitos.

```javascript
import { formatCnpj } from '@brazilian-utils/brazilian-utils';

formatCnpj('24522200000174'); // 24.522.200/0001-74
formatCnpj('245222000174', { pad: true }); // 00.245.222/0001-74
formatCnpj('12OUT345000199', { version: 2 }); // 12.OUT.345/0001-99
formatCnpj('12345678000195', { obfuscate: true }); // **.345.678/0001-**
```

## parseCnpj

Remove a formatação do CNPJ, retorna um valor normalizado e limita o resultado a 14 caracteres. `options.version` (parte de `ParseCnpjOptions`) escolhe qual formato de CNPJ é normalizado: `1` (padrão) mantém apenas dígitos, `2` mantém letras e dígitos, de modo que um CNPJ alfanumérico sobrevive à ida e volta.

```javascript
import { parseCnpj } from '@brazilian-utils/brazilian-utils';

parseCnpj('24.522.200/0001-74'); // 24522200000174
parseCnpj('12.OUT.345/0001-99', { version: 2 }); // 12OUT345000199
```

## isValidCep

Valida se o CEP ([código de endereçamento postal](https://pt.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)) é válido. Aceita entrada como `string` ou `number`, mas um CEP que começa com `0` precisa ser passado como string, já que um número não preserva o zero à esquerda (`isValidCep(1310100)` é `false`, `isValidCep('01310100')` é `true`); espaços, pontos e hífens ao redor/entre os 8 dígitos são ignorados, mas qualquer outro caractere, uma letra em especial, invalida o valor.

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

## generateCnpj

Gera um CNPJ válido aleatório. Usa `Math.random()` internamente, então não é criptograficamente seguro. O primeiro argumento é a versão, como antes, ou um objeto `GenerateCnpjOptions` com a mesma `version` mais `branch`, o bloco do "número de ordem" (filial) nas posições 9 a 12: um inteiro de 1 a 9999 escrito com zeros à esquerda em quatro caracteres, aleatório por padrão. Um `branch` inválido é ignorado e um bloco aleatório é usado, e o bloco continua numérico na versão alfanumérica.

```javascript
import { generateCnpj } from '@brazilian-utils/brazilian-utils'

generateCnpj();
generateCnpj(2); // CNPJ alfanumérico, ex. 'Q0SLFMBD7VX439'
generateCnpj({ branch: 3 }); // bloco de ordem '0003', ex. '12345678000372'
generateCnpj({ version: 2, branch: 1 }); // CNPJ alfanumérico cujo bloco de ordem é '0001'
```

## isValidBoleto

Valida se o boleto ([meio de pagamento brasileiro](https://pt.wikipedia.org/wiki/Boleto_banc%C3%A1rio)) é válido. Suporta tanto o boleto de "cobrança bancária" de 47 dígitos quanto o "boleto de arrecadação" (convênio/tributos): seja a linha digitável de 48 dígitos, seja o código de barras de 44 dígitos, ambos iniciados com `8`. Uma tolerância é mantida desde a 2.3.0: o código de moeda na posição 4 do código de barras da cobrança bancária não é verificado, embora a Carta-Circular BCB nº 2.926/2000 o fixe em `9` (real), então um boleto com qualquer outro dígito de moeda continua válido.

```javascript
import { isValidBoleto } from '@brazilian-utils/brazilian-utils';

isValidBoleto('00190000090114971860168524522114675860000102656'); // true
isValidBoleto('846100000005246100291102005460339004695895061080'); // true (boleto de arrecadação)
```

## formatBoleto

Formata um número de boleto. `options.pad` (parte de `FormatBoletoOptions`) preenche o valor com zeros à esquerda até o número de posições do padrão antes de aplicar a máscara (padrão `false`). A máscara de arrecadação (convênio/tributos) só se aplica à linha digitável de 48 dígitos que começa com `8`; o código de barras de arrecadação de 44 dígitos não tem agrupamento de exibição definido pela FEBRABAN e mantém a máscara de "cobrança bancária".

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

Gera um boleto válido aleatório. Informe `{ type: "arrecadacao" }` (tipado como `GenerateBoletoOptions`) para gerar um boleto de arrecadação em vez do tipo padrão "bancario" (cobrança bancária). Um boleto de arrecadação sorteia o segmento entre 1 e 7 (o segmento 9 é de uso dos próprios bancos) e o identificador de valor entre os quatro valores possíveis, `6` e `8` para valor efetivo e `7` e `9` para quantidade de referência, de modo que os dois ramos de `hasEffectiveValue` do `getBoletoInfo` sejam alcançáveis.

```javascript
import { generateBoleto } from '@brazilian-utils/brazilian-utils';

generateBoleto(); // "00190000090114971860168524522114675860000102656"
generateBoleto({ type: 'arrecadacao' }); // "846100000005246100291102005460339004695895061080"
```

## getBoletoInfo

Extrai informações de um boleto (valor, data de vencimento, código do banco). Retorna `undefined` quando `value` não é um boleto válido — o `isValidBoleto` é verificado antes —, exatamente como na 2.3.0, então o resultado precisa ser estreitado antes de ser lido. Aceita opcionalmente `{ referenceDate }` (tipado como `GetBoletoInfoOptions`) para resolver o ciclo do "fator de vencimento" a partir de uma data específica em vez de agora (o ciclo de data-base do fator reiniciou em 22/02/2025, segundo a FEBRABAN). Nem a FEBRABAN nem o Banco Central publicam uma forma de distinguir um fator do ciclo antigo de um do ciclo novo, então todo fator resolve para uma de duas datas separadas por 9000 dias e o `referenceDate` escolhe entre elas por meio das janelas de segurança da própria biblioteca: o mesmo boleto pode passar a resolver para a outra candidata com o tempo, então informe `referenceDate` explicitamente sempre que a resposta precisar ser estável. A busca de ciclo nunca desce abaixo do primeiro ciclo, então um `referenceDate` anterior ao próprio esquema ainda resolve um fator para a data mais antiga que aquele fator consegue representar, em vez de uma anterior à data-base de 07/10/1997. Para um boleto de arrecadação, o resultado, tipado como `BoletoInfo`, continua trazendo as duas chaves, porém vazias, `bankCode: ''` e `expirationDate: null`, já que o boleto não tem código de banco nem fator de vencimento, e acrescenta `type: "arrecadacao"`, `segment`, `value` e `hasEffectiveValue`.

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

Valida se uma chave Pix é válida: um CPF, um CNPJ, um e-mail, um telefone celular brasileiro ou uma chave aleatória (EVP), conforme os formatos de chave do DICT. O manual registra um "número de telefone celular", então um telefone fixo não é uma chave Pix válida. `options.accept` (tipado como `IsValidPixKeyOptions`) restringe quais tipos de chave são aceitos; o padrão é aceitar todos, e `[]` rejeita todos. Exporta o tipo `PixKeyType`.

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

## parsePixKey

Identifica uma chave Pix e a normaliza para a forma canônica que o DICT espera dentro do BR Code: CPF com 11 dígitos, CNPJ com 14 caracteres, e-mail em minúsculas, telefone celular em E.164 (um telefone fixo não é chave Pix) ou UUID em minúsculas (EVP). Um valor de 11 dígitos válido tanto como CPF quanto como celular é lido como CPF, a menos que tenha sido escrito como telefone (prefixo `+55`/`0055` ou DDD entre parênteses). O CPF e o telefone são reconhecidos pela forma como são escritos, não apenas pelos dígitos que carregam, então texto ao redor não é descartado e `'abc123.456.789-09'` não é uma chave CPF. Retorna `null` quando o valor não é uma chave Pix válida. O resultado é tipado como `PixKey`.

```javascript
import { parsePixKey } from '@brazilian-utils/brazilian-utils';

parsePixKey('123.456.789-09'); // { type: 'cpf', value: '12345678909' }
parsePixKey('Fulano@Example.COM '); // { type: 'email', value: 'fulano@example.com' }
parsePixKey('(11) 98765-4321'); // { type: 'phone', value: '+5511987654321' }
parsePixKey('71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D');
// { type: 'evp', value: '71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d' }
parsePixKey('(11) 3000-0000'); // null (telefone fixo não é chave Pix)
parsePixKey('51998259765'); // { type: 'cpf', value: '51998259765' } (também é um telefone válido)
parsePixKey('+5551998259765'); // { type: 'phone', value: '+5551998259765' }
```

## isValidPixPayload

Valida se um payload de BR Code Pix (a string por trás de um QR Code Pix e do "Pix copia e cola") é válido: estrutura TLV bem formada, objetos obrigatórios presentes, um dos templates "Merchant Account Information" carregando o GUI `br.gov.bcb.pix` junto com uma chave ou uma URL, e um CRC-16 que confere. O objeto "Point of Initiation Method" (`01`) é informativo: o Manual do BR Code o marca como opcional e só atribui significado ao valor `"12"` ("só pode ser utilizado uma vez"), então ele pode estar ausente em qualquer um dos formatos e apenas um valor fora de `{"11", "12"}` torna o payload inválido. Quando um payload construído em torno de uma chave traz um valor (`54`), esse valor precisa ser maior que zero, a menos que o payload seja um BR Code de Pix Saque, ou seja, a menos que traga o ISPB do facilitador de serviço de saque no subobjeto 26-03 (`fss`) como prescreve o §2.6 do manual do Pix; rejeitar `"0"`/`"0.00"` sem o `fss` é uma restrição deliberada desta biblioteca, não uma regra do manual. Um `fss` escrito ao lado de uma localização de PSP torna o payload inválido: o §2.7 do Manual de Padrões para Iniciação do Pix mapeia o QR Code dinâmico para exatamente dois subobjetos, `00` (GUI) e `25` (URL), e o `fss` pertence ao template estático do §2.6. A chave em si não é validada contra os formatos do DICT, use `isValidPixKey` para isso. Os Unreserved Templates (IDs 80 a 99) são ignorados: o "QR Code composto" do Pix Automático (Pix recorrente) grava em um deles a localização de recorrência e, quando esse payload também traz uma localização de pagamento em 26-25, como no exemplo composto do manual do Pix, ele é aceito e lido como um payload dinâmico comum, com a localização de recorrência descartada. Só um payload sem nenhum template Pix nos IDs 26 a 51 é considerado inválido.

```javascript
import { isValidPixPayload } from '@brazilian-utils/brazilian-utils';

isValidPixPayload(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
); // true

isValidPixPayload('00020126580014br.gov.bcb.pix...'); // false (CRC quebrado)
```

## parsePixPayload

Interpreta um payload de BR Code Pix e retorna seus campos. O payload é validado pelo `isValidPixPayload` primeiro, então uma estrutura malformada, um CRC quebrado ou um objeto obrigatório ausente retornam `null` em vez de um resultado parcial. Um payload estático vem com `key`, um dinâmico com `url`. O resultado é tipado como `PixPayload`; `pointOfInitiation` está sempre presente e é tipado como `PixPointOfInitiation`, `"dynamic"` quando o payload traz uma localização de PSP ou quando o objeto "Point of Initiation Method" (`01`) é `"12"`, e `"static"` nos demais casos. As informações da conta do recebedor devem trazer exatamente um entre uma chave e uma `url` (verificada com a mesma regra de localização de PSP do `generatePixPayload`); o próprio `01` é informativo, então pode estar ausente em qualquer um dos formatos e apenas um valor fora de `{"11", "12"}` retorna `null`. Quando um payload construído em torno de uma chave traz um valor, esse valor precisa ser maior que zero, a menos que o payload seja um BR Code de Pix Saque: o §2.6 do manual do Pix coloca o ISPB do facilitador de serviço de saque no subobjeto 26-03 (`fss`), devolvido como `withdrawalFacilitator`, e `54` igual a `"0"` ou `"0.00"` é aceito junto dele. Rejeitar um valor zero sem o `fss` é uma restrição deliberada desta biblioteca, não uma regra do manual. Um `fss` escrito ao lado de uma localização de PSP retorna `null`: o §2.7 do Manual de Padrões para Iniciação do Pix mapeia o QR Code dinâmico para exatamente dois subobjetos, `00` (GUI) e `25` (URL), e o `fss` pertence ao template estático do §2.6. Quando o payload traz uma localização de PSP, o valor e o `txid` são ignorados, como o manual determina. Os Unreserved Templates (IDs 80 a 99) são ignorados: um "QR Code composto" do Pix Automático que também traga uma localização de pagamento em 26-25 é interpretado como um payload dinâmico comum e sua localização de recorrência é descartada, então quem precisa distinguir os dois não pode se apoiar neste parser. Só um payload sem nenhum template Pix nos IDs 26 a 51 retorna `null`.

```javascript
import { parsePixPayload } from '@brazilian-utils/brazilian-utils';

parsePixPayload(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
);
// {
//   key: '123e4567-e12b-12d1-a456-426655440000',
//   merchantName: 'Fulano de Tal',
//   merchantCity: 'BRASILIA',
//   pointOfInitiation: 'static'
// }
```

## generatePixPayload

Gera o payload de um BR Code Pix. Exatamente um entre `params.key` e `params.url` deve ser informado (parte de `GeneratePixPayloadParams`); `null` é retornado quando ambos ou nenhum são informados. `url` deve ser uma localização de PSP como o manual do Bacen define: um host com caminho, sem esquema (`pix.example.com/qr/v2/1234`); um payload dinâmico não pode carregar `amount` nem `txid`, que pertencem à localização do PSP. O valor é escrito com as duas casas decimais que o BR Code aceita, então tanto um que arredonda para `0.00` quanto um que não sobrevive a esse round-trip (`0.005`, `123.456`) são rejeitados, em vez de escritos como uma quantia diferente. O BR Code de Pix Saque, que anuncia o `fss` do subobjeto 26-03, é interpretado pelo `parsePixPayload`, mas não é gerado aqui.

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

Valida se uma chave de acesso de DF-e (Documento Fiscal eletrônico) é válida. Cobre todos os documentos cuja chave de acesso é a mesma string de 44 dígitos: NF-e (modelo 55), NFC-e (65), CT-e (57, o Conhecimento de Transporte Eletrônico instituído pela cláusula primeira do [Ajuste SINIEF 09/07](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2007/AJ_009_07)), MDF-e (58), CT-e OS (67, o Conhecimento de Transporte Eletrônico para Outros Serviços instituído pela cláusula primeira do [Ajuste SINIEF 36/19](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2019/AJ036_19)), GTV-e (64, o CT-e Guia de Transporte de Valores instituído pela cláusula primeira do [Ajuste SINIEF 03/20](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2020/ajuste-sinief-03-20)), BP-e (63), NF3e (66) e NFCom (62). O CF-e-SAT (59) fica de fora: sua "chave de consulta" de 44 posições é composta de outro jeito. Aceita espaços entre os grupos de dígitos (a máscara de exibição usual) e os prefixos `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` e `NFCom` encontrados no atributo `Id` do XML do documento.

O tipo de emissão (`tpEmis`) é conferido contra os códigos que o MOC daquele modelo atribui, então o conjunto aceito muda com o modelo: de 1 a 7 e 9 para NF-e e NFC-e, `{1, 3, 4, 5, 7, 8}` para o CT-e, `{1, 5, 7, 8}` para o CT-e OS, `{1, 2, 7, 8}` para a GTV-e, `{1, 2, 3}` para o MDF-e e `{1, 2}` para o BP-e, a NF3e e a NFCom. O código 8, a autorização pela SVC-SP, é atribuído somente pelo [MOC do CT-e 4.00](https://dfe-portal.svrs.rs.gov.br/CTE/Documentos), nunca pelo da NF-e; os domínios do [BP-e](https://dfe-portal.svrs.rs.gov.br/BPE/Documentos), da [NF3e](https://dfe-portal.svrs.rs.gov.br/NF3e/Documentos) e da [NFCom](https://dfe-portal.svrs.rs.gov.br/NFCOM/Documentos) vêm dos manuais deles. Para NF-e e NFC-e o código numérico também é conferido contra a regra B03-10 do MOC da NF-e, que proíbe os vinte valores repetidos e sequenciais de `cNF` que ela lista e um `cNF` igual ao número do documento. Já um número de documento todo zerado é recusado em todos os modelos seguindo o leiaute, não por escolha desta biblioteca: o `tiposBasico_v4.00.xsd` do [pacote de schemas da NF-e](https://dfe-portal.svrs.rs.gov.br/NFE/Documentos) tipa o `nNF` como `TNF`, cujo pattern é `[1-9]{1}[0-9]{0,8}`, e o Anexo I de cada um dos outros modelos repete o mesmo regex no seu próprio campo de número.

```javascript
import { isValidNfeKey } from '@brazilian-utils/brazilian-utils';

isValidNfeKey('35170458716523000119550010000000121000123458'); // true (NF-e, SP)
isValidNfeKey('NFe35170458716523000119550010000000121000123458'); // true (prefixo Id do XML)
isValidNfeKey('CTe35170458716523000119570010000000128000123452'); // true (CT-e autorizado pela SVC-SP)
isValidNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'); // true (com máscara)
isValidNfeKey('3517.0458.7165.2300.0119.5500.1000.0000.1210.0012.3458'); // true (qualquer um dos caracteres de máscara)
isValidNfeKey('351 70458716523000119550010000000121000123458'); // false (separador dentro de um grupo de 4)
isValidNfeKey('99170458716523000119550010000000121000123458'); // false (cUF inválido)
isValidNfeKey('35170458716523000119550010000000128000123455'); // false (o MOC da NF-e não atribui tpEmis 8)
isValidNfeKey('35170458716523000119550010000000121000000003'); // false (cNF 00000000, regra B03-10)
```

## formatNfeKey

Formata uma chave de acesso de DF-e (Documento Fiscal eletrônico) em grupos de 4 dígitos separados por espaço, a forma em que todo documento auxiliar a imprime: o DANFE da NF-e e da NFC-e, o DACTE do CT-e, do CT-e OS e da GTV-e, o DAMDFE do MDF-e, o DABPE do BP-e, o DANF3E da NF3e e o DANFE-COM da NFCom. Como todo formatador deste pacote, o valor é lido pelos seus dígitos e agrupado até onde eles vão, então uma chave com máscara ou parcial, ainda sendo digitada, é agrupada progressivamente, e qualquer coisa sem dígito (um objeto, `true`, um objeto criado com `Object.create(null)`) devolve `''` em vez de lançar. Use `isValidNfeKey` para verificar uma chave. O `options.pad` (parte de `FormatNfeKeyOptions`) preenche o valor com zeros à esquerda até os 44 dígitos de uma chave de acesso completa (padrão `false`). O parâmetro é tipado como string porque 44 dígitos são mais do que um número JavaScript comporta com exatidão; em tempo de execução um número é lido como a string dos seus dígitos, como em todo formatador deste pacote.

```javascript
import { formatNfeKey } from '@brazilian-utils/brazilian-utils';

formatNfeKey('35170458716523000119550010000000121000123458');
// '3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'

formatNfeKey('12345'); // '1234 5'

formatNfeKey('12345', { pad: true });
// '0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345'
```

## parseNfeKey

Interpreta uma chave de acesso de DF-e e retorna seus campos (stateCode, year, month, taxId, model, series, number, emissionType, code, checkDigit). Aceita as mesmas formas de entrada do `isValidNfeKey` e retorna `null` quando a chave não é válida. O resultado é tipado como `NfeKey`, cujo `model` é um `NfeKeyModel`. A NFCom (`'62'`) e a NF3e (`'66'`) gastam a posição 36 da chave com o `nSiteAutoriz`, o site do autorizador que recebeu o documento, então para esses dois modelos o resultado também traz `authorizationSite` e o `code` tem 7 dígitos em vez de 8.

```javascript
import { parseNfeKey } from '@brazilian-utils/brazilian-utils';

parseNfeKey('35170458716523000119550010000000121000123458');
// { stateCode: 'SP', year: 2017, month: 4, taxId: '58716523000119', model: '55',
//   series: 1, number: 12, emissionType: 1, code: '00012345', checkDigit: 8 }

parseNfeKey('35170458716523000119620010000000121000123450');
// { stateCode: 'SP', year: 2017, month: 4, taxId: '58716523000119', model: '62',
//   series: 1, number: 12, emissionType: 1, authorizationSite: 0, code: '0012345', checkDigit: 0 }

parseNfeKey('invalid'); // null
```

## isValidEmail

Valida se email é válido. O conjunto aceito é um subconjunto prático da definição de [endereço de e-mail válido](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address) do HTML da WHATWG, e não da [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). A parte local é limitada a letras, dígitos e `_'+-.`, e não pode começar com ponto, terminar com ponto ou apóstrofo, nem conter dois pontos seguidos. O domínio precisa ter pelo menos um ponto, e cada rótulo separado por ponto segue a produção `[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?` da WHATWG, então um rótulo não pode começar nem terminar com hífen nem passar de 63 caracteres; o rótulo final é alfabético e tem de 2 a 63 letras, então `user@example.c1` é rejeitado. Partes locais entre aspas (`"john doe"@example.com`) e literais de endereço (`john@[127.0.0.1]`) são rejeitadas.

```javascript
import { isValidEmail } from '@brazilian-utils/brazilian-utils';

isValidEmail('john.doe@hotmail.com'); // true
```

## isValidPhone

Valida se o número de telefone (celular ou fixo) é válido. Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é aceito e removido antes da validação, seguindo a regra documentada em `parsePhone`. `options.accept` (tipado como `PhoneType[]`, parte de `IsValidPhoneOptions`) define quais tipos de número são aceitos e tem como padrão `['mobile', 'landline']`; adicione `'service'` para também aceitar os números não geográficos reconhecidos por `isValidServicePhone`, ou informe `[]` para não aceitar nenhum. `options.version` (tipado como `PhoneVersion`, parte do mesmo tipo) é repassado ao `isValidMobilePhone` e escolhe qual regra de numeração celular é aplicada: `1` (padrão) o formato antigo, cujo primeiro dígito do número pode ser 6, 7, 8 ou 9, e `2` o atual, da Resolução Anatel 749/2022, art. 12, I, "a", que aceita 7, 8 ou 9 e rejeita o prefixo `700`. Vale apenas para celulares; números fixos e de serviço não são afetados.

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

## formatPhone

Formata número de telefone de acordo com padrões brasileiros. `options.mask` (tipado como `PhoneMask`) aceita `"sn"` (padrão, apenas o número assinante, 9 dígitos, sem DDD), `"nanp"` (DDD + número assinante, `"(00) 00000-0000"` para os 11 dígitos de um celular e `"(00) 0000-0000"` para os 10 dígitos de um fixo, mantendo o agrupamento de 11 dígitos em qualquer outro tamanho), `"e164"` (`"+5511987654321"`), `"international"` (`"+55 11 98765-4321"`, a forma como um número brasileiro é exibido para quem liga do exterior), `"service"` (`"0800 123 4567"` ou `"4004-1234"`, os agrupamentos convencionais para números de serviço) ou `"auto"`. O `"auto"` usa `"international"` quando `value` traz um código de país brasileiro (`+55`, `0055` ou um `55` seguido de 10 ou 11 dígitos), `"service"` quando `value` é um número de serviço e, nos demais casos, decide pela quantidade de dígitos: `"nanp"` quando `value` tem mais dígitos que um número assinante isolado, `"sn"` quando não tem. `"e164"` e `"international"` removem antes o código de país (regra documentada em `parsePhone`) e recaem para a apresentação `"service"` no caso de um número de serviço, já que esses não têm forma E.164. Se `value` incluir o DDD, informe `{ mask: 'auto' }` (ou `'nanp'`) explicitamente, já que a máscara padrão `"sn"` assume que não há DDD e trunca silenciosamente um DDD presente. Uma `mask` fora da união recai para o padrão `"sn"` em vez de lançar erro.

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

Valida se o número de telefone celular é válido. `options.version` (tipado como `PhoneVersion`) controla qual regra de numeração celular é aplicada: `1` (padrão) é o formato anterior à Resolução Anatel 749/2022, mantido por compatibilidade com a 2.3.0, cujo primeiro dígito do número (após o DDD) pode ser 6, 7, 8 ou 9; `2` aplica o art. 12, I, "a" da resolução, que coloca 7, 8 e 9 no Serviço Móvel Pessoal (SMP), então um 6 inicial é Reserva Técnica e é rejeitado. A versão `2` também exclui o prefixo `700`, que o art. 12, II reserva ao Serviço Móvel Global por Satélite e não ao SMP, então `isValidMobilePhone('11700123456', { version: 2 })` é `false`; a versão `1` não o exclui e o aceita.

```javascript
import { isValidMobilePhone } from '@brazilian-utils/brazilian-utils';

isValidMobilePhone('11900000000'); // true
isValidMobilePhone('11712345678', { version: 1 }); // true (formato antigo)
isValidMobilePhone('11712345678', { version: 2 }); // true (7 também é SMP)
isValidMobilePhone('11612345678', { version: 2 }); // false (6 é Reserva Técnica)
isValidMobilePhone('11700123456', { version: 2 }); // false (a série 700 é de satélite)
```

## isValidLandlinePhone

Valida se o número de telefone fixo é válido.

```javascript
import { isValidLandlinePhone } from '@brazilian-utils/brazilian-utils';

isValidLandlinePhone('1130000000'); // true
```

## isValidServicePhone

Valida se um número de telefone é um número de serviço brasileiro válido, discado sem DDD: os Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` e `0900` (11 dígitos no total, então a forma curta e extinta de `0800` + 6 dígitos é rejeitada), os números abreviados `300X`/`400X` (8 dígitos), e os códigos de 3 dígitos dos Códigos de Acesso a Serviços de Utilidade Pública designados pela Anatel (ex.: `190`, `192`), cuja tabela consolidada é o Anexo do [Ato Anatel nº 43.151/2004](https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2004/1648-ato-43151). O `112` e o `911` são rejeitados: a Anatel não designa nenhum dos dois, e o `911` sequer está dentro da faixa `1N₂N₁` que o art. 13 da [Resolução nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749) destina aos serviços de utilidade pública, então o encaminhamento deles nos aparelhos é uma convenção GSM, não uma designação de numeração. Apenas a estrutura é verificada: o número não precisa estar atribuído a ninguém, e a regra do `0500` que codifica o valor da doação nos dois últimos dígitos não é aplicada. A Anatel retirou os códigos de 4 dígitos em vez de alocá-los (o art. 43 I da [Resolução nº 86/1998](https://informacoes.anatel.gov.br/legislacao/resolucoes/1998/336-resolucao-86) e o art. 2º II do Ato acima mandaram liberá-los), então apenas as raízes convencionais `300X` e `400X` são reconhecidas: outros prefixos de "Número Único" usados no mercado, como `4020` e `4062`, estão fora de escopo e são rejeitados.

```javascript
import { isValidServicePhone } from '@brazilian-utils/brazilian-utils';

isValidServicePhone('0800 123 4567'); // true
isValidServicePhone('4004-1234'); // true
isValidServicePhone('190'); // true
isValidServicePhone('11987654321'); // false (número geográfico)
```

## getAreaCodeInfo

Retorna o estado (e a região) a que um DDD brasileiro pertence, dentre os 67 DDDs em uso no Plano Geral de Numeração da Anatel. Aceita string ou número inteiro não negativo, removendo caracteres não numéricos antes de comparar. Exporta o tipo `AreaCodeInfo`.

`stateCode` é sempre um único estado: a sede do DDD, o estado da cidade em torno da qual o código foi alocado, que não é necessariamente o estado que concentra a maioria dos seus municípios. Quatro DDDs cruzam a divisa de um estado, e para esses o `stateCodes` lista também os demais. O DDD 61 é o mais amplo deles: atende o Distrito Federal e os doze municípios goianos do Entorno do Distrito Federal (Águas Lindas de Goiás, Cabeceiras, Cidade Ocidental, Cristalina, Formosa, Luziânia, Novo Gama, Padre Bernardo, Planaltina, Santo Antônio do Descoberto, Valparaíso de Goiás e Vila Boa), então seu `stateCode` é `'DF'` mesmo o Distrito Federal tendo apenas um dos seus treze municípios, Brasília. Os outros três são o 42, compartilhado entre o Paraná e Porto União (SC), o 47, entre Santa Catarina e Rio Negro (PR), e o 49, entre Santa Catarina e Barracão (PR), e neles a sede realmente concentra todos os municípios menos o citado.

```javascript
import { getAreaCodeInfo } from '@brazilian-utils/brazilian-utils';

getAreaCodeInfo('11');
// { areaCode: 11, stateCode: 'SP', stateName: 'São Paulo', region: 'Sudeste', stateCodes: ['SP'] }

getAreaCodeInfo(21);
// { areaCode: 21, stateCode: 'RJ', stateName: 'Rio de Janeiro', region: 'Sudeste', stateCodes: ['RJ'] }

getAreaCodeInfo('61');
// { areaCode: 61, stateCode: 'DF', stateName: 'Distrito Federal', region: 'Centro-Oeste', stateCodes: ['DF', 'GO'] }

getAreaCodeInfo('00'); // null
getAreaCodeInfo(-11); // null
getAreaCodeInfo(1.1); // null
```

## getAreaCodesByState

Retorna todos os DDDs (códigos de área) que atendem um determinado estado brasileiro, dentro do Plano Geral de Numeração da Anatel. A comparação não diferencia maiúsculas de minúsculas e o resultado vem ordenado de forma crescente.

Um DDD que cruza a divisa de um estado aparece em todos os estados que atende, então o DDD 61 volta tanto para `'DF'` quanto para `'GO'`: ele atende o Distrito Federal e os doze municípios goianos do Entorno do Distrito Federal. Os outros três são o 42, compartilhado entre o Paraná e Porto União (SC), o 47, entre Santa Catarina e Rio Negro (PR), e o 49, entre Santa Catarina e Barracão (PR).

```javascript
import { getAreaCodesByState } from '@brazilian-utils/brazilian-utils';

getAreaCodesByState('SP'); // [11, 12, 13, 14, 15, 16, 17, 18, 19]
getAreaCodesByState('ac'); // [68]
getAreaCodesByState('DF'); // [61]
getAreaCodesByState('GO'); // [61, 62, 64]
getAreaCodesByState('SC'); // [42, 47, 48, 49]
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

Valida se o RENAVAM (Registro Nacional de Veículos Automotores) é válido. Suporta tanto o formato antigo (9 dígitos) quanto o novo formato (11 dígitos). Espaços, pontos e hífens ao redor/entre os dígitos são ignorados, mas qualquer outro caractere, uma letra em especial, invalida o valor. Um registro com todos os dígitos iguais também é rejeitado.

```javascript
import { isValidRenavam } from '@brazilian-utils/brazilian-utils';

isValidRenavam('639884962'); // true (9 dígitos, formato antigo)
isValidRenavam('00639884962'); // true (11 dígitos, formato novo)
isValidRenavam('0063988.4962'); // true (pontos e hífens são ignorados)
isValidRenavam('12345678901'); // false (checksum inválido)
isValidRenavam('00000000000'); // false (dígitos repetidos)
isValidRenavam('ab00639884962'); // false (letras são rejeitadas)
```

## generateRenavam

Gera um RENAVAM válido aleatório: o formato de 11 dígitos, dez dígitos de base mais o dígito verificador. Uma base com todos os dígitos iguais é sorteada de novo, já que `isValidRenavam` rejeita essas. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generateRenavam } from '@brazilian-utils/brazilian-utils';

generateRenavam(); // '12345678900'
```

## isValidPis

Valida se o PIS é válido. Aceita os caracteres de máscara usuais (`.`, `-`, `/`, `(`, `)`, `,`, `*`) e espaços em branco.

```javascript
import { isValidPis } from '@brazilian-utils/brazilian-utils';

isValidPis('12056412547'); // false
```

## formatPis

Formata número de PIS. `options.pad` (parte de `FormatPisOptions`) completa o valor com zeros à esquerda até os 11 dígitos antes de aplicar a máscara (padrão `false`).

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

Formata o CEP ([código de endereçamento postal](https://pt.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)). `options.pad` (parte de `FormatCepOptions`) completa o valor com zeros à esquerda até os 8 dígitos antes de aplicar a máscara (padrão `false`); um CEP que começa com `0` passado como número perde esse zero, então passe-o como string ou use `pad`.

```javascript
import { formatCep } from '@brazilian-utils/brazilian-utils';

formatCep('92500000'); // 92500-000
formatCep('9250000', { pad: true }); // 09250-000
```

## parseCep

Remove a formatação do CEP, mantém apenas os dígitos e limita o resultado a 8 dígitos.

```javascript
import { parseCep } from '@brazilian-utils/brazilian-utils';

parseCep('92500-000'); // 92500000
```

## getAddressInfoByCep

Busca informações de endereço para um CEP usando múltiplos provedores. O padrão é `['viacep', 'brasilapi']`. O provedor `'widenet'` está descontinuado (seu endpoint não responde mais) e foi excluído da lista padrão, mas ainda pode ser solicitado explicitamente via `options.providers` (tipado como `CepProvider[]`). O endereço retornado é tipado como `AddressInfo`. Uma falha transitória de rede é repetida duas vezes por provedor, com backoff linear de 250 ms (250 ms e depois 500 ms), então um provedor que continua falhando é tentado até 3 vezes e acrescenta cerca de 750 ms antes de a sua própria falha se concretizar; um status de erro HTTP ou uma falha não recuperável não é repetida. Os provedores são disparados juntos e disputados com `Promise.any`, não consultados um após o outro, então essas tentativas não atrasam nada para os demais provedores, apenas o momento em que uma rejeição por falha de todos pode aparecer. Um `options.providers` que não nomeia nenhum provedor conhecido rejeita com `GetAddressInfoByCepValidationError` ("Nenhum provedor válido especificado"): um array vazio, um array de nomes desconhecidos e um valor que não é um array, incluindo `null`. Com `providers: ['brasilapi']`, um CEP que a BrasilAPI não conhece rejeita com `GetAddressInfoByCepNotFoundError`, já que a BrasilAPI sinaliza a ausência com HTTP 404; qualquer outro status de erro continua sendo um `GetAddressInfoByCepServiceError`. Os três estendem `GetAddressInfoByCepError`, a classe base de todos os erros com que este utilitário rejeita, então um único `catch` nela cobre todos.

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

## isValidProcessoJuridico

Valida o número do processo jurídico de acordo com definição do [CNJ](https://atos.cnj.jus.br/atos/detalhar/119). Os separadores da máscara do CNJ (espaços, `.` e `-`) são aceitos entre os campos `NNNNNNN-DD.AAAA.J.TR.OOOO`, mas qualquer outro caractere, uma letra em especial, invalida o valor.

```javascript
import { isValidProcessoJuridico } from '@brazilian-utils/brazilian-utils';

isValidProcessoJuridico('00020802520125150049'); // true
isValidProcessoJuridico('0002080-25.2012.5.15.0049'); // true (máscara do CNJ)
isValidProcessoJuridico('ab00020802520125150049'); // false (letras são rejeitadas)
```

## formatProcessoJuridico

Formata um número no formato definido pelo [CNJ](https://atos.cnj.jus.br/atos/detalhar/119) (máscara `NNNNNNN-DD.AAAA.J.TR.OOOO`). `options.pad` (parte de `FormatProcessoJuridicoOptions`) completa o valor com zeros à esquerda até os 20 dígitos antes de aplicar a máscara (padrão `false`).

```javascript
import { formatProcessoJuridico } from '@brazilian-utils/brazilian-utils';

formatProcessoJuridico('00020802520125150049'); // 0002080-25.2012.5.15.0049
formatProcessoJuridico('20802520125150049', { pad: true }); // 0002080-25.2012.5.15.0049
```

## parseProcessoJuridico

Remove a formatação do processo jurídico, mantém apenas os dígitos e limita o resultado a 20 dígitos. Tanto a máscara atual do CNJ (`NNNNNNN-DD.AAAA.J.TR.OOOO`) quanto a máscara antiga são aceitas, já que apenas os dígitos são mantidos.

```javascript
import { parseProcessoJuridico } from '@brazilian-utils/brazilian-utils';

parseProcessoJuridico('0002080-25.2012.5.15.0049'); // 00020802520125150049
```

## isValidIe

Valida se a inscrição estadual de um estado é válida. A UF é case-insensitive. Regras notáveis por estado: GO aceita os prefixos `10`, `11` e `15`; PA aceita `15` e `75`-`79`; MS aceita `28` e `50`; SP tem o padrão de produtor rural `P0MMMSSSSD000`; TO usa códigos de tipo de 11 dígitos (`01`, `02`, `03`, `99`). O TO também aceita uma forma de 9 dígitos, aplicando a mesma regra módulo 11 sobre os oito primeiros dígitos; a página do SINTEGRA documenta apenas a de 11 dígitos, então essa forma é comportamento da 2.3.0 mantido por compatibilidade, e não regra publicada. Uma inscrição só de zeros é aceita em todo estado cuja fórmula publicada produz dígito verificador 0 para ela (AM, BA com 8 ou 9 dígitos, CE, ES, MG, MT, PB, PE, PI, PR, RJ, RS, SC, SE, SP e TO com 9 dígitos), diferente de `isValidCpf` e `isValidCnpj`, que rejeitam dígitos repetidos. O AM entra nessa lista apenas pelo segundo ramo da fórmula publicada: o primeiro ramo da página, `Se Soma < 11 Então Dígito = 11 - Soma`, dá 11 para a inscrição só de zeros, enquanto o ramo `resto <= 1 ⇒ 0`, o implementado aqui, dá 0.

```javascript
import { isValidIe } from '@brazilian-utils/brazilian-utils';

isValidIe('AC', '0187634580933'); // false
isValidIe('go', '109161793'); // true (case-insensitive)
```

## isValidBankAccount

Verifica se uma conta bancária brasileira é válida. O `bankCode` precisa estar na lista de participantes do STR publicada pelo Banco Central do Brasil (o mesmo dataset usado por `getBankByCode`), então um código não atribuído como `'999'` é sempre inválido. A partir daí o banco é validado de uma de três formas: pelo algoritmo de dígito verificador publicado, apenas pela estrutura (o banco existe e a agência/conta respeitam a quantidade de dígitos documentada, para bancos que não publicam regra de dígito) ou pela verificação genérica mod10/mod11, que continua sendo o fallback para os demais bancos da lista.

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

Bancos validados apenas pela estrutura, por não publicarem regra de dígito verificador. A agência (1-5 dígitos), a conta (1-13 dígitos) e um único `digit` numérico já tornam a conta válida:

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
//   ... mais 460 itens
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

Busca um banco brasileiro pelo seu ISPB (Identificador do Sistema de Pagamentos Brasileiro), o código de 8 dígitos publicado pelo Banco Central do Brasil na [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv). Todo participante do SPB tem um ISPB, mas este conjunto de dados só traz as instituições que também têm código COMPE, então um ISPB cuja instituição não tem código COMPE próprio retorna `null`. Aceita tanto `string` quanto `number`, com ou sem zeros à esquerda, então `getBankByIspb(0)` encontra o mesmo banco que `getBankByIspb('00000000')`. O conjunto de dados é gerado a partir desse CSV, recorrendo à [BrasilAPI](https://brasilapi.com.br/api/banks/v1) quando a requisição ao Bacen falha. Retorna uma nova cópia (tipada como `Bank`) do banco correspondente, ou `null` quando nenhum banco tem esse ISPB.

```javascript
import { getBankByIspb } from '@brazilian-utils/brazilian-utils';

getBankByIspb('00000000'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByIspb('60701190'); // { code: '341', ispb: '60701190', name: 'ITAÚ UNIBANCO S.A.' }
getBankByIspb('99999999'); // null
```

## isValidIban

Valida se um IBAN (International Bank Account Number) brasileiro é válido, conforme as [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf) do Bacen (Circular BCB nº 3.625/2013): `BR` + 2 dígitos verificadores ISO 7064 MOD 97-10 + 8 dígitos de ISPB + 5 dígitos de agência + 10 dígitos de conta + 1 letra de tipo de conta (qualquer letra, normalmente `C` para conta corrente ou `P` para conta poupança) + 1 indicador de titularidade (`1` para o primeiro ou único titular até `9` para o nono, depois `A` a `Z` a partir do décimo, então `0` é rejeitado), totalizando 29 caracteres. Somente IBANs brasileiros (código de país `BR`) são reconhecidos; qualquer outro país retorna `false`, já que este pacote não conhece o layout de campos dos outros mais de 90 países da ISO 13616. Não diferencia maiúsculas de minúsculas e aceita as duas formas em que um IBAN é escrito: compacta (`'BR1500000000000010932840814P2'`) ou no formato impresso da ISO 13616, letras e dígitos em grupos de 4 (o último menor), em ambos os casos com espaços em branco opcionais no início e no fim. Os grupos podem ser separados por espaço em branco, `.`, `-` ou `/`, os caracteres de máscara intercambiáveis que `isValidCpf` e `isValidCnpj` aceitam. Apenas um separador fora do limite de um grupo, uma sequência de separadores (a ISO 13616 imprime um único) ou um caractere fora de letras e dígitos faz do valor algo que não é um IBAN, então ele é rejeitado em vez de removido.

```javascript
import { isValidIban } from '@brazilian-utils/brazilian-utils';

isValidIban('BR1500000000000010932840814P2'); // true
isValidIban('BR15 0000 0000 0000 1093 2840 814P 2'); // true (espaços de agrupamento)
isValidIban('BR15-0000-0000-0000-1093-2840-814P-2'); // true (qualquer um dos caracteres de máscara)
isValidIban('BR1500000000000010932840814P3'); // false (dígitos verificadores inválidos)
isValidIban('BR15 000 00000 0000 1093 2840 814P 2'); // false (separador dentro de um grupo)
isValidIban('DE89370400440532013000'); // false (IBAN não brasileiro)
```

## formatIban

Formata um IBAN no agrupamento impresso da ISO 13616, blocos de 4 caracteres, a apresentação usada em extratos e formulários bancários. Não valida os dígitos verificadores nem o layout dos campos; formata o que for passado, até o limite de 29 caracteres de um IBAN brasileiro, até onde for possível, então a função também pode ser usada como máscara de digitação, e um IBAN de outro país é agrupado do mesmo jeito até esse limite. Use `isValidIban` para verificar a validade. O valor pode ser compacto (`'BR1500000000000010932840814P2'`), já estar no formato impresso da ISO 13616 ou ser um valor parcial ainda sendo digitado (`'BR15'`); como todo formatador deste pacote, ele é lido pelas suas letras e dígitos e agrupado até onde eles vão, qualquer outro caractere (hífen, ponto, espaço a mais) é descartado e as letras viram maiúsculas. Só um valor que não seja string resulta em uma string vazia.

```javascript
import { formatIban } from '@brazilian-utils/brazilian-utils';

formatIban('BR1500000000000010932840814P2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('br1500000000000010932840814p2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('BR15'); // 'BR15'
formatIban('BR15 0000-0000.0000/1093 2840 814P-2'); // 'BR15 0000 0000 0000 1093 2840 814P 2' (só letras e dígitos são lidos)
```

## parseIban

Interpreta um IBAN brasileiro em seus campos: 2 (código do país, sempre `BR`) + 2 (dígitos verificadores ISO 7064 MOD 97-10) + 8 (ISPB) + 5 (agência) + 10 (conta) + 1 (tipo de conta, qualquer letra, normalmente `C` para conta corrente ou `P` para conta poupança) + 1 (indicador do titular, `1` a `9` e depois `A` a `Z`). Aceita as mesmas formas de entrada que `isValidIban`, compacta ou no formato impresso da ISO 13616 (grupos de 4 separados por um único espaço em branco, `.`, `-` ou `/`), em ambos os casos com espaços em branco opcionais no início e no fim e sem diferenciar maiúsculas de minúsculas, e retorna `null` sempre que `isValidIban` retornaria `false`, inclusive quando o valor carrega um separador fora do limite de um grupo, uma sequência de separadores ou qualquer caractere além de letras e dígitos. O resultado é tipado como `Iban`, cujo `accountType` é uma `string`.

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
parseIban('BR15 000 00000 0000 1093 2840 814P 2'); // null (separador dentro de um grupo)
```

## isValidCreditCard

Valida se um número de cartão de pagamento é válido usando o algoritmo de Luhn ([ISO/IEC 7812-1](https://www.iso.org/standard/70484.html)). Aceita os caracteres de máscara usuais (espaço em branco, `.`, `-` e `/`, o conjunto intercambiável que `isValidCpf` e `isValidCnpj` aceitam) entre dois dígitos quaisquer e espaços ao redor do valor; qualquer outro caractere invalida o valor. Eles são aceitos entre dois dígitos quaisquer, e não em posições fixas, porque o agrupamento impresso de um PAN muda com a bandeira (4-4-4-4 para Visa e Mastercard, 4-6-5 para American Express, 4-6-4 para Diners Club), então não há um único leiaute ao qual prendê-los. Não faz detecção de bandeira (Visa, Mastercard, Amex...), consulta de faixa de emissor nem validação de validade/CVV, verifica apenas a quantidade de dígitos (12 a 19) e o dígito verificador de Luhn. Um `number` só é aceito quando é um inteiro seguro não negativo: qualquer valor acima de `Number.MAX_SAFE_INTEGER` (2^53 - 1, 16 dígitos) já chega arredondado para outro número, então passe cartões mais longos como string. Um valor cujos dígitos são todos iguais (`'0000000000000000'`) é rejeitado mesmo passando no cálculo de Luhn, do jeito que todo outro validador deste pacote rejeita um documento de dígitos repetidos (`isValidCpf('00000000000')`, `isValidCns`, `isValidCaepf`, `isValidCei`).

```javascript
import { isValidCreditCard } from '@brazilian-utils/brazilian-utils';

isValidCreditCard('4111111111111111'); // true (número de teste Visa)
isValidCreditCard('5555555555554444'); // true (número de teste Mastercard)
isValidCreditCard('378282246310005'); // true (número de teste American Express)
isValidCreditCard('4111 1111 1111 1111'); // true (máscara com espaços)
isValidCreditCard('4111.1111/1111-1111'); // true (qualquer um dos caracteres de máscara)
isValidCreditCard('4111111111111112'); // false (dígito verificador inválido)
isValidCreditCard('0000000000000000'); // false (todos os dígitos iguais, ainda que o Luhn feche)
isValidCreditCard('4111a1111b1111c1111'); // false (letras entre os dígitos)
isValidCreditCard(4111111111111111111); // false (acima de 2^53 - 1, passe como string)
```

## capitalize

Transforma a primeira letra de cada palavra em maiúscula do jeito que se escreve um nome, uma razão social ou um endereço brasileiro, sem precisar de opções. As palavras são separadas por espaço em branco, por `-` e por `/`, então `'MOGI-GUAÇU'` vira `'Mogi-Guaçu'`. Toda sequência de espaços em branco (tabs, quebras de linha, espaços repetidos) vira um único espaço, e o espaço no início e no fim é descartado.

`options.lowerCaseWords` tem como padrão as preposições, artigos e conjunções que permanecem em minúsculas dentro de um nome próprio (`de`, `da`, `do`, `e`, ...), exceto quando uma delas é a primeira palavra. `options.upperCaseWords` tem como padrão as designações societárias e as abreviações de documentos escritas em maiúsculas no uso brasileiro (`LTDA`, `S.A.`, `S/A`, `S.S.`, `S/S`, `ME`, `EPP`, `MEI`, `EIRELI`, `CIA`, `SCP`, `CNPJ`, `CPF`, `RG`, `CEP`, `UF`) mais os algarismos romanos que aparecem em nomes e endereços (de `II` a `XXIII`, exceto `VI`, que colide com a forma verbal "vi"). `SA` sem pontuação ficou de fora de propósito, por ser indistinguível do sobrenome "Sá" digitado sem o acento, enquanto `ME` casa também com o pronome "me" (`'diga-me'` vira `'Diga-ME'`), então informe o seu próprio `upperCaseWords` quando a entrada for texto livre em vez de um nome. `S/A` e `S/S` são reconhecidos mesmo com a barra no meio, embora a barra separe palavras. Uma palavra de duas letras logo depois de uma `/` vira maiúscula quando é a sigla de um estado brasileiro (`'porto alegre/rs'` vira `'Porto Alegre/RS'`); essa regra é estrutural e continua valendo mesmo com `upperCaseWords` informado, enquanto uma sigla de estado que não venha depois de uma `/` é deixada como está.

Qualquer uma das listas informada em `options` substitui inteiramente a lista padrão correspondente, e a comparação com as duas é case-insensitive (locale pt-BR). As opções são tipadas como `CapitalizeOptions`.

```javascript
import { capitalize } from '@brazilian-utils/brazilian-utils';

capitalize('jose da silva'); // Jose da Silva
capitalize('JOSÉ DA SILVA'); // José da Silva
capitalize('empresa ltda'); // Empresa LTDA
capitalize('banco do brasil s.a.'); // Banco do Brasil S.A.
capitalize('casa de carnes s/a'); // Casa de Carnes S/A ("S/A" é reconhecido com a barra no meio)
capitalize('mogi-guaçu'); // Mogi-Guaçu ("-" inicia uma nova palavra)
capitalize('santana/rs'); // Santana/RS ("RS" é sigla de estado logo depois de uma "/")
capitalize('porto alegre/rs'); // Porto Alegre/RS
capitalize('santana rs'); // Santana Rs (sem "/", "rs" é só uma palavra)
capitalize('rua xv de novembro'); // Rua XV de Novembro (algarismo romano, "de" fica em minúsculas)
capitalize('joão paulo ii'); // João Paulo II
capitalize('de'); // De (uma preposição mantém a maiúscula quando é a primeira palavra)
capitalize('empresa ltda', { upperCaseWords: [] }); // Empresa Ltda (a lista informada substitui a padrão)
capitalize('josé Ama MARIA', { lowerCaseWords: ['ama'] }); // José ama Maria
capitalize('doc inválido', { upperCaseWords: ['DOC'] }); // DOC Inválido (comparação case-insensitive)
capitalize('  josé   maria  '); // José Maria (toda sequência de espaço em branco, tabs e quebras de linha inclusive, vira um único espaço)
```

## formatCurrency

Formata um número inteiro ou float para uma string no padrão BRL. Um `number` é formatado como está (sinal e decimais preservados). Uma entrada em `string` é lida pela mesma regra do `parseCurrency`, com a diferença de que um valor escrito sem nenhum separador permanece em unidades inteiras: o último `,` ou `.` seguido de 1 ou 2 dígitos (ou de até `precision` dígitos, quando esse valor for maior) é o separador decimal, todo outro `,` ou `.` é separador de milhar, e um `-` escrito antes do primeiro dígito é preservado. Assim `'1.234,56'` vira `1.234,56`, `'-10.5'` vira `-10,50` e `'1234'` vira `1.234,00`. `precision` é limitado ao intervalo `0..20` (o limite do pacote, o que o Node 20 ainda impõe ao `Intl.NumberFormat`), o padrão é 2 e volta a 2 quando não é um número finito. Um valor que não seja um número finito (`NaN`, `Infinity`, `-Infinity`) vira string vazia, e um valor que não pode ser convertido em número (um symbol, um objeto simples, um objeto sem protótipo) também; `null`, arrays e booleanos passam por `Number()` como no 2.3.0. `options.symbol` prefixa o resultado com o símbolo monetário `R$` (padrão `false`). As opções são tipadas como `FormatCurrencyOptions`.

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

Transforma uma string para o formato de inteiro ou float. O último `,` ou `.` seguido de 1 ou 2 dígitos (ou de até `precision` dígitos, quando esse valor for maior) é o separador decimal; todo outro `,` ou `.` é separador de milhar. Assim `'R$ 1.234,56'` vira `1234.56`, `'R$ 1.234'` vira `1234`, `'1,5'` vira `1.5` e `'12.34'` vira `12.34`. Um valor escrito sem nenhum separador mantém a convenção de centavos e é dividido por `10 ** precision`, então `'1234'` vira `12.34`. Um `-` escrito antes do primeiro dígito é preservado, então `'-R$ 1,00'` vira `-1`. `precision` (padrão 2, limitado a `0..20`, e voltando a 2 quando não é um número finito) controla quantos dígitos são tratados como subunidades monetárias. As opções são tipadas como `ParseCurrencyOptions`.

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

Formata um número inteiro por extenso em português do Brasil, ex.: `1235` vira `"mil duzentos e trinta e cinco"`. Só são suportados inteiros de `-999999999999999` a `999999999999999` (999 trilhões em valor absoluto); fora desse intervalo, `NaN` ou um valor não finito retornam `""`. Um `value` não inteiro é truncado em direção a zero antes da conversão. `options.gender` (parte de `ConvertNumberToWordsOptions`) concorda "um/dois" e a centena ("duzentos/duzentas" etc.) com o substantivo que o número qualifica, com padrão `"masculine"`. Um valor inválido de `gender` é ignorado e o padrão é usado. O resultado sai sempre em minúsculas; aplique qualquer outra caixa por conta própria.

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

## convertCurrencyToWords

Formata um valor monetário em Reais por extenso, no estilo usado para escrever o valor à mão em cheques e contratos, ex.: `1523.45` vira `"mil quinhentos e vinte e três reais e quarenta e cinco centavos"`. O `value` é truncado (não arredondado) para 2 casas decimais. O substantivo no singular é usado para exatamente 1 ("um real", "um centavo") e "de" é inserido antes de "reais" quando o valor é um milhão, bilhão ou trilhão de reais redondo. Um valor que trunca para nada vira `"zero reais"`, sem o prefixo "menos"; qualquer outro valor negativo recebe o prefixo "menos", e uma entrada inválida retorna `""`. Acima de `Number.MAX_SAFE_INTEGER / 100` reais (cerca de 90 trilhões) um double não consegue carregar centavos, então o valor é lido como um número inteiro de reais. Não recebe opções: o resultado sai sempre em minúsculas; aplique qualquer outra caixa por conta própria.

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

## getStates

Retorna todos os estados brasileiros, cada um com sigla, nome, código da região, nome da região e código IBGE de 2 dígitos da Unidade da Federação (`cUF`). A lista é ordenada por nome com `localeCompare` no locale "pt-BR", então nomes acentuados caem onde um leitor brasileiro espera: Pará, Paraíba, Paraná e Rio de Janeiro, Rio Grande do Norte, Rio Grande do Sul. Cada chamada retorna um array novo com objetos novos, então alterar o resultado nunca afeta chamadas seguintes. Exporta os tipos `State`, `StateCode` e `StateName`. `State` é uma união discriminada com um membro por estado, então os campos de um estado ficam amarrados entre si: estreitar um `State` pelo `code` também estreita `name`, `regionCode`, `regionName` e `ibgeCode` (`Extract<State, { code: 'SP' }>['name']` é `'São Paulo'`), e uma combinação impossível como `{ code: 'SP', name: 'Acre' }` não é um `State`.

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

Retorna o estado brasileiro cujo código IBGE de 2 dígitos ("cUF", Código da Unidade da Federação) corresponde ao valor informado. É o mesmo código de UF de 2 dígitos presente no primeiro campo de toda chave de acesso de DF-e de qualquer um dos modelos que o `isValidNfeKey` cobre: NF-e (55), NFC-e (65), CT-e (57), MDF-e (58), CT-e OS (67), GTV-e (64), BP-e (63), NF3e (66) e NFCom (62). Aceita string ou número inteiro não negativo, removendo caracteres não numéricos antes de comparar. Exporta o tipo `State`.

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

## getStateCodeByName

Retorna a sigla de um estado brasileiro a partir do nome completo. A comparação ignora acentos, maiúsculas/minúsculas e espaços nas pontas, então `'sao paulo'`, `'SÃO PAULO'` e `'  São Paulo  '` resolvem para `'SP'`. Toda sequência de espaços internos também vira um único espaço, então `'Rio  de  Janeiro'` resolve para `'RJ'`, enquanto um nome escrito sem o espaço não corresponde a nada (`'saopaulo'` não é `'São Paulo'`). Exporta o tipo `StateCode`.

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

Retorna as cidades brasileiras. Retorna todas as cidades se nenhum estado for fornecido, ou cidades de um estado específico. Cada chamada retorna um array novo, então alterar o resultado nunca afeta chamadas seguintes. Um código de estado desconhecido (ou um valor que não seja `StateCode`) retorna um array vazio em vez de lançar erro, exceto quando é um valor falsy: `getCities(null)` e `getCities('')` são lidos como "nenhum estado informado" e retornam todas as cidades, enquanto o mais estrito `getMunicipalities` retorna `[]` para eles. O código do estado é comparado exatamente, inclusive na caixa: `getCities('sp')` retorna `[]` enquanto `getCities('SP')` retorna as 645 cidades paulistas. `getCities` e `getMunicipalities` são as únicas buscas por estado sensíveis à caixa; `getStateNameByCode`, `getTimezoneByState`, `getAreaCodesByState` e `getMunicipality` ignoram a caixa.

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

`getCities` embute os nomes dos 5571 municípios do IBGE (~154,0 KB minificado, ~49,7 KB com gzip) e é uma das poucas exceções pesadas neste pacote, que é tree-shakeable no restante. Veja [Tamanho do bundle](getting-started.md#tamanho-do-bundle) para saber como carregá-lo sob demanda via `@brazilian-utils/brazilian-utils/get-cities` em vez do import da raiz.

## getHolidays

Retorna feriados brasileiros para um determinado ano. Retorna feriados nacionais e opcionalmente feriados estaduais. Cada feriado (tipado como `Holiday`) tem um campo `type` (`HolidayType`: `"national"`, `"state"`, `"optional"` ou `"religious"`). O "Dia da Consciência Negra" (20 de novembro) é feriado nacional a partir de 2024 (Lei nº 14.759/2023). Antes disso, vários estados ainda trazem um feriado estadual próprio na mesma data: `"Consciência Negra"` em MT e RJ, `"Dia Estadual da Consciência Negra"` no AP e `"Dia da Consciência Negra"` no AM e em SP. Os resultados são memoizados por `year`/`stateCode`, mas cada chamada ainda retorna uma cópia nova. Um `stateCode` desconhecido/inválido é ignorado, retornando apenas os feriados nacionais; a busca lê apenas propriedades próprias, então `"__proto__"`, `"constructor"` e afins são códigos desconhecidos como qualquer outro, e não uma exceção. Só os anos de 1900 a 2099 são suportados, o intervalo que os utilitários de dias úteis herdam; um ano fora dele retorna `[]`.

Apenas um feriado estadual por UF é feriado civil pela [Lei nº 9.093/1995](https://www.planalto.gov.br/ccivil_03/leis/l9093.htm), art. 1º, II, que autoriza "a data magna do Estado fixada em lei estadual", no singular; as demais entradas se apoiam em leis estaduais ordinárias e são reportadas por serem observadas na prática. Regras notáveis por estado:

- **SC** — a [Lei SC nº 18.531/2022](http://leis.alesc.sc.gov.br/html/2022/18531_2022_lei.html) transfere os dois feriados estaduais, "Dia do Estado de Santa Catarina" (11/08) e "Dia de Santa Catarina de Alexandria" (25/11), para o domingo subsequente sempre que caem de segunda a sexta, então a segunda-feira 11/08/2025 é dia útil em SC e o feriado cai no domingo 17/08. As duas datas não passaram a ser transferidas juntas. O 11/08 é transferido a partir de 2005, ano em que a [Lei SC nº 13.408/2005](http://leis.alesc.sc.gov.br/html/2005/13408_2005_lei.html) estendeu a cláusula a ele (publicada e em vigor em 15/07/2005), e antes disso fica em 11/08. O 25/11 é transferido a partir de 1999, ano em que a [Lei SC nº 11.213/1999](http://leis.alesc.sc.gov.br/html/1999/11213_1999_lei.html) introduziu a cláusula (publicada e em vigor em 12/11/1999, treze dias antes do 25/11 daquele ano), com um intervalo de um ano: o art. 3º da [Lei SC nº 12.906/2004](http://leis.alesc.sc.gov.br/html/2004/12906_2004_lei.html) revogou aquela lei sem repetir a cláusula, então só o 25/11/2004 fica na data estatutária, até a Lei SC nº 13.408/2005 reinstituir a transferência. Assim, o 25/11/1999 (uma quinta-feira) cai no domingo 28/11, o 25/11/2002 (uma segunda-feira) no domingo 01/12, o 25/11/2004 (uma quinta-feira) não se move, e o 25/11/2005 (uma sexta-feira) cai no domingo 27/11.
- **DF** — a [Lei distrital nº 72/1989](https://www.sinj.df.gov.br/sinj/Norma/18459/Lei_72_27_12_1989.html), art. 1º parágrafo único, declara Corpus Christi feriado. Com `stateCode: 'DF'` a única entrada de Corpus Christi volta tipada como `"state"` em vez de `"optional"`; ela é substituída, não duplicada.
- **GO** — a [Lei GO nº 20.756/2020](https://legisla.casacivil.go.gov.br/pesquisa_legislacao/100979/lei-20756), art. 269, II, lista três feriados estaduais: 26/07 (Fundação da Cidade de Goiás), 24/10 (Lançamento da Pedra Fundamental de Goiânia) e 28/10 (Dia do Servidor Público).
- **AL** — 16/09 é feriado estadual a partir de 2024 ([Lei AL nº 9.358/2024](https://sapl.al.al.leg.br/norma/3117)) e apenas ponto facultativo (`"optional"`) antes disso.
- **PB** — 26/07 ("Morte de João Pessoa") é emitido apenas até 2015: a [Lei PB nº 10.601/2015](https://sapl.al.pb.leg.br/norma/11988), art. 2º, revogou a sua base.
- **TO** — 18/03 ("Autonomia do Estado do Tocantins") é emitido apenas até 2008: a [Lei TO nº 2.013/2009](https://www.al.to.leg.br/arquivo/15724) transformou em meramente comemorativo o dispositivo que declarava o feriado.

A data retornada é a legal. O deslocamento de SC acima é o único modelado; o de Acre (feriados de terça a quinta transferidos para a sexta) e os decretos goianos que podem mover 26/07 e 28/10 não são.

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

Verifica se um número de passaporte brasileiro é válido (2 letras seguidas de 6 dígitos). Aceita tanto `string` quanto `number`; a entrada é case-insensitive e caracteres não alfanuméricos (espaços, pontos, hífens) são ignorados. Um `number` é aceito por simetria com `formatPassport`/`parsePassport`, mas nunca é válido: a forma decimal de um número nunca começa com as duas letras que um número de passaporte exige.

```javascript
import { isValidPassport } from '@brazilian-utils/brazilian-utils';

isValidPassport('AB123456'); // true
isValidPassport('ab123456'); // true (case-insensitive)
isValidPassport('AB-123.456'); // true (símbolos são ignorados)
isValidPassport('12345678'); // false
```

## formatPassport

Formata um número de passaporte brasileiro (maiúsculas, sem símbolos, limitado a 8 caracteres). Uma entrada que não seja `string` retorna uma string vazia.

```javascript
import { formatPassport } from '@brazilian-utils/brazilian-utils';

formatPassport('ab123456'); // 'AB123456'
formatPassport('AB-123.456'); // 'AB123456'
```

## generatePassport

Gera um número de passaporte brasileiro válido aleatoriamente. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generatePassport } from '@brazilian-utils/brazilian-utils';

generatePassport(); // 'RY393097'
```

## parsePassport

Remove todos os caracteres não alfanuméricos de um número de passaporte, converte para maiúsculas e limita o resultado a 8 caracteres. Uma entrada que não seja `string` retorna uma string vazia.

```javascript
import { parsePassport } from '@brazilian-utils/brazilian-utils';

parsePassport('AB-123.456'); // 'AB123456'
parsePassport(' AB 123 456 '); // 'AB123456'
```

## generateCep

Gera um CEP aleatório. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generateCep } from '@brazilian-utils/brazilian-utils';

generateCep(); // '92500000'
```

## formatCnh

Formata a CNH. `options.pad` (parte de `FormatCnhOptions`) completa o valor com zeros à esquerda até os 11 dígitos antes de aplicar a máscara (padrão `false`).

```javascript
import { formatCnh } from '@brazilian-utils/brazilian-utils';

formatCnh('02650306461'); // 026503064-61
formatCnh('2650306461', { pad: true }); // 026503064-61
```

## isValidCnh

Valida se a CNH é válida. Espaços, pontos e hífens ao redor/entre os dígitos são ignorados, mas qualquer outro caractere, uma letra em especial, invalida o valor. Um valor cujos 11 dígitos são todos iguais é rejeitado antes do cálculo dos dígitos verificadores, então `'11111111111'` é inválido.

```javascript
import { isValidCnh } from '@brazilian-utils/brazilian-utils';

isValidCnh('00000000119'); // true
isValidCnh('000000001-19'); // true (hífen antes dos dígitos verificadores)
isValidCnh('ab00000000119'); // false (letras são rejeitadas)
```

## generateCnh

Gera uma CNH válida aleatória. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generateCnh } from '@brazilian-utils/brazilian-utils';

generateCnh(); // '02650306461'
```

## parseCnh

Remove a formatação da CNH, mantém apenas os dígitos e limita o resultado a 11 dígitos. Retorna `''` quando não há nenhum dígito.

```javascript
import { parseCnh } from '@brazilian-utils/brazilian-utils';

parseCnh('026503064-61'); // '02650306461'
```

## getCepInfoByAddress

Busca CEPs a partir de um endereço usando a ViaCEP. Lança `GetCepInfoByAddressValidationError` quando a UF, a cidade ou a rua estão ausentes/inválidas — inclusive quando o argumento não é um objeto (omitido, `null`, uma string) e quando `federalUnit` não é uma string, casos em que nenhum `TypeError` cru escapa — `GetCepInfoByAddressNotFoundError` quando nenhum endereço corresponde à busca, e `GetCepInfoByAddressError` quando a própria ViaCEP responde com um status de erro HTTP. Uma requisição que não pode ser realizada (falha de transporte) rejeita com o erro original do `fetch`. Cada item é tipado como `CepAddressInfo` e traz a resposta da ViaCEP sem alterações, com os nomes de campo da própria ViaCEP: `cep`, `logradouro`, `complemento`, `unidade`, `bairro`, `localidade`, `uf`, `estado`, `regiao`, `ibge`, `gia`, `ddd` e `siafi`. Um nome de rua abrangente corresponde a muitos CEPs, então busque de forma tão específica quanto o endereço permitir.

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

## generateProcessoJuridico

Gera um número de processo jurídico válido de acordo com a definição do [CNJ](https://atos.cnj.jus.br/atos/detalhar/119). `year` deve estar entre o ano atual e 9999, `court` entre 1 e 9; valores fora do intervalo retornam `null`. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generateProcessoJuridico } from '@brazilian-utils/brazilian-utils';

generateProcessoJuridico(); // '89478643020269670326'
generateProcessoJuridico({ year: 2026, court: 5 }); // string | null
generateProcessoJuridico({ year: 10000 }); // null (ano fora do intervalo)
```

## formatLegalNature

Formata um código de natureza jurídica. `options.pad` (parte de `FormatLegalNatureOptions`) funciona exatamente como em `formatCpf`/`formatCep`: com o padrão `false` a máscara é aplicada progressivamente, até onde o valor vai; com `true` o valor é primeiro completado com zeros à esquerda até os 4 dígitos de um código completo. Use `isValidLegalNature` para verificar um código.

```javascript
import { formatLegalNature } from '@brazilian-utils/brazilian-utils';

formatLegalNature('2062'); // 206-2
formatLegalNature(2062); // 206-2
formatLegalNature('206'); // 206 (máscara aplicada até onde o valor vai)
formatLegalNature('62', { pad: true }); // 006-2 (completado até 4 dígitos antes)
```

## isValidLegalNature

Valida se um código de natureza jurídica existe na lista oficial. A tabela segue a "Natureza Jurídica 2021" do IBGE/CONCLA: 92 códigos oficiais mais 8 códigos legados mantidos por compatibilidade. Somente os caracteres de máscara usuais (hífens, pontos, espaços) são tolerados ao redor dos 4 dígitos, então `'2062a'` é rejeitado em vez de ser lido como `'2062'`.

```javascript
import { isValidLegalNature } from '@brazilian-utils/brazilian-utils';

isValidLegalNature('2062'); // true
isValidLegalNature('9999'); // false
```

## generateLegalNature

Gera um código de natureza jurídica válido aleatório. Usa `Math.random()` internamente, então não é criptograficamente seguro.

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

## getLegalNaturesByCategory

Retorna todas as naturezas jurídicas de uma categoria do CONCLA, o grupo dado pelo primeiro dígito do código: `1` Administração Pública, `2` Entidades Empresariais, `3` Entidades sem Fins Lucrativos, `4` Pessoas Físicas e `5` Organizações Internacionais e Outras Instituições Extraterritoriais. A categoria é aceita como string ou como número, as entradas voltam ordenadas por código e uma categoria desconhecida devolve `[]`.

```javascript
import { getLegalNaturesByCategory } from '@brazilian-utils/brazilian-utils';

getLegalNaturesByCategory('4')[0];
// {
//   code: '4014',
//   description: 'Empresa Individual Imobiliária',
//   category: { code: '4', description: 'Pessoas Físicas' },
// }
getLegalNaturesByCategory(4).length; // 6
getLegalNaturesByCategory('2').length; // 33
getLegalNaturesByCategory('9'); // []
```

## getLegalNature

Busca um código de natureza jurídica na tabela oficial do IBGE/CONCLA. A entrada também traz a categoria do CONCLA em que o código está listado, dada pelo seu primeiro dígito.

```javascript
import { getLegalNature } from '@brazilian-utils/brazilian-utils';

getLegalNature('2062');
// {
//   code: '2062',
//   description: 'Sociedade Empresária Limitada',
//   category: { code: '2', description: 'Entidades Empresariais' },
// }
getLegalNature('206-2')?.code; // '2062'
getLegalNature(206.2)?.category.description; // 'Entidades Empresariais'
getLegalNature('0000'); // null
```

## generatePhone

Gera um telefone brasileiro aleatório. Aceita `'mobile'`, `'landline'` ou `'service'` (tipado como `GeneratePhoneType`); um número de serviço não tem DDD. Se omitido, gera aleatoriamente um celular ou um fixo, nunca um número de serviço. Um celular gerado sempre começa com 9, então passa nas duas regras de numeração do `isValidMobilePhone`.

```javascript
import { generatePhone } from '@brazilian-utils/brazilian-utils';

generatePhone(); // '11912345678' ou '1131234567'
generatePhone('mobile'); // '11912345678'
generatePhone('landline'); // '1131234567'
generatePhone('service'); // '08001234567' ou '40041234'
```

## formatLicensePlate

Formata uma placa. Placas antigas brasileiras (`LLLNNNN`) são retornadas com hífen e placas Mercosul (`LLLNLNN`) permanecem normalizadas. Valores parciais são formatados até onde os caracteres informados alcançarem, então também pode ser usada como máscara de digitação, e um valor que não pode iniciar uma placa válida retorna `''`.

```javascript
import { formatLicensePlate } from '@brazilian-utils/brazilian-utils';

formatLicensePlate('abc1234'); // 'ABC-1234'
formatLicensePlate('abc1d23'); // 'ABC1D23'
```

## generateLicensePlate

Gera uma placa aleatória no formato escolhido. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generateLicensePlate } from '@brazilian-utils/brazilian-utils';

generateLicensePlate(); // 'ABC1D23' (Mercosul, o padrão)
generateLicensePlate('LLLNNNN'); // 'ABC1234'
```

Uma string `format` fora dos dois literais suportados não é rejeitada: ela é usada literalmente, caractere a caractere, com `L` produzindo uma letra e qualquer outra posição um dígito. Assim, `generateLicensePlate('LLLNNLN')` devolve uma placa na sequência de motocicleta que foi retirada, que o próprio `isValidLicensePlate` rejeita; `generateLicensePlate('bogus')` devolve cinco dígitos; e `generateLicensePlate('')` devolve uma string vazia. Apenas um valor que não seja string recai no padrão Mercosul. Esse é o comportamento da versão 2.3.0, mantido para as pessoas que chamam a função em JavaScript, onde o tipo do TypeScript não alcança.

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

Gera um PIS válido aleatório. Usa `Math.random()` internamente, então não é criptograficamente seguro.

```javascript
import { generatePis } from '@brazilian-utils/brazilian-utils';

generatePis(); // '91077906857'
```

## getMunicipality

Busca informações de município por código IBGE, ou obtém o código IBGE a partir do nome do município e UF. Uma única função cobre as duas direções, dependendo se `options` tem `code` ou `municipalityName`/`uf`. `code` aceita tanto `string` quanto `number` e deve ter exatamente 7 dígitos, caso contrário a função resolve para `null`. Um `code` informado como número precisa ser um inteiro não negativo: sinal e ponto decimal não são dígitos, então `-3550308` e `355030.8` resolvem para `null` em vez de serem lidos como `3550308`. A resolução é totalmente offline, a partir de um dataset do IBGE embutido na biblioteca: nenhuma requisição de rede é feita. A comparação do nome do município ignora acentos e diferenças entre maiúsculas/minúsculas, e toda sequência de espaços vira um único espaço, então `'sao  paulo'` corresponde a `'São Paulo'`, enquanto um nome escrito sem o espaço não; a caixa é convertida para maiúsculas, a direção em que o Unicode expande `'ß'` para `'SS'`, então `'Paßos'` corresponde a `'Passos'`. Um município desconhecido, uma UF desconhecida ou uma entrada inválida resolvem para `null`. O par `[name, uf]` é um array novo a cada chamada, então alterar o resultado nunca afeta as buscas seguintes.

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

Em TypeScript o tipo de retorno acompanha a direção da busca: uma consulta `{ code }` resolve para `[string, string] | null`, uma consulta `{ municipalityName, uf }` resolve para `string | null`, e uma consulta cuja direção só é conhecida em tempo de execução (uma variável tipada como `GetMunicipalityOptions`) resolve para a união das duas.

```typescript
import {
  getMunicipality,
  type GetMunicipalityByCodeOptions,
  type GetMunicipalityByNameOptions,
  type GetMunicipalityOptions,
} from '@brazilian-utils/brazilian-utils';

const byCode: GetMunicipalityByCodeOptions = { code: '3550308' };
const byName: GetMunicipalityByNameOptions = { municipalityName: 'sao paulo', uf: 'sp' };

await getMunicipality(byCode);
// Promise<[string, string] | null>

await getMunicipality(byName);
// Promise<string | null>

const lookUp = (options: GetMunicipalityOptions) => getMunicipality(options);
// (options: GetMunicipalityOptions) => Promise<[string, string] | string | null>
```

## getMunicipalities

Retorna os municípios brasileiros publicados pelo IBGE. Retorna todos os municípios se nenhum estado for fornecido, ou os municípios de um estado específico. Cada município é retornado como `{ code, name, stateCode }`, onde `code` é o código IBGE de 7 dígitos do município. Os resultados são ordenados por nome com `localeCompare` no locale "pt-BR". Cada chamada retorna um array novo com objetos novos, então alterar o resultado nunca afeta chamadas seguintes. Um código de estado desconhecido retorna um array vazio em vez de lançar erro. Só um `stateCode` omitido (ou `undefined`) pede a lista completa: `getMunicipalities(null)` e `getMunicipalities('')` retornam `[]`, enquanto os mais permissivos `getCities(null)` e `getCities('')` retornam todas as cidades. O código do estado é comparado exatamente, inclusive na caixa: `getMunicipalities('sp')` retorna `[]` enquanto `getMunicipalities('SP')` retorna os 645 municípios paulistas. `getMunicipalities` e `getCities` são as únicas buscas por estado sensíveis à caixa; `getStateNameByCode`, `getTimezoneByState`, `getAreaCodesByState` e `getMunicipality` ignoram a caixa.

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

Busca um município brasileiro pelo código IBGE de 7 dígitos. Aceita o código como string ou número, removendo qualquer caractere não numérico antes de comparar; um código informado como número precisa ser um inteiro não negativo, então `-3550308` e `355030.8` retornam `null` em vez de serem lidos como `3550308`. Retorna `{ code, name, stateCode }`, um objeto novo, ou `null` quando o código não tem 7 dígitos ou não corresponde a nenhum município conhecido.

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

Verifica se uma data específica é feriado brasileiro. A verificação compara a data local do `targetDate` (ano/mês/dia lidos localmente), não seu instante UTC subjacente. Retorna `false` quando `targetDate` está ausente ou não é um `Date` válido. Um `stateCode` inválido é tratado de duas formas diferentes: uma string que não é um código de estado conhecido é ignorada e só os feriados nacionais são considerados, igual ao `getHolidays`, enquanto um `stateCode` presente que não é uma string (um número, `null`, um objeto) é rejeitado e faz a chamada retornar `false` mesmo em um feriado nacional.

```javascript
import { isHoliday } from '@brazilian-utils/brazilian-utils';

isHoliday({ targetDate: new Date(2024, 0, 1) }); // true
isHoliday({ targetDate: new Date(2024, 6, 9), stateCode: 'SP' }); // true
isHoliday(); // false
```

## isBusinessDay

Verifica se uma data é um dia útil no Brasil. Retorna `false` para sábados, domingos e feriados brasileiros retornados por `getHolidays` para a data local de `value` (ano/mês/dia lidos localmente), a mesma convenção usada por `isHoliday`. `options.includeOptional` (parte de `BusinessDayOptions`, o tipo de opções que todos os utilitários de dias úteis compartilham) tem valor padrão `true`, então feriados do tipo opcional (`Holiday.type === "optional"`, ou seja, Carnaval e Corpus Christi) também contam como dias não úteis; passe `false` para considerar apenas os feriados estatutários. `options.stateCode` também considera os feriados daquele estado; uma string que não é um código de estado conhecido é ignorada, considerando apenas os feriados nacionais, enquanto um `stateCode` presente que não é uma string (um número, `null`, um objeto) é rejeitado e faz a chamada retornar `false` mesmo em um dia de semana comum — a mesma distinção que `isHoliday` faz, e o valor que `addBusinessDays`, `subBusinessDays` e `differenceInBusinessDays` rejeitam com `null`. Um `value` que não é um `Date` válido retorna `false`. Só os anos de 1900 a 2099 são suportados, o intervalo que `getHolidays` calcula; uma data fora dele retorna `false`.

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

Adiciona um número de dias úteis brasileiros a uma data, pulando sábados, domingos e feriados brasileiros exatamente como `isBusinessDay` os define (as mesmas `BusinessDayOptions`: `options.includeOptional`, padrão `true`, e `options.stateCode` funcionam exatamente como lá). A assinatura é a do date-fns: `addBusinessDays(date, amount, options?)`. Retorna um novo `Date`; a `date` de entrada nunca é alterada, e seu horário é preservado no resultado. Um `amount` igual a `0` retorna um novo `Date` igual a `date`, sem alterações, mesmo quando `date` cai em um fim de semana ou feriado, isso reflete o comportamento verificado de [`addBusinessDays(date, 0)` do date-fns](https://date-fns.org/docs/addBusinessDays), que também não avança a entrada para o próximo dia útil. Um `amount` negativo anda para trás, um dia útil por vez, também como no date-fns. Retorna `null` em caso de entrada inválida: uma `date` que não é um `Date` válido, um `amount` que não é um número inteiro finito, ou um `stateCode` que não é uma string; um `options` que não é um objeto é ignorado, exatamente como o `isBusinessDay` o ignora. Só os anos de 1900 a 2099 são suportados, o intervalo que `getHolidays` calcula; uma data fora dele, ou um percurso que sai dele, retorna `null`.

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

## subBusinessDays

Subtrai um número de dias úteis brasileiros de uma data: `subBusinessDays(date, amount, options?)` é `addBusinessDays(date, -amount, options)`, e é exatamente assim que a função é implementada, então tudo o que vale acima vale aqui (o horário preservado, a entrada intacta, um `amount` igual a `0` devolvendo a data sem alterações, o intervalo de 1900 a 2099 e os casos de `null`), inclusive o `options.stateCode` e o `options.includeOptional`. Um `amount` negativo anda para frente.

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

## differenceInBusinessDays

Conta o número de dias úteis brasileiros entre duas datas, refletindo a semântica de [`differenceInBusinessDays` do date-fns](https://date-fns.org/docs/differenceInBusinessDays) (verificada em seu código-fonte), inclusive a ordem dos argumentos: `differenceInBusinessDays(laterDate, earlierDate, options?)`. O percurso começa em `earlierDate` e para logo antes de `laterDate`, então `earlierDate` é contado quando ele próprio é um dia útil, `laterDate` nunca é contado, e cada dia útil estritamente entre os dois é contado uma vez. Só a data de calendário de cada `Date` importa, o horário é ignorado. Os dias úteis são determinados exatamente como em `isBusinessDay` (as mesmas `BusinessDayOptions`), inclusive o `options.includeOptional` (padrão `true`) e o `options.stateCode`. O resultado é positivo quando `laterDate` é posterior a `earlierDate` e negativo quando é anterior; duas datas no mesmo dia de calendário retornam `0`. Retorna `null` em caso de entrada inválida: uma data que não é um `Date` válido, ou um `stateCode` que não é uma string; um `options` que não é um objeto é ignorado. Só os anos de 1900 a 2099 são suportados, o intervalo que `getHolidays` calcula; uma data fora dele retorna `null`.

```javascript
import { differenceInBusinessDays } from '@brazilian-utils/brazilian-utils';

differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 1)); // 0 (01/01 é Ano novo, não contado)
differenceInBusinessDays(new Date(2024, 0, 3), new Date(2024, 0, 2)); // 1 (02/01 contado, uma terça-feira; 03/01 não)
differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 3)); // -1 (a data posterior vem primeiro, então a contagem é negativa)
differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 2)); // 0 (mesmo dia)
differenceInBusinessDays(new Date(2024, 6, 10), new Date(2024, 6, 8), { stateCode: 'SP' }); // 1 (09/07/2024 é feriado estadual em SP)
differenceInBusinessDays(new Date(), new Date('not a date')); // null
```

## convertDateToWords

Formata uma data por extenso em português do Brasil, ex.: `"01/01/2024"` vira `"primeiro de janeiro de dois mil e vinte e quatro"`. Aceita um `Date` (lido pela sua data de calendário local, a mesma convenção usada por `isHoliday`) ou uma string no formato `"dd/mm/yyyy"` ou ISO `"yyyy-mm-dd"`. Com o `options.style` padrão `"full"`, o dia 1 é escrito como "primeiro" e os demais dias usam o número cardinal; com `"month"`, só o nome do mês é escrito por extenso e o dia/ano ficam em dígitos (o dia 1 como `"1º"`, ex.: `"2 de março de 2024"`, `"1º de janeiro de 2024"`). Os nomes dos meses ficam em minúsculo. No estilo `"full"` o ano é escrito por extenso sem a vírgula de milhar que `convertNumberToWords`/`convertCurrencyToWords` usam (`1999` vira `"mil novecentos e noventa e nove"`, não `"mil novecentos e noventa e nove"`), do jeito que uma data é lida em voz alta. `options.weekday` (padrão `false`) prefixa o nome do dia da semana em pt-BR minúsculo seguido de vírgula (`"sábado, dois de março de dois mil e vinte e quatro"`), calculado a partir da data de calendário resolvida. Um valor inválido de `style` é ignorado e o padrão é usado. O resultado sai sempre em minúsculas; aplique qualquer outra caixa por conta própria. O dia 29 de fevereiro é aceito nos anos bissextos do calendário gregoriano proléptico (divisíveis por 4, exceto séculos não divisíveis por 400). Retorna `""` para um `Date` inválido, uma string malformada, um dia/mês que não existe ou uma data anterior ao ano 1.

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

## formatVoterId

Formata um título de eleitor. Usa por padrão o agrupamento de 12 dígitos `0000 0000 00 00`; o agrupamento de 13 dígitos `0000 0000 0 00 00` só é usado quando o valor sanitizado tem mais de 12 dígitos **e** o código de unidade federativa (o 10º e o 11º dígitos) é `01` (São Paulo) ou `02` (Minas Gerais), os dois estados cujos títulos podem ter um número sequencial de 9 dígitos.

```javascript
import { formatVoterId } from '@brazilian-utils/brazilian-utils';

formatVoterId('123456780175'); // '1234 5678 01 75'
formatVoterId('1234567880191'); // '1234 5678 8 01 91' (título de 13 dígitos SP/MG)
```

## isValidVoterId

Valida se um título de eleitor é válido. Aceita tanto o título padrão de 12 dígitos quanto o título de 13 dígitos emitido por São Paulo (UF `01`) e Minas Gerais (UF `02`). Espaços e pontos são aceitos ao redor e entre os grupos `0000 0000 00 00`, mas qualquer outro caractere, uma letra em especial, invalida o valor.

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

Verifica se um número de CNS (Cartão Nacional de Saúde) é válido, o identificador único do usuário do SUS (Sistema Único de Saúde). Cartões definitivos (iniciados em 1 ou 2) são validados sobre uma base embutida de 11 dígitos derivada do PIS/PASEP/NIS, ponderada de 15 até 5; quando o dígito bruto resulta em 10, o DATASUS soma 2 à soma ponderada, recalcula o dígito e marca o cartão com o sufixo `001` em vez de `000`. Cartões provisórios (iniciados em 7, 8 ou 9) são validados por uma soma ponderada única (pesos de 15 a 1) que deve ser múltipla de 11. O valor precisa vir escrito como os 15 dígitos, opcionalmente separados nos grupos impressos de 3-4-4-4 por espaço em branco, `.`, `-` ou `/`, os caracteres de máscara intercambiáveis que `isValidCpf` e `isValidCnpj` aceitam, inclusive uma sequência deles entre dois grupos; letras no meio dos dígitos, ou um separador dentro de um grupo, são rejeitadas em vez de ignoradas.

As duas rotinas vêm da [página de validação de CNS da ANVISA](https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/), que fica atrás de um filtro de bots e responde HTTP 403 a clientes que não sejam navegadores. A [página do e-SUS APS](https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html) documenta o mesmo algoritmo e é acessível sem navegador, mas aplica a rotina de provisórios a números iniciados em 5, 7, 8 ou 9; esta implementação segue a ANVISA e rejeita um número iniciado em 5 mesmo quando a soma ponderada fecha.

```javascript
import { isValidCns } from '@brazilian-utils/brazilian-utils';

isValidCns('123456789010000'); // true (definitivo)
isValidCns('700000000000005'); // true (provisório)
isValidCns('123.4567-8901/0000'); // true (qualquer um dos caracteres de máscara)
isValidCns('12345678901'); // false (tamanho inválido)
isValidCns('abc123456789010000'); // false (não escrito como um CNS)
```

## formatCns

Formata um número de CNS (Cartão Nacional de Saúde) nos grupos de exibição usuais de 3-4-4-4 dígitos separados por espaço. `options.pad` (parte de `FormatCnsOptions`) preenche o valor com zeros à esquerda até as 15 posições do padrão antes de aplicar a máscara (padrão `false`).

```javascript
import { formatCns } from '@brazilian-utils/brazilian-utils';

formatCns('123456789010000'); // '123 4567 8901 0000'
formatCns(123456789010000); // '123 4567 8901 0000'
formatCns('89010001', { pad: true }); // '000 0000 8901 0001'
```

## isValidCertidao

Verifica se a matrícula de uma certidão de registro civil (nascimento, casamento, óbito e os demais atos mantidos por uma serventia de registro civil das pessoas naturais) é válida. A matrícula tem 32 dígitos distribuídos em 6 (CNS da serventia) + 2 (acervo) + 2 (serviço) + 4 (ano) + 1 (tipo do livro) + 5 (livro) + 3 (folha) + 7 (termo) + 2 (dígitos verificadores), e os dois dígitos verificadores usam módulo 11 com os pesos ciclando de 2 a 10 e voltando por 0: o primeiro cálculo começa em 2 sobre os 30 dígitos da base, o segundo em 1 sobre os 31 dígitos que incluem o primeiro dígito verificador, e nos dois um resto 10 é lido como 1. Aceita os caracteres de máscara usuais e espaços entre e ao redor dos grupos. O layout é o publicado atualmente no [art. 473 do Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243) (Provimento CNJ nº 149/2023), com o inciso II e os §§ 1º e 3º a 5º na redação do Provimento CN nº 237/2026 e o restante do artigo, inclusive o § 2º, na do Provimento CN nº 182/2024; a própria matrícula foi instituída pelo já revogado [Provimento CNJ nº 2/2009](https://atos.cnj.jus.br/atos/detalhar/1311) e ganhou sua estrutura de dígitos no também revogado [Provimento CNJ nº 3/2009, art. 7º](https://atos.cnj.jus.br/atos/detalhar/1310). Os dígitos verificadores estão detalhados em [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e implementado pelo [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts) e pelo [validator-docs](https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php).

Os dígitos do serviço são fixos em `55`, o código que o [art. 473, III](https://atos.cnj.jus.br/atos/detalhar/5243) atribui ao registro civil das pessoas naturais, então uma matrícula com qualquer outro par na nona e décima posições é rejeitada por mais que os dígitos verificadores confiram. O dígito do tipo de livro sempre precisa nomear um dos nove tipos de livro (o mesmo `CertidaoType` retornado por `parseCertidao`), então uma matrícula cujo dígito é `0` é rejeitada por mais que os dígitos verificadores confiram, do mesmo jeito que `parseCertidao` devolve `null` para ela. `options.accept` (parte de `IsValidCertidaoOptions`) restringe ainda mais aos tipos listados; o padrão é aceitar todos os tipos, e um valor que não seja um array volta para esse padrão. Só uma string é aceita: os 32 dígitos de uma matrícula são mais do que um número JavaScript comporta.

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

## parseCertidao

Extrai os campos da matrícula de uma certidão de registro civil, retornando `null` quando a matrícula é inválida, o que inclui um código de livro que não é um dos nove livros. O [art. 473, V do Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243) lista os códigos de 1 a 7; nenhum texto primário do CNJ acessível hoje publica os outros dois, inclusive o Anexo IV do revogado Provimento CNJ nº 63/2017, que lista os mesmos sete. Os códigos 8 (emancipação) e 9 (interdição) vêm das referências em que a regra do dígito verificador se apoia: o [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e o [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts) publicam a lista dos nove livros. Eles são mantidos porque matrículas com eles circulam. Só uma string é aceita: os 32 dígitos de uma matrícula são mais do que um número JavaScript comporta.

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
| `acervo` | Acervo a que o livro pertence: `"01"` acervo próprio, `"02"` em diante um por acervo incorporado. O [art. 473, §§ 3º a 5º](https://atos.cnj.jus.br/atos/detalhar/5243) separa os incorporados pela data em que a serventia de origem foi extinta ou desativada: até 31/12/2009 a matrícula leva o CNS da unidade incorporadora e um código de acervo a partir de `"02"`, um por incorporação; a partir de 1º/01/2010 leva o CNS da própria unidade incorporada e o código `"01"`, considerado acervo próprio dessa unidade; e um acervo fracionado entre duas ou mais serventias sucessoras leva o CNS próprio de cada sucessora com o código `"02"`. |
| `service` | Serviço prestado pela serventia, sempre `"55"`, o registro civil das pessoas naturais. |
| `year` | Ano do registro, com 4 dígitos. |
| `type` | Livro a que o ato pertence: `"birth"`, `"marriage"`, `"religious-marriage"`, `"death"`, `"stillbirth"`, `"banns"`, `"other"`, `"emancipation"` ou `"interdiction"`. |
| `typeCode` | Código bruto do livro, de 1 a 9, como impresso na décima quinta posição da matrícula. |
| `book` | Número do livro, com 5 dígitos e zeros à esquerda. |
| `page` | Número da folha, com 3 dígitos e zeros à esquerda. |
| `term` | Número do termo, com 7 dígitos e zeros à esquerda. |
| `checkDigits` | Os 2 dígitos verificadores módulo 11 da matrícula. |

## formatCertidao

Formata a matrícula de uma certidão de registro civil na máscara impressa do Provimento, os 32 dígitos agrupados em 6 2 2 4 1 5 3 7 2 e separados por espaços. `options.pad` (parte de `FormatCertidaoOptions`) preenche o valor com zeros à esquerda até 32 dígitos (padrão `false`). A máscara é a do [art. 473 do Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243). O parâmetro é tipado como string porque os 32 dígitos de uma matrícula são mais do que um número JavaScript comporta com exatidão; em tempo de execução o valor é lido pelos seus dígitos e a máscara é aplicada até onde eles vão, como em todo formatador deste pacote, então uma matrícula parcial ainda sendo digitada é mascarada progressivamente.

```javascript
import { formatCertidao } from '@brazilian-utils/brazilian-utils';

formatCertidao('10453901552013100012021000012321'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('104539.01.55.2013.1.00012.021.0000123-21'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('1552010100020112000012087', { pad: true }); // 000000 01 55 2010 1 00020 112 0000120 87
```

## isValidCei

Verifica se um número de CEI (Cadastro Específico do INSS) é válido. O CEI identifica o empregador sem CNPJ, como uma obra ou um produtor rural: 12 dígitos impressos como `00.000.00000/00`, sendo o último um dígito verificador calculado sobre os 11 dígitos da base com os pesos 7, 4, 1, 8, 5, 2, 1, 6, 3, 7 e 4. Aceita os caracteres de máscara usuais e espaços entre e ao redor dos grupos, inclusive uma sequência deles entre dois grupos. A Receita Federal não publica essa regra de dígito verificador, então ela segue as implementações de referência do [yii2-br-validator](https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php) e do [Bigai.Documentos.Brasil](https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs), conferida contra os [dados abertos do Cadastro Nacional de Obras (CNO)](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno) da Receita Federal.

```javascript
import { isValidCei } from '@brazilian-utils/brazilian-utils';

isValidCei('11.583.00249/85'); // true
isValidCei('277297118187'); // true
isValidCei(249859674386); // true
isValidCei('24.985.96743/68'); // false (dígito verificador inválido)
isValidCei('000000000000'); // false (dígitos repetidos)
```

## formatCei

Formata um número de CEI (Cadastro Específico do INSS) na máscara usual `00.000.00000/00`, a mesma em que as implementações de referência do dígito verificador concordam (a Receita Federal não a publica). Formata progressivamente, até onde os dígitos informados alcançarem, então também pode ser usada como máscara de digitação. `options.pad` (parte de `FormatCeiOptions`) preenche à esquerda com zeros até 12 dígitos (padrão `false`).

```javascript
import { formatCei } from '@brazilian-utils/brazilian-utils';

formatCei('277297118187'); // 27.729.71181/87
formatCei(249859674386); // 24.985.96743/86
formatCei('249', { pad: true }); // 00.000.00002/49
```

## isValidCno

Verifica se um número de CNO (Cadastro Nacional de Obras) é válido. O CNO substituiu o CEI para obras e manteve a mesma numeração, então uma obra registrada sob um CEI antigo conserva o número e os dois cadastros são validados do mesmo jeito: 12 dígitos impressos como `00.000.00000/00`, com o dígito verificador calculado sobre os 11 dígitos da base. A Receita Federal não publica a regra do dígito verificador; ela foi confirmada contra os [dados abertos do Cadastro Nacional de Obras (CNO)](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno) da Receita Federal: todas as obras do recorte de Minas Gerais desse conjunto passam nesta verificação. A página do catálogo publica apenas a descrição e os links de download do conjunto, não esse resultado.

```javascript
import { isValidCno } from '@brazilian-utils/brazilian-utils';

isValidCno('11.084.01680/62'); // true
isValidCno('111130137368'); // true
isValidCno(401800097960); // true
isValidCno('110840168063'); // false (dígito verificador inválido)
isValidCno('000000000000'); // false (dígitos repetidos)
```

## formatCno

Formata um número de CNO (Cadastro Nacional de Obras). O CNO manteve a numeração do CEI, então os dois compartilham a mesma máscara de 12 dígitos, `00.000.00000/00`, a mesma em que as implementações de referência do dígito verificador concordam (a Receita Federal não a publica). Formata progressivamente, até onde os dígitos informados alcançarem, então também pode ser usada como máscara de digitação. `options.pad` (parte de `FormatCnoOptions`) preenche à esquerda com zeros até 12 dígitos (padrão `false`).

```javascript
import { formatCno } from '@brazilian-utils/brazilian-utils';

formatCno('111130137368'); // 11.113.01373/68
formatCno(401800097960); // 40.180.00979/60
formatCno('979', { pad: true }); // 00.000.00009/79
```

## isValidCaepf

Verifica se um número de CAEPF (Cadastro de Atividade Econômica da Pessoa Física) é válido. O CAEPF substituiu o CEI para a pessoa física que contrata empregados: 14 dígitos impressos como `000.000.000/000-00`, formados pela base de 9 dígitos do CPF do titular, um número de ordem de 3 dígitos para os vários cadastros do mesmo titular e 2 dígitos verificadores. Os dois dígitos verificadores são o módulo 11 do CNPJ na formulação da referência citada: os pesos vão de 9 até 2 da direita para a esquerda e o dígito é o próprio resto, com o resto 10 lido como 0 — o mesmo dígito que os pesos de 2 a 9 do CNPJ com `11 - resto` produzem. O par resultante é somado a 12, com retorno a zero acima de 99. Uma base cujos 12 dígitos são todos iguais é rejeitada antes do cálculo dos dígitos verificadores, do mesmo jeito que `isValidCei` e `isValidCno` rejeitam um número de CEI/CNO repetido, então o `00000000000012`, que de resto é bem formado, é inválido. A Receita Federal não publica o layout nem a regra dos dígitos verificadores: os dois estão descritos em [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e são implementados do mesmo jeito pelo [brazilian-values](https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts).

```javascript
import { isValidCaepf } from '@brazilian-utils/brazilian-utils';

isValidCaepf('293.118.610/001-84'); // true
isValidCaepf('41142260000101'); // true
isValidCaepf(29311861000184); // true
isValidCaepf('29311861000185'); // false (dígitos verificadores inválidos)
isValidCaepf('00000000000000'); // false (dígitos da base repetidos)
isValidCaepf('00000000000012'); // false (dígitos da base repetidos)
```

## formatCaepf

Formata um número de CAEPF (Cadastro de Atividade Econômica da Pessoa Física) na máscara usual `000.000.000/000-00`, a mesma em que as fontes da regra do dígito verificador concordam (a Receita Federal não a publica). Formata progressivamente, até onde os dígitos informados alcançarem, então também pode ser usada como máscara de digitação. `options.pad` (parte de `FormatCaepfOptions`) preenche à esquerda com zeros até 14 dígitos (padrão `false`).

```javascript
import { formatCaepf } from '@brazilian-utils/brazilian-utils';

formatCaepf('29311861000184'); // 293.118.610/001-84
formatCaepf(41142260000101); // 411.422.600/001-01
formatCaepf('184', { pad: true }); // 000.000.000/001-84
```

## isValidRegistroProfissional

Verifica a estrutura de um número de registro/inscrição profissional. Recebe um único objeto, tipado como `IsValidRegistroProfissionalOptions`, no mesmo formato do `isValidBankAccount`: `value` é o número do registro, `council` escolhe o conselho emissor (`"OAB"`, `"CRM"`, `"CRO"`, `"CRP"` ou `"CRC"`) e o `stateCode` opcional verifica a UF embutida (ignorado para `"CRP"`, cujo prefixo de 2 dígitos é um código regional, não uma UF literal). Qualquer coisa que não seja um objeto, e um objeto sem `value` ou sem `council`, é `false`. É apenas uma verificação estrutural: a quantidade de dígitos e a UF são validadas, mas nenhum dígito verificador é calculado, mesmo para o CRC, cujo formato inclui um. Um registro no CRC é a UF, 6 dígitos, o tipo de registro (`"O"` Originário ou `"P"` Provisório, que nada diz sobre a categoria profissional) e o dígito verificador, conforme o [Manual de Registro do Sistema CFC/CRCs](https://cfc.org.br/wp-content/uploads/2018/04/1_manual_registro.pdf) (item 1.1). Um Registro Transferido ou Secundário acrescenta `"T"` ou `"S"` e a UF do CRC de destino **depois** do dígito verificador, conforme esse mesmo item e a [Resolução CFC nº 1.707/2023](https://www1.cfc.org.br/sisweb/SRE/docs/Res_1707.pdf), art. 5º parágrafo único: os exemplos do próprio Manual são `SP-123456/O-3 T-MG`, `TO-654321/P-8 T-SC` e `PI-111222/O-5 S-AC`. As duas UFs precisam ser códigos reais, e o `stateCode` é comparado com a de origem. O código regional do CRP precisa ser um dos [24 Conselhos Regionais](https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/) do sistema CFP, de CRP-01 a CRP-24. Só o formato do CRC e esses códigos regionais do CRP se apoiam em fonte publicada: a página do CFP não publica o tamanho do número de inscrição, e a OAB, o CFM e o CFO não publicam formato algum, então as faixas de dígitos aceitas para `"CRP"`, `"OAB"`, `"CRM"` e `"CRO"` são convencionais, não normativas (a busca pública da OAB/SP tem `maxlength="7"`, e o CFM documenta CRMs com prefixo `300` e sufixo `P`, nenhum deles expresso por esses formatos). O CREA não é suportado: seu formato de registro não pôde ser confirmado em uma fonte oficial e publicamente documentada após a unificação nacional de 2016 (RNP).

```javascript
import { isValidRegistroProfissional } from '@brazilian-utils/brazilian-utils';

isValidRegistroProfissional({ value: '123456/SP', council: 'OAB' }); // true
isValidRegistroProfissional({ value: '123456-RJ', council: 'OAB', stateCode: 'SP' }); // false (UF divergente)
isValidRegistroProfissional({ value: '06/12345', council: 'CRP' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3', council: 'CRC' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3 T-MG', council: 'CRC' }); // true (registro transferido)
isValidRegistroProfissional({ value: 'SP-123456/T-3', council: 'CRC' }); // false ("T" não é tipo de registro)
```

## isValidVin

Valida se um VIN (Vehicle Identification Number / chassi) é válido. Verifica o tamanho (17 caracteres), as letras excluídas (`I`, `O`, `Q` nunca são válidas; estrutura da [ISO 3779:2009](https://www.iso.org/standard/52200.html)) e o dígito verificador na 9ª posição, calculado e transliterado conforme o [49 CFR 565.15](https://www.ecfr.gov/current/title-49/section-565.15). Esse dígito verificador é uma exigência norte-americana (49 CFR 565.15 / SAE J853): a [Resolução CONTRAN nº 968/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf) (que revogou a Resolução CONTRAN nº 24/1998 a partir de 1º de janeiro de 2025) e a ABNT NBR 6066 definem a estrutura do VIN brasileiro, mas não o exigem, então muitos VINs fabricados no Brasil não possuem um dígito verificador correspondente. Esta função é, portanto, uma verificação estrutural no padrão norte-americano, não um validador universal de VINs brasileiros. Não diferencia maiúsculas de minúsculas e remove espaços nas extremidades. Um VIN é impresso como uma sequência única de 17 caracteres, então, diferente dos documentos que este pacote mascara (`isValidCpf`, `isValidCnpj`, `isValidNfeKey`), ele não tem limite de grupo onde escrever um separador e nenhum é aceito: um espaço, `.`, `-` ou `/` entre os caracteres é rejeitado em vez de removido. Um valor cujos 17 caracteres são todos iguais (`'00000000000000000'`) é rejeitado mesmo com o dígito verificador correspondente, do jeito que todo outro validador deste pacote rejeita um documento de dígitos repetidos.

```javascript
import { isValidVin } from '@brazilian-utils/brazilian-utils';

isValidVin('1HGCM82633A004352'); // true
isValidVin('1m8gdm9axkp042788'); // true (dígito verificador X, minúsculo)
isValidVin('1HGCM82633A004353'); // false (dígito verificador inválido)
isValidVin('00000000000000000'); // false (todos os caracteres iguais, ainda que o dígito feche)
isValidVin('1HGCM8263IA004352'); // false (contém a letra excluída I)
```

## isValidCbo

Valida se um código CBO (Classificação Brasileira de Ocupações) existe na tabela de ocupações do MTE. Aceita o código com ou sem a máscara de hífen, ou como número. Uma string só é lida como código quando está escrita em uma dessas formas (os 6 dígitos, ou a máscara `NNNN-NN`, com um único separador entre os grupos e espaços em branco opcionais no início e no fim), e um número só quando é um inteiro seguro não negativo. Um código CBO sempre tem 6 dígitos e os zeros à esquerda fazem parte dele, então um valor escrito apenas com dígitos é completado com zeros à esquerda até 6, seja ele string ou número, exatamente como `getBankByCode` completa um código de banco: `10205`, `'10205'` e `'010205'` são o mesmo código. Um valor mascarado já carrega os seus separadores e é lido como foi escrito.

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

Os títulos das ocupações vêm da [tabela oficial de ocupações da CBO 2002 publicada pelo MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv).

## getCbo

Consulta um código CBO (Classificação Brasileira de Ocupações) e retorna o título oficial da ocupação, no registro `{ code, description }` que toda consulta desta biblioteca devolve. Um valor escrito apenas com dígitos mantém os zeros à esquerda implícitos, tanto como string quanto como número: `getCbo(10205)` e `getCbo('10205')` são lidos como `010205`. Valem as mesmas regras de entrada de `isValidCbo`: uma string precisa estar escrita com os 6 dígitos ou com a máscara `NNNN-NN`, e um número precisa ser um inteiro seguro não negativo.

```javascript
import { getCbo } from '@brazilian-utils/brazilian-utils';

getCbo('2124-05'); // { code: '212405', description: 'Analista de desenvolvimento de sistemas' }
getCbo(10205); // { code: '010205', description: 'Oficial da aeronáutica' } (completado para 6 dígitos)
getCbo('10205'); // { code: '010205', description: 'Oficial da aeronáutica' } (completado do mesmo jeito)
getCbo('000000'); // null
getCbo('2124abc05'); // null (não é uma forma documentada)
```

Os títulos das ocupações vêm da [tabela oficial de ocupações da CBO 2002 publicada pelo MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv).

## isValidCnae

Valida se um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas) existe na [tabela CNAE-Subclasses 2.3 publicada pelo IBGE](https://concla.ibge.gov.br/busca-online-cnae.html), a revisão de subclasses atual da CNAE 2.0. Aceita o código com ou sem a máscara `NNNN-N/NN`, ou como número. Uma string só é lida como código quando está escrita em uma dessas formas (os 7 dígitos, ou a máscara, com um único separador entre os grupos e espaços em branco opcionais no início e no fim), e um número só quando é um inteiro seguro não negativo. Um código de subclasse CNAE sempre tem 7 dígitos e os zeros à esquerda fazem parte dele, então um valor escrito apenas com dígitos é completado com zeros à esquerda até 7, seja ele string ou número: `111301`, `'111301'` e `'0111301'` são o mesmo código. Um valor mascarado já carrega os seus separadores e é lido como foi escrito.

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

## formatCnae

Formata um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas). `options.pad` (parte de `FormatCnaeOptions`) funciona exatamente como em `formatCpf`/`formatCep`: com o padrão `false` a máscara é aplicada progressivamente, até onde o valor vai, que é o que um campo sendo digitado precisa; com `true` o valor é primeiro completado com zeros à esquerda até os 7 dígitos de uma subclasse completa, então ele sempre volta com a máscara inteira. Um número é tratado exatamente como a string dos seus dígitos, ou seja, só é completado com `pad: true`. Como todo formatador deste pacote, o valor é lido pelos seus dígitos e a máscara é aplicada até onde eles vão: caracteres fora da máscara são descartados e um número é lido como a string dos seus dígitos, sinal e ponto decimal inclusos. Use `isValidCnae` para verificar um código.

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

## getCnae

Busca um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas) e retorna seu código e a descrição oficial. O `code` volta com os 7 dígitos crus, como em toda consulta desta biblioteca; passe-o para `formatCnae` para obter a forma `NNNN-N/NN`. Um valor escrito apenas com dígitos mantém os zeros à esquerda implícitos, tanto como string quanto como número: `getCnae(111301)` e `getCnae('111301')` são lidos como `0111301`. Valem as mesmas regras de entrada de `isValidCnae`: uma string precisa estar escrita com os 7 dígitos ou com a máscara `NNNN-N/NN`, e um número precisa ser um inteiro seguro não negativo.

```javascript
import { formatCnae, getCnae } from '@brazilian-utils/brazilian-utils';

getCnae('6201-5/01'); // { code: '6201501', description: 'DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA' }
getCnae(111301); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (completado para 7 dígitos)
getCnae('111301'); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (completado do mesmo jeito)
getCnae('0000000'); // null
getCnae('0111abc301'); // null (não é uma forma documentada)
formatCnae(getCnae('6201501')?.code); // 6201-5/01 (aplicar a máscara é trabalho do formatador)
```

## isValidNcm

Valida se um código NCM (Nomenclatura Comum do Mercosul) existe na tabela vigente publicada pelo Siscomex/MDIC. Aceita o código com ou sem a máscara de pontos, ou como número. Uma string só é lida como código quando está escrita em uma dessas formas (os 8 dígitos, ou a máscara `NNNN.NN.NN`, com um único separador entre os grupos e espaços em branco opcionais no início e no fim), e um número só quando é um inteiro seguro não negativo. Um código NCM sempre tem 8 dígitos e os zeros à esquerda fazem parte dele, então um valor escrito apenas com dígitos é completado com zeros à esquerda até 8, seja ele string ou número: `1012100`, `'1012100'` e `'01012100'` são o mesmo código. Um valor mascarado já carrega os seus separadores e é lido como foi escrito.

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

## formatNcm

Formata um código NCM (Nomenclatura Comum do Mercosul). `options.pad` (parte de `FormatNcmOptions`) funciona exatamente como em `formatCpf`/`formatCep`: com o padrão `false` a máscara é aplicada progressivamente, até onde o valor vai, que é o que um campo sendo digitado precisa; com `true` o valor é primeiro completado com zeros à esquerda até os 8 dígitos de um código completo, então ele sempre volta com a máscara inteira. Um número é tratado exatamente como a string dos seus dígitos, ou seja, só é completado com `pad: true`. Como todo formatador deste pacote, o valor é lido pelos seus dígitos e a máscara é aplicada até onde eles vão: caracteres fora da máscara são descartados e um número é lido como a string dos seus dígitos, sinal e ponto decimal inclusos. Use `isValidNcm` para verificar um código.

```javascript
import { formatNcm } from '@brazilian-utils/brazilian-utils';

formatNcm('84713012'); // 8471.30.12
formatNcm('8471'); // 8471 (máscara aplicada até onde o valor vai)
formatNcm('847130'); // 8471.30
formatNcm('8471', { pad: true }); // 0000.84.71 (completado até 8 dígitos antes)
formatNcm('abc8471'); // 8471 (só os dígitos são lidos)
formatNcm(-84713012); // 8471.30.12
```

## isValidCfop

Valida se um código CFOP (Código Fiscal de Operações e Prestações) existe na tabela oficial. A tabela é o [Anexo II consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), o texto vigente (redação atual dada pelo Ajuste SINIEF 03/24, última alteração pelo [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25)), e não o texto congelado de 2001 do Ajuste SINIEF 07/01. Só os códigos operáveis contam: os títulos de grupo e subgrupo da nomenclatura oficial, os códigos terminados em `00` e `50` (1000, 1100, 1150, 5350, ...), são títulos de seção e não códigos que um documento pode carregar, então são rejeitados.

Uma string só é lida como código quando está escrita em uma das formas documentadas (os 4 dígitos, ou a forma `N.NNN` impressa no anexo, com um único separador entre os grupos e espaços em branco opcionais no início e no fim), e um número só quando é um inteiro seguro não negativo. Nenhum código CFOP começa com zero, o seu primeiro dígito é o grupo da operação (1 a 7), então aqui nada é completado: um número e a string dos mesmos dígitos são lidos de forma idêntica.

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

## getCfop

Busca um código CFOP (Código Fiscal de Operações e Prestações) e retorna seu código e a descrição oficial, na redação do [Anexo II consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), no texto vigente, com última alteração pelo [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25). Os títulos de grupo e subgrupo da nomenclatura oficial, os códigos terminados em `00` e `50`, não estão na tabela e retornam `null`. Valem as mesmas regras de entrada de `isValidCfop`.

```javascript
import { getCfop } from '@brazilian-utils/brazilian-utils';

getCfop('1101'); // { code: '1101', description: 'Compra para industrialização ou produção rural' }
getCfop('7504'); // { code: '7504', description: 'Exportação de mercadoria que foi objeto de formação de lote de exportação' }
getCfop('0000'); // null
getCfop('5350'); // null (título de subgrupo, não é um código operável)
getCfop('abc5102'); // null (não é uma forma documentada)
```

## isValidCst

Valida um código de CST (Código de Situação Tributária) para um tributo. Informe o tributo em `options.tax`:

| Tributo | Formato | Códigos aceitos |
| --- | --- | --- |
| `icms` | 3 dígitos (origem + CST) | origem `0`-`8` + um de `00`, `02`, `10`, `15`, `20`, `30`, `40`, `41`, `50`, `51`, `53`, `60`, `61`, `70`, `90` |
| `ipi` | 2 dígitos | `00`, `01`, `02`, `03`, `04`, `05`, `49`, `50`, `51`, `52`, `53`, `54`, `55`, `99` |
| `pis` | 2 dígitos | `01`-`09`, `49`, `50`-`56`, `60`-`67`, `70`-`75`, `98`, `99` |
| `cofins` | 2 dígitos | mesma tabela do `pis` |

`options.tax` (parte de `IsValidCstOptions`) é opcional: omita-o para aceitar um código que exista em qualquer uma das quatro tabelas acima. Um `tax` fora desses quatro valores cai nesse mesmo padrão em tempo de execução, do jeito que toda outra opção escalar desta biblioteca trata um valor que não conhece.

A Tabela B do ICMS é a vigente: o [Anexo I consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70), cuja redação atual veio do [Ajuste SINIEF 39/23](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2023/ajuste-sinief-39-23) (efeitos a partir de 01.12.23) e que o [Ajuste SINIEF 20/24](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2024/AJ020_24) alterou suprimindo os itens 12, 13, 52, 72 e 74 (efeitos a partir de 09.07.24) antes que eles chegassem a produzir efeitos: o 39/23 havia adiado a produção de efeitos deles para 1º de outubro de 2024, então a revogação os alcançou antes e esses códigos nunca estiveram em vigor. `02`, `15`, `53` e `61` são seus códigos de monofasia de combustíveis.

Uma string só é lida como código quando está escrita em uma das formas documentadas (os 2 dígitos de um código da Tabela B, ou os 3 dígitos da forma do ICMS com um único separador opcional depois do dígito de origem, além de espaços em branco opcionais no início e no fim), e um número só quando é um inteiro seguro não negativo. O dígito de origem é a única fronteira que um CST impresso tem, então `'0 10'` e `'1-10'` são lidos, mas `'0-0'`, `'11-0'` e `'00-'` não.

Um único dígito é mais estreito que qualquer uma das formas documentadas, então ele é completado com zeros à esquerda até os 3 dígitos da forma do ICMS, seja ele string ou número: `0`, `'0'` e `'000'` são todos o código ICMS `000`. Um valor de 2 dígitos já é uma forma documentada, um código da Tabela B, e é lido como foi escrito, ou seja, um código da Tabela B mantém os seus dois dígitos: `'07'`, não `7`, que é o código ICMS `007`.

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

## isValidCsosn

Valida se um código de CSOSN (Código de Situação da Operação no Simples Nacional) é um dos 10 códigos do [Anexo III-A consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70), a tabela instituída pelo Ajuste SINIEF 03/2010: `101`, `102`, `103`, `201`, `202`, `203`, `300`, `400`, `500` ou `900`.

Uma string só é lida como código quando está escrita como os 3 dígitos puros, com espaços em branco opcionais no início e no fim: um CSOSN não tem agrupamento impresso (a NF-e leva o dígito de origem no seu próprio campo `orig`), então `'1-01'` é rejeitado; um número só é lido quando é um inteiro seguro não negativo. Nenhum código CSOSN começa com zero, a tabela vai de `101` a `900`, então aqui nada é completado: um número e a string dos mesmos dígitos são lidos de forma idêntica.

```javascript
import { isValidCsosn } from '@brazilian-utils/brazilian-utils';

isValidCsosn('101'); // true
isValidCsosn('999'); // false
isValidCsosn('abc101'); // false (não é uma forma documentada)
isValidCsosn(-101); // false (não é um inteiro seguro não negativo)
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
