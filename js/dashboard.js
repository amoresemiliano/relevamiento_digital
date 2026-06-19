class DashboardApp {
    constructor() {
        this.init();
    }

        init() {
        document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES');
        this.setupNavigation();
        this.fetchDataAndRender();
    }

    fetchDataAndRender() {
        fetch('api/get_metrics.php')
            .then(res => res.json())
            .then(res => {
                if (res.status === 'success' && res.data.length > 0) {
                    this.rawData = res.data;
                    this.processMetrics();
                    this.renderCharts();
                    this.populateTables();
                } else {
                    // Fallback to mock data if empty
                    this.rawData = [];
                    this.renderCharts();
                    this.populateTables();
                }
            })
            .catch(err => {
                console.error("Error fetching data:", err);
                // Fallback to mock data
                this.rawData = [];
                this.renderCharts();
                this.populateTables();
            });
    }

    processMetrics() {
        // Here we could calculate real indices based on this.rawData
        // For now, this placeholder ensures the charts don't break if we implement it fully later
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

        // 1. Evolución de Respuestas (Línea)
        const ctxRespuestas = document.getElementById('chartRespuestas');
        if (ctxRespuestas) {
            new Chart(ctxRespuestas, {
                type: 'line',
                data: {
                    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
                    datasets: [{
                        label: 'Nuevas Respuestas',
                        data: [5, 12, 15, 10],
                        borderColor: '#00C27C',
                        backgroundColor: 'rgba(0,194,124,0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { responsive: true }
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
                        data: [85, 70, 25, 60, 10],
                        backgroundColor: ['#E1306C', '#1877F2', '#000000', '#EA4335', '#555']
                    }]
                },
                options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
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
                        data: [50, 25, 15, 10],
                        backgroundColor: ['#ff5a5a', '#ffb74d', '#4fc3f7', '#00C27C'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, cutout: '70%' }
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
                        data: [15, 12, 8, 25, 10],
                        backgroundColor: '#00C27C'
                    }]
                },
                options: { responsive: true }
            });
        }

        // 5. Casos de Uso IA (Radar o Nube, simulado con Bar)
        const ctxIA = document.getElementById('chartIA');
        if (ctxIA) {
            new Chart(ctxIA, {
                type: 'polarArea',
                data: {
                    labels: ['Textos/Posts', 'Atención (Bots)', 'Imágenes', 'Análisis', 'No usan'],
                    datasets: [{
                        data: [12, 5, 8, 2, 25],
                        backgroundColor: ['rgba(0,194,124,0.7)', 'rgba(79,195,247,0.7)', 'rgba(255,183,77,0.7)', 'rgba(255,90,90,0.7)', 'rgba(85,85,85,0.7)'],
                        borderWidth: 1,
                        borderColor: '#111'
                    }]
                },
                options: { responsive: true }
            });
        }

        // 6. Cruces: Tamaño vs Índice
        const ctxTamano = document.getElementById('chartCrucesTamano');
        if (ctxTamano) {
            new Chart(ctxTamano, {
                type: 'bar',
                data: {
                    labels: ['Solo yo', '2-3 per.', '4-6 per.', '7+ per.'],
                    datasets: [{
                        label: 'Índice Promedio (%)',
                        data: [35, 50, 65, 80],
                        backgroundColor: '#4fc3f7'
                    }]
                },
                options: { responsive: true, scales: { y: { max: 100 } } }
            });
        }

        // 7. Cruces: Obstáculos vs Presupuesto (Stacked Bar)
        const ctxObs = document.getElementById('chartCrucesObstaculos');
        if (ctxObs) {
            new Chart(ctxObs, {
                type: 'bar',
                data: {
                    labels: ['0€', '<100€', '100-300€', '>300€'],
                    datasets: [
                        { label: 'Falta Tiempo', data: [10, 8, 5, 2], backgroundColor: '#ffb74d' },
                        { label: 'No sé cómo', data: [15, 5, 2, 0], backgroundColor: '#ff5a5a' },
                        { label: 'Falta Equipo', data: [2, 4, 6, 8], backgroundColor: '#00C27C' }
                    ]
                },
                options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }
            });
        }
    }

    populateTables() {
        const rankingData = [
            { nombre: 'Frutería La Maravilla', categoria: 'Alimentación', indice: '85%', estado: 'Líder' },
            { nombre: 'Panadería Artesanal', categoria: 'Panadería', indice: '75%', estado: 'Avanzado' },
            { nombre: 'Carnes selectas Pepe', categoria: 'Carnicería', indice: '60%', estado: 'Intermedio' },
            { nombre: 'Pescadería El Puerto', categoria: 'Pescadería', indice: '40%', estado: 'Rezagado' },
            { nombre: 'Verduras frescas', categoria: 'Alimentación', indice: '30%', estado: 'Crítico' }
        ];

        const tableRanking = document.querySelector('#table-ranking tbody');
        if (tableRanking) {
            tableRanking.innerHTML = '';
            rankingData.forEach(c => {
                let badgeClass = 'bg-green';
                if(c.estado === 'Crítico' || c.estado === 'Rezagado') badgeClass = 'bg-red';
                if(c.estado === 'Intermedio') badgeClass = 'bg-orange';

                const row = `<tr>
                    <td>${c.nombre}</td>
                    <td>${c.categoria}</td>
                    <td><strong>${c.indice}</strong></td>
                    <td><span class="badge ${badgeClass}" style="color:#fff; padding: 4px 8px; border-radius:4px; font-size:12px;">${c.estado}</span></td>
                </tr>`;
                tableRanking.insertAdjacentHTML('beforeend', row);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardApp();
});
