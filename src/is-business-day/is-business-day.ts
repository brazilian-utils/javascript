import { type StateCode } from "../_internals/constants/states";
import { isSupportedHolidayYear } from "../_internals/is-supported-holiday-year/is-supported-holiday-year";
import { isValidDate } from "../_internals/is-valid-date/is-valid-date";
import { readHolidayStateCode } from "../_internals/read-holiday-state-code/read-holiday-state-code";
import { getHolidays } from "../get-holidays/get-holidays";

export type { StateCode } from "../_internals/constants/states";

/**
 * Options shared by every business day util (`isBusinessDay`, `addBusinessDays`,
 * `subBusinessDays` and `differenceInBusinessDays`): which days count as business days.
 */
export type BusinessDayOptions = {
	/** Two letter state code whose state holidays are also treated as non-business days (default: national holidays only). */
	stateCode?: StateCode;
	/** Whether optional-type holidays (`Holiday.type === "optional"`: the federal pontos facultativos Carnaval Monday and Tuesday and Corpus Christi, and the state ones `getHolidays` lists) count as non-business days (default: `true`). */
	includeOptional?: boolean;
	/** Whether Saturday counts as a business day, the payroll deadline count of Instrução Normativa MTP nº 2/2021, art. 14, I, "na contagem dos dias será incluído o sábado" (default: `false`, a Monday to Friday count). */
	includeSaturday?: boolean;
};

const SUNDAY = 0;
const SATURDAY = 6;

/**
 * Checks whether a given date is a Brazilian business day (dia útil).
 *
 * A day is not a business day when it falls on Saturday or Sunday (`options.includeSaturday`
 * keeps Saturday, the labour law count), or when it is a
 * Brazilian holiday returned by `getHolidays({ year, stateCode })` for `value`'s **local
 * calendar day** (its local year/month/day, as read by `Date#getFullYear`/`getMonth`/`getDate`),
 * the same convention used by `isHoliday`. Build `value` from local components
 * (`new Date(2024, 11, 25)`) rather than from a date-only ISO string when you mean a
 * specific local day, for the same reason documented in `isHoliday`.
 *
 * `options.includeOptional` defaults to `true`: holidays whose `Holiday.type` is
 * `"optional"` (Carnaval Monday and Tuesday and Corpus Christi, the federal pontos facultativos
 * `getHolidays` lists, plus the state pontos facultativos its table sources: Alagoas' 16
 * September of 2020 to 2023, Amazonas' 8 December and Pernambuco's 6 March of 2008 and 2009) are
 * treated as non-business days even though they are not
 * statutory holidays. Pass `false` to only treat statutory (`"national"` and `"state"`) holidays as
 * non-business days. The partial pontos facultativos of the federal calendar (the Quarta-feira de
 * Cinzas morning, 28 October, the 24 and 31 December afternoons) are business days either way.
 *
 * `options.includeSaturday` defaults to `false`, a Monday to Friday count less the holidays
 * above. That is not by itself the calendar of banks or of courts. The financial market also
 * skips the Carnaval Monday and Tuesday and Corpus Christi (Resolução CMN nº 4.880/2020, art. 6º),
 * which the default `includeOptional: true` covers, and a bank closes on the local holidays of its
 * branch. The federal courts close as well on the days of Lei 5.010/1966, art. 62 (20 December
 * to 6 January, Holy Wednesday to Easter Sunday, Carnaval Monday and Tuesday, 11 August, 1 and 2
 * November, 8 December), and a procedural deadline counts only dias úteis, CPC art. 216 treating
 * as feriados "os sábados, os domingos e os dias em que não haja expediente forense", which
 * depends on each court's own calendar; neither calendar is reproduced here. Pass `true` for the
 * labour law count of the payroll deadline of CLT art. 459 § 1º ("até o
 * quinto dia útil do mês subsequente ao vencido"), which the labour inspection reads through
 * Instrução Normativa MTP nº 2/2021, art. 14, I: "na contagem dos dias será incluído o sábado,
 * excluindo-se o domingo e o feriado, inclusive o municipal". Sunday and holidays are still
 * non-business days with the option on, so a holiday that falls on a Saturday stays a
 * non-business day.
 *
 * What `includeSaturday: true` does **not** cover: the "inclusive o municipal" part of that
 * rule. `getHolidays` has national and state holidays only, so a municipal holiday is counted as
 * a business day here while the labour inspection would exclude it. A count that must be exact
 * for a municipality has to remove its municipal holidays on top of this option.
 *
 * `options.stateCode` is read as `getHolidays` reads it: letter case and surrounding whitespace
 * are ignored, and a `stateCode` that is present and is not the code of a Brazilian state (an
 * unknown string such as `"XX"`, an empty string, a prototype-chain key such as `"__proto__"`, a
 * value that is not a string) is rejected: `isBusinessDay` returns `false` without looking at the
 * date, even when that date is an ordinary Tuesday. `undefined`, or an absent property, is the
 * only value that stands for "no state". `addBusinessDays`, `subBusinessDays` and
 * `differenceInBusinessDays` reject the same value with `null`.
 *
 * Three state rules change what `includeOptional: false` answers. The Distrito Federal, Maranhão
 * from 2024 on and Rio de Janeiro from 2026 on declare Corpus Christi a feriado (Lei distrital nº
 * 72/1989, art. 1º parágrafo único; Lei MA nº 11.539/2021; Lei RJ nº 11.002/2025), so with
 * `stateCode: "DF"`, `"MA"` or `"RJ"` it is typed `"state"` and still counts; Rio de Janeiro declares the Carnaval
 * Tuesday a feriado estadual (Lei RJ nº 5.243/2008, from 2009 on), so with `stateCode: "RJ"` it
 * still counts while the Monday does not; and Santa Catarina's two holidays
 * are observed on the following Sunday when they fall Monday to Friday (Lei SC nº 18.531/2022),
 * so 11 August 2025, a Monday, is a business day there.
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a date
 * outside it returns `false` rather than silently treating every weekday as a business day.
 *
 * @param {Date} value - The date to check.
 * @param {BusinessDayOptions} [options] - Which days count as business days.
 * @param {StateCode} [options.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [options.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @param {boolean} [options.includeSaturday] - Whether Saturday counts as a business day (default: `false`).
 * @returns {boolean} True when `value` is a business day, false otherwise. Bad input also
 * returns false: a `value` that is not a valid `Date` (including non-`Date` values), a
 * `value` outside the supported 1900-2099 range, or a `stateCode` that is present and is not a
 * state code.
 *
 * @example
 * ```typescript
 * isBusinessDay(new Date(2024, 0, 2)); // true (Tuesday, not a holiday)
 * isBusinessDay(new Date(2024, 0, 1)); // false (Ano novo)
 * isBusinessDay(new Date(2024, 0, 6)); // false (Saturday)
 * isBusinessDay(new Date(2024, 0, 6), { includeSaturday: true }); // true (labour law count)
 * isBusinessDay(new Date(2024, 8, 7), { includeSaturday: true }); // false (Independência, a holiday on a Saturday)
 * isBusinessDay(new Date(2024, 0, 7), { includeSaturday: true }); // false (Sunday is never included)
 * isBusinessDay(new Date(2024, 1, 12)); // false (Carnaval Monday, optional holiday, counted by default)
 * isBusinessDay(new Date(2024, 1, 13)); // false (Carnaval Tuesday, optional holiday, counted by default)
 * isBusinessDay(new Date(2024, 1, 13), { includeOptional: false }); // true
 * isBusinessDay(new Date(2024, 6, 9), { stateCode: "SP" }); // false (Revolução Constitucionalista)
 * isBusinessDay(new Date(2024, 6, 9)); // true (state holiday ignored without stateCode)
 * isBusinessDay(new Date("not a date")); // false
 * isBusinessDay(new Date(2024, 6, 9), { stateCode: 5 }); // false (a non-string stateCode is rejected)
 * isBusinessDay(new Date(2100, 0, 4)); // false (a Monday, but 2100 is outside the supported range)
 * ```
 *
 * The underlying holidays are the ones `getHolidays` computes; see its JSDoc (and
 * `src/get-holidays/constants.ts` for state holidays) for the full set of laws behind them.
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l0662.htm
 * Lei 662/1949, the base national holidays law.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm
 * Lei 10.607/2002, added Finados (2 November) and folded in Tiradentes (21 April), which had
 * been national since art. 3º of the Lei 1.266/1950 it revoked.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l6802.htm
 * Lei 6.802/1980, declared Nossa Senhora Aparecida a national holiday, listed from 1980 on; each
 * national holiday is listed only for the years a federal norm declared it (see `getHolidays`).
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm
 * Lei 14.759/2023, nationalized Dia da Consciência Negra from 2024.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9093.htm
 * Lei 9.093/1995, the framework law authorizing state and municipal holidays. Its art. 2º leaves
 * the up to four feriados religiosos to each municipality's own law, which is why
 * `includeSaturday` cannot cover the municipal part of the labour law count: `getHolidays` does
 * not carry them.
 * @see Official: https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm
 * CLT art. 459 § 1º (wording given by Lei 7.855/1989), the "quinto dia útil do mês subsequente ao
 * vencido" payroll deadline that `includeSaturday` exists for.
 * @see Official: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20CMN&numero=4880
 * Resolução CMN nº 4.880/2020, art. 6º: "Não são considerados dias úteis, para fins de operações
 * praticadas no mercado financeiro e de prestação de informações ao Banco Central do Brasil, os
 * sábados, domingos e feriados de âmbito nacional, bem como: I - a segunda-feira e a terça-feira
 * de Carnaval; e II - o dia dedicado a Corpus Christi". The Quarta-feira de Cinzas is not listed,
 * so it is a dia útil for the financial market as well.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l5010.htm
 * Lei 5.010/1966, art. 62: "Além dos fixados em lei, serão feriados na Justiça Federal, inclusive
 * nos Tribunais Superiores: I - os dias compreendidos entre 20 de dezembro e 6 de janeiro,
 * inclusive; II - os dias da Semana Santa, compreendidos entre a quarta-feira e o Domingo de
 * Páscoa; III - os dias de segunda e terça-feira de Carnaval; IV - os dias 11 de agosto, 1º e 2 de
 * novembro e 8 de dezembro".
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm
 * CPC (Lei 13.105/2015), art. 216: "Além dos declarados em lei, são feriados, para efeito forense,
 * os sábados, os domingos e os dias em que não haja expediente forense".
 * @see Official: https://www.in.gov.br/web/dou/-/instrucao-normativa-359448244
 * Instrução Normativa MTP nº 2, de 8 de novembro de 2021 (DOU of 12/11/2021, in force from
 * 10/12/2021), art. 14, I: the rule `includeSaturday` implements, verbatim "na contagem dos dias
 * será incluído o sábado, excluindo-se o domingo e o feriado, inclusive o municipal". The caput
 * frames it as guidance to the labour inspection on the payroll deadline alone: "Para efeito de
 * orientação quanto ao prazo para o pagamento dos salários, os Auditores-Fiscais do Trabalho
 * deverão observar o seguinte". No later act amends art. 14 (the retificação of 07/12/2021, IN
 * GMTP/MTP nº 2 and nº 3/2022 and IN SIT/MTE nº 2/2025 touch other articles). Its inciso II asks
 * for the wages to be "à disposição do empregado até o quinto dia útil" when paid through a bank,
 * which does not open on a Saturday (Resolução CMN nº 4.880/2020, art. 6º); the IN does not settle
 * that case.
 * @see Official: https://www.in.gov.br/web/dou/-/portaria-mgi-n-11.460-de-29-de-dezembro-de-2025-678388627
 * Portaria MGI nº 11.460/2025, the federal executive's annual calendar of feriados nacionais and
 * pontos facultativos: the source of the Easter-derived entries but one, namely Sexta-feira Santa
 * being observed nationally and the Carnaval Monday and Tuesday ("16 de fevereiro Carnaval (ponto
 * facultativo); 17 de fevereiro Carnaval (ponto facultativo)") and Corpus Christi being ponto
 * facultativo, which is what `includeOptional` switches on. The exception, Páscoa, has no entry in
 * the portaria; `getHolidays` derives Easter Sunday arithmetically with the Meeus/Jones/Butcher
 * algorithm, and it never affects this function because Easter is always a Sunday. The 2024 and
 * 2025 calendars, Portaria MGI nº 8.617/2023 (DOU of 28/12/2023) and Portaria MGI nº 9.783/2024
 * (DOU of 30/12/2024), list the two Carnaval days the same way, as ponto facultativo and never as
 * feriado nacional (the `getHolidays` JSDoc links them).
 */
export const isBusinessDay = (value: Date, options?: BusinessDayOptions): boolean => {
	if (!isValidDate(value)) return false;

	const stateCode = readHolidayStateCode(options?.stateCode);

	if (stateCode === null) return false;

	const year = value.getFullYear();

	if (!isSupportedHolidayYear(year)) return false;

	const day = value.getDay();

	if (day === SUNDAY) return false;

	const includeSaturday = options?.includeSaturday ?? false;

	if (day === SATURDAY && !includeSaturday) return false;

	const includeOptional = options?.includeOptional ?? true;

	const month = value.getMonth();
	const date = value.getDate();

	return !getHolidays({ year, stateCode }).some((holiday) => {
		if (!includeOptional && holiday.type === "optional") return false;

		return holiday.date.getMonth() === month && holiday.date.getDate() === date;
	});
};
