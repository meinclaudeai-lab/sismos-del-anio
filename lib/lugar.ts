const RUMBOS: Record<string, string> = {
  N: "N", NNE: "NNE", NE: "NE", ENE: "ENE", E: "E", ESE: "ESE", SE: "SE", SSE: "SSE",
  S: "S", SSW: "SSO", SW: "SO", WSW: "OSO", W: "O", WNW: "ONO", NW: "NO", NNW: "NNO",
};

/** Nombres en inglés que usa USGS → código ISO 3166-1 alfa-2. */
const PAISES_ISO: Record<string, string> = {
  Afghanistan: "AF", Burma: "MM", "Burma (Myanmar)": "MM", "Myanmar (Burma)": "MM", Algeria: "DZ", Argentina: "AR", Australia: "AU", Bangladesh: "BD", Bolivia: "BO",
  Brazil: "BR", Canada: "CA", Chile: "CL", China: "CN", Colombia: "CO", "Costa Rica": "CR", Cuba: "CU",
  "Dominican Republic": "DO", Ecuador: "EC", "El Salvador": "SV", Ethiopia: "ET", Fiji: "FJ",
  "French Polynesia": "PF", Greece: "GR", Guatemala: "GT", Haiti: "HT", Honduras: "HN", Iceland: "IS",
  India: "IN", Indonesia: "ID", Iran: "IR", Iraq: "IQ", Italy: "IT", Jamaica: "JM", Japan: "JP",
  Kazakhstan: "KZ", Kyrgyzstan: "KG", Malaysia: "MY", Mexico: "MX", Mongolia: "MN", Morocco: "MA",
  Myanmar: "MM", Nepal: "NP", "New Caledonia": "NC", "New Zealand": "NZ", Nicaragua: "NI",
  "Northern Mariana Islands": "MP", Pakistan: "PK", Panama: "PA", "Papua New Guinea": "PG", Peru: "PE",
  Philippines: "PH", Portugal: "PT", "Puerto Rico": "PR", Russia: "RU", Samoa: "WS", "American Samoa": "AS",
  "Solomon Islands": "SB", "South Africa": "ZA", "South Georgia and the South Sandwich Islands": "GS",
  "South Korea": "KR", "North Korea": "KP", Spain: "ES", Taiwan: "TW", Tajikistan: "TJ", Tonga: "TO",
  Turkey: "TR", "Türkiye": "TR", Vanuatu: "VU", Venezuela: "VE", Vietnam: "VN", "Wallis and Futuna": "WF",
  Guam: "GU", Micronesia: "FM", Palau: "PW", Kiribati: "KI", Tuvalu: "TV", "Timor Leste": "TL",
  "East Timor": "TL", Uzbekistan: "UZ", Turkmenistan: "TM", Georgia: "GE", Armenia: "AM", Azerbaijan: "AZ",
  Yemen: "YE", Oman: "OM", Egypt: "EG", Libya: "LY", Tanzania: "TZ", Kenya: "KE", Mozambique: "MZ",
  Malawi: "MW", Zambia: "ZM", Congo: "CG", "Democratic Republic of the Congo": "CD", Uganda: "UG",
  Burundi: "BI", Rwanda: "RW", Djibouti: "DJ", Eritrea: "ER", Somalia: "SO", Sudan: "SD", Albania: "AL",
  Bulgaria: "BG", Romania: "RO", Serbia: "RS", Croatia: "HR", "Bosnia and Herzegovina": "BA",
  Montenegro: "ME", "North Macedonia": "MK", Cyprus: "CY", Syria: "SY", Lebanon: "LB", Israel: "IL",
  Jordan: "JO", "Saudi Arabia": "SA", Bhutan: "BT", "Sri Lanka": "LK", Thailand: "TH", Laos: "LA",
  Cambodia: "KH", Brunei: "BN", "Cook Islands": "CK", Niue: "NU", Norway: "NO", Svalbard: "SJ",
  Greenland: "GL", "Trinidad and Tobago": "TT", Barbados: "BB", Martinique: "MQ", Guadeloupe: "GP",
  Dominica: "DM", "Saint Lucia": "LC", Grenada: "GD", Antarctica: "AQ", Bouvet: "BV",
};

/** Estados de EE. UU. y otras regiones que USGS escribe en lugar del país. */
const REGIONES_PAIS: Record<string, string> = {
  Alaska: "US", California: "US", Hawaii: "US", Nevada: "US", Oregon: "US", Washington: "US", Utah: "US",
  Idaho: "US", Montana: "US", Wyoming: "US", "New Mexico": "US", Texas: "US", Oklahoma: "US", "U.S. Virgin Islands": "VI",
  "Kuril Islands": "RU", "Kermadec Islands": "NZ", "Bonin Islands": "JP", "Izu Islands": "JP", "Ryukyu Islands": "JP",
  "Loyalty Islands": "NC", "Fiji region": "FJ", "Tonga region": "TO", "Vanuatu region": "VU",
  "Molucca Sea": "ID", "Banda Sea": "ID", "Flores Sea": "ID", "Java Sea": "ID",
  "South Sandwich Islands": "GS", "South Shetland Islands": "AQ", "Easter Island": "CL", "Galápagos Islands": "EC",
  "Kamchatka": "RU", "Komandorskiye Ostrova": "RU", "Andreanof Islands": "US", "Rat Islands": "US",
  "Fox Islands": "US", "Aleutian Islands": "US", Mindanao: "PH", Luzon: "PH", Sumatra: "ID", Java: "ID",
  Sulawesi: "ID", "Papua": "ID", "New Britain": "PG", "New Ireland": "PG", Bougainville: "PG",
  "Mariana Islands": "MP", Xizang: "CN", Tibet: "CN", "western Xizang": "CN", Hokkaido: "JP", Honshu: "JP",
  Kyushu: "JP", Taiwan: "TW", "Mid-Atlantic Ridge": "", "East Pacific Rise": "", "Pacific-Antarctic Ridge": "",
};

/** Frases genéricas de USGS (sin país). */
const FRASES: [RegExp, string][] = [
  [/^central Mid-Atlantic Ridge$/i, "Dorsal Mesoatlántica central"],
  [/^northern Mid-Atlantic Ridge$/i, "Dorsal Mesoatlántica norte"],
  [/^southern Mid-Atlantic Ridge$/i, "Dorsal Mesoatlántica sur"],
  [/^North Atlantic Ocean$/i, "Océano Atlántico norte"],
  [/^South Atlantic Ocean$/i, "Océano Atlántico sur"],
  [/^southern East Pacific Rise$/i, "Dorsal del Pacífico Oriental sur"],
  [/^central East Pacific Rise$/i, "Dorsal del Pacífico Oriental central"],
  [/^northern East Pacific Rise$/i, "Dorsal del Pacífico Oriental norte"],
  [/^Pacific-Antarctic Ridge$/i, "Dorsal Pacífico-Antártica"],
  [/^southeast Indian Ridge$/i, "Dorsal del Índico Sudeste"],
  [/^southwest Indian Ridge$/i, "Dorsal del Índico Suroeste"],
  [/^Carlsberg Ridge$/i, "Dorsal de Carlsberg"],
  [/^south of the Kermadec Islands$/i, "Al sur de las Islas Kermadec"],
  [/^south of the Fiji Islands$/i, "Al sur de las Islas Fiyi"],
  [/^south of Panama$/i, "Al sur de Panamá"],
  [/^Owen Fracture Zone region$/i, "Zona de fractura de Owen"],
  [/^Drake Passage$/i, "Paso de Drake"],
  [/^Scotia Sea$/i, "Mar de Escocia"],
];

const REGIONES_ES: Record<string, string> = {
  "Bonin Islands": "Islas Bonin", "Kuril Islands": "Islas Kuriles", "Kermadec Islands": "Islas Kermadec",
  "Loyalty Islands": "Islas de la Lealtad", "South Sandwich Islands": "Islas Sandwich del Sur",
  "South Shetland Islands": "Islas Shetland del Sur", "Easter Island": "Isla de Pascua",
  "Aleutian Islands": "Islas Aleutianas", "Andreanof Islands": "Islas Andreanof", "Rat Islands": "Islas Rata",
  "Fox Islands": "Islas Fox", "Mariana Islands": "Islas Marianas", "Molucca Sea": "Mar de Molucas",
  "Banda Sea": "Mar de Banda", "Flores Sea": "Mar de Flores", "Java Sea": "Mar de Java",
  "Izu Islands": "Islas Izu", "Ryukyu Islands": "Islas Ryukyu", "Kamchatka": "Kamchatka",
  "Fiji region": "región de Fiyi", "Tonga region": "región de Tonga", "Vanuatu region": "región de Vanuatu",
  "Japan region": "región de Japón", Xizang: "Xizang (Tíbet)", "western Xizang": "oeste de Xizang (Tíbet)",
  Alaska: "Alaska", California: "California", Hawaii: "Hawái",
};

/** Océano para las frases genéricas de dorsales y mares abiertos. */
function oceano(lugar: string): string {
  if (/atlántic/i.test(lugar)) return "Océano Atlántico";
  if (/pacífic|Kermadec|Fiyi|Panamá/i.test(lugar)) return "Océano Pacífico";
  if (/Índico|Carlsberg|Owen/.test(lugar)) return "Océano Índico";
  if (/Drake|Escocia/.test(lugar)) return "Océano Austral";
  return "";
}

let nombresPais: Intl.DisplayNames | null = null;
export function nombrePais(iso: string): string {
  if (!iso) return "";
  nombresPais ??= new Intl.DisplayNames(["es"], { type: "region" });
  try {
    return nombresPais.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

export type LugarTraducido = { lugar: string; pais: string; iso: string };

function traducirRegion(region: string): { texto: string; iso: string } {
  const r = region.trim();
  const iso = PAISES_ISO[r];
  if (iso) return { texto: nombrePais(iso), iso };
  const regionIso = REGIONES_PAIS[r];
  if (regionIso !== undefined) return { texto: REGIONES_ES[r] ?? r, iso: regionIso };
  const m = r.match(/^(.*) region$/);
  if (m && PAISES_ISO[m[1]]) return { texto: `región de ${nombrePais(PAISES_ISO[m[1]])}`, iso: PAISES_ISO[m[1]] };
  return { texto: REGIONES_ES[r] ?? r, iso: "" };
}

/**
 * "20 km W of Catia La Mar, Venezuela" → "A 20 km al O de Catia La Mar, Venezuela".
 * Si no reconoce el formato, devuelve el texto original.
 */
export function traducirLugar(place: string | null | undefined): LugarTraducido {
  // Eventos con nombre propio en USGS: "2025 Mandalay, Burma (Myanmar) Earthquake" → "Mandalay, Burma (Myanmar)".
  const p = (place ?? "")
    .trim()
    .replace(/^\d{4}\s+(.+?)\s+Earthquake$/i, "$1");
  if (!p) return { lugar: "Lugar sin especificar", pais: "", iso: "" };

  for (const [re, es] of FRASES) if (re.test(p)) return { lugar: es, pais: oceano(es), iso: "" };

  const partes = p.split(",").map((s) => s.trim());
  const cola = partes.length > 1 ? partes[partes.length - 1] : "";
  const cabeza = partes.length > 1 ? partes.slice(0, -1).join(", ") : partes[0];

  const reg = cola ? traducirRegion(cola) : { texto: "", iso: "" };
  const pais = reg.iso ? nombrePais(reg.iso === "US" ? "US" : reg.iso) : "";

  const m = cabeza.match(/^(\d+(?:\.\d+)?)\s*km\s+([NSEW]{1,3})\s+of\s+(.+)$/i);
  let lugar: string;
  if (m) {
    const rumbo = RUMBOS[m[2].toUpperCase()] ?? m[2];
    lugar = `A ${m[1]} km al ${rumbo} de ${m[3]}`;
  } else if (!cola) {
    const solo = traducirRegion(cabeza);
    return { lugar: solo.texto, pais: solo.iso ? nombrePais(solo.iso) : "", iso: solo.iso };
  } else {
    lugar = traducirRegion(cabeza).texto;
  }
  return { lugar: cola ? `${lugar}, ${reg.texto}` : lugar, pais, iso: reg.iso };
}

/** Para emparejar con Wikipedia: nombre en inglés del país a partir del texto de USGS. */
export function paisIngles(place: string | null | undefined): string {
  const partes = (place ?? "").replace(/^\d{4}\s+(.+?)\s+Earthquake$/i, "$1").split(",").map((s) => s.trim());
  return partes[partes.length - 1].replace(/ region$/, "");
}
