import { Component, computed, signal } from "@angular/core";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

@Component({
  selector: "app-cpf-field",
  template: `
    <label>
      CPF
      <input [value]="cpf()" (input)="onInput($event)" inputmode="numeric" />
      @if (cpf().length === 14) {
        <span>{{ valid() ? "✓ Valid CPF" : "✗ Invalid CPF" }}</span>
      }
    </label>
  `,
})
export class CpfFieldComponent {
  readonly cpf = signal("");
  readonly valid = computed(() => isValidCpf(this.cpf()));

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.cpf.set(formatCpf(input.value));
    input.value = this.cpf();
  }
}
