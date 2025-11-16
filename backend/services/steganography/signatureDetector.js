/**
 * Signature Detection for Malware and Steganography Tools
 */

const constants = require('./constants');

/**
 * Check for malicious signatures in file
 * Detects executables, scripts, and malicious code patterns
 */
function checkMaliciousSignatures(buffer) {
    const findings = [];
    
    // Search for binary signatures throughout the buffer
    for (const { sig, name, severity } of constants.MALICIOUS_SIGNATURES) {
        let index = 0;
        const positions = [];
        
        while ((index = buffer.indexOf(sig, index)) !== -1) {
            positions.push(index);
            index += sig.length;
            if (positions.length > 5) break; // Limit for performance
        }
        
        if (positions.length > 0) {
            findings.push({
                type: 'MALICIOUS_SIGNATURE',
                signature: name,
                severity,
                occurrences: positions.length,
                positions: positions.slice(0, 3) // First 3 positions
            });
        }
    }
    
    // Search for suspicious patterns in strings
    const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
    
    for (const { pattern, name, severity } of constants.SUSPICIOUS_CODE_PATTERNS) {
        const matches = bufferStr.match(pattern);
        if (matches && matches.length > 0) {
            findings.push({
                type: 'SUSPICIOUS_CODE',
                pattern: name,
                severity,
                occurrences: matches.length
            });
        }
    }
    
    return findings;
}

/**
 * Check for steganography tool signatures
 * Detects known steganography software markers
 */
function checkSteganographySignatures(buffer) {
    const findings = [];
    
    for (const signature of constants.SUSPICIOUS_PATTERNS) {
        if (buffer.includes(signature)) {
            findings.push({
                type: 'STEGANOGRAPHY_TOOL',
                tool: signature.toString(),
                severity: 'HIGH'
            });
        }
    }
    
    return findings;
}

/**
 * Detect patterns of hidden text
 * Searches for Base64, hexadecimal, PEM keys, etc.
 */
function detectHiddenText(buffer) {
    const findings = [];
    
    const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 100000));
    
    for (const { pattern, name, minLength } of constants.HIDDEN_TEXT_PATTERNS) {
        const matches = bufferStr.match(pattern);
        if (matches) {
            const suspiciousMatches = matches.filter(m => !minLength || m.length >= minLength);
            if (suspiciousMatches.length > 0) {
                findings.push({
                    type: 'HIDDEN_TEXT_PATTERN',
                    pattern: name,
                    occurrences: suspiciousMatches.length,
                    maxLength: Math.max(...suspiciousMatches.map(m => m.length)),
                    severity: 'MEDIUM'
                });
            }
        }
    }
    
    return findings;
}

/**
 * Detect data after end-of-file markers
 * Finds trailing data in JPEG, PNG, GIF files
 * Note: Import calculateEntropy at call time to avoid circular dependency
 */
function detectTrailingData(buffer, format, calculateEntropy) {
    const findings = [];
    
    if (constants.FORMAT_MARKERS[format]) {
        const { end, name } = constants.FORMAT_MARKERS[format];
        const lastIndex = buffer.lastIndexOf(end);
        
        if (lastIndex !== -1) {
            const trailingBytes = buffer.length - lastIndex - end.length;
            
            // Tolerance of 100 bytes for normal metadata
            if (trailingBytes > 100) {
                const trailingData = buffer.slice(lastIndex + end.length);
                const trailingEntropy = calculateEntropy(trailingData);
                
                findings.push({
                    type: 'TRAILING_DATA',
                    bytes: trailingBytes,
                    entropy: trailingEntropy.toFixed(3),
                    description: `${trailingBytes} bytes found after ${name} marker`,
                    severity: trailingBytes > 10000 ? 'HIGH' : 'MEDIUM',
                    suspicious: trailingEntropy > 7 || trailingBytes > 5000
                });
            }
        }
    }
    
    return findings;
}

module.exports = {
    checkMaliciousSignatures,
    checkSteganographySignatures,
    detectHiddenText,
    detectTrailingData
};
