// Simplified BCE CSV Processor - Works without SDK
class BCECSVProcessorApp {
    constructor() {
        this.currentFile = null;
        this.elements = {};
        this.isProcessing = false;
        this.config = {
            apiKey: null,
            managementToken: null,
            environment: 'development',
            mduContentType: 'mdu_entries',
            baseUrl: 'https://api.contentstack.io/v3'
        };
    }

    async initialize() {
        try {
            console.log('Initializing CSV processor with API integration...');
            
            // Try to get config from parent window (Contentstack app context)
            await this.loadConfig();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Show initial upload section or config section
            if (this.config.apiKey && this.config.managementToken) {
                this.showSection('upload');
            } else {
                this.showConfigSection();
            }
            
            console.log('CSV Processor initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    async loadConfig() {
        try {
            // Try to get config from URL parameters or localStorage
            const urlParams = new URLSearchParams(window.location.search);
            
            this.config.apiKey = urlParams.get('api_key') || localStorage.getItem('cs_api_key');
            this.config.managementToken = urlParams.get('management_token') || localStorage.getItem('cs_management_token');
            this.config.environment = urlParams.get('environment') || localStorage.getItem('cs_environment') || 'development';
            this.config.mduContentType = urlParams.get('mdu_content_type') || localStorage.getItem('cs_mdu_content_type') || 'mdu_entries';
            
        } catch (error) {
            console.warn('Could not load config:', error);
        }
    }

    cacheElements() {
        // Upload section elements
        this.elements.fileDropZone = document.getElementById('fileDropZone');
        this.elements.browseButton = document.getElementById('browseButton');
        this.elements.fileInput = document.getElementById('fileInput');
        this.elements.fileInfo = document.getElementById('fileInfo');
        this.elements.fileName = document.getElementById('fileName');
        this.elements.fileSize = document.getElementById('fileSize');
        this.elements.fileType = document.getElementById('fileType');
        this.elements.removeFileButton = document.getElementById('removeFileButton');
        this.elements.processButton = document.getElementById('processButton');

        // Processing section elements
        this.elements.processingSection = document.getElementById('processingSection');
        this.elements.statusText = document.getElementById('statusText');
        this.elements.progressFill = document.getElementById('progressFill');
        this.elements.progressText = document.getElementById('progressText');
        this.elements.progressPercent = document.getElementById('progressPercent');
        this.elements.successCount = document.getElementById('successCount');
        this.elements.errorCount = document.getElementById('errorCount');
        this.elements.totalCount = document.getElementById('totalCount');

        // Results section elements
        this.elements.resultsSection = document.getElementById('resultsSection');
        this.elements.resultsSummary = document.getElementById('resultsSummary');
        this.elements.processAnotherButton = document.getElementById('processAnotherButton');
        this.elements.viewEntriesButton = document.getElementById('viewEntriesButton');
        this.elements.errorDetails = document.getElementById('errorDetails');
        this.elements.errorTableBody = document.getElementById('errorTableBody');

        // Sections
        this.elements.uploadSection = document.getElementById('uploadSection');
    }

    setupEventListeners() {
        // File drop zone
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

        // Browse button
        this.elements.browseButton.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // File input
        this.elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Remove file button
        this.elements.removeFileButton.addEventListener('click', () => {
            this.removeFile();
        });

        // Process button
        this.elements.processButton.addEventListener('click', () => {
            this.processFile();
        });

        // Process another button
        this.elements.processAnotherButton.addEventListener('click', () => {
            this.resetToUpload();
        });

        // View entries button
        this.elements.viewEntriesButton.addEventListener('click', () => {
            this.showMessage('Entry viewing functionality will be implemented soon.');
        });
    }

    handleFileSelect(file) {
        if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
            this.showError('Please select a valid CSV file.');
            return;
        }

        this.currentFile = file;
        
        // Update file info
        this.elements.fileName.textContent = file.name;
        this.elements.fileSize.textContent = this.formatFileSize(file.size);
        this.elements.fileType.textContent = 'CSV File';

        // Show file info and hide drop zone
        this.elements.fileInfo.style.display = 'block';
        this.elements.fileDropZone.style.display = 'none';
    }

    removeFile() {
        this.currentFile = null;
        this.elements.fileInfo.style.display = 'none';
        this.elements.fileDropZone.style.display = 'block';
        this.elements.fileInput.value = '';
    }

    async processFile() {
        if (!this.currentFile) {
            this.showError('Please select a file first.');
            return;
        }

        this.isProcessing = true;
        this.showSection('processing');
        
        try {
            // Parse CSV file
            const csvData = await this.parseCSVFile(this.currentFile);
            
            // Process with real API calls
            await this.processWithAPI(csvData);
            
        } catch (error) {
            console.error('Processing error:', error);
            this.showError('Error processing file: ' + error.message);
            this.showSection('upload');
        } finally {
            this.isProcessing = false;
        }
    }

    async parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        reject(new Error('CSV file must contain at least a header and one data row.'));
                        return;
                    }

                    const headers = lines[0].split(',').map(h => h.trim());
                    const data = [];

                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        if (values.length === headers.length) {
                            const row = {};
                            headers.forEach((header, index) => {
                                row[header] = values[index];
                            });
                            data.push(row);
                        }
                    }

                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    async processWithAPI(csvData) {
        if (!this.config.apiKey || !this.config.managementToken) {
            this.showError('Please configure your Contentstack credentials first.');
            this.showConfigSection();
            return;
        }

        const total = csvData.length;
        let successCount = 0;
        let errorCount = 0;

        this.elements.totalCount.textContent = total;

        for (let i = 0; i < total; i++) {
            try {
                // Parse MDU data from CSV row
                const mduData = this.parseMDURow(csvData[i], i + 1);
                
                // Create entry via API
                await this.createMDUEntry(mduData);
                
                successCount++;
                this.elements.successCount.textContent = successCount;
                
            } catch (error) {
                console.error(`Error processing row ${i + 1}:`, error);
                errorCount++;
                this.elements.errorCount.textContent = errorCount;
            }
            
            // Update progress
            const percent = Math.round(((i + 1) / total) * 100);
            this.elements.progressFill.style.width = percent + '%';
            this.elements.progressText.textContent = `${i + 1} / ${total} processed`;
            this.elements.progressPercent.textContent = percent + '%';
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        this.showResults(successCount, errorCount);
    }

    parseMDURow(row, rowIndex) {
        // Validate required fields
        if (!row[0] || !row[1]) {
            throw new Error(`Missing required fields (civic number or street name) at row ${rowIndex}`);
        }

        return {
            title: `${row[0]} ${row[1]}`,
            civic_number: row[0]?.toString().trim(),
            street_name_en: row[1]?.toString().trim(),
            street_name_fr: row[2]?.toString().trim() || '',
            street_direction_en: row[3]?.toString().trim() || '',
            street_direction_fr: row[4]?.toString().trim() || '',
            additional_info_en: row[5]?.toString().trim() || '',
            additional_info_fr: row[6]?.toString().trim() || '',
            expiry_date: row[7]?.toString().trim() || '',
            is_visible: row[8] === '1',
            city_id: parseInt(row[9]) || 0,
            street_id: parseInt(row[10]) || 0,
            province_id: parseInt(row[11]) || 0,
            file_type: row[12]?.toString().trim() || '',
            posting_date: row[13]?.toString().trim() || '',
            comment: row[14]?.toString().trim() || '',
            import_timestamp: new Date().toISOString()
        };
    }

    async createMDUEntry(mduData) {
        const response = await fetch(`${this.config.baseUrl}/content_types/${this.config.mduContentType}/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api_key': this.config.apiKey,
                'authorization': this.config.managementToken
            },
            body: JSON.stringify({
                entry: mduData
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${response.status} - ${error}`);
        }

        return await response.json();
    }

    showConfigSection() {
        const configHtml = `
            <div class="config-section">
                <div class="config-card">
                    <h2>Configure Contentstack Connection</h2>
                    <p>Enter your Contentstack credentials to enable CSV processing:</p>
                    
                    <div class="config-form">
                        <div class="form-group">
                            <label>Stack API Key:</label>
                            <input type="text" id="apiKey" placeholder="Your stack API key" />
                        </div>
                        
                        <div class="form-group">
                            <label>Management Token:</label>
                            <input type="password" id="managementToken" placeholder="Your management token" />
                        </div>
                        
                        <div class="form-group">
                            <label>Environment:</label>
                            <input type="text" id="environment" value="development" />
                        </div>
                        
                        <div class="form-group">
                            <label>MDU Content Type UID:</label>
                            <input type="text" id="mduContentType" value="mdu_entries" />
                        </div>
                        
                        <button class="btn btn-primary" onclick="app.saveConfig()">
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('.app-main').innerHTML = configHtml;
    }

    saveConfig() {
        this.config.apiKey = document.getElementById('apiKey').value;
        this.config.managementToken = document.getElementById('managementToken').value;
        this.config.environment = document.getElementById('environment').value || 'development';
        this.config.mduContentType = document.getElementById('mduContentType').value || 'mdu_entries';
        
        // Save to localStorage
        localStorage.setItem('cs_api_key', this.config.apiKey);
        localStorage.setItem('cs_management_token', this.config.managementToken);
        localStorage.setItem('cs_environment', this.config.environment);
        localStorage.setItem('cs_mdu_content_type', this.config.mduContentType);
        
        // Reload the page to show upload section
        location.reload();
    }

    showResults(successCount, errorCount) {
        this.elements.resultsSummary.innerHTML = `
            <div class="result-item success">
                <strong>${successCount}</strong> entries created successfully
            </div>
            ${errorCount > 0 ? `<div class="result-item error"><strong>${errorCount}</strong> errors occurred</div>` : ''}
        `;
        
        this.showSection('results');
    }

    showSection(section) {
        // Hide all sections
        this.elements.uploadSection.style.display = 'none';
        this.elements.processingSection.style.display = 'none';
        this.elements.resultsSection.style.display = 'none';

        // Show selected section
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

    resetToUpload() {
        this.removeFile();
        this.showSection('upload');
        
        // Reset progress
        this.elements.progressFill.style.width = '0%';
        this.elements.progressText.textContent = '0 / 0 processed';
        this.elements.progressPercent.textContent = '0%';
        this.elements.successCount.textContent = '0';
        this.elements.errorCount.textContent = '0';
        this.elements.totalCount.textContent = '0';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        console.error(message);
        alert('Error: ' + message);
    }

    showMessage(message) {
        alert(message);
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    app = new BCECSVProcessorApp();
    app.initialize();
    
    // Make app globally available for config form
    window.app = app;
});