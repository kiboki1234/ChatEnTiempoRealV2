/**
 * Risk Scoring System
 * Calculates overall risk score based on multiple analysis results
 */

const constants = require('./constants');

/**
 * Evaluate entropy risk
 * MODO PROFESIONAL: Entropía alta NO es indicador (compresión normal)
 */
function evaluateEntropyRisk(entropy, riskFactors) {
    // Solo marcar si entropía es CASI PERFECTA (8.0 = 100% random)
    // Archivos JPEG/PNG comprimidos: 7.5-7.8 = NORMAL
    if (entropy > constants.ENTROPY_THRESHOLD) {
        riskFactors.push(`Entropía casi perfecta: ${entropy.toFixed(3)} (posible cifrado completo)`);
        return constants.RISK_WEIGHTS.HIGH_ENTROPY; // Peso = 0 en modo profesional
    }
    return 0;
}

/**
 * Evaluate chi-square test risk
 * MODO PROFESIONAL: Chi-square solo es indicador con valor EXTREMO
 */
function evaluateChiSquareRisk(chiSquareResult, riskFactors) {
    // Solo confiar en chi-square normalizado MUY alto (>5)
    const normalized = parseFloat(chiSquareResult.normalizedChiSquare);
    if (normalized > 5) {
        riskFactors.push(`Chi-square extremadamente alto: ${normalized.toFixed(2)} (evidencia de LSB)`);
        return normalized > 10 
            ? constants.RISK_WEIGHTS.CHI_SQUARE_HIGH   // Peso = 0
            : constants.RISK_WEIGHTS.CHI_SQUARE_MEDIUM; // Peso = 0
    }
    return 0;
}

/**
 * Evaluate LSB analysis risk
 * MODO PROFESIONAL: Solo patrones periódicos EXTREMOS son indicadores
 */
function evaluateLSBRisk(lsbAnalysis, riskFactors) {
    const periodicScore = parseFloat(lsbAnalysis.periodicScore);
    
    // Solo marcar si hay patrones MUY periódicos (> 0.95)
    if (periodicScore > 0.95) {
        riskFactors.push(`Patrones LSB extremadamente periódicos: ${periodicScore.toFixed(2)}`);
        return constants.RISK_WEIGHTS.LSB_PERIODIC; // Peso = 10 (indicador fuerte)
    }
    
    // Desviación normal del ratio NO es indicador confiable
    return 0;
}

/**
 * Evaluate metadata risk
 * MODO PROFESIONAL: Metadata NO es indicador confiable (muchos archivos legítimos)
 */
function evaluateMetadataRisk(metadataAnalysis, riskFactors) {
    // NO CONFIAR en metadata - archivos legítimos tienen metadata extraña
    // Peso = 0 en modo profesional
    return 0;
}

/**
 * Evaluate structure and signature risks
 * MODO PROFESIONAL: Solo FIRMAS de herramientas son evidencia definitiva
 */
function evaluateStructureRisks(structureAnalysis, stegoFindings, hiddenTextFindings, riskFactors) {
    let risk = 0;
    
    // Anomalías estructurales MUY específicas
    if (structureAnalysis.suspicious && structureAnalysis.findings.length > 2) {
        riskFactors.push(`Anomalías estructurales múltiples: ${structureAnalysis.findings.join(', ')}`);
        risk += constants.RISK_WEIGHTS.STRUCTURE_ANOMALY; // Peso = 6
    }
    
    // FIRMAS de herramientas = PRUEBA DEFINITIVA
    if (stegoFindings.length > 0) {
        riskFactors.push(`🚨 FIRMA DE HERRAMIENTA DETECTADA: ${stegoFindings.map(f => f.tool).join(', ')}`);
        risk += constants.RISK_WEIGHTS.STEGO_SIGNATURE; // Peso = 20 (evidencia concreta)
    }
    
    // Hidden text NO es indicador (base64/hex común en metadata)
    // Peso = 0
    
    return risk;
}

/**
 * Evaluate data analysis risks
 * MODO PROFESIONAL: Solo trailing data significativo es indicador
 */
function evaluateDataRisks(channelAnalysis, frequencyAnalysis, trailingDataFindings, riskFactors) {
    let risk = 0;
    
    // Channel entropy NO es indicador confiable - Peso = 0
    
    // Byte frequency NO es indicador confiable - Peso = 0
    
    // TRAILING DATA = Indicador fuerte (datos al final del archivo)
    if (trailingDataFindings.length > 0) {
        const trailing = trailingDataFindings[0];
        if (trailing.bytes > constants.TRAILING_DATA_THRESHOLD) {
            riskFactors.push(`${trailing.bytes} bytes de trailing data con entropía ${trailing.entropy}`);
            risk += trailing.severity === 'HIGH' 
                ? constants.RISK_WEIGHTS.TRAILING_DATA_HIGH   // Peso = 10
                : constants.RISK_WEIGHTS.TRAILING_DATA_MEDIUM; // Peso = 5
        }
    }
    
    return risk;
}

/**
 * Determine severity level from risk score
 * MODO PROFESIONAL: Solo alertar con evidencia CONCRETA
 */
function determineSeverity(riskScore) {
    if (riskScore >= 20) return 'CRITICAL';  // Firma de herramienta + múltiples indicadores fuertes
    if (riskScore >= 15) return 'HIGH';      // Múltiples indicadores fuertes concurrentes
    if (riskScore >= 10) return 'MEDIUM';    // Al menos un indicador fuerte
    return 'LOW';                             // Sin evidencia suficiente - archivo limpio
}

/**
 * Calculate comprehensive risk score
 * MODO PROFESIONAL: Usa evaluadores actualizados que solo confían en evidencia concreta
 */
function calculateRiskScore(analysisResults) {
    const {
        entropy,
        chiSquareResult,
        lsbAnalysis,
        metadataAnalysis,
        channelAnalysis,
        structureAnalysis,
        stegoFindings,
        hiddenTextFindings,
        frequencyAnalysis,
        trailingDataFindings
    } = analysisResults;
    
    const riskFactors = [];
    let riskScore = 0;
    
    // Usar evaluadores profesionales
    riskScore += evaluateEntropyRisk(entropy, riskFactors);
    riskScore += evaluateChiSquareRisk(chiSquareResult, riskFactors);
    riskScore += evaluateLSBRisk(lsbAnalysis, riskFactors);
    riskScore += evaluateMetadataRisk(metadataAnalysis, riskFactors);
    riskScore += evaluateStructureRisks(structureAnalysis, stegoFindings, hiddenTextFindings, riskFactors);
    riskScore += evaluateDataRisks(channelAnalysis, frequencyAnalysis, trailingDataFindings, riskFactors);
    
    // Determine overall severity (MODO PROFESIONAL)
    const suspicious = riskScore >= constants.RISK_SCORE_THRESHOLD;
    const severity = determineSeverity(riskScore);
    
    return {
        suspicious,
        severity,
        riskScore,
        riskFactors
    };
}

/**
 * Generate recommendation based on analysis result
 * MODO PROFESIONAL: Solo rechazar con evidencia CONCRETA
 */
function generateRecommendation(analysisResult) {
    if (!analysisResult.suspicious) {
        return 'LIMPIO: Archivo normal sin evidencia de esteganografía. PERMITIR subida.';
    }
    
    if (analysisResult.maliciousFindings && analysisResult.maliciousFindings.length > 0) {
        return 'CRÍTICO: Archivo contiene contenido malicioso (ejecutable/script). RECHAZAR inmediatamente.';
    }
    
    if (analysisResult.riskScore >= 20) {
        return 'CRÍTICO: Firma de herramienta de esteganografía detectada + múltiples indicadores fuertes. EVIDENCIA CONCRETA. RECHAZAR.';
    }
    
    if (analysisResult.riskScore >= 15) {
        return 'ALTO RIESGO: Múltiples indicadores fuertes concurrentes detectados. Probable esteganografía. RECHAZAR.';
    }
    
    if (analysisResult.riskScore >= 10) {
        return 'RIESGO MODERADO: Al menos un indicador fuerte detectado. Considerar revisión manual.';
    }
    
    return 'RIESGO BAJO: Algunas anomalías menores pero archivo probablemente limpio. PERMITIR con precaución.';
}

module.exports = {
    calculateRiskScore,
    generateRecommendation
};
