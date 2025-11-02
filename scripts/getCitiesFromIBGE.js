const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

// type City = {
//   id: number,
//   nome: string,
//   microrregiao: {
//     id: number,
//     nome: string,
//     mesorregiao: {
//       id: number,
//       nome: string,
//       UF: {
//         id: number,
//         sigla: string,
//         nome: string,
//         regiao: {
//           id: number,
//           sigla: string,
//           nome: string,
//         },
//       },
//     },
//   },
// };

const writeFile = (cities) =>
	fs.writeFileSync(
		path.resolve(__dirname, "..", "src/common/cities.ts"),
		`export const CITIES_DATA = ${JSON.stringify(cities, null, 2)}`,
	);

/**
 * https://servicodados.ibge.gov.br/api/docs/localidades?versao=1
 */
fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios")
	.then((res) => res.json())
	.then((json) => {
		const cities = json
			.sort((cityA, cityB) => (cityA.nome > cityB.nome ? 1 : -1))
			.reduce((acc, city) => {
				const stateInitials = city.microrregiao?.mesorregiao?.UF?.sigla;

				if (!stateInitials) return acc;

				if (!acc[stateInitials]) {
					acc[stateInitials] = [];
				}
				acc[stateInitials].push(city.nome);
				return acc;
			}, {});
		writeFile(cities);
	});
