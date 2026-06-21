class DashboardApp {
    constructor() {
        this.rawData = [];
        this.userRole = null; // 'admin' or 'manager'

        // --- FIREBASE CONFIGURATION ---
        const firebaseConfig = {
            apiKey: "AIzaSyCqp3VVPDZ1H5qoEjYMY_z8hFWfzbsSfe8",
            authDomain: "mm-relevamiento-digital.firebaseapp.com",
            projectId: "mm-relevamiento-digital",
            storageBucket: "mm-relevamiento-digital.firebasestorage.app",
            messagingSenderId: "370217592529",
            appId: "1:370217592529:web:d50c2c3eca8cdf3c25c7f0",
            measurementId: "G-VX9NXTWFS4"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        this.auth = firebase.auth();

        this.initAuth();
    }

    initAuth() {
        const loginBtn = document.getElementById('btn-google-login');
        const loginOverlay = document.getElementById('login-overlay');
        const errorMsg = document.getElementById('login-error');

        loginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            this.auth.signInWithPopup(provider).catch(error => {
                console.error("Login Error:", error);
                errorMsg.innerText = "Error al iniciar sesión: " + error.message;
                errorMsg.style.display = 'block';
            });
        });

        this.auth.onAuthStateChanged(user => {
            if (user) {
                // Check Access
                const email = user.email.toLowerCase();
                if (email === 'vegendigital@gmail.com') {
                    this.userRole = 'admin';
                } else if (email === 'gerencia@mercadomaravillas.com') {
                    this.userRole = 'manager';
                } else {
                    // Unauthorized
                    this.auth.signOut();
                    errorMsg.innerText = "Acceso denegado: Este correo no tiene permisos.";
                    errorMsg.style.display = 'block';
                    return;
                }

                // Authorized
                loginOverlay.style.display = 'none';

                // Update UI User info
                const userInfoSpan = document.querySelector('.user-info-span');
                if (userInfoSpan) userInfoSpan.innerText = email === 'vegendigital@gmail.com' ? 'Admin Vegen' : 'Gerencia Maravillas';

                this.initDashboard();
            } else {
                // Not logged in
                loginOverlay.style.display = 'flex';
            }
        });

        // Logout binding
        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
        }
    }

    initDashboard() {
        const dateSpan = document.getElementById('current-date');
        const updateDate = () => {
            const now = new Date();
            dateSpan.innerText = now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
        };
        updateDate();

        const btnPdf = document.getElementById('btn-download-pdf');
        if (btnPdf) {
            btnPdf.addEventListener('click', () => {
                window.print();
            });
        }

        document.getElementById('btn-refresh').addEventListener('click', () => {
            updateDate();
            if (this.userRole === 'admin') this.fetchDataAndRender();
        });

        this.setupNavigation();
        this.applyRoleRestrictions();

        if (this.userRole === 'admin') {
            this.fetchDataAndRender();
        } else {
            // Manager gets ONLY mock data via frontend rules (backend will also block real data just in case)
            this.rawData = [];
            this.processMetrics();
            this.processDetailedCounts();
            this.renderCharts();
            this.populateTables();
            this.renderDetalles();
            this.renderOportunidades();
        }
    }

    applyRoleRestrictions() {
        // Manager cannot see the "Oportunidades de Venta" table
        if (this.userRole === 'manager') {
            const crucesView = document.getElementById('view-cruces');
            if (crucesView) {
                const headers = crucesView.querySelectorAll('h3');
                headers.forEach(h3 => {
                    if (h3.innerText.includes('Oportunidades')) {
                        h3.parentElement.style.display = 'none';
                    }
                });
            }
            // También ocultamos "Detalle Respuestas" para gerencia
            const detalleNav = document.querySelector('a[data-target="detalle"]');
            if (detalleNav) detalleNav.style.display = 'none';
        }
    }

    async fetchDataAndRender() {
        try {
            // Get the current user's Firebase ID token
            const user = this.auth.currentUser;
            if (!user) throw new Error("No hay usuario autenticado.");

            const idToken = await user.getIdToken(true);

            // Fetch data securely, passing the token in the headers
            const response = await fetch('api/get_metrics.php', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + idToken,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error("Acceso denegado por el servidor.");
                }
                throw new Error("Error en la solicitud al servidor.");
            }

            const res = await response.json();

            // DEPENDIENDO CÓMO ESTÉ TU db.php Y get_metrics.php:
            // Si devuelve { status: 'success', data: [...] } usaremos res.data
            // Si devuelve directamente el array [...], usaremos res.
            const arrData = res.data ? res.data : (Array.isArray(res) ? res : []);

            if (arrData.length > 0) {
                this.rawData = arrData;
                this.processMetrics();
                this.processDetailedCounts();
                this.renderCharts();
                this.populateTables();
                this.renderDetalles();
                this.renderOportunidades();
            } else {
                // Fallback to mock data if empty
                this.rawData = [];
                this.renderCharts();
                this.populateTables();
                this.renderDetalles();
                this.renderOportunidades();
            }
        } catch (err) {
            console.error("Error fetching secure data:", err);
            this.rawData = [];
            this.renderCharts();
            this.populateTables();
            this.renderDetalles();
            this.renderOportunidades();

            if (err.message && err.message.includes("Acceso denegado")) {
                alert("El servidor ha rechazado su acceso. Por favor, inicie sesión nuevamente.");
            }
        }
    }

    processMetrics() {
        if (!this.rawData || this.rawData.length === 0) return;

        // Variables for charts
        this.realData = {
            redes: { instagram: 0, facebook: 0, tiktok: 0, google: 0, ninguna: 0 },
            presupuesto: { nada: 0, menos100: 0, de100a300: 0, mas300: 0 },
            delivery: { glovo: 0, ubereats: 0, justeat: 0, whatsapp: 0, no: 0 },
            ia: { textos: 0, bots: 0, recetas: 0, analisis: 0, no: 0 },
            ranking: []
        };

        let totalComercios = this.rawData.length;

        // Actualizar KPIs globales en UI
        const kpis = document.querySelectorAll('.kpi-value');
        if (kpis.length >= 1) kpis[0].innerText = totalComercios;

        // KPI Bloques: Web, GBP, TPV
        let countWeb = 0, countGbp = 0, countTpv = 0;

        this.rawData.forEach(comercio => {
            // Por si el db.php devuelve {respuestas_json: '{"nombre":"..."}'} o lo devuelve ya parseado
            let j = {};
            if (typeof comercio.respuestas_json === 'string') {
                try { j = JSON.parse(comercio.respuestas_json); } catch(e){}
            } else if (typeof comercio.respuestas_json === 'object') {
                j = comercio.respuestas_json;
            } else {
                j = comercio; // fallback si json está desparramado
            }

            // Redes Sociales -> from HTML <input name="redes" type="checkbox">
            const redes = j.redes || [];
            if (Array.isArray(redes)) {
                if (redes.includes("Instagram")) this.realData.redes.instagram++;
                if (redes.includes("Facebook")) this.realData.redes.facebook++;
                if (redes.includes("TikTok")) this.realData.redes.tiktok++;
                if (redes.includes("Ninguna")) this.realData.redes.ninguna++;
            }

            // Google Maps -> <input name="google_maps" type="radio">
            const gmaps = j.google_maps || "";
            if (gmaps.includes("optimizado") || gmaps.includes("abandonado") || gmaps.includes("Si") || gmaps.includes("Sí")) {
                this.realData.redes.google++;
                countGbp++; // Block KPI
            }

            // Presupuesto -> <input name="presupuesto_ads" type="radio">
            const p = j.presupuesto_ads || "";
            if (p === "0" || p === "Nada") this.realData.presupuesto.nada++;
            else if (p === "Menos de 100€" || p.includes("<100")) this.realData.presupuesto.menos100++;
            else if (p === "100-300€" || p.includes("100-300")) this.realData.presupuesto.de100a300++;
            else if (p === "Mas de 300€" || p.includes(">300") || p.includes("Mas de")) this.realData.presupuesto.mas300++;

            // Delivery -> <input name="delivery_apps" type="checkbox">
            const d = j.delivery_apps || [];
            if (Array.isArray(d)) {
                if (d.includes("Glovo")) this.realData.delivery.glovo++;
                if (d.includes("Uber Eats")) this.realData.delivery.ubereats++;
                if (d.includes("Just Eat")) this.realData.delivery.justeat++;
                if (d.includes("Ninguna")) this.realData.delivery.no++;
            }

            // WhatsApp -> <input name="whatsapp_pedidos" type="radio">
            const wa = j.whatsapp_pedidos || "";
            if (wa.includes("Si") || wa.includes("Sí")) this.realData.delivery.whatsapp++;

            // IA -> <input name="uso_ia" type="radio">
            const iaUse = j.uso_ia || "";
            if (iaUse.includes("No") || iaUse.includes("Se que es")) {
                this.realData.ia.no++;
            } else if (iaUse.includes("Si") || iaUse.includes("Sí") || iaUse.includes("Alguna")) {
                // To fill radar chart since specific utilities checkboxes might be skipped if only "uso_ia" is given
                const utils = j.utilidad_ia || [];
                if (Array.isArray(utils)) {
                    if (utils.includes("Textos redes sociales")) this.realData.ia.textos++;
                    if (utils.includes("Atencion al cliente (Bots)")) this.realData.ia.bots++;
                    if (utils.includes("Ideas de recetas/productos")) this.realData.ia.recetas++;
                    if (utils.includes("Analisis de ventas")) this.realData.ia.analisis++;
                } else {
                    // Just infer if they use it but didn't select utils
                     this.realData.ia.textos++;
                     this.realData.ia.recetas++;
                }
            }

            // Blocks KPIs Web & TPV
            if (j.sitio_web && (j.sitio_web.includes("Si") || j.sitio_web.includes("Sí") || j.sitio_web.includes("desarrollo"))) countWeb++;
            if (j.tpv && (j.tpv.includes("TPV") || j.tpv.includes("inteligente"))) countTpv++; // TPV Básico o Inteligente

            // Ranking simple
            let score = 0;
            if (j.sitio_web && (j.sitio_web.includes("Si") || j.sitio_web.includes("Sí"))) score += 20;
            if (gmaps.includes("Si") || gmaps.includes("Sí") || gmaps.includes("optimizado")) score += 20;
            if (Array.isArray(redes) && redes.length > 0 && !redes.includes("Ninguna")) score += 20;
            if (wa.includes("Si") || wa.includes("Sí")) score += 20;
            if (j.tpv && j.tpv.includes("TPV Inteligente")) score += 20;

            let estado = 'Crítico';
            if (score >= 80) estado = 'Líder';
            else if (score >= 60) estado = 'Avanzado';
            else if (score >= 40) estado = 'Intermedio';
            else if (score >= 20) estado = 'Rezagado';

            this.realData.ranking.push({
                nombre: comercio.nombre_puesto || j.nombre_puesto || 'Comercio sin nombre',
                categoria: comercio.categoria || j.categoria || 'Sin categoría',
                indice: score + '%',
                estado: estado
            });
        });

        // Set Blocks KPIs
        const elWeb = document.getElementById('kpi-web');
        const elGbp = document.getElementById('kpi-gbp');
        const elTpv = document.getElementById('kpi-tpv');
        if (elWeb) elWeb.innerText = totalComercios > 0 ? Math.round((countWeb/totalComercios)*100) + '%' : '0%';
        if (elGbp) elGbp.innerText = totalComercios > 0 ? Math.round((countGbp/totalComercios)*100) + '%' : '0%';
        if (elTpv) elTpv.innerText = totalComercios > 0 ? Math.round((countTpv/totalComercios)*100) + '%' : '0%';

        // Calculate Percentages for Redes and IA (to match mockup visual style)
        this.realData.redesPct = {
            instagram: Math.round((this.realData.redes.instagram / totalComercios) * 100) || 0,
            facebook: Math.round((this.realData.redes.facebook / totalComercios) * 100) || 0,
            tiktok: Math.round((this.realData.redes.tiktok / totalComercios) * 100) || 0,
            google: Math.round((this.realData.redes.google / totalComercios) * 100) || 0,
            ninguna: Math.round((this.realData.redes.ninguna / totalComercios) * 100) || 0
        };
    }

    processDetailedCounts() {
        if (!this.rawData || this.rawData.length === 0) return;

        this.allCounts = {};

        // Define human-readable titles for questions (41 keys based on the exact index.html you provided)
        this.questionTitles = {
            "nombre_puesto": "01 Nombre del puesto / negocio",
            "numero_puesto": "02 Número o ubicación del puesto",
            "categoria": "03 Categoría del negocio",
            "nombre_contacto": "04 Nombre y apellidos",
            "rol_contacto": "05 Rol en el negocio",
            "telefono": "06 Teléfono móvil",
            "email": "07 Correo electrónico",
            "sitio_web": "08 ¿Tiene sitio web propio?",
            "sitio_web_url": "08b URL del sitio web",
            "google_maps": "09 ¿Tiene perfil en Google Maps?",
            "google_maps_url": "09b URL Google Maps",
            "resenas": "10 ¿Recibe reseñas de clientes?",
            "directorios": "11 ¿Aparece en otros directorios?",
            "cuales_directorios": "11b ¿Cuáles directorios?",
            "redes": "12 ¿En qué redes sociales tiene presencia?",
            "frecuencia_redes": "13 ¿Frecuencia de publicación en redes?",
            "responsable_redes": "14 ¿Quién se encarga de las redes sociales?",
            "tipo_contenido": "15 ¿Qué tipo de contenido suele publicar?",
            "calidad_fotos": "16 ¿Cómo realiza sus fotos o vídeos?",
            "meta_ads": "17 ¿Ha realizado campañas en Meta Ads?",
            "google_ads": "18 ¿Ha realizado campañas en Meta Ads?",
            "presupuesto_ads": "19 ¿Presupuesto mensual a publicidad?",
            "mide_roi": "20 ¿Mide el retorno de su inversión (ROI)?",
            "email_mkting": "21 ¿Envía correos electrónicos?",
            "delivery_apps": "22 ¿Vende a través de app de delivery?",
            "cual_delivery": "22b ¿Cuál app de delivery?",
            "ventas_online_pct": "23 ¿Porcentaje de ventas online?",
            "whatsapp_pedidos": "24 ¿Toma pedidos a través de WhatsApp?",
            "plataforma_ecommerce": "25 ¿Plataforma de e-commerce?",
            "click_collect": "26 ¿Ofrece opciones de Click & Collect?",
            "tpv": "27 ¿Qué tipo de sistema TPV utiliza?",
            "gestion_inventario": "28 ¿Gestión su inventario y compras?",
            "informatizada_conta": "29 ¿Tiene informatizada la facturación?",
            "pago_digital": "30 ¿Opciones de pago digital?",
            "cuales_pagos": "30b ¿Cuáles otros pagos?",
            "crm": "31 ¿Cuenta con un sistema CRM?",
            "comunicacion_interna": "32 ¿Herramientas de comunicación interna?",
            "uso_ia": "33 ¿Utiliza Inteligencia Artificial?",
            "utilidad_ia": "34 ¿Utilidad de la IA?",
            "revisa_metricas": "35 ¿Revisa estadísticas o métricas?",
            "importancia_online": "36 Importancia del posicionamiento online (1-10)",
            "obstaculos": "37 Mayor obstáculo para su presencia digital",
            "cual_obstaculo": "37b ¿Cuál otro obstáculo?",
            "contrato_mkting": "38 ¿Ha contratado servicios de marketing?",
            "cuales_servicios_mkting": "38b ¿Cuáles servicios de marketing?",
            "programa_colectivo": "39 ¿Participar en un programa colectivo?",
            "servicio_prioritario": "40 Servicio de mayor valor inmediato",
            "comentarios": "41 Comentarios adicionales"
        };

        this.rawData.forEach(comercio => {
            let j = {};
            if (typeof comercio.respuestas_json === 'string') {
                try { j = JSON.parse(comercio.respuestas_json); } catch(e){}
            } else if (typeof comercio.respuestas_json === 'object') {
                j = comercio.respuestas_json;
            } else {
                j = comercio;
            }

            // Fusionamos posibles campos que vienen fuera del JSON (como nombre, tel)
            const dataRow = { ...comercio, ...j };

            for (const key in this.questionTitles) {
                if (!this.allCounts[key]) this.allCounts[key] = {};

                const answer = dataRow[key];

                if (Array.isArray(answer)) {
                    if (answer.length === 0) {
                        this.allCounts[key]['Sin respuesta'] = (this.allCounts[key]['Sin respuesta'] || 0) + 1;
                    } else {
                        answer.forEach(val => {
                            this.allCounts[key][val] = (this.allCounts[key][val] || 0) + 1;
                        });
                    }
                } else {
                    const cleanAnswer = answer ? answer.toString().trim() : 'Sin respuesta';
                    this.allCounts[key][cleanAnswer] = (this.allCounts[key][cleanAnswer] || 0) + 1;
                }
            }
        });
    }

    renderDetalles() {
        const tbody = document.getElementById('detalle-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!this.allCounts) return;
        const total = this.rawData.length;

        for (const [key, counts] of Object.entries(this.allCounts)) {
            let optionsHtml = '';

            // Si son campos de texto libre (nombres, tels, urls), mostramos la lista literal
            const isTextList = ["nombre_puesto", "numero_puesto", "nombre_contacto", "telefono", "email", "sitio_web_url", "google_maps_url", "cuales_directorios", "cual_delivery", "cuales_pagos", "cual_obstaculo", "cuales_servicios_mkting", "comentarios"].includes(key);

            if (isTextList) {
                let allVals = [];
                for (let ans in counts) {
                    if (ans === '' || ans === 'Sin respuesta') continue;
                    allVals.push(`<span>${this.escapeHTML(ans)}</span>`);
                }
                optionsHtml = allVals.join(", ");
                if (optionsHtml === '') optionsHtml = '<span style="color:#aaa; font-style:italic;">Sin datos válidos</span>';
            } else {
                for (const [ans, count] of Object.entries(counts)) {
                    if (ans === '' || ans === 'Sin respuesta') continue;
                    const pct = Math.round((count / total) * 100);
                    optionsHtml += `<span class="badge" style="background: #f1f1f1; color: #333; margin-right: 5px; margin-bottom: 5px; display: inline-block; border: 1px solid #ccc;">${this.escapeHTML(ans)}: <strong>${count} (${pct}%)</strong></span>`;
                }
                if (optionsHtml === '') optionsHtml = '<span style="color:#aaa; font-style:italic;">Sin datos válidos</span>';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; width: 35%;">${this.escapeHTML(this.questionTitles[key])}</td>
                <td>${optionsHtml}</td>
            `;
            tbody.appendChild(tr);
        }
    }

    renderOportunidades() {
        const tbody = document.getElementById('oportunidades-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!this.rawData || this.rawData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay datos reales.</td></tr>';
            return;
        }

        this.rawData.forEach(c => {
            let j = {};
            if (typeof c.respuestas_json === 'string') {
                try { j = JSON.parse(c.respuestas_json); } catch(e){}
            } else if (typeof c.respuestas_json === 'object') {
                j = c.respuestas_json;
            } else {
                j = c;
            }

            const nombre = c.nombre_puesto || j.nombre_puesto || 'Sin Nombre';
            const tel = c.telefono || j.telefono || '';
            const inv = j.presupuesto_ads || 'Desconocida';

            let falta = 'Ninguna grave';
            let accion = 'Mantenimiento';
            let whatsappUrl = '#';

            if (tel) {
                let cleanTel = tel.replace(/[^0-9+]/g, '');
                if (cleanTel.length === 9) cleanTel = '+34' + cleanTel;

                let msj = `Hola, somos de Vegen Digital. Estuvimos viendo los resultados del relevamiento del Mercado Maravillas y notamos que `;

                const gmaps = j.google_maps || "";
                const ia = j.uso_ia || "";
                const web = j.sitio_web || "";

                if (gmaps.includes("No") || gmaps.includes("abandonado") || gmaps.includes("No se")) {
                    falta = "Sin Google Maps / Abandonado";
                    accion = "Ofrecer Local SEO";
                    msj += `podrías aprovechar mucho más tu presencia en Google Maps. ¡Nos encantaría ayudarte a captar más clientes locales!`;
                } else if (ia.includes("No") || ia.includes("Se que es")) {
                    falta = "Sin IA";
                    accion = "Ofrecer Capacitación/Bots";
                    msj += `podrías optimizar mucho tu tiempo usando herramientas de Inteligencia Artificial. ¡Queremos asesorarte!`;
                } else if (web.includes("No") || web === "No") {
                    falta = "Sin Web";
                    accion = "Ofrecer Desarrollo Web";
                    msj += `aún no cuentas con página web. ¡Podemos crear tu escaparate digital!`;
                } else {
                    falta = "Mejora General";
                    accion = "Revisión Estratégica";
                    msj += `estás haciendo un gran trabajo, pero siempre se puede mejorar. ¿Hablamos?`;
                }

                whatsappUrl = `https://wa.me/${cleanTel.replace('+', '')}?text=${encodeURIComponent(msj)}`;
            } else {
                falta = "Sin Teléfono";
                accion = "Visitar Presencial";
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${this.escapeHTML(nombre)}</strong></td>
                <td style="color: #ff5a5a;">${falta}</td>
                <td>${this.escapeHTML(inv)}</td>
                <td><span class="badge" style="background:#333; color:#fff;">${accion}</span></td>
                <td>
                    ${tel ? `<a href="${whatsappUrl}" target="_blank" class="btn-wa"><i class="fab fa-whatsapp"></i> Enviar Propuesta</a>` : '<span style="color:#888; font-size:12px;">No hay móvil</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.getAttribute('data-target');

                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                document.querySelectorAll('.dashboard-view').forEach(v => v.classList.add('hidden'));
                const view = document.getElementById(`view-${target}`);
                if (view) view.classList.remove('hidden');

                document.getElementById('page-title').innerText = item.innerText;
            });
        });
    }


    renderCharts() {
        Chart.defaults.color = '#888';
        Chart.defaults.borderColor = '#2f2f2f';

        const dataExists = this.realData !== undefined && this.rawData && this.rawData.length > 0;

        // Limpiar canvas antiguos si existen para evitar solapamiento (Chart.js glitch)
        let chartInstances = Chart.instances;
        for (let key in chartInstances) {
            chartInstances[key].destroy();
        }

        // 1. Evolución de Respuestas (Línea)
        const ctxRespuestas = document.getElementById('chartRespuestas');
        if (ctxRespuestas) {
            new Chart(ctxRespuestas, {
                type: 'line',
                data: {
                    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
                    datasets: [{
                        label: 'Nuevas Respuestas',
                        data: dataExists ? [0, 0, 0, this.rawData.length] : [5, 12, 15, 10],
                        borderColor: '#00C27C',
                        backgroundColor: 'rgba(0,194,124,0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { maintainAspectRatio: false,  responsive: true }
            });
        }

        // 2. Uso de Redes Sociales (Barras horizontales)
        const ctxRedes = document.getElementById('chartRedes');
        if (ctxRedes) {
            new Chart(ctxRedes, {
                type: 'bar',
                data: {
                    labels: ['Instagram', 'Facebook', 'TikTok', 'Google Bus.', 'Ninguna'],
                    datasets: [{
                        label: '% de Uso',
                        data: dataExists ? [
                            this.realData.redesPct.instagram,
                            this.realData.redesPct.facebook,
                            this.realData.redesPct.tiktok,
                            this.realData.redesPct.google,
                            this.realData.redesPct.ninguna
                        ] : [85, 70, 25, 60, 10],
                        backgroundColor: ['#E1306C', '#1877F2', '#000000', '#EA4335', '#555']
                    }]
                },
                options: { maintainAspectRatio: false,  indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
            });
        }

        // 3. Presupuesto Marketing (Doughnut)
        const ctxPresupuesto = document.getElementById('chartPresupuesto');
        if (ctxPresupuesto) {
            new Chart(ctxPresupuesto, {
                type: 'doughnut',
                data: {
                    labels: ['0€ (Nada)', '< 100€', '100 - 300€', '> 300€'],
                    datasets: [{
                        data: dataExists ? [
                            this.realData.presupuesto.nada,
                            this.realData.presupuesto.menos100,
                            this.realData.presupuesto.de100a300,
                            this.realData.presupuesto.mas300
                        ] : [50, 25, 15, 10],
                        backgroundColor: ['#ff5a5a', '#ffb74d', '#4fc3f7', '#00C27C'],
                        borderWidth: 0
                    }]
                },
                options: { maintainAspectRatio: false,  responsive: true, cutout: '70%' }
            });
        }

        // 4. Delivery (Barras)
        const ctxDelivery = document.getElementById('chartDelivery');
        if (ctxDelivery) {
            new Chart(ctxDelivery, {
                type: 'bar',
                data: {
                    labels: ['Glovo', 'Uber Eats', 'Just Eat', 'WhatsApp', 'No usan'],
                    datasets: [{
                        label: 'Comercios',
                        data: dataExists ? [
                            this.realData.delivery.glovo,
                            this.realData.delivery.ubereats,
                            this.realData.delivery.justeat,
                            this.realData.delivery.whatsapp,
                            this.realData.delivery.no
                        ] : [15, 12, 8, 25, 10],
                        backgroundColor: '#00C27C'
                    }]
                },
                options: { maintainAspectRatio: false,  responsive: true }
            });
        }

        // 5. Casos de Uso IA (Radar o Nube, simulado con Bar)
        const ctxIA = document.getElementById('chartIA');
        if (ctxIA) {
            new Chart(ctxIA, {
                type: 'polarArea',
                data: {
                    labels: ['Textos/Posts', 'Atención (Bots)', 'Recetas/Ideas', 'Análisis', 'No usan'],
                    datasets: [{
                        data: dataExists ? [
                            this.realData.ia.textos,
                            this.realData.ia.bots,
                            this.realData.ia.recetas,
                            this.realData.ia.analisis,
                            this.realData.ia.no
                        ] : [12, 5, 8, 2, 25],
                        backgroundColor: ['rgba(0,194,124,0.7)', 'rgba(79,195,247,0.7)', 'rgba(255,183,77,0.7)', 'rgba(255,90,90,0.7)', 'rgba(85,85,85,0.7)'],
                        borderWidth: 1,
                        borderColor: '#111'
                    }]
                },
                options: { maintainAspectRatio: false,  responsive: true }
            });
        }
    }

    escapeHTML(str) {
        if (!str) return '';
        return str.toString().replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    populateTables() {
        const tableRanking = document.querySelector('#table-ranking tbody');
        if (!tableRanking) return;
        tableRanking.innerHTML = '';

        const dataExists = this.realData !== undefined && this.rawData && this.rawData.length > 0;
        let dataToRender = [];

        if (dataExists && this.realData.ranking && this.realData.ranking.length > 0) {
            // Sort by score descending (score is a string like "80%")
            dataToRender = [...this.realData.ranking].sort((a, b) => {
                const aVal = parseInt(a.indice.replace('%', ''));
                const bVal = parseInt(b.indice.replace('%', ''));
                return bVal - aVal;
            });
        } else {
            // Mock Data
            dataToRender = [
                { nombre: 'Frutería La Maravilla', categoria: 'Alimentación', indice: '85%', estado: 'Líder' },
                { nombre: 'Panadería Artesanal', categoria: 'Panadería', indice: '75%', estado: 'Avanzado' },
                { nombre: 'Carnes selectas Pepe', categoria: 'Carnicería', indice: '60%', estado: 'Intermedio' },
                { nombre: 'Pescadería El Puerto', categoria: 'Pescadería', indice: '40%', estado: 'Rezagado' },
                { nombre: 'Verduras frescas', categoria: 'Alimentación', indice: '30%', estado: 'Crítico' }
            ];
        }

        dataToRender.forEach(c => {
            let badgeClass = '#00C27C';
            if(c.estado === 'Crítico' || c.estado === 'Rezagado') badgeClass = '#ff5a5a';
            if(c.estado === 'Intermedio') badgeClass = '#ffb74d';
            if(c.estado === 'Avanzado') badgeClass = '#4fc3f7';

            const row = `<tr>
                <td>${this.escapeHTML(c.nombre)}</td>
                <td>${this.escapeHTML(c.categoria)}</td>
                <td><strong>${c.indice}</strong></td>
                <td><span class="badge" style="background-color:${badgeClass}; color:#fff; padding: 4px 8px; border-radius:4px; font-size:12px;">${c.estado}</span></td>
            </tr>`;
            tableRanking.insertAdjacentHTML('beforeend', row);
        });
    }

}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardApp();
});
