import { type StateCode } from "./states";

/**
 * The capital of each state, as `[name, ibgeCode]`: the municipality name as the IBGE spells it
 * and its 7 digit IBGE code, the same pair `getMunicipalityByCode` finds for that code. For the
 * Distrito Federal, whose territory is not divided into municipalities, the entry is Brasília,
 * the code the IBGE gives the whole district.
 *
 * @see Official: https://anuario.ibge.gov.br/2024/territorio/posicao-e-extensao.html
 * IBGE, Anuário Estatístico do Brasil, Tabela 1.1.1.2, "Localização geográfica, altitude e
 * distância a Brasília, segundo os Municípios das Capitais - 2025": one capital per state,
 * written "Porto Velho (RO)" to "Brasília (DF)".
 * @see Official: https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/divisao_territorial/2025/DTB_2025.zip
 * IBGE, Divisão Territorial Brasileira 2025, the municipality codes.
 */
export const STATE_CAPITALS: Record<StateCode, readonly [name: string, ibgeCode: string]> = {
	AC: ["Rio Branco", "1200401"],
	AL: ["Maceió", "2704302"],
	AM: ["Manaus", "1302603"],
	AP: ["Macapá", "1600303"],
	BA: ["Salvador", "2927408"],
	CE: ["Fortaleza", "2304400"],
	DF: ["Brasília", "5300108"],
	ES: ["Vitória", "3205309"],
	GO: ["Goiânia", "5208707"],
	MA: ["São Luís", "2111300"],
	MG: ["Belo Horizonte", "3106200"],
	MS: ["Campo Grande", "5002704"],
	MT: ["Cuiabá", "5103403"],
	PA: ["Belém", "1501402"],
	PB: ["João Pessoa", "2507507"],
	PE: ["Recife", "2611606"],
	PI: ["Teresina", "2211001"],
	PR: ["Curitiba", "4106902"],
	RJ: ["Rio de Janeiro", "3304557"],
	RN: ["Natal", "2408102"],
	RO: ["Porto Velho", "1100205"],
	RR: ["Boa Vista", "1400100"],
	RS: ["Porto Alegre", "4314902"],
	SC: ["Florianópolis", "4205407"],
	SE: ["Aracaju", "2800308"],
	SP: ["São Paulo", "3550308"],
	TO: ["Palmas", "1721000"],
};
