/**
 * Formats what has been typed and says where the caret goes, so typing, deleting or pasting
 * anywhere in the field works. Writing the result back is the caller's job.
 * @param {{ value: string, caret: number, inputType?: string, format: (value: string) => string }} params
 * @returns {{ value: string, caret: number }} The formatted value, and where the caret goes.
 */
export function mask({ value, caret, inputType = "", format }) {
  let typed = value;
  let position = caret;

  // A deleted separator would come straight back: delete the character next to it.
  if (inputType.startsWith("delete") && format(typed).length > typed.length) {
    if (inputType === "deleteContentBackward") position -= 1;
    typed = typed.slice(0, position) + typed.slice(position + 1);
  }

  // Formatting what comes before the caret says where the caret goes.
  return { value: format(typed), caret: format(typed.slice(0, position)).length };
}
