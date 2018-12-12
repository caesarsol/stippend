import React from 'react'
import { Viz, SubViz, injectRescale } from 'react-dataviz'
import { range } from 'lodash/fp'
import { mapValues } from 'lodash'
import { scaleLinear } from 'd3-scale'
import stippend from 'lib/stippend'
import numeral from 'numeral'

const DataPolyline = injectRescale(function DataPolylineRescaled({ rescale, scales, dataSeries, x = 'x', y = 'y', scaleX = x, scaleY = y, ...props }) {
  const dataPoints = dataSeries.map(d => [
    rescale.x(scales[scaleX](d[x])),
    rescale.y(scales[scaleY](d[y])),
  ].join(',')).join(' ')

  return (
    <polyline
      points={dataPoints}
      fill="none"
      stroke="steelblue"
      strokeWidth="2"
      {...props}
    />
  )
})

const Axis = injectRescale(function AxisRescaled({ rescale, scale, ticks = 5, position = 'l', offset = 10, color = 'black', grid = false, format = '0', postfix = '' }) {
  const possiblePositions = {
    b: { x: t => rescale.x(scale(t)), y: t => rescale.y(0) + offset },
    l: { x: t => rescale.x(0) - offset, y: t => rescale.y(scale(t)) },
    t: { x: t => rescale.x(scale(t)), y: t => rescale.y(1) - offset },
    r: { x: t => rescale.x(1) + offset, y: t => rescale.y(scale(t)) },
  }
  const pos = possiblePositions[position]
  function anchor(pp) {
    console.assert(pp.length === 2)
    let horiz, vert
    if (pp.includes('c')) {
      horiz = 'middle'
      vert = 'central'
    }
    if (pp.includes('l')) horiz = 'start'
    if (pp.includes('r')) horiz = 'end'
    if (pp.includes('t')) vert = 'hanging'
    if (pp.includes('b')) vert = 'baseline'
    return {
      textAnchor: horiz,
      alignmentBaseline: vert,
    }
  }
  const tickAnchor = {
    b: anchor('tc'),
    l: anchor('cr'),
    t: anchor('bc'),
    r: anchor('cl'),
  }[position]

  return (
    <g className="-scale">
      {scale.ticks(ticks).map(t => (
        <g key={t}>
          <text x={pos.x(t)} y={pos.y(t)} fontFamily="sans-serif" fontSize="13" fill={color} {...tickAnchor}>
            {numeral(t).format(format)}{postfix}
          </text>

          {grid && (
            'bt'.includes(position)
            ? (
              <polyline
                points={[pos.x(t), rescale.y(0), pos.x(t), rescale.y(1)].join(',')}
                fill="none"
                stroke="rgba(0, 0, 0, 0.1)"
              />
            ) : (
              <polyline
                points={[rescale.x(0), pos.y(t), rescale.x(1), pos.y(t)].join(',')}
                fill="none"
                stroke="rgba(0, 0, 0, 0.1)"
              />
            )
          )}
        </g>
      ))}
    </g>
  )
})

function fastScales(dataSeries, opts = {}) {
  const keys = Object.keys(dataSeries[0])

  const extents = dataSeries.reduce((extentsAcc, datum, i) => {
    keys.forEach(k => {
      const v = datum[k]
      if (i === 0) {
        extentsAcc[k] = [v, v]
      } else {
        let [min, max] = extentsAcc[k]
        if (k in opts && 'min' in opts[k]) min = opts[k].min
        if (k in opts && 'max' in opts[k]) max = opts[k].max
        extentsAcc[k] = [Math.min(v, min), Math.max(v, max)]
      }
    })
    return extentsAcc
  }, {})
  const scales = keys.reduce((scalesAcc, k) => {
    scalesAcc[k] = scaleLinear().domain(extents[k]).range([0, 1]).nice()
    return scalesAcc
  }, {})
  return scales
}

function FixProps({ children, ...props }) {
  return React.Children.map(children, child => React.cloneElement(child, props))
}

function Chart() {
  const xs = range(1, 5 + 1).map(n => n * 1e3)
  const dataSeries = xs.map(lordoMensile => ({
    lordoMensile,
    ...stippend({
      lordoMensile,
      lordoMensilePagaBase: 0,
      lordoMensileContingenza: 0,
      giorniMese: 31,
      giorniRetribuiti: 26,
      mensilitaAnno: 14,
      festivitaNonGodute: 0,
      apprendistato: false,
    }),
  })).filter(({ nettoMensile }) => nettoMensile >= 1e3 && nettoMensile <= 5e3)
  const scales = fastScales(dataSeries, {
    nettoMensile: { min: 1e3, max: 5e3 },
  })

  return (
    <Viz>
      <SubViz from={[0, 0]} to={[1, 1]} flipY margin={80}>
        {/* <Axis position="b" scale={scales.lordoAnnuo} offset={30} format="0[.]0a" postfix=" RAL" color="steelblue" /> */}
        <Axis position="b" grid scale={scales.lordoMensile} format="0[.]0a" postfix="/M lrd" />
        <Axis position="l" grid scale={scales.nettoMensile} format="0[.]0a" postfix="/M net" />

        <FixProps dataSeries={dataSeries} scales={scales} x="lordoAnnuo" scaleY="nettoMensile">
          <DataPolyline y="nettoSenzaBonus" stroke="blue" />
          <DataPolyline y="nettoMensile" stroke="steelblue" />
        </FixProps>
      </SubViz>
    </Viz>
  )
}

function eventValueExtractor(fn) {
  return (e) => fn(e.target.value)
}

function buildSetState(that, stateSlice) {
  if (typeof stateSlice === 'string') return (a) => that.setState({ [stateSlice]: a })
  if (typeof stateSlice === 'function') return (...a) => that.setState(stateSlice(...a))
  return () => that.setState(stateSlice)
}

const fieldMap = {
  lordoAnnuo:                `RAL (Reddito Annuo Lordo)`,
  lordoMensile:              `Lordo mensile`,
  lordoMensilePagaBase:      `Paga base (Lordo mensile)`,
  lordoMensileContingenza:   `Contingenza (Lordo mensile)`,
  importoFestivitaNonGodute: `Importo festività non godute`,
  giorniMese:                `Giorni del mese totali`,
  giorniRetribuiti:          `Giorni lavorativi del mese`,
  mensilitaAnno:             `Mensilità annue`,
  festivitaNonGodute:        `Festività non godute`,
  apprendistato:             `Apprendistato?`,

  retribuzioneGiornaliera:   `Retribuzione giornaliera`,
  previdenziale:             `Previdenziale non arrotondato`,
  previdenzialeArrotondato:  `Previdenziale arrotondato`,

  contributoFap:             `Contributo FAP (INPS)`,
  fondoEst:                  `Fondo EST c/o dipendente`,
  totRitenuteSociali:       `Totale ritenute sociali (INPS)`,

  imponibileFiscaleMese:    `Imponibile fiscale mese`,
  impostaIrpefLorda:        `Imposta IRPEF lorda`,
  detrazioniIrpef:          `Detrazioni IRPEF`,
  totIrpef:                 `Totale IRPEF (cod 1001)`,

  redditoPresuntoAnnuo:     `Reddito presunto annuo (per Bonus Renzi)`,
  bonusRenzi:               `Bonus Renzi (art 1 DL 66/2014)`,

  ritenute:                 `Ritenute`,
  competenze:               `Competenze`,
  nettoMensile:             `Stipendio netto`,
}

function zeroize(v) {
  if (!v) return 0
  else return v
}

function toNumberIfNumber(v) {
  const n = parseFloat(v)
  if (String(n) === String(v)) return n
  return v
}

export default class App extends React.Component {
  state = {
    lordoMensile: 2000,
    lordoMensilePagaBase: 0,
    lordoMensileContingenza: 0,
    giorniMese: 31,
    giorniRetribuiti: 26,
    mensilitaAnno: 14,
    festivitaNonGodute: 0,
    apprendistato: 0,
  }

  render() {
    const input = this.state
    const output = stippend(mapValues(input, (x) => zeroize(toNumberIfNumber(x))))

    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1 style={{ marginBottom: 0 }}>
          stippend – stima stipendio
        </h1>
        <small>CCNL Commercio</small>

        <div style={{ display: 'flex' }}>
          <div style={{ width: '50%' }}>
            <h2>Input</h2>

            {Object.keys(input).map((k, i) => (
              <div key={k} style={{ padding: '0.5em 0' }}>
                <label>
                  <div><strong>{fieldMap[k]}</strong></div>
                  <input
                    type="number"
                    value={input[k]}
                    onChange={eventValueExtractor(buildSetState(this, k))}
                    style={{ width: '90%', height: '1em', fontSize: 'inherit' }}
                  />
                </label>
              </div>
            ))}
          </div>

          <div style={{ width: '50%' }}>
            <h2>Output</h2>

            {Object.keys(output).filter(k => fieldMap[k]).map((k, i) => (
              <div key={k} style={{ background: i % 2 ? 'white' : '#f9f9f9', padding: '0.5em' }}>
                <div style={{ display: 'inline-block', width: '50%' }}>
                  <strong>{fieldMap[k]}</strong>
                </div>
                <div style={{ display: 'inline-block', width: '50%' }}>
                  {output[k].toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '50vw', height: '50vw' }}>
          <Chart />
        </div>
      </div>
    )
  }
}
