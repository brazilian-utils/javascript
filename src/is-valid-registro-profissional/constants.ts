/**
 * Structural format of each supported professional council registration number.
 *
 * @see Official: https://www.oab.org.br/ Ordem dos Advogados do Brasil (OAB): "número de inscrição" + "seccional" (UF).
 * @see Official: https://portal.cfm.org.br/ Conselho Federal de Medicina (CRM): registration number + UF.
 * @see Official: https://cfo.org.br/ Conselho Federal de Odontologia (CRO): registration number + UF.
 * @see Official: https://cfp.org.br/ Conselho Federal de Psicologia (CRP): 2 digit regional code + registration number.
 * @see Official: https://cfc.org.br/ Conselho Federal de Contabilidade (CRC): UF + registration number + category (O/T) + check digit.
 */

export type RegistroProfissionalCouncil = "OAB" | "CRM" | "CRO" | "CRP" | "CRC";

export const OAB_REGEX = /^(?<number>\d{4,6})(?<uf>[A-Z]{2})$/;

export const CRM_REGEX = /^(?<number>\d{4,6})(?<uf>[A-Z]{2})$/;

export const CRO_REGEX = /^(?<number>\d{3,6})(?<uf>[A-Z]{2})$/;

export const CRP_REGEX = /^(?<region>\d{2})(?<number>\d{4,6})$/;

export const CRC_REGEX = /^(?<uf>[A-Z]{2})(?<number>\d{4,6})(?<category>[OT])(?<checkDigit>\d)$/;
