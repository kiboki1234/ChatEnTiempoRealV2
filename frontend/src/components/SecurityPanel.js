import React, { useState, useEffect } from 'react';
import '../styles/SecurityPanel.css';

const SecurityPanel = () => {
    const [statistics, setStatistics] = useState(null);
    const [quarantinedFiles, setQuarantinedFiles] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, quarantine, alerts

    useEffect(() => {
        loadData();
        // Refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadStatistics(),
                loadQuarantinedFiles(),
                loadAlerts()
            ]);
        } catch (error) {
            console.error('Error loading security data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('http://localhost:5000/api/security/statistics?days=7', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setStatistics(data.statistics);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    };

    const loadQuarantinedFiles = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('http://localhost:5000/api/security/quarantine', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setQuarantinedFiles(data.files);
            }
        } catch (error) {
            console.error('Error loading quarantined files:', error);
        }
    };

    const loadAlerts = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('http://localhost:5000/api/security/alerts?limit=20', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setAlerts(data.alerts);
            }
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    };

    const viewFileDetails = async (fileName) => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`http://localhost:5000/api/security/quarantine/${fileName}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setSelectedFile(data.file);
            }
        } catch (error) {
            console.error('Error loading file details:', error);
        }
    };

    const deleteQuarantinedFile = async (fileName) => {
        if (!window.confirm(`¿Está seguro de eliminar el archivo "${fileName}" de cuarentena?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`http://localhost:5000/api/security/quarantine/${fileName}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                alert('Archivo eliminado exitosamente');
                loadQuarantinedFiles();
                setSelectedFile(null);
            } else {
                alert('Error al eliminar el archivo');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error al eliminar el archivo');
        }
    };

    const cleanOldFiles = async () => {
        if (!window.confirm('¿Desea eliminar archivos en cuarentena mayores a 30 días?')) {
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('http://localhost:5000/api/security/quarantine/clean', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ daysToKeep: 30 })
            });
            
            if (response.ok) {
                const data = await response.json();
                alert(`Se eliminaron ${data.deletedCount} archivos antiguos`);
                loadQuarantinedFiles();
            } else {
                alert('Error al limpiar archivos antiguos');
            }
        } catch (error) {
            console.error('Error cleaning old files:', error);
            alert('Error al limpiar archivos antiguos');
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL': return '#d32f2f';
            case 'HIGH': return '#f57c00';
            case 'MEDIUM': return '#fbc02d';
            case 'LOW': return '#388e3c';
            default: return '#757575';
        }
    };

    const renderOverview = () => (
        <div className="security-overview">
            <h3>📊 Estadísticas de Seguridad (Últimos 7 días)</h3>
            
            {statistics && (
                <>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-value">{statistics.totalAnalyzed}</div>
                            <div className="stat-label">Archivos Analizados</div>
                        </div>
                        <div className="stat-card approved">
                            <div className="stat-value">{statistics.approved}</div>
                            <div className="stat-label">Aprobados</div>
                        </div>
                        <div className="stat-card rejected">
                            <div className="stat-value">{statistics.rejected}</div>
                            <div className="stat-label">Rechazados</div>
                        </div>
                        <div className="stat-card quarantined">
                            <div className="stat-value">{statistics.quarantined}</div>
                            <div className="stat-label">En Cuarentena</div>
                        </div>
                    </div>

                    <div className="rejection-rate">
                        <h4>Tasa de Rechazo: {statistics.rejectionRate}%</h4>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${statistics.rejectionRate}%` }}
                            />
                        </div>
                    </div>

                    <div className="severity-breakdown">
                        <h4>Distribución por Severidad</h4>
                        <div className="severity-grid">
                            {Object.entries(statistics.severityBreakdown).map(([severity, count]) => (
                                <div key={severity} className="severity-item">
                                    <div 
                                        className="severity-badge" 
                                        style={{ backgroundColor: getSeverityColor(severity) }}
                                    >
                                        {severity}
                                    </div>
                                    <div className="severity-count">{count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="risk-factors">
                        <h4>Principales Factores de Riesgo</h4>
                        <div className="risk-list">
                            {Object.entries(statistics.topRiskFactors)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([factor, count]) => (
                                    <div key={factor} className="risk-item">
                                        <span className="risk-factor">{factor}</span>
                                        <span className="risk-count">{count}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    const renderQuarantine = () => (
        <div className="quarantine-section">
            <div className="section-header">
                <h3>🔒 Archivos en Cuarentena ({quarantinedFiles.length})</h3>
                <button onClick={cleanOldFiles} className="btn-clean">
                    🗑️ Limpiar Antiguos
                </button>
            </div>

            {selectedFile ? (
                <div className="file-details">
                    <button onClick={() => setSelectedFile(null)} className="btn-back">
                        ← Volver
                    </button>
                    
                    <h4>Detalles del Archivo</h4>
                    <div className="detail-group">
                        <label>Nombre:</label>
                        <span>{selectedFile.fileName}</span>
                    </div>
                    <div className="detail-group">
                        <label>Usuario:</label>
                        <span>{selectedFile.userMetadata?.username}</span>
                    </div>
                    <div className="detail-group">
                        <label>Sala:</label>
                        <span>{selectedFile.userMetadata?.roomPin}</span>
                    </div>
                    <div className="detail-group">
                        <label>Fecha:</label>
                        <span>{new Date(selectedFile.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="detail-group">
                        <label>Severidad:</label>
                        <span 
                            className="severity-badge"
                            style={{ backgroundColor: getSeverityColor(selectedFile.analysisResult?.severity) }}
                        >
                            {selectedFile.analysisResult?.severity}
                        </span>
                    </div>
                    <div className="detail-group">
                        <label>Puntaje de Riesgo:</label>
                        <span>{selectedFile.analysisResult?.riskScore}</span>
                    </div>

                    <div className="risk-factors-detail">
                        <h5>Factores de Riesgo:</h5>
                        <ul>
                            {selectedFile.analysisResult?.riskFactors?.map((factor, idx) => (
                                <li key={idx}>{factor}</li>
                            ))}
                        </ul>
                    </div>

                    {selectedFile.securityReport && (
                        <div className="security-report">
                            <h5>Reporte de Seguridad:</h5>
                            <p>{selectedFile.securityReport.recommendation}</p>
                        </div>
                    )}

                    <div className="file-actions">
                        <button 
                            onClick={() => deleteQuarantinedFile(selectedFile.fileName)} 
                            className="btn-delete"
                        >
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="quarantine-list">
                    {quarantinedFiles.length === 0 ? (
                        <p className="no-files">No hay archivos en cuarentena</p>
                    ) : (
                        quarantinedFiles.map((file) => (
                            <div key={file.fileName} className="quarantine-item">
                                <div className="file-info">
                                    <div className="file-name">📄 {file.userMetadata?.originalName || file.fileName}</div>
                                    <div className="file-meta">
                                        <span>👤 {file.userMetadata?.username}</span>
                                        <span>🕒 {new Date(file.timestamp).toLocaleString()}</span>
                                        <span 
                                            className="severity-badge"
                                            style={{ backgroundColor: getSeverityColor(file.severity) }}
                                        >
                                            {file.severity}
                                        </span>
                                        <span className="risk-score">⚠️ {file.riskScore}</span>
                                    </div>
                                </div>
                                <div className="file-actions">
                                    <button 
                                        onClick={() => viewFileDetails(file.fileName)} 
                                        className="btn-view"
                                    >
                                        👁️ Ver
                                    </button>
                                    <button 
                                        onClick={() => deleteQuarantinedFile(file.fileName)} 
                                        className="btn-delete-small"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );

    const renderAlerts = () => (
        <div className="alerts-section">
            <h3>🚨 Alertas de Seguridad Recientes</h3>
            
            {alerts.length === 0 ? (
                <p className="no-alerts">No hay alertas recientes</p>
            ) : (
                <div className="alerts-list">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="alert-item">
                            <div 
                                className="alert-severity"
                                style={{ backgroundColor: getSeverityColor(alert.severity) }}
                            />
                            <div className="alert-content">
                                <div className="alert-header">
                                    <span className="alert-action">{alert.action}</span>
                                    <span className="alert-time">
                                        {new Date(alert.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div className="alert-details">
                                    <span>📄 {alert.fileName}</span>
                                    <span>👤 {alert.username}</span>
                                    <span>⚠️ Score: {alert.riskScore}</span>
                                </div>
                                {alert.riskFactors && (
                                    <div className="alert-factors">
                                        {alert.riskFactors.join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (loading) {
        return <div className="security-panel loading">Cargando datos de seguridad...</div>;
    }

    return (
        <div className="security-panel">
            <div className="panel-header">
                <h2>🛡️ Panel de Seguridad</h2>
                <button onClick={loadData} className="btn-refresh">
                    🔄 Actualizar
                </button>
            </div>

            <div className="tabs">
                <button 
                    className={activeTab === 'overview' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Resumen
                </button>
                <button 
                    className={activeTab === 'quarantine' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('quarantine')}
                >
                    🔒 Cuarentena ({quarantinedFiles.length})
                </button>
                <button 
                    className={activeTab === 'alerts' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('alerts')}
                >
                    🚨 Alertas ({alerts.length})
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'quarantine' && renderQuarantine()}
                {activeTab === 'alerts' && renderAlerts()}
            </div>
        </div>
    );
};

export default SecurityPanel;
