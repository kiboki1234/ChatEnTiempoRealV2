/**
 * File Structure Analysis
 * Detects anomalies in file format and structure
 */

const constants = require('./constants');

/**
 * Check for trailing data after EOF markers
 */
function checkTrailingData(buffer, format) {
    const formatSignatures = {
        'jpeg': [Buffer.from([0xFF, 0xD9])], // JPEG end marker
        'png': [Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82])], // PNG end
        'gif': [Buffer.from([0x00, 0x3B])] // GIF trailer
    };
    
    if (!formatSignatures[format]) {
        return null;
    }
    
    for (const endMarker of formatSignatures[format]) {
        const lastIndex = buffer.lastIndexOf(endMarker);
        if (lastIndex !== -1 && lastIndex < buffer.length - endMarker.length - 100) {
            const trailingBytes = buffer.length - lastIndex - endMarker.length;
            return {
                type: 'TRAILING_DATA',
                bytes: trailingBytes,
                description: `${trailingBytes} bytes found after ${format.toUpperCase()} end marker`
            };
        }
    }
    
    return null;
}

/**
 * Count signature occurrences in buffer
 */
function countSignatureOccurrences(buffer, signature) {
    let index = 0;
    let count = 0;
    const sigBuffer = Buffer.from(signature);
    
    while ((index = buffer.indexOf(sigBuffer, index)) !== -1) {
        count++;
        index += sigBuffer.length;
        if (count > 1) break; // Only check for multiple occurrences
    }
    
    return count;
}

/**
 * Check for multiple file signatures (polyglot detection)
 */
function checkPolyglotSignatures(buffer) {
    const foundSignatures = [];
    
    for (const { name, sig } of constants.FILE_SIGNATURES) {
        const count = countSignatureOccurrences(buffer, sig);
        if (count > 0) {
            foundSignatures.push({ name, count });
        }
    }
    
    if (foundSignatures.length > 1 || foundSignatures.some(f => f.count > 1)) {
        return {
            type: 'MULTIPLE_SIGNATURES',
            signatures: foundSignatures,
            description: 'Multiple file format signatures detected (possible polyglot)'
        };
    }
    
    return null;
}

/**
 * Analyze file structure for anomalies
 * Detects polyglot files, trailing data, multiple signatures
 */
function analyzeFileStructure(buffer, format) {
    const anomalies = [];
    
    // Check for trailing data
    const trailingDataAnomaly = checkTrailingData(buffer, format);
    if (trailingDataAnomaly) {
        anomalies.push(trailingDataAnomaly);
    }
    
    // Check for polyglot signatures
    const polyglotAnomaly = checkPolyglotSignatures(buffer);
    if (polyglotAnomaly) {
        anomalies.push(polyglotAnomaly);
    }
    
    const suspicious = anomalies.length > 0;
    
    return {
        suspicious,
        anomalies,
        findings: anomalies.map(a => a.description),
        reason: suspicious ? 'File structure anomalies detected' : 'File structure appears normal'
    };
}

/**
 * Analyze PDF structure for suspicious elements
 */
function analyzePDFStructure(buffer) {
    const anomalies = [];
    let suspicious = false;
    
    const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
    
    // Check for JavaScript in PDF
    if (bufferStr.includes('/JavaScript') || bufferStr.includes('/JS')) {
        anomalies.push({
            type: 'EMBEDDED_JAVASCRIPT',
            description: 'PDF contains embedded JavaScript'
        });
        suspicious = true;
    }
    
    // Check for launch actions
    if (bufferStr.includes('/Launch') || bufferStr.includes('/Action')) {
        anomalies.push({
            type: 'LAUNCH_ACTION',
            description: 'PDF contains launch actions'
        });
        suspicious = true;
    }
    
    // Check for embedded files
    if (bufferStr.includes('/EmbeddedFile')) {
        anomalies.push({
            type: 'EMBEDDED_FILE',
            description: 'PDF contains embedded files'
        });
        suspicious = true;
    }
    
    return {
        suspicious,
        anomalies,
        reason: suspicious ? 'Suspicious PDF structure detected' : 'PDF structure appears normal'
    };
}

module.exports = {
    analyzeFileStructure,
    analyzePDFStructure
};
