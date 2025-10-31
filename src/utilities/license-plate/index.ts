const validMercosulLicensePlateRegex = /^[a-z]{3}[0-9]{1}[a-z]{1}[0-9]{2}$/i;
const validBrazilianLicensePlateRegex = /^[a-z]{3}-?[0-9]{4}$/i;

export function isValid(licensePlate: string): boolean {
  if (!licensePlate || typeof licensePlate !== 'string') return false;
  return validMercosulLicensePlateRegex.test(licensePlate) || validBrazilianLicensePlateRegex.test(licensePlate);
}
