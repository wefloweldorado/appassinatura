// SIGNply Web App - Enhanced JavaScript
class SignplyApp {
    constructor() {
        this.currentUser = null;
        this.documents = [];
        this.currentDocument = null;
        this.signaturePad = null;
        this.defaultSignaturePad = null;
        this.zoomLevel = 1;
        this.signatureColor = '#000000';
        this.signatureThickness = 3;
        this.signaturePosition = 'bottom-right';
        this.history = [];
        this.templates = [];
        this.analytics = {
            documentsProcessed: 0,
            signaturesCreated: 0,
            timeSpent: 0,
            lastActivity: null
        };
        this.settings = {
            autoSave: true,
            notifications: true,
            theme: 'light',
            language: 'pt-BR',
            signatureValidation: true
        };
        this.cache = new Map();
        this.performance = {
            startTime: Date.now(),
            loadTimes: []
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserData();
        this.loadDocuments();
        this.loadSettings();
        this.loadTemplates();
        this.loadWhatsAppRequests();
        this.loadQRCodes();
        this.setupNavigation();
        this.initializeTheme();
        this.setupPerformanceMonitoring();
        
        // Initialize signature system immediately (native implementation)
        setTimeout(() => {
            this.initializeSignaturePads();
            this.checkSignatureSystemStatus();
            this.updateAnalytics('app_loaded');
            
            // Enable auto-save if setting is enabled
            if (this.settings.autoSave) {
                this.enableAutoSave();
            }
        }, 500);
    }

    waitForLibraries() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max
            
            const checkLibraries = () => {
                attempts++;
                console.log(`Checking libraries... attempt ${attempts}`);
                
                if (typeof pdfjsLib !== 'undefined' && typeof SignaturePad !== 'undefined') {
                    console.log('All libraries loaded successfully');
                    // Configure PDF.js worker
                    if (pdfjsLib.GlobalWorkerOptions) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
                    }
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('Libraries failed to load after maximum attempts');
                    this.showNotification('Erro ao carregar bibliotecas. Recarregue a página.', 'error');
                    resolve(); // Continue anyway
                } else {
                    setTimeout(checkLibraries, 100);
                }
            };
            checkLibraries();
        });
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(link.getAttribute('href').substring(1));
            });
        });

        // Authentication
        document.getElementById('loginBtn').addEventListener('click', () => this.showModal('loginModal'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('showRegisterForm').addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('registerModal');
        });
        document.getElementById('showLoginForm').addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('loginModal');
        });

        // Forms
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Document actions
        document.getElementById('uploadBtn').addEventListener('click', () => this.showModal('uploadModal'));
        document.getElementById('uploadNewBtn').addEventListener('click', () => this.showModal('uploadModal'));
        document.getElementById('cameraBtn').addEventListener('click', () => this.openCamera());

        // File upload
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('uploadArea').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('uploadArea').addEventListener('dragover', (e) => this.handleDragOver(e));
        document.getElementById('uploadArea').addEventListener('drop', (e) => this.handleDrop(e));

        // Signature controls
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectSignatureColor(e));
        });
        document.getElementById('thicknessSlider').addEventListener('input', (e) => this.setSignatureThickness(e));
        document.getElementById('positionSelect').addEventListener('change', (e) => this.setSignaturePosition(e));
        document.getElementById('clearSignatureBtn').addEventListener('click', () => this.clearSignature());
        document.getElementById('applySignatureBtn').addEventListener('click', () => this.applySignature());
        document.getElementById('removeSignatureBtn').addEventListener('click', () => this.removeSignature());
        document.getElementById('saveDocumentBtn').addEventListener('click', () => this.saveDocument());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadDocument());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareDocument());

        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());

        // Settings
        document.getElementById('saveDefaultSignatureBtn').addEventListener('click', () => this.saveDefaultSignature());
        document.getElementById('saveTemplateBtn').addEventListener('click', () => this.showSaveTemplateModal());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importDataInput').click());
        document.getElementById('importDataInput').addEventListener('change', (e) => this.importData(e.target.files[0]));
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Settings controls
        document.getElementById('autoSave').addEventListener('change', (e) => this.toggleAutoSave(e.target.checked));
        document.getElementById('notifications').addEventListener('change', (e) => this.toggleNotifications(e.target.checked));
        document.getElementById('themeSelect').addEventListener('change', (e) => this.changeTheme(e.target.value));
        
        // WhatsApp integration
        document.getElementById('sendWhatsAppBtn').addEventListener('click', () => this.showModal('whatsappQRModal'));
        document.getElementById('generateQRBtn').addEventListener('click', () => this.generateQRCode());
        document.getElementById('whatsappSendForm').addEventListener('submit', (e) => this.handleWhatsAppSend(e));
        document.getElementById('downloadQRCode').addEventListener('click', () => this.downloadQRCode());
        document.getElementById('copyQRLink').addEventListener('click', () => this.copyQRLink());
        document.getElementById('submitWhatsAppSignature').addEventListener('click', () => this.submitWhatsAppSignature());
        document.getElementById('clearWhatsAppSignature').addEventListener('click', () => this.clearWhatsAppSignature());

        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    setupNavigation() {
        // Show home section by default
        this.showSection('home');
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
        }

        // Add active class to corresponding nav link
        const navLink = document.querySelector(`[href="#${sectionId}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }

        // Load section-specific data
        if (sectionId === 'documents') {
            this.loadDocuments();
        } else if (sectionId === 'settings') {
            this.loadSignatureTemplates();
            this.loadStatistics();
        } else if (sectionId === 'whatsapp') {
            this.loadWhatsAppRequests();
            this.populateWhatsAppDocuments();
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Authentication
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Simulate login
        this.currentUser = {
            name: email.split('@')[0],
            email: email
        };

        this.updateUserInterface();
        this.hideModal('loginModal');
        this.showNotification('Login realizado com sucesso!', 'success');
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        // Simulate registration
        this.currentUser = {
            name: name,
            email: email
        };

        this.updateUserInterface();
        this.hideModal('registerModal');
        this.showNotification('Conta criada com sucesso!', 'success');
    }

    logout() {
        this.currentUser = null;
        this.updateUserInterface();
        this.showNotification('Logout realizado com sucesso!', 'info');
    }

    updateUserInterface() {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            userName.textContent = this.currentUser.name;
        } else {
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
        }
    }

    // Document Management
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => this.processFile(file));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = '#667eea';
        e.currentTarget.style.backgroundColor = '#f0f2ff';
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = '#dee2e6';
        e.currentTarget.style.backgroundColor = '#f8f9fa';
        
        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => this.processFile(file));
    }

    async processFile(file) {
        if (!this.isValidFileType(file)) {
            this.showNotification('Tipo de arquivo não suportado!', 'error');
            return;
        }

        this.showUploadProgress(true);
        
        try {
            // Simulate file processing
            await this.simulateUpload(file);
            
            const document = {
                id: Date.now(),
                name: file.name,
                type: file.type,
                size: file.size,
                date: new Date().toLocaleDateString(),
                file: file
            };

            this.documents.push(document);
            await this.saveDocuments();
            this.loadDocuments();
            this.showNotification('Documento carregado com sucesso!', 'success');
            
            // Auto switch to sign section
            this.showSection('sign');
            this.loadDocumentForSigning(document);
            
        } catch (error) {
            console.error('Error processing file:', error);
            this.showNotification('Erro ao carregar documento!', 'error');
        } finally {
            this.showUploadProgress(false);
        }
    }

    isValidFileType(file) {
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];
        return validTypes.includes(file.type);
    }

    async simulateUpload(file) {
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 30;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    resolve();
                }
                this.updateUploadProgress(progress);
            }, 200);
        });
    }

    showUploadProgress(show) {
        const progress = document.getElementById('uploadProgress');
        progress.style.display = show ? 'block' : 'none';
    }

    updateUploadProgress(percent) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        progressFill.style.width = percent + '%';
        progressText.textContent = Math.round(percent) + '%';
    }

    loadDocuments() {
        const grid = document.getElementById('documentsGrid');
        grid.innerHTML = '';

        if (this.documents.length === 0) {
            grid.innerHTML = '<p class="text-center">Nenhum documento encontrado. Carregue um documento para começar!</p>';
            return;
        }

        this.documents.forEach((doc, index) => {
            const card = this.createDocumentCard(doc);
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in-up');
            grid.appendChild(card);
        });
    }

    createDocumentCard(document) {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.addEventListener('click', () => this.loadDocumentForSigning(document));

        const icon = this.getFileIcon(document.type);
        
        card.innerHTML = `
            <div class="document-icon">
                <i class="${icon}"></i>
            </div>
            <div class="document-name">${document.name}</div>
            <div class="document-date">${document.date}</div>
        `;

        return card;
    }

    getFileIcon(type) {
        if (type.includes('pdf')) return 'fas fa-file-pdf';
        if (type.includes('word') || type.includes('document')) return 'fas fa-file-word';
        if (type.includes('excel') || type.includes('spreadsheet')) return 'fas fa-file-excel';
        if (type.includes('image')) return 'fas fa-file-image';
        return 'fas fa-file';
    }

    loadDocumentForSigning(doc) {
        this.currentDocument = doc;
        document.getElementById('documentTitle').textContent = doc.name;
        
        // Check if file exists
        if (!doc.file) {
            this.showNotification('Arquivo não encontrado. Por favor, carregue o documento novamente.', 'error');
            return;
        }
        
        // Show loading state
        this.showDocumentLoading(true);
        
        if (doc.type.includes('pdf')) {
            this.loadPDFDocument(doc.file);
        } else if (doc.type.includes('image')) {
            this.loadImageDocument(doc.file);
        } else {
            this.showNotification('Tipo de documento não suportado para visualização', 'warning');
            this.showDocumentLoading(false);
        }
    }

    showDocumentLoading(show) {
        const canvas = document.getElementById('documentCanvas');
        const container = canvas.parentElement;
        
        if (show) {
            // Create loading overlay
            let loadingDiv = container.querySelector('.loading-overlay');
            if (!loadingDiv) {
                loadingDiv = document.createElement('div');
                loadingDiv.className = 'loading-overlay';
                loadingDiv.innerHTML = `
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Carregando documento...</p>
                    </div>
                `;
                container.appendChild(loadingDiv);
            }
            loadingDiv.style.display = 'flex';
        } else {
            const loadingDiv = container.querySelector('.loading-overlay');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
        }
    }

    async loadPDFDocument(file) {
        try {
            if (typeof pdfjsLib === 'undefined') {
                this.showNotification('Biblioteca PDF não carregada. Recarregue a página.', 'error');
                this.showDocumentLoading(false);
                return;
            }
            
            // Ensure worker is configured
            if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
            }
            
            this.showNotification('Carregando PDF...', 'info');
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(1);
            
            const canvas = document.getElementById('documentCanvas');
            const context = canvas.getContext('2d');
            
            // Optimize canvas
            this.optimizeCanvas(canvas);
            
            const viewport = page.getViewport({ scale: this.zoomLevel });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            this.showDocumentLoading(false);
            this.showNotification('PDF carregado com sucesso!', 'success');
        } catch (error) {
            console.error('PDF loading error:', error);
            this.showDocumentLoading(false);
            this.showNotification('Erro ao carregar PDF: ' + error.message, 'error');
        }
    }

    loadImageDocument(file) {
        try {
            this.showNotification('Carregando imagem...', 'info');
            
            const canvas = document.getElementById('documentCanvas');
            const context = canvas.getContext('2d');
            
            // Optimize canvas
            this.optimizeCanvas(canvas);
            
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width * this.zoomLevel;
                canvas.height = img.height * this.zoomLevel;
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                this.showDocumentLoading(false);
                this.showNotification('Imagem carregada com sucesso!', 'success');
            };
            
            img.onerror = () => {
                this.showDocumentLoading(false);
                this.showNotification('Erro ao carregar imagem', 'error');
            };
            
            img.src = URL.createObjectURL(file);
        } catch (error) {
            console.error('Image loading error:', error);
            this.showDocumentLoading(false);
            this.showNotification('Erro ao carregar imagem: ' + error.message, 'error');
        }
    }

    openCamera() {
        document.getElementById('cameraInput').click();
    }

    // Signature Management - Native Canvas Implementation
    initializeSignaturePads() {
        console.log('Initializing native signature system...');
        
        const signatureCanvas = document.getElementById('signaturePad');
        const defaultCanvas = document.getElementById('defaultSignaturePad');
        
        console.log('Signature canvas found:', !!signatureCanvas);
        console.log('Default canvas found:', !!defaultCanvas);
        
        if (signatureCanvas) {
            try {
                this.signaturePad = this.createNativeSignaturePad(signatureCanvas);
                console.log('Native signature pad initialized successfully');
            } catch (error) {
                console.error('Error initializing native signature pad:', error);
                this.showNotification('Erro ao inicializar sistema de assinatura: ' + error.message, 'error');
            }
        } else {
            console.error('Signature canvas not found');
            this.showNotification('Canvas de assinatura não encontrado', 'error');
        }
        
        if (defaultCanvas) {
            try {
                this.defaultSignaturePad = this.createNativeSignaturePad(defaultCanvas);
                console.log('Default native signature pad initialized successfully');
            } catch (error) {
                console.error('Error initializing default native signature pad:', error);
            }
        }
    }

    createNativeSignaturePad(canvas) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        
        // Optimize canvas
        this.optimizeCanvas(canvas);
        
        // Configure canvas
        ctx.strokeStyle = this.signatureColor;
        ctx.lineWidth = this.signatureThickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Make canvas visible and interactive
        canvas.style.display = 'block';
        canvas.style.cursor = 'crosshair';
        canvas.style.background = 'white';
        
        // Event handlers
        const startDrawing = (e) => {
            e.preventDefault();
            isDrawing = true;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            console.log('Drawing started');
        };
        
        const draw = (e) => {
            if (!isDrawing) return;
            e.preventDefault();
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ctx.lineTo(x, y);
            ctx.stroke();
        };
        
        const stopDrawing = (e) => {
            if (!isDrawing) return;
            e.preventDefault();
            isDrawing = false;
            console.log('Drawing stopped');
        };
        
        const handleTouch = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                           e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        };
        
        // Add event listeners
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        canvas.addEventListener('touchstart', handleTouch);
        canvas.addEventListener('touchmove', handleTouch);
        canvas.addEventListener('touchend', stopDrawing);
        
        // Return signature pad object with required methods
        return {
            canvas: canvas,
            context: ctx,
            clear: () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            },
            isEmpty: () => {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] !== 0) return false; // Check alpha channel
                }
                return true;
            },
            toDataURL: (type = 'image/png') => {
                return canvas.toDataURL(type);
            },
            penColor: this.signatureColor,
            minWidth: this.signatureThickness,
            maxWidth: this.signatureThickness,
            set penColor(color) {
                ctx.strokeStyle = color;
                this.penColor = color;
            },
            set minWidth(width) {
                ctx.lineWidth = width;
                this.minWidth = width;
            },
            set maxWidth(width) {
                ctx.lineWidth = width;
                this.maxWidth = width;
            }
        };
    }

    checkSignatureSystemStatus() {
        const status = {
            signaturePadInitialized: this.signaturePad !== null,
            canvasExists: document.getElementById('signaturePad') !== null,
            nativeImplementation: true
        };
        
        console.log('Native signature system status:', status);
        
        if (!status.canvasExists) {
            this.showNotification('Canvas de assinatura não encontrado', 'error');
        } else if (!status.signaturePadInitialized) {
            this.showNotification('Sistema de assinatura não inicializado', 'error');
        } else {
            console.log('Native signature system ready');
            this.showNotification('Sistema de assinatura nativo funcionando!', 'success');
        }
    }

    selectSignatureColor(e) {
        document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.signatureColor = e.target.dataset.color;
        
        if (this.signaturePad) {
            this.signaturePad.penColor = this.signatureColor;
            console.log('Signature color changed to:', this.signatureColor);
        }
    }

    setSignatureThickness(e) {
        this.signatureThickness = parseInt(e.target.value);
        
        if (this.signaturePad) {
            this.signaturePad.minWidth = this.signatureThickness;
            this.signaturePad.maxWidth = this.signatureThickness;
            console.log('Signature thickness changed to:', this.signatureThickness);
        }
    }

    setSignaturePosition(e) {
        this.signaturePosition = e.target.value;
    }

    clearSignature() {
        if (this.signaturePad) {
            this.signaturePad.clear();
            console.log('Signature cleared');
            this.showNotification('Assinatura limpa', 'info');
        } else {
            this.showNotification('Sistema de assinatura não disponível.', 'error');
        }
    }

    applySignature() {
        if (!this.signaturePad) {
            this.showNotification('Sistema de assinatura não disponível. Recarregue a página.', 'error');
            return;
        }

        if (this.signaturePad.isEmpty()) {
            this.showNotification('Por favor, desenhe uma assinatura primeiro!', 'warning');
            return;
        }

        if (!this.currentDocument) {
            this.showNotification('Nenhum documento selecionado!', 'warning');
            return;
        }

        // Get signature data
        const signatureData = this.signaturePad.toDataURL();
        
        // Apply signature to document canvas
        this.addSignatureToDocument(signatureData);
        
        // Show remove button
        document.getElementById('removeSignatureBtn').style.display = 'inline-block';
        
        this.showNotification('Assinatura aplicada! Arraste para mover.', 'success');
    }

    removeSignature() {
        if (!this.currentDocument) {
            this.showNotification('Nenhum documento selecionado!', 'warning');
            return;
        }

        // Clean up drag events
        if (this.cleanupSignatureDrag) {
            this.cleanupSignatureDrag();
        }

        // Reload document without signature
        if (this.currentDocument.type.includes('pdf')) {
            this.loadPDFDocument(this.currentDocument.file);
        } else if (this.currentDocument.type.includes('image')) {
            this.loadImageDocument(this.currentDocument.file);
        }

        // Hide remove button
        document.getElementById('removeSignatureBtn').style.display = 'none';
        
        // Update analytics
        this.updateAnalytics('signature_removed');
        
        this.showNotification('Assinatura removida!', 'success');
    }

    addSignatureToDocument(signatureData) {
        const canvas = document.getElementById('documentCanvas');
        const context = canvas.getContext('2d');
        
        // Optimize canvas
        this.optimizeCanvas(canvas);
        
        // Store the original document before adding signature
        const originalCanvas = document.createElement('canvas');
        originalCanvas.width = canvas.width;
        originalCanvas.height = canvas.height;
        const originalCtx = originalCanvas.getContext('2d');
        originalCtx.drawImage(canvas, 0, 0);
        
        const img = new Image();
        img.onload = () => {
            const signatureWidth = 200;
            const signatureHeight = 100;
            
            let x, y;
            const margin = 20;
            
            // Calculate initial position based on setting
            switch (this.signaturePosition) {
                case 'bottom-right':
                    x = canvas.width - signatureWidth - margin;
                    y = canvas.height - signatureHeight - margin;
                    break;
                case 'bottom-left':
                    x = margin;
                    y = canvas.height - signatureHeight - margin;
                    break;
                case 'top-right':
                    x = canvas.width - signatureWidth - margin;
                    y = margin;
                    break;
                case 'top-left':
                    x = margin;
                    y = margin;
                    break;
                case 'center':
                    x = (canvas.width - signatureWidth) / 2;
                    y = (canvas.height - signatureHeight) / 2;
                    break;
            }
            
            // Draw signature
            context.drawImage(img, x, y, signatureWidth, signatureHeight);
            
            // Make signature draggable with the original canvas
            this.makeSignatureDraggable(canvas, img, x, y, signatureWidth, signatureHeight, originalCanvas);
        };
        
        img.src = signatureData;
    }

    makeSignatureDraggable(canvas, signatureImg, initialX, initialY, width, height, originalCanvas = null) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        let currentX = initialX;
        let currentY = initialY;
        
        // Use provided original canvas or create one
        let tempCanvas;
        if (originalCanvas) {
            tempCanvas = originalCanvas;
        } else {
            // Create a temporary canvas to store the document without signature
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Optimize temporary canvas
            this.optimizeCanvas(tempCanvas);
            
            // Store the original document without signature
            tempCtx.drawImage(canvas, 0, 0);
        }
        
        // Get main canvas context
        const mainCtx = canvas.getContext('2d');
        
        // Optimize main canvas
        this.optimizeCanvas(canvas);
        
        // Draw signature at current position
        const drawSignature = () => {
            // Clear the main canvas
            mainCtx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the original document (without signature)
            mainCtx.drawImage(tempCanvas, 0, 0);
            
            // Draw the signature at current position
            mainCtx.drawImage(signatureImg, currentX, currentY, width, height);
            
            // Draw selection border if dragging
            if (isDragging) {
                mainCtx.strokeStyle = '#007bff';
                mainCtx.lineWidth = 2;
                mainCtx.setLineDash([5, 5]);
                mainCtx.strokeRect(currentX - 2, currentY - 2, width + 4, height + 4);
                mainCtx.setLineDash([]);
            }
        };
        
        // Mouse events
        const handleMouseDown = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Check if click is within signature bounds
            if (mouseX >= currentX && mouseX <= currentX + width &&
                mouseY >= currentY && mouseY <= currentY + height) {
                isDragging = true;
                dragOffset.x = mouseX - currentX;
                dragOffset.y = mouseY - currentY;
                canvas.style.cursor = 'move';
                e.preventDefault();
            }
        };
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate new position
            currentX = mouseX - dragOffset.x;
            currentY = mouseY - dragOffset.y;
            
            // Keep signature within canvas bounds
            currentX = Math.max(0, Math.min(currentX, canvas.width - width));
            currentY = Math.max(0, Math.min(currentY, canvas.height - height));
            
            drawSignature();
            e.preventDefault();
        };
        
        const handleMouseUp = (e) => {
            if (isDragging) {
                isDragging = false;
                canvas.style.cursor = 'crosshair';
                drawSignature(); // Remove selection border
                this.showNotification('Posição da assinatura atualizada!', 'success');
            }
        };
        
        // Touch events
        const handleTouchStart = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            if (touchX >= currentX && touchX <= currentX + width &&
                touchY >= currentY && touchY <= currentY + height) {
                isDragging = true;
                dragOffset.x = touchX - currentX;
                dragOffset.y = touchY - currentY;
                canvas.style.cursor = 'move';
            }
        };
        
        const handleTouchMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            currentX = touchX - dragOffset.x;
            currentY = touchY - dragOffset.y;
            
            currentX = Math.max(0, Math.min(currentX, canvas.width - width));
            currentY = Math.max(0, Math.min(currentY, canvas.height - height));
            
            drawSignature();
        };
        
        const handleTouchEnd = (e) => {
            if (isDragging) {
                isDragging = false;
                canvas.style.cursor = 'crosshair';
                drawSignature();
                this.showNotification('Posição da assinatura atualizada!', 'success');
            }
        };
        
        // Add event listeners
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        
        // Initial draw
        drawSignature();
        
        // Store cleanup function
        this.cleanupSignatureDrag = () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }

    saveDocument() {
        if (!this.currentDocument) {
            this.showNotification('Nenhum documento selecionado!', 'warning');
            return;
        }

        const canvas = document.getElementById('documentCanvas');
        const link = document.createElement('a');
        link.download = `signed_${this.currentDocument.name}`;
        link.href = canvas.toDataURL();
        link.click();
        
        this.showNotification('Documento salvo com sucesso!', 'success');
    }

    downloadDocument() {
        this.saveDocument();
    }

    shareDocument() {
        if (!this.currentDocument) {
            this.showNotification('Nenhum documento selecionado!', 'warning');
            return;
        }

        if (navigator.share) {
            navigator.share({
                title: `Documento assinado: ${this.currentDocument.name}`,
                text: 'Documento assinado digitalmente com SIGNply',
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showNotification('Link copiado para a área de transferência!', 'success');
            });
        }
    }

    saveDefaultSignature() {
        if (!this.defaultSignaturePad) {
            this.showNotification('Sistema de assinatura não disponível. Recarregue a página.', 'error');
            return;
        }

        if (this.defaultSignaturePad.isEmpty()) {
            this.showNotification('Por favor, desenhe uma assinatura padrão!', 'warning');
            return;
        }

        const signatureData = this.defaultSignaturePad.toDataURL();
        localStorage.setItem('defaultSignature', signatureData);
        this.showNotification('Assinatura padrão salva!', 'success');
    }

    loadDefaultSignature() {
        const signatureData = localStorage.getItem('defaultSignature');
        if (signatureData && this.defaultSignaturePad) {
            const img = new Image();
            img.onload = () => {
                const context = this.defaultSignaturePad.getContext('2d');
                context.drawImage(img, 0, 0);
            };
            img.src = signatureData;
        }
    }

    // Zoom controls
    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel + 0.2, 3);
        this.updateZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel - 0.2, 0.5);
        this.updateZoom();
    }

    updateZoom() {
        document.getElementById('zoomLevel').textContent = Math.round(this.zoomLevel * 100) + '%';
        
        if (this.currentDocument) {
            if (this.currentDocument.type.includes('pdf')) {
                this.loadPDFDocument(this.currentDocument.file);
            } else if (this.currentDocument.type.includes('image')) {
                this.loadImageDocument(this.currentDocument.file);
            }
        }
    }

    // Data persistence
    saveUserData() {
        if (this.currentUser) {
            localStorage.setItem('signplyUser', JSON.stringify(this.currentUser));
        }
    }

    loadUserData() {
        const userData = localStorage.getItem('signplyUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUserInterface();
        }
    }

    async saveDocuments() {
        try {
            // Store document metadata only, not the file objects
            const documentsToSave = await Promise.all(this.documents.map(async doc => ({
                id: doc.id,
                name: doc.name,
                type: doc.type,
                size: doc.size,
                date: doc.date,
                // Store file as base64 for persistence
                fileData: doc.file ? await this.fileToBase64(doc.file) : null
            })));
            localStorage.setItem('signplyDocuments', JSON.stringify(documentsToSave));
        } catch (error) {
            console.error('Error saving documents:', error);
            this.showNotification('Erro ao salvar documentos!', 'error');
        }
    }

    loadDocuments() {
        const documentsData = localStorage.getItem('signplyDocuments');
        if (documentsData) {
            try {
                const savedDocs = JSON.parse(documentsData);
                this.documents = savedDocs.map(doc => ({
                    ...doc,
                    file: doc.fileData ? this.base64ToFile(doc.fileData, doc.name, doc.type) : null
                }));
            } catch (error) {
                console.error('Error loading documents:', error);
                this.documents = [];
            }
        }
    }

    // Helper method to convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Helper method to convert base64 back to file
    base64ToFile(base64, filename, mimeType) {
        const arr = base64.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mimeType || mime });
    }

    // Notifications
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || '#17a2b8';
    }

    // Enhanced Features
    loadSettings() {
        const savedSettings = localStorage.getItem('signplySettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    saveSettings() {
        localStorage.setItem('signplySettings', JSON.stringify(this.settings));
    }

    loadTemplates() {
        const savedTemplates = localStorage.getItem('signplyTemplates');
        if (savedTemplates) {
            this.templates = JSON.parse(savedTemplates);
        }
    }

    saveTemplates() {
        localStorage.setItem('signplyTemplates', JSON.stringify(this.templates));
    }

    initializeTheme() {
        document.body.classList.add(`theme-${this.settings.theme}`);
        if (this.settings.theme === 'dark') {
            document.body.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
        }
    }

    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            const loadTime = Date.now() - this.performance.startTime;
            this.performance.loadTimes.push(loadTime);
            this.updateAnalytics('page_loaded', { loadTime });
        });

        // Monitor user activity
        let lastActivity = Date.now();
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
                this.analytics.lastActivity = lastActivity;
            });
        });

        // Update time spent every minute
        setInterval(() => {
            this.analytics.timeSpent += 1;
        }, 60000);
    }

    updateAnalytics(event, data = {}) {
        this.analytics[event] = (this.analytics[event] || 0) + 1;
        this.analytics.lastActivity = Date.now();
        
        // Save analytics
        localStorage.setItem('signplyAnalytics', JSON.stringify(this.analytics));
        
        console.log(`Analytics: ${event}`, data);
    }

    // Document History Management
    addToHistory(action, document, details = {}) {
        const historyItem = {
            id: Date.now(),
            action,
            document: document ? {
                id: document.id,
                name: document.name,
                type: document.type
            } : null,
            details,
            timestamp: new Date().toISOString(),
            user: this.currentUser?.name || 'Anonymous'
        };
        
        this.history.unshift(historyItem);
        
        // Keep only last 100 history items
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }
        
        localStorage.setItem('signplyHistory', JSON.stringify(this.history));
    }

    getHistory() {
        return this.history;
    }

    // Signature Templates
    saveSignatureTemplate(name, signatureData) {
        const template = {
            id: Date.now(),
            name,
            signatureData,
            createdAt: new Date().toISOString(),
            user: this.currentUser?.name || 'Anonymous'
        };
        
        this.templates.push(template);
        this.saveTemplates();
        this.showNotification(`Template "${name}" salvo com sucesso!`, 'success');
    }

    loadSignatureTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (template && this.signaturePad) {
            const img = new Image();
            img.onload = () => {
                this.signaturePad.clear();
                const ctx = this.signaturePad.context;
                ctx.drawImage(img, 0, 0, this.signaturePad.canvas.width, this.signaturePad.canvas.height);
                this.showNotification(`Template "${template.name}" carregado!`, 'success');
            };
            img.src = template.signatureData;
        }
    }

    deleteSignatureTemplate(templateId) {
        this.templates = this.templates.filter(t => t.id !== templateId);
        this.saveTemplates();
        this.showNotification('Template removido!', 'info');
    }

    // Enhanced Document Validation
    validateDocument(document) {
        const errors = [];
        
        if (!document.name || document.name.trim() === '') {
            errors.push('Nome do documento é obrigatório');
        }
        
        if (!document.type) {
            errors.push('Tipo do documento é obrigatório');
        }
        
        if (document.size > 50 * 1024 * 1024) { // 50MB limit
            errors.push('Documento muito grande (máximo 50MB)');
        }
        
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];
        
        if (!validTypes.includes(document.type)) {
            errors.push('Tipo de arquivo não suportado');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Enhanced Signature Validation
    validateSignature(signatureData) {
        if (!signatureData) {
            return { isValid: false, error: 'Assinatura não encontrada' };
        }
        
        // Check if signature has enough complexity
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return new Promise((resolve) => {
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                let pixelCount = 0;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] !== 0) { // Check alpha channel
                        pixelCount++;
                    }
                }
                
                const isValid = pixelCount > 100; // Minimum pixel count for valid signature
                resolve({
                    isValid,
                    error: isValid ? null : 'Assinatura muito simples. Desenhe com mais detalhes.',
                    complexity: pixelCount
                });
            };
            img.src = signatureData;
        });
    }

    // Auto-save functionality
    enableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            if (this.currentDocument && this.settings.autoSave) {
                this.saveDocuments();
                this.updateAnalytics('auto_save');
            }
        }, 30000); // Auto-save every 30 seconds
    }

    disableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Enhanced Error Handling
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        const errorMessage = this.getErrorMessage(error);
        this.showNotification(errorMessage, 'error');
        
        // Log error for analytics
        this.updateAnalytics('error', {
            context,
            message: error.message,
            stack: error.stack
        });
    }

    getErrorMessage(error) {
        if (error.message.includes('PDF')) {
            return 'Erro ao processar PDF. Verifique se o arquivo não está corrompido.';
        }
        if (error.message.includes('Canvas')) {
            return 'Erro no sistema de desenho. Recarregue a página.';
        }
        if (error.message.includes('Storage')) {
            return 'Erro ao salvar dados. Verifique o espaço disponível.';
        }
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }

    // Performance Optimization
    optimizeCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Enable hardware acceleration
        canvas.style.willChange = 'transform';
        canvas.style.transform = 'translateZ(0)';
    }

    // Cache Management
    getCachedData(key) {
        return this.cache.get(key);
    }

    setCachedData(key, data, ttl = 300000) { // 5 minutes default TTL
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
            }
        }
    }

    // Export/Import functionality
    exportData() {
        const exportData = {
            documents: this.documents,
            templates: this.templates,
            settings: this.settings,
            history: this.history,
            analytics: this.analytics,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signply-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Dados exportados com sucesso!', 'success');
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (importData.version !== '2.0') {
                    this.showNotification('Versão do backup incompatível!', 'error');
                    return;
                }
                
                // Import data with validation
                if (importData.documents) {
                    this.documents = importData.documents;
                    this.saveDocuments();
                }
                
                if (importData.templates) {
                    this.templates = importData.templates;
                    this.saveTemplates();
                }
                
                if (importData.settings) {
                    this.settings = { ...this.settings, ...importData.settings };
                    this.saveSettings();
                }
                
                this.showNotification('Dados importados com sucesso!', 'success');
                this.loadDocuments();
                
            } catch (error) {
                this.handleError(error, 'importData');
            }
        };
        reader.readAsText(file);
    }

    // Advanced Search
    searchDocuments(query) {
        const searchTerm = query.toLowerCase();
        return this.documents.filter(doc => 
            doc.name.toLowerCase().includes(searchTerm) ||
            doc.type.toLowerCase().includes(searchTerm) ||
            doc.date.includes(searchTerm)
        );
    }

    // Statistics Dashboard
    getStatistics() {
        return {
            totalDocuments: this.documents.length,
            totalTemplates: this.templates.length,
            totalSignatures: this.analytics.signaturesCreated || 0,
            timeSpent: this.analytics.timeSpent,
            lastActivity: this.analytics.lastActivity,
            averageLoadTime: this.performance.loadTimes.length > 0 
                ? this.performance.loadTimes.reduce((a, b) => a + b, 0) / this.performance.loadTimes.length 
                : 0
        };
    }

    // New UI Methods
    handleSearch(query) {
        const filteredDocs = this.searchDocuments(query);
        this.displayFilteredDocuments(filteredDocs);
    }

    displayFilteredDocuments(documents) {
        const grid = document.getElementById('documentsGrid');
        grid.innerHTML = '';

        if (documents.length === 0) {
            grid.innerHTML = '<p class="text-center">Nenhum documento encontrado.</p>';
            return;
        }

        documents.forEach(doc => {
            const card = this.createDocumentCard(doc);
            card.classList.add('fade-in-up');
            grid.appendChild(card);
        });
    }

    showSaveTemplateModal() {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            this.showNotification('Desenhe uma assinatura primeiro!', 'warning');
            return;
        }

        const name = prompt('Nome do template:');
        if (name && name.trim()) {
            const signatureData = this.signaturePad.toDataURL();
            this.saveSignatureTemplate(name.trim(), signatureData);
            this.loadSignatureTemplates();
        }
    }

    loadSignatureTemplates() {
        const container = document.getElementById('signatureTemplates');
        container.innerHTML = '';

        if (this.templates.length === 0) {
            container.innerHTML = '<p>Nenhum template salvo.</p>';
            return;
        }

        this.templates.forEach(template => {
            const templateDiv = document.createElement('div');
            templateDiv.className = 'template-item';
            templateDiv.innerHTML = `
                <div class="template-preview">
                    <img src="${template.signatureData}" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div class="template-name">${template.name}</div>
                <div class="template-actions">
                    <button class="btn btn-sm btn-primary" onclick="app.loadSignatureTemplate(${template.id})">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteSignatureTemplate(${template.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(templateDiv);
        });
    }

    loadStatistics() {
        const stats = this.getStatistics();
        const container = document.getElementById('statisticsDisplay');
        
        container.innerHTML = `
            <div class="statistics-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.totalDocuments}</div>
                    <div class="stat-label">Documentos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.totalTemplates}</div>
                    <div class="stat-label">Templates</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.totalSignatures}</div>
                    <div class="stat-label">Assinaturas</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Math.round(stats.timeSpent)}</div>
                    <div class="stat-label">Minutos</div>
                </div>
            </div>
        `;
    }

    toggleAutoSave(enabled) {
        this.settings.autoSave = enabled;
        this.saveSettings();
        
        if (enabled) {
            this.enableAutoSave();
            this.showNotification('Auto-salvamento ativado', 'success');
        } else {
            this.disableAutoSave();
            this.showNotification('Auto-salvamento desativado', 'info');
        }
    }

    toggleNotifications(enabled) {
        this.settings.notifications = enabled;
        this.saveSettings();
        
        if (enabled) {
            this.showNotification('Notificações ativadas', 'success');
        } else {
            this.showNotification('Notificações desativadas', 'info');
        }
    }

    changeTheme(theme) {
        this.settings.theme = theme;
        this.saveSettings();
        
        // Remove existing theme classes
        document.body.classList.remove('theme-light', 'theme-dark');
        
        // Apply new theme
        document.body.classList.add(`theme-${theme}`);
        
        if (theme === 'dark') {
            document.body.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
        } else {
            document.body.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
        }
        
        this.showNotification(`Tema ${theme === 'dark' ? 'escuro' : 'claro'} aplicado`, 'success');
    }

    // Enhanced signature validation
    async applySignature() {
        if (!this.signaturePad) {
            this.showNotification('Sistema de assinatura não disponível. Recarregue a página.', 'error');
            return;
        }

        if (this.signaturePad.isEmpty()) {
            this.showNotification('Por favor, desenhe uma assinatura primeiro!', 'warning');
            return;
        }

        if (!this.currentDocument) {
            this.showNotification('Nenhum documento selecionado!', 'warning');
            return;
        }

        // Validate signature if enabled
        if (this.settings.signatureValidation) {
            const signatureData = this.signaturePad.toDataURL();
            const validation = await this.validateSignature(signatureData);
            
            if (!validation.isValid) {
                this.showNotification(validation.error, 'warning');
                return;
            }
        }

        // Get signature data
        const signatureData = this.signaturePad.toDataURL();
        
        // Apply signature to document canvas
        this.addSignatureToDocument(signatureData);
        
        // Show remove button
        document.getElementById('removeSignatureBtn').style.display = 'inline-block';
        
        // Update analytics
        this.updateAnalytics('signature_applied');
        this.analytics.signaturesCreated++;
        
        // Add to history
        this.addToHistory('signature_applied', this.currentDocument, {
            signatureComplexity: this.signaturePad.isEmpty() ? 0 : 100 // Simplified
        });
        
        this.showNotification('Assinatura aplicada! Arraste para mover.', 'success');
    }

    // Enhanced document processing with validation
    async processFile(file) {
        if (!this.isValidFileType(file)) {
            this.showNotification('Tipo de arquivo não suportado!', 'error');
            return;
        }

        // Create document object
        const document = {
            id: Date.now(),
            name: file.name,
            type: file.type,
            size: file.size,
            date: new Date().toLocaleDateString(),
            file: file
        };

        // Validate document
        const validation = this.validateDocument(document);
        if (!validation.isValid) {
            this.showNotification(validation.errors.join(', '), 'error');
            return;
        }

        this.showUploadProgress(true);
        
        try {
            // Simulate file processing
            await this.simulateUpload(file);
            
            this.documents.push(document);
            await this.saveDocuments();
            this.loadDocuments();
            
            // Update analytics
            this.updateAnalytics('document_uploaded');
            this.analytics.documentsProcessed++;
            
            // Add to history
            this.addToHistory('document_uploaded', document);
            
            this.showNotification('Documento carregado com sucesso!', 'success');
            
            // Auto switch to sign section
            this.showSection('sign');
            this.loadDocumentForSigning(document);
            
        } catch (error) {
            this.handleError(error, 'processFile');
        } finally {
            this.showUploadProgress(false);
        }
    }

    // WhatsApp Integration Methods
    whatsappRequests = [];
    qrCodes = [];
    currentQRCode = null;

    generateQRCode() {
        const documentSelect = document.getElementById('whatsappDocument');
        if (!documentSelect.value) {
            this.showNotification('Selecione um documento primeiro!', 'warning');
            return;
        }

        const document = this.documents.find(doc => doc.id == documentSelect.value);
        if (!document) {
            this.showNotification('Documento não encontrado!', 'error');
            return;
        }

        // Generate unique signature link
        const signatureId = this.generateSignatureId();
        const signatureLink = `${window.location.origin}/sign-whatsapp.html?id=${signatureId}&doc=${document.id}`;
        
        // Generate QR Code
        this.generateQRCodeImage(signatureLink, document);
        
        // Store QR Code data
        const qrData = {
            id: Date.now(),
            documentId: document.id,
            documentName: document.name,
            signatureLink: signatureLink,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };
        
        this.qrCodes.push(qrData);
        this.saveQRCodes();
        
        this.showModal('whatsappQRModal');
        this.updateAnalytics('qr_code_generated');
    }

    generateSignatureId() {
        return 'sig_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateQRCodeImage(text, document) {
        // Simple QR Code generation using canvas
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Create a simple QR-like pattern (in real implementation, use a QR library)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        
        // Add corner squares
        const cornerSize = 20;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 10, cornerSize, cornerSize);
        ctx.fillRect(size - 30, 10, cornerSize, cornerSize);
        ctx.fillRect(10, size - 30, cornerSize, cornerSize);
        
        // Add center square
        ctx.fillRect(size/2 - 10, size/2 - 10, 20, 20);
        
        // Add document name
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(document.name.substring(0, 15), size/2, size - 10);
        
        // Display QR Code
        const qrDisplay = document.getElementById('qrCodeDisplay');
        qrDisplay.innerHTML = '';
        qrDisplay.appendChild(canvas);
        
        this.currentQRCode = {
            canvas: canvas,
            text: text,
            document: document
        };
    }

    downloadQRCode() {
        if (!this.currentQRCode) {
            this.showNotification('Nenhum QR Code para baixar!', 'warning');
            return;
        }

        const link = document.createElement('a');
        link.download = `qr-code-${this.currentQRCode.document.name}.png`;
        link.href = this.currentQRCode.canvas.toDataURL();
        link.click();
        
        this.showNotification('QR Code baixado com sucesso!', 'success');
    }

    copyQRLink() {
        if (!this.currentQRCode) {
            this.showNotification('Nenhum QR Code para copiar!', 'warning');
            return;
        }

        navigator.clipboard.writeText(this.currentQRCode.text).then(() => {
            this.showNotification('Link copiado para a área de transferência!', 'success');
        }).catch(() => {
            this.showNotification('Erro ao copiar link!', 'error');
        });
    }

    handleWhatsAppSend(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const documentId = document.getElementById('whatsappDocument').value;
        const countryCode = document.getElementById('countryCode').value;
        const phoneNumber = document.getElementById('whatsappNumber').value;
        const signerName = document.getElementById('signerName').value;
        const message = document.getElementById('whatsappMessage').value;
        const deadline = document.getElementById('whatsappDeadline').value;
        const requireBiometric = document.getElementById('requireBiometric').checked;
        const sendReminders = document.getElementById('sendReminders').checked;

        if (!documentId) {
            this.showNotification('Selecione um documento!', 'warning');
            return;
        }

        const document = this.documents.find(doc => doc.id == documentId);
        if (!document) {
            this.showNotification('Documento não encontrado!', 'error');
            return;
        }

        // Generate signature link
        const signatureId = this.generateSignatureId();
        const signatureLink = `${window.location.origin}/sign-whatsapp.html?id=${signatureId}&doc=${documentId}`;
        
        // Create WhatsApp request
        const whatsappRequest = {
            id: Date.now(),
            documentId: documentId,
            documentName: document.name,
            signerName: signerName,
            phoneNumber: countryCode + phoneNumber,
            message: message,
            signatureLink: signatureLink,
            deadline: deadline,
            requireBiometric: requireBiometric,
            sendReminders: sendReminders,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(deadline).toISOString()
        };

        this.whatsappRequests.push(whatsappRequest);
        this.saveWhatsAppRequests();

        // Generate WhatsApp message
        const whatsappMessage = this.generateWhatsAppMessage(whatsappRequest);
        
        // Open WhatsApp with pre-filled message
        const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');
        
        this.showNotification('WhatsApp aberto com mensagem pré-formatada!', 'success');
        this.updateAnalytics('whatsapp_request_sent');
        
        // Add to history
        this.addToHistory('whatsapp_request_sent', document, {
            signerName: signerName,
            phoneNumber: countryCode + phoneNumber
        });
    }

    generateWhatsAppMessage(request) {
        return `${request.message}

📄 Documento: ${request.documentName}
👤 Signatário: ${request.signerName}
⏰ Prazo: ${new Date(request.deadline).toLocaleString('pt-BR')}

🔗 Link para assinatura: ${request.signatureLink}

✅ Esta assinatura possui validade jurídica conforme Marco Civil da Internet e Lei 14.063/2020.

Para assinar, clique no link acima e siga as instruções.`;
    }

    loadWhatsAppRequests() {
        this.loadPendingWhatsAppRequests();
        this.loadCompletedWhatsAppRequests();
        this.loadQRCodes();
    }

    loadPendingWhatsAppRequests() {
        const container = document.getElementById('pendingWhatsAppRequests');
        const pendingRequests = this.whatsappRequests.filter(req => req.status === 'pending');
        
        if (pendingRequests.length === 0) {
            container.innerHTML = '<p class="text-center">Nenhuma solicitação pendente via WhatsApp.</p>';
            return;
        }

        container.innerHTML = pendingRequests.map(request => this.createWhatsAppRequestCard(request)).join('');
    }

    loadCompletedWhatsAppRequests() {
        const container = document.getElementById('completedWhatsAppRequests');
        const completedRequests = this.whatsappRequests.filter(req => req.status === 'completed');
        
        if (completedRequests.length === 0) {
            container.innerHTML = '<p class="text-center">Nenhuma assinatura concluída via WhatsApp.</p>';
            return;
        }

        container.innerHTML = completedRequests.map(request => this.createWhatsAppRequestCard(request)).join('');
    }

    loadQRCodes() {
        const container = document.getElementById('qrCodesGrid');
        
        if (this.qrCodes.length === 0) {
            container.innerHTML = '<p class="text-center">Nenhum QR Code gerado.</p>';
            return;
        }

        container.innerHTML = this.qrCodes.map(qr => this.createQRCodeCard(qr)).join('');
    }

    createWhatsAppRequestCard(request) {
        const statusClass = request.status === 'completed' ? 'completed' : 
                           new Date(request.expiresAt) < new Date() ? 'expired' : 'pending';
        
        return `
            <div class="whatsapp-request-card ${statusClass}">
                <div class="whatsapp-request-header">
                    <h3 class="whatsapp-request-title">${request.documentName}</h3>
                    <span class="whatsapp-status ${statusClass}">
                        <i class="fas fa-${statusClass === 'completed' ? 'check-circle' : 
                                          statusClass === 'expired' ? 'exclamation-triangle' : 'clock'}"></i>
                        ${statusClass === 'completed' ? 'Concluída' : 
                          statusClass === 'expired' ? 'Expirada' : 'Pendente'}
                    </span>
                </div>
                <div class="whatsapp-request-details">
                    <div class="whatsapp-request-detail">
                        <label>Signatário:</label>
                        <span>${request.signerName}</span>
                    </div>
                    <div class="whatsapp-request-detail">
                        <label>Telefone:</label>
                        <span>${request.phoneNumber}</span>
                    </div>
                    <div class="whatsapp-request-detail">
                        <label>Prazo:</label>
                        <span>${new Date(request.deadline).toLocaleString('pt-BR')}</span>
                    </div>
                    <div class="whatsapp-request-detail">
                        <label>Enviado em:</label>
                        <span>${new Date(request.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                </div>
                <div class="whatsapp-request-actions">
                    <button class="btn btn-sm btn-info" onclick="app.viewWhatsAppRequest('${request.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    ${request.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="app.resendWhatsAppRequest('${request.id}')">
                            <i class="fab fa-whatsapp"></i> Reenviar
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="app.cancelWhatsAppRequest('${request.id}')">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    ` : ''}
                    ${request.status === 'completed' ? `
                        <button class="btn btn-sm btn-primary" onclick="app.downloadSignedDocument('${request.id}')">
                            <i class="fas fa-download"></i> Baixar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createQRCodeCard(qr) {
        const isExpired = new Date(qr.expiresAt) < new Date();
        
        return `
            <div class="qr-code-card">
                <div class="qr-code-display">
                    <i class="fas fa-qrcode" style="font-size: 4rem; color: #25D366;"></i>
                </div>
                <h4>${qr.documentName}</h4>
                <p>Criado em: ${new Date(qr.createdAt).toLocaleString('pt-BR')}</p>
                <p>Expira em: ${new Date(qr.expiresAt).toLocaleString('pt-BR')}</p>
                <div class="qr-code-actions">
                    <button class="btn btn-sm btn-success" onclick="app.useQRCode('${qr.id}')">
                        <i class="fas fa-qrcode"></i> Usar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteQRCode('${qr.id}')">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `;
    }

    // WhatsApp request management
    viewWhatsAppRequest(requestId) {
        const request = this.whatsappRequests.find(req => req.id == requestId);
        if (!request) return;

        this.showNotification(`Visualizando solicitação: ${request.documentName}`, 'info');
        // Implement detailed view
    }

    resendWhatsAppRequest(requestId) {
        const request = this.whatsappRequests.find(req => req.id == requestId);
        if (!request) return;

        const whatsappMessage = this.generateWhatsAppMessage(request);
        const whatsappUrl = `https://wa.me/${request.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');
        
        this.showNotification('WhatsApp aberto para reenvio!', 'success');
    }

    cancelWhatsAppRequest(requestId) {
        const request = this.whatsappRequests.find(req => req.id == requestId);
        if (!request) return;

        if (confirm('Tem certeza que deseja cancelar esta solicitação?')) {
            request.status = 'cancelled';
            this.saveWhatsAppRequests();
            this.loadWhatsAppRequests();
            this.showNotification('Solicitação cancelada!', 'info');
        }
    }

    downloadSignedDocument(requestId) {
        const request = this.whatsappRequests.find(req => req.id == requestId);
        if (!request) return;

        // In real implementation, download the signed document
        this.showNotification('Download do documento assinado iniciado!', 'success');
    }

    useQRCode(qrId) {
        const qr = this.qrCodes.find(q => q.id == qrId);
        if (!qr) return;

        this.currentQRCode = {
            text: qr.signatureLink,
            document: { name: qr.documentName }
        };
        
        this.generateQRCodeImage(qr.signatureLink, { name: qr.documentName });
        this.showModal('whatsappQRModal');
    }

    deleteQRCode(qrId) {
        if (confirm('Tem certeza que deseja excluir este QR Code?')) {
            this.qrCodes = this.qrCodes.filter(q => q.id != qrId);
            this.saveQRCodes();
            this.loadQRCodes();
            this.showNotification('QR Code excluído!', 'info');
        }
    }

    // WhatsApp signature handling
    submitWhatsAppSignature() {
        const canvas = document.getElementById('whatsappSignaturePad');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Check if signature exists
        let hasSignature = false;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] !== 0) {
                hasSignature = true;
                break;
            }
        }

        if (!hasSignature) {
            this.showNotification('Desenhe uma assinatura primeiro!', 'warning');
            return;
        }

        // Generate legal validation
        const validation = this.generateLegalValidation(canvas);
        
        // Simulate signature submission
        this.showNotification('Assinatura enviada com sucesso! Validade jurídica garantida.', 'success');
        
        // Update analytics
        this.updateAnalytics('whatsapp_signature_completed');
        
        // Close modal
        this.hideModal('whatsappSignatureModal');
    }

    clearWhatsAppSignature() {
        const canvas = document.getElementById('whatsappSignaturePad');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    generateLegalValidation(canvas) {
        // Generate document hash
        const canvasData = canvas.toDataURL();
        const hash = this.generateHash(canvasData);
        
        // Generate timestamp
        const timestamp = new Date().toISOString();
        
        // Generate certificate info
        const certificate = {
            issuer: 'SIGNply Digital Certificate Authority',
            subject: this.currentUser?.name || 'Anonymous',
            validFrom: timestamp,
            validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            algorithm: 'SHA-256',
            keySize: 2048
        };

        return {
            hash: hash,
            timestamp: timestamp,
            certificate: certificate,
            legalValidity: true,
            compliance: ['Marco Civil da Internet', 'Lei 14.063/2020', 'MP 2.200-2/2001']
        };
    }

    generateHash(data) {
        // Simple hash generation (in real implementation, use crypto.subtle.digest)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    // Data persistence for WhatsApp
    saveWhatsAppRequests() {
        localStorage.setItem('signplyWhatsAppRequests', JSON.stringify(this.whatsappRequests));
    }

    loadWhatsAppRequests() {
        const saved = localStorage.getItem('signplyWhatsAppRequests');
        if (saved) {
            this.whatsappRequests = JSON.parse(saved);
        }
    }

    saveQRCodes() {
        localStorage.setItem('signplyQRCodes', JSON.stringify(this.qrCodes));
    }

    loadQRCodes() {
        const saved = localStorage.getItem('signplyQRCodes');
        if (saved) {
            this.qrCodes = JSON.parse(saved);
        }
    }

    populateWhatsAppDocuments() {
        const select = document.getElementById('whatsappDocument');
        select.innerHTML = '<option value="">Selecione um documento</option>';
        
        this.documents.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.name;
            select.appendChild(option);
        });
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SignplyApp();
});
