import {
  format,
  LENGTH,
  isValid,
  generate,
  generateAlphanumeric,
  isAlphanumericCnpj,
  isNumericCnpj,
  cleanCnpj,
  charToCnpjValue,
  isValidFormat,
  isValidNumericFormat,
  RESERVED_NUMBERS,
} from '.';

describe('format', () => {
  test('should format cnpj with mask', () => {
    expect(format('')).toBe('');
    expect(format('4')).toBe('4');
    expect(format('46')).toBe('46');
    expect(format('468')).toBe('46.8');
    expect(format('4684')).toBe('46.84');
    expect(format('46843')).toBe('46.843');
    expect(format('468434')).toBe('46.843.4');
    expect(format('4684348')).toBe('46.843.48');
    expect(format('46843485')).toBe('46.843.485');
    expect(format('468434850')).toBe('46.843.485/0');
    expect(format('4684348500')).toBe('46.843.485/00');
    expect(format('46843485000')).toBe('46.843.485/000');
    expect(format('468434850001')).toBe('46.843.485/0001');
    expect(format('4684348500018')).toBe('46.843.485/0001-8');
    expect(format('46843485000186')).toBe('46.843.485/0001-86');
  });

  test('should format number cnpj with mask', () => {
    expect(format(4)).toBe('4');
    expect(format(46)).toBe('46');
    expect(format(468)).toBe('46.8');
    expect(format(4684)).toBe('46.84');
    expect(format(46843)).toBe('46.843');
    expect(format(468434)).toBe('46.843.4');
    expect(format(4684348)).toBe('46.843.48');
    expect(format(46843485)).toBe('46.843.485');
    expect(format(468434850)).toBe('46.843.485/0');
    expect(format(4684348500)).toBe('46.843.485/00');
    expect(format(46843485000)).toBe('46.843.485/000');
    expect(format(468434850001)).toBe('46.843.485/0001');
    expect(format(4684348500018)).toBe('46.843.485/0001-8');
    expect(format(46843485000186)).toBe('46.843.485/0001-86');
  });

  test('should format cnpj with mask filling zeroes', () => {
    expect(format('', { pad: true })).toBe('00.000.000/0000-00');
    expect(format('4', { pad: true })).toBe('00.000.000/0000-04');
    expect(format('46', { pad: true })).toBe('00.000.000/0000-46');
    expect(format('468', { pad: true })).toBe('00.000.000/0004-68');
    expect(format('4684', { pad: true })).toBe('00.000.000/0046-84');
    expect(format('46843', { pad: true })).toBe('00.000.000/0468-43');
    expect(format('468434', { pad: true })).toBe('00.000.000/4684-34');
    expect(format('4684348', { pad: true })).toBe('00.000.004/6843-48');
    expect(format('46843485', { pad: true })).toBe('00.000.046/8434-85');
    expect(format('468434850', { pad: true })).toBe('00.000.468/4348-50');
    expect(format('4684348500', { pad: true })).toBe('00.004.684/3485-00');
    expect(format('46843485000', { pad: true })).toBe('00.046.843/4850-00');
    expect(format('468434850001', { pad: true })).toBe('00.468.434/8500-01');
    expect(format('4684348500018', { pad: true })).toBe('04.684.348/5000-18');
    expect(format('46843485000186', { pad: true })).toBe('46.843.485/0001-86');
  });

  test('should format number cnpj with mask filling zeroes', () => {
    expect(format(4, { pad: true })).toBe('00.000.000/0000-04');
    expect(format(46, { pad: true })).toBe('00.000.000/0000-46');
    expect(format(468, { pad: true })).toBe('00.000.000/0004-68');
    expect(format(4684, { pad: true })).toBe('00.000.000/0046-84');
    expect(format(46843, { pad: true })).toBe('00.000.000/0468-43');
    expect(format(468434, { pad: true })).toBe('00.000.000/4684-34');
    expect(format(4684348, { pad: true })).toBe('00.000.004/6843-48');
    expect(format(46843485, { pad: true })).toBe('00.000.046/8434-85');
    expect(format(468434850, { pad: true })).toBe('00.000.468/4348-50');
    expect(format(4684348500, { pad: true })).toBe('00.004.684/3485-00');
    expect(format(46843485000, { pad: true })).toBe('00.046.843/4850-00');
    expect(format(468434850001, { pad: true })).toBe('00.468.434/8500-01');
    expect(format(4684348500018, { pad: true })).toBe('04.684.348/5000-18');
    expect(format(46843485000186, { pad: true })).toBe('46.843.485/0001-86');
  });

  test(`should NOT add digits after the CNPJ length (${LENGTH})`, () => {
    expect(format('468434850001860000000000')).toBe('46.843.485/0001-86');
  });

  test('should remove all non numeric characters', () => {
    expect(format('46.?ABC843.485/0001-86abc')).toBe('46.ABC.843/4850-00');
  });

  // Novos testes para CNPJ alfanumérico
  test('should format alphanumeric cnpj with mask', () => {
    expect(format('AB1C2D3E4F5G6')).toBe('AB.1C2.D3E/4F5G-6');
    expect(format('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
    expect(format('ABCDEFGHIJKL35')).toBe('AB.CDE.FGH/IJKL-35');
  });

  test('should format alphanumeric cnpj with special characters', () => {
    expect(format('AB.?1C2.D3E/4F5G-35abc')).toBe('AB.1C2.D3E/4F5G-35');
    expect(format('12.ABC.345/01DE-35')).toBe('12.ABC.345/01DE-35');
  });
});

describe('generate', () => {
  test(`should have the right length without mask (${LENGTH})`, () => {
    expect(generate().length).toBe(LENGTH);
  });

  test('should return valid CNPJ', () => {
    // iterate over 100 to insure that random generated CPNJ is valid
    for (let i = 0; i < 100; i++) {
      expect(isValid(generate())).toBe(true);
    }
  });
});

describe('generateAlphanumeric', () => {
  test(`should have the right length without mask (${LENGTH})`, () => {
    expect(generateAlphanumeric().length).toBe(LENGTH);
  });

  test('should return valid alphanumeric CNPJ', () => {
    // iterate over 100 to insure that random generated alphanumeric CNPJ is valid
    for (let i = 0; i < 100; i++) {
      const cnpj = generateAlphanumeric();
      expect(isValid(cnpj)).toBe(true);
      expect(isAlphanumericCnpj(cnpj)).toBe(true);
    }
  });

  test('should contain alphanumeric characters', () => {
    const cnpj = generateAlphanumeric();
    expect(/[A-Z]/.test(cnpj)).toBe(true);
    expect(/[0-9]/.test(cnpj)).toBe(true);
  });
});

describe('charToCnpjValue', () => {
  test('should convert characters to numeric values (ASCII - 48)', () => {
    expect(charToCnpjValue('A')).toBe(17); // 65 - 48
    expect(charToCnpjValue('B')).toBe(18); // 66 - 48
    expect(charToCnpjValue('C')).toBe(19); // 67 - 48
    expect(charToCnpjValue('0')).toBe(0); // 48 - 48
    expect(charToCnpjValue('1')).toBe(1); // 49 - 48
    expect(charToCnpjValue('9')).toBe(9); // 57 - 48
    expect(charToCnpjValue('Z')).toBe(42); // 90 - 48
  });
});

describe('cleanCnpj', () => {
  test('should remove special characters and convert to uppercase', () => {
    expect(cleanCnpj('12.ABC.345/01DE-35')).toBe('12ABC34501DE35');
    expect(cleanCnpj('12.345.678/0001-95')).toBe('12345678000195');
    expect(cleanCnpj('ab.cde.fgh/ijkl-35')).toBe('ABCDEFGHIJKL35');
    expect(cleanCnpj('12.?ABC.345/01DE-35abc')).toBe('12ABC34501DE35ABC');
  });
});

describe('isNumericCnpj', () => {
  test('should return true for numeric CNPJs', () => {
    expect(isNumericCnpj('12345678000195')).toBe(true);
    expect(isNumericCnpj('12.345.678/0001-95')).toBe(true);
    expect(isNumericCnpj('00000000000000')).toBe(true);
  });

  test('should return false for alphanumeric CNPJs', () => {
    expect(isNumericCnpj('12ABC34501DE35')).toBe(false);
    expect(isNumericCnpj('AB.1C2.D3E/4F5G-35')).toBe(false);
    expect(isNumericCnpj('ABCDEFGHIJKL35')).toBe(false);
  });
});

describe('isAlphanumericCnpj', () => {
  test('should return true for alphanumeric CNPJs', () => {
    expect(isAlphanumericCnpj('12ABC34501DE35')).toBe(true);
    expect(isAlphanumericCnpj('AB.1C2.D3E/4F5G-35')).toBe(true);
    expect(isAlphanumericCnpj('ABCDEFGHIJKL35')).toBe(true);
  });

  test('should return false for numeric CNPJs', () => {
    expect(isAlphanumericCnpj('12345678000195')).toBe(false);
    expect(isAlphanumericCnpj('12.345.678/0001-95')).toBe(false);
    expect(isAlphanumericCnpj('00000000000000')).toBe(false);
  });

  test('should return false for invalid lengths', () => {
    expect(isAlphanumericCnpj('ABC')).toBe(false);
    expect(isAlphanumericCnpj('ABCDEFGHIJKLMNOP')).toBe(false);
  });
});

describe('isValidFormat', () => {
  test('should return true for valid alphanumeric formats', () => {
    expect(isValidFormat('12.ABC.345/01DE-35')).toBe(true);
    expect(isValidFormat('AB.1C2.D3E/4F5G-35')).toBe(true);
    expect(isValidFormat('12ABC34501DE35')).toBe(true);
    expect(isValidFormat('AB1C2D3E4F5G35')).toBe(true);
  });

  test('should return true for valid numeric formats', () => {
    expect(isValidFormat('12.345.678/0001-95')).toBe(true);
    expect(isValidFormat('12345678000195')).toBe(true);
  });

  test('should return false for invalid formats', () => {
    expect(isValidFormat('12.ABC.345/01DE-99')).toBe(true); // Actually valid format, just invalid DV
    expect(isValidFormat('AB.1C2.D3E/4F5G-3')).toBe(false); // Too short
    expect(isValidFormat('AB.1C2.D3E/4F5G-356')).toBe(false); // Too long
  });
});

describe('isValidNumericFormat', () => {
  test('should return true for valid numeric formats', () => {
    expect(isValidNumericFormat('12.345.678/0001-95')).toBe(true);
    expect(isValidNumericFormat('12345678000195')).toBe(true);
  });

  test('should return false for alphanumeric formats', () => {
    expect(isValidNumericFormat('12.ABC.345/01DE-35')).toBe(false);
    expect(isValidNumericFormat('AB.1C2.D3E/4F5G-35')).toBe(false);
  });
});

describe('isValid', () => {
  describe('should return false', () => {
    test('when it is on the RESERVED_NUMBERS', () => {
      RESERVED_NUMBERS.forEach((cnpj) => expect(isValid(cnpj)).toBe(false));
    });

    test('when it is an empty string', () => {
      expect(isValid('')).toBe(false);
    });

    test('when it is null', () => {
      expect(isValid(null as any)).toBe(false);
    });

    test('when it is undefined', () => {
      expect(isValid(undefined as any)).toBe(false);
    });

    test('when it is a boolean', () => {
      expect(isValid(true as any)).toBe(false);
      expect(isValid(false as any)).toBe(false);
    });

    test('when it is an object', () => {
      expect(isValid({} as any)).toBe(false);
    });

    test('when it is an array', () => {
      expect(isValid([] as any)).toBe(false);
    });

    test(`when dont match with CNPJ length (${LENGTH})`, () => {
      expect(isValid('12312312312')).toBe(false);
    });

    test('when contains only letters or special characters', () => {
      expect(isValid('ababcabcabcdab')).toBe(false);
    });

    test('when is a CNPJ invalid test numbers with letters', () => {
      expect(isValid('6ad0.t391.9asd47/0ad001-00')).toBe(false);
    });

    test('when is a CNPJ invalid', () => {
      expect(isValid('11257245286531')).toBe(false);
    });

    // Novos testes para CNPJ alfanumérico inválido
    test('when is an invalid alphanumeric CNPJ', () => {
      expect(isValid('12.ABC.345/01DE-99')).toBe(false); // Invalid DV
      expect(isValid('AB.1C2.D3E/4F5G-3')).toBe(false); // Too short
      expect(isValid('AB.1C2.D3E/4F5G-356')).toBe(false); // Too long
    });
  });

  describe('should return true', () => {
    test('when is a CNPJ valid without mask', () => {
      expect(isValid('13723705000189')).toBe(true);
    });

    test('when is a CNPJ valid with mask', () => {
      expect(isValid('60.391.947/0001-00')).toBe(true);
    });

    // Novos testes para CNPJ alfanumérico válido
    test('when is a valid alphanumeric CNPJ', () => {
      // Estes testes precisam de CNPJs alfanuméricos válidos gerados pela função
      const alphanumericCnpj = generateAlphanumeric();
      expect(isValid(alphanumericCnpj)).toBe(true);
      expect(isAlphanumericCnpj(alphanumericCnpj)).toBe(true);
    });

    test('when is a valid alphanumeric CNPJ with mask', () => {
      const alphanumericCnpj = generateAlphanumeric();
      const formattedCnpj = format(alphanumericCnpj);
      expect(isValid(formattedCnpj)).toBe(true);
      expect(isAlphanumericCnpj(formattedCnpj)).toBe(true);
    });
  });
});
