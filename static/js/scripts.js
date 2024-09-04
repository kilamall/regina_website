let cart = [];
let totalDuration = 0;

document.addEventListener('DOMContentLoaded', function () {
    // Booking functionality
    if (document.getElementById('category-list')) {
        fetchCategories();
        initializeDatePicker();
    }

    // Admin functionality
    if (document.getElementById('date-admin')) {
        initializeAdminPage();
    }
});

async function fetchCategories() {
    try {
        const response = await fetch('/get-categories');
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        const categories = await response.json();
        populateCategories(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        alert('Failed to load categories. Please try again later.');
    }
}

function populateCategories(categories) {
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = ''; // Clear any existing content
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'service-item';
        categoryItem.textContent = category;
        categoryItem.onclick = () => selectCategory(category);
        categoryList.appendChild(categoryItem);
    });
}

function initializeDatePicker() {
    const dateInput = document.getElementById('date-picker');
    new Pikaday({
        field: dateInput,
        onSelect: function (date) {
            updateAvailableTimes(date.toISOString().split('T')[0]);
        }
    });
}

function initializeAdminPage() {
    console.log("Admin page detected");

    const dateInputAdmin = document.getElementById('date-admin');
    new Pikaday({
        field: dateInputAdmin,
        format: 'YYYY-MM-DD'
    });

    flatpickr(".time-picker-admin", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        time_24hr: false
    });

    document.getElementById('availabilityForm').addEventListener('submit', function (event) {
        event.preventDefault();

        const service = document.getElementById('service-admin').value;
        const date = document.getElementById('date-admin').value;
        const startTime = document.getElementById('start-time-admin').value;
        const endTime = document.getElementById('end-time-admin').value;

        if (service && date && startTime && endTime) {
            generateAvailabilitySlots(service, date, startTime, endTime)
                .then(() => {
                    document.getElementById('availabilityForm').reset();
                    showConfirmationMessage();
                })
                .catch(error => console.error('Error setting availability:', error));
        } else {
            alert('Please fill out all required fields.');
        }
    });
}

async function generateAvailabilitySlots(service, date, startTime, endTime) {
    const slots = [];
    let current = parseTime(startTime);
    const end = parseTime(endTime);

    while (current < end) {
        slots.push(formatTime(current));
        current.setMinutes(current.getMinutes() + 30);
    }

    console.log('Generated slots:', slots);

    try {
        if (service === 'All Services') {
            const response = await fetch('/get-all-services');
            const allServices = await response.json();
            for (let service of allServices) {
                await updateServiceAvailability(service, date, slots);
            }
        } else {
            await updateServiceAvailability(service, date, slots);
        }
    } catch (error) {
        console.error('Error updating service availability:', error);
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
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

async function updateServiceAvailability(service, date, slots) {
    try {
        const response = await fetch('/update-service-availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ service, date, slots })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error('Failed to update service availability');
        }
        console.log('Server response:', result);
        return result;
    } catch (error) {
        console.error('Error updating service availability:', error);
    }
}

function showConfirmationMessage() {
    const confirmationMessage = document.getElementById('confirmationMessage');
    if (confirmationMessage) {
        confirmationMessage.style.display = 'block';
        setTimeout(() => {
            confirmationMessage.style.display = 'none';
        }, 3000);
    }
}

async function selectCategory(category) {
    try {
        const response = await fetch(`/get-subcategories/${category}`);
        if (!response.ok) {
            throw new Error('Failed to fetch subcategories');
        }
        const subcategories = await response.json();
        displaySubcategories(subcategories);
    } catch (error) {
        console.error('Error fetching subcategories:', error);
    }
}

function displaySubcategories(subcategories) {
    document.getElementById('category-list').style.display = 'none';
    const serviceList = document.getElementById('service-list');
    serviceList.innerHTML = '<button type="button" onclick="goBackToCategories()" class="back-button">Back</button>';
    const serviceRow = document.createElement('div');
    serviceRow.style.display = 'flex';
    serviceRow.style.flexWrap = 'wrap';
    serviceRow.style.justifyContent = 'center';
    subcategories.forEach(subcategory => {
        const serviceItem = document.createElement('div');
        serviceItem.className = 'service-item';
        serviceItem.textContent = `${subcategory.subcategory} ($${subcategory.price})`;
        serviceItem.onclick = () => selectService(subcategory);
        serviceRow.appendChild(serviceItem);
    });
    serviceList.appendChild(serviceRow);
    serviceList.style.display = 'block';
}

function goBackToCategories() {
    document.getElementById('service-list').style.display = 'none';
    document.getElementById('category-list').style.display = 'block';
}

function selectService(subcategory) {
    if (cart.length >= 6) {
        showErrorMessage('You can only select up to 6 services.');
        return;
    } else {
        hideErrorMessage();
    }

    addToCart(subcategory);

    if (cart.length === 1) {
        document.getElementById('service-list').style.display = 'none';
        document.getElementById('calendar').style.display = 'block';
        document.getElementById('available-times').style.display = 'none';
        document.getElementById('text-inputs').style.display = 'none';
        document.getElementById('date').value = '';
        document.getElementById('time').value = '';
        document.getElementById('time').dataset.service = subcategory.subcategory;
    } else {
        addMoreServices();
    }

    document.getElementById('service').value = cart.map(item => item.name).join(', ');

    if (cart.length === 1) {
        toggleCart();
    }

    document.getElementById('add-more-services').classList.remove('hidden');
    document.getElementById('cart-book-now').classList.remove('hidden');
}

function showErrorMessage(message) {
    const errorMessageElement = document.getElementById('error-message');
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.classList.remove('hidden');
    }
}

function hideErrorMessage() {
    const errorMessageElement = document.getElementById('error-message');
    if (errorMessageElement) {
        errorMessageElement.classList.add('hidden');
    }
}

function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotalTime = document.getElementById('cart-total-time');
    const cartTime = document.getElementById('cart-time');
    const cartDate = document.getElementById('cart-date');

    cartItems.innerHTML = '';
    let totalTime = 0;

    cart.forEach((item, index) => {
        totalTime += item.duration;
        const li = document.createElement('li');
        li.textContent = `${item.name} (${item.duration} minutes)`;

        const removeBtn = document.createElement('span');
        removeBtn.textContent = 'x';
        removeBtn.className = 'remove-item';
        removeBtn.onclick = () => removeFromCart(index);
        li.appendChild(removeBtn);

        cartItems.appendChild(li);
    });

    if (cartCount) {
        cartCount.textContent = cart.length;
    }
    if (cartTotalTime) {
        cartTotalTime.textContent = `Total Time: ${totalTime} minutes`;
    }

    const time = document.getElementById('time') ? document.getElementById('time').value : null;
    const date = document.getElementById('date') ? document.getElementById('date').value : null;

    if (cartDate) {
        if (date) {
            cartDate.innerHTML = `Selected Date: ${date}`;
        } else {
            cartDate.innerHTML = 'Selected Date: <a href="#" onclick="navigateToDateTimeSelection()">not set</a>';
        }
    }

    if (cartTime) {
        if (time) {
            cartTime.innerHTML = `Selected Time: ${time}`;
        } else {
            cartTime.innerHTML = 'Selected Time: <a href="#" onclick="navigateToDateTimeSelection()">not set</a>';
        }
    }

    toggleCartButtons();
}

function toggleCartButtons() {
    const addMoreServicesBtn = document.getElementById('add-more-services');
    const cartBookNowBtn = document.getElementById('cart-book-now');
    if (cart.length > 0) {
        addMoreServicesBtn.classList.remove('hidden');
        cartBookNowBtn.classList.remove('hidden');
    } else {
        addMoreServicesBtn.classList.add('hidden');
        cartBookNowBtn.classList.add('hidden');
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function checkout() {
    if (!validateForm()) {
        document.getElementById('bookingForm').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }

    document.getElementById('bookingForm').submit();
}

function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.toggle('open');
    }
}

function addToCart(service) {
    const existingService = cart.find(item => item.name === service.subcategory);
    if (existingService) {
        alert('Service already added to the cart');
        return;
    }

    cart.push({
        name: service.subcategory,
        duration: service.estimated_duration
    });
    updateCart();
}

function selectTime(selectedTimeWidget) {
    const timeWidgets = document.querySelectorAll('.time-slot-widget');
    const timeSelect = document.getElementById('time');

    if (selectedTimeWidget.classList.contains('selected')) {
        selectedTimeWidget.classList.remove('selected');
        if (timeSelect) {
            timeSelect.value = '';
        }
    } else {
        timeWidgets.forEach(widget => widget.classList.remove('selected'));
        selectedTimeWidget.classList.add('selected');
        if (timeSelect) {
            timeSelect.value = selectedTimeWidget.textContent;
        }
    }

    updateCart();
}

async function updateAvailableTimes(dateStr) {
    const serviceElement = document.getElementById('time');
    const service = serviceElement ? serviceElement.dataset.service : null;
    if (!service) {
        console.error('Service not set in dataset');
        return;
    }

    try {
        const response = await fetch(`/get-available-times?date=${encodeURIComponent(dateStr)}&service=${encodeURIComponent(service)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch available times');
        }
        const times = await response.json();
        displayAvailableTimes(times, dateStr);
    } catch (error) {
        console.error('Error fetching available times:', error);
    }
}

function displayAvailableTimes(times, dateStr) {
    const timeWidgets = document.getElementById('time-widgets');
    if (timeWidgets) {
        timeWidgets.innerHTML = '';

        const timesByHour = groupTimesByHour(times);

        if (Object.keys(timesByHour).length === 0) {
            const noTimesMessage = document.createElement('div');
            noTimesMessage.className = 'time-widget';
            noTimesMessage.textContent = 'No available times';
            noTimesMessage.style.cursor = 'default';
            timeWidgets.appendChild(noTimesMessage);
        } else {
            for (const hour in timesByHour) {
                const hourWidget = document.createElement('div');
                hourWidget.className = 'time-widget';
                hourWidget.textContent = hour;

                const moreTimesLink = document.createElement('span');
                moreTimesLink.className = 'more-times';
                moreTimesLink.textContent = ' (More times available)';
                moreTimesLink.onclick = () => toggleTimes(hourWidget, timesByHour[hour]);

                hourWidget.appendChild(moreTimesLink);
                timeWidgets.appendChild(hourWidget);

                const timeSlotContainer = document.createElement('div');
                timeSlotContainer.className = 'time-slot-container';
                timeSlotContainer.style.display = 'none';
                timesByHour[hour].forEach(time => {
                    const timeWidget = document.createElement('div');
                    timeWidget.className = 'time-slot-widget';
                    timeWidget.textContent = time;
                    timeWidget.onclick = () => selectTime(timeWidget);
                    timeSlotContainer.appendChild(timeWidget);
                });
                timeWidgets.appendChild(timeSlotContainer);
            }
        }
    }
    document.getElementById('available-times').style.display = 'block';
    document.getElementById('text-inputs').style.display = 'block';

    const selectedDateElement = document.getElementById('selected-date');
    if (selectedDateElement) {
        selectedDateElement.textContent = dateStr;
    }
}

function groupTimesByHour(times) {
    const timesByHour = {};
    times.forEach(time => {
        const hour = time.split(':')[0] + ':00 ' + time.split(' ')[1];
        if (!timesByHour[hour]) {
            timesByHour[hour] = [];
        }
        timesByHour[hour].push(time);
    });
    return timesByHour;
}

function toggleTimes(hourWidget, times) {
    const timeSlotContainer = hourWidget.nextElementSibling;
    if (timeSlotContainer.style.display === 'none') {
        timeSlotContainer.style.display = 'block';
        hourWidget.classList.add('selected');
    } else {
        timeSlotContainer.style.display = 'none';
        hourWidget.classList.remove('selected');
    }
}

function formatDateTime(date, time) {
    const [hourMinute, period] = time.split(' ');
    const [hour, minute] = hourMinute.split(':');
    let adjustedHour = parseInt(hour, 10);
    if (period === 'PM' && adjustedHour !== 12) {
        adjustedHour += 12;
    }
    if (period === 'AM' && adjustedHour === 12) {
        adjustedHour = 0;
    }
    const formattedDate = new Date(`${date}T${adjustedHour.toString().padStart(2, '0')}:${minute}:00`);
    return isNaN(formattedDate) ? 'Invalid Date' : formattedDate.toISOString();
}

function addMoreServices() {
    document.getElementById('date-picker').style.display = 'none';
    document.getElementById('available-times').style.display = 'none';
    document.getElementById('text-inputs').style.display = 'none';
    document.getElementById('service-list').style.display = 'none';
    document.getElementById('category-list').style.display = 'flex';
}

function validateForm() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;

    if (!name || !validateEmail(email) || !phone || !date || !time) {
        alert('Please fill out all required fields with valid information.');
        return false;
    }
    return true;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function bookNow() {
    if (!validateForm()) {
        document.getElementById('bookingForm').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }

    document.getElementById('bookingForm').submit();
}

function navigateToDateTimeSelection() {
    const date = document.getElementById('date').value;

    if (!date) {
        document.getElementById('date-picker').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('date-picker').style.display = 'block';
    } else {
        document.getElementById('available-times').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('available-times').style.display = 'block';
    }
}

function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    if (navMenu) {
        navMenu.classList.toggle('open');
    }
}
