import React from 'react'
import { Viz, SubViz, injectRescale } from 'react-dataviz'
import { range } from 'lodash/fp'
import { scaleLinear } from 'd3-scale'
import stippend from 'lib/stippend'
import numeral from 'numeral'

function stip(lordoMensile) {
  return stippend({
    lordoMensile,
    lordoMensilePagaBase: 0,
    lordoMensileContingenza: 0,
    giorniMese: 31,
    giorniRetribuiti: 26,
    mensilitaAnno: 14,
    festivitaNonGodute: 0,
    apprendistato: false,
  })
}

const DataPolyline = injectRescale(function XScale({ rescale, scales, dataSeries, x = 'x', y = 'y', scaleX = x, scaleY = y, ...props }) {
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

const Axis = injectRescale(function Axis({ rescale, scale, ticks = 5, position = 'l', offset = 10, color = 'black', grid = false, format = '0' }) {
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
          <text x={pos.x(t)} y={pos.y(t)} fontFamily="sans-serif" fill={color} {...tickAnchor}>
            {numeral(t).format(format)}
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
        if (opts.forceMin && k in opts.forceMin) min = opts.forceMin[k]
        if (opts.forceMax && k in opts.forceMax) min = opts.forceMax[k]
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

export default class App extends React.Component {
  render() {
    const xs = range(10, 80 + 1).map(n => n * 1000 / 14)
    const dataSeries = xs.map((x) => ({ lordoMensile: x, ...stip(x) }))
    const scales = fastScales(dataSeries, {
      forceMin: { nettoMensile: 0 },
    })

    return (
      <div>
        <h2 style={{ fontFamily: 'sans-serif' }}>Stippend</h2>

        <Viz height="500">
          <SubViz from={[0, 0]} to={[1, 1]} flipY margin={80}>
            <Axis position="b" scale={scales.lordoAnnuo} offset={30} format="0a" />
            <Axis position="b" grid scale={scales.lordoMensile} format="0a" color="steelblue" />
            <Axis position="l" grid scale={scales.nettoMensile} format="0[.]0a" color="steelblue" />

            {rescale => (
              <polyline
                points={[rescale.x(scales.lordoAnnuo(36e3)), rescale.y(0), rescale.x(scales.lordoAnnuo(36e3)), rescale.y(1)].join(',')}
                fill="none"
                stroke="rgba(255, 255, 0, 0.3)"
                strokeWidth="3"
              />
            )}

            <FixProps dataSeries={dataSeries} scales={scales} x="lordoAnnuo" scaleY="nettoMensile">
              <DataPolyline y="nettoSenzaBonus" stroke="blue" />
              <DataPolyline y="nettoMensile" stroke="steelblue" />

              <DataPolyline y="competenze" stroke="green" />
              <DataPolyline y="ritenute" stroke="red" />
              <DataPolyline y="impostaIrpefLorda" stroke="magenta" />
              <DataPolyline y="contributoFap" stroke="magenta" />
            </FixProps>

            <Axis scale={scales.percentualeTasse} position="r" format="0%" color="gold" />
            <DataPolyline dataSeries={dataSeries} scales={scales} x="lordoAnnuo" y="percentualeTasse" stroke="gold" />
          </SubViz>
        </Viz>
      </div>
    )
  }
}
