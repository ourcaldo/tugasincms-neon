#!/bin/bash

# Create a fixed version by escaping apostrophes in district names
sed "s/\('Ma\)'u'/\1''u'/g; \
     s/\('Sogae\)'adu'/\1''adu'/g; \
     s/\('Hilisalawa\)'ahe'/\1''ahe'/g; \
     s/\('Sidua\)'ori'/\1''ori'/g; \
     s/\('Moro\)'o'/\1''o'/g; \
     s/\('Ulu Moro\)'o'/\1''o'/g; \
     s/\('Gunungsitoli Alo\)'oa'/\1''oa'/g; \
     s/\('Hu\)'u'/\1''u'/g; \
     s/\('KI\)'E'/\1''E'/g; \
     s/\('Tampan\)' Amma'/\1'' Amma'/g; \
     s/\('Sa\)'dan'/\1''dan'/g; \
     s/\('Dende\)' Piongan Napo'/\1'' Piongan Napo'/g; \
     s/\('Mage\)'abume'/\1''abume'/g" \
     distric.sql > distric_fixed.sql

echo "Created fixed file: distric_fixed.sql"
echo "Verifying fixes..."
awk '{if (gsub(/'\''/, "&") % 2 != 0) print NR": STILL BROKEN: " $0}' distric_fixed.sql | wc -l
