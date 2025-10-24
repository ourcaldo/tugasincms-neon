import re

input_file = 'wilayah_indonesia_pg.sql'
output_file = 'wilayah_indonesia_pg_batched.sql'
batch_size = 500

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
output = []
in_insert = False
table_name = ''
insert_rows = []

for i, line in enumerate(lines):
    # Detect INSERT INTO statement
    match = re.match(r'^INSERT INTO "(\w+)" VALUES$', line)
    if match:
        in_insert = True
        table_name = match.group(1)
        insert_rows = []
        continue
    
    # If we're in an INSERT block
    if in_insert:
        # Check if this is a row
        if line.startswith('('):
            insert_rows.append(line)
        # Check if INSERT block ended
        if line == ');' or i == len(lines) - 1:
            # Write batched inserts
            for j in range(0, len(insert_rows), batch_size):
                batch = insert_rows[j:j + batch_size]
                output.append(f'INSERT INTO "{table_name}" VALUES')
                for idx, row in enumerate(batch):
                    # Remove trailing comma if it's the last row in batch
                    if idx == len(batch) - 1:
                        output.append(row.rstrip(','))
                    else:
                        output.append(row)
                output.append(');')
                output.append('')
            in_insert = False
            insert_rows = []
            continue
    else:
        # Not in INSERT, just copy the line
        output.append(line)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print(f'Created batched SQL file: {output_file}')
print(f'Original lines: {len(lines)}')
print(f'Output lines: {len(output)}')
