document.addEventListener('DOMContentLoaded', function () {
    // Booking Page Functionality
    if (document.getElementById('category-list')) {
        fetch('/get-categories')
            .then(response => response.json())
            .then(categories => {
                const categoryList = document.getElementById('category-list');
                categoryList.innerHTML = ''; // Clear any existing content
                categories.forEach(category => {
                    const categoryItem = document.createElement('div');
                    categoryItem.className = 'service-item';
                    categoryItem.textContent = category;
                    categoryItem.onclick = () => selectCategory(category);
                    categoryList.appendChild(categoryItem);
                });
            })
            .catch(error => console.error('Error fetching categories:', error));

        const dateInput = document.getElementById('date');
        let picker = new Pikaday({
            field: dateInput,
            onSelect: function (date) {
                updateAvailableTimes(date.toISOString().split('T')[0]);
            }
        });
    }

    // Admin Page Functionality
    if (document.getElementById('date-admin')) {
        const dateInputAdmin = document.getElementById('date-admin');
        new Pikaday({
            field: dateInputAdmin,
            format: 'YYYY-MM-DD'
        });
    }
});

function toggleMenu() {
    var menu = document.getElementById('nav-menu');
    menu.className = menu.className === '' ? 'responsive' : '';
}

function selectCategory(category) {
    fetch(`/get-subcategories/${category}`)
        .then(response => response.json())
        .then(subcategories => {
            document.getElementById('category-list').style.display = 'none';
            const serviceList = document.getElementById('service-list');
            serviceList.innerHTML = '<button onclick="goBack()" class="back-button">Back</button>'; // Add Back button
            subcategories.forEach(subcategory => {
                const serviceItem = document.createElement('div');
                serviceItem.className = 'service-item';
                serviceItem.textContent = `${subcategory.subcategory} ($${subcategory.price})`;
                serviceItem.onclick = () => selectService(`${subcategory.subcategory} ($${subcategory.price})`);
                serviceList.appendChild(serviceItem);
            });
            serviceList.style.display = 'block';
        })
        .catch(error => console.error('Error fetching subcategories:', error));
}

function goBack() {
    document.getElementById('service-list').style.display = 'none';
    document.getElementById('category-list').style.display = 'block';
}

function selectService(service) {
    const serviceName = service.split(' ($')[0];
    document.getElementById('service-list').style.display = 'none';
    document.getElementById('date-picker').style.display = 'block';
    document.getElementById('available-times').style.display = 'none';
    document.getElementById('text-inputs').style.display = 'none';
    document.getElementById('date').value = '';
    document.getElementById('time').innerHTML = '';
    document.getElementById('time').dataset.service = serviceName;
}

function updateAvailableTimes(dateStr) {
    const service = document.getElementById('time').dataset.service;
    fetch(`/get-available-times?date=${encodeURIComponent(dateStr)}&service=${encodeURIComponent(service)}`)
        .then(response => response.json())
        .then(times => {
            const timeWidgets = document.getElementById('time-widgets');
            const timeSelect = document.getElementById('time');
            timeWidgets.innerHTML = '';
            timeSelect.innerHTML = '<option value="">Select a time</option>';
            
            if (times.length === 0) {
                const noTimesOption = document.createElement('option');
                noTimesOption.textContent = 'No available times';
                noTimesOption.disabled = true;
                timeSelect.appendChild(noTimesOption);
            } else {
                times.forEach(time => {
                    const timeWidget = document.createElement('div');
                    timeWidget.className = 'time-widget';
                    timeWidget.textContent = time;
                    timeWidget.onclick = () => selectTime(time);
                    timeWidgets.appendChild(timeWidget);
                    
                    const timeOption = document.createElement('option');
                    timeOption.value = time;
                    timeOption.textContent = time;
                    timeSelect.appendChild(timeOption);
                });
            }
            document.getElementById('available-times').style.display = 'block';
            document.getElementById('text-inputs').style.display = 'block';
        })
        .catch(error => console.error('Error fetching available times:', error));
}

function selectTime(time) {
    const timeSelect = document.getElementById('time');
    timeSelect.value = time;
}

function checkInputs() {
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const name = document.getElementById('name').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const messageContainer = document.getElementById('message-container');
    if (name && date && time && (email || phone)) {
        messageContainer.style.display = 'block';
    } else {
        messageContainer.style.display = 'none';
    }
}

function validateForm() {
    const name = document.getElementById('name').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    if (!name || !date || !time) {
        alert('Please fill out all required fields.');
        return false;
    }
    if (!email && !phone) {
        alert('Please provide either an email address or a phone number.');
        return false;
    }
    return true;
}
