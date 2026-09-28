let typed = input.value;
let position = input.selectionStart ?? typed.length;

// A deleted separator would come straight back: delete the character next to it.
if (inputType.startsWith("delete") && format(typed).length > typed.length) {
  if (inputType === "deleteContentBackward") position -= 1;
  typed = typed.slice(0, position) + typed.slice(position + 1);
}

// Formatting what comes before the caret says where the caret goes.
const caret = format(typed.slice(0, position)).length;

input.value = format(typed);
input.setSelectionRange(caret, caret);
