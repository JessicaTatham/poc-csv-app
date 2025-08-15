// BCE CSV Processor App - Main application logic and UI interactions

class BCECSVProcessorApp {
    constructor() {
        this.appSdk = null;
        this.processor = null;
        this.currentFile = null;
        this.elements = {};
        this.isProcessing = false;
    }

    async initialize() {
        try {
            // Initialize Contentstack App SDK
            this.appSdk = await ContentstackAppSdk.init();
            console.log('App SDK initialized');
            
            // Check user permissions
            await this.checkUserPermissions();
            
            // Initialize CSV processor
            this.processor = new CSVProcessor(this.appSdk);
            await this.processor.initialize();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Show initial upload section
            this.showSection('upload');
            
            console.log('BCE CSV Processor App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    async checkUserPermissions() {
        try {
            const currentUser = await this.appSdk.getCurrentUser();
            const userRoles = currentUser.roles || [];
            
            // Define allowed roles for CSV processing
            const allowedRoles = ['admin', 'csv_manager', 'owner', 'developer'];
            
            // Check if user has any of the allowed roles
            const hasPermission = userRoles.some(role => 
                allowedRoles.includes(role.name?.toLowerCase()) || 
                allowedRoles.includes(role.uid?.toLowerCase())
            );
            
            if (!hasPermission) {
                this.showPermissionError();
                return false;
            }
            
            // Additional permission check for required scopes
            const requiredScopes = ['entry:write', 'entry:publish'];
            const userScopes = currentUser.scopes || [];
            
            const hasScopes = requiredScopes.every(scope => 
                userScopes.includes(scope)
            );
            
            if (!hasScopes) {
                this.showPermissionError('Insufficient permissions to create and publish entries.');
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.warn('Could not verify user permissions:', error);
            // Allow access if permission check fails (fallback)
            return true;
        }
    }

    showPermissionError(customMessage) {
        const message = customMessage || 
            'You do not have permission to use the CSV Processor. Please contact your administrator to request access.';
        
        // Hide the main interface
        document.getElementById('uploadSection').style.display = 'none';
        
        // Show permission error
        const errorHtml = `
            <div class="permission-error-container">
                <div class="permission-error-card">
                    <div class="permission-error-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h2>Access Restricted</h2>
                    <p>${message}</p>
                    <div class="permission-requirements">
                        <h4>Required Permissions:</h4>
                        <ul>
                            <li>Admin or CSV Manager role</li>
                            <li>Content Type write access</li>
                            <li>Entry create and publish permissions</li>
                        </ul>
                    </div>
                    <button class="btn btn-secondary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i> Retry
                    </button>
                </div>
            </div>
        `;
        
        document.querySelector('.app-main').innerHTML = errorHtml;
        
        // Add permission error styles
        this.addPermissionErrorStyles();
    }

    addPermissionErrorStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            .permission-error-container {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 400px;
                padding: 40px 20px;
            }
            
            .permission-error-card {
                background: white;
                border-radius: 12px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
                max-width: 500px;
            }
            
            .permission-error-icon {
                font-size: 4rem;
                color: #dc3545;
                margin-bottom: 20px;
            }
            
            .permission-error-card h2 {
                color: #dc3545;
                margin: 0 0 15px 0;
                font-size: 1.5rem;
            }
            
            .permission-error-card p {
                color: #666;
                margin: 0 0 25px 0;
                font-size: 1rem;
                line-height: 1.5;
            }
            
            .permission-requirements {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
            }
            
            .permission-requirements h4 {
                color: #333;
                margin: 0 0 10px 0;
                font-size: 1rem;
            }
            
            .permission-requirements ul {
                margin: 0;
                padding-left: 20px;
                color: #666;
            }
            
            .permission-requirements li {
                margin-bottom: 5px;
            }
        `;
        document.head.appendChild(styles);
    }

    cacheElements() {
        // Sections
        this.elements.uploadSection = document.getElementById('uploadSection');
        this.elements.processingSection = document.getElementById('processingSection');
        this.elements.resultsSection = document.getElementById('resultsSection');
        
        // Upload elements
        this.elements.fileDropZone = document.getElementById('fileDropZone');
        this.elements.fileInput = document.getElementById('fileInput');
        this.elements.browseButton = document.getElementById('browseButton');
        this.elements.fileInfo = document.getElementById('fileInfo');
        this.elements.fileName = document.getElementById('fileName');
        this.elements.fileSize = document.getElementById('fileSize');
        this.elements.fileType = document.getElementById('fileType');
        this.elements.removeFileButton = document.getElementById('removeFileButton');
        this.elements.processButton = document.getElementById('processButton');
        
        // Processing elements
        this.elements.statusText = document.getElementById('statusText');
        this.elements.progressFill = document.getElementById('progressFill');
        this.elements.progressText = document.getElementById('progressText');
        this.elements.progressPercent = document.getElementById('progressPercent');
        this.elements.successCount = document.getElementById('successCount');
        this.elements.errorCount = document.getElementById('errorCount');
        this.elements.totalCount = document.getElementById('totalCount');
        
        // Results elements
        this.elements.resultsSummary = document.getElementById('resultsSummary');
        this.elements.processAnotherButton = document.getElementById('processAnotherButton');
        this.elements.viewEntriesButton = document.getElementById('viewEntriesButton');
        this.elements.errorDetails = document.getElementById('errorDetails');
        this.elements.errorTableBody = document.getElementById('errorTableBody');
    }

    setupEventListeners() {
        // File upload events
        this.elements.browseButton.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        
        this.elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
        
        // Drag and drop events
        this.elements.fileDropZone.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        
        this.elements.fileDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.fileDropZone.classList.add('dragover');
        });
        
        this.elements.fileDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.elements.fileDropZone.classList.remove('dragover');
        });
        
        this.elements.fileDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.fileDropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
        
        // Button events
        this.elements.removeFileButton.addEventListener('click', () => {
            this.clearFile();
        });
        
        this.elements.processButton.addEventListener('click', () => {
            this.startProcessing();
        });
        
        this.elements.processAnotherButton.addEventListener('click', () => {
            this.resetToUpload();
        });
        
        this.elements.viewEntriesButton.addEventListener('click', () => {
            this.viewCreatedEntries();
        });
    }

    handleFileSelect(file) {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showError('Please select a CSV file.');
            return;
        }
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size must be less than 10MB.');
            return;
        }
        
        this.currentFile = file;
        this.displayFileInfo(file);
    }

    displayFileInfo(file) {
        const fileSize = this.formatFileSize(file.size);
        const fileType = this.processor.detectFileType(file.name, null);
        
        this.elements.fileName.textContent = file.name;
        this.elements.fileSize.textContent = fileSize;
        this.elements.fileType.textContent = `${fileType} Format`;
        this.elements.fileType.className = `file-type ${fileType.toLowerCase()}`;
        
        // Hide drop zone, show file info
        this.elements.fileDropZone.style.display = 'none';
        this.elements.fileInfo.style.display = 'flex';
    }

    clearFile() {
        this.currentFile = null;
        this.elements.fileInput.value = '';
        this.elements.fileDropZone.style.display = 'block';
        this.elements.fileInfo.style.display = 'none';
    }

    async startProcessing() {
        if (!this.currentFile || this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        this.showSection('processing');
        
        try {
            const result = await this.processor.processFile(
                this.currentFile,
                (stats) => this.updateProgress(stats),
                (status) => this.updateStatus(status)
            );
            
            this.showResults(result);
            
        } catch (error) {
            console.error('Processing failed:', error);
            this.showError('Processing failed: ' + error.message);
            this.showSection('upload');
        } finally {
            this.isProcessing = false;
        }
    }

    updateProgress(stats) {
        const percentage = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
        
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${stats.processed} / ${stats.total} processed`;
        this.elements.progressPercent.textContent = `${percentage}%`;
        
        this.elements.successCount.textContent = stats.successful;
        this.elements.errorCount.textContent = stats.errors;
        this.elements.totalCount.textContent = stats.total;
    }

    updateStatus(status) {
        this.elements.statusText.textContent = status;
    }

    showResults(result) {
        this.showSection('results');
        
        const { stats, errors, successfulEntries } = result;
        
        // Update summary
        let summaryText;
        if (stats.errors > 0) {
            summaryText = `Processed ${stats.successful} entries successfully with ${stats.errors} errors out of ${stats.total} total rows.`;
        } else {
            summaryText = `Successfully processed all ${stats.successful} entries from ${stats.total} rows.`;
        }
        
        this.elements.resultsSummary.textContent = summaryText;
        this.elements.resultsSummary.className = stats.errors > 0 ? 'status-warning' : 'status-success';
        
        // Show error details if there are errors
        if (errors.length > 0) {
            this.displayErrors(errors);
            this.elements.errorDetails.style.display = 'block';
        } else {
            this.elements.errorDetails.style.display = 'none';
        }
        
        // Store successful entries for viewing
        this.successfulEntries = successfulEntries;
    }

    displayErrors(errors) {
        this.elements.errorTableBody.innerHTML = '';
        
        errors.forEach(error => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${error.row}</td>
                <td class="error-message">${error.error}</td>
                <td class="error-data">${JSON.stringify(error.data).substring(0, 100)}...</td>
            `;
            this.elements.errorTableBody.appendChild(row);
        });
    }

    async viewCreatedEntries() {
        if (!this.successfulEntries || this.successfulEntries.length === 0) {
            this.showError('No entries to view.');
            return;
        }
        
        try {
            // Open Contentstack entries view
            const entryUids = this.successfulEntries.map(entry => entry.uid);
            const contentType = this.successfulEntries[0].type === 'MDU' 
                ? this.processor.config.mduContentType 
                : this.processor.config.tariffContentType;
                
            // Navigate to entries view in Contentstack
            window.open(`https://app.contentstack.com/stack/${this.appSdk.stack.api_key}/content-type/${contentType}/entries`, '_blank');
            
        } catch (error) {
            console.error('Failed to open entries view:', error);
            this.showError('Failed to open entries view.');
        }
    }

    resetToUpload() {
        this.clearFile();
        this.showSection('upload');
        this.resetProgress();
    }

    resetProgress() {
        this.elements.progressFill.style.width = '0%';
        this.elements.progressText.textContent = '0 / 0 processed';
        this.elements.progressPercent.textContent = '0%';
        this.elements.successCount.textContent = '0';
        this.elements.errorCount.textContent = '0';
        this.elements.totalCount.textContent = '0';
        this.elements.statusText.textContent = 'Initializing...';
    }

    showSection(section) {
        // Hide all sections
        this.elements.uploadSection.style.display = 'none';
        this.elements.processingSection.style.display = 'none';
        this.elements.resultsSection.style.display = 'none';
        
        // Show target section
        switch (section) {
            case 'upload':
                this.elements.uploadSection.style.display = 'block';
                break;
            case 'processing':
                this.elements.processingSection.style.display = 'block';
                break;
            case 'results':
                this.elements.resultsSection.style.display = 'block';
                break;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        // Create or update error notification
        let errorNotification = document.getElementById('errorNotification');
        if (!errorNotification) {
            errorNotification = document.createElement('div');
            errorNotification.id = 'errorNotification';
            errorNotification.className = 'error-notification';
            document.body.appendChild(errorNotification);
        }
        
        errorNotification.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        errorNotification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorNotification && errorNotification.parentElement) {
                errorNotification.remove();
            }
        }, 5000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new BCECSVProcessorApp();
    app.initialize().catch(console.error);
});

// Add error notification styles
const errorStyles = document.createElement('style');
errorStyles.textContent = `
    .error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-width: 400px;
        display: none;
    }
    
    .error-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .error-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        font-size: 1rem;
    }
    
    .error-close:hover {
        opacity: 0.8;
    }
`;
document.head.appendChild(errorStyles);