
let breachesData = [];
let filteredData = [];
let currentSortColumn = '';
let currentSortDirection = 'asc';

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearFiltersBtn = document.getElementById('clearFilters');
const breachesTableBody = document.getElementById('breachesTableBody');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const totalBreachesSpan = document.getElementById('totalBreaches');
const cleanBreachesSpan = document.getElementById('cleanBreaches');
const visibleBreachesSpan = document.getElementById('visibleBreaches');

document.addEventListener('DOMContentLoaded', function() {
    loadBreachesData();
    setupEventListeners();
});

function setupEventListeners() {
    searchInput.addEventListener('input', debounce(filterData, 300));
    searchBtn.addEventListener('click', filterData);
    clearFiltersBtn.addEventListener('click', clearFilters);
    

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            filterData();
        }
    });
    

    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', function() {
            const column = this.dataset.column;
            sortTable(column);
        });
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadBreachesData() {
    try {
        showLoading(true);
        const response = await fetch('breaches.csv');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        breachesData = parseCSV(csvText);
        filteredData = [...breachesData];
        
        displayData();
        updateStats();
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Error loading data. Check that the breaches.csv file exists.');
        showLoading(false);
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index].trim();
            });
            data.push(row);
        }
    }
    
    return data;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values;
}

function displayData() {
    breachesTableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        showNoResults(true);
        return;
    }
    
    showNoResults(false);
    
    filteredData.forEach(breach => {
        const row = createTableRow(breach);
        breachesTableBody.appendChild(row);
    });
    
    updateStats();
}

function createTableRow(breach) {
    const row = document.createElement('tr');
    

    row.style.opacity = '0';
    row.style.transform = 'translateY(20px)';
    
    row.innerHTML = `
        <td><strong>${escapeHtml(breach.nom)}</strong></td>
        <td>${formatDate(breach.date_breach)}</td>
        <td>${formatDate(breach.date_upload_arcade)}</td>
        <td><code class="header-column" title="${escapeHtml(breach.header)}">${escapeHtml(breach.header)}</code></td>
        <td><span class="clean-status clean-${breach.clean}">${breach.clean === '1' ? 'Clean' : 'Non-clean'}</span></td>
        <td class="size-column">${escapeHtml(breach.affected_accounts)}</td>
        <td>${escapeHtml(breach.description)}</td>
    `;
    

    setTimeout(() => {
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
    }, 10);
    
    return row;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    // Handle dd/mm/yyyy format (upload dates)
    if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [day, month, year] = dateString.split('/');
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        return dateString; // Return original if parsing fails
    }
    
    // Handle "Month YYYY" format (breach dates)
    if (dateString.match(/^[A-Za-z]+ \d{4}$/)) {
        try {
            const date = new Date(dateString + ' 1'); // Add day 1 to make it parseable
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                });
            }
        } catch (error) {
            return dateString; // Return original if parsing fails
        }
    }
    
    // Handle other date formats
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short'
            });
        } else {
            return dateString; // Return original if not a valid date
        }
    } catch (error) {
        return dateString; // Return original if parsing fails
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function filterData() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    filteredData = breachesData.filter(breach => {
    
        const matchesSearch = searchTerm === '' || 
            breach.nom.toLowerCase().includes(searchTerm) ||
            breach.description.toLowerCase().includes(searchTerm) ||
            breach.header.toLowerCase().includes(searchTerm) ||
            breach.date_breach.includes(searchTerm) ||
            breach.date_upload_arcade.includes(searchTerm) ||
            (breach.affected_accounts && breach.affected_accounts.toLowerCase().includes(searchTerm));
        
        return matchesSearch;
    });
    

    if (currentSortColumn) {
        applySorting(currentSortColumn, currentSortDirection);
    }
    
    displayData();
}

function clearFilters() {
    searchInput.value = '';
    filteredData = [...breachesData];
    

    if (currentSortColumn) {
        applySorting(currentSortColumn, currentSortDirection);
    }
    
    displayData();
    

    clearFiltersBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        clearFiltersBtn.style.transform = 'scale(1)';
    }, 150);
}

function sortTable(column) {

    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    applySorting(column, currentSortDirection);
    updateSortingUI(column, currentSortDirection);
    displayData();
}

function applySorting(column, direction) {
    filteredData.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';
        

        if (column === 'date_breach' || column === 'date_upload_arcade') {
            aVal = parseDateToSortable(aVal);
            bVal = parseDateToSortable(bVal);
        }

        else if (column === 'clean') {
            aVal = parseInt(aVal);
            bVal = parseInt(bVal);
        }

        else if (column === 'affected_accounts') {
            aVal = parseSizeToNumber(aVal);
            bVal = parseSizeToNumber(bVal);
        }

        else {
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function parseSizeToNumber(sizeStr) {
    if (!sizeStr) return 0;
    
    const match = sizeStr.match(/^([\d.]+)([KMG]?)$/i);
    if (!match) return 0;
    
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    switch (unit) {
        case 'K': return num * 1000;
        case 'M': return num * 1000000;
        case 'G': return num * 1000000000;
        default: return num;
    }
}

function parseDateToSortable(dateStr) {
    if (!dateStr) return new Date(0);
    
    const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    const monthYearMatch = dateStr.match(/^([A-Za-z]{3})\s(\d{4})$/);
    if (monthYearMatch) {
        const [, monthName, year] = monthYearMatch;
        const monthMap = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const monthIndex = monthMap[monthName];
        if (monthIndex !== undefined) {
            return new Date(parseInt(year), monthIndex, 1);
        }
    }
    
    try {
        return new Date(dateStr);
    } catch (error) {
        return new Date(0);
    }
}

function updateSortingUI(column, direction) {

    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sorted-asc', 'sorted-desc');
    });
    

    const currentHeader = document.querySelector(`[data-column="${column}"]`);
    if (currentHeader) {
        currentHeader.classList.add(direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
}

function updateStats() {
    const total = breachesData.length;
    const clean = breachesData.filter(breach => breach.clean === '1').length;
    const visible = filteredData.length;
    

    animateNumber(totalBreachesSpan, parseInt(totalBreachesSpan.textContent) || 0, total);
    animateNumber(cleanBreachesSpan, parseInt(cleanBreachesSpan.textContent) || 0, clean);
    animateNumber(visibleBreachesSpan, parseInt(visibleBreachesSpan.textContent) || 0, visible);
}

function animateNumber(element, start, end) {
    const duration = 1000;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + (end - start) * progress);
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
    document.querySelector('.table-container').style.display = show ? 'none' : 'block';
}

function showNoResults(show) {
    noResults.style.display = show ? 'block' : 'none';
    document.querySelector('.table-container').style.display = show ? 'none' : 'block';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #ffebee;
        border: 1px solid #f44336;
        color: #c62828;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
        text-align: center;
    `;
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.querySelector('.table-container'));
}

function exportToCSV() {
    if (filteredData.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = ['nom', 'date_breach', 'date_upload_arcade', 'header', 'clean', 'description', 'taille'];
    const csvContent = [
        headers.join(','),
        ...filteredData.map(row => 
            headers.map(header => `"${row[header] || ''}"`).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'arcade_breaches_filtered.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('keydown', function(e) {

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
    }
    

    if (e.key === 'Escape') {
        clearFilters();
        searchInput.blur();
    }
});

function handleTableResponsive() {
    const table = document.querySelector('table');
    const container = document.querySelector('.table-container');
    
    if (window.innerWidth <= 768) {
        container.style.overflowX = 'auto';
        table.style.minWidth = '800px';
    } else {
        container.style.overflowX = 'visible';
        table.style.minWidth = 'auto';
    }
}

window.addEventListener('resize', debounce(handleTableResponsive, 250));

handleTableResponsive();