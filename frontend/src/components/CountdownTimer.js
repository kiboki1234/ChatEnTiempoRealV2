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
    const newYearDate = new Date(new Date().getFullYear() + 1, 0, 1, 0, 0, 0).getTime(); // 1 de enero
    const backToSchoolDate = new Date(2025, 0, 6, 0, 0, 0).getTime(); // 6 de enero 2025

    const [timeLeftNewYear, setTimeLeftNewYear] = useState(calculateTimeLeft(newYearDate));
    const [timeLeftBackToSchool, setTimeLeftBackToSchool] = useState(calculateTimeLeft(backToSchoolDate));

    const [isNewYear, setIsNewYear] = useState(false);
    const [isBackToSchool, setIsBackToSchool] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            const updatedTimeNewYear = calculateTimeLeft(newYearDate);
            const updatedTimeBackToSchool = calculateTimeLeft(backToSchoolDate);
            setTimeLeftNewYear(updatedTimeNewYear);
            setTimeLeftBackToSchool(updatedTimeBackToSchool);

            // Verifica si el contador de Año Nuevo llegó a cero o menos
            if (!isNewYear && (updatedTimeNewYear.días <= 0 && updatedTimeNewYear.horas <= 0 && updatedTimeNewYear.minutos <= 0 && updatedTimeNewYear.segundos <= 0)) {
                setIsNewYear(true);
            }

            // Verifica si el contador de Inicio de Clases llegó a cero o menos
            if (!isBackToSchool && (updatedTimeBackToSchool.días <= 0 && updatedTimeBackToSchool.horas <= 0 && updatedTimeBackToSchool.minutos <= 0 && updatedTimeBackToSchool.segundos <= 0)) {
                setIsBackToSchool(true);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isNewYear, isBackToSchool, newYearDate, backToSchoolDate]);

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
            <h2 className="countdown-title">🎆 Año Nuevo en:</h2>
            {isNewYear ? (
                <div className="message-container">
                    <h2 className="message">🎇 ¡Feliz Año Nuevo malditos perros! 🎆</h2>
                    <p className="celebration">Que este nuevo año les traiga éxito, felicidad y prosperidad. 🎉🥂</p>
                    <img src="/images/anio.gif" alt="Fuegos artificiales" className="newyear-image" />
                </div>
            ) : (
                renderTime(timeLeftNewYear)
            )}

            <h2 className="countdown-title">📚 Inicio de Clases en:</h2>
            {isBackToSchool ? (
                <div className="message-container">
                    <h2 className="message">🎒 ¡Felices clases! 📚</h2>
                    <p className="celebration">Espero que tengas un gran inicio de clases y mucho éxito en tus estudios. ✏️📖</p>
                    <img src="/images/clases.gif" alt="Inicio de clases" className="school-image" />
                </div>
            ) : (
                renderTime(timeLeftBackToSchool)
            )}
        </div>
    );
};

export default CountdownTimer;
