import { render } from 'preact'
import { Chart } from './chart.jsx'
import './style.css'

function App(props){
  return (
    <>
      <Chart/>
    </>
  )
}

render(<App />, document.getElementById('app'))
