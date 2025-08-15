// BCE CSV Processor - Core processing logic for MDU and Tariff CSV files

class CSVProcessor {
    constructor(appSdk) {
        this.appSdk = appSdk;
        this.config = {};
        this.managementSdk = null;
        this.stack = null;
        this.isProcessing = false;
        this.processingStats = {
            total: 0,
            processed: 0,
            successful: 0,
            errors: 0
        };
        this.errors = [];
        this.successfulEntries = [];
    }

    async initialize() {
        try {
            // Get app configuration
            this.config = await this.appSdk.getConfig() || {
                mduContentType: 'mdu_entries',
                tariffContentType: 'tariff_entries',
                environment: 'development',
                batchSize: '10',
                autoPublish: 'true'
            };

            // Initialize management SDK
            this.managementSdk = this.appSdk.stack;
            console.log('CSV Processor initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize CSV Processor:', error);
            throw new Error('Failed to initialize processor: ' + error.message);
        }
    }

    // MDU field mapping based on your PDF documentation
    static MDU_FIELDS = {
        CIVIC_NUMBER: 0,
        STREET_LABEL_EN: 1,
        STREET_LABEL_FR: 2,
        STREET_DIRECTION_EN: 3,
        STREET_DIRECTION_FR: 4,
        ADD_INFO_EN: 5,
        ADD_INFO_FR: 6,
        EXPIRY_DATE: 7,
        MDU_VISIBLE: 8,
        CITY_ID: 9,
        STREET_ID: 10,
        PROVINCE_ID: 11,
        FILE_TYPE: 12,
        POSTING_DATE_DEADLINE: 13,
        COMMENT: 14
    };

    // Province mapping
    static PROVINCE_MAP = {
        1: 'Alberta',
        2: 'British Columbia', 
        3: 'Manitoba',
        4: 'Ontario',
        5: 'Quebec',
        6: 'Saskatchewan',
        7: 'New Brunswick',
        8: 'Nova Scotia',
        9: 'Prince Edward Island',
        10: 'Newfoundland and Labrador'
    };

    // File type descriptions
    static FILE_TYPE_MAP = {
        1: 'One-page Building Access Licence Template',
        2: 'Two-page Building Access Licence Template',
        3: 'This Building Access Licence is available upon request',
        '': 'PDF Attached'
    };

    detectFileType(fileName, firstRow) {
        const lowerFileName = fileName.toLowerCase();
        
        if (lowerFileName.includes('mdu') || 
            lowerFileName.includes('building') ||
            lowerFileName.includes('access')) {
            return 'MDU';
        }
        
        if (lowerFileName.includes('tariff') || 
            lowerFileName.includes('rate') ||
            lowerFileName.includes('pricing')) {
            return 'TARIFF';
        }
        
        // Check first row structure for MDU (15 columns expected)
        if (firstRow && firstRow.length === 15) {
            return 'MDU';
        }
        
        // Default to MDU if unclear
        return 'MDU';
    }

    async processFile(file, onProgress, onStatusUpdate) {
        if (this.isProcessing) {
            throw new Error('Processing already in progress');
        }

        this.isProcessing = true;
        this.resetStats();
        onStatusUpdate('Parsing CSV file...');

        try {
            // Parse CSV file
            const parseResult = await this.parseCSV(file);
            const fileType = this.detectFileType(file.name, parseResult.data[0]);
            
            onStatusUpdate(`Processing ${fileType} file with ${parseResult.data.length} rows...`);
            
            this.processingStats.total = parseResult.data.length - 1; // Exclude header
            
            if (fileType === 'MDU') {
                await this.processMDUData(parseResult.data, onProgress, onStatusUpdate);
            } else if (fileType === 'TARIFF') {
                await this.processTariffData(parseResult.data, onProgress, onStatusUpdate);
            }
            
            onStatusUpdate('Processing complete!');
            
            return {
                success: true,
                stats: this.processingStats,
                errors: this.errors,
                successfulEntries: this.successfulEntries
            };
            
        } catch (error) {
            console.error('Processing error:', error);
            onStatusUpdate('Processing failed: ' + error.message);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                complete: (result) => {
                    if (result.errors && result.errors.length > 0) {
                        console.warn('CSV parsing warnings:', result.errors);
                    }
                    resolve(result);
                },
                error: (error) => {
                    reject(new Error('Failed to parse CSV: ' + error.message));
                },
                header: false,
                skipEmptyLines: true
            });
        });
    }

    async processMDUData(rows, onProgress, onStatusUpdate) {
        const batchSize = parseInt(this.config.batchSize) || 10;
        const autoPublish = this.config.autoPublish === 'true';
        
        // Skip header row
        const dataRows = rows.slice(1);
        
        for (let i = 0; i < dataRows.length; i += batchSize) {
            const batch = dataRows.slice(i, i + batchSize);
            onStatusUpdate(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(dataRows.length / batchSize)}...`);
            
            await Promise.allSettled(
                batch.map(async (row, batchIndex) => {
                    const rowIndex = i + batchIndex + 2; // +2 for header row and 1-based indexing
                    
                    try {
                        const mduData = this.parseMDURow(row, rowIndex);
                        const entry = await this.createMDUEntry(mduData);
                        
                        if (autoPublish) {
                            await this.publishEntry(entry);
                        }
                        
                        this.processingStats.successful++;
                        this.successfulEntries.push({
                            uid: entry.uid,
                            title: entry.title,
                            type: 'MDU'
                        });
                        
                    } catch (error) {
                        this.processingStats.errors++;
                        this.errors.push({
                            row: rowIndex,
                            error: error.message,
                            data: row
                        });
                    }
                    
                    this.processingStats.processed++;
                    onProgress(this.processingStats);
                })
            );
            
            // Small delay between batches to avoid rate limits
            if (i + batchSize < dataRows.length) {
                await this.delay(1000);
            }
        }
    }

    async processTariffData(rows, onProgress, onStatusUpdate) {
        const batchSize = parseInt(this.config.batchSize) || 10;
        const autoPublish = this.config.autoPublish === 'true';
        
        // Skip header row
        const dataRows = rows.slice(1);
        
        for (let i = 0; i < dataRows.length; i += batchSize) {
            const batch = dataRows.slice(i, i + batchSize);
            onStatusUpdate(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(dataRows.length / batchSize)}...`);
            
            await Promise.allSettled(
                batch.map(async (row, batchIndex) => {
                    const rowIndex = i + batchIndex + 2;
                    
                    try {
                        const tariffData = this.parseTariffRow(row, rowIndex);
                        const entry = await this.createTariffEntry(tariffData);
                        
                        if (autoPublish) {
                            await this.publishEntry(entry);
                        }
                        
                        this.processingStats.successful++;
                        this.successfulEntries.push({
                            uid: entry.uid,
                            title: entry.title,
                            type: 'TARIFF'
                        });
                        
                    } catch (error) {
                        this.processingStats.errors++;
                        this.errors.push({
                            row: rowIndex,
                            error: error.message,
                            data: row
                        });
                    }
                    
                    this.processingStats.processed++;
                    onProgress(this.processingStats);
                })
            );
            
            if (i + batchSize < dataRows.length) {
                await this.delay(1000);
            }
        }
    }

    parseMDURow(row, rowIndex) {
        const fields = CSVProcessor.MDU_FIELDS;
        
        // Validate required fields
        if (!row[fields.CIVIC_NUMBER] || !row[fields.STREET_LABEL_EN]) {
            throw new Error(`Missing required fields (civic number or street name) at row ${rowIndex}`);
        }

        const cityId = parseInt(row[fields.CITY_ID]) || 0;
        const streetId = parseInt(row[fields.STREET_ID]) || 0;
        const provinceId = parseInt(row[fields.PROVINCE_ID]) || 0;
        const isVisible = row[fields.MDU_VISIBLE] === '1';

        return {
            civic_number: row[fields.CIVIC_NUMBER]?.toString().trim(),
            street_name_en: row[fields.STREET_LABEL_EN]?.toString().trim(),
            street_name_fr: row[fields.STREET_LABEL_FR]?.toString().trim() || '',
            street_direction_en: row[fields.STREET_DIRECTION_EN]?.toString().trim() || '',
            street_direction_fr: row[fields.STREET_DIRECTION_FR]?.toString().trim() || '',
            additional_info_en: row[fields.ADD_INFO_EN]?.toString().trim() || '',
            additional_info_fr: row[fields.ADD_INFO_FR]?.toString().trim() || '',
            city_id: cityId,
            street_id: streetId,
            province_id: provinceId,
            province_name: CSVProcessor.PROVINCE_MAP[provinceId] || 'Unknown',
            expiry_date: this.parseDate(row[fields.EXPIRY_DATE]),
            posting_date: this.parseDate(row[fields.POSTING_DATE_DEADLINE]),
            file_type: row[fields.FILE_TYPE]?.toString().trim() || '',
            file_type_description: CSVProcessor.FILE_TYPE_MAP[row[fields.FILE_TYPE]] || '',
            comment: row[fields.COMMENT]?.toString().trim() || '',
            is_visible: isVisible,
            import_timestamp: new Date().toISOString()
        };
    }

    parseTariffRow(row, rowIndex) {
        // Assuming header row structure - adjust based on your tariff CSV format
        return {
            tariff_code: row[0]?.toString().trim() || '',
            description_en: row[1]?.toString().trim() || '',
            description_fr: row[2]?.toString().trim() || '',
            rate: parseFloat(row[3]) || 0,
            unit: row[4]?.toString().trim() || '',
            province: row[5]?.toString().trim() || '',
            effective_date: this.parseDate(row[6]) || new Date().toISOString(),
            expiry_date: this.parseDate(row[7]) || null,
            category: row[8]?.toString().trim() || '',
            notes: row[9]?.toString().trim() || '',
            import_timestamp: new Date().toISOString()
        };
    }

    async createMDUEntry(mduData) {
        try {
            const contentType = this.managementSdk.contentType(this.config.mduContentType);
            
            const entryData = {
                title: `${mduData.civic_number} ${mduData.street_name_en}`,
                ...mduData
            };
            
            const entry = await contentType.entry().create({ entry: entryData });
            return entry;
            
        } catch (error) {
            throw new Error(`Failed to create MDU entry: ${error.message}`);
        }
    }

    async createTariffEntry(tariffData) {
        try {
            const contentType = this.managementSdk.contentType(this.config.tariffContentType);
            
            const entryData = {
                title: `${tariffData.tariff_code} - ${tariffData.description_en}`,
                ...tariffData
            };
            
            const entry = await contentType.entry().create({ entry: entryData });
            return entry;
            
        } catch (error) {
            throw new Error(`Failed to create Tariff entry: ${error.message}`);
        }
    }

    async publishEntry(entry) {
        try {
            await entry.publish({
                entry: {
                    environments: [this.config.environment]
                }
            });
        } catch (error) {
            console.warn(`Failed to publish entry ${entry.uid}:`, error.message);
        }
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            // Handle MM/DD/YYYY HH:MM format from the MDU sheet
            if (dateString.includes('/')) {
                const [datePart, timePart] = dateString.split(' ');
                const [month, day, year] = datePart.split('/');
                
                if (timePart) {
                    const [hours, minutes] = timePart.split(':');
                    return new Date(year, month - 1, day, hours || 0, minutes || 0).toISOString();
                }
                
                return new Date(year, month - 1, day).toISOString();
            }
            
            // Try standard date parsing
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
            
            return null;
        } catch (error) {
            console.warn(`Failed to parse date: ${dateString}`);
            return null;
        }
    }

    resetStats() {
        this.processingStats = {
            total: 0,
            processed: 0,
            successful: 0,
            errors: 0
        };
        this.errors = [];
        this.successfulEntries = [];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}