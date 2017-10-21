import React from 'react'
import stippend from 'lib/stippend'

export default class App extends React.Component {
  render() {
    const data = stippend({
      lordoMensile: 2000,
      lordoMensilePagaBase: 0,
      lordoMensileContingenza: 0,
      giorniMese: 31,
      giorniRetribuiti: 26,
      mensilitaAnno: 14,
      festivitaNonGodute: 0,
      apprendistato: false,
    })

    return (
      <div>
        <h2> Stippend </h2>
        <pre>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    )
  }
}
