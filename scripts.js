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
        const serviceInput = document.getElementById('service');
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
    document.getElementById('time').value = '';  // Use hidden input
    document.getElementById('time').dataset.service = serviceName;

    // Set the hidden service input field value
    document.getElementById('service').value = serviceName;
}

function updateAvailableTimes(dateStr) {
    const service = document.getElementById('time').dataset.service;
    fetch(`/get-available-times?date=${encodeURIComponent(dateStr)}&service=${encodeURIComponent(service)}`)
        .then(response => response.json())
        .then(times => {
            const timeWidgets = document.getElementById('time-widgets');
            timeWidgets.innerHTML = '';
            
            if (times.length === 0) {
                const noTimesMessage = document.createElement('div');
                noTimesMessage.className = 'time-widget';
                noTimesMessage.textContent = 'No available times';
                noTimesMessage.style.cursor = 'default';
                timeWidgets.appendChild(noTimesMessage);
            } else {
                times.forEach(time => {
                    const timeWidget = document.createElement('div');
                    timeWidget.className = 'time-widget';
                    timeWidget.textContent = time;
                    timeWidget.onclick = () => selectTime(timeWidget);
                    timeWidgets.appendChild(timeWidget);
                });
            }
            document.getElementById('available-times').style.display = 'block';
            document.getElementById('text-inputs').style.display = 'block';
        })
        .catch(error => console.error('Error fetching available times:', error));
}

function selectTime(selectedTimeWidget) {
    const timeWidgets = document.querySelectorAll('.time-widget');
    const timeSelect = document.getElementById('time');

    if (selectedTimeWidget.classList.contains('selected')) {
        // If already selected, deselect and expand all widgets
        selectedTimeWidget.classList.remove('selected');
        timeWidgets.forEach(widget => {
            widget.style.display = 'inline-block';
        });
        timeSelect.value = '';
    } else {
        // Collapse all other widgets and select the clicked one
        timeWidgets.forEach(widget => {
            if (widget !== selectedTimeWidget) {
                widget.style.display = 'none';
            }
        });
        selectedTimeWidget.classList.add('selected');
        timeSelect.value = selectedTimeWidget.textContent;
    }
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
