import {createRoot} from 'react-dom/client';import {Dashboard,type Summary} from './App.js';import './style.css';
const response=await fetch('/summary.json');if(!response.ok)throw Error('Status data unavailable');const data=await response.json() as Summary;
createRoot(document.getElementById('root')!).render(<Dashboard data={data}/>);
