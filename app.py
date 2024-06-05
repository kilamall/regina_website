from flask import Flask, render_template, request, redirect, url_for, jsonify
import sqlite3
from datetime import datetime

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
        name = request.form['name']
        email = request.form['email']
        phone = request.form['phone']
        service = request.form['service']
        date = request.form['date']
        time = request.form['time']
        message = request.form['message']

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO clients (name, email, phone, message) VALUES (?, ?, ?, ?)',
                       (name, email, phone, message))
        client_id = cursor.lastrowid
        cursor.execute('INSERT INTO bookings (client_id, service, date, time) VALUES (?, ?, ?, ?)',
                       (client_id, service, date, time))
        conn.commit()
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
        times = request.form['times'].split(',')

        if service == 'All Services':
            cursor.execute('SELECT subcategory FROM services')
            services = cursor.fetchall()
            for s in services:
                for time in times:
                    cursor.execute('INSERT INTO availability (service, date, time) VALUES (?, ?, ?)',
                                   (s['subcategory'], date.strip(), time.strip()))
                    print(f"Inserted {s['subcategory']} at {time.strip()} on {date.strip()}")
        else:
            for time in times:
                cursor.execute('INSERT INTO availability (service, date, time) VALUES (?, ?, ?)',
                               (service, date.strip(), time.strip()))
                print(f"Inserted {service} at {time.strip()} on {date.strip()}")
        conn.commit()
        return redirect(url_for('admin'))
    
    cursor.execute('SELECT * FROM bookings')
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
    cursor.execute('SELECT subcategory, price FROM services WHERE category = ?', (category,))
    subcategories = cursor.fetchall()
    conn.close()
    return jsonify([{ 'subcategory': sub['subcategory'], 'price': sub['price'] } for sub in subcategories])

@app.route('/get-available-times')
def get_available_times():
    date = request.args.get('date')
    service = request.args.get('service')

    # Extract service name without price
    service_name = service.split(' ($')[0]

    # Format date to match the one in the database
    try:
        date_obj = datetime.strptime(date, '%Y-%m-%d')
        formatted_date = date_obj.strftime('%a %b %d %Y')
    except ValueError:
        return jsonify([])  # Invalid date format

    print(f"Received request for formatted date: {formatted_date}, service: {service_name}")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT time FROM availability WHERE date = ? AND service = ?', (formatted_date, service_name))
    times = cursor.fetchall()
    conn.close()

    available_times = [time['time'] for time in times]
    print(f"Query result: {times}")
    print(f"Available times: {available_times}")
    return jsonify(available_times)

@app.route('/booking_confirmation')
def booking_confirmation():
    return "Booking confirmed! Thank you for choosing Bueno Beauty Bar."

if __name__ == '__main__':
    app.run(debug=True)
