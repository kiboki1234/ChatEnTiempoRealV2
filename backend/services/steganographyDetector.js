/**
 * Steganography Detector - Legacy Wrapper
 * This file maintains backward compatibility while using the new modular architecture
 * 
 * The detector has been refactored into multiple specialized modules:
 * - constants.js: Detection thresholds and signatures
 * - analyzers.js: Statistical analysis functions (entropy, chi-square, LSB, etc.)
 * - signatureDetector.js: Malware and steganography tool signatures
 * - structureAnalyzer.js: File structure analysis
 * - imageAnalyzer.js: Image-specific analysis
 * - fileAnalyzer.js: Non-image file analysis
 * - riskScorer.js: Risk scoring and assessment
 * - reportGenerator.js: Security report generation
 * - index.js: Main orchestrator
 * 
 * @deprecated Use require('./steganography') instead for direct access
 */

const steganographyDetector = require('./steganography');

module.exports = steganographyDetector;
