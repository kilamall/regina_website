import sqlite3

def init_db():
    conn = sqlite3.connect('bueno_beauty.db')
    cursor = conn.cursor()
    
    # Create clients table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        message TEXT
    )
    ''')
    
    # Create bookings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY,
        client_id INTEGER,
        service TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients (id)
    )
    ''')

    # Create services table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        price REAL NOT NULL
    )
    ''')

    # Create availability table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS availability (
        id INTEGER PRIMARY KEY,
        service TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL
    )
    ''')

    conn.commit()
    conn.close()

def insert_services():
    services = [
        ('Brows', 'Brow lamination', 50.0),
        ('Brows', 'Brow lamination + brow shape', 70.0),
        ('Brows', 'Brow lamination + brow tint', 65.0),
        ('Brows', 'Brow lamination + brow tint + brow shape', 85.0),
        ('Brows', 'Brow tint', 30.0),
        ('Brows', 'Brow tint + brow shape', 45.0),
        ('Brows', 'Brow shape', 25.0),
        ('Lash', 'Lash lift + lash tint', 60.0),
        ('Lash', 'Lash lift', 50.0),
        ('Lash', 'Lash tint', 20.0),
        ('Wax', 'Full face', 40.0),
        ('Wax', 'Brow shape + lip', 35.0),
        ('Wax', 'Brow shape + lip + chin', 50.0),
        ('Wax', 'Lip + chin + sides', 45.0),
        ('Makeup', 'Event Makeup', 100.0),
        ('Makeup', 'Consultation', 50.0),
        ('Makeup', 'Tutorial', 75.0)
    ]

    conn = sqlite3.connect('bueno_beauty.db')
    cursor = conn.cursor()
    cursor.executemany('INSERT INTO services (category, subcategory, price) VALUES (?, ?, ?)', services)
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    insert_services()
