/**
 * PULSE — OTT Audience Retention Intelligence Platform
 * Frontend SPA Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================
    const state = {
        currentPage: 'overview',
        config: null,
        charts: {},
        directory: {
            page: 1,
            per_page: 12,
            search: '',
            subscription: '',
            churn: '',
            risk: '',
            engagement: '',
            sort: 'churn_probability',
            order: 'desc'
        },
        retentionActions: {
            page: 1,
            per_page: 10,
            status: ''
        }
    };

    // DOM Elements Mapping
    const elements = {
        // Navigation & Layout
        navItems: document.querySelectorAll('.nav-menu .nav-item'),
        pages: document.querySelectorAll('.page'),
        pageTitle: document.getElementById('page-title'),
        pageSubtitle: document.getElementById('page-subtitle'),
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebar-toggle'),
        sidebarOverlay: document.getElementById('sidebar-overlay'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        apiStatus: document.getElementById('api-status'),
        refreshBtn: document.getElementById('refresh-btn'),

        // Overview
        overviewKpis: document.getElementById('overview-kpis'),
        priorityTableBody: document.getElementById('priority-table-body'),

        // Audience Analytics
        analyticsTabs: document.querySelectorAll('#analytics-tabs .tab'),
        analyticsTabContents: document.querySelectorAll('#page-analytics .tab-content'),

        // Prediction
        predictSearch: document.getElementById('predict-search'),
        predictBtn: document.getElementById('predict-btn'),
        predictClear: document.getElementById('predict-clear'),
        predictSuggestions: document.getElementById('predict-suggestions'),
        predictError: document.getElementById('predict-error'),
        predictionResults: document.getElementById('prediction-results'),
        predRiskBadge: document.getElementById('pred-risk-badge'),
        predProbValue: document.getElementById('pred-prob-value'),
        predRetention: document.getElementById('pred-retention'),
        predProfile: document.getElementById('pred-profile'),
        predMetrics: document.getElementById('pred-metrics'),
        predExplanation: document.getElementById('pred-explanation'),
        predComparisons: document.getElementById('pred-comparisons'),
        predRecommendations: document.getElementById('pred-recommendations'),
        predHistoryBody: document.getElementById('pred-history-body'),

        // Unified Retention Center
        retentionSegmentKpis: document.getElementById('retention-segment-kpis'),
        retentionTabs: document.querySelectorAll('#retention-tabs .tab'),
        retentionTabContents: document.querySelectorAll('#page-retention .tab-content'),
        retDirSearch: document.getElementById('ret-dir-search'),
        retDirSub: document.getElementById('ret-dir-sub'),
        retDirChurn: document.getElementById('ret-dir-churn'),
        retDirRisk: document.getElementById('ret-dir-risk'),
        retDirEngagement: document.getElementById('ret-dir-engagement'),
        retDirSort: document.getElementById('ret-dir-sort'),
        retDirApply: document.getElementById('ret-dir-apply'),
        retDirClear: document.getElementById('ret-dir-clear'),
        retDirCount: document.getElementById('ret-dir-count'),
        retDirBody: document.getElementById('ret-dir-body'),
        retDirPagination: document.getElementById('ret-dir-pagination'),
        retActionStatus: document.getElementById('ret-action-status'),
        retFilterActions: document.getElementById('ret-filter-actions'),
        retentionActionsBody: document.getElementById('retention-actions-body'),
        retActionsEmpty: document.getElementById('ret-actions-empty'),
        retActionsPagination: document.getElementById('ret-actions-pagination'),

        // Model Insights
        modelKpis: document.getElementById('model-kpis'),
        confusionMatrix: document.getElementById('confusion-matrix'),
        modelInfoGrid: document.getElementById('model-info-grid'),

        // Reports & Exports
        reportSubFilter: document.getElementById('report-sub-filter'),
        reportRiskFilter: document.getElementById('report-risk-filter'),
        exportCustomers: document.getElementById('export-customers'),
        previewCustomers: document.getElementById('preview-customers'),
        exportRetention: document.getElementById('export-retention'),
        previewRetention: document.getElementById('preview-retention'),
        exportModel: document.getElementById('export-model'),
        previewModel: document.getElementById('preview-model'),

        // Settings
        settingsDataset: document.getElementById('settings-dataset'),
        settingsModel: document.getElementById('settings-model'),
        thresholdLow: document.getElementById('threshold-low'),
        thresholdMedium: document.getElementById('threshold-medium'),
        thresholdPreview: document.getElementById('threshold-preview'),
        saveThresholds: document.getElementById('save-thresholds'),
        thresholdFeedback: document.getElementById('threshold-feedback'),
        settingsApi: document.getElementById('settings-api'),

        // Modal Dialogs & Toasts
        modalOverlay: document.getElementById('modal-overlay'),
        modalTitle: document.getElementById('modal-title'),
        modalClose: document.getElementById('modal-close'),
        modalBody: document.getElementById('modal-body'),
        modalFooter: document.getElementById('modal-footer'),
        toastContainer: document.getElementById('toast-container'),
        loadingOverlay: document.getElementById('loading-overlay')
    };

    // =========================================================================
    // UTILITY HELPERS
    // =========================================================================
    function showLoading() {
        if (elements.loadingOverlay) elements.loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        if (elements.loadingOverlay) elements.loadingOverlay.classList.add('hidden');
    }

    function showToast(message, type = 'info') {
        if (!elements.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '—';
        return Number(num).toLocaleString();
    }

    function formatPercent(num) {
        if (num === null || num === undefined || isNaN(num)) return '—';
        return (Number(num) * 100).toFixed(1) + '%';
    }

    function formatCurrency(num) {
        if (num === null || num === undefined || isNaN(num)) return '—';
        return '$' + Number(num).toFixed(2);
    }

    function getRiskBadge(category) {
        const cat = (category || 'low').toLowerCase();
        return `<span class="risk-badge risk-${cat}">${category || 'Low'}</span>`;
    }

    function getEngagementBadge(level) {
        const lvl = (level || 'medium').toLowerCase();
        return `<span class="tag-badge">${level || 'Medium'}</span>`;
    }

    function destroyChart(id) {
        if (state.charts[id]) {
            state.charts[id].destroy();
            delete state.charts[id];
        }
    }

    const CHART_COLORS = {
        amber: '#f59e0b',
        amberLight: '#fbbf24',
        red: '#ef4444',
        green: '#10b981',
        blue: '#38bdf8',
        purple: '#818cf8',
        surface: '#181b24',
        text: '#94a3b8',
        grid: 'rgba(255, 255, 255, 0.06)'
    };

    const defaultChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: CHART_COLORS.text,
                    font: { family: 'Inter', size: 12 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(18, 20, 26, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: { color: CHART_COLORS.grid },
                ticks: { color: CHART_COLORS.text, font: { family: 'Inter', size: 11 } }
            },
            y: {
                grid: { color: CHART_COLORS.grid },
                ticks: { color: CHART_COLORS.text, font: { family: 'Inter', size: 11 } }
            }
        }
    };

    // =========================================================================
    // ROUTING & NAVIGATION
    // =========================================================================
    const PAGE_METADATA = {
        overview: { title: 'Executive Overview', subtitle: 'Subscriber base health and churn risk summary' },
        analytics: { title: 'Audience Analytics', subtitle: 'Deep dive into viewing patterns, engagement, and content' },
        prediction: { title: 'Churn Prediction', subtitle: 'Predict subscriber churn probability & examine drivers' },
        retention: { title: 'Retention Center', subtitle: 'Manage targeted retention segments and intervention actions' },
        model: { title: 'Model Insights', subtitle: 'Machine learning performance, ROC curve, and feature importances' },
        reports: { title: 'Reports & Exports', subtitle: 'Download intelligence datasets and model reports' },
        settings: { title: 'Settings & Config', subtitle: 'System status and risk threshold customization' }
    };

    function navigateTo(pageId) {
        state.currentPage = pageId;

        elements.navItems.forEach(item => {
            if (item.dataset.page === pageId) item.classList.add('active');
            else item.classList.remove('active');
        });

        elements.pages.forEach(p => {
            if (p.id === `page-${pageId}`) p.classList.add('active');
            else p.classList.remove('active');
        });

        if (PAGE_METADATA[pageId]) {
            elements.pageTitle.textContent = PAGE_METADATA[pageId].title;
            elements.pageSubtitle.textContent = PAGE_METADATA[pageId].subtitle;
        }

        // Close mobile sidebar if open
        if (elements.sidebar?.classList.contains('open')) {
            elements.sidebar.classList.remove('open');
            elements.sidebarOverlay?.classList.remove('active');
        }

        // Load page-specific data
        loadPageData(pageId);
    }

    function loadPageData(pageId) {
        switch (pageId) {
            case 'overview':
                fetchOverviewData();
                break;
            case 'analytics':
                fetchAnalyticsData();
                break;
            case 'prediction':
                loadPredictionSuggestions();
                break;
            case 'retention':
                fetchRetentionDirectory();
                fetchRetentionSegmentsSummary();
                fetchRetentionActions();
                break;
            case 'model':
                fetchModelEvaluation();
                break;
            case 'settings':
                fetchSettingsInfo();
                break;
        }
    }

    // Sidebar Toggles
    elements.sidebarToggle?.addEventListener('click', () => {
        elements.sidebar?.classList.toggle('collapsed');
    });

    elements.mobileMenuBtn?.addEventListener('click', () => {
        elements.sidebar?.classList.add('open');
        elements.sidebarOverlay?.classList.add('active');
    });

    elements.sidebarOverlay?.addEventListener('click', () => {
        elements.sidebar?.classList.remove('open');
        elements.sidebarOverlay?.classList.remove('active');
    });

    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) navigateTo(page);
        });
    });

    elements.refreshBtn?.addEventListener('click', () => {
        showToast('Refreshing platform data...', 'info');
        loadPageData(state.currentPage);
    });

    // =========================================================================
    // SYSTEM HEALTH & CONFIG
    // =========================================================================
    async function checkHealthAndConfig() {
        try {
            const [healthRes, configRes] = await Promise.all([
                fetch('/api/health'),
                fetch('/api/config')
            ]);
            const health = await healthRes.json();
            const config = await configRes.json();
            state.config = config;

            if (elements.apiStatus) {
                const dot = elements.apiStatus.querySelector('.status-dot');
                const text = elements.apiStatus.querySelector('.status-text');
                if (health.status === 'healthy') {
                    dot.className = 'status-dot healthy';
                    text.textContent = 'Operational';
                } else {
                    dot.className = 'status-dot error';
                    text.textContent = 'Degraded';
                }
            }
            updateThresholdInputs();
        } catch (err) {
            console.error('Health check error:', err);
            if (elements.apiStatus) {
                elements.apiStatus.querySelector('.status-dot').className = 'status-dot error';
                elements.apiStatus.querySelector('.status-text').textContent = 'Offline';
            }
        }
    }

    // =========================================================================
    // 1. EXECUTIVE OVERVIEW
    // =========================================================================
    async function fetchOverviewData() {
        try {
            showLoading();
            const res = await fetch('/api/analytics/overview');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            hideLoading();

            renderOverviewKpis(data.kpis || data);
            renderOverviewCharts(data.charts || data);
            renderPriorityTable(data.priority_customers || []);
        } catch (err) {
            hideLoading();
            console.error('Failed to load overview data:', err);
            showToast('Failed to load overview data', 'error');
        }
    }

    function renderOverviewKpis(kpis) {
        if (!elements.overviewKpis || !kpis) return;

        const total = kpis.total_subscribers || 5000;
        const churnRate = kpis.churn_rate !== undefined ? kpis.churn_rate : (kpis.observed_churn_rate || 0.503);
        const churnedCount = kpis.churned_count || kpis.churned_subscribers || Math.round(total * churnRate);
        const highRiskCount = kpis.high_risk_count || kpis.high_risk_subscribers || 2428;
        const highRiskPct = kpis.high_risk_pct || (highRiskCount / total);
        const medRiskCount = kpis.medium_risk_count || kpis.medium_risk_subscribers || 126;
        const medRiskPct = kpis.medium_risk_pct || (medRiskCount / total);
        const avgWatch = kpis.avg_watch_hours !== undefined ? kpis.avg_watch_hours : 11.65;

        elements.overviewKpis.innerHTML = `
            <div class="kpi-card kpi-blue">
                <span class="kpi-title">Total Subscribers</span>
                <span class="kpi-value">${formatNumber(total)}</span>
                <span class="kpi-subtext">Active monitoring pool</span>
            </div>
            <div class="kpi-card ${churnRate > 0.4 ? 'kpi-red' : 'kpi-amber'}">
                <span class="kpi-title">Historical Churn</span>
                <span class="kpi-value">${formatPercent(churnRate)}</span>
                <span class="kpi-subtext">${formatNumber(churnedCount)} total cancellations</span>
            </div>
            <div class="kpi-card kpi-red">
                <span class="kpi-title">High Risk Subscribers</span>
                <span class="kpi-value">${formatNumber(highRiskCount)}</span>
                <span class="kpi-subtext">${formatPercent(highRiskPct)} of active base</span>
            </div>
            <div class="kpi-card kpi-amber">
                <span class="kpi-title">Medium Risk Subscribers</span>
                <span class="kpi-value">${formatNumber(medRiskCount)}</span>
                <span class="kpi-subtext">${formatPercent(medRiskPct)} need monitoring</span>
            </div>
            <div class="kpi-card kpi-green">
                <span class="kpi-title">Avg Watch Hours</span>
                <span class="kpi-value">${avgWatch.toFixed(1)}h</span>
                <span class="kpi-subtext">Per subscriber</span>
            </div>
        `;
    }

    function renderOverviewCharts(charts) {
        if (!charts) return;

        // 1. Churn Distribution (Observed Ground Truth)
        destroyChart('chart-churn-dist');
        const ctxChurn = document.getElementById('chart-churn-dist')?.getContext('2d');
        if (ctxChurn) {
            const churnDist = charts.churn_distribution || {};
            const activeCount = churnDist.Active ?? churnDist.active ?? 2485;
            const churnedCount = churnDist.Churned ?? churnDist.churned ?? 2515;

            state.charts['chart-churn-dist'] = new Chart(ctxChurn, {
                type: 'doughnut',
                data: {
                    labels: ['Active Retained', 'Historical Churned'],
                    datasets: [{
                        data: [activeCount, churnedCount],
                        backgroundColor: [CHART_COLORS.green, CHART_COLORS.red],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: CHART_COLORS.text } } }
                }
            });
        }

        // 2. Risk Distribution (Model Predicted)
        destroyChart('chart-risk-dist');
        const ctxRisk = document.getElementById('chart-risk-dist')?.getContext('2d');
        if (ctxRisk) {
            const riskDist = charts.risk_distribution || {};
            const lowCount = riskDist.Low ?? riskDist.low ?? 2446;
            const medCount = riskDist.Medium ?? riskDist.medium ?? 126;
            const highCount = riskDist.High ?? riskDist.high ?? 2428;

            state.charts['chart-risk-dist'] = new Chart(ctxRisk, {
                type: 'doughnut',
                data: {
                    labels: ['Low Risk (<40%)', 'Medium Risk (40-70%)', 'High Risk (>70%)'],
                    datasets: [{
                        data: [lowCount, medCount, highCount],
                        backgroundColor: [CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.red],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: CHART_COLORS.text } } }
                }
            });
        }

        // 3. Churn Rate by Subscription Tier
        destroyChart('chart-churn-sub');
        const ctxSub = document.getElementById('chart-churn-sub')?.getContext('2d');
        if (ctxSub) {
            let labels = ['Basic ($8.99)', 'Standard ($13.99)', 'Premium ($17.99)'];
            let values = [49.8, 50.2, 50.9];

            const subData = charts.churn_by_subscription;
            if (subData) {
                if (Array.isArray(subData)) {
                    labels = subData.map(r => r.subscription_type);
                    values = subData.map(r => (Number(r.rate) * 100).toFixed(1));
                } else if (typeof subData === 'object') {
                    labels = Object.keys(subData);
                    values = Object.values(subData).map(v => (Number(v) * 100).toFixed(1));
                }
            }

            state.charts['chart-churn-sub'] = new Chart(ctxSub, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Cancellation Rate (%)',
                        data: values,
                        backgroundColor: CHART_COLORS.amber,
                        borderRadius: 6
                    }]
                },
                options: {
                    ...defaultChartOptions,
                    scales: {
                        ...defaultChartOptions.scales,
                        y: { ...defaultChartOptions.scales.y, max: 100 }
                    }
                }
            });
        }

        // 4. Watch Hours by Churn Status
        destroyChart('chart-watch-churn');
        const ctxWatch = document.getElementById('chart-watch-churn')?.getContext('2d');
        if (ctxWatch) {
            let activeMean = 11.68;
            let churnedMean = 11.62;

            if (charts.watch_hours_by_churn) {
                activeMean = charts.watch_hours_by_churn.active_mean ?? 11.68;
                churnedMean = charts.watch_hours_by_churn.churned_mean ?? 11.62;
            } else if (Array.isArray(charts.watch_by_churn)) {
                const a = charts.watch_by_churn.find(r => r.churned === 0);
                const c = charts.watch_by_churn.find(r => r.churned === 1);
                if (a) activeMean = a.mean;
                if (c) churnedMean = c.mean;
            }

            state.charts['chart-watch-churn'] = new Chart(ctxWatch, {
                type: 'bar',
                data: {
                    labels: ['Active Retained Audience', 'Cancelled Audience'],
                    datasets: [{
                        label: 'Mean Monthly Watch Hours',
                        data: [Number(activeMean).toFixed(1), Number(churnedMean).toFixed(1)],
                        backgroundColor: [CHART_COLORS.green, CHART_COLORS.red],
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }
    }

    function renderPriorityTable(customers) {
        if (!elements.priorityTableBody) return;
        if (!customers || !customers.length) {
            elements.priorityTableBody.innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align:center;">No priority subscribers identified.</td></tr>`;
            return;
        }

        elements.priorityTableBody.innerHTML = customers.map(c => `
            <tr>
                <td>
                    <div class="customer-cell">
                        <span class="customer-name">${c.customer_name || 'Subscriber'}</span>
                        <span class="customer-id">${(c.customer_id || '').substring(0, 8)}...</span>
                    </div>
                </td>
                <td><span class="tag-badge">${c.subscription_type}</span></td>
                <td><strong>${formatPercent(c.churn_probability)}</strong></td>
                <td>${getRiskBadge(c.risk_category)}</td>
                <td>${getEngagementBadge(c.engagement_level)}</td>
                <td><span style="font-weight:700; color:var(--primary);">${Number(c.priority_score).toFixed(0)}</span></td>
                <td style="max-width:220px; font-size:0.8rem; color:var(--text-secondary);">${c.suggested_action || 'Review'}</td>
                <td style="text-align:right;">
                    <button class="btn btn-ghost btn-sm view-cust-btn" data-id="${c.customer_id}">Profile</button>
                    <button class="btn btn-primary btn-sm action-cust-btn" data-id="${c.customer_id}" data-name="${c.customer_name || ''}" data-prob="${c.churn_probability}">Take Action</button>
                </td>
            </tr>
        `).join('');

        attachCustomerActionHandlers(elements.priorityTableBody);
    }

    // =========================================================================
    // 2. AUDIENCE ANALYTICS
    // =========================================================================
    elements.analyticsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.analyticsTabs.forEach(t => t.classList.remove('active'));
            elements.analyticsTabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetId = `tab-${tab.dataset.tab}`;
            document.getElementById(targetId)?.classList.add('active');
        });
    });

    async function fetchAnalyticsData() {
        try {
            showLoading();
            const res = await fetch('/api/analytics/audience');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            hideLoading();

            renderWatchTimeAnalytics(data.watch_time, data.daily_watch_time);
            renderEngagementAnalytics(data.engagement, data.login_stats);
            renderGenreAnalytics(data.genre_analysis);
            renderSubscriptionAnalytics(data.subscription_analysis, data.payment_analysis, data.device_analysis, data.profile_analysis);
            renderDemographicsAnalytics(data.age_analysis, data.region_analysis);
        } catch (err) {
            hideLoading();
            console.error('Failed to load audience analytics:', err);
            showToast('Failed to load audience analytics', 'error');
        }
    }

    function renderWatchTimeAnalytics(watchData, dailyWatchData) {
        const kpisEl = document.getElementById('watch-kpis');
        if (kpisEl && watchData && watchData.overall) {
            kpisEl.innerHTML = `
                <div class="kpi-card kpi-amber">
                    <span class="kpi-title">Mean Watch Hours</span>
                    <span class="kpi-value">${watchData.overall.mean?.toFixed(1) || 0}h</span>
                </div>
                <div class="kpi-card kpi-purple">
                    <span class="kpi-title">Median Watch Hours</span>
                    <span class="kpi-value">${watchData.overall.median?.toFixed(1) || 0}h</span>
                </div>
                <div class="kpi-card kpi-blue">
                    <span class="kpi-title">Max Watch Hours</span>
                    <span class="kpi-value">${watchData.overall.max?.toFixed(1) || 0}h</span>
                </div>
                <div class="kpi-card kpi-green">
                    <span class="kpi-title">Daily Watch Avg</span>
                    <span class="kpi-value">${dailyWatchData?.overall?.mean?.toFixed(2) || 0}h</span>
                </div>
            `;
        }

        destroyChart('chart-watch-dist');
        const ctxDist = document.getElementById('chart-watch-dist')?.getContext('2d');
        if (ctxDist && watchData?.distribution) {
            const labels = (watchData.distribution.bins || []).map(b => `${Number(b).toFixed(0)}h`);
            state.charts['chart-watch-dist'] = new Chart(ctxDist, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Subscribers',
                        data: watchData.distribution.counts || [],
                        backgroundColor: CHART_COLORS.amber,
                        borderRadius: 4
                    }]
                },
                options: defaultChartOptions
            });
        }

        destroyChart('chart-watch-sub');
        const ctxSub = document.getElementById('chart-watch-sub')?.getContext('2d');
        if (ctxSub && watchData?.by_subscription) {
            state.charts['chart-watch-sub'] = new Chart(ctxSub, {
                type: 'bar',
                data: {
                    labels: watchData.by_subscription.map(r => r.subscription_type),
                    datasets: [{
                        label: 'Mean Hours',
                        data: watchData.by_subscription.map(r => r.mean?.toFixed(1) || 0),
                        backgroundColor: CHART_COLORS.blue,
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }

        destroyChart('chart-watch-region');
        const ctxReg = document.getElementById('chart-watch-region')?.getContext('2d');
        if (ctxReg && watchData?.by_region) {
            state.charts['chart-watch-region'] = new Chart(ctxReg, {
                type: 'bar',
                data: {
                    labels: watchData.by_region.map(r => r.region),
                    datasets: [{
                        label: 'Mean Hours',
                        data: watchData.by_region.map(r => (r.watch_hours || r.mean || 0).toFixed(1)),
                        backgroundColor: CHART_COLORS.purple,
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }
    }

    function renderEngagementAnalytics(engData, loginData) {
        const kpisEl = document.getElementById('engagement-kpis');
        if (kpisEl && engData?.level_distribution) {
            const dist = engData.level_distribution;
            const total = (dist.High || 0) + (dist.Medium || 0) + (dist.Low || 0) || 1;
            kpisEl.innerHTML = `
                <div class="kpi-card kpi-green">
                    <span class="kpi-title">High Engagement</span>
                    <span class="kpi-value">${formatPercent((dist.High || 0) / total)}</span>
                </div>
                <div class="kpi-card kpi-amber">
                    <span class="kpi-title">Medium Engagement</span>
                    <span class="kpi-value">${formatPercent((dist.Medium || 0) / total)}</span>
                </div>
                <div class="kpi-card kpi-red">
                    <span class="kpi-title">Low Engagement</span>
                    <span class="kpi-value">${formatPercent((dist.Low || 0) / total)}</span>
                </div>
                <div class="kpi-card kpi-blue">
                    <span class="kpi-title">Avg Last Login Days</span>
                    <span class="kpi-value">${loginData?.overall?.mean?.toFixed(0) || 0}d</span>
                </div>
            `;
        }

        destroyChart('chart-eng-dist');
        const ctxDist = document.getElementById('chart-eng-dist')?.getContext('2d');
        if (ctxDist && engData?.level_distribution) {
            state.charts['chart-eng-dist'] = new Chart(ctxDist, {
                type: 'doughnut',
                data: {
                    labels: ['High', 'Medium', 'Low'],
                    datasets: [{
                        data: [
                            engData.level_distribution.High || 0,
                            engData.level_distribution.Medium || 0,
                            engData.level_distribution.Low || 0
                        ],
                        backgroundColor: [CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.red],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: CHART_COLORS.text } } }
                }
            });
        }

        destroyChart('chart-eng-sub');
        const ctxSub = document.getElementById('chart-eng-sub')?.getContext('2d');
        if (ctxSub && engData?.by_subscription) {
            state.charts['chart-eng-sub'] = new Chart(ctxSub, {
                type: 'bar',
                data: {
                    labels: engData.by_subscription.map(r => r.subscription_type),
                    datasets: [{
                        label: 'Mean Engagement (0-100)',
                        data: engData.by_subscription.map(r => r.engagement_score?.toFixed(1) || 0),
                        backgroundColor: CHART_COLORS.amber,
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }

        destroyChart('chart-login-churn');
        const ctxLogin = document.getElementById('chart-login-churn')?.getContext('2d');
        if (ctxLogin && loginData?.by_churn) {
            const activeMean = loginData.by_churn.find(r => r.churned === 0)?.mean || 0;
            const churnedMean = loginData.by_churn.find(r => r.churned === 1)?.mean || 0;
            state.charts['chart-login-churn'] = new Chart(ctxLogin, {
                type: 'bar',
                data: {
                    labels: ['Active Retained Subscribers', 'Cancelled Subscribers'],
                    datasets: [{
                        label: 'Days Since Last Login (Mean)',
                        data: [Number(activeMean).toFixed(1), Number(churnedMean).toFixed(1)],
                        backgroundColor: [CHART_COLORS.green, CHART_COLORS.red],
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }
    }

    function renderGenreAnalytics(genreData) {
        destroyChart('chart-genre-dist');
        const ctxDist = document.getElementById('chart-genre-dist')?.getContext('2d');
        if (ctxDist && genreData?.distribution) {
            state.charts['chart-genre-dist'] = new Chart(ctxDist, {
                type: 'pie',
                data: {
                    labels: Object.keys(genreData.distribution),
                    datasets: [{
                        data: Object.values(genreData.distribution),
                        backgroundColor: [
                            '#f59e0b', '#ef4444', '#10b981', '#38bdf8', '#818cf8', '#f43f5e', '#a855f7'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: CHART_COLORS.text } } }
                }
            });
        }

        destroyChart('chart-genre-churn');
        const ctxChurn = document.getElementById('chart-genre-churn')?.getContext('2d');
        if (ctxChurn && genreData?.by_churn) {
            state.charts['chart-genre-churn'] = new Chart(ctxChurn, {
                type: 'bar',
                data: {
                    labels: genreData.by_churn.map(r => r.genre),
                    datasets: [{
                        label: 'Churn Rate (%)',
                        data: genreData.by_churn.map(r => (Number(r.churn_rate) * 100).toFixed(1)),
                        backgroundColor: CHART_COLORS.red,
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }
    }

    function renderSubscriptionAnalytics(subData, paymentData, deviceData, profileData) {
        destroyChart('chart-payment-churn');
        const ctxPay = document.getElementById('chart-payment-churn')?.getContext('2d');
        if (ctxPay && paymentData) {
            state.charts['chart-payment-churn'] = new Chart(ctxPay, {
                type: 'bar',
                data: {
                    labels: paymentData.map(r => r.payment_method),
                    datasets: [{
                        label: 'Cancellation Rate (%)',
                        data: paymentData.map(r => (Number(r.churn_rate) * 100).toFixed(1)),
                        backgroundColor: CHART_COLORS.amber,
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }

        destroyChart('chart-device-churn');
        const ctxDev = document.getElementById('chart-device-churn')?.getContext('2d');
        if (ctxDev && deviceData) {
            state.charts['chart-device-churn'] = new Chart(ctxDev, {
                type: 'bar',
                data: {
                    labels: deviceData.map(r => r.device),
                    datasets: [{
                        label: 'Cancellation Rate (%)',
                        data: deviceData.map(r => (Number(r.churn_rate) * 100).toFixed(1)),
                        backgroundColor: CHART_COLORS.purple,
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }

        destroyChart('chart-profile-churn');
        const ctxProf = document.getElementById('chart-profile-churn')?.getContext('2d');
        if (ctxProf && profileData) {
            state.charts['chart-profile-churn'] = new Chart(ctxProf, {
                type: 'bar',
                data: {
                    labels: profileData.map(r => `${r.profiles} Profiles`),
                    datasets: [{
                        label: 'Cancellation Rate (%)',
                        data: profileData.map(r => (Number(r.churn_rate) * 100).toFixed(1)),
                        backgroundColor: CHART_COLORS.blue,
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }
    }

    function renderDemographicsAnalytics(ageData, regionData) {
        destroyChart('chart-age-churn');
        const ctxAge = document.getElementById('chart-age-churn')?.getContext('2d');
        if (ctxAge && ageData) {
            state.charts['chart-age-churn'] = new Chart(ctxAge, {
                type: 'bar',
                data: {
                    labels: ageData.map(r => r.age_group),
                    datasets: [{
                        label: 'Cancellation Rate (%)',
                        data: ageData.map(r => (Number(r.churn_rate) * 100).toFixed(1)),
                        backgroundColor: CHART_COLORS.amber,
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }

        destroyChart('chart-region-churn');
        const ctxReg = document.getElementById('chart-region-churn')?.getContext('2d');
        if (ctxReg && regionData) {
            state.charts['chart-region-churn'] = new Chart(ctxReg, {
                type: 'bar',
                data: {
                    labels: regionData.map(r => r.region),
                    datasets: [{
                        label: 'Cancellation Rate (%)',
                        data: regionData.map(r => (Number(r.churn_rate) * 100).toFixed(1)),
                        backgroundColor: CHART_COLORS.blue,
                        borderRadius: 6
                    }]
                },
                options: defaultChartOptions
            });
        }
    }

    // =========================================================================
    // 3. CHURN PREDICTION (DEDICATED SEARCH)
    // =========================================================================
    async function loadPredictionSuggestions() {
        if (!elements.predictSuggestions || elements.predictSuggestions.children.length > 0) return;
        try {
            const res = await fetch('/api/customers?per_page=6');
            const data = await res.json();
            if (data.customers && data.customers.length) {
                elements.predictSuggestions.innerHTML = `
                    <span style="font-size:0.75rem; color:var(--text-muted); align-self:center;">Try:</span>
                    ${data.customers.map(c => `
                        <span class="suggestion-chip" data-id="${c.customer_id}">${c.customer_name || c.customer_id.substring(0,8)}</span>
                    `).join('')}
                `;
                elements.predictSuggestions.querySelectorAll('.suggestion-chip').forEach(chip => {
                    chip.addEventListener('click', () => {
                        elements.predictSearch.value = chip.dataset.id;
                        runPrediction(chip.dataset.id);
                    });
                });
            }
        } catch (e) {
            console.error('Suggestions error:', e);
        }
    }

    elements.predictBtn?.addEventListener('click', () => {
        const query = elements.predictSearch.value.trim();
        if (!query) {
            showToast('Please enter a subscriber name or UUID', 'error');
            return;
        }
        runPrediction(query);
    });

    elements.predictSearch?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = elements.predictSearch.value.trim();
            if (query) runPrediction(query);
        }
    });

    elements.predictClear?.addEventListener('click', () => {
        elements.predictSearch.value = '';
        elements.predictionResults?.classList.add('hidden');
        elements.predictError?.classList.add('hidden');
    });

    async function runPrediction(query) {
        try {
            showLoading();
            elements.predictError?.classList.add('hidden');

            const res = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, customer_id: query, customer_name: query })
            });

            const data = await res.json();
            hideLoading();

            if (!res.ok || data.error) {
                elements.predictError.textContent = data.error || 'Subscriber not found';
                elements.predictError.classList.remove('hidden');
                elements.predictionResults?.classList.add('hidden');
                return;
            }

            renderPredictionResults(data);
        } catch (err) {
            hideLoading();
            elements.predictError.textContent = 'Connection error during risk analysis';
            elements.predictError.classList.remove('hidden');
            elements.predictionResults?.classList.add('hidden');
        }
    }

    function renderPredictionResults(data) {
        elements.predictionResults?.classList.remove('hidden');

        // Risk badge
        const risk = data.risk_category || 'Low';
        elements.predRiskBadge.className = `risk-badge risk-${risk.toLowerCase()}`;
        elements.predRiskBadge.textContent = `${risk} Risk`;

        // Probabilities
        const prob = data.churn_probability || 0;
        elements.predProbValue.textContent = (prob * 100).toFixed(0) + '%';
        elements.predRetention.textContent = ((1 - prob) * 100).toFixed(0) + '%';

        // Gauge
        destroyChart('pred-gauge');
        const ctxGauge = document.getElementById('pred-gauge')?.getContext('2d');
        if (ctxGauge) {
            const riskColor = risk === 'High' ? CHART_COLORS.red : risk === 'Medium' ? CHART_COLORS.amber : CHART_COLORS.green;
            state.charts['pred-gauge'] = new Chart(ctxGauge, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [prob * 100, (1 - prob) * 100],
                        backgroundColor: [riskColor, 'rgba(255, 255, 255, 0.08)'],
                        borderWidth: 0,
                        circumference: 180,
                        rotation: 270,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '80%',
                    plugins: { tooltip: { enabled: false } }
                }
            });
        }

        // Profile
        const profile = data.customer_profile || {};
        elements.predProfile.innerHTML = `
            <div class="profile-field">
                <span class="profile-field-label">Subscriber Name</span>
                <span class="profile-field-value">${data.customer_name || 'Subscriber'}</span>
            </div>
            <div class="profile-field">
                <span class="profile-field-label">Subscriber UUID</span>
                <span class="profile-field-value" style="font-family:var(--font-mono); font-size:0.775rem;">${(data.customer_id || '').substring(0, 16)}...</span>
            </div>
            <div class="profile-field">
                <span class="profile-field-label">Plan Tier</span>
                <span class="profile-field-value">${profile.subscription_type || '—'}</span>
            </div>
            <div class="profile-field">
                <span class="profile-field-label">Monthly Rate</span>
                <span class="profile-field-value">${formatCurrency(profile.monthly_fee)}</span>
            </div>
            <div class="profile-field">
                <span class="profile-field-label">Region • Device</span>
                <span class="profile-field-value">${profile.region || '—'} • ${profile.device || '—'}</span>
            </div>
            <div class="profile-field">
                <span class="profile-field-label">Preferred Content</span>
                <span class="profile-field-value">${profile.favorite_genre || '—'}</span>
            </div>
        `;

        // Metrics Row
        elements.predMetrics.innerHTML = `
            <div class="kpi-card kpi-amber">
                <span class="kpi-title">Engagement Score</span>
                <span class="kpi-value">${data.engagement_score ? data.engagement_score.toFixed(0) : '—'}/100</span>
                <span class="kpi-subtext">Level: ${data.engagement_level || 'Medium'}</span>
            </div>
            <div class="kpi-card kpi-purple">
                <span class="kpi-title">Retention Priority</span>
                <span class="kpi-value">${data.priority_score ? data.priority_score.toFixed(0) : '—'}/100</span>
                <span class="kpi-subtext">Intervention Rank</span>
            </div>
            <div class="kpi-card kpi-blue">
                <span class="kpi-title">Monthly Watch</span>
                <span class="kpi-value">${profile.watch_hours ? profile.watch_hours.toFixed(1) : '—'}h</span>
                <span class="kpi-subtext">Total stream time</span>
            </div>
            <div class="kpi-card kpi-green">
                <span class="kpi-title">Daily Stream Time</span>
                <span class="kpi-value">${profile.avg_watch_time_per_day ? profile.avg_watch_time_per_day.toFixed(2) : '—'}h</span>
                <span class="kpi-subtext">Daily density</span>
            </div>
            <div class="kpi-card ${profile.last_login_days > 30 ? 'kpi-red' : 'kpi-blue'}">
                <span class="kpi-title">Inactivity Gap</span>
                <span class="kpi-value">${profile.last_login_days !== undefined ? profile.last_login_days : '—'}d</span>
                <span class="kpi-subtext">Days since login</span>
            </div>
        `;

        // Explanation
        elements.predExplanation.textContent = data.explanation || 'Calculated based on Random Forest feature importances.';

        // Comparisons
        if (data.peer_comparisons) {
            elements.predComparisons.innerHTML = Object.keys(data.peer_comparisons).map(key => {
                const item = data.peer_comparisons[key];
                const label = key.replace(/_/g, ' ').toUpperCase();
                return `
                    <div class="comp-item">
                        <span class="comp-metric">${label}</span>
                        <div class="comp-values">
                            <span class="comp-cust">${item.customer !== undefined ? item.customer : '—'}</span>
                            <span class="comp-median">Platform Median: ${item.median !== undefined ? item.median : '—'}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Recommendations
        if (data.recommendations && data.recommendations.length) {
            elements.predRecommendations.innerHTML = data.recommendations.map(r => `
                <div class="recommendation-card priority-${(r.priority || 'medium').toLowerCase()}">
                    <div class="rec-header">
                        <span class="rec-title">${r.title}</span>
                        <span class="tag-badge">${r.type || 'Campaign'}</span>
                    </div>
                    <p class="rec-desc">${r.description}</p>
                    <div style="margin-top:0.5rem; display:flex; justify-content:flex-end;">
                        <button class="btn btn-primary btn-sm action-cust-btn"
                            data-id="${data.customer_id}"
                            data-name="${data.customer_name || ''}"
                            data-prob="${data.churn_probability}"
                            data-act="${r.title}">
                            Log Retention Action
                        </button>
                    </div>
                </div>
            `).join('');
            attachCustomerActionHandlers(elements.predRecommendations);
        } else {
            elements.predRecommendations.innerHTML = `<p class="text-muted">Subscriber exhibits healthy engagement metrics. No intervention recommended.</p>`;
        }

        // History
        if (data.prediction_history && data.prediction_history.length) {
            elements.predHistoryBody.innerHTML = data.prediction_history.map(h => `
                <tr>
                    <td>${new Date(h.created_at).toLocaleString()}</td>
                    <td><strong>${formatPercent(h.churn_probability)}</strong></td>
                    <td>${getRiskBadge(h.risk_category)}</td>
                    <td>${h.model_name || 'Random Forest'}</td>
                </tr>
            `).join('');
        } else {
            elements.predHistoryBody.innerHTML = `<tr><td colspan="4" class="text-muted" style="text-align:center;">Initial risk diagnostic logged to database.</td></tr>`;
        }
    }

    // =========================================================================
    // 4. UNIFIED RETENTION CENTER (DIRECTORY + ACTION TRACKER)
    // =========================================================================
    elements.retentionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.retentionTabs.forEach(t => t.classList.remove('active'));
            elements.retentionTabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetId = `tab-${tab.dataset.tab}`;
            document.getElementById(targetId)?.classList.add('active');
        });
    });

    // Summary KPIs
    async function fetchRetentionSegmentsSummary() {
        try {
            const res = await fetch('/api/retention/segments?per_page=1');
            const data = await res.json();
            const summary = data.summary || data.segment_counts;
            if (elements.retentionSegmentKpis && summary) {
                elements.retentionSegmentKpis.innerHTML = `
                    <div class="kpi-card kpi-red">
                        <span class="kpi-title">High Risk Segment</span>
                        <span class="kpi-value">${formatNumber(summary.high_count || summary.high)}</span>
                        <span class="kpi-subtext">Immediate retention outreach required</span>
                    </div>
                    <div class="kpi-card kpi-amber">
                        <span class="kpi-title">Medium Risk Segment</span>
                        <span class="kpi-value">${formatNumber(summary.medium_count || summary.medium)}</span>
                        <span class="kpi-subtext">Target for re-engagement newsletters</span>
                    </div>
                    <div class="kpi-card kpi-green">
                        <span class="kpi-title">Low Risk Segment</span>
                        <span class="kpi-value">${formatNumber(summary.low_count || summary.low)}</span>
                        <span class="kpi-subtext">Healthy stable audience pool</span>
                    </div>
                `;
            }
        } catch (e) {
            console.error('Segments summary error:', e);
        }
    }

    // Tab 1: Directory Filter & Load
    elements.retDirApply?.addEventListener('click', () => {
        state.directory.page = 1;
        state.directory.search = elements.retDirSearch?.value.trim() || '';
        state.directory.subscription = elements.retDirSub?.value || '';
        state.directory.churn = elements.retDirChurn?.value || '';
        state.directory.risk = elements.retDirRisk?.value || '';
        state.directory.engagement = elements.retDirEngagement?.value || '';
        state.directory.sort = elements.retDirSort?.value || 'churn_probability';
        fetchRetentionDirectory();
    });

    elements.retDirClear?.addEventListener('click', () => {
        if (elements.retDirSearch) elements.retDirSearch.value = '';
        if (elements.retDirSub) elements.retDirSub.value = '';
        if (elements.retDirChurn) elements.retDirChurn.value = '';
        if (elements.retDirRisk) elements.retDirRisk.value = '';
        if (elements.retDirEngagement) elements.retDirEngagement.value = '';
        if (elements.retDirSort) elements.retDirSort.value = 'churn_probability';

        state.directory = {
            page: 1,
            per_page: 12,
            search: '',
            subscription: '',
            churn: '',
            risk: '',
            engagement: '',
            sort: 'churn_probability',
            order: 'desc'
        };
        fetchRetentionDirectory();
    });

    async function fetchRetentionDirectory() {
        try {
            showLoading();
            const params = new URLSearchParams({
                page: state.directory.page,
                per_page: state.directory.per_page,
                search: state.directory.search,
                subscription: state.directory.subscription,
                churn: state.directory.churn,
                risk: state.directory.risk,
                engagement: state.directory.engagement,
                sort: state.directory.sort,
                order: state.directory.order
            });

            const res = await fetch(`/api/customers?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            hideLoading();

            renderRetentionDirectory(data);
        } catch (err) {
            hideLoading();
            console.error('Failed to fetch subscribers:', err);
            showToast('Failed to load subscriber records', 'error');
        }
    }

    function renderRetentionDirectory(data) {
        if (!elements.retDirBody) return;

        const totalPages = data.pages || data.total_pages || 1;
        if (elements.retDirCount) {
            elements.retDirCount.textContent = `${formatNumber(data.total || 0)} subscribers found (Page ${data.page || 1} of ${totalPages})`;
        }

        if (!data.customers || !data.customers.length) {
            elements.retDirBody.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;">No matching subscribers found.</td></tr>`;
            if (elements.retDirPagination) elements.retDirPagination.innerHTML = '';
            return;
        }

        elements.retDirBody.innerHTML = data.customers.map(c => `
            <tr>
                <td>
                    <div class="customer-cell">
                        <span class="customer-name">${c.customer_name || 'Subscriber'}</span>
                        <span class="customer-id">${(c.customer_id || '').substring(0, 8)}...</span>
                    </div>
                </td>
                <td><span class="tag-badge">${c.subscription_type}</span></td>
                <td>${c.region || '—'}</td>
                <td>${Number(c.watch_hours || 0).toFixed(1)}h</td>
                <td>${formatCurrency(c.monthly_fee)}</td>
                <td><strong>${formatPercent(c.churn_probability)}</strong></td>
                <td>${getRiskBadge(c.risk_category)}</td>
                <td>${getEngagementBadge(c.engagement_level)}</td>
                <td><span class="status-badge ${c.churned ? 'churned' : 'active'}">${c.churned ? 'Churned' : 'Active'}</span></td>
                <td style="text-align:right;">
                    <button class="btn btn-ghost btn-sm view-cust-btn" data-id="${c.customer_id}">Profile</button>
                    <button class="btn btn-primary btn-sm action-cust-btn" data-id="${c.customer_id}" data-name="${c.customer_name || ''}" data-prob="${c.churn_probability}">Take Action</button>
                </td>
            </tr>
        `).join('');

        attachCustomerActionHandlers(elements.retDirBody);
        renderPagination(elements.retDirPagination, data.page, totalPages, (p) => {
            state.directory.page = p;
            fetchRetentionDirectory();
        });
    }

    // Tab 2: Action Tracker
    elements.retFilterActions?.addEventListener('click', () => {
        state.retentionActions.status = elements.retActionStatus?.value || '';
        state.retentionActions.page = 1;
        fetchRetentionActions();
    });

    async function fetchRetentionActions() {
        try {
            const params = new URLSearchParams({
                page: state.retentionActions.page,
                per_page: state.retentionActions.per_page,
                status: state.retentionActions.status
            });

            const res = await fetch(`/api/retention/actions?${params.toString()}`);
            const data = await res.json();
            renderRetentionActionsTable(data);
        } catch (err) {
            console.error('Error fetching retention actions:', err);
        }
    }

    function renderRetentionActionsTable(data) {
        if (!elements.retentionActionsBody) return;
        if (!data.actions || !data.actions.length) {
            elements.retentionActionsBody.innerHTML = '';
            elements.retActionsEmpty?.classList.remove('hidden');
            if (elements.retActionsPagination) elements.retActionsPagination.innerHTML = '';
            return;
        }

        elements.retActionsEmpty?.classList.add('hidden');
        elements.retentionActionsBody.innerHTML = data.actions.map(a => `
            <tr>
                <td>
                    <div class="customer-cell">
                        <span class="customer-name">${a.customer_name || 'Subscriber'}</span>
                        <span class="customer-id">${(a.customer_id || '').substring(0, 8)}...</span>
                    </div>
                </td>
                <td>
                    <strong>${a.action_type}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${a.description || ''}</div>
                </td>
                <td>
                    <select class="action-status-select" data-id="${a.id}" style="padding:0.25rem 0.5rem; background:var(--input-bg); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); color:var(--text-primary); font-size:0.8rem;">
                        <option value="New" ${a.status === 'New' ? 'selected' : ''}>New</option>
                        <option value="Planned" ${a.status === 'Planned' ? 'selected' : ''}>Planned</option>
                        <option value="In Progress" ${a.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Completed" ${a.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </td>
                <td style="max-width:240px; font-size:0.825rem; color:var(--text-secondary);">${a.notes || '—'}</td>
                <td style="font-size:0.75rem; color:var(--text-muted);">${new Date(a.created_at).toLocaleDateString()}</td>
                <td style="text-align:right;">
                    <button class="btn btn-danger btn-sm delete-action-btn" data-id="${a.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        // Status update handlers
        elements.retentionActionsBody.querySelectorAll('.action-status-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const actionId = sel.dataset.id;
                const newStatus = sel.value;
                try {
                    await fetch(`/api/retention/actions/${actionId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    showToast('Action status updated', 'success');
                } catch (err) {
                    showToast('Failed to update action status', 'error');
                }
            });
        });

        // Delete action handlers
        elements.retentionActionsBody.querySelectorAll('.delete-action-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const actionId = btn.dataset.id;
                if (!confirm('Are you sure you want to remove this retention action?')) return;
                try {
                    await fetch(`/api/retention/actions/${actionId}`, { method: 'DELETE' });
                    showToast('Retention action deleted', 'info');
                    fetchRetentionActions();
                } catch (err) {
                    showToast('Failed to delete action', 'error');
                }
            });
        });

        const totalPages = data.pages || data.total_pages || 1;
        renderPagination(elements.retActionsPagination, data.page, totalPages, (p) => {
            state.retentionActions.page = p;
            fetchRetentionActions();
        });
    }

    // =========================================================================
    // 5. MODEL INSIGHTS
    // =========================================================================
    async function fetchModelEvaluation() {
        try {
            showLoading();
            const res = await fetch('/api/model/evaluation');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            hideLoading();

            renderModelKpis(data.metrics || data);
            renderModelConfusionMatrix(data.confusion_matrix);
            renderModelRocCurve(data.roc_curve);
            renderModelFeatureImportance(data.feature_importances || data.feature_importance);
            renderModelInfoGrid(data.model_info);
        } catch (err) {
            hideLoading();
            console.error('Failed to load model evaluation:', err);
            showToast('Failed to load model insights', 'error');
        }
    }

    function renderModelKpis(metrics) {
        if (!elements.modelKpis || !metrics) return;
        elements.modelKpis.innerHTML = `
            <div class="kpi-card kpi-green">
                <span class="kpi-title">Accuracy</span>
                <span class="kpi-value">${formatPercent(metrics.accuracy)}</span>
                <span class="kpi-subtext">Overall correct classification</span>
            </div>
            <div class="kpi-card kpi-blue">
                <span class="kpi-title">Precision</span>
                <span class="kpi-value">${formatPercent(metrics.precision)}</span>
                <span class="kpi-subtext">Minimizes false alarms</span>
            </div>
            <div class="kpi-card kpi-purple">
                <span class="kpi-title">Recall</span>
                <span class="kpi-value">${formatPercent(metrics.recall)}</span>
                <span class="kpi-subtext">Catches true churners</span>
            </div>
            <div class="kpi-card kpi-amber">
                <span class="kpi-title">F1 Score</span>
                <span class="kpi-value">${formatPercent(metrics.f1 || metrics.f1_score)}</span>
                <span class="kpi-subtext">Harmonic balance</span>
            </div>
            <div class="kpi-card kpi-green">
                <span class="kpi-title">ROC-AUC</span>
                <span class="kpi-value">${Number(metrics.roc_auc).toFixed(4)}</span>
                <span class="kpi-subtext">Separation capability</span>
            </div>
        `;
    }

    function renderModelConfusionMatrix(cm) {
        if (!elements.confusionMatrix || !cm) return;
        const tn = cm.true_negative ?? cm.true_negatives ?? 0;
        const fp = cm.false_positive ?? cm.false_positives ?? 0;
        const fn = cm.false_negative ?? cm.false_negatives ?? 0;
        const tp = cm.true_positive ?? cm.true_positives ?? 0;

        elements.confusionMatrix.innerHTML = `
            <div class="cm-cell cm-correct">
                <span class="cm-label">True Negative (Active Retained)</span>
                <div class="cm-count">${formatNumber(tn)}</div>
                <span class="cm-desc">Subscribers correctly flagged active</span>
            </div>
            <div class="cm-cell cm-incorrect">
                <span class="cm-label">False Positive (False Alarm)</span>
                <div class="cm-count">${formatNumber(fp)}</div>
                <span class="cm-desc">Active users flagged to churn</span>
            </div>
            <div class="cm-cell cm-incorrect">
                <span class="cm-label">False Negative (Missed Churn)</span>
                <div class="cm-count">${formatNumber(fn)}</div>
                <span class="cm-desc">Silent churners missed</span>
            </div>
            <div class="cm-cell cm-correct">
                <span class="cm-label">True Positive (Correct Catch)</span>
                <div class="cm-count">${formatNumber(tp)}</div>
                <span class="cm-desc">Subscribers caught for intervention</span>
            </div>
        `;
    }

    function renderModelRocCurve(roc) {
        destroyChart('chart-roc');
        const ctxRoc = document.getElementById('chart-roc')?.getContext('2d');
        if (ctxRoc && roc?.fpr && roc?.tpr) {
            const points = roc.fpr.map((f, i) => ({ x: f, y: roc.tpr[i] }));
            state.charts['chart-roc'] = new Chart(ctxRoc, {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'Random Forest ROC',
                            data: points,
                            borderColor: CHART_COLORS.amber,
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            fill: true,
                            tension: 0.2,
                            pointRadius: 0,
                            borderWidth: 2
                        },
                        {
                            label: 'Random Chance (0.5 AUC)',
                            data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                            borderColor: 'rgba(255, 255, 255, 0.25)',
                            borderDash: [5, 5],
                            pointRadius: 0,
                            borderWidth: 1.5,
                            fill: false
                        }
                    ]
                },
                options: {
                    ...defaultChartOptions,
                    scales: {
                        x: {
                            type: 'linear',
                            min: 0,
                            max: 1,
                            title: { display: true, text: 'False Positive Rate', color: CHART_COLORS.text },
                            grid: { color: CHART_COLORS.grid },
                            ticks: { color: CHART_COLORS.text }
                        },
                        y: {
                            type: 'linear',
                            min: 0,
                            max: 1,
                            title: { display: true, text: 'True Positive Rate', color: CHART_COLORS.text },
                            grid: { color: CHART_COLORS.grid },
                            ticks: { color: CHART_COLORS.text }
                        }
                    }
                }
            });
        }
    }

    function renderModelFeatureImportance(importances) {
        destroyChart('chart-feature-imp');
        const ctxImp = document.getElementById('chart-feature-imp')?.getContext('2d');
        if (ctxImp && importances) {
            let sorted = [];
            if (Array.isArray(importances)) {
                sorted = importances.map(item => [item.feature, item.importance]);
            } else if (typeof importances === 'object') {
                sorted = Object.entries(importances).sort((a, b) => b[1] - a[1]);
            }

            sorted = sorted.slice(0, 10);
            const labels = sorted.map(s => s[0].replace(/_/g, ' '));
            const values = sorted.map(s => (s[1] * 100).toFixed(1));

            state.charts['chart-feature-imp'] = new Chart(ctxImp, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Gini Importance Score (%)',
                        data: values,
                        backgroundColor: CHART_COLORS.amber,
                        borderRadius: 4
                    }]
                },
                options: {
                    ...defaultChartOptions,
                    indexAxis: 'y',
                    scales: {
                        ...defaultChartOptions.scales,
                        x: { ...defaultChartOptions.scales.x, max: Math.max(...values) * 1.2 }
                    }
                }
            });
        }
    }

    function renderModelInfoGrid(info) {
        if (!elements.modelInfoGrid) return;
        const i = info || {};
        elements.modelInfoGrid.innerHTML = `
            <div class="info-row"><span>Algorithm</span><span>${i.algorithm || 'Random Forest Classifier'}</span></div>
            <div class="info-row"><span>Estimator Trees</span><span>${i.n_estimators || 100}</span></div>
            <div class="info-row"><span>Max Depth</span><span>${i.max_depth || 10}</span></div>
            <div class="info-row"><span>Engineered Features</span><span>${i.n_features_in || 29} dimensions</span></div>
            <div class="info-row"><span>Library</span><span>scikit-learn</span></div>
            <div class="info-row"><span>Saved Artifact</span><span>models/rf_model.pkl</span></div>
        `;
    }

    // =========================================================================
    // 6. REPORTS & EXPORTS (WITH PREVIEWS)
    // =========================================================================
    elements.exportCustomers?.addEventListener('click', () => {
        const sub = elements.reportSubFilter?.value || '';
        const risk = elements.reportRiskFilter?.value || '';
        const params = new URLSearchParams({ subscription: sub, risk: risk });
        window.location.href = `/api/export/customers?${params.toString()}`;
    });

    elements.previewCustomers?.addEventListener('click', async () => {
        try {
            showLoading();
            const sub = elements.reportSubFilter?.value || '';
            const risk = elements.reportRiskFilter?.value || '';
            const params = new URLSearchParams({ subscription: sub, risk: risk, per_page: 5 });
            const res = await fetch(`/api/customers?${params.toString()}`);
            const data = await res.json();
            hideLoading();

            const rows = (data.customers || []).map(c => `
                <tr>
                    <td>${c.customer_name}</td>
                    <td>${c.subscription_type}</td>
                    <td>${c.region}</td>
                    <td>${c.watch_hours}h</td>
                    <td>$${c.monthly_fee}</td>
                    <td><strong>${formatPercent(c.churn_probability)}</strong></td>
                    <td>${getRiskBadge(c.risk_category)}</td>
                </tr>
            `).join('');

            const bodyHtml = `
                <p class="text-muted" style="margin-bottom:1rem;">Previewing the first 5 records that will be included in the CSV download:</p>
                <div class="table-responsive">
                    <table class="data-table" style="font-size:0.8rem;">
                        <thead>
                            <tr><th>Name</th><th>Plan</th><th>Region</th><th>Watch</th><th>Fee</th><th>Churn Prob</th><th>Risk</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
            openModal('Dataset Preview: Subscriber Risk Export', bodyHtml, `<button class="btn btn-primary" onclick="document.getElementById('export-customers').click()">Download Full CSV</button>`);
        } catch (e) {
            hideLoading();
            showToast('Failed to preview export data', 'error');
        }
    });

    elements.exportRetention?.addEventListener('click', () => {
        window.location.href = '/api/export/retention';
    });

    elements.previewRetention?.addEventListener('click', async () => {
        try {
            showLoading();
            const res = await fetch('/api/retention/actions?per_page=5');
            const data = await res.json();
            hideLoading();

            const rows = (data.actions || []).map(a => `
                <tr>
                    <td>${a.customer_name}</td>
                    <td>${a.action_type}</td>
                    <td>${a.status}</td>
                    <td>${a.notes || '—'}</td>
                    <td>${new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');

            const bodyHtml = `
                <p class="text-muted" style="margin-bottom:1rem;">Previewing logged retention audit records:</p>
                <div class="table-responsive">
                    <table class="data-table" style="font-size:0.8rem;">
                        <thead><tr><th>Customer</th><th>Campaign</th><th>Status</th><th>Notes</th><th>Date</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="5" class="text-muted text-center">No actions logged yet</td></tr>'}</tbody>
                    </table>
                </div>
            `;
            openModal('Audit Preview: Retention Actions', bodyHtml, `<button class="btn btn-primary" onclick="document.getElementById('export-retention').click()">Download Full CSV</button>`);
        } catch (e) {
            hideLoading();
            showToast('Failed to preview retention data', 'error');
        }
    });

    elements.exportModel?.addEventListener('click', () => {
        window.location.href = '/api/export/model-report';
    });

    elements.previewModel?.addEventListener('click', async () => {
        try {
            showLoading();
            const res = await fetch('/api/model/evaluation');
            const data = await res.json();
            hideLoading();

            const m = data.metrics || data;
            const bodyHtml = `
                <p class="text-muted" style="margin-bottom:1rem;">Model validation scores and feature weights included in the export:</p>
                <div class="info-row"><span>Accuracy</span><span>${formatPercent(m.accuracy)}</span></div>
                <div class="info-row"><span>Precision</span><span>${formatPercent(m.precision)}</span></div>
                <div class="info-row"><span>Recall</span><span>${formatPercent(m.recall)}</span></div>
                <div class="info-row"><span>ROC-AUC</span><span>${Number(m.roc_auc).toFixed(4)}</span></div>
                <div class="info-row"><span>Algorithm</span><span>Random Forest (100 trees)</span></div>
            `;
            openModal('Report Preview: Model Governance', bodyHtml, `<button class="btn btn-primary" onclick="document.getElementById('export-model').click()">Download Full CSV</button>`);
        } catch (e) {
            hideLoading();
            showToast('Failed to preview report data', 'error');
        }
    });

    // =========================================================================
    // 7. SETTINGS & THRESHOLDS
    // =========================================================================
    async function fetchSettingsInfo() {
        try {
            const [healthRes, configRes] = await Promise.all([
                fetch('/api/health'),
                fetch('/api/config')
            ]);
            const health = await healthRes.json();
            const config = await configRes.json();
            state.config = config;

            if (elements.settingsDataset && config.dataset_info) {
                elements.settingsDataset.innerHTML = `
                    <div class="info-row"><span>Source Data</span><span>data/customer_churn.csv</span></div>
                    <div class="info-row"><span>Active Subscriber Pool</span><span>${formatNumber(config.dataset_info.rows)} records</span></div>
                    <div class="info-row"><span>Engineered Dimensions</span><span>${config.dataset_info.columns?.length || 15} features</span></div>
                    <div class="info-row"><span>Target Label</span><span>churned (0 = Active, 1 = Churned)</span></div>
                `;
            }

            if (elements.settingsModel) {
                elements.settingsModel.innerHTML = `
                    <div class="info-row"><span>Model Engine</span><span>${config.model_name || 'Random Forest Classifier'}</span></div>
                    <div class="info-row"><span>Preprocessor</span><span>StandardScaler + OneHotEncoder</span></div>
                    <div class="info-row"><span>Artifact Status</span><span>Trained & Serialized (.pkl)</span></div>
                `;
            }

            if (elements.settingsApi) {
                elements.settingsApi.innerHTML = `
                    <div class="info-row"><span>Platform Status</span><span style="color:var(--risk-low);">Online & Healthy</span></div>
                    <div class="info-row"><span>Model Weights Loaded</span><span>${health.model_loaded ? 'Yes' : 'No'}</span></div>
                    <div class="info-row"><span>Database Connected</span><span>${health.database_available ? 'Yes (retention.db)' : 'No'}</span></div>
                    <div class="info-row"><span>Platform Version</span><span>${config.version || '2.0.0'}</span></div>
                `;
            }

            updateThresholdInputs();
        } catch (err) {
            console.error('Settings fetch error:', err);
        }
    }

    function updateThresholdInputs() {
        if (!state.config || !state.config.risk_thresholds) return;
        const low = state.config.risk_thresholds.low_max || 0.40;
        const med = state.config.risk_thresholds.medium_max || 0.70;

        if (elements.thresholdLow) elements.thresholdLow.value = low;
        if (elements.thresholdMedium) elements.thresholdMedium.value = med;

        updateThresholdPreview(low, med);
    }

    function updateThresholdPreview(low, med) {
        if (!elements.thresholdPreview) return;
        elements.thresholdPreview.innerHTML = `
            <strong>Risk Classification Preview:</strong><br>
            • <span style="color:var(--risk-low); font-weight:600;">Low Risk:</span> 0% to ${(low * 100).toFixed(0)}% churn probability<br>
            • <span style="color:var(--risk-med); font-weight:600;">Medium Risk:</span> ${(low * 100).toFixed(0)}% to ${(med * 100).toFixed(0)}% churn probability<br>
            • <span style="color:var(--risk-high); font-weight:600;">High Risk:</span> Above ${(med * 100).toFixed(0)}% churn probability
        `;
    }

    elements.thresholdLow?.addEventListener('input', () => {
        updateThresholdPreview(parseFloat(elements.thresholdLow.value), parseFloat(elements.thresholdMedium.value));
    });

    elements.thresholdMedium?.addEventListener('input', () => {
        updateThresholdPreview(parseFloat(elements.thresholdLow.value), parseFloat(elements.thresholdMedium.value));
    });

    elements.saveThresholds?.addEventListener('click', async () => {
        const low = parseFloat(elements.thresholdLow.value);
        const med = parseFloat(elements.thresholdMedium.value);

        if (isNaN(low) || isNaN(med) || low <= 0 || med >= 1 || low >= med) {
            showToast('Invalid thresholds: ensure 0 < Low < Medium < 1.0', 'error');
            return;
        }

        try {
            showLoading();
            const res = await fetch('/api/config/thresholds', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ low_max: low, medium_max: med })
            });
            const data = await res.json();
            hideLoading();

            if (res.ok) {
                showToast('Thresholds updated successfully', 'success');
                state.config.risk_thresholds = data.risk_thresholds;
            } else {
                showToast(data.error || 'Failed to update thresholds', 'error');
            }
        } catch (err) {
            hideLoading();
            showToast('Failed to save thresholds', 'error');
        }
    });

    // =========================================================================
    // MODAL DIALOGS & ACTION HANDLERS
    // =========================================================================
    function openModal(title, bodyHtml, footerHtml = '') {
        if (!elements.modalOverlay) return;
        elements.modalTitle.textContent = title;
        elements.modalBody.innerHTML = bodyHtml;
        elements.modalFooter.innerHTML = footerHtml;
        elements.modalOverlay.classList.remove('hidden');
    }

    function closeModal() {
        if (!elements.modalOverlay) return;
        elements.modalOverlay.classList.add('hidden');
        elements.modalBody.innerHTML = '';
        elements.modalFooter.innerHTML = '';
    }

    elements.modalClose?.addEventListener('click', closeModal);
    elements.modalOverlay?.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) closeModal();
    });

    function attachCustomerActionHandlers(container) {
        if (!container) return;
        container.querySelectorAll('.view-cust-btn').forEach(btn => {
            btn.addEventListener('click', () => viewCustomerDetail(btn.dataset.id));
        });

        container.querySelectorAll('.action-cust-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                openRetentionActionModal(
                    btn.dataset.id,
                    btn.dataset.name,
                    btn.dataset.prob,
                    btn.dataset.act
                );
            });
        });
    }

    async function viewCustomerDetail(customerId) {
        try {
            showLoading();
            const res = await fetch(`/api/customers/${customerId}`);
            const data = await res.json();
            hideLoading();

            if (!res.ok) {
                showToast(data.error || 'Subscriber not found', 'error');
                return;
            }

            const c = data.customer;
            const bodyHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div>
                        <h4 style="font-size:1.25rem;">${c.customer_name || 'Subscriber'}</h4>
                        <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${c.customer_id}</span>
                    </div>
                    ${getRiskBadge(c.risk_category)}
                </div>

                <div class="kpi-grid kpi-grid-3" style="margin-bottom:1rem;">
                    <div class="kpi-card kpi-amber">
                        <span class="kpi-title">Churn Probability</span>
                        <span class="kpi-value">${formatPercent(c.churn_probability)}</span>
                    </div>
                    <div class="kpi-card kpi-purple">
                        <span class="kpi-title">Engagement Score</span>
                        <span class="kpi-value">${Number(c.engagement_score || 0).toFixed(0)}/100</span>
                    </div>
                    <div class="kpi-card kpi-blue">
                        <span class="kpi-title">Retention Priority</span>
                        <span class="kpi-value">${Number(c.priority_score || 0).toFixed(0)}/100</span>
                    </div>
                </div>

                <div class="profile-info" style="margin-bottom:1rem;">
                    <div class="profile-field">
                        <span class="profile-field-label">Plan Tier</span>
                        <span class="profile-field-value">${c.subscription_type} ($${c.monthly_fee}/mo)</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Region • Device</span>
                        <span class="profile-field-value">${c.region} • ${c.device}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Streaming Time</span>
                        <span class="profile-field-value">${Number(c.watch_hours).toFixed(1)}h total (${Number(c.avg_watch_time_per_day).toFixed(2)}h/day)</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Last Login Recency</span>
                        <span class="profile-field-value">${c.last_login_days} days ago</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Preferred Content</span>
                        <span class="profile-field-value">${c.favorite_genre}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Payment Gateway</span>
                        <span class="profile-field-value">${c.payment_method}</span>
                    </div>
                </div>

                <div style="background:var(--bg-surface-elevated); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                    <h5 style="margin-bottom:0.5rem; color:var(--text-primary);">AI Risk Factor Interpretation</h5>
                    <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.5;">${data.explanation}</p>
                </div>
            `;

            const footerHtml = `
                <button class="btn btn-ghost" id="modal-close-btn">Close</button>
                <button class="btn btn-primary" id="modal-action-btn">Log Retention Action</button>
            `;

            openModal('Subscriber Intelligence Profile', bodyHtml, footerHtml);

            document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
            document.getElementById('modal-action-btn')?.addEventListener('click', () => {
                closeModal();
                openRetentionActionModal(c.customer_id, c.customer_name, c.churn_probability);
            });
        } catch (err) {
            hideLoading();
            showToast('Failed to load subscriber details', 'error');
        }
    }

    function openRetentionActionModal(customerId, customerName, churnProb, suggestedAction) {
        const bodyHtml = `
            <div style="margin-bottom:1rem;">
                <p style="color:var(--text-secondary); font-size:0.85rem;">Schedule an intervention for <strong>${customerName || 'Subscriber'}</strong> (Risk: ${(Number(churnProb) * 100).toFixed(0)}%).</p>
            </div>
            <div class="modal-form-group">
                <label>Campaign / Intervention Type</label>
                <select id="modal-action-type">
                    <option value="Personalized Outreach">Personalized Outreach (Email / SMS)</option>
                    <option value="Curated Content Recommendation">Curated Content Recommendation</option>
                    <option value="Special Discount / Tier Downgrade">Special Discount / Tier Downgrade</option>
                    <option value="Re-engagement Newsletter">Re-engagement Newsletter Campaign</option>
                    <option value="VIP Support Check-in">VIP Support Check-in</option>
                </select>
            </div>
            <div class="modal-form-group">
                <label>Action Description / Recommended Tactic</label>
                <input type="text" id="modal-action-desc" value="${suggestedAction || 'Reach out with genre-specific recommendations'}">
            </div>
            <div class="modal-form-group">
                <label>Workflow Status</label>
                <select id="modal-action-status">
                    <option value="New">New</option>
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                </select>
            </div>
            <div class="modal-form-group">
                <label>Operational Notes</label>
                <textarea id="modal-action-notes" placeholder="Enter campaign details or agent notes..."></textarea>
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-ghost" id="modal-action-cancel">Cancel</button>
            <button class="btn btn-primary" id="modal-action-submit">Create Action</button>
        `;

        openModal('Initiate Retention Action', bodyHtml, footerHtml);

        document.getElementById('modal-action-cancel')?.addEventListener('click', closeModal);
        document.getElementById('modal-action-submit')?.addEventListener('click', async () => {
            const actionType = document.getElementById('modal-action-type').value;
            const desc = document.getElementById('modal-action-desc').value;
            const status = document.getElementById('modal-action-status').value;
            const notes = document.getElementById('modal-action-notes').value;

            try {
                showLoading();
                const res = await fetch('/api/retention/actions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_id: customerId,
                        customer_name: customerName,
                        action_type: actionType,
                        description: desc,
                        status: status,
                        notes: notes,
                        churn_probability: churnProb
                    })
                });
                hideLoading();

                if (res.ok) {
                    showToast('Retention action scheduled successfully', 'success');
                    closeModal();
                    if (state.currentPage === 'retention') fetchRetentionActions();
                } else {
                    const errData = await res.json();
                    showToast(errData.error || 'Failed to schedule action', 'error');
                }
            } catch (err) {
                hideLoading();
                showToast('Failed to schedule retention action', 'error');
            }
        });
    }

    // =========================================================================
    // PAGINATION GENERATOR
    // =========================================================================
    function renderPagination(container, currentPage, totalPages, onPageChange) {
        if (!container) return;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-p="${currentPage - 1}">‹</button>
        `;

        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);

        if (start > 1) {
            html += `<button class="page-btn" data-p="1">1</button>`;
            if (start > 2) html += `<span style="color:var(--text-muted); padding:0 4px;">...</span>`;
        }

        for (let p = start; p <= end; p++) {
            html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-p="${p}">${p}</button>`;
        }

        if (end < totalPages) {
            if (end < totalPages - 1) html += `<span style="color:var(--text-muted); padding:0 4px;">...</span>`;
            html += `<button class="page-btn" data-p="${totalPages}">${totalPages}</button>`;
        }

        html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-p="${currentPage + 1}">›</button>
        `;

        container.innerHTML = html;

        container.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.p, 10);
                if (p && p !== currentPage) onPageChange(p);
            });
        });
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    checkHealthAndConfig();
    navigateTo('overview');
});
