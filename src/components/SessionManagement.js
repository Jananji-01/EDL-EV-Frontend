import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SessionManagement = ({ onClose }) => {
    const [sessions, setSessions] = useState([]);
    const [filteredSessions, setFilteredSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [availableDevices, setAvailableDevices] = useState([]);
    const [filters, setFilters] = useState({
        deviceId: '',
        eaccountNo: '',
        startDate: '',
        endDate: ''
    });

    const API_BASE_URL = 'http://localhost:8088/EV/api';

    useEffect(() => {
        fetchAllSessions();
    }, []);

    // Helper function to safely parse response data
    const parseResponse = (data) => {
        console.log('Parsing data type:', typeof data);
        
        // If it's a string, try to parse it as JSON
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                console.log('Successfully parsed string to object');
                return parsed;
            } catch (e) {
                console.error('Failed to parse string as JSON:', e);
                return null;
            }
        }
        return data;
    };

    // Helper function to extract array from response
    const extractArray = (data) => {
        const parsed = parseResponse(data);
        if (!parsed) return [];
        
        // If it's already an array
        if (Array.isArray(parsed)) return parsed;
        
        // If it's an object with array properties
        if (typeof parsed === 'object') {
            // Check common property names
            if (parsed.content && Array.isArray(parsed.content)) return parsed.content;
            if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
            if (parsed.sessions && Array.isArray(parsed.sessions)) return parsed.sessions;
            if (parsed.records && Array.isArray(parsed.records)) return parsed.records;
            if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
            if (parsed.result && Array.isArray(parsed.result)) return parsed.result;
            
            // If no array found, try to convert object values to array
            const values = Object.values(parsed);
            if (values.length > 0 && Array.isArray(values[0])) return values[0];
        }
        
        return [];
    };

    const fetchAllSessions = async () => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('=== FETCHING SESSIONS ===');
            
            // Try multiple endpoints
            let sessionsArray = [];
            let workingEndpoint = '';
            
            // Try /charging-sessions first (from debug, this returns object)
            const endpoints = [
                '/charging-sessions',
                '/sessions/all',
                '/sessions',
                '/session/all'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    console.log(`Trying endpoint: ${endpoint}`);
                    const response = await axios.get(`${API_BASE_URL}${endpoint}`);
                    const extracted = extractArray(response.data);
                    
                    if (extracted.length > 0) {
                        sessionsArray = extracted;
                        workingEndpoint = endpoint;
                        console.log(`✅ Success! ${endpoint} returned ${extracted.length} sessions`);
                        break;
                    }
                } catch (err) {
                    console.log(`❌ ${endpoint} failed:`, err.message);
                }
            }
            
            if (sessionsArray.length === 0) {
                // Try one more time with the filter endpoint for SP-001
                try {
                    console.log('Trying filter endpoint for SP-001...');
                    const filterResponse = await axios.post(`${API_BASE_URL}/sessions/filter`, { deviceId: 'SP-001' });
                    const extracted = extractArray(filterResponse.data);
                    if (extracted.length > 0) {
                        sessionsArray = extracted;
                        workingEndpoint = 'filter';
                        console.log(`✅ Filter endpoint returned ${extracted.length} sessions`);
                    }
                } catch (err) {
                    console.log('Filter endpoint failed:', err.message);
                }
            }
            
            console.log(`Total sessions found: ${sessionsArray.length}`);
            
            if (sessionsArray.length > 0) {
                // Log first session to see structure
                console.log('First session structure:', sessionsArray[0]);
                
                // Extract unique device IDs
                const devices = [...new Set(sessionsArray.map(s => s.idDevice || s.deviceId).filter(d => d))];
                console.log('Available devices:', devices);
                setAvailableDevices(devices);
                
                setSessions(sessionsArray);
                setFilteredSessions(sessionsArray);
                
                // If SP-001 is in the list, auto-filter to show it
                if (devices.includes('SP-001')) {
                    const sp001Sessions = sessionsArray.filter(s => 
                        (s.idDevice === 'SP-001') || (s.deviceId === 'SP-001')
                    );
                    if (sp001Sessions.length > 0) {
                        console.log(`Auto-showing ${sp001Sessions.length} SP-001 sessions`);
                        setFilteredSessions(sp001Sessions);
                    }
                }
            } else {
                setError('No sessions found in database. Please check if data exists.');
            }
            
        } catch (err) {
            console.error('Error fetching sessions:', err);
            setError(`Failed to fetch sessions: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const deviceId = filters.deviceId.trim();
            
            if (!deviceId) {
                setFilteredSessions(sessions);
                setLoading(false);
                return;
            }
            
            console.log(`Filtering for device: ${deviceId}`);
            
            // First try local filtering
            const localFiltered = sessions.filter(session => {
                const sessionDeviceId = session.idDevice || session.deviceId;
                return sessionDeviceId && sessionDeviceId === deviceId;
            });
            
            if (localFiltered.length > 0) {
                console.log(`Found ${localFiltered.length} sessions locally`);
                setFilteredSessions(localFiltered);
                setLoading(false);
                return;
            }
            
            // Try API filter
            try {
                const response = await axios.post(`${API_BASE_URL}/sessions/filter`, { deviceId });
                const filtered = extractArray(response.data);
                
                if (filtered.length > 0) {
                    console.log(`API found ${filtered.length} sessions`);
                    setFilteredSessions(filtered);
                } else {
                    setError(`No sessions found for Device ID: "${deviceId}"`);
                    setFilteredSessions([]);
                }
            } catch (err) {
                console.error('API filter error:', err);
                setError(`Failed to filter: ${err.message}`);
                setFilteredSessions([]);
            }
            
        } catch (err) {
            console.error('Filter error:', err);
            setError(`Filter failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilters({
            deviceId: '',
            eaccountNo: '',
            startDate: '',
            endDate: ''
        });
        setError(null);
        setFilteredSessions(sessions);
    };

    const viewSessionDetail = async (sessionId) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/detail`);
            const data = parseResponse(response.data);
            setSelectedSession(data);
            setShowDetail(true);
        } catch (err) {
            setError(`Failed to get details: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const viewReport = (sessionId) => {
        window.open(`${API_BASE_URL}/sessions/${sessionId}/report`, '_blank');
    };

    const downloadReport = async (sessionId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `session_${sessionId}_report.html`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(`Failed to download: ${err.message}`);
        }
    };

    const formatDateTime = (dateTime) => {
        if (!dateTime) return 'N/A';
        try {
            return new Date(dateTime).toLocaleString();
        } catch (e) {
            return dateTime;
        }
    };

    const getStatusBadge = (status) => {
        if (!status) return <span className="status-badge status-warning">In Progress</span>;
        const statusLower = status.toLowerCase();
        if (statusLower === 'completed') return <span className="status-badge status-success">Completed</span>;
        if (statusLower === 'active') return <span className="status-badge status-active">Active</span>;
        return <span className="status-badge status-default">{status}</span>;
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h2 style={styles.headerTitle}>
                        <i className="fas fa-charging-station"></i>
                        Charging Sessions Management
                    </h2>
                    <button onClick={onClose} style={styles.closeBtn}>&times;</button>
                </div>

                <div style={styles.body}>
                    {availableDevices.length > 0 && (
                        <div style={styles.infoBox}>
                            <strong>✅ Available Device IDs:</strong> {availableDevices.join(', ')}
                            <br />
                            <small>Total sessions: {sessions.length}</small>
                        </div>
                    )}

                    {error && (
                        <div style={styles.errorMessage}>
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </div>
                    )}

                    <div style={styles.filtersSection}>
                        <h3 style={styles.filtersTitle}>
                            <i className="fas fa-filter"></i> Filter Sessions
                        </h3>
                        <div style={styles.filtersGrid}>
                            <input
                                type="text"
                                name="deviceId"
                                placeholder="Device ID (e.g., SP-001)"
                                value={filters.deviceId}
                                onChange={(e) => setFilters({...filters, deviceId: e.target.value})}
                                style={styles.filterInput}
                                list="device-list"
                            />
                            <datalist id="device-list">
                                {availableDevices.map(device => (
                                    <option key={device} value={device} />
                                ))}
                            </datalist>
                            <input
                                type="text"
                                name="eaccountNo"
                                placeholder="E-Account Number"
                                value={filters.eaccountNo}
                                onChange={(e) => setFilters({...filters, eaccountNo: e.target.value})}
                                style={styles.filterInput}
                            />
                            <input
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                                style={styles.filterInput}
                            />
                            <input
                                type="date"
                                name="endDate"
                                value={filters.endDate}
                                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                                style={styles.filterInput}
                            />
                        </div>
                        <div style={styles.filterButtons}>
                            <button onClick={applyFilters} style={styles.btnPrimary}>
                                <i className="fas fa-search"></i> Apply Filters
                            </button>
                            <button onClick={resetFilters} style={styles.btnSecondary}>
                                <i className="fas fa-redo"></i> Reset Filters
                            </button>
                            <button onClick={fetchAllSessions} style={styles.btnInfo}>
                                <i className="fas fa-refresh"></i> Refresh
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={styles.loading}>
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Loading sessions...</p>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div style={styles.noData}>
                            <i className="fas fa-database"></i>
                            <p>No sessions found</p>
                            {availableDevices.length > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                    <p>Click a device to view its sessions:</p>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {availableDevices.map(device => (
                                            <button
                                                key={device}
                                                onClick={() => {
                                                    setFilters({...filters, deviceId: device});
                                                    setTimeout(() => applyFilters(), 100);
                                                }}
                                                style={styles.deviceButton}
                                            >
                                                {device}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={styles.tableResponsive}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Session ID</th>
                                        <th>Device ID</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                        <th>Consumption (kWh)</th>
                                        <th>Amount (Rs.)</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSessions.map((session) => (
                                        <tr key={session.sessionId}>
                                            <td style={styles.td}>{session.sessionId}</td>
                                            <td style={styles.td}>{session.idDevice || session.deviceId}</td>
                                            <td style={styles.td}>{formatDateTime(session.startTime)}</td>
                                            <td style={styles.td}>{formatDateTime(session.endTime)}</td>
                                            <td style={styles.td}>{session.totalConsumption?.toFixed(2) || '0.00'}</td>
                                            <td style={styles.td}>Rs.{session.amount?.toFixed(2) || '0.00'}</td>
                                            <td style={styles.td}>{getStatusBadge(session.status)}</td>
                                            <td style={styles.td}>
                                                <button onClick={() => viewSessionDetail(session.sessionId)} style={styles.actionBtn} title="View Details">
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                <button onClick={() => viewReport(session.sessionId)} style={styles.actionBtn} title="View Report">
                                                    <i className="fas fa-file-alt"></i>
                                                </button>
                                                <button onClick={() => downloadReport(session.sessionId)} style={styles.actionBtn} title="Download">
                                                    <i className="fas fa-download"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={styles.summaryInfo}>
                                Showing {filteredSessions.length} of {sessions.length} total sessions
                            </div>
                        </div>
                    )}
                </div>

                <div style={styles.footer}>
                    <span>Total: {filteredSessions.length} sessions</span>
                    <button onClick={onClose} style={styles.btnSecondary}>Close</button>
                </div>
            </div>

            {showDetail && selectedSession && (
                <div style={styles.detailOverlay}>
                    <div style={styles.detailModal}>
                        <div style={styles.detailHeader}>
                            <h3>Session Details - ID: {selectedSession.sessionId}</h3>
                            <button onClick={() => setShowDetail(false)} style={styles.closeBtn}>&times;</button>
                        </div>
                        <div style={styles.detailBody}>
                            <div><strong>Device ID:</strong> {selectedSession.idDevice || selectedSession.deviceId}</div>
                            <div><strong>Start Time:</strong> {formatDateTime(selectedSession.startTime)}</div>
                            <div><strong>End Time:</strong> {formatDateTime(selectedSession.endTime)}</div>
                            <div><strong>Consumption:</strong> {selectedSession.totalConsumption?.toFixed(3)} kWh</div>
                            <div><strong>Amount:</strong> Rs.{selectedSession.amount?.toFixed(2)}</div>
                            <div><strong>Status:</strong> {getStatusBadge(selectedSession.status)}</div>
                        </div>
                        <div style={styles.detailFooter}>
                            <button onClick={() => downloadReport(selectedSession.sessionId)} style={styles.btnPrimary}>
                                Download Report
                            </button>
                            <button onClick={() => setShowDetail(false)} style={styles.btnSecondary}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        background: 'white',
        borderRadius: '8px',
        width: '85%',
        maxWidth: '1000px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    },
    header: {
        background: 'linear-gradient(135deg, #7c0000 0%, #a30000 100%)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: 'white',
        fontSize: '24px',
        cursor: 'pointer',
    },
    body: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
    },
    infoBox: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '16px',
        fontSize: '13px',
        border: '1px solid #c3e6cb',
    },
    errorMessage: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '16px',
        fontSize: '14px',
    },
    filtersSection: {
        background: '#f8f9fa',
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '16px',
    },
    filtersTitle: {
        margin: '0 0 10px 0',
        fontSize: '14px',
        color: '#333',
    },
    filtersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '10px',
    },
    filterInput: {
        padding: '6px 10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '13px',
    },
    filterButtons: {
        display: 'flex',
        gap: '8px',
    },
    btnPrimary: {
        backgroundColor: '#7c0000',
        color: 'white',
        padding: '6px 14px',
        border: 'none',
        borderRadius: '4px',
        fontSize: '13px',
        cursor: 'pointer',
    },
    btnSecondary: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '6px 14px',
        border: 'none',
        borderRadius: '4px',
        fontSize: '13px',
        cursor: 'pointer',
    },
    btnInfo: {
        backgroundColor: '#17a2b8',
        color: 'white',
        padding: '6px 14px',
        border: 'none',
        borderRadius: '4px',
        fontSize: '13px',
        cursor: 'pointer',
    },
    deviceButton: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '6px 12px',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        cursor: 'pointer',
        margin: '3px',
    },
    loading: {
        textAlign: 'center',
        padding: '30px',
        color: '#666',
    },
    noData: {
        textAlign: 'center',
        padding: '30px',
        color: '#666',
    },
    tableResponsive: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
    },
    th: {
        padding: '8px',
        textAlign: 'left',
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f8f9fa',
        fontWeight: '600',
        color: '#333',
    },
    td: {
        padding: '8px',
        textAlign: 'left',
        borderBottom: '1px solid #eee',
    },
    actionBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        margin: '0 3px',
        fontSize: '14px',
        color: '#7c0000',
    },
    summaryInfo: {
        textAlign: 'center',
        padding: '10px',
        fontSize: '12px',
        color: '#666',
        borderTop: '1px solid #eee',
        marginTop: '10px',
    },
    footer: {
        padding: '10px 16px',
        borderTop: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
    },
    detailOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
    },
    detailModal: {
        background: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '550px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
    },
    detailHeader: {
        background: 'linear-gradient(135deg, #7c0000 0%, #a30000 100%)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailBody: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
    },
    detailFooter: {
        padding: '12px 16px',
        borderTop: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
    },
};

export default SessionManagement;



