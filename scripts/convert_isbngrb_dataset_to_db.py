import json
import sqlite3
from tqdm import tqdm

def convert_to_isbn_publisher_sqlite(input_file_path, output_db_path):
    conn = sqlite3.connect(output_db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS isbn_publisher (
            ISBN_Prefix TEXT PRIMARY KEY,
            Publisher_Name TEXT
        )
    ''')

    total_lines = 2744530
    with open(input_file_path, 'r', encoding='utf-8') as f:
        for line in tqdm(f, total=total_lines, desc="Converting to SQLite"):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                publisher_name = entry.get('metadata', {}).get('record', {}).get('registrant_name', '')
                isbns = entry.get('metadata', {}).get('record', {}).get('isbns', [])
                for isbn_entry in isbns:
                    cursor.execute('''
                        INSERT OR REPLACE INTO isbn_publisher (ISBN_Prefix, Publisher_Name)
                        VALUES (?, ?)
                    ''', (isbn_entry['isbn'].replace("-", ""), publisher_name))
            except json.JSONDecodeError:
                pass

    conn.commit()
    conn.close()

input_file_path = "./data/isbngrp.jsonl.seekable"
output_db_path = "./data/isbn_publisher.db"
convert_to_isbn_publisher_sqlite(input_file_path, output_db_path)