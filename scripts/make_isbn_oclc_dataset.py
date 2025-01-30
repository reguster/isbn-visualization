import zstandard as zstd
import json

def find_and_save_rare_books(file_path, output_file_path, min_holdings=10):
    start_pos = 0
    line_count = 0
    total_lines = 2_086_370_000
    
    try:
        with open('data_progress.txt', 'r') as progress_file:
            pos_line = progress_file.readline().strip()
            count_line = progress_file.readline().strip()
            if pos_line and count_line:
                start_pos = int(pos_line)
                line_count = int(count_line)
                print(f"Resuming from position {start_pos}, line {line_count}")
            else:
                print("Empty progress file, starting new process")
                start_pos = 0
                line_count = 0
    except (FileNotFoundError, ValueError):
        print("Starting new process")
        start_pos = 0
        line_count = 0

    found_isbn13s = set()
    holdings_data = {}  # Store holdings data temporarily
    
    dctx = zstd.ZstdDecompressor()
    with open(file_path, 'rb') as compressed_file:
        with dctx.stream_reader(compressed_file) as reader:
            line_buffer = b""
            reader.seek(start_pos)
            while True:
                chunk = reader.read(1024 * 1024 * 1024)
                if not chunk:
                    break
                    
                line_buffer += chunk
                lines = line_buffer.split(b'\n')
                line_buffer = lines.pop()
                
                for line in lines:
                    try:
                        entry = json.loads(line.decode('utf-8').strip())
                        record = entry.get('metadata', {}).get('record', {})
                        oclc_number = entry.get('metadata', {}).get('oclc_number')
                        record_type = entry.get('metadata', {}).get('type')
                        
                        if record_type == "search_holdings_summary_all_editions":
                            total_holding_count = record.get('total_holding_count')
                            if total_holding_count is not None and total_holding_count < min_holdings:
                                holdings_data[oclc_number] = total_holding_count
                        else:
                            isbn13 = record.get('isbn13')
                            if isbn13 and isinstance(isbn13, str) and isbn13 not in found_isbn13s:
                                if oclc_number in holdings_data:
                                    entry_data = {
                                        "ISBN13": isbn13,
                                        "OCLC Number": oclc_number,
                                        "Total Holding Count": holdings_data[oclc_number]
                                    }
                                    with open(output_file_path, 'a', encoding='utf-8') as f:
                                        f.write(json.dumps(entry_data, ensure_ascii=False) + '\n')
                                    found_isbn13s.add(isbn13)
                    except json.JSONDecodeError:
                        continue
                    
                    line_count += 1
                    if line_count % 10000 == 0:
                        current_pos = reader.tell()
                        with open('data_progress.txt', 'w') as progress_file:
                            progress_file.write(f"{current_pos}\n{line_count}")
                    
                    if line_count % 100000 == 0:
                        print(f"\rProcessed {line_count:,} lines, Assumed Percentage(out of 2 Billion entries): {line_count/total_lines*100:.3f} %", end='', flush=True)

# Can be found from https://annas-archive.org/torrents/worldcat
file_path = "./data/annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst"

output_file_path = "./data/isbn_oclc_holdings.jsonl.seekable"

find_and_save_rare_books(file_path, output_file_path, 1000000) #larger value to get all items