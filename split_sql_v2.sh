#!/bin/bash

INPUT="wilayah_indonesia_pg.sql"
OUTPUT="wilayah_indonesia_pg_fixed.sql"
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
    # If this is a row (starts with opening paren)
    if ($0 ~ /^\(/) {
        # Start new batch if needed
        if (row_count % batch_size == 0) {
            if (row_count > 0) {
                print ");"
                print ""
            }
            printf "INSERT INTO \"%s\" VALUES\n", table_name
        }
        
        # Check if this row ends with semicolon (last row)
        is_last = ($0 ~ /;$/)
        
        # Remove trailing comma or semicolon for processing
        line = $0
        gsub(/[,;][ \t]*$/, "", line)
        
        row_count++
        
        # Determine if we should add comma or not
        if (is_last || row_count % batch_size == 0) {
            # Last row in batch or last row overall - no comma
            print line
            if (is_last) {
                # End of entire INSERT
                print ");"
                print ""
                in_insert = 0
            }
        } else {
            # Not last row - add comma
            print line ","
        }
        next
    }
}

# Not in INSERT, just print
!in_insert {
    print $0
}
' "$INPUT" > "$OUTPUT"

echo "Created fixed batched SQL file: $OUTPUT"
wc -l "$INPUT" "$OUTPUT"
