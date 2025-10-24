const fs = require('fs');

const inputFile = 'wilayah_indonesia_pg.sql';
const outputFile = 'wilayah_indonesia_pg_batched.sql';
const batchSize = 500;

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');
let output = [];
let inInsert = false;
let tableName = '';
let insertRows = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect INSERT INTO statement
  if (line.match(/^INSERT INTO "(\w+)" VALUES$/)) {
    inInsert = true;
    tableName = line.match(/^INSERT INTO "(\w+)" VALUES$/)[1];
    insertRows = [];
    continue;
  }
  
  // If we're in an INSERT block
  if (inInsert) {
    // Check if this is a row
    if (line.startsWith('(')) {
      insertRows.push(line);
    }
    // Check if INSERT block ended
    if (line === ');' || i === lines.length - 1) {
      // Write batched inserts
      for (let j = 0; j < insertRows.length; j += batchSize) {
        const batch = insertRows.slice(j, j + batchSize);
        output.push(`INSERT INTO "${tableName}" VALUES`);
        output.push(...batch.map((row, idx) => {
          // Remove trailing comma if it's the last row in batch
          if (idx === batch.length - 1) {
            return row.replace(/,\s*$/, '');
          }
          return row;
        }));
        output.push(');');
        output.push('');
      }
      inInsert = false;
      insertRows = [];
      continue;
    }
  } else {
    // Not in INSERT, just copy the line
    output.push(line);
  }
}

fs.writeFileSync(outputFile, output.join('\n'));
console.log(`Created batched SQL file: ${outputFile}`);
console.log(`Original lines: ${lines.length}`);
console.log(`Output lines: ${output.length}`);
