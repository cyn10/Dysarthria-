// Patient Dashboard JavaScript - WITH SESSION COUNT DISPLAY
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Patient Dashboard loaded');
    
    // DOM Elements
    const patientSelect = document.getElementById('patientSelect');
    const refreshBtn = document.getElementById('refreshBtn');
    const patientQuickStats = document.getElementById('patientQuickStats');
    const exportDashboardBtn = document.getElementById('exportDashboardBtn');
    const lastRefreshSpan = document.getElementById('lastRefresh');
    
    // Summary elements
    const totalSessions = document.getElementById('totalSessions');
    const avgConfidence = document.getElementById('avgConfidence');
    const avgSeverity = document.getElementById('avgSeverity');
    const improvementScore = document.getElementById('improvementScore');
    
    // Data storage
    let patientData = [];
    let allPatients = [];
    let currentPatientId = null;
    
    // ===== INITIALIZATION =====
    loadPatients();
    setupEventListeners();
    updateRefreshTime();
    
    // ===== AUTO REFRESH EVERY 5 SECONDS =====
    setInterval(function() {
        if (currentPatientId && currentPatientId !== "all" && currentPatientId !== "") {
            console.log('🔄 Auto-refreshing dashboard...');
            loadPatientDashboard(currentPatientId);
        }
    }, 5000); // 5 seconds
    
    function setupEventListeners() {
        // Patient selection
        if (patientSelect) {
            patientSelect.addEventListener('change', function() {
                const patientId = this.value;
                currentPatientId = patientId;
                console.log('👤 Selected patient:', patientId);
                
                if (patientId && patientId !== "all" && patientId !== "") {
                    loadPatientDashboard(patientId);
                } else if (patientId === "all") {
                    showOverviewMessage();
                } else {
                    clearDashboard();
                }
            });
        }
        
        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                console.log('🔄 Manual refresh...');
                updateRefreshTime();
                
                if (currentPatientId && currentPatientId !== "all" && currentPatientId !== "") {
                    loadPatientDashboard(currentPatientId);
                } else {
                    loadPatients();
                }
                
                const icon = this.querySelector('i');
                icon.classList.add('fa-spin');
                setTimeout(() => icon.classList.remove('fa-spin'), 1000);
            });
        }
        
        // Export dashboard
        if (exportDashboardBtn) {
            exportDashboardBtn.addEventListener('click', exportDashboard);
        }
    }
    
    // ===== UPDATE REFRESH TIME =====
    function updateRefreshTime() {
        if (lastRefreshSpan) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
            lastRefreshSpan.textContent = timeString;
        }
    }
    
    // ===== LOAD PATIENTS =====
    async function loadPatients() {
        try {
            console.log('👥 Loading patients from API...');
            
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/get_patients?include_anonymous=true&t=${timestamp}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📦 Patients data received:', data);
                
                if (data.success && data.patients) {
                    allPatients = data.patients || [];
                    console.log(`✅ Loaded ${allPatients.length} patients`);
                    
                    updatePatientDropdown(allPatients);
                    
                    // ALWAYS select anonymous user first
                    const anonymous = allPatients.find(p => p.patient_id === 'anonymous');
                    if (anonymous) {
                        console.log('🎯 Auto-selecting Anonymous User');
                        patientSelect.value = 'anonymous';
                        currentPatientId = 'anonymous';
                        loadPatientDashboard('anonymous');
                    } else if (allPatients.length > 0) {
                        const firstPatient = allPatients[0];
                        console.log('✅ Auto-selecting patient:', firstPatient.patient_id);
                        patientSelect.value = firstPatient.patient_id;
                        currentPatientId = firstPatient.patient_id;
                        loadPatientDashboard(firstPatient.patient_id);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading patients:', error);
            showError('Failed to load patients');
        }
    }
    
    function updatePatientDropdown(patients) {
        if (!patientSelect) return;
        
        // Keep first two options
        while (patientSelect.options.length > 2) {
            patientSelect.remove(2);
        }
        
        // Add anonymous user first with session count
        const anonymous = patients.find(p => p.patient_id === 'anonymous');
        if (anonymous) {
            // Fetch latest session count
            fetch(`/api/get_sessions/anonymous?t=${new Date().getTime()}`)
                .then(res => res.json())
                .then(data => {
                    const sessionCount = data.sessions ? data.sessions.length : 0;
                    const option = document.createElement('option');
                    option.value = 'anonymous';
                    option.textContent = `Anonymous User (anonymous) - ${sessionCount} sessions`;
                    option.style.fontWeight = '700';
                    option.style.color = '#3b82f6';
                    patientSelect.appendChild(option);
                    console.log(`✅ Anonymous user has ${sessionCount} sessions`);
                })
                .catch(() => {
                    const option = document.createElement('option');
                    option.value = 'anonymous';
                    option.textContent = `Anonymous User (anonymous)`;
                    option.style.fontWeight = '600';
                    patientSelect.appendChild(option);
                });
        }
        
        // Add other patients
        patients.forEach(patient => {
            if (patient.patient_id !== 'anonymous') {
                const option = document.createElement('option');
                option.value = patient.patient_id;
                option.textContent = `${patient.name || 'Unnamed'} (${patient.patient_id})`;
                patientSelect.appendChild(option);
            }
        });
        
        console.log(`✅ Dropdown updated`);
    }
    
    // ===== LOAD PATIENT DASHBOARD - WITH NO CACHE =====
    async function loadPatientDashboard(patientId) {
        try {
            console.log(`📈 Loading dashboard for patient: ${patientId}`);
            
            showLoading(true);
            
            // IMPORTANT: Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/get_sessions/${patientId}?t=${timestamp}`);
            
            const data = await response.json();
            console.log('📦 Sessions data received:', data);
            
            if (!data.success || !data.sessions || data.sessions.length === 0) {
                console.log('⚠️ No sessions found');
                patientData = [];
                showNoSessionsMessage(patientId);
            } else {
                patientData = data.sessions;
                console.log(`✅ Loaded ${patientData.length} sessions (LATEST COUNT!)`);
                
                // Update everything
                updatePatientInfo(patientId);
                updateSummaryCards();
                updateRecentSessions();
                
                // Update dropdown to show new session count
                updatePatientDropdownSessionCount(patientId, patientData.length);
            }
            
            showLoading(false);
            updateRefreshTime();
            
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            showError('Failed to load dashboard data');
            showLoading(false);
        }
    }
    
    // ===== UPDATE DROPDOWN SESSION COUNT =====
    function updatePatientDropdownSessionCount(patientId, count) {
        if (!patientSelect) return;
        
        for (let i = 0; i < patientSelect.options.length; i++) {
            const option = patientSelect.options[i];
            if (option.value === patientId) {
                if (patientId === 'anonymous') {
                    option.textContent = `Anonymous User (anonymous) - ${count} sessions`;
                } else {
                    const baseText = option.textContent.split(' - ')[0];
                    option.textContent = `${baseText} - ${count} sessions`;
                }
                break;
            }
        }
    }
    
    // ===== PATIENT INFO =====
    function updatePatientInfo(patientId) {
        const patient = allPatients.find(p => p.patient_id === patientId) || {};
        const patientName = patient.name || 'Anonymous User';
        const patientIdDisplay = patient.patient_id || patientId;
        
        if (patientData.length === 0) {
            patientQuickStats.innerHTML = `
                <div class="patient-info-card">
                    <div class="patient-info-header">
                        <div class="patient-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="patient-details">
                            <h2>${patientName}</h2>
                            <p>
                                <i class="fas fa-id-card"></i> ID: ${patientIdDisplay}
                                <span style="margin-left: 16px;"><i class="fas fa-circle" style="color: #f59e0b; font-size: 8px;"></i> No sessions</span>
                            </p>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 20px 0;">
                        <i class="fas fa-microphone-slash" style="font-size: 32px; color: #94a3b8; margin-bottom: 12px;"></i>
                        <p style="color: #5f6b7a;">No speech analysis sessions yet</p>
                        <a href="/" class="btn btn-primary" style="margin-top: 8px; padding: 10px 24px; border-radius: 40px;">
                            <i class="fas fa-microphone"></i> Start First Session
                        </a>
                    </div>
                </div>
            `;
            return;
        }
        
        const latestSession = patientData[0];
        const sessionCount = patientData.length;
        const lastSessionDate = formatDate(latestSession.timestamp);
        const latestPrediction = latestSession.prediction || 'UNKNOWN';
        const latestConfidence = latestSession.confidence || 0;
        
        patientQuickStats.innerHTML = `
            <div class="patient-info-card">
                <div class="patient-info-header">
                    <div class="patient-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="patient-details">
                        <h2>${patientName}</h2>
                        <p>
                            <i class="fas fa-id-card"></i> ID: ${patientIdDisplay}
                            <span style="margin-left: 16px;"><i class="fas fa-circle" style="color: #10b981; font-size: 8px;"></i> Active</span>
                        </p>
                    </div>
                </div>
                
                <div class="patient-metrics">
                    <div class="metric-item">
                        <div class="metric-icon">
                            <i class="fas fa-calendar"></i>
                        </div>
                        <div class="metric-text">
                            <h4>Last Session</h4>
                            <span>${lastSessionDate}</span>
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-icon">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <div class="metric-text">
                            <h4>Latest Result</h4>
                            <span style="color: ${latestPrediction === 'DYSARTHRIC' ? '#dc2626' : '#16a34a'}">
                                ${latestPrediction} (${latestConfidence}%)
                            </span>
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-icon">
                            <i class="fas fa-microphone"></i>
                        </div>
                        <div class="metric-text">
                            <h4>Total Sessions</h4>
                            <span>${sessionCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===== SUMMARY CARDS =====
    function updateSummaryCards() {
        if (!patientData || patientData.length === 0) {
            totalSessions.textContent = '0';
            avgConfidence.textContent = '0%';
            avgSeverity.textContent = '-';
            improvementScore.textContent = '0%';
            return;
        }
        
        // Total sessions
        totalSessions.textContent = patientData.length;
        
        // Average confidence
        const avgConf = patientData.reduce((sum, session) => 
            sum + (parseFloat(session.confidence) || 0), 0) / patientData.length;
        avgConfidence.textContent = `${avgConf.toFixed(1)}%`;
        
        // Most common severity
        const severityCounts = {};
        patientData.forEach(session => {
            const severity = session.severity || 'moderate';
            severityCounts[severity] = (severityCounts[severity] || 0) + 1;
        });
        
        if (Object.keys(severityCounts).length > 0) {
            const mostCommonSeverity = Object.keys(severityCounts).reduce((a, b) => 
                severityCounts[a] > severityCounts[b] ? a : b
            );
            avgSeverity.textContent = mostCommonSeverity.charAt(0).toUpperCase() + 
                                     mostCommonSeverity.slice(1);
        }
        
        // Improvement score
        if (patientData.length >= 2) {
            const firstConf = parseFloat(patientData[patientData.length - 1].confidence) || 0;
            const lastConf = parseFloat(patientData[0].confidence) || 0;
            let improvement = 0;
            if (firstConf > 0) {
                improvement = ((lastConf - firstConf) / firstConf) * 100;
            }
            improvementScore.textContent = `${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`;
            improvementScore.style.color = improvement > 0 ? '#10b981' : 
                                          improvement < 0 ? '#dc2626' : '#5f6b7a';
        } else {
            improvementScore.textContent = 'N/A';
        }
    }
    
    // ===== RECENT SESSIONS =====
    function updateRecentSessions() {
        const container = document.getElementById('recentSessions');
        if (!container) return;
        
        if (!patientData || patientData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-microphone-slash"></i>
                    <h3>No Sessions Found</h3>
                    <p>Complete your first speech analysis to start tracking progress</p>
                    <a href="/" class="btn btn-primary">
                        <i class="fas fa-microphone"></i> Start Analysis
                    </a>
                </div>
            `;
            return;
        }
        
        const recentSessions = patientData.slice(0, 6);
        
        container.innerHTML = recentSessions.map(session => {
            const date = formatDate(session.timestamp);
            const time = formatTime(session.timestamp);
            const prediction = session.prediction || 'UNKNOWN';
            const confidence = session.confidence || 0;
            const severity = session.severity || 'moderate';
            const sessionId = session.session_id || session.id || '';
            
            return `
                <div class="session-card">
                    <div class="session-header">
                        <span class="session-date">
                            <i class="far fa-calendar-alt"></i> ${date}
                            <span style="margin-left: 8px;"><i class="far fa-clock"></i> ${time}</span>
                        </span>
                        <span class="prediction-badge ${prediction === 'DYSARTHRIC' ? 'dysarthric' : 'healthy'}">
                            ${prediction}
                        </span>
                    </div>
                    <div class="session-stats">
                        <div class="session-stat">
                            <span class="session-stat-label">Confidence</span>
                            <span class="session-stat-value">${confidence}%</span>
                        </div>
                        <div class="session-stat">
                            <span class="session-stat-label">Severity</span>
                            <span class="session-stat-value" style="text-transform: capitalize;">${severity}</span>
                        </div>
                    </div>
                    <div class="session-link">
                        <a href="/results?id=${sessionId}">
                            View Details <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // ===== NO SESSIONS MESSAGE =====
    function showNoSessionsMessage(patientId) {
        const patient = allPatients.find(p => p.patient_id === patientId) || {};
        updatePatientInfo(patientId);
        updateSummaryCards();
        
        const container = document.getElementById('recentSessions');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-microphone-slash"></i>
                    <h3>No Sessions Found</h3>
                    <p>${patient.name || 'This patient'} hasn't completed any speech analysis yet</p>
                    <a href="/" class="btn btn-primary">
                        <i class="fas fa-microphone"></i> Start First Session
                    </a>
                </div>
            `;
        }
    }
    
    // ===== OVERVIEW MESSAGE =====
    function showOverviewMessage() {
        patientQuickStats.innerHTML = `
            <div class="patient-info-card">
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-users" style="font-size: 48px; color: #3b82f6; margin-bottom: 16px;"></i>
                    <h3 style="font-weight: 700; margin-bottom: 8px;">All Patients Overview</h3>
                    <p style="color: #5f6b7a; max-width: 500px; margin: 0 auto;">
                        Select a specific patient from the dropdown above to view their individual progress dashboard.
                    </p>
                </div>
            </div>
        `;
        
        totalSessions.textContent = '0';
        avgConfidence.textContent = '0%';
        avgSeverity.textContent = '-';
        improvementScore.textContent = '0%';
        
        const container = document.getElementById('recentSessions');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-md"></i>
                    <h3>Select a Patient</h3>
                    <p>Choose a patient from the dropdown to view their sessions</p>
                </div>
            `;
        }
    }
    
    // ===== CLEAR DASHBOARD =====
    function clearDashboard() {
        patientQuickStats.innerHTML = '';
        totalSessions.textContent = '0';
        avgConfidence.textContent = '0%';
        avgSeverity.textContent = '-';
        improvementScore.textContent = '0%';
        
        const container = document.getElementById('recentSessions');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-md"></i>
                    <h3>Select a Patient</h3>
                    <p>Choose a patient from the dropdown to view their dashboard</p>
                </div>
            `;
        }
    }
    
    // ===== EXPORT DASHBOARD =====
    async function exportDashboard() {
        if (!currentPatientId || currentPatientId === 'all' || currentPatientId === '') {
            alert('Please select a specific patient to export data');
            return;
        }
        
        const patient = allPatients.find(p => p.patient_id === currentPatientId) || {};
        const patientName = patient.name || currentPatientId;
        
        let csvContent = "Date,Time,Session Name,Prediction,Confidence %,Severity\n";
        
        if (patientData && patientData.length > 0) {
            patientData.forEach(session => {
                const date = formatDate(session.timestamp);
                const time = formatTime(session.timestamp);
                csvContent += `"${date}",`;
                csvContent += `"${time}",`;
                csvContent += `"${session.session_name || 'Speech Analysis'}",`;
                csvContent += `${session.prediction || ''},`;
                csvContent += `${session.confidence || 0},`;
                csvContent += `${session.severity || 'moderate'}\n`;
            });
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dysarthria_${patientName}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('✅ Dashboard data exported successfully!');
    }
    
    // ===== UTILITY FUNCTIONS =====
    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        } catch {
            return dateString;
        }
    }
    
    function formatTime(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch {
            return '';
        }
    }
    
    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    function showError(message) {
        console.error(message);
    }
});

// Add loading overlay CSS
const style = document.createElement('style');
style.textContent = `
    #loadingOverlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(4px);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        flex-direction: column;
        gap: 20px;
    }
    #loadingOverlay i {
        font-size: 48px;
        color: #3b82f6;
    }
    #loadingOverlay h3 {
        color: #1a2639;
        font-weight: 600;
        font-size: 20px;
    }
`;
document.head.appendChild(style);