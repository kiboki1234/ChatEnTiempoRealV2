/**
 * Steganography Detection Constants
 * Thresholds and signatures for detection algorithms
 */

module.exports = {
    // Detection Thresholds
    ENTROPY_THRESHOLD: 7.85, // Shannon entropy threshold (adjusted for compressed PNG/JPEG - normal range 7.6-7.8)
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    CHI_SQUARE_THRESHOLD: 50, // Chi-square critical value (increased to reduce false positives)
    LSB_RATIO_THRESHOLD: 0.7, // LSB distribution ratio threshold (more permissive)
    LSB_PERIODIC_THRESHOLD: 0.85, // LSB periodic pattern threshold (more strict)
    LSB_DEVIATION_THRESHOLD: 0.08, // LSB deviation threshold (more permissive)
    RISK_SCORE_THRESHOLD: 7, // Minimum risk score to reject file (increased from 4)
    
    // Steganography Tool Signatures
    SUSPICIOUS_PATTERNS: [
        Buffer.from('OutGuess'),
        Buffer.from('StegHide'),
        Buffer.from('Steghide'),
        Buffer.from('F5'),
        Buffer.from('JPHide'),
        Buffer.from('JPHideSeek'),
        Buffer.from('Camouflage'),
        Buffer.from('OpenStego'),
        Buffer.from('SilentEye'),
        Buffer.from('StegSecret'),
        Buffer.from('S-Tools'),
        Buffer.from('Invisible Secrets'),
        Buffer.from('StegFS'),
        Buffer.from('StegDetect'),
        Buffer.from('OpenPuff'),
        Buffer.from('DeepSound'),
        Buffer.from('Xiao Steganography'),
        // Binary signatures
        Buffer.from([0x53, 0x74, 0x65, 0x67]), // "Steg"
        Buffer.from([0x48, 0x49, 0x44, 0x45]), // "HIDE"
    ],
    
    // Malicious Signatures
    MALICIOUS_SIGNATURES: [
        { sig: Buffer.from([0x4D, 0x5A]), name: 'PE executable (MZ header)', severity: 'CRITICAL' },
        { sig: Buffer.from([0x7F, 0x45, 0x4C, 0x46]), name: 'ELF executable', severity: 'CRITICAL' },
        { sig: Buffer.from('<?php'), name: 'PHP code', severity: 'CRITICAL' },
        { sig: Buffer.from('<script'), name: 'Embedded scripts', severity: 'HIGH' },
        { sig: Buffer.from('eval('), name: 'Eval functions', severity: 'HIGH' },
        { sig: Buffer.from('function('), name: 'Obfuscated functions', severity: 'MEDIUM' },
        { sig: Buffer.from('base64,'), name: 'Base64 data URI', severity: 'MEDIUM' },
        { sig: Buffer.from('powershell'), name: 'PowerShell commands', severity: 'CRITICAL' },
        { sig: Buffer.from('cmd.exe'), name: 'Windows command shell', severity: 'CRITICAL' },
        { sig: Buffer.from('/bin/sh'), name: 'Unix shell', severity: 'CRITICAL' },
        { sig: Buffer.from('/bin/bash'), name: 'Bash shell', severity: 'CRITICAL' },
        { sig: Buffer.from('chmod +x'), name: 'Execute permissions', severity: 'HIGH' },
        { sig: Buffer.from('wget'), name: 'Download command', severity: 'HIGH' },
        { sig: Buffer.from('curl'), name: 'Download command', severity: 'HIGH' },
    ],
    
    // Suspicious Code Patterns (for string search)
    SUSPICIOUS_CODE_PATTERNS: [
        { pattern: /eval\s*\(/gi, name: 'eval() function', severity: 'HIGH' },
        { pattern: /exec\s*\(/gi, name: 'exec() function', severity: 'HIGH' },
        { pattern: /base64_decode/gi, name: 'base64_decode()', severity: 'MEDIUM' },
        { pattern: /system\s*\(/gi, name: 'system() call', severity: 'CRITICAL' },
        { pattern: /shell_exec/gi, name: 'shell_exec()', severity: 'CRITICAL' },
        { pattern: /<\?php/gi, name: 'PHP opening tag', severity: 'CRITICAL' },
        { pattern: /\$_GET\[/gi, name: '$_GET variable', severity: 'HIGH' },
        { pattern: /\$_POST\[/gi, name: '$_POST variable', severity: 'HIGH' },
        { pattern: /document\.write/gi, name: 'document.write', severity: 'MEDIUM' },
        { pattern: /innerHTML\s*=/gi, name: 'innerHTML assignment', severity: 'MEDIUM' },
        { pattern: /atob\(/gi, name: 'atob() (base64 decode)', severity: 'MEDIUM' },
        { pattern: /fromCharCode/gi, name: 'String.fromCharCode', severity: 'MEDIUM' },
        { pattern: /unescape\(/gi, name: 'unescape()', severity: 'HIGH' },
        { pattern: /\\x[0-9a-f]{2}/gi, name: 'Hex escape sequences', severity: 'LOW' },
    ],
    
    // Hidden Text Patterns
    HIDDEN_TEXT_PATTERNS: [
        { pattern: /[A-Za-z0-9+/]{40,}={0,2}/g, name: 'Base64-like sequence', minLength: 100 },
        { pattern: /[0-9a-fA-F]{32,}/g, name: 'Hexadecimal sequence', minLength: 64 },
        { pattern: /(BEGIN|END) (RSA|PGP|CERTIFICATE)/g, name: 'Cryptographic key/certificate' },
        { pattern: /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, name: 'PEM format key' },
    ],
    
    // File Format Markers
    FORMAT_MARKERS: {
        'jpeg': { end: Buffer.from([0xFF, 0xD9]), name: 'JPEG EOI' },
        'png': { end: Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]), name: 'PNG IEND' },
        'gif': { end: Buffer.from([0x00, 0x3B]), name: 'GIF trailer' }
    },
    
    // File Signatures for Structure Analysis
    FILE_SIGNATURES: [
        { name: 'JPEG', sig: [0xFF, 0xD8, 0xFF] },
        { name: 'PNG', sig: [0x89, 0x50, 0x4E, 0x47] },
        { name: 'GIF', sig: [0x47, 0x49, 0x46, 0x38] },
        { name: 'PDF', sig: [0x25, 0x50, 0x44, 0x46] },
        { name: 'ZIP', sig: [0x50, 0x4B, 0x03, 0x04] },
        { name: 'RAR', sig: [0x52, 0x61, 0x72, 0x21] }
    ],
    
    // Risk Scoring Weights (adjusted for fewer false positives)
    RISK_WEIGHTS: {
        HIGH_ENTROPY: 1,          // Reduced from 2 - high entropy is normal in compressed files
        CHI_SQUARE_HIGH: 3,       // Reduced from 4 - less weight on statistical tests
        CHI_SQUARE_MEDIUM: 2,     // Reduced from 3
        LSB_PERIODIC: 5,          // Increased from 4 - strong indicator
        LSB_ABNORMAL: 1,          // Reduced from 2 - minor anomaly
        METADATA_SUSPICIOUS: 1,   // Reduced from 2 - metadata can vary
        CHANNEL_ENTROPY: 1,       // Reduced from 2 - normal in photos
        STRUCTURE_ANOMALY: 2,     // Reduced from 3 - some files have non-standard structure
        STEGO_SIGNATURE: 6,       // Increased from 4 - strong indicator of actual stego tools
        HIDDEN_TEXT: 2,           // Reduced from 3 - base64/hex common in metadata
        BYTE_FREQUENCY: 1,        // Reduced from 2 - varies by compression
        TRAILING_DATA_HIGH: 4,    // Increased from 3 - strong indicator
        TRAILING_DATA_MEDIUM: 2   // Same - moderate indicator
    }
};
