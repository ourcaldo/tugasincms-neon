#!/bin/bash

INPUT="wilayah_indonesia_pg.sql"
OUTPUT="wilayah_indonesia_pg_batched.sql"
BATCH_SIZE=500

awk -v batch_size="$BATCH_SIZE" '
BEGIN {
    in_insert = 0
    row_count = 0
}

# Detect INSERT INTO
/^INSERT INTO ".*" VALUES$/ {
    in_insert = 1
    table_name = $0
    gsub(/INSERT INTO "/, "", table_name)
    gsub(/" VALUES$/, "", table_name)
    row_count = 0
    next
}

# If in INSERT block
in_insert {
    # If this is the end of INSERT
    if ($0 == ");") {
        if (row_count > 0) {
            print ");"
            print ""
        }
        in_insert = 0
        next
    }
    
    # This is a row
    if ($0 ~ /^\(/) {
        # Start new batch if needed
        if (row_count % batch_size == 0) {
            if (row_count > 0) {
                print ");"
                print ""
            }
            printf "INSERT INTO \"%s\" VALUES\n", table_name
        }
        
        # Print the row
        row_count++
        if (row_count % batch_size == 0) {
            # Last row in batch - remove trailing comma
            gsub(/,[ \t]*$/, "", $0)
        }
        print $0
        next
    }
}

# Not in INSERT, just print
!in_insert {
    print $0
}
' "$INPUT" > "$OUTPUT"

echo "Created batched SQL file: $OUTPUT"
wc -l "$INPUT" "$OUTPUT"
