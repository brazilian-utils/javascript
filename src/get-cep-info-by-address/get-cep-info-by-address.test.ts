import { afterEach, beforeEach, describe, expect, it, vi } from "../_internals/test/runtime";
import {
	GetCepInfoByAddressError,
	GetCepInfoByAddressNotFoundError,
	GetCepInfoByAddressValidationError,
	getCepInfoByAddress,
} from "./get-cep-info-by-address";

describe("getCepInfoByAddress", () => {
	describe("error class names", () => {
		it("should set name to GetCepInfoByAddressError", () => {
			expect(new GetCepInfoByAddressError("message").name).toBe("GetCepInfoByAddressError");
		});

		it("should set name to GetCepInfoByAddressValidationError", () => {
			const error = new GetCepInfoByAddressValidationError("message");

			expect(error.name).toBe("GetCepInfoByAddressValidationError");
		});

		it("should set name to GetCepInfoByAddressNotFoundError", () => {
			const error = new GetCepInfoByAddressNotFoundError("message");

			expect(error.name).toBe("GetCepInfoByAddressNotFoundError");
		});
	});

	const fetchMock = vi.fn();
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = fetchMock as typeof fetch;
		fetchMock.mockClear();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	const mockSocketFailureOnce = () =>
		fetchMock.mockRejectedValueOnce(
			Object.assign(new TypeError("fetch failed"), {
				cause: { code: "UND_ERR_SOCKET" },
			}),
		);

	const SAMPLE_ADDRESS = {
		bairro: "Bela Vista",
		cep: "01310-100",
		localidade: "São Paulo",
		logradouro: "Avenida Paulista",
		uf: "SP",
	};

	const mockAddressListOnce = (addresses: unknown[]) =>
		fetchMock.mockResolvedValueOnce({ json: async () => addresses, ok: true });

	it("should validate UF before fetching", async () => {
		await expect(
			getCepInfoByAddress({
				federalUnit: "XX",
				city: "São Paulo",
				street: "Avenida Paulista",
			}),
		).rejects.toThrow(GetCepInfoByAddressValidationError);
	});

	it("should include the invalid UF in the validation error message", async () => {
		await expect(
			getCepInfoByAddress({
				federalUnit: "XX",
				city: "São Paulo",
				street: "Avenida Paulista",
			}),
		).rejects.toThrow("Invalid UF: XX");
	});

	it("should accept a federal unit with surrounding whitespace and lowercase letters", async () => {
		mockAddressListOnce([SAMPLE_ADDRESS]);

		await expect(
			getCepInfoByAddress({ federalUnit: " sp ", city: "São Paulo", street: "Avenida Paulista" }),
		).resolves.toBeDefined();
	});

	it("should build the URL from a trimmed, accent-stripped city and street", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => [],
		});

		await getCepInfoByAddress({
			federalUnit: "SP",
			city: "  São Paulo  ",
			street: "  Àvenida Paulista  ",
		}).catch(() => undefined);

		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe(
			`https://viacep.com.br/ws/SP/${encodeURIComponent("Sao Paulo")}/${encodeURIComponent("Avenida Paulista")}/json/`,
		);
	});

	it("should throw GetCepInfoByAddressValidationError for an empty city", async () => {
		await expect(
			getCepInfoByAddress({
				federalUnit: "SP",
				city: "",
				street: "Avenida Paulista",
			}),
		).rejects.toThrow(GetCepInfoByAddressValidationError);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("should throw GetCepInfoByAddressValidationError for an empty street", async () => {
		await expect(
			getCepInfoByAddress({
				federalUnit: "SP",
				city: "São Paulo",
				street: "",
			}),
		).rejects.toThrow(GetCepInfoByAddressValidationError);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("should include the message when city or street is missing", async () => {
		await expect(
			getCepInfoByAddress({
				federalUnit: "SP",
				city: "São Paulo",
				street: "",
			}),
		).rejects.toThrow("City and street are required");
	});

	it("should throw specifically GetCepInfoByAddressError (not a subclass) when the response is not ok", async () => {
		fetchMock.mockResolvedValueOnce({
			json: async () => ({}),
			ok: false,
			status: 500,
		});

		const rejection = await getCepInfoByAddress({
			federalUnit: "SP",
			city: "São Paulo",
			street: "Avenida Paulista",
		}).then(
			() => undefined,
			(error: unknown) => error,
		);

		expect(rejection).toBeInstanceOf(GetCepInfoByAddressError);
		expect((rejection as Error).message).toBe("ViaCEP request failed with status 500");
		expect(rejection instanceof GetCepInfoByAddressNotFoundError).toBe(false);
	});

	it("should throw GetCepInfoByAddressNotFoundError with the UF, city and street in the message when ViaCEP returns an empty array", async () => {
		mockAddressListOnce([]);

		await expect(
			getCepInfoByAddress({
				federalUnit: "SP",
				city: "Cidade Inexistente",
				street: "Rua Inexistente",
			}),
		).rejects.toThrow(GetCepInfoByAddressNotFoundError);

		mockAddressListOnce([]);

		await expect(
			getCepInfoByAddress({
				federalUnit: "SP",
				city: "Cidade Inexistente",
				street: "Rua Inexistente",
			}),
		).rejects.toThrow("SP - Cidade Inexistente - Rua Inexistente");
	});

	it("should return addresses from ViaCEP", async () => {
		mockAddressListOnce([SAMPLE_ADDRESS]);

		await expect(
			getCepInfoByAddress({
				federalUnit: "SP",
				city: "São Paulo",
				street: "Avenida Paulista",
			}),
		).resolves.toEqual([SAMPLE_ADDRESS]);
	});

	it("should retry and then propagate transport failures unwrapped", async () => {
		mockSocketFailureOnce();
		mockSocketFailureOnce();
		mockSocketFailureOnce();

		await expect(
			getCepInfoByAddress({
				federalUnit: "SP",
				city: "São Paulo",
				street: "Avenida Paulista",
			}),
		).rejects.toThrow(TypeError);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});
