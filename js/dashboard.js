class DashboardApp {
    constructor() {
        this.init();
    }

    init() {
        document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES');
        this.setupNavigation();
        this.renderCharts();
        this.populateTables();
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.getAttribute('data-target');

                // Actualizar Navegación
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Cambiar Vistas
                document.querySelectorAll('.dashboard-view').forEach(v => v.classList.add('hidden'));
                const view = document.getElementById(`view-${target}`);
                if (view) view.classList.remove('hidden');

                // Cambiar Título
                document.getElementById('page-title').innerText = item.innerText;
            });
        });
    }

    renderCharts() {
        // Mock data for Resumen General chart (Digitalization Index vs Time/Categories)
        const ctxTraffic = document.getElementById('trafficChart');
        if (ctxTraffic) {
            new Chart(ctxTraffic, {
                type: 'line',
                data: {
                    labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
                    datasets: [
                        {
                            label: 'Índice de Digitalización Promedio',
                            data: [30, 45, 55, 62],
                            borderColor: '#00C27C',
                            backgroundColor: 'rgba(0,194,124,0.1)',
                            fill: true,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { labels: { color: '#e0e0e0' } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true, max: 100,
                            grid: { color: '#2f2f2f' },
                            ticks: { color: '#888' }
                        },
                        x: {
                            grid: { color: '#2f2f2f' },
                            ticks: { color: '#888' }
                        }
                    }
                }
            });
        }
    }

    populateTables() {
        // Mock data
        const comerciosData = [
            { nombre: 'Frutería La Maravilla', categoria: 'Alimentación', indice: '85%', traccion: 'Alta', tendencia: 'up' },
            { nombre: 'Carnes selectas Pepe', categoria: 'Carnicería', indice: '60%', traccion: 'Media', tendencia: 'up' },
            { nombre: 'Pescadería El Puerto', categoria: 'Pescadería', indice: '40%', traccion: 'Baja', tendencia: 'down' },
            { nombre: 'Panadería Artesanal', categoria: 'Panadería', indice: '75%', traccion: 'Alta', tendencia: 'up' },
            { nombre: 'Verduras frescas', categoria: 'Alimentación', indice: '30%', traccion: 'Baja', tendencia: 'down' }
        ];

        const tableComercios = document.querySelector('#table-commerces tbody');
        if (tableComercios) {
            tableComercios.innerHTML = '';
            comerciosData.forEach(c => {
                const icon = c.tendencia === 'up' ? '<i class="fas fa-arrow-up text-green"></i>' : '<i class="fas fa-arrow-down text-red"></i>';
                const row = `<tr>
                    <td>${c.nombre}</td>
                    <td>${c.categoria}</td>
                    <td>${c.indice}</td>
                    <td>${c.traccion}</td>
                    <td>${icon}</td>
                </tr>`;
                tableComercios.insertAdjacentHTML('beforeend', row);
            });
        }

        const keywordsData = [
            { key: 'Gestión Redes Sociales', freq: 45, action: 'Prioridad Alta' },
            { key: 'Web / E-commerce', freq: 30, action: 'Prioridad Media' },
            { key: 'Google Business Profile', freq: 25, action: 'Prioridad Media' },
            { key: 'Publicidad (Ads)', freq: 15, action: 'Prioridad Baja' }
        ];

        const tableKeywords = document.querySelector('#table-keywords tbody');
        if (tableKeywords) {
            tableKeywords.innerHTML = '';
            keywordsData.forEach(k => {
                const row = `<tr>
                    <td>${k.key}</td>
                    <td>${k.freq}% de interés</td>
                    <td><span class="badge">${k.action}</span></td>
                </tr>`;
                tableKeywords.insertAdjacentHTML('beforeend', row);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardApp();
});