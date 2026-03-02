const fs = require('fs');
const path = require('path');
const contentPath = 'C:/Users/Ehab/Desktop/hrloop/temp/schedule_payload.txt';
const targetDir = 'C:/Users/Ehab/Desktop/hrloop/src/components/schedule';
const targetPath = path.join(targetDir, 'ScheduleDashboard.tsx');

const content = fs.readFileSync(contentPath, 'utf8');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully wrote to ' + targetPath);
