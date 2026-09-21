import { useEffect, useState } from "react";
import { CepField } from "./cep-field";
import { Field } from "./field";
import { useGetAddressByCep } from "./use-get-address-by-cep";

const EMPTY = { street: "", neighborhood: "", city: "", state: "" };
const STATUS = {
  idle: "",
  loading: "Looking it up…",
  found: "",
  failed: "No address for this CEP",
};

export function AddressForm() {
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState(EMPTY);
  const lookup = useGetAddressByCep(cep);

  // What the lookup found is what the form starts from; it stays editable from there.
  useEffect(() => {
    if (lookup.status === "found") setAddress(lookup.address);
    if (lookup.status === "failed") setAddress(EMPTY);
  }, [lookup]);

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <CepField value={cep} onChange={setCep} errorMessage={STATUS[lookup.status]} />

      {/* The same field the document field guide builds, told what it is about. */}
      <Field
        label="Street"
        autoComplete="address-line1"
        value={address.street}
        onChange={(street) => setAddress({ ...address, street })}
      />
      <Field
        label="Neighborhood"
        value={address.neighborhood}
        onChange={(neighborhood) => setAddress({ ...address, neighborhood })}
      />
      <Field
        label="City"
        autoComplete="address-level2"
        value={address.city}
        onChange={(city) => setAddress({ ...address, city })}
      />
      <Field
        label="State"
        autoComplete="address-level1"
        value={address.state}
        onChange={(state) => setAddress({ ...address, state })}
      />
    </form>
  );
}
