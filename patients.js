// ===== COMPLETE PATIENTS.JS - FULL CRUD OPERATIONS =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('👥 Patient Management System - Initialized');
    
    // ===== GLOBAL VARIABLES =====
    let patients = [];
    let currentPatientId = null;
    
    // ===== DOM ELEMENTS =====
    const patientsTableBody = document.getElementById('patientsTableBody');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const patientsTableContainer = document.getElementById('patientsTableContainer');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // Stats elements
    const totalPatientsEl = document.getElementById('totalPatients');
    const totalSessionsEl = document.getElementById('totalSessions');
    const avgArticulationEl = document.getElementById('avgArticulation');
    const activeGoalsEl = document.getElementById('activeGoals');
    
    // ===== INITIAL LOAD =====
    loadPatients();
    loadDashboardStats();
    
    // ===== EVENT LISTENERS =====
    
    // Search input with debounce
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = this.value.trim();
            if (query.length > 0) {
                searchPatients(query);
            } else {
                loadPatients();
            }
        }, 500);
    });
    
    // Filter status
    filterStatus.addEventListener('change', function() {
        filterPatients();
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', function() {
        loadPatients();
        loadDashboardStats();
        showToast('Refreshed', 'Patient list updated', 'info');
    });
    
    // Save patient button
    document.getElementById('savePatientBtn').addEventListener('click', createPatient);
    
    // Update patient button
    document.getElementById('updatePatientBtn').addEventListener('click', updatePatient);
    
    // Confirm delete button
    document.getElementById('confirmDeleteBtn').addEventListener('click', deletePatient);
    
    // View sessions button
    document.getElementById('viewSessionsBtn').addEventListener('click', function() {
        if (currentPatientId) {
            window.location.href = `/progress?patient_id=${currentPatientId}`;
        }
    });
    
    // View edit button
    document.getElementById('viewEditBtn').addEventListener('click', function() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('viewPatientModal'));
        modal.hide();
        
        setTimeout(() => {
            openEditModal(currentPatientId);
        }, 500);
    });
    
    // ===== LOAD PATIENTS =====
    async function loadPatients() {
        showLoading(true);
        
        try {
            const response = await fetch('/api/get_patients?include_anonymous=false');
            const data = await response.json();
            
            if (data.success) {
                patients = data.patients || [];
                renderPatientsTable(patients);
                updateStats();
            } else {
                console.error('Failed to load patients:', data.error);
                showToast('Error', 'Failed to load patients', 'error');
            }
        } catch (error) {
            console.error('Error loading patients:', error);
            showToast('Error', 'Could not connect to server', 'error');
        } finally {
            showLoading(false);
        }
    }
    
    // ===== SEARCH PATIENTS =====
    async function searchPatients(query) {
        showLoading(true);
        
        try {
            const response = await fetch(`/api/search_patients?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                patients = data.patients || [];
                renderPatientsTable(patients);
                
                if (patients.length === 0) {
                    showEmptyState(`No patients found matching "${query}"`);
                }
            }
        } catch (error) {
            console.error('Error searching patients:', error);
        } finally {
            showLoading(false);
        }
    }
    
    // ===== FILTER PATIENTS =====
    function filterPatients() {
        const status = filterStatus.value;
        
        if (status === 'all') {
            renderPatientsTable(patients);
        } else {
            const filtered = patients.filter(p => p.status === status);
            renderPatientsTable(filtered);
            
            if (filtered.length === 0) {
                showEmptyState(`No ${status} patients found`);
            }
        }
    }
    
    // ===== RENDER PATIENTS TABLE =====
    function renderPatientsTable(patientsData) {
        if (!patientsTableBody) return;
        
        if (patientsData.length === 0) {
            showEmptyState('No patients found');
            return;
        }
        
        // Hide empty state, show table
        if (emptyState) emptyState.style.display = 'none';
        if (patientsTableContainer) patientsTableContainer.style.display = 'block';
        
        let html = '';
        
        patientsData.forEach(patient => {
            const patientId = patient.patient_id || 'N/A';
            const name = patient.name || 'Unnamed Patient';
            const age = patient.age || '—';
            const gender = patient.gender || '—';
            const condition = patient.condition || 'Not specified';
            const icd10 = patient.icd10_code || '—';
            const sessionCount = patient.session_count || 0;
            const lastSession = patient.last_session ? formatDate(patient.last_session) : 'Never';
            const status = patient.status || 'active';
            const initials = getInitials(name);
            
            // Status badge color
            let statusBadge = '';
            if (status === 'active') {
                statusBadge = '<span class="badge bg-success rounded-pill px-3 py-2">Active</span>';
            } else {
                statusBadge = '<span class="badge bg-secondary rounded-pill px-3 py-2">Inactive</span>';
            }
            
            html += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <div class="patient-avatar">${initials}</div>
                            <div>
                                <div class="patient-name">${escapeHtml(name)}</div>
                                <div class="patient-id">ID: ${escapeHtml(patientId)}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="fw-medium">${escapeHtml(patientId)}</span></td>
                    <td>${age} / ${escapeHtml(gender)}</td>
                    <td><span class="condition-badge">${escapeHtml(condition)}</span></td>
                    <td><span class="icd10-badge">${escapeHtml(icd10)}</span></td>
                    <td><span class="fw-bold">${sessionCount}</span></td>
                    <td>${escapeHtml(lastSession)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn" onclick="window.viewPatient('${patientId}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" onclick="window.editPatient('${patientId}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" onclick="window.exportPatientData('${patientId}')" title="Export Data">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="action-btn" onclick="window.showEmailModal('${patientId}')" title="Email Report">
                                <i class="fas fa-envelope"></i>
                            </button>
                            <button class="action-btn" onclick="window.showSMSModal('${patientId}')" title="SMS Reminder">
                                <i class="fas fa-sms"></i>
                            </button>
                            <button class="action-btn delete" onclick="window.confirmDelete('${patientId}', '${escapeHtml(name)}')" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        patientsTableBody.innerHTML = html;
    }
    
    // ===== CREATE PATIENT =====
    async function createPatient() {
        // Validate required fields
        const name = document.getElementById('patientName').value.trim();
        const age = document.getElementById('patientAge').value;
        
        if (!name) {
            showToast('Validation Error', 'Patient name is required', 'warning');
            return;
        }
        
        if (!age) {
            showToast('Validation Error', 'Age is required', 'warning');
            return;
        }
        
        // Collect form data
        const patientData = {
            name: name,
            age: parseInt(age),
            gender: document.getElementById('patientGender').value,
            date_of_birth: document.getElementById('patientDob').value,
            phone: document.getElementById('patientPhone').value,
            email: document.getElementById('patientEmail').value,
            address: document.getElementById('patientAddress').value,
            emergency_contact: document.getElementById('patientEmergencyContact').value,
            emergency_phone: document.getElementById('patientEmergencyPhone').value,
            condition: document.getElementById('patientCondition').value,
            icd10_code: document.getElementById('patientIcd10').value,
            therapist_name: document.getElementById('patientTherapist').value,
            therapist_email: document.getElementById('patientTherapistEmail').value,
            notes: document.getElementById('patientNotes').value,
            status: 'active'
        };
        
        // Add custom patient ID if provided
        const customId = document.getElementById('patientId').value.trim();
        if (customId) {
            patientData.patient_id = customId;
        }
        
        const saveBtn = document.getElementById('savePatientBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        try {
            const response = await fetch('/api/create_patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addPatientModal'));
                modal.hide();
                
                // Reset form
                document.getElementById('addPatientForm').reset();
                
                // Show success message
                showToast('Success', `Patient ${name} created successfully`, 'success');
                
                // Reload patients
                loadPatients();
                loadDashboardStats();
            } else {
                showToast('Error', data.error || 'Failed to create patient', 'error');
            }
        } catch (error) {
            console.error('Error creating patient:', error);
            showToast('Error', 'Could not connect to server', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
    
    // ===== VIEW PATIENT =====
    window.viewPatient = async function(patientId) {
        currentPatientId = patientId;
        
        try {
            const response = await fetch(`/api/get_patient/${patientId}`);
            const data = await response.json();
            
            if (data.success && data.patient) {
                const patient = data.patient;
                
                // Set modal fields
                document.getElementById('viewFullName').textContent = patient.name || 'Unnamed Patient';
                document.getElementById('viewPatientId').textContent = patient.patient_id || 'N/A';
                document.getElementById('viewAvatar').textContent = getInitials(patient.name || 'Unknown');
                document.getElementById('viewAge').textContent = patient.age || '—';
                document.getElementById('viewGender').textContent = patient.gender || '—';
                document.getElementById('viewDob').textContent = patient.date_of_birth ? formatDate(patient.date_of_birth) : '—';
                document.getElementById('viewPhone').textContent = patient.phone || '—';
                document.getElementById('viewEmail').textContent = patient.email || '—';
                document.getElementById('viewCondition').textContent = patient.condition || 'Not specified';
                document.getElementById('viewIcd10').textContent = patient.icd10_code || '—';
                
                // Status
                const statusEl = document.getElementById('viewStatus');
                if (patient.status === 'active') {
                    statusEl.className = 'badge bg-success';
                    statusEl.textContent = 'Active';
                } else {
                    statusEl.className = 'badge bg-secondary';
                    statusEl.textContent = 'Inactive';
                }
                
                document.getElementById('viewSessions').textContent = patient.session_count || 0;
                document.getElementById('viewLastSession').textContent = patient.last_session ? formatDate(patient.last_session) : 'Never';
                document.getElementById('viewEmergencyContact').textContent = patient.emergency_contact || '—';
                document.getElementById('viewEmergencyPhone').textContent = patient.emergency_phone || '—';
                document.getElementById('viewTherapist').textContent = patient.therapist_name || '—';
                document.getElementById('viewTherapistEmail').textContent = patient.therapist_email || '—';
                document.getElementById('viewAddress').textContent = patient.address || '—';
                document.getElementById('viewNotes').textContent = patient.notes || '—';
                document.getElementById('viewCreated').textContent = patient.created_at ? formatDateTime(patient.created_at) : '—';
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('viewPatientModal'));
                modal.show();
            } else {
                showToast('Error', 'Patient not found', 'error');
            }
        } catch (error) {
            console.error('Error viewing patient:', error);
            showToast('Error', 'Could not load patient details', 'error');
        }
    };
    
    // ===== EDIT PATIENT =====
    window.editPatient = async function(patientId) {
        openEditModal(patientId);
    };
    
    async function openEditModal(patientId) {
        currentPatientId = patientId;
        
        try {
            const response = await fetch(`/api/get_patient/${patientId}`);
            const data = await response.json();
            
            if (data.success && data.patient) {
                const patient = data.patient;
                
                // Set form fields
                document.getElementById('editPatientId').value = patient.patient_id || '';
                document.getElementById('editPatientIdDisplay').value = patient.patient_id || '';
                document.getElementById('editName').value = patient.name || '';
                document.getElementById('editAge').value = patient.age || '';
                document.getElementById('editGender').value = patient.gender || '';
                document.getElementById('editDob').value = patient.date_of_birth || '';
                document.getElementById('editPhone').value = patient.phone || '';
                document.getElementById('editEmail').value = patient.email || '';
                document.getElementById('editAddress').value = patient.address || '';
                document.getElementById('editEmergencyContact').value = patient.emergency_contact || '';
                document.getElementById('editEmergencyPhone').value = patient.emergency_phone || '';
                document.getElementById('editCondition').value = patient.condition || '';
                document.getElementById('editIcd10').value = patient.icd10_code || '';
                document.getElementById('editTherapist').value = patient.therapist_name || '';
                document.getElementById('editTherapistEmail').value = patient.therapist_email || '';
                document.getElementById('editNotes').value = patient.notes || '';
                document.getElementById('editStatus').value = patient.status || 'active';
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('editPatientModal'));
                modal.show();
            } else {
                showToast('Error', 'Patient not found', 'error');
            }
        } catch (error) {
            console.error('Error loading patient for edit:', error);
            showToast('Error', 'Could not load patient details', 'error');
        }
    }
    
    // ===== UPDATE PATIENT =====
    async function updatePatient() {
        const patientId = document.getElementById('editPatientId').value;
        
        if (!patientId) {
            showToast('Error', 'Patient ID not found', 'error');
            return;
        }
        
        // Validate required fields
        const name = document.getElementById('editName').value.trim();
        const age = document.getElementById('editAge').value;
        
        if (!name) {
            showToast('Validation Error', 'Patient name is required', 'warning');
            return;
        }
        
        if (!age) {
            showToast('Validation Error', 'Age is required', 'warning');
            return;
        }
        
        // Collect form data
        const patientData = {
            patient_id: patientId,
            name: name,
            age: parseInt(age),
            gender: document.getElementById('editGender').value,
            date_of_birth: document.getElementById('editDob').value,
            phone: document.getElementById('editPhone').value,
            email: document.getElementById('editEmail').value,
            address: document.getElementById('editAddress').value,
            emergency_contact: document.getElementById('editEmergencyContact').value,
            emergency_phone: document.getElementById('editEmergencyPhone').value,
            condition: document.getElementById('editCondition').value,
            icd10_code: document.getElementById('editIcd10').value,
            therapist_name: document.getElementById('editTherapist').value,
            therapist_email: document.getElementById('editTherapistEmail').value,
            notes: document.getElementById('editNotes').value,
            status: document.getElementById('editStatus').value
        };
        
        const updateBtn = document.getElementById('updatePatientBtn');
        const originalText = updateBtn.innerHTML;
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        updateBtn.disabled = true;
        
        try {
            const response = await fetch('/api/update_patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editPatientModal'));
                modal.hide();
                
                // Show success message
                showToast('Success', `Patient ${name} updated successfully`, 'success');
                
                // Reload patients
                loadPatients();
                loadDashboardStats();
            } else {
                showToast('Error', data.error || 'Failed to update patient', 'error');
            }
        } catch (error) {
            console.error('Error updating patient:', error);
            showToast('Error', 'Could not connect to server', 'error');
        } finally {
            updateBtn.innerHTML = originalText;
            updateBtn.disabled = false;
        }
    }
    
    // ===== CONFIRM DELETE =====
    window.confirmDelete = function(patientId, patientName) {
        currentPatientId = patientId;
        
        const messageEl = document.getElementById('deleteConfirmMessage');
        messageEl.innerHTML = `Are you sure you want to delete <strong>${escapeHtml(patientName)}</strong> (${escapeHtml(patientId)})? This action cannot be undone and will delete all associated sessions, goals, and achievements.`;
        
        const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        modal.show();
    };
    
    // ===== DELETE PATIENT =====
    async function deletePatient() {
        if (!currentPatientId) {
            showToast('Error', 'No patient selected', 'error');
            return;
        }
        
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        deleteBtn.disabled = true;
        
        try {
            const response = await fetch('/api/delete_patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: currentPatientId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
                modal.hide();
                
                // Show success message
                showToast('Success', 'Patient deleted successfully', 'success');
                
                // Reload patients
                loadPatients();
                loadDashboardStats();
            } else {
                showToast('Error', data.error || 'Failed to delete patient', 'error');
            }
        } catch (error) {
            console.error('Error deleting patient:', error);
            showToast('Error', 'Could not connect to server', 'error');
        } finally {
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    }
    
    // ===== LOAD DASHBOARD STATS =====
    async function loadDashboardStats() {
        try {
            const response = await fetch('/api/dashboard/stats/all');
            const data = await response.json();
            
            if (data.success && data.stats) {
                const stats = data.stats;
                
                if (totalPatientsEl) totalPatientsEl.textContent = stats.total_patients || 0;
                if (totalSessionsEl) totalSessionsEl.textContent = stats.total_sessions || 0;
                if (avgArticulationEl) avgArticulationEl.textContent = (stats.avg_articulation || 0) + '%';
                if (activeGoalsEl) {
                    // Get active goals count from dashboard stats or API
                    fetchActiveGoalsCount();
                }
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }
    
    async function fetchActiveGoalsCount() {
        try {
            // This is a simplified approach - in production you'd have a dedicated API
            let total = 0;
            
            for (const patient of patients.slice(0, 5)) { // Check first 5 patients
                const response = await fetch(`/api/get_goals/${patient.patient_id}`);
                const data = await response.json();
                
                if (data.success && data.goals) {
                    total += data.goals.filter(g => g.status === 'active').length;
                }
            }
            
            if (activeGoalsEl) activeGoalsEl.textContent = total;
        } catch (error) {
            console.error('Error fetching goals:', error);
            if (activeGoalsEl) activeGoalsEl.textContent = '—';
        }
    }
    
    // ===== UPDATE STATS =====
    function updateStats() {
        if (totalPatientsEl) {
            totalPatientsEl.textContent = patients.length;
        }
    }
    
    // ===== UTILITY FUNCTIONS =====
    
    function showLoading(show) {
        if (!loadingState || !patientsTableContainer) return;
        
        if (show) {
            loadingState.style.display = 'block';
            patientsTableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
            patientsTableContainer.style.display = 'block';
        }
    }
    
    function showEmptyState(message) {
        if (!emptyState || !patientsTableContainer) return;
        
        emptyState.style.display = 'block';
        patientsTableContainer.style.display = 'none';
        
        const heading = emptyState.querySelector('h3');
        const paragraph = emptyState.querySelector('p');
        
        if (heading) heading.textContent = 'No Patients Found';
        if (paragraph) paragraph.textContent = message || 'Get started by adding your first patient.';
    }
    
    function showToast(title, message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast
        const toastId = 'toast-' + Date.now();
        const bgColor = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : 'bg-info';
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgColor} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas ${icon} me-2"></i>
                        <strong>${escapeHtml(title)}:</strong> ${escapeHtml(message)}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
        
        // Remove after hidden
        toastElement.addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }
    
    function formatDate(dateString) {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } catch {
            return dateString;
        }
    }
    
    function formatDateTime(dateString) {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', { 
                month: '2-digit', 
                day: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    }
    
    function getInitials(name) {
        if (!name || name === 'Unnamed Patient') return '?';
        
        const parts = name.split(' ');
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Make functions globally accessible
    window.viewPatient = viewPatient;
    window.editPatient = editPatient;
    window.confirmDelete = confirmDelete;
    
    console.log('✅ Patient Management System - Ready');
});

// ===== ADDITIONAL EXPORT AND COMMUNICATION FUNCTIONS =====

/**
 * Export patient data as downloadable file
 * @param {string} patientId - The patient ID to export
 */
function exportPatientData(patientId) {
    window.location.href = `/api/export_patient/${patientId}`;
}

/**
 * Show email modal to send patient report
 * @param {string} patientId - The patient ID to send report for
 */
function showEmailModal(patientId) {
    const email = prompt("Enter email address to send report:");
    if (email && email.includes('@')) {
        fetch('/api/send_report_email', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                patient_id: patientId,
                email: email,
                report_type: 'summary'
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('✅ Report sent successfully!');
            } else {
                alert('❌ Error sending report');
            }
        })
        .catch(error => {
            console.error('Error sending email:', error);
            alert('❌ Failed to send email. Please try again.');
        });
    } else if (email) {
        alert('❌ Please enter a valid email address');
    }
}

/**
 * Show SMS modal to set up reminders
 * @param {string} patientId - The patient ID to set reminders for
 */
function showSMSModal(patientId) {
    const phone = prompt("Enter phone number for reminders (with country code):\nExample: +1234567890");
    if (phone) {
        const frequency = prompt("Reminder frequency? (daily/weekly):", "weekly");
        if (frequency && (frequency === 'daily' || frequency === 'weekly')) {
            fetch('/api/sms_reminder', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    patient_id: patientId,
                    phone: phone,
                    frequency: frequency
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(`✅ Reminder set successfully!\nNext reminder: ${data.next || 'Scheduled'}`);
                } else {
                    alert('❌ Error setting reminder');
                }
            })
            .catch(error => {
                console.error('Error setting SMS reminder:', error);
                alert('❌ Failed to set reminder. Please try again.');
            });
        } else if (frequency) {
            alert('❌ Please enter either "daily" or "weekly"');
        }
    }
}

// Make additional functions globally accessible
window.exportPatientData = exportPatientData;
window.showEmailModal = showEmailModal;
window.showSMSModal = showSMSModal;