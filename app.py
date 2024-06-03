from flask import Flask, render_template, request, jsonify, redirect, url_for

app = Flask(__name__)

# Simulated in-memory storage for available times
available_times = {}

services = {
    'Brows': [
        'Brow lamination',
        'Brow lamination + brow shape',
        'Brow lamination + brow tint',
        'Brow lamination + brow tint + brow shape',
        'Brow tint',
        'Brow tint + brow shape',
        'Brow shape'
    ],
    'Lash': [
        'Lash lift + lash tint',
        'Lash lift',
        'Lash tint'
    ],
    'Wax': [
        'Full face',
        'Brow shape + lip',
        'Brow shape + lip + chin',
        'Lip + chin + sides'
    ],
    'Makeup': [
        'Event Makeup', 'Consultation', 'Tutorial'
    ]
}

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
        category = request.form.get('category')
        service = request.form.get('service')
        time = request.form.get('time')
        message = request.form.get('message')
        # Add logic to handle the booking data
        return redirect(url_for('home'))
    return render_template('booking.html')

@app.route('/get-categories')
def get_categories():
    return jsonify(services)

@app.route('/get-available-times')
def get_available_times():
    service = request.args.get('service')
    date_str = request.args.get('date')
    if not service or not date_str:
        return jsonify({'error': 'Service and date parameters are required'}), 400
    
    date_availability = available_times.get(date_str, {})
    return jsonify(date_availability.get(service, []))

@app.route('/get-images')
def get_images():
    service = request.args.get('service')
    if not service:
        return jsonify({'error': 'Service parameter is required'}), 400
    service_images = {
        'Brow lamination': [
            {'src': url_for('static', filename='images/brow_lami_after.JPG'), 'caption': 'Analyn Brow'}
        ],
        # Add more images for other services as needed
    }
    return jsonify(service_images.get(service, []))

# Admin routes
@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/admin/add-available-times', methods=['POST'])
def add_available_times():
    data = request.get_json()
    date = data.get('date')
    service = data.get('service')
    times = data.get('times')

    if not date or not service or not times:
        return jsonify({'error': 'Date, service, and times are required'}), 400

    if date not in available_times:
        available_times[date] = {}

    if service == "All Services":
        for category_services in services.values():
            for srv in category_services:
                if srv not in available_times[date]:
                    available_times[date][srv] = []
                available_times[date][srv].extend(times)
    else:
        if service not in available_times[date]:
            available_times[date][service] = []
        available_times[date][service].extend(times)

    return jsonify({'success': 'Times added successfully', 'available_times': available_times})

@app.route('/admin/get-available-times')
def admin_get_available_times():
    return jsonify(available_times)

if __name__ == '__main__':
    app.run(debug=True)
