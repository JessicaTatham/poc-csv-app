// Simplified BCE CSV Processor - Works without SDK
class BCECSVProcessorApp {
    constructor() {
        this.currentFile = null;
        this.elements = {};
        this.isProcessing = false;
    }

    initialize() {
        try {
            console.log('Initializing simplified CSV processor...');
            
            // Cache DOM elements
            this.cacheElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Show initial upload section
            this.showSection('upload');
            
            console.log('CSV Processor initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application: ' + error.message);
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
            
            // Show demo processing
            await this.simulateProcessing(csvData);
            
            // Show results
            this.showResults(csvData.length, 0);
            
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

    async simulateProcessing(data) {
        const total = data.length;
        
        for (let i = 0; i < total; i++) {
            // Update progress
            const percent = Math.round(((i + 1) / total) * 100);
            this.elements.progressFill.style.width = percent + '%';
            this.elements.progressText.textContent = `${i + 1} / ${total} processed`;
            this.elements.progressPercent.textContent = percent + '%';
            this.elements.successCount.textContent = i + 1;
            this.elements.totalCount.textContent = total;
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    showResults(successCount, errorCount) {
        this.elements.resultsSummary.innerHTML = `
            <div class="result-item success">
                <strong>${successCount}</strong> entries processed successfully
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    const app = new BCECSVProcessorApp();
    app.initialize();
});