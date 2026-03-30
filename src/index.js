import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <h1>🛍️ Microshop</h1>
            <p>Добро пожаловать в интернет-магазин!</p>
            <div style={{ marginTop: '30px' }}>
                <button>Вход</button>
                <button style={{ marginLeft: '10px' }}>Регистрация</button>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);