import sqlite3
import time

def connect_db():
    return sqlite3.connect('bueno_beauty.db')

def execute_query_with_retry(cursor, query, params=(), retries=5, delay=1):
    for attempt in range(retries):
        try:
            cursor.execute(query, params)
            return
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < retries - 1:
                time.sleep(delay)
            else:
                raise

def init_db():
    conn = connect_db()
    cursor = conn.cursor()

    # Drop existing tables if they exist
    execute_query_with_retry(cursor, 'DROP TABLE IF EXISTS clients')
    execute_query_with_retry(cursor, 'DROP TABLE IF EXISTS bookings')
    execute_query_with_retry(cursor, 'DROP TABLE IF EXISTS services')
    execute_query_with_retry(cursor, 'DROP TABLE IF EXISTS availability')

    # Create clients table
    execute_query_with_retry(cursor, '''
    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        message TEXT
    )
    ''')

    # Create bookings table with contact_info column
    execute_query_with_retry(cursor, '''
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY,
        client_id INTEGER,
        service TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        contact_info TEXT,
        FOREIGN KEY (client_id) REFERENCES clients (id)
    )
    ''')

    # Create services table with estimated_duration and price
    execute_query_with_retry(cursor, '''
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        estimated_duration INTEGER NOT NULL,
        price REAL NOT NULL
    )
    ''')

    # Create availability table
    execute_query_with_retry(cursor, '''
    CREATE TABLE IF NOT EXISTS availability (
        id INTEGER PRIMARY KEY,
        service TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL
    )
    ''')

    # Create index on availability for faster lookups
    execute_query_with_retry(cursor, 'CREATE INDEX IF NOT EXISTS idx_availability ON availability (service, date, time)')

    conn.commit()
    conn.close()

def insert_services():
    services = [
        ('Brows', 'Brow lamination', 60, 50.0),
        ('Brows', 'Brow lamination + brow shape', 90, 70.0),
        ('Brows', 'Brow lamination + brow tint', 75, 65.0),
        ('Brows', 'Brow lamination + brow tint + brow shape', 105, 85.0),
        ('Brows', 'Brow tint', 30, 30.0),
        ('Brows', 'Brow tint + brow shape', 45, 45.0),
        ('Brows', 'Brow shape', 25, 25.0),
        ('Lash', 'Lash lift + lash tint', 75, 60.0),
        ('Lash', 'Lash lift', 60, 50.0),
        ('Lash', 'Lash tint', 30, 20.0),
        ('Wax', 'Full face', 40, 40.0),
        ('Wax', 'Brow shape + lip', 35, 35.0),
        ('Wax', 'Brow shape + lip + chin', 50, 50.0),
        ('Wax', 'Lip + chin + sides', 45, 45.0),
        ('Makeup', 'Event Makeup', 120, 100.0),
        ('Makeup', 'Consultation', 60, 50.0),
        ('Makeup', 'Tutorial', 90, 75.0),
        ('Permanent Jewelry','Necklace',30, 300.0),
        ('Permanent Jewelry','Bracelet',30, 150.0),
        ('Permanent Jewelry','Ring',30, 80.0),
             # Bundle options (Packages)
        ('Bundles', 'Essential Beauty Bundle: Brow tint, Lash lift, Brow shape', 115, 95.0),
        ('Bundles', 'Complete Glam Bundle: Brow lamination+tint+shape, Lash lift+tint, Full face wax, Event Makeup', 340, 250.0),
        ('Bundles', 'Express Beauty Bundle: Brow tint, Lash tint, Makeup', 120, 90.0),
        ('Bundles', 'Lash & Brow Duo: Brow tint + brow shape, Lash lift', 105, 85.0),
        ('Bundles', 'Beauty Essentials Bundle: Brow tint, Lash lift+tint, Makeup Consultation', 165, 125.0)
    ]

    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.executemany('INSERT INTO services (category, subcategory, estimated_duration, price) VALUES (?, ?, ?, ?)', services)
        conn.commit()
    except sqlite3.OperationalError as e:
        print(f"Error inserting services: {e}")
    finally:
        conn.close()

def add_booking(client_id, service, date, time, contact_info):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
        INSERT INTO bookings (client_id, service, date, time, contact_info) 
        VALUES (?, ?, ?, ?, ?)
        ''', (client_id, service, date, time, contact_info))
        conn.commit()
    except sqlite3.OperationalError as e:
        print(f"Error adding booking: {e}")
    finally:
        conn.close()

def add_availability(service, date, time):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
        INSERT INTO availability (service, date, time) 
        VALUES (?, ?, ?)
        ''', (service, date, time))
        conn.commit()
    except sqlite3.OperationalError as e:
        print(f"Error adding availability: {e}")
    finally:
        conn.close()

def get_bookings():
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT * FROM bookings')
        bookings = cursor.fetchall()
    except sqlite3.OperationalError as e:
        print(f"Error fetching bookings: {e}")
        bookings = []
    finally:
        conn.close()
    return bookings

def get_availabilities():
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT * FROM availability')
        availabilities = cursor.fetchall()
    except sqlite3.OperationalError as e:
        print(f"Error fetching availabilities: {e}")
        availabilities = []
    finally:
        conn.close()
    return availabilities

def add_client(name, email, phone, message):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
        INSERT INTO clients (name, email, phone, message) 
        VALUES (?, ?, ?, ?)
        ''', (name, email, phone, message))
        conn.commit()
    except sqlite3.OperationalError as e:
        print(f"Error adding client: {e}")
    finally:
        conn.close()

def get_client_id(name, email, phone):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
        SELECT id FROM clients WHERE name = ? AND email = ? AND phone = ?
        ''', (name, email, phone))
        client = cursor.fetchone()
    except sqlite3.OperationalError as e:
        print(f"Error fetching client ID: {e}")
        client = None
    finally:
        conn.close()
    return client[0] if client else None

if __name__ == '__main__':
    init_db()
    insert_services()
