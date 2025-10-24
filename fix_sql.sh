#!/bin/bash

# Remove consecutive duplicate ); lines
awk '
BEGIN { prev = "" }
{
    # If current line is ); and previous was also );, skip it
    if ($0 == ");" && prev == ");") {
        next
    }
    # Otherwise print and remember
    print $0
    prev = $0
}
' wilayah_indonesia_pg_batched.sql > wilayah_indonesia_pg_fixed.sql

echo "Created fixed SQL file: wilayah_indonesia_pg_fixed.sql"
wc -l wilayah_indonesia_pg_batched.sql wilayah_indonesia_pg_fixed.sql
