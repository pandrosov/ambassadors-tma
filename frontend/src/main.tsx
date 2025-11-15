import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 React приложение запускается...');
console.log('Hostname:', window.location.hostname);
console.log('URL:', window.location.href);

// Проверяем наличие root элемента
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root элемент не найден!');
} else {
  console.log('✅ Root элемент найден');
  
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log('✅ React приложение отрендерено');
  } catch (error) {
    console.error('❌ Ошибка при рендеринге:', error);
  }
}

