import React, { useState, useEffect } from 'react';
import '../styles/CountdownTimer.css'; // Importar los estilos

const CountdownTimer = () => {
    const calculateTimeLeft = (targetDate) => {
        const now = new Date().getTime();
        const difference = targetDate - now;
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                días: Math.floor(difference / (1000 * 60 * 60 * 24)),
                horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutos: Math.floor((difference / (1000 * 60)) % 60),
                segundos: Math.floor((difference / 1000) % 60),
            };
        } else {
            timeLeft = { días: 0, horas: 0, minutos: 0, segundos: 0 };
        }

        return timeLeft;
    };

    // FECHAS DE PRODUCCIÓN
    const christmasDate = new Date(new Date().getFullYear(), 11, 25, 0, 0, 0).getTime(); // 25 de diciembre
    const newYearDate = new Date(new Date().getFullYear() + 1, 0, 1, 0, 0, 0).getTime(); // 1 de enero

    const [timeLeftChristmas, setTimeLeftChristmas] = useState(calculateTimeLeft(christmasDate));
    const [timeLeftNewYear, setTimeLeftNewYear] = useState(calculateTimeLeft(newYearDate));
    const [isChristmas, setIsChristmas] = useState(false);
    const [isNewYear, setIsNewYear] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            const updatedTimeChristmas = calculateTimeLeft(christmasDate);
            const updatedTimeNewYear = calculateTimeLeft(newYearDate);
            setTimeLeftChristmas(updatedTimeChristmas);
            setTimeLeftNewYear(updatedTimeNewYear);

            // Verifica si el contador de Navidad llegó a cero o menos
            if (!isChristmas && (updatedTimeChristmas.días <= 0 && updatedTimeChristmas.horas <= 0 && updatedTimeChristmas.minutos <= 0 && updatedTimeChristmas.segundos <= 0)) {
                setIsChristmas(true);
            }

            // Verifica si el contador de Año Nuevo llegó a cero o menos
            if (!isNewYear && (updatedTimeNewYear.días <= 0 && updatedTimeNewYear.horas <= 0 && updatedTimeNewYear.minutos <= 0 && updatedTimeNewYear.segundos <= 0)) {
                setIsNewYear(true);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isChristmas, isNewYear, christmasDate, newYearDate]);

    const renderTime = (time) => {
        return (
            <div className="countdown">
                {Object.keys(time).map((key) => (
                    <div key={key} className="time-box">
                        {time[key]}
                        <span>{key}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="countdown-container">
            <h2 className="countdown-title">🎄 Navidad en:</h2>
            {isChristmas ? (
                <div className="message-container">
                    <h2 className="message">🎅 ¡Feliz Navidad PERROS! 🎉</h2>
                    <p className="celebration">Que la pasen bien y vayanse a la verg... 🎁✨</p>
                    <img src="/images/arbol.gif" alt="Árbol de Navidad" className="arbol" />
                </div>
            ) : (
                renderTime(timeLeftChristmas)
            )}

            <h2 className="countdown-title">🎆 Año Nuevo en:</h2>
            {isNewYear ? (
                <div className="message-container">
                    <h2 className="message">🎇 ¡Feliz Año Nuevo! 🎆</h2>
                    <p className="celebration">Que este nuevo año te traiga éxito, felicidad y prosperidad. 🎉🥂</p>
                    <img src="/images/nieve.gif" alt="Fuegos artificiales" className="newyear-image" />
                </div>
            ) : (
                renderTime(timeLeftNewYear)
            )}
        </div>
    );
};

export default CountdownTimer;
