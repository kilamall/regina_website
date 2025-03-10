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

        flatpickr(".time-picker", {
            enableTime: true,
            noCalendar: true,
            dateFormat: "h:i K",
            time_24hr: false
        });

        document.querySelector('form').addEventListener('submit', function(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);

            fetch('/admin', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Clear inputs after successful availability setting
                    form.reset();
                    // Show success message
                    showConfirmationMessage();
                } else {
                    alert('Failed to set availability. Please try again.');
                }
            })
            .catch(error => console.error('Error setting availability:', error));
        });
    }
});

function showConfirmationMessage() {
    const confirmationMessage = document.getElementById('confirmationMessage');
    confirmationMessage.style.display = 'block';
    setTimeout(() => {
        confirmationMessage.style.display = 'none';
    }, 3000); // Hide after 3 seconds
}

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
            serviceList.innerHTML = '<button type="button" onclick="goBack()" class="back-button">Back</button>'; // Add Back button
            const serviceRow = document.createElement('div');
            serviceRow.style.display = 'flex';
            serviceRow.style.flexWrap = 'wrap';
            serviceRow.style.justifyContent = 'center';
            subcategories.forEach(subcategory => {
                const serviceItem = document.createElement('div');
                serviceItem.className = 'service-item';
                serviceItem.textContent = `${subcategory.subcategory} ($${subcategory.price})`;
                serviceItem.onclick = () => selectService(`${subcategory.subcategory} ($${subcategory.price})`);
                serviceRow.appendChild(serviceItem);
            });
            serviceList.appendChild(serviceRow);
            serviceList.style.display = 'block';
        })
        .catch(error => console.error('Error fetching subcategories:', error));
}

function goBack() {
    document.getElementById('service-list').style.display = 'none';
    document.getElementById('category-list').style.display = 'flex';
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

function generateAvailabilitySlots(service, date, startTime, endTime) {
    const slots = [];
    let current = parseTime(startTime);
    const end = parseTime(endTime);

    while (current < end) { // Changed to strictly less than end time
        slots.push(formatTime(current));
        current.setMinutes(current.getMinutes() + 30); // Assuming 30 minutes slots, adjust as needed
    }

    if (service === 'All Services') {
        updateServiceAvailabilityForAll(date, slots);
    } else if (service === 'Permanent Jewelry') {
        const jewelryServices = ['Bracelet', 'Ring', 'Necklace'];
        jewelryServices.forEach(jewelryService => {
            updateServiceAvailability(jewelryService, date, slots);
        });
    } else {
        updateServiceAvailability(service, date, slots);
    }
}

function parseTime(timeString) {
    const [time, modifier] = timeString.split(' ');
    let [hours, minutes] = time.split(':');

    if (hours === '12') {
        hours = '00';
    }
    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }

    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    return date;
}

function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

function updateServiceAvailability(service, date, slots) {
    return fetch('/update-service-availability', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ service, date, slots })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Service availability updated:', data);
    })
    .catch(error => console.error('Error updating service availability:', error));
}

function updateServiceAvailabilityForAll(date, slots) {
    return fetch('/update-service-availability', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ service: 'All Services', date, slots })
    })
    .then(response => response.json())
    .then(data => {
        console.log('All services availability updated:', data);
    })
    .catch(error => console.error('Error updating all services availability:', error));
}

function removeSlotsFromOtherServices(service, date, slots) {
    fetch('/remove-slots-from-other-services', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ service, date, slots })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Slots removed from other services:', data);
    })
    .catch(error => console.error('Error removing slots from other services:', error));
}
