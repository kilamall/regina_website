from flask import Flask, render_template, request, redirect, url_for, jsonify
from datetime import datetime, timedelta
import sqlite3

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
        services = request.form.get('service', '').split(', ')
        date = request.form.get('date')
        start_time = request.form.get('time')
        message = request.form.get('message')
        contact_info = phone if phone else email

        if not date or not start_time:
            return "Date and time are required", 400

        if not services or services == ['']:
            return "At least one service is required", 400

        try:
            start_datetime = datetime.strptime(f"{date} {start_time}", '%Y-%m-%d %I:%M %p')
        except ValueError:
            return "Invalid date or time format", 400

        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO clients (name, email, phone, message) VALUES (?, ?, ?, ?)',
                           (name, email, phone, message))
            client_id = cursor.lastrowid

            for service in services:
                duration = cursor.execute('SELECT estimated_duration FROM services WHERE subcategory = ?', (service,)).fetchone()
                if not duration:
                    conn.rollback()
                    return f"Service '{service}' not found", 400

                duration = duration['estimated_duration']
                end_datetime = start_datetime + timedelta(minutes=duration)
                cursor.execute('INSERT INTO bookings (client_id, service, date, time, contact_info) VALUES (?, ?, ?, ?, ?)',
                               (client_id, service, date, start_datetime.strftime('%I:%M %p'), contact_info))
                remove_slots_from_other_services(service, date, [start_datetime.strftime('%I:%M %p')])
                start_datetime = end_datetime

            conn.commit()
        except Exception as e:
            conn.rollback()
            return str(e), 500
        finally:
            conn.close()

        return redirect(url_for('booking_confirmation'))

    return render_template('booking.html')

@app.route('/admin', methods=['GET', 'POST'])
def admin():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'POST':
        date = request.form['date']
        service = request.form['service']
        start_time = request.form['start_time']
        end_time = request.form['end_time']

        time_slots = generate_time_slots(start_time, end_time)
        
        cursor.execute('SELECT subcategory FROM services')
        services = cursor.fetchall()
        for s in services:
            cursor.execute('DELETE FROM availability WHERE service = ? AND date = ?', (s['subcategory'], date.strip()))
            for time in time_slots:
                cursor.execute('INSERT INTO availability (service, date, time) VALUES (?, ?, ?)',
                               (s['subcategory'], date.strip(), time.strip()))
        
        conn.commit()
        conn.close()
        return jsonify(success=True)
    
    cursor.execute('''
        SELECT bookings.date, bookings.time, bookings.service, clients.name, bookings.contact_info
        FROM bookings
        JOIN clients ON bookings.client_id = clients.id
    ''')
    bookings = cursor.fetchall()
    
    cursor.execute('SELECT subcategory FROM services')
    services = cursor.fetchall()
    conn.close()
    sorted_bookings = sorted(bookings, key=lambda x: datetime.strptime(f"{x['date']} {x['time']}", '%Y-%m-%d %I:%M %p'))
    return render_template('admin.html', bookings=sorted_bookings, services=[service['subcategory'] for service in services])

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

@app.route('/get-available-times')
def get_available_times():
    date = request.args.get('date')
    service = request.args.get('service')

    service_name = service.split(' ($')[0]

    try:
        date_obj = datetime.strptime(date, '%Y-%m-%d')
        formatted_date = date_obj.strftime('%Y-%m-%d')
    except ValueError:
        return jsonify([])

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT time FROM availability WHERE date = ? AND service = ?', (formatted_date, service_name))
    times = cursor.fetchall()
    conn.close()

    available_times = [time['time'] for time in times]
    available_times.sort(key=lambda x: datetime.strptime(x, '%I:%M %p'))
    return jsonify(available_times)

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

@app.route('/get-all-services')
def get_all_services():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT subcategory FROM services')
    services = cursor.fetchall()
    conn.close()
    return jsonify([service['subcategory'] for service in services])

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

def generate_time_slots(start_time, end_time):
    start = datetime.strptime(start_time, '%I:%M %p')
    end = datetime.strptime(end_time, '%I:%M %p')
    slots = []
    while start < end:
        slots.append(start.strftime('%I:%M %p'))
        start += timedelta(minutes=30)
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

if __name__ == '__main__':
    app.run(debug=True)
