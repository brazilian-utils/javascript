import { State } from '../../common/states';
import { onlyNumbers } from '../../helpers/only-numbers';

import { AC } from './validators/ac';
import { AL } from './validators/al';
import { AP } from './validators/ap';
import { AM } from './validators/am';
import { BA } from './validators/ba';
import { CE } from './validators/ce';
import { DF } from './validators/df';
import { ES } from './validators/es';
import { GO } from './validators/go';
import { MA } from './validators/ma';
import { MT } from './validators/mt';
import { MS } from './validators/ms';
import { MG } from './validators/mg';
import { PA } from './validators/pa';
import { PB } from './validators/pb';
import { PR } from './validators/pr';
import { PE } from './validators/pe';
import { PI } from './validators/pi';
import { RJ } from './validators/rj';
import { RN } from './validators/rn';
import { RS } from './validators/rs';
import { RO } from './validators/ro';
import { RR } from './validators/rr';
import { SC } from './validators/sc';
import { SP } from './validators/sp';
import { SE } from './validators/se';
import { TO } from './validators/to';

const STATE = {
  AC,
  AL,
  AP,
  AM,
  BA,
  CE,
  DF,
  ES,
  GO,
  MA,
  MT,
  MS,
  MG,
  PA,
  PB,
  PR,
  PE,
  PI,
  RJ,
  RN,
  RS,
  RO,
  RR,
  SC,
  SP,
  SE,
  TO,
};

/**
 * Validates a Brazilian state registration number (Inscrição Estadual).
 * 
 * @param uf - The state abbreviation (e.g., 'SP', 'RJ', 'MG')
 * @param inscricaoEstadual - The state registration number to validate
 * @returns `true` if the state registration number is valid, `false` otherwise
 * 
 * @example
 * ```typescript
 * isValid('SP', '110042490114'); // returns true
 * isValid('RJ', '12345'); // returns false
 * ```
 */
export function isValid(uf: State, inscricaoEstadual: string) {
  const digits = onlyNumbers(inscricaoEstadual);
  const state = new STATE[uf]();

  return state.isValid(digits);
}
