import { useId, useState } from "react";
import {
  formatCep,
  getAddressInfoByCep,
  isValidCep,
} from "@brazilian-utils/brazilian-utils";

const EMPTY = { street: "", neighborhood: "", city: "", state: "" };

export function AddressForm() {
  const id = useId();
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState(EMPTY);
  const [status, setStatus] = useState("");

  async function onCepChange(typed: string) {
    const masked = formatCep(typed);

    setCep(masked);

    // The lookup is worth a request only once the CEP is complete.
    if (!isValidCep(masked)) return setStatus("");

    setStatus("Looking up…");

    try {
      const found = await getAddressInfoByCep(masked);

      setAddress(found);
      setStatus("");
    } catch {
      setAddress(EMPTY);
      setStatus("No address for this CEP");
    }
  }

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <label htmlFor={id}>CEP</label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        value={cep}
        aria-describedby={`${id}-status`}
        onChange={(event) => onCepChange(event.currentTarget.value)}
      />
      {/* On the page from the start, and announced when it gets its text. */}
      <output id={`${id}-status`}>{status}</output>

      <label htmlFor={`${id}-street`}>Street</label>
      <input
        id={`${id}-street`}
        autoComplete="address-line1"
        value={address.street}
        onChange={(event) =>
          setAddress({ ...address, street: event.currentTarget.value })
        }
      />

      <label htmlFor={`${id}-neighborhood`}>Neighborhood</label>
      <input
        id={`${id}-neighborhood`}
        value={address.neighborhood}
        onChange={(event) =>
          setAddress({ ...address, neighborhood: event.currentTarget.value })
        }
      />

      <label htmlFor={`${id}-city`}>City</label>
      <input
        id={`${id}-city`}
        autoComplete="address-level2"
        value={address.city}
        onChange={(event) => setAddress({ ...address, city: event.currentTarget.value })}
      />

      <label htmlFor={`${id}-state`}>State</label>
      <input
        id={`${id}-state`}
        autoComplete="address-level1"
        maxLength={2}
        value={address.state}
        onChange={(event) => setAddress({ ...address, state: event.currentTarget.value })}
      />
    </form>
  );
}
