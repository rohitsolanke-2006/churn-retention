document.addEventListener('DOMContentLoaded', () => {
    // Initialize Chart.js Gauge (Doughnut)
    const ctx = document.getElementById('riskGauge').getContext('2d');
    
    // Custom plugin to draw needle if needed, but for simplicity we'll just use a half-doughnut 
    // that fills up based on risk, which is very modern.
    const riskChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100], // initial state
                backgroundColor: ['#3b82f6', '#1c2028'],
                borderWidth: 0,
                borderRadius: 20,
                cutout: '85%',
                rotation: 270,
                circumference: 180,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: { enabled: false },
                legend: { display: false }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });

    const analyzeBtn = document.getElementById('analyze-btn');
    const inputField = document.getElementById('customer-name-input');
    const errorToast = document.getElementById('error-message');

    // Tab Switching Logic
    const tabOverview = document.getElementById('tab-overview');
    const tabAudience = document.getElementById('tab-audience');
    const viewOverview = document.getElementById('view-overview');
    const viewAudience = document.getElementById('view-audience');

    tabOverview.addEventListener('click', () => {
        tabOverview.classList.add('active');
        tabAudience.classList.remove('active');
        viewOverview.classList.remove('hidden');
        viewAudience.classList.add('hidden');
    });

    tabAudience.addEventListener('click', () => {
        tabAudience.classList.add('active');
        tabOverview.classList.remove('active');
        viewAudience.classList.remove('hidden');
        viewOverview.classList.add('hidden');
    });

    function showError(msg) {
        errorToast.textContent = msg;
        errorToast.classList.remove('hidden');
        setTimeout(() => errorToast.classList.add('hidden'), 3000);
    }

    function updateDashboard(data) {
        // Update Chart
        const prob = Math.round(data.churn_probability * 100);
        
        let color = '#10b981'; // Green (Low)
        let riskText = 'Low Risk';
        if (prob > 40) {
            color = '#f59e0b'; // Amber (Medium)
            riskText = 'Medium Risk';
        }
        if (prob > 75) {
            color = '#ef4444'; // Red (High)
            riskText = 'High Risk';
        }

        riskChart.data.datasets[0].data = [prob, 100 - prob];
        riskChart.data.datasets[0].backgroundColor = [color, '#1c2028'];
        riskChart.update();

        // Update Text
        document.getElementById('risk-percentage').textContent = `${prob}%`;
        document.getElementById('risk-percentage').style.color = color;
        const badge = document.getElementById('risk-badge');
        badge.textContent = riskText;
        badge.style.color = color;
        badge.style.border = `1px solid ${color}`;

        // Update Side Panel (Poster Card)
        document.getElementById('c-name-display').textContent = data.customer_name;
        document.getElementById('c-id-display').textContent = 'ID: ' + data.info.id;
        document.getElementById('c-plan').textContent = data.info.plan.toUpperCase();
        document.getElementById('c-region').textContent = data.info.region.toUpperCase();
        document.getElementById('genre-badge').textContent = data.info.favorite_genre.toUpperCase();
        
        document.getElementById('c-age').textContent = data.info.age;
        document.getElementById('c-watch').textContent = data.info.watch_hours.toFixed(1);
        document.getElementById('c-fee').textContent = `$${data.info.fee.toFixed(2)}`;

        // Dynamic Poster Image based on Genre
        const genre = data.info.favorite_genre.toLowerCase();
        let imageUrl = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80'; // Default cinematic
        if (genre === 'action') imageUrl = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80'; // Fire/Action
        else if (genre === 'sci-fi') imageUrl = 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80'; // Space
        else if (genre === 'comedy') imageUrl = 'https://images.unsplash.com/photo-1543165365-07232ed12fad?w=500&q=80'; // Fun/Pop
        else if (genre === 'horror') imageUrl = 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?w=500&q=80'; // Dark house
        else if (genre === 'romance') imageUrl = 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&q=80'; // Hearts
        else if (genre === 'documentary') imageUrl = 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500&q=80'; // Book/Globe
        
        document.getElementById('poster-bg').style.backgroundImage = `url('${imageUrl}')`;
    }

    analyzeBtn.addEventListener('click', async () => {
        const cname = inputField.value.trim();
        if (!cname) return showError('Please enter a Customer Name');

        analyzeBtn.textContent = 'Analyzing...';
        analyzeBtn.disabled = true;

        try {
            const res = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_name: cname })
            });
            const data = await res.json();
            
            if (!res.ok) {
                showError(data.error || 'Failed to analyze');
            } else {
                updateDashboard(data);
            }
        } catch (err) {
            showError('Network error');
        } finally {
            analyzeBtn.textContent = 'Analyze Risk';
            analyzeBtn.disabled = false;
        }
    });
});
