const stippend = require('./lib/stippend')
const calcolaTassaIrpef = stippend.calcolaTassaIrpef

function assertQeq(a, b, t) {
  console.assert(Math.abs(a - b) < 1, `${a} !== ${b} ${t ? `-- ${t}` : ''}`)
}

assertQeq(calcolaTassaIrpef({ imponibileFiscaleAnno: 0 }) * 12, 0, '0k')
assertQeq(calcolaTassaIrpef({ imponibileFiscaleAnno: 5000 }) * 12, 0, '5k')
assertQeq(calcolaTassaIrpef({ imponibileFiscaleAnno: 15000 }) * 12, 15000 * 0.23, '15k')
assertQeq(calcolaTassaIrpef({ imponibileFiscaleAnno: 28000 }) * 12, 15000 * 0.23 + (28000 - 15000) * 0.27, '28k')
assertQeq(calcolaTassaIrpef({ imponibileFiscaleAnno: 35000 }) * 12, 15000 * 0.23 + (28000 - 15000) * 0.27 + (35000 - 28000) * 0.38, '35k')
