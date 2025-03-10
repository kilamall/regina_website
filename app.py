from flask import Flask, render_template, request, redirect, url_for, jsonify
import sqlite3
from datetime import datetime, timedelta

app = Flask(__name__)

def get_db_connection():
    conn = sqlite3.connect('bueno_beauty.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/testimonials_gallery')
def testimonials_gallery():
    return render_template('testimonials_gallery.html')

@app.route('/booking', methods=['GET', 'POST'])
def booking():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        service = request.form.get('service')
        date = request.form.get('date')
        time = request.form.get('time')
        message = request.form.get('message')
        contact_info = phone if phone else email

        if not service:
            return "Service is missing", 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO clients (name, email, phone, message) VALUES (?, ?, ?, ?)',
                       (name, email, phone, message))
        client_id = cursor.lastrowid
        cursor.execute('INSERT INTO bookings (client_id, service, date, time, contact_info) VALUES (?, ?, ?, ?, ?)',
                       (client_id, service, date, time, contact_info))
        conn.commit()
        
        # Remove the booked time slot from all services
        remove_slots_from_other_services(service, date, [time])
        
        conn.close()
        return redirect(url_for('booking_confirmation'))

    return render_template('booking.html')
    
#admin page helper function to generate time slots based on services estimated duration 
def generate_time_slots_for_duration(duration, start_time, end_time):
    start = datetime.strptime(start_time, '%I:%M %p')
    end = datetime.strptime(end_time, '%I:%M %p')
    slots = []
    while start < end:
        slots.append(start.strftime('%I:%M %p'))
        start += timedelta(minutes=duration)
    return slots

@app.route('/admin', methods=['GET', 'POST'])
def admin():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'POST':
        date = request.form['date']
        service = request.form['service']
        start_time = request.form['start_time']
        end_time = request.form['end_time']

        # Process availability based on the selected service option
        if service == 'All Services':
            # Fetch each service with its estimated_duration
            cursor.execute('SELECT subcategory, estimated_duration FROM services')
            all_services = cursor.fetchall()
            for s in all_services:
                # Generate time slots for the current service based on its own duration
                slots = generate_time_slots_for_duration(s['estimated_duration'], start_time, end_time)
                # Delete previous availability for this service on the selected date
                cursor.execute('DELETE FROM availability WHERE service = ? AND date = ?', (s['subcategory'], date.strip()))
                for slot in slots:
                    cursor.execute('INSERT INTO availability (service, date, time) VALUES (?, ?, ?)',
                                   (s['subcategory'], date.strip(), slot.strip()))
        elif service == 'Permanent Jewelry':
            # Define the jewelry services that belong to Permanent Jewelry
            jewelry_services = ['Bracelet', 'Ring', 'Necklace']
            for jewelry_service in jewelry_services:
                cursor.execute('SELECT estimated_duration FROM services WHERE subcategory = ?', (jewelry_service,))
                result = cursor.fetchone()
                if result:
                    slots = generate_time_slots_for_duration(result['estimated_duration'], start_time, end_time)
                else:
                    slots = []  # Or you can set a default duration if needed
                cursor.execute('DELETE FROM availability WHERE service = ? AND date = ?', (jewelry_service, date.strip()))
                for slot in slots:
                    cursor.execute('INSERT INTO availability (service, date, time) VALUES (?, ?, ?)',
                                   (jewelry_service, date.strip(), slot.strip()))
        else:
            # For an individual service, fetch its estimated_duration and generate slots accordingly
            cursor.execute('SELECT estimated_duration FROM services WHERE subcategory = ?', (service,))
            result = cursor.fetchone()
            if result:
                slots = generate_time_slots_for_duration(result['estimated_duration'], start_time, end_time)
            else:
                slots = []
            cursor.execute('DELETE FROM availability WHERE service = ? AND date = ?', (service, date.strip()))
            for slot in slots:
                cursor.execute('INSERT INTO availability (service, date, time) VALUES (?, ?, ?)',
                               (service, date.strip(), slot.strip()))
        
        conn.commit()
        conn.close()
        return jsonify(success=True)
    
    # For GET requests, fetch bookings and services to display
    cursor.execute('''
        SELECT bookings.date, bookings.time, bookings.service, clients.name, bookings.contact_info
        FROM bookings
        JOIN clients ON bookings.client_id = clients.id
    ''')
    bookings = cursor.fetchall()
    
    cursor.execute('SELECT subcategory FROM services')
    services = cursor.fetchall()
    conn.close()
    return render_template('admin.html', bookings=bookings, services=[service['subcategory'] for service in services])

@app.route('/get-categories')
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT category FROM services')
    categories = cursor.fetchall()
    conn.close()
    return jsonify([category['category'] for category in categories])

@app.route('/get-subcategories/<category>')
def get_subcategories(category):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT subcategory, estimated_duration, price FROM services WHERE category = ?', (category,))
    subcategories = cursor.fetchall()
    conn.close()
    return jsonify([{ 'subcategory': sub['subcategory'], 'estimated_duration': sub['estimated_duration'], 'price': sub['price'] } for sub in subcategories])

from datetime import datetime

@app.route('/get-available-times')
def get_available_times():
    date = request.args.get('date')  # Expected format: YYYY-MM-DD
    service = request.args.get('service')
    service_name = service.split(' ($')[0]

    try:
        # Convert 'YYYY-MM-DD' to 'Thu Mar 06 2025' format
        date_obj = datetime.strptime(date, '%Y-%m-%d')
        formatted_date = date_obj.strftime('%a %b %d %Y')  # Matches stored format
    except ValueError:
        return jsonify([])  # Return empty if the date format is incorrect

    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch available times for the formatted date
    cursor.execute("SELECT time FROM availability WHERE date = ? AND service = ?", (formatted_date, service_name))
    available_times = {row['time'] for row in cursor.fetchall()}

    # Fetch already booked times for the formatted date
    cursor.execute("SELECT time FROM bookings WHERE date = ? AND service = ?", (formatted_date, service_name))
    booked_times = {row['time'] for row in cursor.fetchall()}

    conn.close()

    # Debugging Output
    print(f"Formatted Date: {formatted_date}")
    print(f"Available times: {available_times}")
    print(f"Booked times: {booked_times}")

    # Remove booked times from available times
    final_times = sorted(available_times - booked_times, key=lambda x: datetime.strptime(x, '%I:%M %p'))

    return jsonify(final_times)


@app.route('/update-service-availability', methods=['POST'])
def update_service_availability():
    data = request.json
    service = data['service']
    date = data['date']
    slots = data['slots']
    update_availability_in_db(service, date, slots)
    return jsonify(success=True)

@app.route('/remove-slots-from-other-services', methods=['POST'])
def remove_slots_from_other_services_endpoint():
    data = request.json
    service = data['service']
    date = data['date']
    slots = data['slots']
    remove_slots_from_other_services(service, date, slots)
    return jsonify(success=True)

def generate_time_slots(service, date, start_time, end_time):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch the estimated duration of the selected service
    cursor.execute("SELECT estimated_duration FROM services WHERE subcategory = ?", (service,))
    service_duration = cursor.fetchone()

    if not service_duration:
        return []  # Return empty if no duration found

    duration = service_duration['estimated_duration']  # Get duration in minutes
    start = datetime.strptime(start_time, '%I:%M %p')
    end = datetime.strptime(end_time, '%I:%M %p')
    slots = []

    while start < end:
        slots.append(start.strftime('%I:%M %p'))
        start += timedelta(minutes=duration)  # Use the service's duration

    conn.close()
    return slots

def update_availability_in_db(service, date, slots):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM availability WHERE service = ? AND date = ?', (service, date))
    for slot in slots:
        cursor.execute('INSERT INTO availability (service, date, time) VALUES (?, ?, ?)',
                       (service, date, slot))
    conn.commit()
    conn.close()

def remove_slots_from_other_services(service, date, slots):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT subcategory FROM services WHERE subcategory != ?', (service,))
    other_services = cursor.fetchall()

    for s in other_services:
        for slot in slots:
            cursor.execute('DELETE FROM availability WHERE service = ? AND date = ? AND time = ?',
                           (s['subcategory'], date, slot))
    conn.commit()
    conn.close()

@app.route('/get-bookings')
def get_bookings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT clients.name, bookings.service, bookings.date, bookings.time, bookings.contact_info
        FROM bookings 
        JOIN clients ON bookings.client_id = clients.id
    ''')
    bookings = cursor.fetchall()
    conn.close()
    return jsonify([dict(booking) for booking in bookings])

@app.route('/booking_confirmation')
def booking_confirmation():
    return "Booking confirmed! Thank you for choosing Bueno Beauty Bar."

if __name__ == '__main__':
    app.run(debug=True)
