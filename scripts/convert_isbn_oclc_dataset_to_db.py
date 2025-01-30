import json
import sqlite3
from tqdm import tqdm

def convert_to_rare_books_sqlite(input_file_path1, input_file_path2, output_db_path):
    conn = sqlite3.connect(output_db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rare_books (
            ISBN13 TEXT PRIMARY KEY,
            OCLC_Number TEXT,
            Total_Holding_Count INTEGER
        )
    ''')

    total_lines = 6170029
    with open(input_file_path1, 'r', encoding='utf-8') as f:
        for line in tqdm(f, total=total_lines, desc="Converting to SQLite"):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                oclc_num = entry['OCLC Number'].lstrip('0')
                cursor.execute('''
                    INSERT OR REPLACE INTO rare_books (ISBN13, OCLC_Number, Total_Holding_Count)
                    VALUES (?, ?, ?)
                ''', (entry['ISBN13'], oclc_num, entry['Total Holding Count']))
            except json.JSONDecodeError:
                continue

    total_lines = 19711129

    # Process again for reaasurance with new file racirusly provided by @orangereporter, skipping existing ISBNs
    # this file is provided graciously by @orangereporter at https://software.annas-archive.li/AnnaArchivist/annas-archive/-/issues/244#note_2886
    with open(input_file_path2, 'r', encoding='utf-8') as f:
        for line in tqdm(f, total=total_lines, desc="Adding new data to SQLite"):
            line = line.strip()
            if not line:
                continue
            try:
                position, holding_count = json.loads(line)
                isbn_without_check = str(978000000000 + position)
                
                # Calculate check digit
                sum_digits = sum(int(d) if i % 2 == 0 else int(d) * 3 
                               for i, d in enumerate(isbn_without_check[:12]))
                check_digit = (10 - (sum_digits % 10)) % 10
                
                # Combine ISBN with check digit
                isbn13 = isbn_without_check + str(check_digit)
                
                # Check if ISBN already exists
                cursor.execute('SELECT 1 FROM rare_books WHERE ISBN13 = ?', (isbn13,))
                if cursor.fetchone() is None:  # ISBN doesn't exist
                    cursor.execute('''
                        INSERT INTO rare_books (ISBN13, OCLC_Number, Total_Holding_Count)
                        VALUES (?, ?, ?)
                    ''', (isbn13, "", holding_count))
            except json.JSONDecodeError:
                continue

    conn.commit()
    conn.close()


input_file_path1 = "./data/isbn_oclc_holdings.jsonl.seekable"

# file is provided graciously by @orangereporter at 
# https://software.annas-archive.li/AnnaArchivist/annas-archive/-/issues/244#note_2886 
input_file_path2 = "./data/oclc_holdings_per_position.jsonl" 

output_db_path = "./data/isbn_oclc_holdings.db"


convert_to_rare_books_sqlite(input_file_path1, input_file_path2, output_db_path)