// Equipos del Mundial 2026 (sorteo final, 5 dic 2025). 48 selecciones, 12 grupos
// A–L de 4. Datos rescatados de dotrino-pronostico-mundialista. El índice global
// es groupIndex*4 + posición de sorteo (0..3).

// [nombre, emoji, código FIFA] en orden de sorteo, grupo por grupo A..L.
const RAW = [
  [['México', '🇲🇽', 'MEX'], ['Sudáfrica', '🇿🇦', 'RSA'], ['Corea del Sur', '🇰🇷', 'KOR'], ['Chequia', '🇨🇿', 'CZE']],
  [['Canadá', '🇨🇦', 'CAN'], ['Bosnia y Herzegovina', '🇧🇦', 'BIH'], ['Catar', '🇶🇦', 'QAT'], ['Suiza', '🇨🇭', 'SUI']],
  [['Brasil', '🇧🇷', 'BRA'], ['Marruecos', '🇲🇦', 'MAR'], ['Haití', '🇭🇹', 'HAI'], ['Escocia', '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}', 'SCO']],
  [['Estados Unidos', '🇺🇸', 'USA'], ['Paraguay', '🇵🇾', 'PAR'], ['Australia', '🇦🇺', 'AUS'], ['Turquía', '🇹🇷', 'TUR']],
  [['Alemania', '🇩🇪', 'GER'], ['Curazao', '🇨🇼', 'CUW'], ['Costa de Marfil', '🇨🇮', 'CIV'], ['Ecuador', '🇪🇨', 'ECU']],
  [['Países Bajos', '🇳🇱', 'NED'], ['Japón', '🇯🇵', 'JPN'], ['Suecia', '🇸🇪', 'SWE'], ['Túnez', '🇹🇳', 'TUN']],
  [['Bélgica', '🇧🇪', 'BEL'], ['Egipto', '🇪🇬', 'EGY'], ['Irán', '🇮🇷', 'IRN'], ['Nueva Zelanda', '🇳🇿', 'NZL']],
  [['España', '🇪🇸', 'ESP'], ['Cabo Verde', '🇨🇻', 'CPV'], ['Arabia Saudita', '🇸🇦', 'KSA'], ['Uruguay', '🇺🇾', 'URU']],
  [['Francia', '🇫🇷', 'FRA'], ['Senegal', '🇸🇳', 'SEN'], ['Irak', '🇮🇶', 'IRQ'], ['Noruega', '🇳🇴', 'NOR']],
  [['Argentina', '🇦🇷', 'ARG'], ['Argelia', '🇩🇿', 'ALG'], ['Austria', '🇦🇹', 'AUT'], ['Jordania', '🇯🇴', 'JOR']],
  [['Portugal', '🇵🇹', 'POR'], ['RD Congo', '🇨🇩', 'COD'], ['Uzbekistán', '🇺🇿', 'UZB'], ['Colombia', '🇨🇴', 'COL']],
  [['Inglaterra', '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', 'ENG'], ['Croacia', '🇭🇷', 'CRO'], ['Ghana', '🇬🇭', 'GHA'], ['Panamá', '🇵🇦', 'PAN']],
]

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export const TEAMS = []
export const GROUPS = RAW.map((raw, gi) => {
  const letter = GROUP_LETTERS[gi]
  const teams = raw.map(([name, flag, code], pi) => {
    const team = { id: gi * 4 + pi, name, flag, code, group: letter }
    TEAMS.push(team)
    return team
  })
  return { letter, teams }
})

export const TEAM_BY_CODE = {}
TEAMS.forEach((t) => { TEAM_BY_CODE[t.code] = t })

export function teamByCode (code) { return TEAM_BY_CODE[code] || null }
