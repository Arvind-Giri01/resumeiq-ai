/// <reference types="vite/client" />

import { createRoot } from 'react-dom/client';
import Analyzer from './app/analyzer';
import './app/globals.css';

const apiBase = (import.meta.env.VITE_RESUMEIQ_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const root = document.getElementById('root');
if (!root) throw new Error('ResumeIQ app root is missing.');

createRoot(root).render(<Analyzer apiBase={apiBase} />);
