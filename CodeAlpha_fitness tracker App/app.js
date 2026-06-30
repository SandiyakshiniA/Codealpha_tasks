/* ==========================================================================
   AuraFit App Logic & LocalStorage Management
   ========================================================================== */

// --- Global App State & Fallback Store ---
let appState = {
    goals: {
        steps: 10000,
        caloriesBurn: 500,
        water: 2500,
        activeTime: 60,
        caloriesIntake: 2500
    },
    profile: {
        name: "Active User",
        weight: 70,
        height: 175
    },
    logs: [] // Array of all logs: { id, date, timestamp, category, type, value, calories, extra }
};

// Track current view analytics range
let currentAnalyticsRange = 7; // 7 or 30 days

// Track Chart.js instances to destroy/re-render cleanly
let charts = {
    stepsTrend: null,
    calorieComparison: null,
    workoutDistribution: null,
    sleepTrend: null
};

// Celebration locks for today to avoid spamming confetti
let celebratedGoalsToday = {
    steps: false,
    water: false,
    caloriesBurn: false,
    activeTime: false
};

// Calorie estimate factors per minute based on intensity/activity type
const CALORIE_FACTORS = {
    "Running": { low: 8, medium: 11, high: 15 },
    "Walking": { low: 3, medium: 4, high: 6 },
    "Cycling": { low: 6, medium: 8, high: 11 },
    "Strength Training": { low: 4, medium: 6, high: 9 },
    "Cardio HIIT": { low: 9, medium: 12, high: 16 },
    "Yoga": { low: 2, medium: 3, high: 5 },
    "Swimming": { low: 7, medium: 9, high: 13 },
    "Sports": { low: 6, medium: 8, high: 12 },
    "Other": { low: 4, medium: 5, high: 8 }
};

// --- Helper Date Utilities ---
function getFormattedDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayDateString() {
    return getFormattedDate(new Date());
}

function formatTimeString(dateObj) {
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// --- Data Storage Interface (LocalStorage with Memory Fallback) ---
function loadData() {
    try {
        const storedGoals = localStorage.getItem('aurafit_goals');
        const storedProfile = localStorage.getItem('aurafit_profile');
        const storedLogs = localStorage.getItem('aurafit_logs');
        
        if (storedGoals) appState.goals = JSON.parse(storedGoals);
        if (storedProfile) appState.profile = JSON.parse(storedProfile);
        if (storedLogs) {
            appState.logs = JSON.parse(storedLogs);
        } else {
            // No logs exist, seed dummy metrics automatically for a beautiful initial experience
            seedDummyData(30);
        }
    } catch (e) {
        console.warn("LocalStorage access failed. AuraFit is running in in-memory mode.", e);
        // Fallback: seed in memory
        seedDummyData(30);
    }
}

function saveData() {
    try {
        localStorage.setItem('aurafit_goals', JSON.stringify(appState.goals));
        localStorage.setItem('aurafit_profile', JSON.stringify(appState.profile));
        localStorage.setItem('aurafit_logs', JSON.stringify(appState.logs));
    } catch (e) {
        console.error("Failed to write to LocalStorage.", e);
    }
}

// --- Dummy Data Seeding (Past X Days) ---
function seedDummyData(daysCount = 30) {
    const generatedLogs = [];
    const today = new Date();
    
    const workoutTypes = ["Running", "Strength Training", "Cycling", "Yoga", "Cardio HIIT", "Walking"];
    const foods = {
        Breakfast: [
            { name: "Oatmeal with Almonds", kcal: 320 },
            { name: "Scrambled Eggs & Toast", kcal: 380 },
            { name: "Protein Smoothie Bowl", kcal: 410 }
        ],
        Lunch: [
            { name: "Grilled Chicken Salad", kcal: 450 },
            { name: "Quinoa Wrap & Hummus", kcal: 520 },
            { name: "Salmon with Asparagus", kcal: 580 }
        ],
        Dinner: [
            { name: "Baked Salmon & Sweet Potato", kcal: 620 },
            { name: "Stir-fry Tofu & Rice", kcal: 480 },
            { name: "Lean Turkey Pasta", kcal: 680 }
        ],
        Snack: [
            { name: "Mixed Berries & Greek Yogurt", kcal: 180 },
            { name: "Protein Bar", kcal: 220 },
            { name: "Apple slices with Peanut Butter", kcal: 200 }
        ]
    };

    for (let i = daysCount - 1; i >= 0; i--) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        const dateStr = getFormattedDate(targetDate);
        
        // Skip seeding today fully if it's already logged, or seed minor steps/water
        const isToday = i === 0;

        // 1. Seed Steps
        const stepsCount = isToday ? Math.floor(Math.random() * 4000) + 1500 : Math.floor(Math.random() * 7000) + 5500;
        generatedLogs.push({
            id: `seed-steps-${dateStr}`,
            date: dateStr,
            timestamp: "21:00",
            category: "steps",
            type: "Steps Walked",
            value: stepsCount,
            calories: Math.floor(stepsCount * 0.04), // roughly 0.04 kcal per step
            extra: null
        });

        // 2. Seed Water Intake
        const waterMl = isToday ? 750 : Math.floor(Math.random() * 6) * 500 + 1000; // 1000ml to 3500ml
        if (waterMl > 0) {
            generatedLogs.push({
                id: `seed-water-${dateStr}`,
                date: dateStr,
                timestamp: "18:00",
                category: "water",
                type: "Water Hydration",
                value: waterMl,
                calories: 0,
                extra: null
            });
        }

        // 3. Seed Workouts (approx. 5 days a week)
        if (isToday || Math.random() > 0.3) {
            const randomWorkout = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
            const duration = Math.floor(Math.random() * 30) + 20; // 20 - 50 mins
            const intensity = ["low", "medium", "high"][Math.floor(Math.random() * 3)];
            const caloriesBurned = Math.floor(duration * CALORIE_FACTORS[randomWorkout][intensity]);
            
            generatedLogs.push({
                id: `seed-workout-${dateStr}`,
                date: dateStr,
                timestamp: "07:30",
                category: "workout",
                type: randomWorkout,
                value: duration,
                calories: caloriesBurned,
                extra: intensity.toUpperCase()
            });
        }

        // 4. Seed Food Meals
        const mealCats = ["Breakfast", "Lunch", "Dinner", "Snack"];
        mealCats.forEach(cat => {
            if (isToday && cat === "Dinner") return; // Skip dinner for today's seed
            if (Math.random() > 0.15) { // 85% chance of logging meal
                const mealOptions = foods[cat];
                const selectedFood = mealOptions[Math.floor(Math.random() * mealOptions.length)];
                
                generatedLogs.push({
                    id: `seed-food-${cat}-${dateStr}`,
                    date: dateStr,
                    timestamp: cat === "Breakfast" ? "08:15" : cat === "Lunch" ? "13:00" : cat === "Dinner" ? "19:30" : "16:00",
                    category: "food",
                    type: selectedFood.name,
                    value: cat, // Category stored in value
                    calories: selectedFood.kcal,
                    extra: null
                });
            }
        });

        // 5. Seed Sleep
        const sleepDuration = isToday ? 0 : parseFloat((Math.random() * 3.5 + 5.5).toFixed(1)); // 5.5 to 9.0 hours
        if (sleepDuration > 0) {
            const sleepQualities = ["Poor", "Fair", "Good", "Excellent"];
            const sleepQual = sleepDuration > 8 ? "Excellent" : sleepDuration > 7 ? "Good" : sleepDuration > 6 ? "Fair" : "Poor";
            
            generatedLogs.push({
                id: `seed-sleep-${dateStr}`,
                date: dateStr,
                timestamp: "07:00",
                category: "lifestyle",
                type: "Night Sleep",
                value: sleepDuration,
                calories: 0,
                extra: sleepQual
            });
        }
    }

    appState.logs = generatedLogs;
    saveData();
}

// --- Celebrate Accomplishments (Confetti Effect) ---
function triggerConfetti() {
    if (typeof confetti === 'function') {
        // Center splash
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#06b6d4', '#f43f5e', '#a855f7', '#10b981']
        });
        
        // Side bursts
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
        }, 150);
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });
        }, 250);
    }
}

// Check if thresholds are crossed and run confetti
function evaluateGoalMilestones(oldVals, newVals) {
    const goals = appState.goals;
    let celebrated = false;

    // Check steps
    if (!celebratedGoalsToday.steps && oldVals.steps < goals.steps && newVals.steps >= goals.steps) {
        celebratedGoalsToday.steps = true;
        celebrated = true;
    }
    // Check water
    if (!celebratedGoalsToday.water && oldVals.water < goals.water && newVals.water >= goals.water) {
        celebratedGoalsToday.water = true;
        celebrated = true;
    }
    // Check calories burn
    if (!celebratedGoalsToday.caloriesBurn && oldVals.caloriesBurned < goals.caloriesBurn && newVals.caloriesBurned >= goals.caloriesBurn) {
        celebratedGoalsToday.caloriesBurn = true;
        celebrated = true;
    }
    // Check active duration
    if (!celebratedGoalsToday.activeTime && oldVals.activeTime < goals.activeTime && newVals.activeTime >= goals.activeTime) {
        celebratedGoalsToday.activeTime = true;
        celebrated = true;
    }

    if (celebrated) {
        triggerConfetti();
    }
}

// --- Metrics Calculations ---
function getDailyAggregates(dateStr) {
    const dayLogs = appState.logs.filter(log => log.date === dateStr);
    
    let steps = 0;
    let water = 0;
    let caloriesBurned = 0;
    let activeTime = 0;
    let caloriesConsumed = 0;
    let sleepHours = 0;

    dayLogs.forEach(log => {
        if (log.category === "steps") {
            steps += log.value;
            caloriesBurned += log.calories || 0;
        } else if (log.category === "water") {
            water += log.value;
        } else if (log.category === "workout") {
            activeTime += log.value;
            caloriesBurned += log.calories || 0;
        } else if (log.category === "food") {
            caloriesConsumed += log.calories || 0;
        } else if (log.category === "lifestyle" && log.type === "Night Sleep") {
            sleepHours += log.value;
        }
    });

    return { steps, water, caloriesBurned, activeTime, caloriesConsumed, sleepHours };
}

// --- UI Rendering Engine ---

// Navigation Tab Management
function switchTab(tabId) {
    // Update menu links styling
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update active tab display
    document.querySelectorAll('.tab-pane').forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // Run chart updates if switching to Analytics tab
    if (tabId === 'analytics') {
        renderCharts();
    }
}

// Refresh Dashboard Panel
function refreshDashboard() {
    const today = getTodayDateString();
    
    // Cache previous states to evaluate milestones
    const stepsField = document.getElementById('metric-steps');
    const waterField = document.getElementById('metric-water');
    const burnField = document.getElementById('metric-calories-burned');
    const activeField = document.getElementById('metric-active-time');

    const oldVals = {
        steps: parseInt(stepsField.innerText.replace(/,/g, '')) || 0,
        water: parseInt(waterField.innerText.replace(/,/g, '')) || 0,
        caloriesBurned: parseInt(burnField.innerText.replace(/,/g, '')) || 0,
        activeTime: parseInt(activeField.innerText.replace(/,/g, '')) || 0
    };

    const aggregates = getDailyAggregates(today);
    const goals = appState.goals;

    // 1. Render Values on Cards
    stepsField.innerText = aggregates.steps.toLocaleString();
    document.getElementById('goal-steps-val').innerText = goals.steps.toLocaleString();
    
    burnField.innerText = aggregates.caloriesBurned.toLocaleString();
    
    waterField.innerText = aggregates.water.toLocaleString();
    document.getElementById('goal-water-val').innerText = goals.water.toLocaleString();
    
    activeField.innerText = aggregates.activeTime.toLocaleString();
    document.getElementById('goal-active-val').innerText = goals.activeTime.toLocaleString();

    // 2. Compute percentages and render progress bars
    const stepsPct = Math.min(100, Math.round((aggregates.steps / goals.steps) * 100)) || 0;
    const burnPct = Math.min(100, Math.round((aggregates.caloriesBurned / goals.caloriesBurn) * 100)) || 0;
    const waterPct = Math.min(100, Math.round((aggregates.water / goals.water) * 100)) || 0;
    const activePct = Math.min(100, Math.round((aggregates.activeTime / goals.activeTime) * 100)) || 0;

    document.getElementById('steps-progress-bar').style.width = `${stepsPct}%`;
    document.getElementById('steps-percentage').innerText = `${stepsPct}% of goal`;

    document.getElementById('calories-burned-progress-bar').style.width = `${burnPct}%`;
    document.getElementById('calories-burned-percentage').innerText = `${burnPct}% of goal`;

    document.getElementById('water-progress-bar').style.width = `${waterPct}%`;
    document.getElementById('water-percentage').innerText = `${waterPct}% of goal`;

    document.getElementById('active-time-progress-bar').style.width = `${activePct}%`;
    document.getElementById('active-time-percentage').innerText = `${activePct}% of goal`;

    // 3. Calorie balance values
    document.getElementById('balance-consumed').innerText = `${aggregates.caloriesConsumed.toLocaleString()} kcal`;
    document.getElementById('balance-burned').innerText = `${aggregates.caloriesBurned.toLocaleString()} kcal`;
    
    const netCalories = aggregates.caloriesConsumed - aggregates.caloriesBurned;
    const netField = document.getElementById('balance-net');
    netField.innerText = (netCalories > 0 ? '+' : '') + netCalories.toLocaleString();
    
    if (netCalories > 0) {
        netField.style.color = '#fbbf24'; // Warning amber if in caloric surplus
    } else {
        netField.style.color = 'var(--clr-intake)'; // Nice green if neutral/deficit
    }

    document.getElementById('balance-budget-text').innerText = `${aggregates.caloriesConsumed.toLocaleString()} / ${goals.caloriesIntake.toLocaleString()} kcal`;
    const budgetPct = Math.min(100, Math.round((aggregates.caloriesConsumed / goals.caloriesIntake) * 100)) || 0;
    document.getElementById('budget-progress-bar').style.width = `${budgetPct}%`;

    // 4. Update Header date greeting
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-str').innerText = new Date().toLocaleDateString('en-US', options);

    // 5. Update user name
    document.getElementById('user-display-name').innerText = appState.profile.name;
    const hours = new Date().getHours();
    const greetTitle = document.getElementById('greeting-title');
    if (hours < 12) greetTitle.innerText = `Good Morning, ${appState.profile.name}!`;
    else if (hours < 17) greetTitle.innerText = `Good Afternoon, ${appState.profile.name}!`;
    else greetTitle.innerText = `Good Evening, ${appState.profile.name}!`;

    // 6. Draw Dashboard Recent Logs List
    renderDashboardLogs(today);

    // 7. Check if user achieved goal targets to shoot confetti
    evaluateGoalMilestones(oldVals, aggregates);
}

// Render the 5 most recent activities on dashboard
function renderDashboardLogs(dateStr) {
    const listContainer = document.getElementById('dashboard-recent-list');
    const dayLogs = appState.logs.filter(log => log.date === dateStr);
    
    // Sort chronological descending (latest first)
    dayLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (dayLogs.length === 0) {
        listContainer.innerHTML = `<li class="empty-state">No activities logged for today yet. Make a start!</li>`;
        return;
    }

    listContainer.innerHTML = dayLogs.slice(0, 5).map(log => {
        let iconHtml = '';
        let displayVal = '';
        
        switch (log.category) {
            case 'steps':
                iconHtml = `<div class="log-icon steps"><i class="fa-solid fa-shoe-prints"></i></div>`;
                displayVal = `<span class="log-val positive">+${log.value.toLocaleString()} steps</span>`;
                break;
            case 'workout':
                iconHtml = `<div class="log-icon workout"><i class="fa-solid fa-dumbbell"></i></div>`;
                displayVal = `<span class="log-val negative">-${log.calories} kcal</span>`;
                break;
            case 'water':
                iconHtml = `<div class="log-icon water"><i class="fa-solid fa-droplet"></i></div>`;
                displayVal = `<span class="log-val positive">+${log.value} ml</span>`;
                break;
            case 'food':
                iconHtml = `<div class="log-icon food"><i class="fa-solid fa-utensils"></i></div>`;
                displayVal = `<span class="log-val positive">+${log.calories} kcal</span>`;
                break;
            case 'lifestyle':
                const labelIcon = log.type.includes("Sleep") ? "bed" : "heart";
                iconHtml = `<div class="log-icon lifestyle"><i class="fa-solid fa-${labelIcon}"></i></div>`;
                displayVal = `<span class="log-val">${log.value} hrs</span>`;
                break;
        }

        return `
            <li>
                <div class="list-left">
                    ${iconHtml}
                    <div class="log-desc">
                        <span class="log-title">${log.type}</span>
                        <span class="log-time">${log.timestamp} ${log.extra ? `• ${log.extra}` : ''}</span>
                    </div>
                </div>
                <div class="list-right">
                    ${displayVal}
                    <button class="delete-log-btn" onclick="deleteLogItem('${log.id}')" title="Delete Log">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </li>
        `;
    }).join('');
}

// Refresh Detailed History Logs Table in the Log Tab
function refreshHistoryLogsTable() {
    const tbody = document.getElementById('history-log-tbody');
    const today = getTodayDateString();
    
    const dayLogs = appState.logs.filter(log => log.date === today);
    // Sort latest first
    dayLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (dayLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No entries registered for today.</td></tr>`;
        return;
    }

    tbody.innerHTML = dayLogs.map(log => {
        let badgeClass = 'steps-badge';
        let valString = '';
        let detailString = '';

        if (log.category === 'steps') {
            badgeClass = 'steps-badge';
            valString = `${log.value.toLocaleString()} steps`;
            detailString = `${log.calories} kcal burned`;
        } else if (log.category === 'workout') {
            badgeClass = 'workout-badge';
            valString = `${log.value} mins`;
            detailString = `${log.calories} kcal burned (${log.extra})`;
        } else if (log.category === 'water') {
            badgeClass = 'water-badge';
            valString = `${log.value} ml`;
            detailString = 'Hydration';
        } else if (log.category === 'food') {
            badgeClass = 'food-badge';
            valString = `${log.calories} kcal`;
            detailString = `${log.value} category`;
        } else if (log.category === 'lifestyle') {
            badgeClass = 'lifestyle-badge';
            valString = `${log.value} hours`;
            detailString = `Sleep quality: ${log.extra || 'N/A'}`;
        }

        return `
            <tr>
                <td><strong>${log.timestamp}</strong></td>
                <td><span class="table-category-badge ${badgeClass}">${log.category.toUpperCase()}</span></td>
                <td>${log.type}</td>
                <td>${valString}</td>
                <td>
                    <button class="delete-log-btn" onclick="deleteLogItem('${log.id}')" style="padding: 2px 6px;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Refresh Goals & Settings Forms
function refreshSettings() {
    const goals = appState.goals;
    const profile = appState.profile;

    // Fill goals inputs
    document.getElementById('set-steps-goal').value = goals.steps;
    document.getElementById('set-calories-burn-goal').value = goals.caloriesBurn;
    document.getElementById('set-water-goal').value = goals.water;
    document.getElementById('set-active-goal').value = goals.activeTime;
    document.getElementById('set-calories-intake-goal').value = goals.caloriesIntake;

    // Fill profile inputs
    document.getElementById('profile-name').value = profile.name;
    document.getElementById('profile-weight').value = profile.weight || '';
    document.getElementById('profile-height').value = profile.height || '';
}

// --- Data Mutators ---

function addLog(category, type, value, calories = 0, extra = null) {
    const now = new Date();
    const newLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: getTodayDateString(),
        timestamp: formatTimeString(now),
        category: category,
        type: type,
        value: Number(value),
        calories: Math.round(Number(calories)),
        extra: extra
    };

    appState.logs.push(newLog);
    saveData();
    
    // Update local widgets
    refreshDashboard();
    refreshHistoryLogsTable();
}

function deleteLogItem(logId) {
    appState.logs = appState.logs.filter(log => log.id !== logId);
    saveData();
    refreshDashboard();
    refreshHistoryLogsTable();
    // If user deleted logs inside analytics tab, re-render charts
    if (document.getElementById('analytics').classList.contains('active')) {
        renderCharts();
    }
}

// Inline quick adjusts
function adjustSteps(amount) {
    const today = getTodayDateString();
    
    // Find if we already have a manual steps log for today to aggregate it, or create a new one
    const todayStepsLog = appState.logs.find(log => log.date === today && log.category === 'steps');
    
    if (todayStepsLog) {
        todayStepsLog.value += amount;
        todayStepsLog.calories = Math.round(todayStepsLog.value * 0.04);
        todayStepsLog.timestamp = formatTimeString(new Date());
    } else {
        appState.logs.push({
            id: `log-steps-${Date.now()}`,
            date: today,
            timestamp: formatTimeString(new Date()),
            category: 'steps',
            type: 'Steps Walked',
            value: amount,
            calories: Math.round(amount * 0.04),
            extra: null
        });
    }
    
    saveData();
    refreshDashboard();
    refreshHistoryLogsTable();
}

function adjustWater(amount) {
    const today = getTodayDateString();
    const todayWaterLog = appState.logs.find(log => log.date === today && log.category === 'water');
    
    if (todayWaterLog) {
        todayWaterLog.value += amount;
        todayWaterLog.timestamp = formatTimeString(new Date());
    } else {
        appState.logs.push({
            id: `log-water-${Date.now()}`,
            date: today,
            timestamp: formatTimeString(new Date()),
            category: 'water',
            type: 'Water Hydration',
            value: amount,
            calories: 0,
            extra: null
        });
    }
    
    saveData();
    refreshDashboard();
    refreshHistoryLogsTable();
}

// --- ChartJS Integration ---
function renderCharts() {
    // 1. Gather date range lists
    const dates = [];
    const today = new Date();
    
    for (let i = currentAnalyticsRange - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(getFormattedDate(d));
    }

    // 2. Prepare aggregated data for labels & values
    const stepsData = [];
    const calorieIntakeData = [];
    const calorieBurnedData = [];
    const sleepHoursData = [];

    dates.forEach(dateStr => {
        const dayAggs = getDailyAggregates(dateStr);
        stepsData.push(dayAggs.steps);
        calorieIntakeData.push(dayAggs.caloriesConsumed);
        calorieBurnedData.push(dayAggs.caloriesBurned);
        sleepHoursData.push(dayAggs.sleepHours);
    });

    // Labels for charts (e.g. "Mon 15", "Tue 16")
    const chartLabels = dates.map(dateStr => {
        const parts = dateStr.split('-');
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        return dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    });

    // 3. Render Chart 1: Steps Trend
    const ctxSteps = document.getElementById('stepsTrendChart').getContext('2d');
    if (charts.stepsTrend) charts.stepsTrend.destroy();
    
    // Average step count
    const stepsAvg = Math.round(stepsData.reduce((a, b) => a + b, 0) / stepsData.length) || 0;
    document.getElementById('chart-steps-avg').innerText = `Avg: ${stepsAvg.toLocaleString()} steps/day`;

    const stepsGradient = ctxSteps.createLinearGradient(0, 0, 0, 200);
    stepsGradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
    stepsGradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

    charts.stepsTrend = new Chart(ctxSteps, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Steps',
                data: stepsData,
                borderColor: '#6366f1',
                borderWidth: 3,
                backgroundColor: stepsGradient,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#818cf8',
                pointBorderColor: '#080914',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 4. Render Chart 2: Calorie intake vs Burned
    const ctxCal = document.getElementById('calorieComparisonChart').getContext('2d');
    if (charts.calorieComparison) charts.calorieComparison.destroy();

    const netCaloriesSum = calorieIntakeData.map((val, idx) => val - calorieBurnedData[idx]);
    const avgNetCalories = Math.round(netCaloriesSum.reduce((a, b) => a + b, 0) / netCaloriesSum.length) || 0;
    document.getElementById('chart-calorie-summary').innerText = `Avg Net: ${avgNetCalories > 0 ? '+' : ''}${avgNetCalories.toLocaleString()} kcal`;

    charts.calorieComparison = new Chart(ctxCal, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Consumed',
                    data: calorieIntakeData,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Burned',
                    data: calorieBurnedData,
                    backgroundColor: 'rgba(244, 63, 94, 0.75)',
                    borderColor: '#f43f5e',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    position: 'top', 
                    labels: { color: '#f8fafc', boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } } 
                } 
            },
            scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 5. Render Chart 3: Workout formats distribution (pie)
    const ctxWorkout = document.getElementById('workoutDistributionChart').getContext('2d');
    if (charts.workoutDistribution) charts.workoutDistribution.destroy();

    // Map workout distribution
    const workoutCount = {};
    let totalWorkouts = 0;
    
    // Filter logs in range
    appState.logs.forEach(log => {
        if (log.category === 'workout' && dates.includes(log.date)) {
            workoutCount[log.type] = (workoutCount[log.type] || 0) + 1;
            totalWorkouts++;
        }
    });

    document.getElementById('chart-workouts-count').innerText = `Total: ${totalWorkouts} sessions`;

    const workoutTypes = Object.keys(workoutCount);
    const workoutFreqs = Object.values(workoutCount);

    if (totalWorkouts === 0) {
        // Draw standard empty placeholder doughnut
        charts.workoutDistribution = new Chart(ctxWorkout, {
            type: 'doughnut',
            data: {
                labels: ['No Workouts'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(255, 255, 255, 0.05)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
            }
        });
    } else {
        charts.workoutDistribution = new Chart(ctxWorkout, {
            type: 'doughnut',
            data: {
                labels: workoutTypes,
                datasets: [{
                    data: workoutFreqs,
                    backgroundColor: [
                        '#f43f5e', // Rose
                        '#8b5cf6', // Violet
                        '#06b6d4', // Cyan
                        '#eab308', // Yellow
                        '#3b82f6', // Blue
                        '#10b981', // Emerald
                        '#f97316'  // Orange
                    ],
                    borderWidth: 2,
                    borderColor: '#0b0d19'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { color: '#f8fafc', boxWidth: 10, font: { family: 'Plus Jakarta Sans', size: 10 } } 
                    } 
                }
            }
        });
    }

    // 6. Render Chart 4: Sleep trend
    const ctxSleep = document.getElementById('sleepTrendChart').getContext('2d');
    if (charts.sleepTrend) charts.sleepTrend.destroy();

    const sleepAvg = parseFloat((sleepHoursData.reduce((a, b) => a + b, 0) / sleepHoursData.length).toFixed(1)) || 0;
    document.getElementById('chart-sleep-avg').innerText = `Avg: ${sleepAvg} hrs/night`;

    charts.sleepTrend = new Chart(ctxSleep, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Sleep Duration',
                data: sleepHoursData,
                borderColor: '#a855f7',
                borderWidth: 2.5,
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.2,
                pointBackgroundColor: '#c084fc',
                pointBorderColor: '#080914',
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 12, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// --- Form Submissions and Interaction Handlers ---

// Quick log modal controls
const modalEl = document.getElementById('quick-log-modal');
document.getElementById('open-log-modal-btn').addEventListener('click', () => {
    modalEl.classList.add('open');
});
document.getElementById('close-modal-btn').addEventListener('click', () => {
    modalEl.classList.remove('open');
});
modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) modalEl.classList.remove('open');
});

// Navigation menu listener
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = link.getAttribute('data-tab');
        switchTab(tabId);
    });
});

// Quick Action to launch form from modal
function triggerQuickForm(category) {
    modalEl.classList.remove('open');
    switchTab('log-activity');
    
    // Focus the relevant form card
    let elementToFocus = null;
    if (category === 'workout') elementToFocus = document.getElementById('workout-type');
    else if (category === 'food') elementToFocus = document.getElementById('food-name');
    else if (category === 'water' || category === 'steps') elementToFocus = document.getElementById('manual-steps');

    if (elementToFocus) {
        setTimeout(() => {
            elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
            elementToFocus.focus();
        }, 300);
    }
}

// Calorie estimate updates on selecting workout type/duration
const workoutTypeSelect = document.getElementById('workout-type');
const workoutDurationInput = document.getElementById('workout-duration');
const workoutCaloriesInput = document.getElementById('workout-calories');

function autoCalcWorkoutCalories() {
    const selectedType = workoutTypeSelect.value;
    const duration = parseInt(workoutDurationInput.value);
    
    if (selectedType && duration > 0) {
        // Read active intensity
        const intensity = document.querySelector('input[name="workout-intensity"]:checked').value || 'medium';
        const factor = CALORIE_FACTORS[selectedType]?.[intensity] || 5;
        workoutCaloriesInput.value = Math.round(duration * factor);
    }
}

workoutTypeSelect.addEventListener('change', autoCalcWorkoutCalories);
workoutDurationInput.addEventListener('input', autoCalcWorkoutCalories);
document.querySelectorAll('input[name="workout-intensity"]').forEach(radio => {
    radio.addEventListener('change', autoCalcWorkoutCalories);
});

// Workout Form Submission
document.getElementById('workout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = workoutTypeSelect.value;
    const duration = parseInt(workoutDurationInput.value);
    const calories = parseInt(workoutCaloriesInput.value);
    const intensity = document.querySelector('input[name="workout-intensity"]:checked').value.toUpperCase();
    const notes = document.getElementById('workout-notes').value.trim();

    addLog('workout', type, duration, calories, `${intensity}${notes ? ` - ${notes}` : ''}`);
    
    // Reset form
    e.target.reset();
    document.getElementById('int-med').checked = true; // reset intensity to medium
    triggerSuccessCelebration();
});

// Food Form Submission
document.getElementById('food-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('food-name').value.trim();
    const calories = parseInt(document.getElementById('food-calories').value);
    const meal = document.getElementById('meal-type').value;

    addLog('food', name, meal, calories, null);

    e.target.reset();
    triggerSuccessCelebration();
});

// Lifestyle Form Submission (Steps & Sleep)
document.getElementById('lifestyle-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const sleepHours = parseFloat(document.getElementById('sleep-hours').value);
    const sleepQual = document.getElementById('sleep-quality').value;

    if (sleepHours > 0) {
        addLog('lifestyle', 'Night Sleep', sleepHours, 0, sleepQual || 'Good');
    }

    e.target.reset();
    triggerSuccessCelebration();
});

// Manual steps quick submit button
document.getElementById('manual-steps-add-btn').addEventListener('click', () => {
    const stepsInput = document.getElementById('manual-steps');
    const stepsVal = parseInt(stepsInput.value);
    if (stepsVal > 0) {
        adjustSteps(stepsVal);
        stepsInput.value = '';
        triggerSuccessCelebration();
    }
});

// Goals Form Submission
document.getElementById('goals-form').addEventListener('submit', (e) => {
    e.preventDefault();
    appState.goals.steps = parseInt(document.getElementById('set-steps-goal').value);
    appState.goals.caloriesBurn = parseInt(document.getElementById('set-calories-burn-goal').value);
    appState.goals.water = parseInt(document.getElementById('set-water-goal').value);
    appState.goals.activeTime = parseInt(document.getElementById('set-active-goal').value);
    appState.goals.caloriesIntake = parseInt(document.getElementById('set-calories-intake-goal').value);

    saveData();
    refreshDashboard();
    alert("Goals updated successfully! Keep pushing!");
});

// Profile Form Submission
document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    appState.profile.name = document.getElementById('profile-name').value.trim();
    appState.profile.weight = parseFloat(document.getElementById('profile-weight').value);
    appState.profile.height = parseInt(document.getElementById('profile-height').value);

    saveData();
    refreshDashboard();
    alert("Profile settings saved!");
});

// Header quick water increment
document.getElementById('quick-water-btn').addEventListener('click', () => {
    adjustWater(250);
    triggerSuccessCelebration();
});

// Clear logs for today
document.getElementById('clear-today-logs-btn').addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all logged values for today? Steps counts will be reset.")) {
        const today = getTodayDateString();
        appState.logs = appState.logs.filter(log => log.date !== today);
        saveData();
        
        // Reset celebration locks
        celebratedGoalsToday = { steps: false, water: false, caloriesBurn: false, activeTime: false };
        
        refreshDashboard();
        refreshHistoryLogsTable();
    }
});

// Analytics Filter Ranges (7 vs 30 Days)
document.getElementById('analytics-7days-btn').addEventListener('click', (e) => {
    document.getElementById('analytics-7days-btn').classList.add('active');
    document.getElementById('analytics-30days-btn').classList.remove('active');
    currentAnalyticsRange = 7;
    renderCharts();
});

document.getElementById('analytics-30days-btn').addEventListener('click', (e) => {
    document.getElementById('analytics-30days-btn').classList.add('active');
    document.getElementById('analytics-7days-btn').classList.remove('active');
    currentAnalyticsRange = 30;
    renderCharts();
});

// Admin panel actions
document.getElementById('seed-data-btn').addEventListener('click', () => {
    if (confirm("This will seed mock logs for the past 30 days. Existing logs will be replaced. Proceed?")) {
        seedDummyData(30);
        refreshDashboard();
        refreshHistoryLogsTable();
        refreshSettings();
        if (document.getElementById('analytics').classList.contains('active')) {
            renderCharts();
        }
        alert("30 days of data successfully seeded!");
    }
});

document.getElementById('reset-app-btn').addEventListener('click', () => {
    if (confirm("CAUTION: This will permanently wipe all logs, goals, and user profiles. Reset app?")) {
        try {
            localStorage.clear();
        } catch (e) {}
        appState = {
            goals: { steps: 10000, caloriesBurn: 500, water: 2500, activeTime: 60, caloriesIntake: 2500 },
            profile: { name: "Active User", weight: 70, height: 175 },
            logs: []
        };
        saveData();
        
        celebratedGoalsToday = { steps: false, water: false, caloriesBurn: false, activeTime: false };

        refreshDashboard();
        refreshHistoryLogsTable();
        refreshSettings();
        if (document.getElementById('analytics').classList.contains('active')) {
            renderCharts();
        }
        alert("AuraFit storage cleared successfully!");
    }
});

// Visual micro-feedback on log save
function triggerSuccessCelebration() {
    // A tiny visual feedback: pulse greeting title or show brief toast
    const greetTitle = document.getElementById('greeting-title');
    greetTitle.classList.add('pulse');
    setTimeout(() => greetTitle.classList.remove('pulse'), 500);
}

// --- App Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    loadData();
    refreshDashboard();
    refreshHistoryLogsTable();
    refreshSettings();
});
