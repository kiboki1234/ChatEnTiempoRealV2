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
                minutos: Math.floor((difference / 1000 / 60) % 60),
                segundos: Math.floor((difference / 1000) % 60),
            };
        }

        return timeLeft;
    };

    const christmasDate = Date.UTC(new Date().getFullYear(), 11, 25, 5, 0, 0);
    const newYearDate = Date.UTC(new Date().getFullYear() + 1, 0, 1, 5, 0, 0);

    const [timeLeftChristmas, setTimeLeftChristmas] = useState(calculateTimeLeft(christmasDate));
    const [timeLeftNewYear, setTimeLeftNewYear] = useState(calculateTimeLeft(newYearDate));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeftChristmas(calculateTimeLeft(christmasDate));
            setTimeLeftNewYear(calculateTimeLeft(newYearDate));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

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
            {renderTime(timeLeftChristmas)}

            <h2 className="countdown-title">🎆 Año Nuevo en:</h2>
            {renderTime(timeLeftNewYear)}
        </div>
    );
};

export default CountdownTimer;
