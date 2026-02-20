from flask import Flask, request, jsonify,session
from flask_cors import CORS
import pyodbc

app = Flask(__name__)
CORS(app,supports_credentials=True,resources={r"/*": {"origins": "http://127.0.0.1:5500"}})

def db_connection():
    return pyodbc.connect(
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=localhost;"
        "DATABASE=BistroDB;"
        "Trusted_Connection=yes;"
    )

@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json
    username = data["username"]
    password = data["password"]

    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM admins WHERE username=? AND password=?",
        username, password
    )

    admin = cursor.fetchone()
    conn.close()

    if admin:
        session["admin_logged_in"] = True
        return jsonify({"success": True}),200
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401


# ================= CHECK LOGIN =================
@app.route("/admin/check-login")
def check_login():
    if session.get("admin_logged_in"):
        return jsonify({"logged_in": True}),200
    return jsonify({"logged_in": False}), 401


# ================= LOGOUT =================
@app.route("/admin/logout")
def admin_logout():
    session.clear()
    return jsonify({"success": True}),200
@app.route("/place-order", methods=["POST"])
def place_order():
    data = request.get_json()

    name = data["name"]
    phone = data["phone"]
    address = data["address"]
    items = data["items"]

    total = sum(item["price"] * item["qty"] for item in items)

    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO orders (customer_name, phone, address, total_amount, payment_mode, status)
        OUTPUT INSERTED.id
        VALUES (?, ?, ?, ?, 'COD', 'Pending')
    """, name, phone, address, total)

    order_id = cursor.fetchone()[0]

    for item in items:
        cursor.execute("""
            INSERT INTO order_items (order_id, item_name, price, quantity)
            VALUES (?, ?, ?, ?)
        """, order_id, item["name"], item["price"], item["qty"])

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "success": True,
        "order_id": order_id
    }), 200
@app.route("/admin/orders", methods=["GET"])
def get_orders():
    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, customer_name, phone, address, total_amount, status
        FROM orders
        ORDER BY id DESC
    """)

    orders = []
    for row in cursor.fetchall():
        orders.append({
            "id": row[0],
            "name": row[1],
            "phone": row[2],
            "address": row[3],
            "total": row[4],
            "status": row[5]
        })

    conn.close()
    return jsonify(orders),200


# ================= ADMIN: UPDATE STATUS =================
@app.route("/admin/update-status", methods=["POST"])
def update_status():
    data = request.json
    order_id = data["order_id"]
    status = data["status"]

    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE orders SET status=? WHERE id=?",
        status, order_id
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True}),200


# ================= USER: TRACK ORDER =================
@app.route("/track-order/<int:order_id>", methods=["GET"])
def track_order(order_id):
    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT customer_name, total_amount, status
        FROM orders WHERE id=?
    """, order_id)

    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Order not found"}), 404

    return jsonify({
        "name": row[0],
        "total": row[1],
        "status": row[2]
    }),200

if __name__ == "__main__":
    app.run(debug=True)
