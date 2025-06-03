        // URL del Google Sheets configurada automáticamente
        
        const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnOBTRyA6HThEYHCvUcSnt8Z3w541l7j0OlJ3vYOzDowGEX4gSKdRsIl24cSEhm5BaK3MYgQB5vTJu/pub?gid=0&single=true&output=csv';


        let refreshInterval;

        // Función para cargar datos automáticamente al iniciar
        async function loadInitialData() {
            try {
                await loadDataFromSheets();
                
                // Iniciar auto-refresh cada 5 minutos
                startAutoRefresh();
                
            } catch (error) {
                console.error('Error cargando datos iniciales:', error);
                showStatus('❌ Error al cargar los datos iniciales', 'error');
            }
        }

        // Función principal para cargar datos desde Google Sheets
        async function loadDataFromSheets() {
            showStatus('🔄 Cargando datos...', 'loading');
            
            try {
                const response = await fetch(SHEETS_CSV_URL);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Error al acceder a Google Sheets`);
                }
                
                const csvText = await response.text();
                const parsedData = parseCSV(csvText);
                
                if (parsedData.length === 0) {
                    throw new Error('No se encontraron datos válidos en el documento');
                }
                
                loadDataToTable(parsedData);
                showStatus(`✅ Datos cargados correctamente (${parsedData.length} registros)`, 'success');
                
            } catch (error) {
                console.error('Error:', error);
                showStatus(`❌ Error: ${error.message}`, 'error');
                
                // Mostrar tabla vacía si hay error
                showEmptyTable();
            }
        }

        // Función para parsear CSV
        function parseCSV(csvText) {
            const lines = csvText.trim().split('\n');
            const data = [];
            
            // Omitir la primera línea (headers) si existe
            const startIndex = lines[0] && (lines[0].toLowerCase().includes('periodo') || lines[0].toLowerCase().includes('fecha')) ? 1 : 0;
            
            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = parseCSVLine(line);
                
                if (values.length >= 3) {
                    data.push({
                        periodo: values[0] || '',
                        fechas: values[1] || '',
                        actGrado: values[2] || '',
                        procGrado: values[3] || '',
                        actTecnica: values[4] || ''
                    });
                }
            }
            
            return data;
        }

        // Función para parsear una línea CSV
        function parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            result.push(current.trim());
            return result;
        }

        // Función para cargar datos en la tabla
        function loadDataToTable(data) {
            const tbody = document.getElementById('calendar-tbody');
            tbody.innerHTML = '';
            
            data.forEach((item, index) => {
                const row = document.createElement('tr');
                row.className = 'table-row';
                
                // Aplicar animación de entrada
                row.style.opacity = '0';
                row.style.transform = 'translateY(20px)';
                
                row.innerHTML = `
                    <td>${item.periodo ? `<div class="period-cell">${item.periodo}</div>` : ''}</td>
                    <td class="date-cell">${item.fechas}</td>
                    <td class="activity-cell">${formatActivity(item.actGrado)}</td>
                    <td class="activity-cell">${formatActivity(item.procGrado)}</td>
                    <td class="activity-cell">${formatActivity(item.actTecnica)}</td>
                `;
                
                tbody.appendChild(row);
                
                // Animar entrada
                setTimeout(() => {
                    row.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    row.style.opacity = '1';
                    row.style.transform = 'translateY(0)';
                }, index * 50);
            });
            
            // Aplicar efectos hover
            applyTableEffects();
        }

        // Función para formatear actividades con badges
        function formatActivity(text) {
            if (!text) return '';
            
            // Detectar si es evaluaciones
            if (text.toUpperCase().includes('EVALUACIONES')) {
                return `<span class="evaluacion-badge">${text}</span>`;
            }
            
            // Dividir por separadores comunes y crear badges
            const separators = [' / ' , ', '];
            let activities = [text];
            
            separators.forEach(sep => {
                const temp = [];
                activities.forEach(activity => {
                    temp.push(...activity.split(sep));
                });
                activities = temp;
            });
            
            return activities
                .filter(activity => activity.trim())
                .map(activity => {
                    const trimmed = activity.trim();
                    if (trimmed.toUpperCase().includes('EVALUACIONES')) {
                        return `<span class="evaluacion-badge">${trimmed}</span>`;
                    } else {
                        return `<span class="activity-badge">${trimmed}</span>`;
                    }
                })
                .join(' ');
        }

        // Función para mostrar estado
        function showStatus(message, type) {
            const statusEl = document.getElementById('status-indicator');
            statusEl.className = `status-indicator ${type}`;
            
            if (type === 'loading') {
                statusEl.innerHTML = `<span class="loading-spinner"></span><span>${message}</span>`;
            } else {
                statusEl.innerHTML = `<span>${message}</span>`;
            }
            
            // Ocultar después de 5 segundos si es éxito
            if (type === 'success') {
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 3000);
            }
        }

        // Función para actualizar datos
        async function refreshData() {
            const refreshBtn = document.querySelector('.refresh-btn');
            refreshBtn.style.transform = 'rotate(360deg)';
            
            try {
                await loadDataFromSheets();
            } finally {
                setTimeout(() => {
                    refreshBtn.style.transform = 'rotate(0deg)';
                }, 500);
            }
        }

        // Función para mostrar tabla vacía en caso de error
        function showEmptyTable() {
            const tbody = document.getElementById('calendar-tbody');
            tbody.innerHTML = `
                <tr class="table-row">
                    <td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">
                        <div style="font-size: 18px; margin-bottom: 10px;">📊</div>
                        <div>No se pudieron cargar los datos desde Google Sheets</div>
                        <div style="font-size: 14px; margin-top: 10px;">
                            Haga clic en el botón de actualizar para intentar nuevamente
                        </div>
                    </td>
                </tr>
            `;
        }

        // Función para iniciar auto-refresh
        function startAutoRefresh() {
            if (refreshInterval) clearInterval(refreshInterval);
            
            refreshInterval = setInterval(() => {
                console.log('Auto-refresh ejecutándose...');
                loadDataFromSheets();
            }, 300000); // 5 minutos
        }

        // Función para aplicar efectos a la tabla
        function applyTableEffects() {
            const rows = document.querySelectorAll('.table-row');
            rows.forEach(row => {
                row.addEventListener('mouseenter', function() {
                    this.style.boxShadow = '0 5px 15px rgba(30, 60, 114, 0.1)';
                });
                
                row.addEventListener('mouseleave', function() {
                    this.style.boxShadow = 'none';
                });
            });
        }

        // Inicializar cuando se carga la página
        document.addEventListener('DOMContentLoaded', function() {
            loadInitialData();
        });

        // Limpiar interval al cerrar la página
        window.addEventListener('beforeunload', function() {
            if (refreshInterval) clearInterval(refreshInterval);
        });