let slideIndex = 1;
showSlides(slideIndex);

function plusSlides(n) {
    showSlides(slideIndex += n);
}

function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("mySlides");
    let dots = document.getElementsByClassName("dot");
    if (n > slides.length) {slideIndex = 1}
    if (n < 1) {slideIndex = slides.length}
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";  
    }
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }
    slides[slideIndex-1].style.display = "block";  
    dots[slideIndex-1].className += " active";
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize calendar
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        dateClick: function(info) {
            console.log('Date clicked:', info.dateStr); // Debug
            document.getElementById('booking-form').style.display = 'block';
            updateAvailableTimes(info.dateStr);
        }
    });
    calendar.render();

    // Populate services when category changes
    document.getElementById('category').addEventListener('change', updateServices);

    // Populate times when service changes
    document.getElementById('service').addEventListener('change', function() {
        const selectedDate = calendar.getDate().toISOString().split('T')[0];
        updateAvailableTimes(selectedDate);
    });
});

function updateServices() {
    const category = document.getElementById('category').value;
    fetch('/get-categories')
        .then(response => response.json())
        .then(data => {
            const serviceSelect = document.getElementById('service');
            serviceSelect.innerHTML = '<option value="">Select a service</option>';  // Clear previous options
            if (data[category]) {
                data[category].forEach(service => {
                    const option = document.createElement('option');
                    option.value = service;
                    option.textContent = service;
                    serviceSelect.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Error fetching services:', error));
}

function updateAvailableTimes(dateStr) {
    const service = document.getElementById('service').value;
    if (!service) return;

    fetch(`/get-available-times?date=${encodeURIComponent(dateStr)}&service=${encodeURIComponent(service)}`)
        .then(response => response.json())
        .then(times => {
            const timeSelect = document.getElementById('time');
            timeSelect.innerHTML = '';  // Clear previous options
            if (times.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No available times';
                timeSelect.appendChild(option);
            } else {
                times.forEach(time => {
                    const option = document.createElement('option');
                    option.value = time;
                    option.textContent = time;
                    timeSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching times:', error);
            const timeSelect = document.getElementById('time');
            timeSelect.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Error loading times';
            timeSelect.appendChild(option);
        });
}
