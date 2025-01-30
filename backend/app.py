from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

def find_isbn_publisher(isbn, db_path):
    prefixes = [isbn[:i] for i in range(len(isbn), 0, -1)]
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    for prefix in prefixes:
        cursor.execute("SELECT Publisher_Name FROM isbn_publisher WHERE ISBN_Prefix = ?", (prefix,))
        result = cursor.fetchone()
        if result:
            conn.close()
            return prefix, result[0]
    conn.close()
    return None, "Publisher not found"

def find_oclc_holdings_data(isbn13, db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT OCLC_Number, Total_Holding_Count FROM rare_books WHERE ISBN13 = ?", (isbn13,))
    result = cursor.fetchone()
    conn.close()
    if result:
        return result[0], result[1]
    return None, "Data not found"

@app.route('/getPublisher', methods=['GET'])
def get_publisher_for_isbn():
    isbn = request.args.get('isbn13')
    if not isbn:
        return jsonify({"error": "ISBN13 is required"}), 400
    
    prefix, publisher = find_isbn_publisher(isbn, "./db/isbn_publisher.db")
    if publisher == "Publisher not found":
        return jsonify({"error": "Publisher not found"}), 404
    
    return jsonify({"prefix": prefix, "publisher": publisher})

@app.route('/getOCLCHoldingsData', methods=['GET'])
def get_oclc_holdings_data():
    isbn13 = request.args.get('isbn13')
    if not isbn13:
        return jsonify({"error": "ISBN13 is required"}), 400
    
    oclc_number, total_holding_count = find_oclc_holdings_data(isbn13, "./db/isbn_oclc_holdings.db")
    if total_holding_count == "Data not found":
        return jsonify({"error": "Data not found"}), 404
    
    return jsonify({"oclc_number": oclc_number, "total_holding_count": total_holding_count})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9000, debug=True)
