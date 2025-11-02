from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pymysql
import os
import hashlib
import uuid
from datetime import datetime
import re

app = Flask(__name__)
CORS(app)

# تنظیمات دیتابیس از لیارا
DB_CONFIG = {
    'host': 'echatdb',
    'user': 'root',
    'password': 'tNwZgnWEgCgIR579gQ3njWQ9',
    'database': 'zealous_bose',
    'port': 3306,
    'charset': 'utf8mb4'
}

# اتصال به دیتابیس
def get_db_connection():
    return pymysql.connect(**DB_CONFIG)

# ایجاد جداول در اولین اجرا
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # جدول کاربران
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(11) UNIQUE NOT NULL,
            user_id VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            profile_pic TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            storage_used BIGINT DEFAULT 0
        )
    ''')
    
    # جدول پیام‌ها
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_phone VARCHAR(11) NOT NULL,
            receiver_phone VARCHAR(11) NOT NULL,
            message_type ENUM('text', 'image', 'file') DEFAULT 'text',
            content TEXT,
            file_url TEXT,
            file_size INT DEFAULT 0,
            caption TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
            FOREIGN KEY (sender_phone) REFERENCES users(phone),
            FOREIGN KEY (receiver_phone) REFERENCES users(phone)
        )
    ''')
    
    # ایجاد کاربر پشتیبانی
    support_password = hashlib.sha256('1392ehsan'.encode()).hexdigest()
    cursor.execute('''
        INSERT IGNORE INTO users (phone, user_id, name, password_hash, profile_pic) 
        VALUES (%s, %s, %s, %s, %s)
    ''', ('09000000000', 'support', 'پشتیبانی eChat', support_password, '/icon.png'))
    
    conn.commit()
    cursor.close()
    conn.close()

# هش کردن پسورد
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# بررسی حجم فایل کاربر
def check_user_storage(phone):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT storage_used FROM users WHERE phone = %s', (phone,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result[0] if result else 0

# آپدیت حجم فایل کاربر
def update_user_storage(phone, file_size):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET storage_used = storage_used + %s WHERE phone = %s', (file_size, phone))
    conn.commit()
    cursor.close()
    conn.close()

# API ثبت‌نام و ورود
@app.route('/api/auth', methods=['POST'])
def auth():
    data = request.json
    phone = data.get('phone')
    user_id = data.get('userId')
    name = data.get('name')
    password = data.get('password')
    profile_pic = data.get('profilePic')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # بررسی تکراری نبودن شماره و آیدی
    cursor.execute('SELECT * FROM users WHERE phone = %s OR user_id = %s', (phone, user_id))
    existing_user = cursor.fetchone()
    
    if existing_user:
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'message': 'شماره تلفن یا آیدی قبلاً استفاده شده است'})
    
    # ثبت کاربر جدید
    password_hash = hash_password(password)
    cursor.execute('''
        INSERT INTO users (phone, user_id, name, password_hash, profile_pic)
        VALUES (%s, %s, %s, %s, %s)
    ''', (phone, user_id, name, password_hash, profile_pic))
    
    conn.commit()
    
    # دریافت اطلاعات کاربر
    cursor.execute('SELECT phone, user_id, name, profile_pic FROM users WHERE phone = %s', (phone,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'success': True,
        'user': {
            'phone': user[0],
            'userId': user[1],
            'name': user[2],
            'profilePic': user[3] or '/icon.png'
        }
    })

# API ورود
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    phone = data.get('phone')
    password = data.get('password')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    password_hash = hash_password(password)
    cursor.execute('SELECT phone, user_id, name, profile_pic FROM users WHERE phone = %s AND password_hash = %s', 
                  (phone, password_hash))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if user:
        return jsonify({
            'success': True,
            'user': {
                'phone': user[0],
                'userId': user[1],
                'name': user[2],
                'profilePic': user[3] or '/icon.png'
            }
        })
    else:
        return jsonify({'success': False, 'message': 'شماره تلفن یا رمز عبور اشتباه است'})

# API دریافت لیست کاربران
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT phone, user_id, name, profile_pic FROM users WHERE phone != %s', 
                  (request.args.get('currentUser'),))
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    
    users_list = []
    for user in users:
        users_list.append({
            'phone': user[0],
            'userId': user[1],
            'name': user[2],
            'profilePic': user[3] or '/icon.png'
        })
    
    return jsonify(users_list)

# API ارسال پیام
@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.json
    sender_phone = data.get('senderPhone')
    receiver_phone = data.get('receiverPhone')
    content = data.get('content')
    message_type = data.get('type', 'text')
    file_size = data.get('fileSize', 0)
    
    # بررسی محدودیت حجم
    if file_size > 1024 * 1024:  # 1MB
        return jsonify({'success': False, 'message': 'حجم فایل نباید بیشتر از ۱ مگابایت باشد'})
    
    user_storage = check_user_storage(sender_phone)
    if user_storage + file_size > 20 * 1024 * 1024:  # 20MB
        return jsonify({'success': False, 'message': 'حجم کل فایل‌های شما از ۲۰ مگابایت بیشتر شده است'})
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # اگر پیام برای پشتیبانی است و محتوای خاصی دارد، برای همه کاربران ارسال شود
        if receiver_phone == '09000000000' and '09010000000' in content:
            cursor.execute('SELECT phone FROM users WHERE phone != %s', (sender_phone,))
            all_users = cursor.fetchall()
            
            for user in all_users:
                cursor.execute('''
                    INSERT INTO messages (sender_phone, receiver_phone, message_type, content, status)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (sender_phone, user[0], message_type, content, 'sent'))
        
        else:
            cursor.execute('''
                INSERT INTO messages (sender_phone, receiver_phone, message_type, content, file_size, status)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (sender_phone, receiver_phone, message_type, content, file_size, 'sent'))
        
        # آپدیت حجم فایل کاربر
        if file_size > 0:
            update_user_storage(sender_phone, file_size)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'message': str(e)})

# API دریافت پیام‌ها
@app.route('/api/messages', methods=['GET'])
def get_messages():
    user1 = request.args.get('user1')
    user2 = request.args.get('user2')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT m.*, u.name as sender_name, u.user_id as sender_user_id 
        FROM messages m 
        JOIN users u ON m.sender_phone = u.phone 
        WHERE (sender_phone = %s AND receiver_phone = %s) 
           OR (sender_phone = %s AND receiver_phone = %s)
        ORDER BY m.timestamp
    ''', (user1, user2, user2, user1))
    
    messages = cursor.fetchall()
    cursor.close()
    conn.close()
    
    messages_list = []
    for msg in messages:
        messages_list.append({
            'id': msg[0],
            'senderPhone': msg[1],
            'receiverPhone': msg[2],
            'type': msg[3],
            'content': msg[4],
            'fileUrl': msg[5],
            'fileSize': msg[6],
            'caption': msg[7],
            'timestamp': msg[8].isoformat(),
            'status': msg[9],
            'senderName': msg[10],
            'senderUserId': msg[11]
        })
    
    return jsonify(messages_list)

# سرویس فایل‌های استاتیک
@app.route('/icon.png')
def serve_icon():
    return send_file('static/icon.png', mimetype='image/png')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_file(f'static/{filename}')

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)