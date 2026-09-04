// PROGRESS.JS - COMPLETE FIXED VERSION WITH COMPARE & SHARE FEATURES
// Fixed API endpoints and loading spinner

document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Progress Tracking page loaded');
    
    // ===== FIX FOR BOOTSTRAP MODAL ARIA-HIDDEN WARNINGS =====
    // This ensures proper focus management when modals close
    if (typeof $ !== 'undefined') {
        // When any modal is hidden, ensure focus is properly managed
        $(document).on('hidden.bs.modal', '.modal', function () {
            // Remove any lingering focus inside the modal
            if ($(this).find(':focus').length) {
                $(this).find(':focus').blur();
            }
            // Move focus to body to prevent aria-hidden warnings
            $('body').focus();
        });
        
        // When share modal is shown, focus on therapist email input
        $(document).on('shown.bs.modal', '#shareTherapistModal', function () {
            $('#therapistEmail').focus();
        });
        
        // When share modal is about to be hidden, remove focus from any buttons
        $(document).on('hide.bs.modal', '#shareTherapistModal', function () {
            if ($(this).find('button:focus').length) {
                $(this).find('button:focus').blur();
            }
        });
        
        // When compare modal is shown, focus on first select
        $(document).on('shown.bs.modal', '#compareSessionsModal', function () {
            $('#compareSession1').focus();
        });
        
        // When compare modal is about to be hidden, remove focus
        $(document).on('hide.bs.modal', '#compareSessionsModal', function () {
            if ($(this).find('button:focus').length) {
                $(this).find('button:focus').blur();
            }
        });
    }
    
    // ===== DOM ELEMENTS =====
    const loadingState = document.getElementById('loadingState');
    const progressContent = document.getElementById('progressContent');
    const noDataState = document.getElementById('noDataState');
    const patientSelect = document.getElementById('patient-select');
    const refreshBtn = document.getElementById('refreshBtn');
    const newPatientBtn = document.getElementById('newPatientBtn');
    const exportBtn = document.getElementById('exportBtn');
    const compareBtn = document.getElementById('compareBtn');
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');
    const sessionsContainer = document.getElementById('sessionsContainer');
    const progressContainer = document.getElementById('progressContainer');
    
    const totalSessions = document.getElementById('totalSessions');
    const avgConfidence = document.getElementById('avgConfidence');
    const firstSession = document.getElementById('firstSession');
    const latestSession = document.getElementById('latestSession');
    
    // Bootstrap select
    const bootstrapPatientSelect = document.getElementById('patient-select');
    
    // Charts
    let confidenceChart = null;
    let predictionChart = null;
    let progressChart = null;
    let voiceChart = null;
    
    // Current patient ID
    let currentPatientId = 'anonymous';
    
    // ===== INITIALIZATION =====
    loadPatients();
    
    // Hide loading spinner immediately
    if (loadingState) loadingState.style.display = 'none';
    
    // ===== LOAD PATIENTS =====
    async function loadPatients() {
        try {
            const response = await fetch('/api/get_patients');
            if (!response.ok) throw new Error('Failed to load patients');
            
            const data = await response.json();
            if (data.success) {
                updatePatientSelect(data.patients);
                // Load progress for anonymous after patients load
                setTimeout(() => loadProgressData('anonymous'), 300);
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }
    
    function updatePatientSelect(patients) {
        if (!patientSelect) return;
        
        patientSelect.innerHTML = '<option value="">Select Patient</option>';
        
        // Add anonymous first
        const anonymous = patients.find(p => p.patient_id === 'anonymous');
        if (anonymous) {
            const option = document.createElement('option');
            option.value = anonymous.patient_id;
            option.textContent = `👤 ${anonymous.name || 'Anonymous User'} (Default)`;
            patientSelect.appendChild(option);
        }
        
        // Add all patients
        patients.forEach(patient => {
            if (patient.patient_id !== 'anonymous') {
                const option = document.createElement('option');
                option.value = patient.patient_id;
                option.textContent = `👤 ${patient.name || 'Unknown'} (${patient.patient_id})`;
                patientSelect.appendChild(option);
            }
        });
        
        // Auto-select anonymous
        patientSelect.value = 'anonymous';
        currentPatientId = 'anonymous';
    }
    
    // ===== LOAD PROGRESS DATA - FIXED API ENDPOINTS =====
    async function loadProgressData(patientId) {
        try {
            // Get patient ID
            currentPatientId = patientId || patientSelect?.value || 'anonymous';
            
            // Show loading
            if (loadingState) loadingState.style.display = 'block';
            if (progressContent) progressContent.style.display = 'none';
            if (noDataState) noDataState.style.display = 'none';
            
            console.log(`📊 Loading data for patient: ${currentPatientId}`);
            
            // Load all data in parallel - FIXED ENDPOINTS
            const [sessionsResponse, goalsResponse, achievementsResponse] = await Promise.all([
                fetch(`/api/get_sessions/${currentPatientId}`),
                fetch(`/api/get_goals/${currentPatientId}`).catch(() => ({ 
                    ok: true, 
                    json: () => Promise.resolve({ success: false, goals: [] }) 
                })),
                fetch(`/api/get_achievements/${currentPatientId}`).catch(() => ({ 
                    ok: true, 
                    json: () => Promise.resolve({ success: false, achievements: [] }) 
                }))
            ]);
            
            const sessionsData = await sessionsResponse.json();
            
            let goalsData = { goals: [] };
            let achievementsData = { achievements: [] };
            
            try {
                goalsData = await goalsResponse.json();
            } catch (e) {
                console.log('No goals data');
            }
            
            try {
                achievementsData = await achievementsResponse.json();
            } catch (e) {
                console.log('No achievements data');
            }
            
            // Hide loading - CRITICAL
            if (loadingState) loadingState.style.display = 'none';
            
            if (sessionsData.success && sessionsData.sessions && sessionsData.sessions.length > 0) {
                // Show content
                if (progressContent) progressContent.style.display = 'block';
                if (noDataState) noDataState.style.display = 'none';
                
                // Update everything
                updateStatistics(sessionsData.sessions);
                updateCharts(sessionsData.sessions, sessionsData.progress || []);
                updateSessionsList(sessionsData.sessions);
                updateTimeline(sessionsData.sessions);
                updateGoals(goalsData.goals || []);
                updateAchievements(achievementsData.achievements || []);
                
            } else {
                // No data
                if (progressContent) progressContent.style.display = 'none';
                if (noDataState) noDataState.style.display = 'block';
                
                // Still update goals/achievements
                updateGoals(goalsData.goals || []);
                updateAchievements(achievementsData.achievements || []);
            }
            
        } catch (error) {
            console.error('❌ Error loading progress data:', error);
            if (loadingState) loadingState.style.display = 'none';
            if (noDataState) {
                noDataState.style.display = 'block';
                noDataState.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
                    <h3 class="mt-4">Error Loading Data</h3>
                    <p class="text-muted">${error.message || 'Failed to load progress data'}</p>
                    <button onclick="location.reload()" class="btn btn-primary btn-lg mt-3">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                `;
            }
        }
    }
    
    // ===== UPDATE STATISTICS =====
    function updateStatistics(sessions) {
        if (!totalSessions || !avgConfidence || !firstSession || !latestSession) return;
        
        totalSessions.textContent = sessions.length;
        
        if (sessions.length > 0) {
            const avgConf = sessions.reduce((sum, session) => sum + (session.confidence || 0), 0) / sessions.length;
            avgConfidence.textContent = `${avgConf.toFixed(1)}%`;
            
            const first = new Date(sessions[sessions.length - 1].timestamp);
            firstSession.textContent = first.toLocaleDateString();
            
            const latest = new Date(sessions[0].timestamp);
            latestSession.textContent = latest.toLocaleDateString();
        }
    }
    
    // ===== UPDATE CHARTS =====
    function updateCharts(sessions, progress) {
        // Confidence Chart
        const confidenceCtx = document.getElementById('confidenceChart')?.getContext('2d');
        if (confidenceCtx) {
            if (confidenceChart) confidenceChart.destroy();
            
            if (sessions.length > 0) {
                const dates = sessions.map(s => new Date(s.timestamp).toLocaleDateString()).reverse();
                const confidences = sessions.map(s => s.confidence).reverse();
                
                confidenceChart = new Chart(confidenceCtx, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Confidence %',
                            data: confidences,
                            borderColor: '#4a6fa5',
                            backgroundColor: 'rgba(74, 111, 165, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: { y: { beginAtZero: true, max: 100 } }
                    }
                });
            }
        }
        
        // Prediction Chart
        const predictionCtx = document.getElementById('predictionChart')?.getContext('2d');
        if (predictionCtx) {
            if (predictionChart) predictionChart.destroy();
            
            const healthyCount = sessions.filter(s => s.prediction === 'HEALTHY').length;
            const dysarthricCount = sessions.filter(s => s.prediction === 'DYSARTHRIC').length;
            
            predictionChart = new Chart(predictionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Healthy', 'Dysarthric'],
                    datasets: [{
                        data: [healthyCount, dysarthricCount],
                        backgroundColor: ['#27ae60', '#e74c3c'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true
                }
            });
        }
    }
    
    // ===== UPDATE SESSIONS LIST =====
    function updateSessionsList(sessions) {
        if (!sessionsContainer) return;
        
        if (sessions.length === 0) {
            sessionsContainer.innerHTML = '<p class="text-center text-muted py-4">No sessions found</p>';
            return;
        }
        
        let html = '';
        sessions.slice(0, 10).forEach(session => {
            const date = session.timestamp ? new Date(session.timestamp).toLocaleString() : 'N/A';
            const predictionClass = session.prediction === 'DYSARTHRIC' ? 'text-danger' : 'text-success';
            
            html += `
                <div class="session-item" data-session-id="${session.session_id || session.id}">
                    <div class="session-header">
                        <span class="session-title">
                            <i class="fas fa-microphone-alt"></i> ${session.session_name || 'Speech Analysis'}
                        </span>
                        <span class="session-date">
                            <i class="far fa-calendar-alt"></i> ${date}
                        </span>
                    </div>
                    <div class="session-details">
                        <div class="detail-item">
                            <span class="detail-label">Confidence</span>
                            <span class="detail-value">${session.confidence?.toFixed(1) || '0'}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prediction</span>
                            <span class="detail-value ${predictionClass}">${session.prediction || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Articulation</span>
                            <span class="detail-value">${session.articulation_score || '0'}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Severity</span>
                            <span class="detail-value">${session.severity || 'N/A'}</span>
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <button class="btn btn-sm btn-outline-primary view-session-btn" data-session-id="${session.session_id || session.id}">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                </div>
            `;
        });
        
        sessionsContainer.innerHTML = html;
        
        // Add event listeners
        document.querySelectorAll('.view-session-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const sessionId = this.dataset.sessionId;
                if (sessionId) {
                    window.location.href = `/results?id=${sessionId}`;
                }
            });
        });
    }
    
    // ===== UPDATE TIMELINE =====
    function updateTimeline(sessions) {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;
        
        if (sessions.length === 0) {
            timeline.innerHTML = '<p class="text-muted text-center py-3">No timeline data available</p>';
            return;
        }
        
        let html = '';
        sessions.slice(0, 5).forEach(session => {
            const date = session.timestamp ? new Date(session.timestamp).toLocaleString() : 'N/A';
            html += `
                <div class="timeline-item">
                    <div class="timeline-date">${date}</div>
                    <div class="timeline-content">
                        <strong>Analysis Completed</strong>
                        <p class="mb-0 text-muted small">
                            Confidence: ${session.confidence?.toFixed(1) || '0'}% - ${session.prediction || 'N/A'}
                        </p>
                    </div>
                </div>
            `;
        });
        
        timeline.innerHTML = html;
    }
    
    // ===== UPDATE GOALS =====
    function updateGoals(goals) {
        const goalsList = document.getElementById('goalsList');
        if (!goalsList) return;
        
        if (goals.length === 0) {
            goalsList.innerHTML = `
                <p class="text-muted text-center py-3">No goals set yet.</p>
                <button class="btn btn-outline-primary w-100" onclick="document.getElementById('addGoalBtn')?.click()">
                    <i class="fas fa-plus"></i> Create Your First Goal
                </button>
            `;
        } else {
            let html = '';
            goals.slice(0, 3).forEach(goal => {
                const progress = goal.target_value > 0 
                    ? Math.min(100, Math.round((goal.current_value || 0) / goal.target_value * 100))
                    : 0;
                html += `
                    <div class="goal-card goal-progress">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="fw-bold mb-1">${goal.title || 'Speech Goal'}</h5>
                                <p class="text-muted small mb-2">${goal.description || 'Progress goal'}</p>
                            </div>
                            <span class="badge bg-info">${progress}%</span>
                        </div>
                        <div class="mt-2">
                            <div class="progress metric-progress">
                                <div class="progress-bar metric-progress-bar" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            });
            goalsList.innerHTML = html;
        }
    }
    
    // ===== UPDATE ACHIEVEMENTS =====
    function updateAchievements(achievements) {
        const achievementsList = document.getElementById('achievementsList');
        if (!achievementsList) return;
        
        if (achievements.length === 0) {
            achievementsList.innerHTML = `
                <div class="col-12">
                    <div class="achievement-badge">
                        <div class="badge-icon">
                            <i class="fas fa-medal"></i>
                        </div>
                        <h6 class="fw-bold mb-1">First Assessment</h6>
                        <small class="text-muted">Complete your first assessment to earn this badge</small>
                    </div>
                </div>
            `;
        } else {
            let html = '';
            achievements.slice(0, 4).forEach(ach => {
                html += `
                    <div class="col-6">
                        <div class="achievement-badge">
                            <div class="badge-icon">
                                <i class="fas ${ach.badge_icon || 'fa-medal'}"></i>
                            </div>
                            <h6 class="fw-bold mb-1">${ach.badge_name || 'Achievement'}</h6>
                            <small class="text-muted">${ach.badge_description || 'Completed milestone'}</small>
                        </div>
                    </div>
                `;
            });
            achievementsList.innerHTML = html;
        }
    }
    
    // ===== EXPORT REPORT =====
    function exportProgressReport() {
        const patientName = patientSelect?.options[patientSelect.selectedIndex]?.text || 'Anonymous';
        const sessionCount = totalSessions?.textContent || '0';
        const avgConf = avgConfidence?.textContent || '0%';
        
        const reportText = `
DYSTALK PROGRESS REPORT
=============================================
Generated: ${new Date().toLocaleString()}
Patient: ${patientName}

SUMMARY STATISTICS
---------------------------------------------
Total Sessions: ${sessionCount}
Average Confidence: ${avgConf}

=============================================
This report is for informational purposes only.
Consult healthcare professionals for medical advice.
=============================================
        `;
        
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dysarthria_progress_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('✅ Progress report exported successfully!');
    }
    
    // ===== NEW: COMPARE SESSIONS FUNCTIONALITY =====
    async function compareSessions() {
        const patientId = currentPatientId || 'anonymous';
        
        try {
            // Fetch sessions for comparison
            const response = await fetch(`/api/get_sessions_for_comparison/${patientId}`);
            const data = await response.json();
            
            if (!data.success || !data.sessions || data.sessions.length < 2) {
                alert('Need at least 2 sessions to compare. Please complete more analyses first.');
                return;
            }
            
            // Create comparison modal dynamically
            createComparisonModal(data.sessions);
            
        } catch (error) {
            console.error('Error loading sessions for comparison:', error);
            alert('Failed to load sessions for comparison');
        }
    }
    
    function createComparisonModal(sessions) {
        // Remove existing modal if any
        const existingModal = document.getElementById('compareSessionsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal HTML
        const modalHTML = `
        <div class="modal fade" id="compareSessionsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white;">
                        <h5 class="modal-title">
                            <i class="fas fa-exchange-alt"></i> Compare Sessions
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-4">
                            <div class="col-md-5">
                                <label class="form-label fw-bold">Select First Session</label>
                                <select class="form-select" id="compareSession1">
                                    <option value="">Choose session...</option>
                                    ${sessions.map(s => `<option value="${s.id}">${s.formatted_date} - ${s.prediction} (${s.confidence.toFixed(1)}%)</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-2 text-center d-flex align-items-center justify-content-center">
                                <i class="fas fa-vs" style="font-size: 2rem; color: #667eea;"></i>
                            </div>
                            <div class="col-md-5">
                                <label class="form-label fw-bold">Select Second Session</label>
                                <select class="form-select" id="compareSession2">
                                    <option value="">Choose session...</option>
                                    ${sessions.map(s => `<option value="${s.id}">${s.formatted_date} - ${s.prediction} (${s.confidence.toFixed(1)}%)</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="text-center mb-4">
                            <button class="btn btn-primary btn-lg" id="runComparisonBtn" disabled>
                                <i class="fas fa-chart-line"></i> Compare Sessions
                            </button>
                        </div>
                        
                        <div id="comparisonResults" style="display: none;">
                            <hr>
                            <h4 class="mb-3">Comparison Results</h4>
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Metric</th>
                                            <th>Session 1</th>
                                            <th>Session 2</th>
                                            <th>Change</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="comparisonTableBody"></tbody>
                                </table>
                            </div>
                            <div class="mt-3 p-3 bg-light rounded" id="comparisonSummary"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-success" id="exportComparisonBtn" style="display: none;">
                            <i class="fas fa-download"></i> Export Comparison
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        document.getElementById('compareSession1').addEventListener('change', updateCompareButton);
        document.getElementById('compareSession2').addEventListener('change', updateCompareButton);
        document.getElementById('runComparisonBtn').addEventListener('click', runComparison);
        document.getElementById('exportComparisonBtn').addEventListener('click', exportComparison);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('compareSessionsModal'));
        modal.show();
    }
    
    function updateCompareButton() {
        const session1 = document.getElementById('compareSession1').value;
        const session2 = document.getElementById('compareSession2').value;
        const btn = document.getElementById('runComparisonBtn');
        btn.disabled = !(session1 && session2 && session1 !== session2);
    }
    
    async function runComparison() {
        const session1 = document.getElementById('compareSession1').value;
        const session2 = document.getElementById('compareSession2').value;
        
        const btn = document.getElementById('runComparisonBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comparing...';
        btn.disabled = true;
        
        try {
            const response = await fetch('/api/compare_sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_ids: [session1, session2] })
            });
            
            const data = await response.json();
            
            if (data.success) {
                displayComparisonResults(data.comparison);
            } else {
                alert('Error: ' + (data.error || 'Failed to compare sessions'));
            }
        } catch (error) {
            console.error('Comparison error:', error);
            alert('Failed to compare sessions');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
    
    function displayComparisonResults(comparison) {
        document.getElementById('comparisonResults').style.display = 'block';
        document.getElementById('exportComparisonBtn').style.display = 'inline-block';
        
        window.currentComparison = comparison;
        
        const tbody = document.getElementById('comparisonTableBody');
        tbody.innerHTML = '';
        
        const metrics = [
            { key: 'confidence', name: 'Confidence', unit: '%', higherBetter: true },
            { key: 'articulation', name: 'Articulation', unit: '%', higherBetter: true },
            { key: 'jitter', name: 'Jitter', unit: '%', higherBetter: false },
            { key: 'shimmer', name: 'Shimmer', unit: '%', higherBetter: false },
            { key: 'hnr', name: 'HNR', unit: 'dB', higherBetter: true }
        ];
        
        metrics.forEach(metric => {
            if (comparison.metrics[metric.key]) {
                const data = comparison.metrics[metric.key];
                const values = data.values;
                const change = data.change;
                
                if (values.length >= 2) {
                    let status = '';
                    let statusClass = '';
                    
                    if (values[1] === values[0]) {
                        status = 'Stable';
                        statusClass = 'bg-secondary';
                    } else {
                        const improved = (metric.higherBetter && values[1] > values[0]) || 
                                        (!metric.higherBetter && values[1] < values[0]);
                        status = improved ? 'Improved' : 'Declined';
                        statusClass = improved ? 'bg-success' : 'bg-danger';
                    }
                    
                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${metric.name}</strong></td>
                            <td>${values[0]?.toFixed(1) || 'N/A'} ${metric.unit}</td>
                            <td>${values[1]?.toFixed(1) || 'N/A'} ${metric.unit}</td>
                            <td class="${change > 0 ? 'text-success' : change < 0 ? 'text-danger' : ''}">
                                ${change > 0 ? '+' : ''}${change}%
                            </td>
                            <td>
                                <span class="badge ${statusClass}">${status}</span>
                            </td>
                        </tr>
                    `;
                }
            }
        });
        
        const summary = document.getElementById('comparisonSummary');
        const improvedCount = comparison.summary.improved_metrics?.length || 0;
        const declinedCount = comparison.summary.declined_metrics?.length || 0;
        const overallTrend = improvedCount > declinedCount ? 'improving' : (declinedCount > improvedCount ? 'declining' : 'stable');
        
        summary.innerHTML = `
            <strong>Summary:</strong> 
            Improved in ${improvedCount} metrics, 
            declined in ${declinedCount} metrics.
            Overall trend: <span class="${overallTrend === 'improving' ? 'text-success' : overallTrend === 'declining' ? 'text-danger' : 'text-warning'}">
                ${overallTrend}
            </span>
        `;
    }
    
    function exportComparison() {
        if (!window.currentComparison) return;
        
        const comparison = window.currentComparison;
        const session1 = comparison.sessions[0];
        const session2 = comparison.sessions[1];
        
        const date1 = session1.timestamp ? new Date(session1.timestamp).toLocaleString() : 'Session 1';
        const date2 = session2.timestamp ? new Date(session2.timestamp).toLocaleString() : 'Session 2';
        
        let report = `SESSION COMPARISON REPORT
====================================
Generated: ${new Date().toLocaleString()}

Comparing: ${date1} vs ${date2}
Overall Trend: ${comparison.summary.overall_trend}

METRICS COMPARISON
------------------------------------\n`;
        
        const metrics = ['confidence', 'articulation', 'jitter', 'shimmer', 'hnr'];
        metrics.forEach(key => {
            if (comparison.metrics[key]) {
                const data = comparison.metrics[key];
                if (data.values.length >= 2) {
                    report += `${key}: ${data.values[0]?.toFixed(1)} → ${data.values[1]?.toFixed(1)} (${data.change > 0 ? '+' : ''}${data.change}%)\n`;
                }
            }
        });
        
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_comparison_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('✅ Comparison exported successfully!');
    }
    
    // ===== NEW: SHARE WITH THERAPIST FUNCTIONALITY =====
    function shareWithTherapist() {
        const patientId = currentPatientId || 'anonymous';
        
        // Get patient info from the UI
        const patientName = document.querySelector('.info-card + .info-card + .info-card + .info-card')?.previousElementSibling?.previousElementSibling?.previousElementSibling?.previousElementSibling?.querySelector('p')?.textContent || 'Patient';
        
        createShareModal(patientId, patientName);
    }
    
    function createShareModal(patientId, patientName) {
        // Remove existing modal if any
        const existingModal = document.getElementById('shareTherapistModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modalHTML = `
        <div class="modal fade" id="shareTherapistModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, #11998e, #38ef7d); color: white;">
                        <h5 class="modal-title">
                            <i class="fas fa-share-alt"></i> Share Progress with Therapist
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="sharePatientId" value="${patientId}">
                        
                        <div class="alert alert-info mb-4">
                            <i class="fas fa-info-circle"></i> 
                            Share your progress report directly with your speech therapist.
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold">Therapist's Email</label>
                            <input type="email" class="form-control form-control-lg" id="therapistEmail" 
                                   placeholder="therapist@clinic.com" required>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold">Therapist's Name</label>
                            <input type="text" class="form-control" id="therapistName" 
                                   placeholder="e.g., Dr. Smith">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold">Personal Message (Optional)</label>
                            <textarea class="form-control" id="shareMessage" rows="3" 
                                      placeholder="Add a personal note for your therapist..."></textarea>
                        </div>
                        
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="includeAttachments" checked>
                                <label class="form-check-label" for="includeAttachments">
                                    Include latest session report as PDF
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" id="sendToTherapistBtn">
                            <i class="fas fa-paper-plane"></i> Send to Therapist
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('sendToTherapistBtn').addEventListener('click', sendToTherapist);
        
        const modal = new bootstrap.Modal(document.getElementById('shareTherapistModal'));
        modal.show();
    }
    
    async function sendToTherapist() {
        const therapistEmail = document.getElementById('therapistEmail').value;
        const therapistName = document.getElementById('therapistName').value || 'Therapist';
        const message = document.getElementById('shareMessage').value;
        const includeAttachments = document.getElementById('includeAttachments').checked;
        const patientId = document.getElementById('sharePatientId').value;
        
        if (!therapistEmail) {
            alert('Please enter therapist\'s email address');
            return;
        }
        
        if (!therapistEmail.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }
        
        const btn = document.getElementById('sendToTherapistBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;
        
        try {
            const response = await fetch('/api/share_with_therapist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    therapist_email: therapistEmail,
                    therapist_name: therapistName,
                    message: message,
                    include_attachments: includeAttachments
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('✅ Report shared successfully with therapist!');
                bootstrap.Modal.getInstance(document.getElementById('shareTherapistModal')).hide();
            } else {
                alert('Error: ' + (data.error || 'Failed to share'));
            }
        } catch (error) {
            console.error('Share error:', error);
            alert('Failed to share. Please try again.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
    
    // ===== EVENT LISTENERS =====
    
    // Make loadProgressData globally available
    window.loadProgressData = loadProgressData;
    
    // Load Progress Button
    const loadBtn = document.getElementById('loadPatientProgress');
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            const patientId = patientSelect?.value;
            if (!patientId) {
                alert('Please select a patient');
                return;
            }
            loadProgressData(patientId);
        });
    }
    
    // Refresh Button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadProgressData(currentPatientId);
        });
    }
    
    // Patient Select Change
    if (patientSelect) {
        patientSelect.addEventListener('change', function() {
            currentPatientId = this.value;
        });
    }
    
    // Export Button
    if (exportBtn) {
        exportBtn.addEventListener('click', exportProgressReport);
    }
    
    // NEW: Compare Button
    if (compareBtn) {
        compareBtn.addEventListener('click', compareSessions);
    }
    
    // NEW: Share Button (if exists)
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareWithTherapist);
    }
    
    // Print Button
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
    
    // Add Goal Button
    const addGoalBtn = document.getElementById('addGoalBtn');
    if (addGoalBtn) {
        addGoalBtn.addEventListener('click', function() {
            const patientId = patientSelect?.value || 'anonymous';
            if (!patientId) {
                alert('Please select a patient first');
                return;
            }
            
            document.getElementById('goalPatientId').value = patientId;
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 30);
            const targetDateField = document.getElementById('goalTargetDate');
            if (targetDateField) {
                targetDateField.value = targetDate.toISOString().split('T')[0];
            }
            
            const goalModal = new bootstrap.Modal(document.getElementById('goalModal'));
            goalModal.show();
        });
    }
    
    // Save Goal Button
    const saveGoalBtn = document.getElementById('saveGoalBtn');
    if (saveGoalBtn) {
        saveGoalBtn.addEventListener('click', async function() {
            const goalData = {
                patient_id: document.getElementById('goalPatientId')?.value || currentPatientId,
                title: document.getElementById('goalTitle')?.value,
                description: document.getElementById('goalDescription')?.value || '',
                target_value: parseFloat(document.getElementById('goalTarget')?.value) || 85,
                current_value: parseFloat(document.getElementById('goalCurrent')?.value) || 0,
                unit: document.getElementById('goalUnit')?.value || '%',
                category: document.getElementById('goalCategory')?.value || 'speech',
                target_date: document.getElementById('goalTargetDate')?.value || '',
                status: 'active'
            };
            
            if (!goalData.title) {
                alert('Please enter a goal title');
                return;
            }
            
            try {
                const response = await fetch('/api/create_goal', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(goalData)
                });
                
                const data = await response.json();
                if (data.success) {
                    alert('✅ Goal created successfully!');
                    bootstrap.Modal.getInstance(document.getElementById('goalModal')).hide();
                    loadProgressData(currentPatientId);
                } else {
                    alert('❌ Error: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('❌ Failed to create goal');
            }
        });
    }
    
    console.log('✅ Complete Progress Tracking initialized with Compare & Share features');
});