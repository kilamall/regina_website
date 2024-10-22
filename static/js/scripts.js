let cart = [];
let totalDuration = 0;

document.addEventListener('DOMContentLoaded', function () {
    // Booking functionality
    if (document.getElementById('date')) {
        initializeDatePicker();
    }

    // Admin functionality
    if (document.getElementById('date-admin')) {
        initializeAdminPage();
    }
});

function initializeDatePicker() {
    const dateInput = document.getElementById('date');
    new Pikaday({
        field: dateInput,
        onSelect: function (date) {
            const selectedDate = date.toISOString().split('T')[0];
            document.getElementById('category-list').style.display = 'flex'; // Show categories only after date selection
            updateAvailableTimes(selectedDate); // Optional: fetch and check available times for the selected date
            fetchCategories(); // Fetch and display categories only after date selection
        }
    });
}

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
    document.getElementById('category-list').style.display = 'none'; // Hide categories
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
    serviceList.style.display = 'block'; // Show services
}

function goBackToCategories() {
    document.getElementById('service-list').style.display = 'none'; // Hide services
    document.getElementById('category-list').style.display = 'flex'; // Show categories
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
        document.getElementById('available-times').style.display = 'block'; // Show available times after selecting services
        document.getElementById('text-inputs').style.display = 'none';
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

function addMoreServices() {
    document.getElementById('available-times').style.display = 'none'; // Hide available times until more services selected
    document.getElementById('service-list').style.display = 'none'; // Hide services
    document.getElementById('category-list').style.display = 'flex'; // Show categories again
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

function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotalTime = document.getElementById('cart-total-time');

    cartItems.innerHTML = ''; // Clear the cart UI
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

    cartCount.textContent = cart.length;
    cartTotalTime.textContent = `Total Time: ${totalTime} minutes`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
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
        displayAvailableTimes(times);
    } catch (error) {
        console.error('Error fetching available times:', error);
    }
}

function displayAvailableTimes(times) {
    const timeWidgets = document.getElementById('time-widgets');
    timeWidgets.innerHTML = ''; // Clear previous times

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
            hourWidget.onclick = () => toggleTimes(hourWidget, timesByHour[hour]);

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

            hourWidget.appendChild(timeSlotContainer);
            timeWidgets.appendChild(hourWidget);
        }
    }

    document.getElementById('available-times').style.display = 'block'; // Show available times after services selected
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
    timeSlotContainer.style.display = (timeSlotContainer.style.display === 'none') ? 'block' : 'none';
}

function validateForm() {
    const date = document.getElementById('date').value;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;

    if (!date || !name || !validateEmail(email) || !phone) {
        alert('Please fill out all required fields.');
        return false;
    }
    return true;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}
