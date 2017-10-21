const roundTo = require('round-to')
const traph = require('traph').default

const max = Math.max
const min = Math.min

function percent(value) {
  return value / 100
}

function round2(v) {
  return roundTo(v, 2)
}

function round(v) {
  return Math.round(v)
}

function calcolaTassaScaglioni(valore, scaglioni) {
  if (!scaglioni.every(s => 'soglia' in s && 'tassa' in s)) throw new Error(`Please check the 'scaglioni' format: [{ soglia, tassa }, ...]`)
  return scaglioni.reduce((acc, { soglia, tassa }, i) => {
    const sogliaMax = scaglioni[i + 1] !== undefined ? scaglioni[i + 1].soglia : Infinity
    const valOltreSoglia = min(valore, sogliaMax) - soglia
    return acc + tassa * max(0, valOltreSoglia)
  }, 0)
}

function calcolaTassaIrpef({ imponibileFiscaleAnno }) {
  const tassatoAnno = calcolaTassaScaglioni(imponibileFiscaleAnno, [
    { soglia:     0, tassa: percent(23) },
    { soglia: 15000, tassa: percent(27) },
    { soglia: 28000, tassa: percent(38) },
    { soglia: 55000, tassa: percent(41) },
    { soglia: 75000, tassa: percent(43) },
  ])
  const tassatoMese = tassatoAnno / 12
  return tassatoMese
}

function calcolaDetrazioniIrpef({ giorniMese, lordoAnnuo }) {
  // TODO: Check
  const rapportoGiorni = giorniMese / giorniMese // cambia solo se lavori meno giorni l'anno
  if (lordoAnnuo <= 8000) {
    return 1880 / 365 * giorniMese
  } else if (lordoAnnuo <= 28000) {
    const quoziente = (28000 - lordoAnnuo) / 20000
    return (978 + 902 * quoziente) * rapportoGiorni / 365 * giorniMese
  } else if (lordoAnnuo <= 55000) {
    const quoziente = (55000 - lordoAnnuo) / 27000
    return 978 * quoziente * rapportoGiorni / 365 * giorniMese
  } else {
    return 0
  }
}

function calcolaContributiFapInps({ apprendistato, previdenzialeArrotondato }) {
  const aliquotaFap = apprendistato ? 5.84 : 9.19
  return percent(aliquotaFap) * previdenzialeArrotondato
}

function calcolaBonusRenzi({ redditoPresuntoAnnuo }) {
  // TODO: Check
  // const bonusFull = 80.00
  const bonusFull = 81.53 // WHY? :'(
  if (redditoPresuntoAnnuo <= 24000) {
    return bonusFull
  } else if (redditoPresuntoAnnuo > 24000 && redditoPresuntoAnnuo < 26000) {
    return (26000 - redditoPresuntoAnnuo) / (26000 - 24000) * bonusFull
  } else {
    return 0
  }
}

const stippend = traph({
  retribuzioneGiornaliera:     (i, o) => round2(i.lordoMensile / i.giorniRetribuiti),
  lordoMensile:                (i, o) => round2(i.lordoMensile),
  lordoAnnuo:                  (i, o) => round2(i.lordoMensile * i.mensilitaAnno),
  importoFestivitaNonGodute:   (i, o) => o.retribuzioneGiornaliera * i.festivitaNonGodute,
  previdenziale:               (i, o) => round2(i.lordoMensile + o.importoFestivitaNonGodute),
  previdenzialeArrotondato:    (i, o) => round(o.previdenziale),

  /* INPS */
  contributoFap: (i, o) => calcolaContributiFapInps({
    apprendistato: i.apprendistato,
    previdenzialeArrotondato: o.previdenzialeArrotondato,
  }),
  fondoEst: (i, o) => 2, // Fondo EST: 2 euro al mese
  // Non c'è talvolta ?
  // ctrSolidFondoResiduale: (i, o) => round2(percent(0.1667) * o.previdenzialeArrotondato),
  ctrSolidFondoResiduale: (i, o) => 0,
  totRitenuteSociali:     (i, o) => round2(o.contributoFap + o.ctrSolidFondoResiduale),
  // Non c'è talvolta ?
  // contributoEbt: (i, o) => round2(percent(0.05) * (i.lordoMensilePagaBase + i.lordoMensileContingenza)),
  contributoEbt:          (i, o) => 0,

  /* IRPEF */
  imponibileFiscaleMese:  (i, o) => o.previdenziale - o.totRitenuteSociali,
  imponibileFiscaleAnno:  (i, o) => o.imponibileFiscaleMese * 12,
  impostaIrpefLorda:      (i, o) => round2(calcolaTassaIrpef({ imponibileFiscaleAnno: o.imponibileFiscaleAnno })),
  detrazioniIrpef:        (i, o) => round2(calcolaDetrazioniIrpef({ giorniMese: i.giorniMese, lordoAnnuo: o.lordoAnnuo })),
  totIrpef:               (i, o) => o.impostaIrpefLorda - o.detrazioniIrpef,
  addizionaleRegionale:   (i, o) => 0, // TODO: calcolaAddizionaleRegionale({ imponibileFiscaleAnno: o.imponibileFiscaleAnno }),

  redditoPresuntoAnnuo:   (i, o) => o.imponibileFiscaleMese * 14,
  bonusRenzi:             (i, o) => calcolaBonusRenzi({ redditoPresuntoAnnuo: o.redditoPresuntoAnnuo }),

  /* TOTALI */
  ritenute: (i, o) => o.contributoFap +
                      o.ctrSolidFondoResiduale +
                      o.fondoEst +
                      o.contributoEbt +
                      o.totIrpef +
                      o.addizionaleRegionale,
  competenze: (i, o) => o.previdenziale + o.bonusRenzi,
  nettoMensile: (i, o) => round2(o.competenze - o.ritenute),
})

export default stippend
